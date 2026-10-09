import { EventType } from "../types.js";
import { BaseTextAdapter } from "../activities/chat/adapter.js";
//#region src/testing/fake-text.ts
var EMPTY_QUEUE = "No more fake responses queued";
var CHARS_PER_TOKEN = 4;
/**
* Numbers each fake, so two fakes in one process (for example two hosts in a
* restart test) never give the same tool-call id.
*/
var fakeCount = 0;
function estimateTokens(text) {
	return Math.ceil(text.length / CHARS_PER_TOKEN);
}
function partText(part) {
	if (part.type === "text") return part.content;
	const source = part.source;
	const mime = "mimeType" in source ? source.mimeType : "unknown";
	return `[${part.type}:${mime}:${source.value.length}]`;
}
function messageText(message) {
	const content = typeof message.content === "string" ? message.content : (message.content ?? []).map(partText).join("");
	const calls = (message.toolCalls ?? []).map((call) => `${call.function.name}:${call.function.arguments}`);
	return [`${message.role}:${content}`, ...calls].join("\n");
}
/** pi's serialized request form: the system prompts, then `role:text` per message. */
function serializeRequest(request) {
	return [...(request.systemPrompts ?? []).map((prompt) => `system:${typeof prompt === "string" ? prompt : prompt.content}`), ...request.messages.map(messageText)].join("\n");
}
function serializeResponse(response) {
	const calls = (response.toolCalls ?? []).map((call) => `${call.name}:${JSON.stringify(call.input ?? {})}`);
	return [
		response.thinking ?? "",
		response.text ?? "",
		...calls
	].filter((part) => part !== "").join("\n");
}
function commonPrefixLength(a, b) {
	const max = Math.min(a.length, b.length);
	let index = 0;
	while (index < max && a[index] === b[index]) index++;
	return index;
}
function chunksOf(text) {
	const chunks = [];
	for (let index = 0; index < text.length; index += CHARS_PER_TOKEN) chunks.push(text.slice(index, index + CHARS_PER_TOKEN));
	return chunks;
}
/**
* A text adapter that answers from a script. Use it to test `chat()`, tools,
* and middleware with no network and no API key. Create it with `fakeText()`.
*/
var FakeTextAdapter = class extends BaseTextAdapter {
	name = "fake";
	/** The context window from the options. */
	contextWindow;
	state = { callCount: 0 };
	queue = [];
	previousRequests = /* @__PURE__ */ new Map();
	options;
	instance = ++fakeCount;
	constructor(model, options) {
		super({}, model);
		this.options = options;
		if (options.input) this.inputModalities = options.input;
		this.contextWindow = options.contextWindow;
	}
	/** Replace the queue of answers. */
	setResponses(responses) {
		this.queue = [...responses];
	}
	/** Add answers to the end of the queue. */
	appendResponses(responses) {
		this.queue.push(...responses);
	}
	/** How many answers are still queued. */
	pendingResponses() {
		return this.queue.length;
	}
	async nextResponse(request) {
		const step = this.queue.shift();
		this.state.callCount++;
		if (step === void 0) return { error: EMPTY_QUEUE };
		return typeof step === "function" ? await step({
			request,
			state: this.state
		}) : step;
	}
	usage(request, response) {
		const serialized = serializeRequest(request);
		const promptTokens = estimateTokens(serialized);
		const completionTokens = estimateTokens(serializeResponse(response));
		const usage = {
			promptTokens,
			completionTokens,
			totalTokens: promptTokens + completionTokens
		};
		const thread = request.threadId;
		if (!this.options.cache || thread === void 0) return usage;
		const previous = this.previousRequests.get(thread) ?? "";
		this.previousRequests.set(thread, serialized);
		const cachedTokens = Math.floor(commonPrefixLength(previous, serialized) / CHARS_PER_TOKEN);
		return {
			...usage,
			promptTokensDetails: {
				cachedTokens,
				cacheWriteTokens: promptTokens - cachedTokens
			}
		};
	}
	async pace(signal) {
		const perSecond = this.options.tokensPerSecond;
		if (!perSecond) return !signal?.aborted;
		await new Promise((resolve) => setTimeout(resolve, 1e3 / perSecond));
		return !signal?.aborted;
	}
	async *chatStream(options) {
		const signal = options.abortController?.signal;
		const runId = options.runId ?? `fake-run-${this.state.callCount + 1}`;
		const threadId = options.threadId ?? "fake-thread";
		const model = this.model;
		const response = await this.nextResponse(options);
		yield {
			type: EventType.RUN_STARTED,
			runId,
			threadId,
			model,
			timestamp: Date.now(),
			...options.parentRunId ? { parentRunId: options.parentRunId } : {}
		};
		if (response.error !== void 0) {
			yield {
				type: EventType.RUN_ERROR,
				model,
				timestamp: Date.now(),
				message: response.error,
				error: { message: response.error }
			};
			return;
		}
		if (response.thinking) {
			const messageId = `${runId}-thinking`;
			yield {
				type: EventType.REASONING_START,
				messageId,
				timestamp: Date.now()
			};
			yield {
				type: EventType.REASONING_MESSAGE_START,
				messageId,
				role: "reasoning",
				timestamp: Date.now()
			};
			for (const delta of chunksOf(response.thinking)) {
				if (!await this.pace(signal)) return;
				yield {
					type: EventType.REASONING_MESSAGE_CONTENT,
					messageId,
					delta,
					timestamp: Date.now()
				};
			}
			yield {
				type: EventType.REASONING_MESSAGE_END,
				messageId,
				timestamp: Date.now()
			};
			yield {
				type: EventType.REASONING_END,
				messageId,
				timestamp: Date.now()
			};
		}
		if (response.text) {
			const messageId = `${runId}-text`;
			yield {
				type: EventType.TEXT_MESSAGE_START,
				messageId,
				role: "assistant",
				model,
				timestamp: Date.now()
			};
			for (const delta of chunksOf(response.text)) {
				if (!await this.pace(signal)) return;
				yield {
					type: EventType.TEXT_MESSAGE_CONTENT,
					messageId,
					delta,
					model,
					timestamp: Date.now()
				};
			}
			yield {
				type: EventType.TEXT_MESSAGE_END,
				messageId,
				model,
				timestamp: Date.now()
			};
		}
		const toolCalls = response.toolCalls ?? [];
		for (const [index, call] of toolCalls.entries()) {
			const toolCallId = call.id ?? `fake-call-${this.instance}-${this.state.callCount}-${index}`;
			yield {
				type: EventType.TOOL_CALL_START,
				toolCallId,
				toolCallName: call.name,
				toolName: call.name,
				model,
				timestamp: Date.now(),
				index
			};
			yield {
				type: EventType.TOOL_CALL_ARGS,
				toolCallId,
				delta: JSON.stringify(call.input ?? {}),
				model,
				timestamp: Date.now()
			};
			yield {
				type: EventType.TOOL_CALL_END,
				toolCallId,
				model,
				timestamp: Date.now()
			};
		}
		yield {
			type: EventType.RUN_FINISHED,
			runId,
			threadId,
			model,
			timestamp: Date.now(),
			finishReason: response.finishReason ?? (toolCalls.length > 0 ? "tool_calls" : "stop"),
			usage: this.usage(options, response)
		};
	}
	/** Answers with the next queued response. Its `text` must be JSON. */
	async structuredOutput(options) {
		const response = await this.nextResponse(options.chatOptions);
		if (response.error !== void 0) throw new Error(response.error);
		const rawText = response.text ?? "";
		return {
			data: JSON.parse(rawText),
			rawText,
			usage: this.usage(options.chatOptions, response)
		};
	}
};
/**
* Create a scripted fake text adapter for tests. Queue answers with
* `setResponses`, then pass the fake to `chat()` as its adapter.
*
* - An empty queue answers with a `RUN_ERROR`: "No more fake responses queued".
* - Usage is estimated as `ceil(characters / 4)` over the request and the
*   answer, so a long message can overflow a small `contextWindow`.
*
* @example
* ```ts
* const fake = fakeText()
* fake.setResponses([{ text: 'Hello' }])
* for await (const chunk of chat({ adapter: fake, messages })) {
*   // ...
* }
* ```
*/
function fakeText(options = {}) {
	return new FakeTextAdapter(options.model ?? "fake-model", options);
}
//#endregion
export { FakeTextAdapter, fakeText };

//# sourceMappingURL=fake-text.js.map