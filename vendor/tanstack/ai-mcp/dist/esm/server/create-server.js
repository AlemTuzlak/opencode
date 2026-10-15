import { ToolInputRequiredError, createServerToolContext, inputDeclinedMessage } from "./context.js";
import { isServedOverStdio, rememberServerOptions } from "./registry.js";
import { parseToolOutput } from "./output.js";
import { getTask, startTask, toCallToolResult } from "./tasks.js";
import { inMemoryTaskStore } from "./stores.js";
import { convertSchemaToJsonSchema } from "@tanstack/ai";
import { McpServer, ProtocolError, ProtocolErrorCode, ResourceTemplate, WebStandardStreamableHTTPServerTransport, acceptedContent, createMcpHandler, fromJsonSchema, inputRequired, inputResponse, isCallToolResult, isLegacyRequest, legacyStatelessFallback, requireBearerAuth } from "@modelcontextprotocol/server";
//#region src/server/create-server.ts
var sessionIdleMs = 18e5;
var inputKey = "input";
var sampleMaxTokens = 1024;
var inputFormSchema = {
	type: "object",
	properties: { value: { type: "string" } },
	required: ["value"]
};
var emptyObjectSchema = fromJsonSchema({
	type: "object",
	properties: {}
});
/**
* Builds an MCP HTTP server.
*
* `options.name` and `options.version` name the server.
* `options.tools` is a list of `toolDefinition().server()` tools.
* `options.resources` uses `resourceDefinition().read()`.
* `options.prompts` uses `promptDefinition().render()`.
* `options.taskStore` keeps task records. The default store is in memory.
* `options.auth` checks the bearer token with the SDK gate.
* A missing or bad token gets a 401. A token without a required scope gets a 403.
* Spec 2025 sessions and tasks belong to the caller: the `clientId` of the
* token plus its `sub` claim. A tool reads the token as `ctx.context.authInfo`.
* A spec 2025 client gets no session unless `options.sessions` is `'memory'`.
* `options.sample` is the model adapter for `ctx.context.sample` on spec 2026.
* `options.waitUntil` receives the task promise so a worker can stay alive.
*
* The result has `fetch(request)`, `handle(request, options)`, `tools`,
* `resources`, and `prompts`. `handle` takes a token your own middleware
* verified and values for `ctx.context`.
* Those three lists keep the types you passed in.
* Export the result from one package and pass it to `createMCPClient({ server })` in another.
* `fetch` serves tools, resources, and prompts.
* It speaks spec `2026-07-28` and spec 2025.
* It does not serve the OAuth discovery documents. Mount
* `oauthMetadataResponse` at the app root for them.
*
* On spec 2025, a tool with `execution: 'task'` returns a task handle before
* the work ends. Spec 2026-07-28 has no tasks, so that tool runs inline there.
* A tool reads its hooks on `ctx.context`. Type it with `MCPToolContext`.
* On spec 2026, `ctx.context.sample` calls `options.sample` and does not ask the client.
* On spec 2025 with `sessions: 'memory'`, `ctx.context.sample` asks the MCP client.
* On spec 2026, `ctx.context.requestInput` stops the call until the client sends the answer.
* On spec 2025 with `sessions: 'memory'`, `ctx.context.requestInput` waits on the open session.
*
* @param options - Server name, version, tools, and the optional stores
*
* @example
* ```ts
* const server = createMCPServer({
*   name: 'weather',
*   version: '1.0.0',
*   tools: [getWeather],
* })
*
* return server.fetch(request)
* ```
*/
function createMCPServer(options) {
	const taskStore = options.taskStore ?? inMemoryTaskStore();
	const sessions = /* @__PURE__ */ new Map();
	const tools = options.tools ?? [];
	const resources = options.resources ?? [];
	const prompts = options.prompts ?? [];
	const hasTaskTool = tools.some((tool) => tool.execution === "task");
	const schemas = compileSchemas(tools, prompts);
	const gate = options.auth === void 0 ? void 0 : requireBearerAuth(options.auth);
	const contextByRequest = /* @__PURE__ */ new WeakMap();
	const factory = (ctx) => {
		const request = ctx.requestInfo;
		return buildMcpServer({
			options,
			resources,
			schemas,
			taskStore,
			era: ctx.era === "modern" ? "2026" : "2025",
			sessionless: ctx.era !== "modern",
			hasTaskTool,
			owner: ownerOf(ctx.authInfo),
			appContext: () => request === void 0 ? void 0 : contextByRequest.get(request)
		});
	};
	const modern = createMcpHandler(factory, {
		legacy: "reject",
		keepAliveMs: 0,
		onerror: options.onerror
	});
	const stateless = legacyStatelessFallback(factory, options.onerror);
	const mcpServer = {
		name: options.name,
		version: options.version,
		tools,
		resources,
		prompts,
		/**
		* Serves one MCP HTTP request. This is a plain Fetch handler.
		*
		* @param request - The HTTP request to the MCP route
		*/
		fetch: (request) => mcpServer.handle(request),
		/**
		* Serves one MCP HTTP request with values from your own middleware.
		*
		* A spec 2026 request uses the per-request envelope.
		* A spec 2025 request uses the session id header.
		* When `auth` is set, a missing or invalid bearer token returns 401,
		* and a token without a required scope returns 403.
		* `handleOptions.authInfo` skips that gate. `handleOptions.context` reaches
		* `ctx.context` of every tool call, resource read, and resource list of
		* this request.
		*
		* @param request - The HTTP request to the MCP route
		* @param handleOptions - A verified token and values for `ctx.context`
		*/
		async handle(request, handleOptions) {
			await closeIdleSessions(sessions);
			let authInfo = handleOptions?.authInfo;
			if (authInfo === void 0 && gate !== void 0) {
				const verdict = await gate(request);
				if (verdict instanceof Response) return verdict;
				authInfo = verdict;
			}
			const owner = ownerOf(authInfo);
			const context = handleOptions?.context;
			const sessionMode = options.sessions ?? (isServedOverStdio(mcpServer) ? "memory" : "stateless");
			const legacy = sessionMode !== "reject" && await isLegacyRequest(request);
			if (legacy && sessionMode === "memory") return legacyFetch(request, {
				open: () => openLegacySession(request, {
					sessions,
					owner,
					authInfo,
					context,
					build: (appContext) => buildMcpServer({
						options,
						resources,
						schemas,
						taskStore,
						era: "2025",
						sessionless: false,
						hasTaskTool,
						owner,
						appContext
					})
				}),
				resume: (sessionId) => resumeLegacySession(request, sessionId, sessions, {
					owner,
					authInfo,
					context
				})
			});
			if (context !== void 0) contextByRequest.set(request, context);
			const requestOptions = authInfo === void 0 ? void 0 : { authInfo };
			if (legacy) return stateless(request, requestOptions);
			if (request.method === "POST" && request.headers.get("mcp-method") === "subscriptions/listen") {
				const body = await request.clone().json().catch(() => void 0);
				if (isRecord(body) && body.method === "subscriptions/listen") return Response.json({
					jsonrpc: "2.0",
					id: typeof body.id === "string" || typeof body.id === "number" ? body.id : null,
					error: {
						code: -32601,
						message: "Method not found"
					}
				});
			}
			return modern.fetch(request, requestOptions);
		}
	};
	rememberServerOptions(mcpServer, options);
	return mcpServer;
}
function ownerOf(authInfo) {
	if (authInfo === void 0) return void 0;
	const subject = authInfo.extra?.sub;
	return JSON.stringify([authInfo.clientId, typeof subject === "string" ? subject : null]);
}
async function closeIdleSessions(sessions) {
	const cutoff = Date.now() - sessionIdleMs;
	for (const [id, session] of sessions) {
		if (session.lastUsed > cutoff) continue;
		sessions.delete(id);
		await session.transport.close().catch(() => void 0);
		await session.server.close().catch(() => void 0);
	}
}
function compileSchemas(tools, prompts) {
	return {
		tools: tools.map((tool) => ({
			tool,
			inputSchema: standardSchema(tool.inputSchema) ?? emptyObjectSchema,
			outputSchema: outputSchemaOf(tool.outputSchema)
		})),
		prompts: prompts.map((prompt) => ({
			prompt,
			argsSchema: standardSchema(prompt.argsSchema) ?? emptyObjectSchema
		}))
	};
}
function outputSchemaOf(schema) {
	try {
		return standardSchema(schema, "output");
	} catch {
		return;
	}
}
function buildMcpServer(input) {
	const server = new McpServer({
		name: input.options.name,
		version: input.options.version
	}, serverOptions(input.era, input.hasTaskTool));
	if (input.options.onerror !== void 0) server.server.onerror = input.options.onerror;
	for (const compiled of input.schemas.tools) registerServerTool(server, compiled, input);
	for (const resource of input.resources) registerServerResource(server, resource, input.appContext);
	for (const compiled of input.schemas.prompts) registerServerPrompt(server, compiled);
	if (input.era === "2025") registerLegacyTaskMethods(server, input.taskStore, input.owner);
	return server;
}
function serverOptions(era, hasTaskTool) {
	return { capabilities: {
		tools: { listChanged: false },
		resources: { listChanged: false },
		prompts: { listChanged: false },
		...hasTaskTool && era === "2025" ? { tasks: { requests: { tools: { call: {} } } } } : {}
	} };
}
function registerServerTool(server, { tool, inputSchema, outputSchema: compiledOutput }, input) {
	const asTask = tool.execution === "task" && input.era === "2025";
	const outputSchema = asTask ? void 0 : compiledOutput;
	const registered = server.registerTool(tool.name, {
		...toolPresentation(tool.metadata),
		description: tool.description,
		inputSchema,
		outputSchema
	}, async (args, sdkCtx) => {
		if (asTask) return runTaskTool(tool, args, input, sdkCtx.http?.authInfo);
		const ctx = toolCallContext(input.era, input.sessionless, sdkCtx, input.options.sample, input.appContext);
		try {
			const output = await runTool(tool, args, ctx);
			return toCallToolResult(output, outputSchema !== void 0);
		} catch (error) {
			if (error instanceof ToolInputRequiredError) return inputRequired({ inputRequests: { [inputKey]: inputRequired.elicit({
				message: error.request.message,
				mode: "form",
				requestedSchema: inputFormSchema
			}) } });
			throw error;
		}
	});
	if (asTask) registered.execution = { taskSupport: "required" };
}
var annotationHints = [
	"readOnlyHint",
	"destructiveHint",
	"idempotentHint",
	"openWorldHint"
];
function toolPresentation(metadata) {
	const title = typeof metadata?.title === "string" ? metadata.title : void 0;
	const _meta = isRecord(metadata?._meta) ? metadata._meta : void 0;
	const raw = metadata?.annotations;
	if (!isRecord(raw)) return {
		title,
		_meta
	};
	const annotations = {};
	if (typeof raw.title === "string") annotations.title = raw.title;
	for (const hint of annotationHints) if (typeof raw[hint] === "boolean") annotations[hint] = raw[hint];
	return {
		title,
		annotations,
		_meta
	};
}
async function runTaskTool(tool, args, input, authInfo) {
	const ctx = taskContext(input.options.sample, authInfo, input.appContext);
	const handle = await startTask(() => runTool(tool, args, ctx), {
		store: input.taskStore,
		waitUntil: input.options.waitUntil,
		owner: input.owner
	});
	const polled = await getTask(handle.taskId, input.taskStore, input.owner);
	if (polled === null) throw new Error(`Task ${handle.taskId} was not saved.`);
	return {
		content: [{
			type: "text",
			text: polled.task.taskId
		}],
		task: polled.task
	};
}
function taskContext(sample, authInfo, appContext) {
	return {
		context: {
			...appContext(),
			authInfo,
			async requestInput(_request) {
				throw new Error("ctx.context.requestInput is not supported in an execution: \"task\" tool.");
			},
			async sample(request) {
				if (sample === void 0) throw new Error("ctx.context.sample in an execution: \"task\" tool needs the sample option of createMCPServer.");
				return sample(request);
			}
		},
		abortSignal: new AbortController().signal,
		emitCustomEvent() {}
	};
}
async function runTool(tool, args, ctx) {
	const execute = tool.execute;
	if (execute === void 0) throw new Error(`Tool ${tool.name} has no execute function.`);
	const output = await execute(args ?? {}, ctx);
	return parseToolOutput(tool, output, isCallToolResult);
}
var sessionlessMessage = "needs a spec 2025 session. Set sessions: \"memory\" in createMCPServer.";
function toolCallContext(era, sessionless, sdkCtx, sample, appContext) {
	const authInfo = sdkCtx.http?.authInfo;
	const hooks = era === "2025" ? createServerToolContext({
		era: "2025",
		waitForInput: sessionless ? () => Promise.reject(/* @__PURE__ */ new Error(`ctx.context.requestInput ${sessionlessMessage}`)) : (request) => waitForInput(sdkCtx, request),
		clientSample: sessionless ? (request) => sample === void 0 ? Promise.reject(/* @__PURE__ */ new Error(`ctx.context.sample ${sessionlessMessage}`)) : sample(request) : (request) => askClientToSample(sdkCtx, request),
		sample,
		authInfo
	}) : createServerToolContext({
		era: "2026",
		inputAnswer: inputAnswer(sdkCtx),
		inputDeclined: inputDeclined(sdkCtx),
		sample,
		authInfo
	});
	return {
		context: {
			...appContext(),
			...hooks
		},
		abortSignal: sdkCtx.mcpReq.signal,
		emitCustomEvent() {}
	};
}
function inputAnswer(sdkCtx) {
	const content = acceptedContent(sdkCtx.mcpReq.inputResponses, inputKey);
	if (content === void 0) return void 0;
	if (typeof content.value === "string") return content.value;
	return content;
}
function inputDeclined(sdkCtx) {
	const view = inputResponse(sdkCtx.mcpReq.inputResponses, inputKey);
	return view.kind === "elicit" && view.action !== "accept";
}
async function waitForInput(sdkCtx, request) {
	const result = await sdkCtx.mcpReq.elicitInput({
		message: request.message,
		mode: "form",
		requestedSchema: inputFormSchema
	});
	if (result.action !== "accept" || result.content === void 0) throw new Error(inputDeclinedMessage);
	const content = result.content;
	if (content !== void 0 && typeof content.value === "string") return content.value;
	return content;
}
async function askClientToSample(sdkCtx, request) {
	const messages = request.messages.map((message) => ({
		role: message.role === "assistant" ? "assistant" : "user",
		content: {
			type: "text",
			text: message.content
		}
	}));
	return textFromContent((await sdkCtx.mcpReq.requestSampling({
		messages,
		maxTokens: sampleMaxTokens
	})).content);
}
function textFromContent(content) {
	if (isTextBlock(content)) return content.text;
	if (!Array.isArray(content)) throw new Error("The client sample result has no text.");
	const blocks = content;
	for (const block of blocks) if (isTextBlock(block)) return block.text;
	throw new Error("The client sample result has no text.");
}
function isTextBlock(value) {
	return isRecord(value) && value.type === "text" && typeof value.text === "string";
}
function registerServerResource(server, resource, appContext) {
	const metadata = { mimeType: resource.mimeType };
	const resourceContext = (sdkCtx) => ({ context: {
		...appContext(),
		authInfo: sdkCtx.http?.authInfo
	} });
	const read = async (uri, variables, sdkCtx) => resourceContents(uri.href, resource.mimeType, await resource.read(uri, variables, resourceContext(sdkCtx)));
	if (resource.uri !== void 0) {
		server.registerResource(resource.name, resource.uri, metadata, (uri, ctx) => read(uri, {}, ctx));
		return;
	}
	if (resource.uriTemplate === void 0) return;
	const list = resource.list;
	const template = new ResourceTemplate(resource.uriTemplate, { list: list === void 0 ? void 0 : (sdkCtx) => list(resourceContext(sdkCtx)) });
	server.registerResource(resource.name, template, metadata, read);
}
function resourceContents(uri, fallback, body) {
	const mimeType = isRecord(body) && typeof body.mimeType === "string" ? body.mimeType : fallback;
	if (isRecord(body) && typeof body.text === "string") return { contents: [{
		uri,
		mimeType,
		text: body.text
	}] };
	if (isRecord(body) && typeof body.blob === "string") return { contents: [{
		uri,
		mimeType,
		blob: body.blob
	}] };
	if (typeof body === "string") return { contents: [{
		uri,
		mimeType,
		text: body
	}] };
	return { contents: [{
		uri,
		mimeType,
		text: JSON.stringify(body) ?? ""
	}] };
}
function registerServerPrompt(server, { prompt, argsSchema }) {
	server.registerPrompt(prompt.name, {
		description: prompt.description,
		argsSchema
	}, async (args) => {
		return { messages: promptMessages(await prompt.render(args ?? {})) };
	});
}
function promptMessages(rendered) {
	return (Array.isArray(rendered) ? rendered.filter(isPromptMessage) : []).map((item) => {
		const content = {
			type: "text",
			text: item.content
		};
		if (item.role === "assistant") return {
			role: "assistant",
			content
		};
		return {
			role: "user",
			content
		};
	});
}
function isPromptMessage(value) {
	return isRecord(value) && typeof value.role === "string" && typeof value.content === "string";
}
var taskIdParams = { "~standard": {
	version: 1,
	vendor: "tanstack-ai-mcp",
	validate(value) {
		const taskId = isRecord(value) ? value.taskId : void 0;
		if (typeof taskId !== "string" || taskId.length === 0) return { issues: [{ message: "taskId is required" }] };
		return { value: { taskId } };
	}
} };
function registerLegacyTaskMethods(server, store, owner) {
	server.server.setRequestHandler("tasks/get", { params: taskIdParams }, async (params) => {
		const polled = await getTask(taskIdFrom(params), store, owner);
		if (polled === null) throw new ProtocolError(ProtocolErrorCode.InvalidParams, "Task not found");
		return polled.task;
	});
	server.server.setRequestHandler("tasks/result", { params: taskIdParams }, async (params) => {
		const polled = await getTask(taskIdFrom(params), store, owner);
		if (polled === null || polled.record.status !== "completed") throw new ProtocolError(ProtocolErrorCode.InvalidParams, "Task result is not ready");
		return toCallToolResult(polled.record.result);
	});
}
function taskIdFrom(params) {
	if (!isRecord(params) || typeof params.taskId !== "string") throw new ProtocolError(ProtocolErrorCode.InvalidParams, "taskId is required");
	return params.taskId;
}
function standardSchema(schema, io = "input") {
	if (!isSchemaInput(schema)) return void 0;
	const jsonSchema = convertSchemaToJsonSchema(schema, { io });
	if (io === "input") return isJsonObjectSchema(jsonSchema) ? fromJsonSchema(jsonSchema) : void 0;
	return isJsonSchemaRoot(jsonSchema) ? fromJsonSchema(jsonSchema) : void 0;
}
function isJsonSchemaRoot(value) {
	return isRecord(value);
}
function isSchemaInput(schema) {
	if (!isRecord(schema)) return false;
	if ("~standard" in schema) return true;
	return schema.type !== void 0;
}
function isJsonObjectSchema(value) {
	return isRecord(value) && value.type === "object";
}
async function legacyFetch(request, routes) {
	const sessionId = request.headers.get("mcp-session-id");
	if (sessionId !== null && sessionId.length > 0) return routes.resume(sessionId);
	return routes.open();
}
async function resumeLegacySession(request, sessionId, sessions, caller) {
	const session = sessions.get(sessionId);
	if (session === void 0 || session.owner !== caller.owner) return sessionNotFound();
	session.lastUsed = Date.now();
	session.context = caller.context;
	return session.transport.handleRequest(request, { authInfo: caller.authInfo });
}
async function openLegacySession(request, input) {
	let session;
	const server = input.build(() => session === void 0 ? input.context : session.context);
	const transport = new WebStandardStreamableHTTPServerTransport({
		sessionIdGenerator: () => crypto.randomUUID(),
		enableJsonResponse: true,
		keepAliveMs: 0,
		onsessioninitialized: (id) => {
			session = {
				transport,
				server,
				owner: input.owner,
				lastUsed: Date.now(),
				context: input.context
			};
			input.sessions.set(id, session);
		},
		onsessionclosed: (id) => {
			input.sessions.delete(id);
		}
	});
	try {
		await server.connect(transport);
		return await transport.handleRequest(request, { authInfo: input.authInfo });
	} finally {
		if (transport.sessionId === void 0) await server.close();
	}
}
function sessionNotFound() {
	return Response.json({
		jsonrpc: "2.0",
		id: null,
		error: {
			code: -32001,
			message: "Session not found"
		}
	}, { status: 404 });
}
function isRecord(value) {
	return typeof value === "object" && value !== null && !Array.isArray(value);
}
//#endregion
export { createMCPServer };

//# sourceMappingURL=create-server.js.map