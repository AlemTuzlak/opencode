import { MCPInputRequiredError, isMCPInputRequiredError } from "./input-required.js";
import { DEFAULT_REQUEST_TIMEOUT_MSEC, ProtocolError, ProtocolErrorCode, SdkError, SdkErrorCode, isCallToolResult, isInputRequiredResult } from "@modelcontextprotocol/client";
//#region src/tools.ts
/** Reads the MCP Apps `_meta.ui.resourceUri` link from a tool def, if present. */
function extractUiResourceUri(def) {
	const meta = def._meta;
	if (!isRecord(meta)) return void 0;
	const ui = meta.ui;
	if (!isRecord(ui)) return void 0;
	return typeof ui.resourceUri === "string" ? ui.resourceUri : void 0;
}
/**
* The human-readable display name for a tool, following the MCP spec's
* precedence: the top-level `title` field wins, then the legacy
* `annotations.title`, and finally the programmatic `name`.
*/
function toolDisplayTitle(def) {
	return def.title ?? def.annotations?.title ?? def.name;
}
/**
* Build the `metadata.mcp` block stamped onto every discovered/bound tool.
* Shared by auto-discovery (`toServerTools`) and the explicit `tools(defs)`
* path in `client.ts` so the two cannot drift.
*
* `annotations` is a frozen copy of the server's object. A host cannot change
* the server's data through it. Per the MCP spec, its fields (including
* `title`) are hints. A host may use them for display or for an approval UI,
* but never as a security boundary.
*
* Fields the server didn't declare are OMITTED rather than set to `undefined`:
* the explicit path merges this over any `mcp` block the caller already put on
* their tool definition, and an `undefined` value would blank out what they set.
*/
function toolMcpMetadata(def, serverId) {
	const uiResourceUri = extractUiResourceUri(def);
	const annotations = def.annotations;
	return {
		serverToolName: def.name,
		serverId,
		title: toolDisplayTitle(def),
		...uiResourceUri !== void 0 ? { uiResourceUri } : {},
		...annotations !== void 0 ? { annotations: Object.freeze({ ...annotations }) } : {}
	};
}
function mcpContentToTanstack(content) {
	if (!Array.isArray(content)) return "";
	if (content.length === 1 && content[0]?.type === "text") return content[0].text;
	const parts = content.map((c) => {
		switch (c.type) {
			case "text": return {
				type: "text",
				content: c.text
			};
			case "image": return {
				type: "image",
				source: {
					type: "data",
					value: c.data,
					mimeType: c.mimeType
				}
			};
			case "resource": {
				const uri = c.resource?.uri;
				if (typeof uri === "string" && uri.startsWith("ui://")) return {
					type: "text",
					content: ""
				};
				return {
					type: "text",
					content: JSON.stringify(c.resource)
				};
			}
			default: return {
				type: "text",
				content: JSON.stringify(c)
			};
		}
	}).filter((p) => !(p.type === "text" && p.content === ""));
	return parts.length ? parts : "";
}
/**
* Calls one MCP tool and returns the tool result.
*
* A spec 2025 task waits on `tasks/get`, then reads `tasks/result`.
* Spec 2026-07-28 has no tasks, so a 2026 call returns the tool result.
* `chat()` receives the tool result after the task ends.
*
* `signal` stops the wait. This function then sends `tasks/cancel`.
* It does not wait for that cancel request.
*
* If the tool result asks for input, this function throws
* {@link MCPInputRequiredError}.
* `kind` is `form` for user input, or `sampling` for a model request.
* `request` is the input request body.
* This function does not catch that error.
*
* On spec 2026, pass `inputResponse` to answer an input request.
* The call gets the request again, then sends the answer at once
* with `inputResponses` and the server's `requestState`.
* If the server asks for input again after that answer, this throws an Error.
*
* @param client - Connected MCP client
* @param mcpName - Server tool name
* @param args - Tool arguments
* @param taskRequired - True when the tool requires a spec 2025 task
* @param signal - Stops the wait when the caller aborts
* @param inputResponse - The user's answer from an `mcp_input` interrupt
* @param requestOptions - The client `requestOptions`, sent with tools/call
* @param askInput - Asks the user for each elicitation round on spec 2026.
*   The harness sets it. Without it, a call answers one round.
*/
async function callMcpTool(client, mcpName, args, taskRequired, signal, inputResponse, requestOptions, askInput) {
	signal?.throwIfAborted();
	const isModern = client.getProtocolEra() === "modern";
	if (!taskRequired && !isModern) {
		const result = await client.callTool({
			name: mcpName,
			arguments: args
		}, {
			...sdkRequestOptions(requestOptions, signal),
			allowInputRequired: true
		});
		throwIfInputRequired(result);
		return result;
	}
	const params = {
		name: mcpName,
		arguments: args
	};
	let raw = isModern ? await rawRequest(client, "tools/call", params, signal, requestOptions) : await sdkRequest(client, "tools/call", {
		name: mcpName,
		arguments: args,
		task: {}
	}, signal, requestOptions);
	if (isModern && inputResponse !== void 0 && isInputRequiredResult(raw)) {
		raw = await rawRequest(client, "tools/call", {
			...params,
			...retryParams(raw, inputResponse)
		}, signal, requestOptions);
		if (isInputRequiredResult(raw) && askInput === void 0) throw new Error(`The MCP tool "${mcpName}" asked for input a second time. This client answers one input request per tool call.`);
	}
	for (let round = 1; isModern && askInput && isInputRequiredResult(raw); round++) {
		const entry = firstInputRequest(raw.inputRequests);
		if (entry?.method !== "elicitation/create") break;
		if (round > maxInputRounds) throw new Error(`The MCP tool "${mcpName}" asked for input more than ${maxInputRounds} times in one call.`);
		const answer = await askInput(isRecord(entry.params) ? entry.params : entry);
		raw = await rawRequest(client, "tools/call", {
			...params,
			...retryParams(raw, answer)
		}, signal, requestOptions);
	}
	return finishToolCall(client, mcpName, raw, signal);
}
var maxInputRounds = 5;
function retryParams(result, response) {
	const requests = isRecord(result.inputRequests) ? result.inputRequests : {};
	const key = Object.keys(requests)[0];
	const entry = key === void 0 ? void 0 : requests[key];
	const method = isRecord(entry) ? entry.method : void 0;
	const requestState = result.requestState === void 0 ? {} : { requestState: result.requestState };
	if (key === void 0) return requestState;
	return {
		inputResponses: { [key]: inputAnswer(method, response) },
		...requestState
	};
}
function inputAnswer(method, response) {
	if (method === "sampling/createMessage") {
		if (response.status === "cancelled") throw new Error("The user cancelled the MCP sampling request.");
		const payload = response.payload;
		if (typeof payload !== "string") return payload;
		return {
			role: "assistant",
			content: {
				type: "text",
				text: payload
			},
			model: "user"
		};
	}
	if (response.status === "cancelled") return { action: "cancel" };
	const payload = response.payload;
	if (isRecord(payload) && typeof payload.action === "string") return payload;
	return {
		action: "accept",
		content: payload
	};
}
var schemaSlot = void 0;
var passThroughResult = { "~standard": {
	version: 1,
	vendor: "tanstack-ai-mcp",
	types: {
		input: schemaSlot,
		output: schemaSlot
	},
	validate(value) {
		return { value };
	}
} };
var defaultPollMs = 1e3;
var rawRequestId = 0;
var transportTaps = /* @__PURE__ */ new WeakMap();
async function finishToolCall(client, mcpName, raw, signal) {
	throwIfInputRequired(raw);
	const task = readNestedTask(raw);
	if (task !== void 0) return pollTask(client, mcpName, task, signal);
	if (isCallToolResult(raw)) return raw;
	throw missingTaskResult(mcpName);
}
async function pollTask(client, mcpName, task, signal) {
	let current = task;
	try {
		while (current.status === "working" || current.status === "input_required") {
			if (current.status === "input_required") {
				cancelTask(client, current.taskId);
				throw new Error(`MCP task "${current.taskId}" needs input. This client cannot answer a spec 2025 task input request.`);
			}
			await waitForPoll(current.pollInterval ?? defaultPollMs, signal);
			current = await readPolledTask(client, current.taskId, mcpName, signal);
		}
	} catch (error) {
		if (isMCPInputRequiredError(error)) throw error;
		if (signal?.aborted) {
			cancelTask(client, task.taskId);
			throw abortReason(signal);
		}
		throw error;
	}
	switch (current.status) {
		case "completed": return taskResult(client, mcpName, current.taskId, signal);
		case "failed":
		case "cancelled": throw terminalTaskError(current);
		default: {
			const unexpected = current.status;
			throw new Error(`Unknown MCP task status: ${String(unexpected)}`);
		}
	}
}
async function taskResult(client, mcpName, taskId, signal) {
	const result = await taskRequest(client, "tasks/result", { taskId }, signal);
	throwIfInputRequired(result);
	if (!isCallToolResult(result)) throw missingTaskResult(mcpName);
	return result;
}
async function readPolledTask(client, taskId, mcpName, signal) {
	const body = await taskRequest(client, "tasks/get", { taskId }, signal);
	throwIfInputRequired(body);
	const task = readTaskState(body);
	if (task === void 0) throw missingTaskResult(mcpName);
	return task;
}
function taskRequest(client, method, params, signal) {
	return sdkRequest(client, method, params, signal);
}
/**
* The SDK options for one request: the client `requestOptions` plus the
* caller's `signal`. `undefined` when both are unset, so the SDK defaults
* apply.
*
* The SDK asks the server for progress only when `onprogress` is set. So a
* no-op `onprogress` comes with `resetTimeoutOnProgress`, or that option
* would never see a progress notification.
*/
function sdkRequestOptions(requestOptions, signal) {
	if (requestOptions === void 0 && signal === void 0) return void 0;
	return {
		...requestOptions,
		...requestOptions?.resetTimeoutOnProgress ? { onprogress: () => {} } : {},
		...signal === void 0 ? {} : { signal }
	};
}
async function sdkRequest(client, method, params, signal, requestOptions) {
	signal?.throwIfAborted();
	const rpc = {
		method,
		params
	};
	try {
		return await client.request(rpc, passThroughResult, sdkRequestOptions(requestOptions, signal));
	} catch (error) {
		if (signal?.aborted) throw abortReason(signal);
		throw error;
	}
}
function rawRequest(client, method, params, signal, requestOptions) {
	signal?.throwIfAborted();
	const transport = client.transport;
	if (transport === void 0) throw new Error("The MCP client is not connected.");
	rawRequestId += 1;
	const id = `tanstack-ai-mcp:${rawRequestId}`;
	const listeners = tapTransport(transport);
	const body = withEnvelope(params, readEnvelope(client));
	return new Promise((resolve, reject) => {
		let settled = false;
		const timeout = requestOptions?.timeout ?? DEFAULT_REQUEST_TIMEOUT_MSEC;
		const timer = setTimeout(() => {
			finish(new SdkError(SdkErrorCode.RequestTimeout, `The MCP request ${method} timed out after ${timeout} ms.`));
		}, timeout);
		const finish = (error, result) => {
			if (settled) return;
			settled = true;
			clearTimeout(timer);
			listeners.delete(accept);
			if (signal !== void 0) signal.removeEventListener("abort", onAbort);
			if (error !== void 0) {
				reject(error);
				return;
			}
			resolve(result);
		};
		const accept = (message) => {
			if (!isRecord(message) || message.id !== id) return false;
			if (isRecord(message.error)) {
				const { code, message: text, data } = message.error;
				finish(new ProtocolError(typeof code === "number" ? code : ProtocolErrorCode.InternalError, typeof text === "string" ? text : "The MCP request failed.", data));
				return true;
			}
			finish(void 0, message.result);
			return true;
		};
		const activeSignal = signal;
		const onAbort = () => {
			if (activeSignal === void 0) return;
			finish(abortReason(activeSignal));
		};
		listeners.add(accept);
		if (activeSignal !== void 0) activeSignal.addEventListener("abort", onAbort, { once: true });
		transport.send({
			jsonrpc: "2.0",
			id,
			method,
			params: body
		}).catch((error) => {
			finish(error);
		});
	});
}
function tapTransport(transport) {
	const existing = transportTaps.get(transport);
	if (existing !== void 0) return existing;
	const listeners = /* @__PURE__ */ new Set();
	transportTaps.set(transport, listeners);
	const previous = transport.onmessage;
	transport.onmessage = (message, extra) => {
		const pending = [...listeners];
		for (const listener of pending) if (listener(message)) return;
		previous?.(message, extra);
	};
	return listeners;
}
function readEnvelope(client) {
	const value = client;
	if (!isRecord(value)) return void 0;
	const method = value._outboundMetaEnvelope;
	if (typeof method !== "function") return void 0;
	const called = method.call(value);
	if (!isRecord(called)) return void 0;
	return called;
}
function withEnvelope(params, envelope) {
	if (envelope === void 0) return params;
	const meta = isRecord(params._meta) ? params._meta : {};
	return {
		...params,
		_meta: {
			...envelope,
			...meta
		}
	};
}
function cancelTask(client, taskId) {
	return taskRequest(client, "tasks/cancel", { taskId }).catch(() => void 0);
}
function throwIfInputRequired(value) {
	if (!isRecord(value)) return;
	if (isInputRequiredResult(value)) throwInputRequired(value.inputRequests, value);
	if (value.status !== "input_required") return;
	if (!hasRequests(value.inputRequests)) return;
	throwInputRequired(value.inputRequests, value);
}
function throwInputRequired(requests, fallback) {
	const entry = firstInputRequest(requests);
	if (entry === void 0) throw new MCPInputRequiredError("form", fallback);
	const body = isRecord(entry.params) ? entry.params : entry;
	if (entry.method === "sampling/createMessage") throw new MCPInputRequiredError("sampling", body);
	if (entry.method === "elicitation/create") throw new MCPInputRequiredError("form", body);
	throw new Error(`The MCP server asked for unsupported input: ${entry.method}`);
}
function firstInputRequest(requests) {
	if (!isRecord(requests)) return void 0;
	const entries = Object.values(requests);
	for (const entry of entries) {
		if (!isRecord(entry) || typeof entry.method !== "string") continue;
		return entry;
	}
}
function hasRequests(requests) {
	return isRecord(requests) && Object.keys(requests).length > 0;
}
function readNestedTask(value) {
	if (!isRecord(value)) return void 0;
	return readTaskState(value.task);
}
function readTaskState(value) {
	if (!isRecord(value)) return void 0;
	if (typeof value.taskId !== "string" || value.taskId.length === 0) return;
	if (!isTaskStatus(value.status)) return void 0;
	return {
		taskId: value.taskId,
		status: value.status,
		pollInterval: typeof value.pollInterval === "number" ? value.pollInterval : void 0,
		statusMessage: typeof value.statusMessage === "string" ? value.statusMessage : void 0
	};
}
function isTaskStatus(value) {
	switch (value) {
		case "working":
		case "input_required":
		case "completed":
		case "failed":
		case "cancelled": return true;
		default: return false;
	}
}
function terminalTaskError(task) {
	const detail = task.statusMessage;
	if (detail !== void 0 && detail.length > 0) return /* @__PURE__ */ new Error(`MCP task "${task.taskId}" ${task.status}: ${detail}`);
	return /* @__PURE__ */ new Error(`MCP task "${task.taskId}" ${task.status}.`);
}
function missingTaskResult(mcpName) {
	return /* @__PURE__ */ new Error(`MCP task-required tool "${mcpName}" ended without a result or error`);
}
function waitForPoll(milliseconds, signal) {
	signal?.throwIfAborted();
	if (milliseconds <= 0) return Promise.resolve();
	if (signal === void 0) return new Promise((resolve) => {
		setTimeout(resolve, milliseconds);
	});
	const active = signal;
	return new Promise((resolve, reject) => {
		const timer = setTimeout(() => {
			active.removeEventListener("abort", onAbort);
			resolve();
		}, milliseconds);
		const onAbort = () => {
			clearTimeout(timer);
			reject(abortReason(active));
		};
		active.addEventListener("abort", onAbort, { once: true });
	});
}
function abortReason(signal) {
	return signal.reason instanceof Error ? signal.reason : new DOMException("Aborted", "AbortError");
}
function isRecord(value) {
	return typeof value === "object" && value !== null && !Array.isArray(value);
}
/**
* Build the execute body that proxies a TanStack tool call to an MCP server.
* Shared by auto-discovery and the definition path.
*
* @param preferStructured when true (i.e. the tool declares an outputSchema),
*   return `result.structuredContent` if present so the existing output
*   validation in `executeServerTool` validates MCP's typed payload rather than
*   a JSON-in-text blob. Otherwise normalize `content[]` → string | ContentPart[].
* @param requestOptions - The client `requestOptions`, sent with each call
*/
function makeMcpExecute(client, mcpName, preferStructured, taskRequired = false, requestOptions) {
	return async (args, ctx) => {
		const result = await callMcpTool(client, mcpName, isRecord(args) ? args : {}, taskRequired, ctx?.abortSignal, ctx?.inputResponse, requestOptions, ctx?.askInput);
		if (result.isError) {
			const text = Array.isArray(result.content) ? mcpContentToTanstack(result.content) : void 0;
			const detail = typeof text === "string" ? text : text === void 0 ? void 0 : JSON.stringify(text);
			throw new Error(!detail ? `MCP tool "${mcpName}" returned an error` : `MCP tool "${mcpName}" returned an error: ${detail}`);
		}
		if (preferStructured && result.structuredContent !== void 0) return result.structuredContent;
		return mcpContentToTanstack(result.content);
	};
}
/** A tool that must run as a task. */
function requiresTaskExecution(def) {
	return def.execution?.taskSupport === "required";
}
/** The server declares task-based execution support for tools/call. */
function serverSupportsTaskCalls(client) {
	return Boolean(client.getServerCapabilities()?.tasks?.requests?.tools?.call);
}
/**
* Auto-discovery path: turn raw MCP tool defs into ServerTools. Task-required
* tools are excluded when the server does not declare the tasks capability
* for tools/call — every invocation would fail, so they must not be offered
* to the model.
*/
function toServerTools(client, defs, options) {
	const supportsTasks = serverSupportsTaskCalls(client);
	return defs.filter((def) => !requiresTaskExecution(def) || supportsTasks).map((def) => {
		const name = options.toolName?.(def) ?? (options.prefix ? `${options.prefix}_${def.name}` : def.name);
		const schema = def.inputSchema ?? {};
		const tool = {
			__toolSide: "server",
			name,
			description: def.description ?? "",
			inputSchema: {
				...schema,
				type: schema.type ?? "object",
				properties: schema.properties ?? {}
			},
			...def.outputSchema ? { outputSchema: def.outputSchema } : {},
			...options.lazy ? { lazy: true } : {},
			metadata: { mcp: toolMcpMetadata(def, options.prefix) },
			execute: makeMcpExecute(client, def.name, Boolean(def.outputSchema), requiresTaskExecution(def), options.requestOptions)
		};
		if (options.needsApproval?.(def)) {
			const approvable = tool;
			approvable.needsApproval = true;
		}
		return tool;
	});
}
//#endregion
export { callMcpTool, extractUiResourceUri, makeMcpExecute, mcpContentToTanstack, requiresTaskExecution, sdkRequestOptions, serverSupportsTaskCalls, toServerTools, toolMcpMetadata };

//# sourceMappingURL=tools.js.map