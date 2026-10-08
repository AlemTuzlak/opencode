import { randomBytes, timingSafeEqual } from "node:crypto";
import { createServer } from "node:http";
import { once } from "node:events";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
import { CallToolRequestSchema, ListToolsRequestSchema } from "@modelcontextprotocol/sdk/types.js";
//#region src/tool-bridge.ts
/**
* MCP tool-proxy bridge, shared by all harness adapters.
*
* Exposes chat()-provided server tools to an in-sandbox agent as an MCP server.
* The agent (inside the sandbox) calls `mcp__tanstack__<tool>`; the call is
* proxied OUT to a bridge endpoint, where the tool's `execute()` runs in the
* orchestrator process (with its closures / DB / secrets), and the result is
* returned into the sandbox.
*
* The bridge is split into a transport-agnostic CORE and a TRANSPORT:
* - {@link createToolBridgeCore} owns tool dispatch + the permission resolver
*   (no I/O). It is what makes the bridge portable.
* - {@link startHostToolBridge} is the `node:http` transport for a long-running
*   host (laptop / CI / Docker orchestrator). It binds loopback unless the
*   sandbox must reach it via `host.docker.internal`, and authenticates with a
*   constant-time bearer check.
* - A serverless/edge orchestrator (e.g. a Durable Object) instead serves the
*   SAME core from its own `fetch` handler — no raw TCP listener — see
*   {@link handleBridgeJsonRpc} and the Cloudflare example.
*/
/**
* Name of the bridged MCP server. The agent sees tools as
* `mcp__tanstack__<tool>`; each adapter's stream translator strips this prefix
* so tool-call events match the names the application registered.
*/
var BRIDGED_MCP_SERVER_NAME = "tanstack";
/** Hostname the sandbox uses to reach the bridge endpoint, per provider. */
function hostForSandbox(provider) {
	return provider === "docker" || provider === "sbx" ? "host.docker.internal" : "127.0.0.1";
}
/**
* Coerce a tool's `inputSchema` into the object-schema shape MCP advertises,
* substituting an empty object schema when it isn't already a JSON-schema object
* (project rule: a guard, not an `as` cast).
*/
function toObjectSchema(schema) {
	if (schema !== null && typeof schema === "object" && "type" in schema && schema.type === "object") return {
		...schema,
		type: "object"
	};
	return {
		type: "object",
		properties: {}
	};
}
/** Build the transport-agnostic bridge core for the given tools. */
function createToolBridgeCore(tools, options = {}) {
	const toolsByName = new Map(tools.map((tool) => [tool.name, tool]));
	const permission = options.permission;
	const permissionDescriptor = permission ? {
		name: permission.toolName,
		description: "Permission prompt: returns {behavior:\"allow\"|\"deny\"} for a requested action.",
		inputSchema: {
			type: "object",
			properties: {}
		}
	} : void 0;
	return {
		listTools() {
			return [...tools.map((tool) => ({
				name: tool.name,
				description: tool.description,
				inputSchema: toObjectSchema(tool.inputSchema)
			})), ...permissionDescriptor ? [permissionDescriptor] : []];
		},
		async callTool(name, args) {
			if (permission && name === permission.toolName) {
				const result = await permission.resolve(args ?? {});
				return { content: [{
					type: "text",
					text: JSON.stringify(result)
				}] };
			}
			const tool = toolsByName.get(name);
			if (!tool?.execute) throw new Error(`Unknown tool: ${name}`);
			try {
				const result = await tool.execute(args ?? {}, {
					context: options.context,
					abortSignal: options.signal,
					emitCustomEvent: options.emitCustomEvent ?? (() => {})
				});
				return { content: [{
					type: "text",
					text: typeof result === "string" ? result : JSON.stringify(result)
				}] };
			} catch (error) {
				return {
					isError: true,
					content: [{
						type: "text",
						text: `Tool execution failed: ${error instanceof Error ? error.message : String(error)}`
					}]
				};
			}
		}
	};
}
/**
* Minimal JSON-RPC dispatcher over a {@link ToolBridgeCore}, so a `fetch`-based
* transport (Worker / Durable Object) can serve MCP `initialize` / `tools/list`
* / `tools/call` without the node-specific HTTP transport. Returns the JSON-RPC
* response object, or `null` for a notification (no `id`).
*/
async function handleBridgeJsonRpc(core, message) {
	if (message === null || typeof message !== "object") return {
		jsonrpc: "2.0",
		id: null,
		error: {
			code: -32600,
			message: "Invalid Request"
		}
	};
	const rpc = message;
	const id = rpc.id ?? null;
	const respond = (result) => ({
		jsonrpc: "2.0",
		id,
		result
	});
	switch (rpc.method) {
		case "initialize": return respond({
			protocolVersion: "2024-11-05",
			capabilities: { tools: {} },
			serverInfo: {
				name: BRIDGED_MCP_SERVER_NAME,
				version: "1.0.0"
			}
		});
		case "notifications/initialized": return null;
		case "tools/list": return respond({ tools: core.listTools() });
		case "tools/call": {
			const params = rpc.params ?? {};
			if (typeof params.name !== "string") return {
				jsonrpc: "2.0",
				id,
				error: {
					code: -32602,
					message: "Invalid params: name"
				}
			};
			return respond(await core.callTool(params.name, params.arguments ?? {}));
		}
		default: return {
			jsonrpc: "2.0",
			id,
			error: {
				code: -32601,
				message: "Method not found"
			}
		};
	}
}
/**
* Constant-time check of an `Authorization: Bearer <token>` header against the
* expected token. Length mismatch returns false early (token length is not
* secret); equal-length comparison is timing-safe.
*/
function timingSafeBearerEqual(header, token) {
	if (header === void 0) return false;
	const a = Buffer.from(header);
	const b = Buffer.from(`Bearer ${token}`);
	if (a.length !== b.length) return false;
	return timingSafeEqual(a, b);
}
function buildMcpServer(core) {
	const server = new McpServer({
		name: BRIDGED_MCP_SERVER_NAME,
		version: "1.0.0"
	}, { capabilities: { tools: {} } });
	server.server.setRequestHandler(ListToolsRequestSchema, () => ({ tools: core.listTools() }));
	server.server.setRequestHandler(CallToolRequestSchema, async (request) => {
		const result = await core.callTool(request.params.name, request.params.arguments ?? {});
		return {
			content: result.content,
			...result.isError ? { isError: true } : {}
		};
	});
	return server;
}
/**
* Start the `node:http` MCP tool-proxy bridge for the given tools. For a
* long-running host (laptop / CI / Docker orchestrator). Serverless/edge
* orchestrators serve {@link createToolBridgeCore} from their own `fetch`
* handler instead.
*/
async function startHostToolBridge(tools, options) {
	const token = randomBytes(24).toString("hex");
	const core = createToolBridgeCore(tools, options);
	const bindAddress = options.bindAddress ?? (options.hostForSandbox === "host.docker.internal" ? "0.0.0.0" : "127.0.0.1");
	const httpServer = createServer((req, res) => {
		(async () => {
			if (!timingSafeBearerEqual(req.headers["authorization"], token)) {
				res.writeHead(401).end("unauthorized");
				return;
			}
			const server = buildMcpServer(core);
			const transport = new StreamableHTTPServerTransport({ sessionIdGenerator: void 0 });
			res.on("close", () => {
				transport.close();
				server.close();
			});
			await server.connect(transport);
			let body = "";
			for await (const chunk of req) body += chunk;
			let parsed;
			try {
				parsed = body ? JSON.parse(body) : void 0;
			} catch {
				if (!res.headersSent) res.writeHead(400).end("invalid JSON body");
				return;
			}
			await transport.handleRequest(req, res, parsed);
		})().catch((error) => {
			console.error("[tool-bridge] request handler failed:", error);
			if (!res.headersSent) res.writeHead(500).end("bridge error");
		});
	});
	await once(httpServer.listen(0, bindAddress), "listening");
	const port = httpServer.address().port;
	return {
		name: BRIDGED_MCP_SERVER_NAME,
		url: `http://${options.hostForSandbox}:${port}/mcp`,
		token,
		close: () => new Promise((resolve) => httpServer.close(() => resolve()))
	};
}
/** Default provisioner: a `node:http` listener on the host. */
var nodeHttpBridgeProvisioner = { provision(tools, options) {
	const { provider, ...core } = options;
	return startHostToolBridge(tools, {
		hostForSandbox: hostForSandbox(provider),
		...core
	});
} };
//#endregion
export { BRIDGED_MCP_SERVER_NAME, createToolBridgeCore, handleBridgeJsonRpc, hostForSandbox, nodeHttpBridgeProvisioner, startHostToolBridge, timingSafeBearerEqual };

//# sourceMappingURL=tool-bridge.js.map