import { connectTransport } from "./client.js";
import { defineCommand, definePlugin } from "@tanstack/ai-harness";
//#region src/harness-plugin.ts
/**
* A harness plugin that connects MCP servers and gives the model their
* tools, named `<server>_<tool>`.
*
* - Each server connects on its own. A server that fails does not stop the
*   others: it gets the status `failed` with the error.
* - The servers connect in the background. The first turn waits for them.
* - `/mcp` lists the servers and their status. UIs read the same list from
*   the plugin state.
* - A `stdio` server runs as a child process (Node only). It stops when the
*   session closes.
* - An `http` server with `oauth: true` signs in through `/connect <name>`.
*
* @param options.servers - The servers, keyed by name. The name is the tool
*   prefix.
*
* @example
* ```ts
* import { mcp } from '@tanstack/ai-mcp/harness'
*
* plugins: () => [
*   mcp({
*     servers: {
*       files: { type: 'stdio', command: 'npx', args: ['-y', '@modelcontextprotocol/server-filesystem', '.'] },
*       docs: { type: 'http', url: 'https://mcp.example.com/mcp', timeoutMs: 10_000 },
*       notion: { type: 'http', url: 'https://mcp.notion.com/mcp', oauth: true },
*     },
*   }),
* ]
* ```
*/
function mcp(options) {
	const servers = Object.entries(options.servers);
	return definePlugin({
		name: "tanstack/mcp",
		setup: async (ctx) => {
			const statuses = /* @__PURE__ */ new Map();
			for (const [name] of servers) statuses.set(name, {
				name,
				status: "connecting",
				toolCount: 0
			});
			const state = ctx.state({ servers: [...statuses.values()] });
			const setStatus = async (status) => {
				const old = JSON.stringify(statuses.get(status.name));
				statuses.set(status.name, status);
				if (old === JSON.stringify(status)) return;
				await state.update(() => ({ servers: [...statuses.values()] }));
			};
			await state.update(() => ({ servers: [...statuses.values()] }));
			/** Connects one server, in the background. Never rejects. */
			const connect = async (name, server) => {
				const opened = await ctx.resources.acquire(async () => {
					const transport = server.type === "stdio" ? (await import("./stdio.js")).stdioTransport(server) : server;
					const client = await connectTransport({
						transport,
						prefix: name,
						requestOptions: requestOptionsOf(server),
						clientOptions: harnessClientOptions
					}, elicitFor(ctx.session));
					try {
						return {
							client,
							tools: askForInput(forCodeMode(server, await client.tools()), ctx.session)
						};
					} catch (error) {
						await client.close().catch(() => void 0);
						throw error;
					}
				}, ({ client }) => client.close()).catch((error) => new Error(errorText(error)));
				const failed = opened instanceof Error;
				const status = failed ? {
					name,
					status: "failed",
					error: opened.message,
					toolCount: 0
				} : {
					name,
					status: "connected",
					toolCount: opened.tools.length
				};
				await setStatus(status).catch(() => void 0);
				return failed ? [] : opened.tools;
			};
			const commands = { mcp: defineCommand({
				description: "Show the MCP servers and their status",
				run: () => [...statuses.values()].map(statusLine).join("\n")
			}) };
			const prompts = [];
			const lists = await Promise.all(servers.map(async (entry) => {
				const [name, server] = entry;
				if (!(server.type === "http" && server.oauth === true)) {
					const connecting = connect(name, server);
					return () => connecting;
				}
				const { mcpConnector } = await import("./connector.js");
				const connector = await mcpConnector({
					id: name,
					label: name,
					url: server.url,
					requestOptions: requestOptionsOf(server),
					...server.fetch ? { fetch: server.fetch } : {}
				}).setup(ctx);
				Object.assign(commands, connector.commands);
				prompts.push(...connector.prompts);
				return async () => {
					try {
						const tools = await connector.discoverTools();
						const signedIn = tools.length > 0 || await ctx.credentials.get(name) !== null;
						await setStatus(signedIn ? {
							name,
							status: "connected",
							toolCount: tools.length
						} : {
							name,
							status: "failed",
							error: `Not signed in. Run /connect ${name}.`,
							toolCount: 0
						});
						return forCodeMode(server, tools);
					} catch (error) {
						await setStatus({
							name,
							status: "failed",
							error: errorText(error),
							toolCount: 0
						});
						return [];
					}
				};
			}));
			return {
				commands,
				prompts,
				discoverTools: async () => {
					return (await Promise.all(lists.map((list) => list()))).flat();
				}
			};
		}
	});
}
/**
* The harness asks the user for form and URL elicitations, so its clients
* declare both. `chat()` clients keep the default: form only.
*/
var harnessClientOptions = { capabilities: { elicitation: {
	form: {},
	url: {}
} } };
/**
* Ask the session user when an MCP tool asks for input (a form or a URL
* elicitation). The tool call waits for the answer, then sends it to the
* server. On spec 2026, a tool call can ask up to 5 times. The answer is the
* form content, or an MCP result such as `{ action: 'decline' }` or
* `{ action: 'cancel' }`.
*/
function askForInput(tools, session) {
	const askInput = async (request) => ({
		status: "resolved",
		payload: await ask(session, request)
	});
	return tools.map((tool) => {
		const execute = tool.execute;
		if (!execute) return tool;
		return {
			...tool,
			execute: (args, context) => execute(args, {
				...isRecord(context) ? context : {},
				askInput
			})
		};
	});
}
/** Answers the `elicitation/create` requests of a spec 2025 server. */
function elicitFor(session) {
	return async (params) => elicitResult(await ask(session, params));
}
/** Asks the session user for one MCP elicitation request body. */
async function ask(session, request) {
	const body = isRecord(request) ? request : {};
	const url = body.mode === "url" && typeof body.url === "string" ? body.url : void 0;
	const answer = await session.ask({
		message: typeof body.message === "string" ? body.message : "The MCP server asks for input.",
		schema: isJsonSchema(body.requestedSchema) ? body.requestedSchema : void 0,
		...url ? { url } : {}
	});
	return url !== void 0 && !(isRecord(answer) && "action" in answer) ? { action: "accept" } : answer;
}
/** Maps an answer to the MCP result: decline, cancel, or accept. */
function elicitResult(answer) {
	if (isRecord(answer) && (answer.action === "decline" || answer.action === "cancel")) return { action: answer.action };
	const content = isRecord(answer) && answer.action === "accept" ? answer.content : answer;
	return isElicitContent(content) ? {
		action: "accept",
		content
	} : { action: "accept" };
}
function isElicitContent(value) {
	return isRecord(value);
}
function isRecord(value) {
	return typeof value === "object" && value !== null;
}
function isJsonSchema(value) {
	return isRecord(value);
}
/** The SDK request options for `timeoutMs`. */
function requestOptionsOf(server) {
	return server.timeoutMs === void 0 ? void 0 : { timeout: server.timeoutMs };
}
/** Marks the tools of a `codeMode: true` server for the `codeMode()` plugin. */
function forCodeMode(server, tools) {
	if (server.codeMode !== true) return tools;
	return tools.map((tool) => ({
		...tool,
		metadata: {
			...tool.metadata,
			codeMode: true
		}
	}));
}
function statusLine(server) {
	switch (server.status) {
		case "connecting": return `${server.name}: connecting`;
		case "connected": {
			const unit = server.toolCount === 1 ? "tool" : "tools";
			return `${server.name}: connected (${server.toolCount} ${unit})`;
		}
		case "failed": return `${server.name}: failed: ${server.error}`;
	}
}
/** The error text for the status. A connect error keeps its reason in `cause`. */
function errorText(error) {
	if (!(error instanceof Error)) return String(error);
	const { cause } = error;
	return cause instanceof Error ? `${error.message}: ${cause.message}` : error.message;
}
//#endregion
export { askForInput, elicitFor, harnessClientOptions, mcp };

//# sourceMappingURL=harness-plugin.js.map