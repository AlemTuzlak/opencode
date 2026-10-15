import { DuplicateToolNameError, MCPConnectionError, MCPTaskRequiredToolError, MCPToolFilterError, MCPToolNotFoundError } from "./errors.js";
import { listPages } from "./list-pages.js";
import { callMcpTool, makeMcpExecute, requiresTaskExecution, sdkRequestOptions, serverSupportsTaskCalls, toServerTools, toolMcpMetadata } from "./tools.js";
import { directMCPClient } from "./direct-client.js";
import { isTransportInstance, resolveTransport } from "./transport.js";
import { Client } from "@modelcontextprotocol/client";
//#region src/client.ts
var MCPClientImpl = class {
	capabilities = {};
	instructions;
	#client;
	#closed = false;
	#toolDefinitions;
	#toolListSubscription;
	prefix;
	#transport;
	#clientOptions;
	#policy;
	constructor(prefix, name = "tanstack-ai-mcp", version = "0.0.1", transport, clientOptions, policy = {}, onElicit) {
		this.prefix = prefix;
		this.#transport = transport;
		this.#clientOptions = clientOptions;
		this.#policy = policy;
		this.#client = new Client({
			name,
			version
		}, {
			...clientOptions,
			capabilities: {
				elicitation: { form: {} },
				sampling: {},
				...clientOptions?.capabilities
			},
			versionNegotiation: {
				...clientOptions?.versionNegotiation,
				mode: "auto"
			}
		});
		if (onElicit) this.#client.setRequestHandler("elicitation/create", (request) => onElicit(request.params));
	}
	getInfo() {
		const { toolFilter, needsApproval, toolName, requestOptions } = this.#policy;
		return {
			transport: this.#transport,
			prefix: this.prefix,
			...this.#clientOptions ? { clientOptions: this.#clientOptions } : {},
			...toolFilter ? { toolFilter } : {},
			...needsApproval ? { needsApproval } : {},
			...toolName ? { toolName } : {},
			...requestOptions ? { requestOptions } : {}
		};
	}
	async connect(transport) {
		try {
			this.#client.setNotificationHandler("notifications/tools/list_changed", () => {
				this.#toolDefinitions = void 0;
			});
			await this.#client.connect(transport, sdkRequestOptions(this.#policy.requestOptions));
			this.capabilities = this.#client.getServerCapabilities() ?? {};
			this.instructions = this.#client.getInstructions();
			await this.#listenForToolListChanges().catch(() => void 0);
		} catch (err) {
			await this.#toolListSubscription?.close().catch(() => void 0);
			await this.#client.close().catch(() => void 0);
			throw new MCPConnectionError("Failed to connect to MCP server", err);
		}
	}
	async #listenForToolListChanges() {
		if (this.#client.getProtocolEra() !== "modern") return;
		if ((this.#client.getServerCapabilities()?.tools)?.listChanged !== true) return;
		this.#toolListSubscription = await this.#client.listen({ toolsListChanged: true });
	}
	async #listTools(options) {
		const client = this.#client;
		const requestOptions = sdkRequestOptions(this.#policy.requestOptions);
		const defs = await listPages(async (cursor) => {
			const page = cursor === void 0 ? await client.request({ method: "tools/list" }, requestOptions) : await client.request({
				method: "tools/list",
				params: { cursor }
			}, requestOptions);
			return {
				items: page.tools,
				nextCursor: page.nextCursor
			};
		});
		this.#toolDefinitions = new Map(defs.map((def) => [def.name, def]));
		if (options?.raw !== true && client.getProtocolEra() !== "modern") await client.listTools(void 0, requestOptions);
		return defs;
	}
	async tools(defsOrOptions, maybeOptions = {}) {
		if (this.#closed) throw new MCPConnectionError("MCP client is closed");
		const isDefs = Array.isArray(defsOrOptions);
		const options = isDefs ? maybeOptions : defsOrOptions ?? {};
		const { toolFilter, needsApproval, toolName, requestOptions } = this.#policy;
		const defs = applyToolFilter(await this.#listTools(), toolFilter, serverSupportsTaskCalls(this.#client));
		let tools;
		if (isDefs) {
			const available = new Map(defs.map((tool) => [tool.name, tool]));
			tools = defsOrOptions.map((def) => {
				const serverTool = available.get(def.name);
				if (!serverTool) throw new MCPToolNotFoundError(def.name);
				if (requiresTaskExecution(serverTool) && !serverSupportsTaskCalls(this.#client)) throw new MCPTaskRequiredToolError(def.name);
				const bound = def.server(makeMcpExecute(this.#client, def.name, Boolean(def.outputSchema), requiresTaskExecution(serverTool), requestOptions));
				const existingMcp = bound.metadata?.mcp;
				const mcpBase = existingMcp !== null && typeof existingMcp === "object" ? existingMcp : {};
				const name = toolName?.(serverTool) ?? (this.prefix ? `${this.prefix}_${def.name}` : def.name);
				return {
					...bound,
					name,
					...options.lazy ? { lazy: true } : {},
					metadata: {
						...bound.metadata,
						mcp: {
							...mcpBase,
							...toolMcpMetadata(serverTool, this.prefix)
						}
					}
				};
			});
		} else tools = toServerTools(this.#client, defs, {
			prefix: this.prefix,
			toolName,
			lazy: options.lazy,
			needsApproval,
			requestOptions
		});
		const seen = /* @__PURE__ */ new Set();
		for (const t of tools) {
			if (seen.has(t.name)) throw new DuplicateToolNameError(t.name);
			seen.add(t.name);
		}
		return tools;
	}
	async resources() {
		if (this.#closed) throw new MCPConnectionError("MCP client is closed");
		const options = sdkRequestOptions(this.#policy.requestOptions);
		return (await this.#client.listResources(void 0, options)).resources;
	}
	async readResource(uri) {
		if (this.#closed) throw new MCPConnectionError("MCP client is closed");
		const options = sdkRequestOptions(this.#policy.requestOptions);
		return this.#client.readResource({ uri }, options);
	}
	async resourceTemplates() {
		if (this.#closed) throw new MCPConnectionError("MCP client is closed");
		const options = sdkRequestOptions(this.#policy.requestOptions);
		return (await this.#client.listResourceTemplates(void 0, options)).resourceTemplates;
	}
	async prompts() {
		if (this.#closed) throw new MCPConnectionError("MCP client is closed");
		const options = sdkRequestOptions(this.#policy.requestOptions);
		return (await this.#client.listPrompts(void 0, options)).prompts;
	}
	async getPrompt(name, args) {
		if (this.#closed) throw new MCPConnectionError("MCP client is closed");
		const promptArgs = isArgs(args) ? Object.fromEntries(Object.entries(args).map(([key, value]) => [key, String(value)])) : void 0;
		const options = sdkRequestOptions(this.#policy.requestOptions);
		return this.#client.getPrompt({
			name,
			arguments: promptArgs
		}, options);
	}
	async callTool(name, args, options) {
		if (this.#closed) throw new MCPConnectionError("MCP client is closed");
		if (!this.#toolDefinitions) try {
			await this.#listTools({ raw: true });
		} catch {}
		const definition = this.#toolDefinitions?.get(name);
		const taskRequired = definition !== void 0 && requiresTaskExecution(definition);
		if (taskRequired && !serverSupportsTaskCalls(this.#client)) throw new MCPTaskRequiredToolError(name);
		return await callMcpTool(this.#client, name, isArgs(args) ? args : {}, taskRequired, options?.signal, void 0, this.#policy.requestOptions);
	}
	async close() {
		if (this.#closed) return;
		this.#closed = true;
		const subscription = this.#toolListSubscription;
		this.#toolListSubscription = void 0;
		try {
			await subscription?.close();
		} finally {
			await this.#client.close();
		}
	}
	async [Symbol.asyncDispose]() {
		await this.close();
	}
};
function isArgs(value) {
	return typeof value === "object" && value !== null && !Array.isArray(value);
}
/**
* Applies the client `toolFilter` to the listed tools.
* A function keeps the tools it returns `true` for.
* A list keeps exactly the listed tools, in list order. A missing or
* repeated name throws `MCPToolFilterError`. A listed tool that needs a task
* on a server without task support throws `MCPTaskRequiredToolError`.
*/
function applyToolFilter(listed, toolFilter, supportsTasks) {
	if (toolFilter === void 0) return listed;
	if (typeof toolFilter === "function") return listed.filter((def) => toolFilter(def));
	const byName = new Map(listed.map((def) => [def.name, def]));
	const seen = /* @__PURE__ */ new Set();
	const repeated = /* @__PURE__ */ new Set();
	const missing = [];
	const kept = [];
	for (const name of toolFilter) {
		if (seen.has(name)) {
			repeated.add(name);
			continue;
		}
		seen.add(name);
		const def = byName.get(name);
		if (def === void 0) missing.push(name);
		else kept.push(def);
	}
	if (missing.length > 0 || repeated.size > 0) throw new MCPToolFilterError({
		missing,
		repeated: [...repeated],
		available: listed.map((def) => def.name)
	});
	const unsupported = kept.find((def) => requiresTaskExecution(def) && !supportsTasks);
	if (unsupported !== void 0) throw new MCPTaskRequiredToolError(unsupported.name);
	return kept;
}
async function createMCPClient(options) {
	if ("server" in options) return directMCPClient(options.server);
	return connectTransport(options);
}
/**
* Connects a client to a transport. The harness passes `onElicit` to answer
* the `elicitation/create` requests of spec 2025 servers.
*/
async function connectTransport(options, onElicit) {
	const transport = await resolveTransport(options.transport);
	const impl = new MCPClientImpl(options.prefix, options.name, options.version, isTransportInstance(options.transport) ? void 0 : options.transport, options.clientOptions, {
		toolFilter: options.toolFilter,
		needsApproval: options.needsApproval,
		toolName: options.toolName,
		requestOptions: options.requestOptions
	}, onElicit);
	await impl.connect(transport);
	return impl;
}
/** Test-only: connect directly from a transport instance (skips resolveTransport). */
async function createMCPClientFromTransport(transport, prefix, clientOptions) {
	const impl = new MCPClientImpl(prefix, void 0, void 0, void 0, clientOptions);
	await impl.connect(transport);
	return impl;
}
//#endregion
export { connectTransport, createMCPClient, createMCPClientFromTransport };

//# sourceMappingURL=client.js.map