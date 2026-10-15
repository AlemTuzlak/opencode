import { reconcileToolCallArguments } from "../../../utilities/tool-call-arguments.js";
import { tanstackMetadata } from "../../../utilities/merge-metadata.js";
import { StandardSchemaValidationError, isStandardSchema, parseWithStandardSchema, validateWithStandardSchema } from "./schema-converter.js";
import { isProviderExecutedToolCall } from "../../../utilities/provider-executed.js";
import { normalizeToolResult } from "../../../utilities/tool-result.js";
import { mergeStreams } from "../../../utilities/merge-streams.js";
import { validateToolInput } from "./input-validation.js";
//#region src/activities/chat/tools/tool-calls.ts
function safeJsonParse(value) {
	try {
		return JSON.parse(value);
	} catch {
		return value;
	}
}
/**
* Parse tool call arguments. A model can send no input for a tool with no
* required fields (an empty tool_use block, issue #265): that is `{}`.
*/
function parseToolArguments(raw) {
	const text = raw.trim();
	return text === "" ? {} : JSON.parse(text);
}
/**
* The final check of a tool input. A literal `null` from the model is also an
* empty tool_use block (issue #265): when the schema rejects `null`, the input
* is `{}`. Other values must fit the schema as they are.
*/
async function checkToolInput(tool, input) {
	try {
		return await validateToolInput(tool.inputSchema, input, tool.name);
	} catch (error) {
		if (input !== null) throw error;
		try {
			return await validateToolInput(tool.inputSchema, {}, tool.name);
		} catch {
			throw error;
		}
	}
}
/** Marks the synthetic tool that runs a subagent. */
var SUBAGENT_TOOL = Symbol.for("tanstack.ai.subagentTool");
/** Set on the tool context of a subagent tool. Streams a child chunk live. */
var EMIT_STREAM_CHUNK = Symbol.for("tanstack.ai.emitStreamChunk");
function isSubagentTool(tool) {
	return tool[SUBAGENT_TOOL] === true;
}
/** Longest string a subagent result sends to the parent model unchanged. */
var MODEL_RESULT_MAX_STRING = 2048;
/**
* A copy of a subagent result that is safe to send to the parent model.
* A string longer than {@link MODEL_RESULT_MAX_STRING} (for example a base64
* image) becomes a short note, so one image result cannot fill the context.
* The full result still travels on `SUBAGENT_FINISHED` for the UI.
*/
function compactForModel(value, depth = 0) {
	if (typeof value === "string") return value.length > MODEL_RESULT_MAX_STRING ? `[omitted ${value.length} characters]` : value;
	if (depth > 20 || typeof value !== "object" || value === null) return value;
	if (Array.isArray(value)) return value.map((item) => compactForModel(item, depth + 1));
	return Object.fromEntries(Object.entries(value).map(([key, item]) => [key, compactForModel(item, depth + 1)]));
}
function readMcpAppMeta(tool) {
	return tool.metadata?.mcp;
}
/**
* Eagerly read a tool's linked `ui://` resource (MCP Apps) and emit a
* `ui-resource` CUSTOM event so the client can render the widget. The model
* still receives the normal text tool-result; the widget rides alongside and
* never enters model input.
*
* Fail-soft: any read error logs a warning and emits nothing — it never throws,
* so the normal tool-result still flows and a broken widget cannot break the run.
*/
async function emitUiResourceIfLinked(tool, context) {
	const mcp = readMcpAppMeta(tool);
	const uiUri = mcp?.uiResourceUri;
	if (!uiUri || !mcp.readResource) return;
	let matched;
	try {
		matched = (await mcp.readResource(uiUri)).contents.find((c) => c.uri === uiUri);
	} catch (err) {
		console.warn(`[mcp-apps] failed to read ui resource ${uiUri}:`, err);
		return;
	}
	if (!matched) {
		console.warn(`[mcp-apps] ui resource ${uiUri} returned no content matching that uri; not emitting`);
		return;
	}
	context.emitCustomEvent("ui-resource", {
		resource: {
			uri: matched.uri,
			mimeType: matched.mimeType ?? "text/html",
			text: matched.text,
			blob: matched.blob
		},
		serverId: mcp.serverId,
		toolName: mcp.serverToolName ?? tool.name,
		meta: void 0
	});
}
/**
* Error thrown when middleware decides to abort the chat run during tool execution.
*/
var MiddlewareAbortError = class extends Error {
	constructor(reason) {
		super(reason);
		this.name = "MiddlewareAbortError";
	}
};
/**
* Manages tool call accumulation and execution for the chat() method's automatic tool execution loop.
*
* Responsibilities:
* - Accumulates streaming tool call events (ID, name, arguments)
* - Validates tool calls (filters out incomplete ones)
* - Executes tool `execute` functions with parsed arguments
* - Emits `TOOL_CALL_END` events for client visibility
* - Returns tool result messages for conversation history
*
* This class is used internally by the AI.chat() method to handle the automatic
* tool execution loop. It can also be used independently for custom tool execution logic.
*
* @example
* ```typescript
* const manager = new ToolCallManager(tools);
*
* // During streaming, accumulate tool calls
* for await (const chunk of stream) {
*   if (chunk.type === 'TOOL_CALL_START') {
*     manager.addToolCallStartEvent(chunk);
*   } else if (chunk.type === 'TOOL_CALL_ARGS') {
*     manager.addToolCallArgsEvent(chunk);
*   }
* }
*
* // After stream completes, execute tools
* if (manager.hasToolCalls()) {
*   const toolResults = yield* manager.executeTools(finishEvent);
*   messages = [...messages, ...toolResults];
*   manager.clear();
* }
* ```
*/
var ToolCallManager = class {
	toolCallsMap = /* @__PURE__ */ new Map();
	tools;
	constructor(tools) {
		this.tools = tools;
	}
	/**
	* Add a TOOL_CALL_START event to begin tracking a tool call (AG-UI)
	*/
	addToolCallStartEvent(event) {
		for (const toolCall of this.toolCallsMap.values()) if (toolCall.id === event.toolCallId) return;
		const index = event.index ?? this.toolCallsMap.size;
		const name = event.toolCallName ?? event.toolName;
		this.toolCallsMap.set(index, {
			id: event.toolCallId,
			type: "function",
			function: {
				name,
				arguments: ""
			},
			...event.metadata !== void 0 && { metadata: event.metadata }
		});
	}
	/**
	* Add a TOOL_CALL_ARGS event to accumulate arguments (AG-UI)
	*/
	addToolCallArgsEvent(event) {
		const extra = event;
		for (const [, toolCall] of this.toolCallsMap.entries()) if (toolCall.id === event.toolCallId) {
			if (typeof extra.args === "string" && extra.args !== "") toolCall.function.arguments = extra.args;
			else toolCall.function.arguments += event.delta;
			break;
		}
	}
	/**
	* Complete a tool call with its final input
	* Called when TOOL_CALL_END is received
	*/
	completeToolCall(event) {
		for (const toolCall of this.toolCallsMap.values()) {
			if (toolCall.id !== event.toolCallId) continue;
			const extra = event;
			const metadata = tanstackMetadata(extra);
			const storedArgs = metadata && "args" in metadata ? metadata.args : void 0;
			const snapshot = typeof extra.args === "string" ? extra.args : storedArgs;
			let raw = typeof snapshot === "string" ? snapshot : toolCall.function.arguments;
			if (typeof snapshot !== "string" && event.input !== void 0) try {
				JSON.parse(raw);
			} catch {
				raw = void 0;
			}
			toolCall.function.arguments = reconcileToolCallArguments(raw, event.input);
			return;
		}
	}
	/**
	* Check if there are any complete tool calls to execute
	*/
	hasToolCalls() {
		return this.getToolCalls().length > 0;
	}
	/**
	* Get all complete tool calls (filtered for valid ID and name)
	*/
	getToolCalls() {
		return Array.from(this.toolCallsMap.values()).filter((tc) => tc.id && tc.function.name && tc.function.name.trim().length > 0);
	}
	/**
	* Execute all tool calls and return tool result messages
	* Yields TOOL_CALL_END events for streaming
	* @param finishEvent - RUN_FINISHED event from the stream
	*/
	async *executeTools(finishEvent, ...contextArgs) {
		const toolCallsArray = this.getToolCalls();
		const toolResults = [];
		const hasRuntimeContext = contextArgs.length > 0;
		const userContext = contextArgs[0];
		for (const toolCall of toolCallsArray) {
			const tool = this.tools.find((t) => t.name === toolCall.function.name);
			let toolResultContent;
			let toolResultState;
			let toolOutput;
			if (tool?.execute) try {
				let args;
				try {
					args = parseToolArguments(toolCall.function.arguments);
				} catch (parseError) {
					throw new Error(`Failed to parse tool arguments as JSON: ${toolCall.function.arguments}`);
				}
				args = await checkToolInput(tool, args);
				const executionContext = {
					toolCallId: toolCall.id,
					context: userContext,
					emitCustomEvent: () => {}
				};
				let result = hasRuntimeContext ? await tool.execute(args, executionContext) : await tool.execute(args);
				if (tool.outputSchema && isStandardSchema(tool.outputSchema)) try {
					result = parseWithStandardSchema(tool.outputSchema, result);
				} catch (validationError) {
					const message = validationError instanceof Error ? validationError.message : "Validation failed";
					throw new Error(`Output validation failed for tool ${tool.name}: ${message}`);
				}
				toolOutput = result;
				toolResultContent = normalizeToolResult(result);
			} catch (error) {
				toolResultContent = `Error executing tool: ${error instanceof Error ? error.message : "Unknown error"}`;
				toolResultState = "output-error";
			}
			else toolResultContent = `Tool ${toolCall.function.name} does not have an execute function`;
			yield {
				type: "TOOL_CALL_END",
				toolCallId: toolCall.id,
				toolCallName: toolCall.function.name,
				toolName: toolCall.function.name,
				model: (() => {
					const model = tanstackMetadata(finishEvent)?.model;
					return typeof model === "string" ? model : void 0;
				})(),
				timestamp: Date.now(),
				...toolOutput !== void 0 ? { output: toolOutput } : {},
				result: toolResultContent,
				...toolResultState !== void 0 && { state: toolResultState }
			};
			toolResults.push({
				role: "tool",
				content: toolResultContent,
				toolCallId: toolCall.id
			});
		}
		return toolResults;
	}
	/**
	* Clear the tool calls map for the next iteration
	*/
	clear() {
		this.toolCallsMap.clear();
	}
};
function isMcpInputRequired(value) {
	if (typeof value !== "object" || value === null) return false;
	if (!("name" in value) || value.name !== "MCPInputRequiredError") return false;
	if (!("kind" in value)) return false;
	if (!(value.kind === "form" || value.kind === "sampling")) return false;
	return "request" in value;
}
function approvalResolution(approvals, toolCallId) {
	return approvals.get(toolCallId) ?? approvals.get(`approval_${toolCallId}`);
}
function isApproved(resolution) {
	return typeof resolution === "boolean" ? resolution : resolution.approved;
}
function editedApprovalArgs(resolution) {
	return typeof resolution === "object" && resolution.approved ? resolution.editedArgs : void 0;
}
function deniedApprovalResult(resolution) {
	return typeof resolution === "object" && !resolution.approved ? resolution.payload ?? { error: "User declined tool execution" } : { error: "User declined tool execution" };
}
/**
* Helper that runs a tool execution promise while polling for pending custom events.
* Yields any custom events that are emitted during execution, then returns the
* execution result.
*/
async function* executeWithEventPolling(executionPromise, pendingEvents) {
	const state = {
		done: false,
		result: void 0
	};
	const executionWithFlag = executionPromise.then((r) => {
		state.done = true;
		state.result = r;
		return r;
	});
	while (!state.done) {
		await Promise.race([executionWithFlag, new Promise((resolve) => setTimeout(resolve, 10))]);
		let event;
		while ((event = pendingEvents.shift()) !== void 0) yield event;
	}
	let event;
	while ((event = pendingEvents.shift()) !== void 0) yield event;
	return state.result;
}
/**
* Push a tool result, then run the onAfterToolCall hook. A `replaceResult`
* decision sets the pushed result, so the model and the stream see it.
* The state does not change: an error result stays an error.
*/
async function pushResultAndRunAfterHook(results, entry, info, middlewareHooks) {
	results.push(entry);
	const decision = await middlewareHooks?.onAfterToolCall?.(info);
	if (decision) entry.result = decision.result;
}
/**
* Apply a middleware onBeforeToolCall decision.
* Returns the (possibly transformed) input if execution should proceed,
* or undefined if the tool call was skipped (result already pushed).
* Throws MiddlewareAbortError if the decision is 'abort'.
*/
async function applyBeforeToolCallDecision(toolCall, tool, input, toolName, middlewareHooks, results) {
	if (!middlewareHooks.onBeforeToolCall) return {
		proceed: true,
		input
	};
	const decision = await middlewareHooks.onBeforeToolCall(toolCall, tool, input);
	if (!decision) return {
		proceed: true,
		input
	};
	if (decision?.type === "abort") throw new MiddlewareAbortError(decision.reason || "Aborted by middleware");
	if (decision?.type === "skip") {
		const skipResult = typeof decision.result === "string" ? safeJsonParse(decision.result) : decision.result ?? null;
		await pushResultAndRunAfterHook(results, {
			toolCallId: toolCall.id,
			toolName,
			result: skipResult,
			duration: 0
		}, {
			toolCall,
			tool,
			toolName,
			toolCallId: toolCall.id,
			ok: true,
			duration: 0,
			result: skipResult
		}, middlewareHooks);
		return { proceed: false };
	}
	return {
		proceed: true,
		input: decision.args
	};
}
/**
* Execute a server-side tool with event polling, output validation, and middleware hooks.
* Yields CustomEvent chunks during execution and pushes the result to the results array.
*/
async function* executeServerTool(toolCall, tool, toolName, input, context, pendingEvents, results, middlewareHooks, inputRequired, subagentInterrupts) {
	const startTime = Date.now();
	try {
		if (!tool.execute) throw new Error(`Tool ${toolName} has no execute() implementation`);
		const subagent = isSubagentTool(tool);
		if (subagent) Object.assign(context, { [EMIT_STREAM_CHUNK]: (chunk) => pendingEvents.push(chunk) });
		let result = yield* executeWithEventPolling(Promise.resolve(tool.execute(input, context)), pendingEvents);
		const duration = Date.now() - startTime;
		if (subagent) {
			const outcome = result;
			if (outcome.interrupts?.length) {
				subagentInterrupts?.push(...outcome.interrupts);
				return;
			}
			const runId = outcome.keepRunId ? { subagentRunId: outcome.subagentRunId } : {};
			const modelResult = outcome.error ? {
				...runId,
				error: outcome.error
			} : {
				...runId,
				result: outcome.result !== void 0 ? compactForModel(outcome.result) : outcome.text
			};
			await pushResultAndRunAfterHook(results, {
				toolCallId: toolCall.id,
				toolName,
				result: modelResult,
				input,
				output: modelResult,
				duration,
				...outcome.error ? { state: "output-error" } : {}
			}, {
				toolCall,
				tool,
				toolName,
				toolCallId: toolCall.id,
				duration,
				...outcome.error ? {
					ok: false,
					error: new Error(outcome.error)
				} : {
					ok: true,
					result: modelResult
				}
			}, middlewareHooks);
			return;
		}
		await emitUiResourceIfLinked(tool, context);
		let pendingEvent;
		while ((pendingEvent = pendingEvents.shift()) !== void 0) yield pendingEvent;
		if (tool.outputSchema && isStandardSchema(tool.outputSchema)) result = parseWithStandardSchema(tool.outputSchema, result);
		const finalResult = typeof result === "string" ? safeJsonParse(result) : result ?? null;
		await pushResultAndRunAfterHook(results, {
			toolCallId: toolCall.id,
			toolName,
			result: finalResult,
			input,
			output: finalResult,
			duration
		}, {
			toolCall,
			tool,
			toolName,
			toolCallId: toolCall.id,
			ok: true,
			duration,
			result: finalResult
		}, middlewareHooks);
	} catch (error) {
		const duration = Date.now() - startTime;
		let pendingEvent;
		while ((pendingEvent = pendingEvents.shift()) !== void 0) yield pendingEvent;
		if (error instanceof MiddlewareAbortError) throw error;
		if (isMcpInputRequired(error)) {
			if (!inputRequired) throw error;
			inputRequired.push({
				toolCallId: toolCall.id,
				toolName,
				kind: error.kind,
				request: error.request,
				...typeof error.reason === "string" ? { reason: error.reason } : {}
			});
			return;
		}
		const message = error instanceof Error ? error.message : "Unknown error";
		await pushResultAndRunAfterHook(results, {
			toolCallId: toolCall.id,
			toolName,
			result: { error: message },
			input,
			state: "output-error",
			duration
		}, {
			toolCall,
			tool,
			toolName,
			toolCallId: toolCall.id,
			ok: false,
			duration,
			error
		}, middlewareHooks);
	}
}
async function buildClientToolResult(toolCallId, toolName, tool, rawResult, input, errorText) {
	if (errorText !== void 0) return {
		toolCallId,
		toolName,
		result: { error: errorText },
		input,
		state: "output-error"
	};
	try {
		let result = rawResult;
		if (tool.outputSchema && isStandardSchema(tool.outputSchema)) {
			const validation = await validateWithStandardSchema(tool.outputSchema, result);
			if (!validation.success) throw new StandardSchemaValidationError(validation.issues);
			result = validation.data;
		}
		const parsed = typeof result === "string" ? safeJsonParse(result) : result ?? null;
		return {
			toolCallId,
			toolName,
			result: parsed,
			input,
			output: parsed
		};
	} catch (error) {
		return {
			toolCallId,
			toolName,
			result: { error: error instanceof Error ? error.message : "Validation failed" },
			input,
			state: "output-error"
		};
	}
}
/**
* Execute tool calls based on their configuration.
* Yields CustomEvent chunks during tool execution for real-time progress updates.
*
* Handles three cases:
* 1. Client tools (no execute) - request client to execute
* 2. Server tools with approval - check approval before executing
* 3. Normal server tools - execute immediately
*
* @param toolCalls - Tool calls from the LLM
* @param tools - Available tools with their configurations
* @param approvals - Map keyed by toolCallId (or `approval_${toolCallId}`) → ToolApprovalResolution
* @param clientResults - Map of client-side execution results (toolCallId -> result)
* @param createCustomEventChunk - Factory to create CustomEvent chunks (optional)
* @param toolExecution - `'parallel'` (default) prepares every call in call
*   order, then starts the server tools together. `'sequential'` runs one
*   call at a time. Results come back in call order either way.
*/
async function* executeToolCalls(toolCalls, tools, approvals = /* @__PURE__ */ new Map(), clientResults = /* @__PURE__ */ new Map(), createCustomEventChunk, middlewareHooks, userContext, abortSignal, resumeState, toolExecution = "parallel") {
	const results = [];
	const needsApproval = [];
	const needsClientExecution = [];
	const inputRequired = [];
	const toolMap = /* @__PURE__ */ new Map();
	for (const tool of tools) toolMap.set(tool.name, tool);
	const runsInOrder = toolExecution === "sequential";
	const runs = [];
	const failures = [];
	const interruptsByCall = /* @__PURE__ */ new Map();
	async function* runServerTool(toolCall, tool, toolName, input, context, pendingEvents) {
		try {
			if (abortSignal?.aborted) {
				await pushResultAndRunAfterHook(results, {
					toolCallId: toolCall.id,
					toolName,
					result: { error: "Operation aborted" },
					input,
					state: "output-error",
					duration: 0
				}, {
					toolCall,
					tool,
					toolName,
					toolCallId: toolCall.id,
					ok: false,
					duration: 0,
					error: /* @__PURE__ */ new Error("Operation aborted")
				}, middlewareHooks);
				return;
			}
			const interrupts = [];
			interruptsByCall.set(toolCall.id, interrupts);
			yield* executeServerTool(toolCall, tool, toolName, input, context, pendingEvents, results, middlewareHooks, inputRequired, interrupts);
		} catch (error) {
			failures.push(error);
		}
	}
	const hasPendingApprovals = toolCalls.some((tc) => {
		return toolMap.get(tc.function.name)?.needsApproval && approvalResolution(approvals, tc.id) === void 0 && !resumeState?.cancelledToolCallIds?.has(tc.id);
	});
	for (const toolCall of toolCalls) {
		if (isProviderExecutedToolCall(toolCall)) continue;
		const tool = toolMap.get(toolCall.function.name);
		const toolName = toolCall.function.name;
		if (!tool) {
			results.push({
				toolCallId: toolCall.id,
				toolName,
				result: { error: `Unknown tool: ${toolName}` },
				state: "output-error"
			});
			continue;
		}
		if (hasPendingApprovals) {
			const isPendingApproval = tool.needsApproval && approvalResolution(approvals, toolCall.id) === void 0;
			const isPlainClientRequest = !tool.needsApproval && !tool.execute;
			if (!isPendingApproval && !isPlainClientRequest) continue;
		}
		if (resumeState?.cancelledToolCallIds?.has(toolCall.id)) {
			results.push({
				toolCallId: toolCall.id,
				toolName,
				result: { error: "Tool execution cancelled" },
				state: "output-error",
				outcome: "cancelled"
			});
			continue;
		}
		let input = {};
		const argsStr = toolCall.function.arguments.trim();
		try {
			input = parseToolArguments(argsStr);
		} catch {
			results.push({
				toolCallId: toolCall.id,
				toolName,
				result: { error: `Failed to parse tool arguments as JSON: ${argsStr}` },
				input,
				state: "output-error"
			});
			continue;
		}
		const resolution = tool.needsApproval ? approvalResolution(approvals, toolCall.id) : void 0;
		const needsPreview = tool.needsApproval && resolution === void 0;
		if (tool.needsApproval && resolution !== void 0 && !isApproved(resolution)) {
			results.push({
				toolCallId: toolCall.id,
				toolName,
				result: resumeState?.deniedToolResults?.get(toolCall.id) ?? deniedApprovalResult(resolution),
				input,
				state: "output-error",
				outcome: "denied"
			});
			continue;
		}
		const editedInput = resolution === void 0 ? void 0 : editedApprovalArgs(resolution);
		if (editedInput !== void 0) input = editedInput;
		if (!needsPreview && middlewareHooks) {
			let decision;
			try {
				decision = await applyBeforeToolCallDecision(toolCall, tool, input, toolName, middlewareHooks, results);
			} catch (error) {
				failures.push(error);
				break;
			}
			if (!decision.proceed) continue;
			input = decision.input;
		}
		try {
			input = await checkToolInput(tool, input);
		} catch (error) {
			const message = error instanceof Error ? error.message : "Validation failed";
			await pushResultAndRunAfterHook(results, {
				toolCallId: toolCall.id,
				toolName,
				result: { error: message },
				input,
				state: "output-error"
			}, {
				toolCall,
				tool,
				toolName,
				toolCallId: toolCall.id,
				ok: false,
				duration: 0,
				error
			}, needsPreview ? void 0 : middlewareHooks);
			continue;
		}
		if (needsPreview) {
			needsApproval.push({
				toolCallId: toolCall.id,
				toolName,
				input,
				approvalId: `approval_${toolCall.id}`
			});
			continue;
		}
		const pendingEvents = [];
		const inputResponse = resumeState?.inputResponses?.get(toolCall.id);
		const context = {
			toolCallId: toolCall.id,
			context: userContext,
			abortSignal,
			...inputResponse !== void 0 ? { inputResponse } : {},
			emitCustomEvent: (eventName, value, options) => {
				if (createCustomEventChunk) pendingEvents.push(createCustomEventChunk(eventName, {
					...value,
					toolCallId: toolCall.id
				}, options));
			}
		};
		if (!tool.execute) {
			const clientError = resumeState?.clientToolErrors?.get(toolCall.id);
			if (clientResults.has(toolCall.id) || clientError !== void 0) results.push(await buildClientToolResult(toolCall.id, toolName, tool, clientResults.get(toolCall.id), input, clientError));
			else needsClientExecution.push({
				toolCallId: toolCall.id,
				toolName,
				input
			});
			continue;
		}
		const run = runServerTool(toolCall, tool, toolName, input, context, pendingEvents);
		if (!runsInOrder) {
			runs.push(run);
			continue;
		}
		yield* run;
		if (failures.length > 0) break;
	}
	yield* mergeStreams(runs);
	if (failures.length > 0) throw failures[0];
	const callOrder = new Map(toolCalls.map((tc, index) => [tc.id, index]));
	const byCallOrder = (a, b) => (callOrder.get(a.toolCallId) ?? 0) - (callOrder.get(b.toolCallId) ?? 0);
	results.sort(byCallOrder);
	inputRequired.sort(byCallOrder);
	return {
		results,
		needsApproval,
		needsClientExecution,
		inputRequired,
		subagentInterrupts: toolCalls.flatMap((tc) => interruptsByCall.get(tc.id) ?? [])
	};
}
//#endregion
export { EMIT_STREAM_CHUNK, MiddlewareAbortError, SUBAGENT_TOOL, ToolCallManager, compactForModel, executeServerTool, executeToolCalls };

//# sourceMappingURL=tool-calls.js.map