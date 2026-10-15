import { getGeminiProviderToolKind, getGeminiProviderToolMetadata } from "../../tools/gemini-provider-tool.js";
import { interactionsThinking } from "../../text/reasoning.js";
import { GEMINI_MODEL_REASONING } from "../../model-reasoning.js";
import { createGeminiClient, generateId, getGeminiApiKeyFromEnv } from "../../utils/client.js";
import { prepareGeminiMessagesForReplay, withGeminiSource } from "../../adapters/text.js";
import { EventType, fileReferenceFor, isFileSource } from "@tanstack/ai";
import { assertUniqueToolNames, sanitizeJsonArguments, sanitizeUnicode } from "@tanstack/ai/adapter-internals";
import { BaseTextAdapter } from "@tanstack/ai/adapters";
import { parse } from "partial-json";
//#region src/experimental/text-interactions/adapter.ts
/**
* Tree-shakeable adapter for Gemini's stateful Interactions API. Routes
* through `client.interactions.create` and surfaces the server-assigned
* `interactionId` via an AG-UI `CUSTOM` event with
* `name: 'gemini.interactionId'` emitted just before `RUN_FINISHED`; pass
* that id back on the next turn via `modelOptions.previous_interaction_id`
* to continue the conversation without resending history.
*
* The Interactions API does NOT support stateless multi-turn replay —
* passing more than one message in `messages` without a
* `previous_interaction_id` throws. For a chat UI that maintains local
* history (e.g. `useChat`), see the "Wiring with `useChat`" section of
* `docs/adapters/gemini.md` for the canonical client/server pattern.
*
* Supports user-defined function tools and the built-in tools
* `google_search`, `code_execution`, `url_context`, `file_search`, and
* `computer_use`. Built-in tool *activity* for the four search/exec
* variants is surfaced via `CUSTOM` events
* (`gemini.googleSearchCall` / `gemini.googleSearchResult` and the
* corresponding per-tool variants) carrying the raw Interactions delta;
* see {@link GeminiInteractionsCustomEvent}. `computer_use` is accepted
* in the request but the Interactions API does not currently stream
* per-delta CUSTOM events for it. The `google_search_retrieval` and
* `google_maps` provider-tool factories are not supported on this adapter and
* throw a targeted error. There is no Gemini `mcp_server` factory, so a tool
* merely *named* `mcp_server` is an ordinary function and is sent as a function
* declaration like any other.
*
* @experimental Interactions API is in Beta per Google; shapes may change.
* @see https://ai.google.dev/gemini-api/docs/interactions
*/
var GeminiTextInteractionsAdapter = class extends BaseTextAdapter {
	kind = "text";
	name = "gemini-text-interactions";
	api = "google-interactions";
	provider;
	supportsFileSources = true;
	client;
	interactionIdByThread = /* @__PURE__ */ new Map();
	constructor(config, model) {
		super({}, model);
		this.provider = config.vertexai === true || config.enterprise === true ? "google-vertex" : "google";
		this.client = createGeminiClient(config);
	}
	async *chatStream(options) {
		const source = {
			provider: this.provider,
			api: this.api,
			model: options.model
		};
		const prepared = {
			...options,
			messages: prepareGeminiMessagesForReplay(options.messages, source)
		};
		for await (const chunk of this.chatStreamRequest(prepared)) yield withGeminiSource(chunk, source);
	}
	async *chatStreamRequest(options) {
		const runId = options.runId ?? generateId(this.name);
		const threadId = options.threadId ?? generateId(this.name);
		const timestamp = Date.now();
		const { logger } = options;
		if (!options.modelOptions?.previous_interaction_id && options.messages.length === 1 && options.messages[0]?.role === "user") this.interactionIdByThread.delete(threadId);
		const effectivePreviousInteractionId = options.modelOptions?.previous_interaction_id ?? this.interactionIdByThread.get(threadId);
		let sawTerminalEvent = false;
		let completedTryBlock = false;
		try {
			const request = buildInteractionsRequest({
				...options,
				modelOptions: {
					...options.modelOptions,
					previous_interaction_id: effectivePreviousInteractionId
				}
			});
			logger.request(`activity=chat provider=gemini-text-interactions model=${this.model} messages=${options.messages.length} tools=${options.tools?.length ?? 0} stream=true`, {
				provider: "gemini-text-interactions",
				model: this.model,
				request
			});
			const stream = await this.client.interactions.create({
				...request,
				stream: true
			}, { signal: abortSignalFromOptions(options) });
			for await (const chunk of translateInteractionEvents(stream, options.model, runId, threadId, options.parentRunId, timestamp, this.name, logger)) {
				if (chunk.type === EventType.CUSTOM && chunk.name === "gemini.interactionId") {
					const value = chunk.value;
					this.interactionIdByThread.set(threadId, value.interactionId);
				}
				if (chunk.type === EventType.RUN_FINISHED) sawTerminalEvent = true;
				else if (chunk.type === EventType.RUN_ERROR) {
					sawTerminalEvent = true;
					this.interactionIdByThread.delete(threadId);
				}
				yield chunk;
			}
			if (!sawTerminalEvent) {
				this.interactionIdByThread.delete(threadId);
				const message = "Gemini Interactions stream ended without a terminal event (no interaction.complete or error)";
				logger.errors("gemini-text-interactions.chatStream truncated", {
					source: "gemini-text-interactions.chatStream",
					runId,
					threadId
				});
				yield {
					type: EventType.RUN_ERROR,
					runId,
					model: options.model,
					timestamp,
					message,
					error: { message }
				};
			}
			completedTryBlock = true;
		} catch (error) {
			this.interactionIdByThread.delete(threadId);
			const message = error instanceof Error ? error.message : "An unknown error occurred during the interactions stream.";
			logger.errors("gemini-text-interactions.chatStream fatal", {
				error,
				source: "gemini-text-interactions.chatStream"
			});
			yield {
				type: EventType.RUN_ERROR,
				runId,
				model: options.model,
				timestamp,
				message,
				error: { message }
			};
		} finally {
			if (!completedTryBlock) this.interactionIdByThread.delete(threadId);
		}
	}
	async structuredOutput(options) {
		const { chatOptions, outputSchema } = options;
		const { logger } = chatOptions;
		const threadId = chatOptions.threadId;
		const effectivePreviousInteractionId = chatOptions.modelOptions?.previous_interaction_id ?? (threadId ? this.interactionIdByThread.get(threadId) : void 0);
		const request = {
			...buildInteractionsRequest({
				...chatOptions,
				messages: prepareGeminiMessagesForReplay(chatOptions.messages, {
					provider: this.provider,
					api: this.api,
					model: chatOptions.model
				}),
				modelOptions: {
					...chatOptions.modelOptions,
					previous_interaction_id: effectivePreviousInteractionId
				}
			}),
			response_format: {
				type: "text",
				mime_type: "application/json",
				schema: outputSchema
			}
		};
		try {
			logger.request(`activity=chat provider=gemini-text-interactions model=${this.model} messages=${chatOptions.messages.length} tools=${chatOptions.tools?.length ?? 0} stream=false`, {
				provider: "gemini-text-interactions",
				model: this.model,
				request
			});
			const result = await this.client.interactions.create(request, { signal: abortSignalFromOptions(chatOptions) });
			const rawText = extractTextFromInteraction(result);
			if (!rawText) throw new Error(`Gemini Interactions returned no text output for structured-output request (status: ${result.status}). The model may have produced only tool calls or non-text content.`);
			let parsed;
			try {
				parsed = JSON.parse(rawText);
			} catch {
				throw new Error(jsonContentParseError(rawText, "structured output"));
			}
			return {
				data: parsed,
				rawText,
				...result.id && { responseId: result.id },
				...result.model && { model: result.model }
			};
		} catch (error) {
			logger.errors("gemini-text-interactions.structuredOutput fatal", {
				error,
				source: "gemini-text-interactions.structuredOutput"
			});
			throw new Error(error instanceof Error ? error.message : "An unknown error occurred during structured output generation.", { cause: error });
		}
	}
	async *structuredOutputStream(options) {
		const source = {
			provider: this.provider,
			api: this.api,
			model: options.chatOptions.model
		};
		for await (const chunk of this.structuredOutputRequestStream({
			...options,
			chatOptions: {
				...options.chatOptions,
				messages: prepareGeminiMessagesForReplay(options.chatOptions.messages, source)
			}
		})) yield withGeminiSource(chunk, source);
	}
	async *structuredOutputRequestStream(options) {
		const { chatOptions, outputSchema } = options;
		const runId = chatOptions.runId ?? generateId(this.name);
		const threadId = chatOptions.threadId ?? generateId(this.name);
		const timestamp = Date.now();
		const effectivePreviousInteractionId = chatOptions.modelOptions?.previous_interaction_id ?? this.interactionIdByThread.get(threadId);
		const request = {
			...buildInteractionsRequest({
				...chatOptions,
				modelOptions: {
					...chatOptions.modelOptions,
					previous_interaction_id: effectivePreviousInteractionId
				}
			}),
			stream: true,
			response_format: {
				type: "text",
				mime_type: "application/json",
				schema: outputSchema
			}
		};
		try {
			chatOptions.logger.request(`activity=structuredOutputStream provider=gemini-text-interactions model=${this.model} messages=${chatOptions.messages.length}`, {
				provider: this.name,
				model: this.model,
				request
			});
			const stream = await this.client.interactions.create(request, { signal: abortSignalFromOptions(chatOptions) });
			let rawText = "";
			let finished;
			let failed = false;
			for await (const chunk of translateInteractionEvents(stream, chatOptions.model, runId, threadId, chatOptions.parentRunId, timestamp, this.name, chatOptions.logger)) {
				if (chunk.type === EventType.TEXT_MESSAGE_CONTENT) rawText += chunk.delta;
				if (chunk.type === EventType.CUSTOM && chunk.name === "gemini.interactionId") {
					const value = chunk.value;
					this.interactionIdByThread.set(threadId, value.interactionId);
				}
				if (chunk.type === EventType.RUN_ERROR) failed = true;
				if (chunk.type === EventType.RUN_FINISHED) finished = chunk;
				else yield chunk;
			}
			if (failed) return;
			if (!finished) {
				yield interactionsStructuredStreamError(chatOptions, runId, "Gemini Interactions structured-output stream ended without a terminal event", "truncated-stream");
				return;
			}
			if (!rawText) {
				yield interactionsStructuredStreamError(chatOptions, runId, "Gemini Interactions structured-output stream contained no content", "empty-response");
				return;
			}
			let object;
			try {
				object = JSON.parse(rawText);
			} catch {
				yield interactionsStructuredStreamError(chatOptions, runId, jsonContentParseError(rawText, "Gemini Interactions structured-output stream"), "parse-error");
				return;
			}
			yield {
				type: EventType.CUSTOM,
				name: "structured-output.complete",
				value: {
					object,
					raw: rawText
				},
				model: chatOptions.model,
				timestamp: Date.now()
			};
			yield {
				...finished,
				timestamp: Date.now()
			};
		} catch (error) {
			const message = error instanceof Error ? error.message : "An unknown error occurred during structured output streaming.";
			chatOptions.logger.errors("gemini-text-interactions.structuredOutputStream fatal", {
				error,
				source: "gemini-text-interactions.structuredOutputStream"
			});
			yield interactionsStructuredStreamError(chatOptions, runId, message, "provider-error");
		}
	}
};
function abortSignalFromOptions(options) {
	return options.request?.signal ?? options.abortController?.signal;
}
function jsonContentParseError(rawText, label) {
	return `Failed to parse ${label} as JSON. Content: ${rawText.slice(0, 200)}${rawText.length > 200 ? "..." : ""}`;
}
function interactionsStructuredStreamError(options, runId, message, code) {
	return {
		type: EventType.RUN_ERROR,
		runId,
		model: options.model,
		timestamp: Date.now(),
		message,
		code,
		error: {
			message,
			code
		}
	};
}
/** @experimental Interactions API is in Beta. */
function createGeminiTextInteractions(model, apiKey, config) {
	return new GeminiTextInteractionsAdapter({
		apiKey,
		...config
	}, model);
}
/** @experimental Interactions API is in Beta. */
function geminiTextInteractions(model, config) {
	return createGeminiTextInteractions(model, getGeminiApiKeyFromEnv(), config);
}
function buildInteractionsRequest(options) {
	const modelOpts = options.modelOptions;
	const systemInstruction = modelOpts?.system_instruction ?? options.systemPrompts?.join("\n");
	const generationConfig = {
		...modelOpts?.generation_config,
		...interactionsThinking(options.reasoning, GEMINI_MODEL_REASONING[options.model])
	};
	const hasGenerationConfig = Object.keys(generationConfig).length > 0;
	const input = convertMessagesToInteractionsInput(options.messages, modelOpts?.previous_interaction_id !== void 0);
	return {
		model: options.model,
		input,
		previous_interaction_id: modelOpts?.previous_interaction_id,
		system_instruction: systemInstruction === void 0 ? void 0 : sanitizeUnicode(systemInstruction),
		tools: convertToolsToInteractionsFormat(options.tools),
		generation_config: hasGenerationConfig ? generationConfig : void 0,
		store: modelOpts?.store,
		background: modelOpts?.background,
		response_modalities: modelOpts?.response_modalities,
		response_format: modelOpts?.response_format
	};
}
function convertMessagesToInteractionsInput(messages, hasPreviousInteraction) {
	const toolCallIdToName = /* @__PURE__ */ new Map();
	for (const msg of messages) if (msg.role === "assistant" && msg.toolCalls) for (const tc of msg.toolCalls) toolCallIdToName.set(tc.id, tc.function.name);
	const source = hasPreviousInteraction ? messagesAfterLastAssistant(messages) : messages;
	if (hasPreviousInteraction && source.length === 0) throw new Error("Gemini Interactions adapter: modelOptions.previous_interaction_id was provided but no new messages were found after the last assistant turn. Append at least one user or tool message before chaining.");
	if (!hasPreviousInteraction) {
		const [only, ...rest] = source;
		if (!only) throw new Error("Gemini Interactions adapter: no messages to send.");
		if (rest.length > 0) throw new Error("Gemini Interactions adapter: cannot send prior conversation history on a fresh interaction. Either set modelOptions.previous_interaction_id to chain prior turns server-side, or trim the message list to a single new user turn. See docs/adapters/gemini.md (\"Wiring with useChat\") for the canonical client/server pattern.");
		if (only.role !== "user") throw new Error(`Gemini Interactions adapter: the first message of a fresh interaction must be a user turn (got role="${only.role}"). Set modelOptions.previous_interaction_id to continue an existing interaction.`);
		const content = messageToContentBlocks(only);
		if (content.length === 0) throw new Error("Gemini Interactions adapter: the user message produced no content blocks to send.");
		return [{
			type: "user_input",
			content
		}];
	}
	const steps = [];
	for (const msg of source) if (msg.role === "tool" && msg.toolCallId) {
		const result = serializeToolResultContent(msg.content);
		steps.push({
			type: "function_result",
			call_id: msg.toolCallId,
			name: toolCallIdToName.get(msg.toolCallId),
			result
		});
	} else if (msg.role === "user") {
		const content = messageToContentBlocks(msg);
		if (content.length > 0) steps.push({
			type: "user_input",
			content
		});
	}
	if (steps.length === 0) throw new Error("Gemini Interactions adapter: messages after the last assistant turn produced no steps to send.");
	return steps;
}
function serializeToolResultContent(content) {
	if (typeof content === "string") return sanitizeJsonArguments(sanitizeUnicode(content));
	if (content === null || content === void 0) throw new Error("Gemini Interactions adapter: tool message has no content. The Interactions API requires a string `result` on function_result steps — return a string from your tool implementation (encode JSON/multimodal output yourself).");
	throw new Error("Gemini Interactions adapter: tool message content must be a string (got an array of content parts). The Interactions API requires a string `result` on function_result steps — stringify multimodal tool output before returning it from your tool.");
}
function messageToContentBlocks(msg) {
	const blocks = [];
	if (Array.isArray(msg.content)) for (const part of msg.content) blocks.push(contentPartToBlock(part));
	else if (typeof msg.content === "string" && msg.content && msg.role !== "tool") blocks.push({
		type: "text",
		text: sanitizeUnicode(msg.content)
	});
	return blocks;
}
function messagesAfterLastAssistant(messages) {
	for (let i = messages.length - 1; i >= 0; i--) if (messages[i]?.role === "assistant") return messages.slice(i + 1);
	return messages;
}
function parsePartialToolArguments(raw) {
	if (!raw) return void 0;
	try {
		const parsed = parse(raw);
		return parsed && typeof parsed === "object" && !Array.isArray(parsed) ? parsed : void 0;
	} catch {
		return;
	}
}
var IMAGE_MIME_TYPES = [
	"image/png",
	"image/jpeg",
	"image/webp",
	"image/heic",
	"image/heif"
];
var AUDIO_MIME_TYPES = [
	"audio/wav",
	"audio/mp3",
	"audio/aiff",
	"audio/aac",
	"audio/ogg",
	"audio/flac"
];
var VIDEO_MIME_TYPES = [
	"video/mp4",
	"video/mpeg",
	"video/mpg",
	"video/mov",
	"video/avi",
	"video/x-flv",
	"video/webm",
	"video/wmv",
	"video/3gpp"
];
var DOCUMENT_MIME_TYPES = ["application/pdf"];
function validateMime(allowed, value, kind) {
	if (value === void 0) return void 0;
	if (allowed.includes(value)) return value;
	throw new Error(`Unsupported ${kind} mime type "${value}" for the Gemini Interactions API. Allowed: ${allowed.join(", ")}.`);
}
function contentPartToBlock(part) {
	if (part.type === "text") return {
		type: "text",
		text: sanitizeUnicode(part.content)
	};
	const sourceValue = isFileSource(part.source) ? fileReferenceFor(part.source, "gemini") : part.source.value;
	const isData = part.source.type === "data";
	switch (part.type) {
		case "image": {
			const mime_type = validateMime(IMAGE_MIME_TYPES, part.source.mimeType, "image");
			return isData ? {
				type: "image",
				data: sourceValue,
				mime_type
			} : {
				type: "image",
				uri: sourceValue,
				mime_type
			};
		}
		case "audio": {
			const mime_type = validateMime(AUDIO_MIME_TYPES, part.source.mimeType, "audio");
			return isData ? {
				type: "audio",
				data: sourceValue,
				mime_type
			} : {
				type: "audio",
				uri: sourceValue,
				mime_type
			};
		}
		case "video": {
			const mime_type = validateMime(VIDEO_MIME_TYPES, part.source.mimeType, "video");
			return isData ? {
				type: "video",
				data: sourceValue,
				mime_type
			} : {
				type: "video",
				uri: sourceValue,
				mime_type
			};
		}
		case "document": {
			const mime_type = validateMime(DOCUMENT_MIME_TYPES, part.source.mimeType, "document");
			return isData ? {
				type: "document",
				data: sourceValue,
				mime_type
			} : {
				type: "document",
				uri: sourceValue,
				mime_type
			};
		}
	}
}
function convertToolsToInteractionsFormat(tools) {
	if (!tools || tools.length === 0) return void 0;
	assertUniqueToolNames(tools);
	const result = [];
	for (const tool of tools) switch (getGeminiProviderToolKind(tool)) {
		case "google_search": {
			const metadata = getGeminiProviderToolMetadata(tool) ?? {};
			const searchTypes = [];
			if (metadata.searchTypes?.webSearch !== void 0) searchTypes.push("web_search");
			if (metadata.searchTypes?.imageSearch !== void 0) searchTypes.push("image_search");
			result.push({
				type: "google_search",
				...searchTypes.length > 0 ? { search_types: searchTypes } : {}
			});
			break;
		}
		case "code_execution":
			result.push({ type: "code_execution" });
			break;
		case "url_context":
			result.push({ type: "url_context" });
			break;
		case "file_search": {
			const metadata = getGeminiProviderToolMetadata(tool) ?? {};
			result.push({
				type: "file_search",
				...metadata.fileSearchStoreNames ? { file_search_store_names: metadata.fileSearchStoreNames } : {},
				...metadata.topK !== void 0 ? { top_k: metadata.topK } : {},
				...metadata.metadataFilter !== void 0 ? { metadata_filter: metadata.metadataFilter } : {}
			});
			break;
		}
		case "computer_use": {
			const metadata = getGeminiProviderToolMetadata(tool) ?? {};
			if (metadata.environment && metadata.environment !== "browser") throw new Error(`computer_use environment "${metadata.environment}" is not supported on the Gemini Interactions API. Only "browser" is accepted.`);
			result.push({
				type: "computer_use",
				...metadata.environment ? { environment: metadata.environment } : {},
				...metadata.excludedPredefinedFunctions ? { excludedPredefinedFunctions: metadata.excludedPredefinedFunctions } : {}
			});
			break;
		}
		case "google_search_retrieval": throw new Error("`google_search_retrieval` is not supported on the Gemini Interactions API. Use `googleSearchTool()` (`google_search`) with `geminiTextInteractions()`, or call `geminiText()` for the legacy retrieval tool.");
		case "google_maps": throw new Error("`google_maps` is not yet supported on the Gemini Interactions API. Use `geminiText()` for Google Maps grounding.");
		case void 0:
			if (!tool.description) throw new Error(`Tool ${tool.name} requires a description for the Gemini Interactions adapter`);
			result.push({
				type: "function",
				name: tool.name,
				description: tool.description,
				parameters: sanitizeToolParameters(tool.inputSchema ?? {
					type: "object",
					properties: {}
				})
			});
	}
	return result;
}
function statusToFinishReason(status, sawFunctionCall) {
	if (status === "requires_action") return "tool_calls";
	if (status === "incomplete") return "length";
	if (sawFunctionCall) return "tool_calls";
	return "stop";
}
function statusIsError(status) {
	return status === "failed" || status === "cancelled";
}
async function* translateInteractionEvents(stream, model, runId, threadId, parentRunId, timestamp, adapterName, logger) {
	const messageId = generateId(adapterName);
	let hasEmittedRunStarted = false;
	let hasEmittedTextMessageStart = false;
	let textAccumulated = "";
	let interactionId;
	let reportedModel;
	let sawFunctionCall = false;
	const toolCalls = /* @__PURE__ */ new Map();
	let nextToolIndex = 0;
	let thinkingStepId = null;
	let thinkingAccumulated = "";
	let reasoningMessageId = null;
	let hasClosedReasoning = false;
	const indexToToolCallId = /* @__PURE__ */ new Map();
	const argStringByToolCallId = /* @__PURE__ */ new Map();
	const closeReasoningIfNeeded = function* () {
		if (reasoningMessageId && !hasClosedReasoning) {
			hasClosedReasoning = true;
			yield {
				type: EventType.REASONING_MESSAGE_END,
				messageId: reasoningMessageId,
				model,
				timestamp
			};
			yield {
				type: EventType.REASONING_END,
				messageId: reasoningMessageId,
				model,
				timestamp
			};
			thinkingStepId = null;
			reasoningMessageId = null;
			hasClosedReasoning = false;
		}
	};
	const closeOpenState = function* () {
		yield* closeReasoningIfNeeded();
		for (const [toolCallId, state] of toolCalls) {
			if (state.ended) continue;
			state.ended = true;
			const rawArgs = argStringByToolCallId.get(toolCallId) ?? JSON.stringify(state.args);
			let input;
			try {
				input = JSON.parse(rawArgs);
			} catch {
				input = void 0;
			}
			yield {
				type: EventType.TOOL_CALL_END,
				toolCallId,
				toolName: state.name,
				model,
				timestamp,
				args: rawArgs,
				...input !== void 0 && { input }
			};
		}
		if (hasEmittedTextMessageStart) {
			hasEmittedTextMessageStart = false;
			yield {
				type: EventType.TEXT_MESSAGE_END,
				messageId,
				model,
				timestamp
			};
		}
	};
	const emitRunStartedIfNeeded = function* () {
		if (!hasEmittedRunStarted) {
			hasEmittedRunStarted = true;
			yield {
				type: EventType.RUN_STARTED,
				metadata: { tanstack: {
					...interactionId && { responseId: interactionId },
					...reportedModel && { model: reportedModel }
				} },
				runId,
				threadId,
				model,
				timestamp,
				parentRunId
			};
		}
	};
	for await (const event of stream) {
		logger.provider(`provider=gemini-text-interactions`, { event });
		switch (event.event_type) {
			case "interaction.created":
				interactionId = event.interaction.id;
				if (event.interaction.model) reportedModel = event.interaction.model;
				yield* emitRunStartedIfNeeded();
				break;
			case "step.start": {
				yield* emitRunStartedIfNeeded();
				const step = event.step;
				const index = event.index;
				switch (step.type) {
					case "function_call": {
						yield* closeReasoningIfNeeded();
						sawFunctionCall = true;
						const toolCallId = step.id;
						indexToToolCallId.set(index, toolCallId);
						const initialArgs = step.arguments;
						const state = {
							name: step.name,
							args: initialArgs,
							index: nextToolIndex++,
							started: true,
							ended: false
						};
						toolCalls.set(toolCallId, state);
						const hasInitialArgs = initialArgs === null || typeof initialArgs !== "object" || Array.isArray(initialArgs) || Object.keys(initialArgs).length > 0;
						yield {
							type: EventType.TOOL_CALL_START,
							toolCallId,
							toolCallName: state.name,
							toolName: state.name,
							parentMessageId: messageId,
							model,
							timestamp,
							index: state.index
						};
						if (hasInitialArgs) {
							const argsJson = JSON.stringify(initialArgs);
							yield {
								type: EventType.TOOL_CALL_ARGS,
								toolCallId,
								model,
								timestamp,
								delta: argsJson,
								args: argsJson
							};
						}
						break;
					}
					case "thought":
						if (thinkingStepId === null || reasoningMessageId === null) {
							thinkingStepId = generateId(adapterName);
							reasoningMessageId = generateId(adapterName);
							yield {
								type: EventType.REASONING_START,
								messageId: reasoningMessageId,
								model,
								timestamp
							};
							yield {
								type: EventType.REASONING_MESSAGE_START,
								messageId: reasoningMessageId,
								role: "reasoning",
								model,
								timestamp
							};
							yield {
								type: EventType.STEP_STARTED,
								stepName: thinkingStepId,
								stepId: thinkingStepId,
								model,
								timestamp,
								stepType: "thinking"
							};
						}
						for (const part of step.summary ?? []) {
							if (part.type !== "text" || !part.text) continue;
							thinkingAccumulated += part.text;
							yield {
								type: EventType.REASONING_MESSAGE_CONTENT,
								messageId: reasoningMessageId,
								delta: part.text,
								model,
								timestamp
							};
							yield {
								type: EventType.STEP_FINISHED,
								stepName: thinkingStepId,
								stepId: thinkingStepId,
								model,
								timestamp,
								delta: part.text,
								content: thinkingAccumulated
							};
						}
						break;
					case "model_output":
						yield* closeReasoningIfNeeded();
						for (const part of step.content ?? []) {
							if (part.type !== "text" || !part.text) continue;
							if (!hasEmittedTextMessageStart) {
								hasEmittedTextMessageStart = true;
								yield {
									type: EventType.TEXT_MESSAGE_START,
									messageId,
									model,
									timestamp,
									role: "assistant"
								};
							}
							textAccumulated += part.text;
							yield {
								type: EventType.TEXT_MESSAGE_CONTENT,
								messageId,
								model,
								timestamp,
								delta: part.text,
								content: textAccumulated
							};
						}
						break;
					case "google_search_call":
						yield* closeReasoningIfNeeded();
						yield {
							type: EventType.CUSTOM,
							name: "gemini.googleSearchCall",
							value: step,
							model,
							timestamp
						};
						break;
					case "google_search_result":
						yield* closeReasoningIfNeeded();
						yield {
							type: EventType.CUSTOM,
							name: "gemini.googleSearchResult",
							value: step,
							model,
							timestamp
						};
						break;
					case "code_execution_call":
						yield* closeReasoningIfNeeded();
						yield {
							type: EventType.CUSTOM,
							name: "gemini.codeExecutionCall",
							value: step,
							model,
							timestamp
						};
						break;
					case "code_execution_result":
						yield* closeReasoningIfNeeded();
						yield {
							type: EventType.CUSTOM,
							name: "gemini.codeExecutionResult",
							value: step,
							model,
							timestamp
						};
						break;
					case "url_context_call":
						yield* closeReasoningIfNeeded();
						yield {
							type: EventType.CUSTOM,
							name: "gemini.urlContextCall",
							value: step,
							model,
							timestamp
						};
						break;
					case "url_context_result":
						yield* closeReasoningIfNeeded();
						yield {
							type: EventType.CUSTOM,
							name: "gemini.urlContextResult",
							value: step,
							model,
							timestamp
						};
						break;
					case "file_search_call":
						yield* closeReasoningIfNeeded();
						yield {
							type: EventType.CUSTOM,
							name: "gemini.fileSearchCall",
							value: step,
							model,
							timestamp
						};
						break;
					case "file_search_result":
						yield* closeReasoningIfNeeded();
						yield {
							type: EventType.CUSTOM,
							name: "gemini.fileSearchResult",
							value: step,
							model,
							timestamp
						};
						break;
					default: logger.provider(`gemini-text-interactions unhandled step.start`, { step });
				}
				break;
			}
			case "step.delta": {
				yield* emitRunStartedIfNeeded();
				const delta = event.delta;
				const index = event.index;
				switch (delta.type) {
					case "text":
						yield* closeReasoningIfNeeded();
						if (!hasEmittedTextMessageStart) {
							hasEmittedTextMessageStart = true;
							yield {
								type: EventType.TEXT_MESSAGE_START,
								messageId,
								model,
								timestamp,
								role: "assistant"
							};
						}
						textAccumulated += delta.text;
						yield {
							type: EventType.TEXT_MESSAGE_CONTENT,
							messageId,
							model,
							timestamp,
							delta: delta.text,
							content: textAccumulated
						};
						break;
					case "arguments_delta": {
						const toolCallId = indexToToolCallId.get(index);
						if (!toolCallId) {
							logger.provider(`gemini-text-interactions arguments_delta for unknown step index`, {
								index,
								delta
							});
							break;
						}
						const state = toolCalls.get(toolCallId);
						if (!state || typeof delta.arguments !== "string") break;
						const fragment = delta.arguments;
						const buffer = (argStringByToolCallId.get(toolCallId) ?? "") + fragment;
						argStringByToolCallId.set(toolCallId, buffer);
						const parsed = parsePartialToolArguments(buffer);
						if (parsed) state.args = parsed;
						yield {
							type: EventType.TOOL_CALL_ARGS,
							toolCallId,
							model,
							timestamp,
							delta: fragment,
							args: buffer
						};
						break;
					}
					case "thought_summary": {
						const thoughtText = delta.content && "text" in delta.content ? delta.content.text : "";
						if (!thoughtText) break;
						if (thinkingStepId === null || reasoningMessageId === null) {
							thinkingStepId = generateId(adapterName);
							reasoningMessageId = generateId(adapterName);
							yield {
								type: EventType.REASONING_START,
								messageId: reasoningMessageId,
								model,
								timestamp
							};
							yield {
								type: EventType.REASONING_MESSAGE_START,
								messageId: reasoningMessageId,
								role: "reasoning",
								model,
								timestamp
							};
							yield {
								type: EventType.STEP_STARTED,
								stepName: thinkingStepId,
								stepId: thinkingStepId,
								model,
								timestamp,
								stepType: "thinking"
							};
						}
						thinkingAccumulated += thoughtText;
						yield {
							type: EventType.REASONING_MESSAGE_CONTENT,
							messageId: reasoningMessageId,
							delta: thoughtText,
							model,
							timestamp
						};
						yield {
							type: EventType.STEP_FINISHED,
							stepName: thinkingStepId,
							stepId: thinkingStepId,
							model,
							timestamp,
							delta: thoughtText,
							content: thinkingAccumulated
						};
						break;
					}
					default: logger.provider(`gemini-text-interactions unhandled step.delta type`, { delta });
				}
				break;
			}
			case "step.stop": {
				const toolCallId = indexToToolCallId.get(event.index);
				if (toolCallId) {
					const state = toolCalls.get(toolCallId);
					if (state && !state.ended) {
						state.ended = true;
						const rawArgs = argStringByToolCallId.get(toolCallId) ?? JSON.stringify(state.args);
						let input;
						try {
							input = JSON.parse(rawArgs);
						} catch {
							input = void 0;
						}
						yield {
							type: EventType.TOOL_CALL_END,
							toolCallId,
							toolName: state.name,
							model,
							timestamp,
							args: rawArgs,
							...input !== void 0 && { input }
						};
					}
					indexToToolCallId.delete(event.index);
				}
				break;
			}
			case "interaction.status_update": break;
			case "interaction.completed": {
				if (event.interaction.model) reportedModel = event.interaction.model;
				if (event.interaction.id) interactionId = event.interaction.id;
				yield* closeOpenState();
				const status = event.interaction.status;
				if (statusIsError(status)) {
					const message = `Gemini Interactions ${status}: the interaction ended without a usable response.`;
					logger.errors("gemini-text-interactions.translateInteractionEvents non-success status", {
						source: "gemini-text-interactions.chatStream",
						status,
						interactionId
					});
					yield {
						type: EventType.RUN_ERROR,
						runId,
						model,
						timestamp,
						message,
						code: status,
						error: {
							message,
							code: status
						}
					};
					return;
				}
				const usage = event.interaction.usage;
				const finishReason = statusToFinishReason(status, sawFunctionCall);
				if (interactionId) yield {
					type: EventType.CUSTOM,
					name: "gemini.interactionId",
					value: { interactionId },
					model,
					timestamp
				};
				yield {
					type: EventType.RUN_FINISHED,
					metadata: { tanstack: {
						...interactionId && { responseId: interactionId },
						...reportedModel && { model: reportedModel }
					} },
					runId,
					threadId,
					model,
					timestamp,
					finishReason,
					usage: usage ? {
						promptTokens: usage.total_input_tokens ?? 0,
						completionTokens: usage.total_output_tokens ?? 0,
						totalTokens: usage.total_tokens ?? 0
					} : void 0
				};
				return;
			}
			case "error": {
				yield* closeOpenState();
				const rawMessage = event.error?.message;
				const message = typeof rawMessage === "string" && rawMessage.length > 0 ? rawMessage : `Gemini Interactions error (no message): ${JSON.stringify(event.error ?? {})}`;
				const rawCode = event.error?.code;
				const code = typeof rawCode === "string" || typeof rawCode === "number" ? String(rawCode) : void 0;
				yield {
					type: EventType.RUN_ERROR,
					runId,
					model,
					timestamp,
					message,
					code,
					error: {
						message,
						code
					}
				};
				return;
			}
			default: logger.provider(`gemini-text-interactions unhandled event_type`, { event });
		}
	}
	yield* closeOpenState();
}
function extractTextFromInteraction(interaction) {
	if (typeof interaction.output_text === "string" && interaction.output_text) return interaction.output_text;
	let text = "";
	for (const step of interaction.steps ?? []) {
		if (step.type !== "model_output" || !step.content) continue;
		for (const part of step.content) if (part.type === "text") text += part.text;
	}
	return text;
}
function sanitizeToolParameters(schema) {
	if (!schema || typeof schema !== "object") return schema;
	if (Array.isArray(schema)) return schema.map(sanitizeToolParameters);
	const out = {};
	for (const [key, value] of Object.entries(schema)) {
		if (key === "required" && Array.isArray(value) && value.length === 0) continue;
		Object.defineProperty(out, key, {
			value: sanitizeToolParameters(value),
			enumerable: true,
			writable: true,
			configurable: true
		});
	}
	return out;
}
//#endregion
export { GeminiTextInteractionsAdapter, createGeminiTextInteractions, geminiTextInteractions };

//# sourceMappingURL=adapter.js.map