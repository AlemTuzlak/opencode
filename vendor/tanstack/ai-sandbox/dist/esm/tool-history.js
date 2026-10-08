import { EventType } from "@tanstack/ai";
//#region src/tool-history.ts
/**
* Turn a harness's PASSTHROUGH tool-call chunks into transcript messages, so a
* finished run's tool cards survive a reload.
*
* Why this is needed at all: a harness executes its tools INSIDE the sandbox, so
* `chat()` only relays its `TOOL_CALL_*` chunks — it never writes an assistant
* message for them (`addAssistantToolCallMessage` is gated on the engine having
* executed the tool itself). Chat persistence stores `ctx.messages`, so the whole
* tool history existed only in the delivery log. Replaying that log is what makes
* "switch away and come back" show everything; a FINISHED thread has no run to
* rejoin, hydrates from the message store instead, and so came back as nothing but
* the prompt and the final answer.
*
* Recording the calls as ordinary `toolCalls` + `role: 'tool'` messages needs no new
* wire format and no client change: `modelMessagesToUIMessages` already merges a tool
* result into the call it belongs to and marks the part complete, and
* `reconstructChat` already runs that converter.
*/
/**
* Metadata key set on every tool call recorded here.
*
* INTERNAL, and deliberately not exported: an app asks {@link isSandboxToolCall}
* instead of knowing the key. Renaming it is a storage-visible change, because it ends
* up inside stored `toolCalls[].metadata`, so the recorder test pins the literal.
*/
var SANDBOX_OBSERVED = "sandboxObserved";
/**
* True when this tool call was executed by the HARNESS inside the sandbox, and
* recorded into the transcript for display, rather than executed by the agent loop.
*
* Use it to decide what your own `MessageStore` keeps — these calls are display
* history, so dropping or capping them is safe (they are already stripped from the
* request to the model on the next turn). Also works on a `tool-call` UI part, whose
* `metadata` is copied straight from the model message.
*
* `metadata` is `unknown` on both, so the key can only be read behind a typeof/`in`
* check; this mirrors the core `isProviderExecutedToolCall` convention.
*
* ```ts
* import { isSandboxToolCall } from '@tanstack/ai-sandbox'
*
* const kept = messages.filter(
*   (message) => !message.toolCalls?.every(isSandboxToolCall),
* )
* ```
*/
function isSandboxToolCall(toolCall) {
	const metadata = toolCall?.metadata;
	return typeof metadata === "object" && metadata !== null && SANDBOX_OBSERVED in metadata && metadata[SANDBOX_OBSERVED] === true;
}
/** Does the transcript already carry this tool call, from any source? */
function hasCall(messages, id) {
	return messages.some((message) => message.toolCalls?.some((call) => call.id === id));
}
/** Does the transcript already carry this tool result? */
function hasResult(messages, id) {
	return messages.some((message) => message.role === "tool" && message.toolCallId === id);
}
function callMessage(id, name, args) {
	return {
		role: "assistant",
		content: null,
		toolCalls: [{
			id,
			type: "function",
			function: {
				name,
				arguments: args
			},
			metadata: { [SANDBOX_OBSERVED]: true }
		}]
	};
}
function resultMessage(id, content) {
	return {
		role: "tool",
		toolCallId: id,
		content
	};
}
function createToolHistoryRecorder() {
	const open = /* @__PURE__ */ new Map();
	/** Completed calls in the order they ran — the order `reconcile` restores. */
	const recorded = [];
	const results = /* @__PURE__ */ new Map();
	function appendCall(target, id, name, args) {
		if (hasCall(target.messages, id)) return;
		target.messages = [...target.messages, callMessage(id, name, args)];
	}
	function appendResult(target, id, content) {
		if (hasResult(target.messages, id)) return;
		target.messages = [...target.messages, resultMessage(id, content)];
	}
	return {
		observe(chunk, target) {
			if (chunk.type === EventType.TOOL_CALL_START) {
				const name = chunk.toolCallName;
				if (!name) return;
				open.set(chunk.toolCallId, {
					name,
					args: ""
				});
				return;
			}
			if (chunk.type === EventType.TOOL_CALL_ARGS) {
				const call = open.get(chunk.toolCallId);
				if (!call) return;
				call.args += chunk.delta;
				return;
			}
			if (chunk.type === EventType.TOOL_CALL_END) {
				const call = open.get(chunk.toolCallId);
				if (!call) return;
				open.delete(chunk.toolCallId);
				recorded.push({
					id: chunk.toolCallId,
					name: call.name,
					args: call.args
				});
				appendCall(target, chunk.toolCallId, call.name, call.args);
				return;
			}
			if (chunk.type === EventType.TOOL_CALL_RESULT) {
				if (typeof chunk.content !== "string") return;
				results.set(chunk.toolCallId, chunk.content);
				appendResult(target, chunk.toolCallId, chunk.content);
			}
		},
		reconcile(target) {
			for (const { id, name, args } of recorded) {
				appendCall(target, id, name, args);
				const result = results.get(id);
				if (result !== void 0) appendResult(target, id, result);
			}
		}
	};
}
/**
* Drop recorded harness tool calls from a list of messages bound for the model.
*
* A stored transcript becomes the history for the NEXT turn. These calls name tools
* the provider was never given, and one triage-sized run is hundreds of kilobytes of
* tool output — so replaying them is wasteful at best and rejected at worst. They stay
* in `ctx.messages` (which is what gets stored and rendered); only the request to the
* model loses them.
*
* An assistant message is dropped only when EVERY call on it is observed, so a mixed
* message — one engine tool call plus one harness tool call — is left alone rather than
* silently losing the engine's half.
*/
function stripObservedToolCalls(messages) {
	const dropped = /* @__PURE__ */ new Set();
	const kept = [];
	for (const message of messages) {
		const calls = message.toolCalls;
		if (calls && calls.length > 0 && calls.every(isSandboxToolCall)) {
			for (const call of calls) dropped.add(call.id);
			continue;
		}
		if (message.role === "tool" && message.toolCallId !== void 0 && dropped.has(message.toolCallId)) continue;
		kept.push(message);
	}
	return kept;
}
//#endregion
export { createToolHistoryRecorder, isSandboxToolCall, stripObservedToolCalls };

//# sourceMappingURL=tool-history.js.map