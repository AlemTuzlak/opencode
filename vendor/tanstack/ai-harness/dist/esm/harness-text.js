import { isHarnessDefinition } from "./define.js";
import { acceptedKinds } from "./session.js";
import { createHarnessHost } from "./host.js";
import { EventType, uiMessagesToWire } from "@tanstack/ai";
//#region src/harness-text.ts
var isRecord = (value) => typeof value === "object" && value !== null;
/** The content of the last user message: its text, or its content parts. */
function lastUserInput(messages) {
	return messages.findLast((entry) => entry.role === "user")?.content ?? "";
}
/**
* What a harness reads: text, plus the kinds its session sends the model
* (`modalities`, else the adapter's list, narrowed by `media.accepts`).
* `undefined` when neither is known, so the outer harness sends every kind.
*/
function inputsOf(harness, modalities) {
	const kinds = acceptedKinds(modalities ?? harness.adapter?.inputModalities, harness.media?.accepts);
	if (kinds === void 0) return void 0;
	return ["text", ...kinds.filter((kind) => kind !== "text")];
}
/** Events of the inner turn that the outer chat shows as its own model output. */
var FORWARDED = /* @__PURE__ */ new Set([
	EventType.TEXT_MESSAGE_START,
	EventType.TEXT_MESSAGE_CONTENT,
	EventType.TEXT_MESSAGE_END,
	EventType.REASONING_START,
	EventType.REASONING_MESSAGE_START,
	EventType.REASONING_MESSAGE_CONTENT,
	EventType.REASONING_MESSAGE_END,
	EventType.REASONING_END
]);
var TYPES = {
	providerOptions: {},
	inputModalities: [
		"text",
		"image",
		"audio",
		"video",
		"document"
	],
	messageMetadataByModality: {
		text: void 0,
		image: void 0,
		audio: void 0,
		video: void 0,
		document: void 0
	},
	toolCapabilities: [],
	toolCallMetadata: void 0,
	systemPromptMetadata: void 0
};
/** Stream the SSE `data:` payloads of a response. */
async function* sseData(response) {
	if (!response.body) return;
	const reader = response.body.getReader();
	const decoder = new TextDecoder();
	let buffer = "";
	while (true) {
		const { value, done } = await reader.read();
		if (done) break;
		buffer += decoder.decode(value, { stream: true });
		const blocks = buffer.split("\n\n");
		buffer = blocks.pop() ?? "";
		for (const block of blocks) {
			const data = block.split("\n").find((line) => line.startsWith("data: "))?.slice(6);
			if (data) yield JSON.parse(data);
		}
	}
}
function remoteHarnessText(remote) {
	const base = remote.url.replace(/\/$/, "");
	const doFetch = remote.fetch ?? fetch;
	return {
		kind: "text",
		name: "harness-remote",
		model: base,
		"~types": TYPES,
		structuredOutput: () => Promise.reject(/* @__PURE__ */ new Error("harnessText does not support structured output.")),
		chatStream: (chatOptions) => (async function* () {
			const threadId = chatOptions.threadId ?? "default";
			const runId = chatOptions.runId ?? `harness-${Date.now().toString(36)}`;
			const [message] = uiMessagesToWire([{
				role: "user",
				content: lastUserInput(chatOptions.messages)
			}]);
			const response = await doFetch(`${base}/run`, {
				method: "POST",
				headers: {
					"Content-Type": "application/json",
					...remote.token ? { Authorization: `Bearer ${remote.token}` } : {}
				},
				body: JSON.stringify({
					threadId,
					runId,
					messages: [{
						...message,
						id: `${runId}-user`
					}],
					tools: [],
					context: [],
					state: {},
					forwardedProps: {}
				})
			});
			if (!response.ok) throw new Error(`Remote harness failed (${response.status}): ${await response.text()}`);
			yield {
				type: EventType.RUN_STARTED,
				runId,
				threadId,
				timestamp: Date.now()
			};
			for await (const data of sseData(response)) {
				if (!isRecord(data) || typeof data.type !== "string") continue;
				const chunk = data;
				if (FORWARDED.has(chunk.type) && !("subagentRunId" in chunk && chunk.subagentRunId)) yield chunk;
				if (chunk.type === EventType.RUN_ERROR) {
					yield {
						type: EventType.RUN_ERROR,
						message: chunk.message,
						timestamp: Date.now()
					};
					return;
				}
			}
			yield {
				type: EventType.RUN_FINISHED,
				runId,
				threadId,
				timestamp: Date.now(),
				metadata: { tanstack: { finishReason: "stop" } }
			};
		})()
	};
}
function harnessText(target, options = {}) {
	if (!isHarnessDefinition(target)) return remoteHarnessText(target);
	const harness = target;
	let host = options.host;
	return {
		kind: "text",
		name: "harness",
		model: harness.name,
		inputModalities: inputsOf(harness, options.inputModalities),
		"~types": TYPES,
		chatStream: (chatOptions) => (async function* () {
			host ??= createHarnessHost();
			const threadId = `${chatOptions.threadId ?? "default"}:${harness.name}`;
			const runId = chatOptions.runId ?? `harness-${Date.now().toString(36)}`;
			const signal = isRecord(chatOptions.request) && chatOptions.request.signal instanceof AbortSignal ? chatOptions.request.signal : void 0;
			const operation = (await host.open(harness, { threadId })).prompt(lastUserInput(chatOptions.messages));
			signal?.addEventListener("abort", () => void operation.cancel(), { once: true });
			yield {
				type: EventType.RUN_STARTED,
				runId,
				threadId,
				timestamp: Date.now()
			};
			let failed;
			for await (const chunk of operation.stream()) {
				if (FORWARDED.has(chunk.type) && !("subagentRunId" in chunk && chunk.subagentRunId)) yield chunk;
				if (chunk.type === EventType.RUN_ERROR) failed = chunk.message;
			}
			if (failed !== void 0) {
				yield {
					type: EventType.RUN_ERROR,
					message: failed,
					timestamp: Date.now()
				};
				return;
			}
			yield {
				type: EventType.RUN_FINISHED,
				runId,
				threadId,
				timestamp: Date.now(),
				metadata: { tanstack: { finishReason: "stop" } }
			};
		})(),
		structuredOutput: () => Promise.reject(/* @__PURE__ */ new Error("harnessText does not support structured output."))
	};
}
//#endregion
export { harnessText };

//# sourceMappingURL=harness-text.js.map