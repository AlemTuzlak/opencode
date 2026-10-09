import { buildConverseUsage } from "./usage.js";
import { EventType } from "@tanstack/ai";
//#region src/converse/stream-processor.ts
/**
* Converse delivers server-side failures — throttling, request validation,
* mid-stream model faults, and service-unavailable — as in-band stream events
* rather than thrown exceptions. If they were ignored the iterator would simply
* end and the run would look like a clean, truncated success. Throw the
* underlying exception (these SDK members extend `Error`) so the adapter's
* `chatStream` / `structuredOutputStream` catch converts it into a `RUN_ERROR`.
*/
function throwIfConverseStreamError(ev) {
	if ("internalServerException" in ev && ev.internalServerException) throw ev.internalServerException;
	if ("modelStreamErrorException" in ev && ev.modelStreamErrorException) throw ev.modelStreamErrorException;
	if ("validationException" in ev && ev.validationException) throw ev.validationException;
	if ("throttlingException" in ev && ev.throttlingException) throw ev.throttlingException;
	if ("serviceUnavailableException" in ev && ev.serviceUnavailableException) throw ev.serviceUnavailableException;
}
/** Map Converse blocks to run, text, reasoning, and tool events.
* Keep signatures and encrypted bytes separate for each contentBlockIndex.
* Finish after trailing usage events. The adapter handles thrown errors.
*/
async function* processConverseStream(stream, newMessageId, lifecycle = {}) {
	const runId = newMessageId();
	const threadId = lifecycle.threadId ?? newMessageId();
	const { parentRunId, model } = lifecycle;
	const messageId = newMessageId();
	let hasEmittedRunStarted = false;
	let accumulatedContent = "";
	let hasEmittedTextMessageStart = false;
	const reasoningByIndex = /* @__PURE__ */ new Map();
	const toolCallsByIndex = /* @__PURE__ */ new Map();
	let usage;
	let finishReason;
	function* ensureRunStarted() {
		if (hasEmittedRunStarted) return;
		hasEmittedRunStarted = true;
		yield {
			type: EventType.RUN_STARTED,
			runId,
			threadId,
			parentRunId,
			...model && { model },
			timestamp: Date.now()
		};
	}
	function* encryptedReasoning(index) {
		const reasoning = reasoningByIndex.get(index);
		if (!reasoning) return;
		const encrypted = reasoning.redacted ? Buffer.concat(reasoning.bytes).toString("base64") : reasoning.signature;
		if (!encrypted || encrypted === reasoning.encrypted) return;
		reasoning.encrypted = encrypted;
		yield {
			type: EventType.REASONING_ENCRYPTED_VALUE,
			entityId: reasoning.id,
			subtype: "message",
			encryptedValue: encrypted,
			...reasoning.redacted && { stepId: reasoning.id.startsWith("redacted_thinking-") ? reasoning.id : "redacted_thinking-" + reasoning.id },
			timestamp: Date.now()
		};
	}
	function* closeReasoning(index) {
		for (const [blockIndex, reasoning] of reasoningByIndex) {
			if (index !== void 0 && index !== blockIndex) continue;
			yield* encryptedReasoning(blockIndex);
			if (reasoning.closed) continue;
			reasoning.closed = true;
			yield {
				type: EventType.STEP_FINISHED,
				stepId: reasoning.id,
				stepName: reasoning.id,
				delta: "",
				content: reasoning.text,
				timestamp: Date.now()
			};
			yield {
				type: EventType.REASONING_MESSAGE_END,
				messageId: reasoning.id,
				timestamp: Date.now()
			};
			yield {
				type: EventType.REASONING_END,
				messageId: reasoning.id,
				timestamp: Date.now()
			};
		}
	}
	for await (const ev of stream) {
		yield* ensureRunStarted();
		throwIfConverseStreamError(ev);
		if ("messageStart" in ev) continue;
		if ("contentBlockStart" in ev) {
			const start = ev.contentBlockStart;
			const toolUse = start?.start?.toolUse;
			if (start && toolUse) {
				yield* closeReasoning();
				const id = toolUse.toolUseId ?? newMessageId();
				const name = toolUse.name ?? "";
				const index = start.contentBlockIndex ?? 0;
				toolCallsByIndex.set(index, {
					id,
					name,
					started: true,
					arguments: "",
					hasArguments: false
				});
				yield {
					type: EventType.TOOL_CALL_START,
					toolCallId: id,
					parentMessageId: messageId,
					toolCallName: name,
					toolName: name,
					timestamp: Date.now(),
					index
				};
			}
			continue;
		}
		if ("contentBlockDelta" in ev) {
			const block = ev.contentBlockDelta;
			const delta = block?.delta;
			const index = block?.contentBlockIndex ?? 0;
			if (delta && "toolUse" in delta && delta.toolUse?.input !== void 0) {
				const toolCall = toolCallsByIndex.get(index);
				if (toolCall?.started) {
					toolCall.arguments += delta.toolUse.input;
					toolCall.hasArguments = true;
					yield {
						type: EventType.TOOL_CALL_ARGS,
						toolCallId: toolCall.id,
						timestamp: Date.now(),
						delta: delta.toolUse.input
					};
				}
				continue;
			}
			if (delta && "reasoningContent" in delta && delta.reasoningContent) {
				const fragment = delta.reasoningContent;
				let reasoning = reasoningByIndex.get(index);
				if (!reasoning) {
					const redacted = "redactedContent" in fragment && (fragment.redactedContent?.length ?? 0) > 0;
					reasoning = {
						id: (redacted ? "redacted_thinking-" : "") + newMessageId(),
						text: "",
						signature: "",
						bytes: [],
						redacted,
						closed: false
					};
					reasoningByIndex.set(index, reasoning);
					yield {
						type: EventType.STEP_STARTED,
						stepId: reasoning.id,
						stepName: reasoning.id,
						stepType: "thinking",
						timestamp: Date.now()
					};
					yield {
						type: EventType.REASONING_MESSAGE_START,
						messageId: reasoning.id,
						role: "reasoning",
						timestamp: Date.now()
					};
				}
				if (!reasoning.redacted && "text" in fragment && fragment.text !== void 0) {
					reasoning.text += fragment.text;
					yield {
						type: EventType.REASONING_MESSAGE_CONTENT,
						messageId: reasoning.id,
						delta: fragment.text,
						timestamp: Date.now()
					};
				}
				if (!reasoning.redacted && "signature" in fragment && fragment.signature !== void 0) reasoning.signature += fragment.signature;
				if ("redactedContent" in fragment && fragment.redactedContent && fragment.redactedContent.length > 0) {
					if (!reasoning.redacted) reasoning.encrypted = void 0;
					reasoning.redacted = true;
					reasoning.text = "";
					reasoning.signature = "";
					reasoning.bytes.push(fragment.redactedContent);
					yield* encryptedReasoning(index);
				}
				continue;
			}
			if (delta && "text" in delta && delta.text !== void 0) {
				yield* closeReasoning();
				if (!hasEmittedTextMessageStart) {
					hasEmittedTextMessageStart = true;
					yield {
						type: EventType.TEXT_MESSAGE_START,
						messageId,
						role: "assistant",
						timestamp: Date.now()
					};
				}
				accumulatedContent += delta.text;
				yield {
					type: EventType.TEXT_MESSAGE_CONTENT,
					messageId,
					delta: delta.text,
					content: accumulatedContent,
					timestamp: Date.now()
				};
			}
			continue;
		}
		if ("contentBlockStop" in ev) {
			const stopIndex = ev.contentBlockStop?.contentBlockIndex ?? 0;
			yield* closeReasoning(stopIndex);
			const toolCall = toolCallsByIndex.get(stopIndex);
			if (toolCall?.started) {
				yield {
					type: EventType.TOOL_CALL_END,
					toolCallId: toolCall.id,
					...toolCall.hasArguments && { args: toolCall.arguments },
					toolCallName: toolCall.name,
					toolName: toolCall.name,
					timestamp: Date.now()
				};
				toolCallsByIndex.delete(stopIndex);
			}
			continue;
		}
		if ("messageStop" in ev) {
			const stopReason = ev.messageStop?.stopReason;
			finishReason = stopReason === "tool_use" ? "tool_calls" : stopReason === "max_tokens" ? "length" : stopReason === "content_filtered" ? "content_filter" : "stop";
			continue;
		}
		if ("metadata" in ev) {
			const u = ev.metadata?.usage;
			if (u) usage = buildConverseUsage(u);
			continue;
		}
	}
	yield* ensureRunStarted();
	for (const [index, toolCall] of toolCallsByIndex) {
		if (!toolCall.started) continue;
		yield {
			type: EventType.TOOL_CALL_END,
			toolCallId: toolCall.id,
			...toolCall.hasArguments && { args: toolCall.arguments },
			toolCallName: toolCall.name,
			toolName: toolCall.name,
			timestamp: Date.now()
		};
		toolCallsByIndex.delete(index);
	}
	if (hasEmittedTextMessageStart) yield {
		type: EventType.TEXT_MESSAGE_END,
		messageId,
		timestamp: Date.now()
	};
	yield* closeReasoning();
	yield {
		type: EventType.RUN_FINISHED,
		runId,
		threadId,
		timestamp: Date.now(),
		finishReason: finishReason ?? "stop",
		...usage && { usage }
	};
}
//#endregion
export { processConverseStream, throwIfConverseStreamError };

//# sourceMappingURL=stream-processor.js.map