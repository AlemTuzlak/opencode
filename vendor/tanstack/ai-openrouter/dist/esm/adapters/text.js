import { extractRequestOptions } from "../internal/request-options.js";
import { clientForCall } from "../internal/wrap-fetch.js";
import { makeStructuredOutputCompatible } from "../internal/schema-converter.js";
import { OPENROUTER_MODEL_INPUT_MODALITIES } from "../model-meta.js";
import { openRouterSupportsCombinedToolsAndSchema } from "../internal/combined-tools-and-schema.js";
import { OPENROUTER_MODEL_REASONING } from "../model-reasoning.js";
import { openRouterEffort } from "../internal/reasoning.js";
import { addPromptCacheMarkers } from "../prompt-cache.js";
import { convertToolsToProviderFormat } from "../tools/tool-converter.js";
import "../tools/index.js";
import { getOpenRouterApiKeyFromEnv } from "../utils/client.js";
import "../utils/index.js";
import { buildOpenRouterUsage } from "../usage.js";
import { extractUsageCost } from "./cost.js";
import { OpenRouter } from "@openrouter/sdk";
import { EventType, isFileSource, normalizeSystemPrompts, unsupportedFileSourceError } from "@tanstack/ai";
import { BaseTextAdapter } from "@tanstack/ai/adapters";
import { hashToolCallId, resolveReasoning, sanitizeJsonArguments, sanitizeUnicode, tanstackMetadata, toRunErrorPayload, toRunErrorRawEvent, transformMessagesForReplay } from "@tanstack/ai/adapter-internals";
import { generateId } from "@tanstack/ai-utils";
//#region src/adapters/text.ts
/** Maps `chat({ toolChoice })` to the OpenRouter chat `toolChoice`. */
function toOpenRouterChatToolChoice(choice) {
	if (typeof choice === "string") return choice;
	return {
		type: "function",
		function: { name: choice.name }
	};
}
/**
* OpenRouter Text (Chat) Adapter — standalone implementation that talks to
* OpenRouter's `/v1/chat/completions` endpoint via the `@openrouter/sdk` SDK.
*
* The wire format is OpenAI-Chat-Completions-compatible, but the SDK exposes
* the request/response in camelCase TS shapes (`toolCalls`, `finishReason`,
* `maxCompletionTokens`, `responseFormat: { jsonSchema: ... }`, etc.). This
* adapter operates directly in those camelCase shapes — there's no
* snake_case ↔ camelCase round-trip.
*
* Behaviour preserved from the pre-decoupling implementation:
*   - Provider routing surface (`provider`, `models`, `plugins`, `variant`,
*     `transforms`) passes through `modelOptions`.
*   - App attribution headers (`httpReferer`, `appTitle`) and base URL
*     overrides flow through the SDK `SDKOptions` constructor.
*   - `RequestAbortedError` from the SDK propagates up — `chatStream` wraps
*     unknown errors into a single RUN_ERROR event via `toRunErrorPayload`.
*   - Model variant suffixing (e.g. `:thinking`, `:free`) via
*     `modelOptions.variant`.
*   - OpenRouter-specific reasoning extraction (`delta.reasoningDetails`).
*   - OpenRouter preserves nulls in structured-output results
*     (`transformStructuredOutput` is a passthrough).
*/
var OpenRouterTextAdapter = class extends BaseTextAdapter {
	kind = "text";
	name = "openrouter";
	provider = "openrouter";
	api = "openai-completions";
	inputModalities = OPENROUTER_MODEL_INPUT_MODALITIES[this.model];
	orClient;
	sdkOptions;
	retryCodes;
	constructor(config, model) {
		super({}, model);
		const { retryCodes, ...sdkOptions } = config;
		this.sdkOptions = sdkOptions;
		this.orClient = new OpenRouter(sdkOptions);
		this.retryCodes = retryCodes;
	}
	async *chatStream(options) {
		const source = {
			provider: this.provider,
			api: this.api,
			model: options.model
		};
		for await (const chunk of this.chatStreamRequest(options)) yield {
			...chunk,
			metadata: {
				...chunk.metadata,
				tanstack: {
					...tanstackMetadata(chunk),
					source
				}
			}
		};
	}
	async *chatStreamRequest(options) {
		const aguiState = {
			runId: generateId(this.name),
			threadId: options.threadId ?? generateId(this.name),
			messageId: generateId(this.name),
			hasEmittedRunStarted: false
		};
		try {
			const chatRequest = this.mapOptionsToRequest(options);
			options.logger.request(`activity=chat provider=${this.name} model=${this.model} messages=${options.messages.length} tools=${options.tools?.length ?? 0} stream=true`, {
				provider: this.name,
				model: this.model
			});
			const reqOptions = extractRequestOptions(options.request);
			const stream = await clientForCall(this.orClient, this.sdkOptions, options.wrapFetch).chat.send({ chatRequest: {
				...chatRequest,
				stream: true,
				streamOptions: chatRequest.streamOptions?.includeUsage === false ? void 0 : {
					...chatRequest.streamOptions,
					includeUsage: true
				}
			} }, {
				...reqOptions.signal != null && { signal: reqOptions.signal },
				...reqOptions.headers && { headers: reqOptions.headers },
				...this.retryCodes && { retryCodes: this.retryCodes }
			});
			yield* this.processStreamChunks(stream, options, aguiState);
		} catch (caughtError) {
			let error = caughtError;
			if (typeof error === "object" && error !== null && "issues" in error && Array.isArray(error.issues)) for (const issue of error.issues) {
				if (typeof issue !== "object" || issue === null || !("path" in issue) || !Array.isArray(issue.path) || !("code" in issue) || issue.code !== "invalid_type" || !("expected" in issue) || issue.expected !== "string" || !("message" in issue) || typeof issue.message !== "string") continue;
				const path = issue.path;
				if (path.length !== 5 || path[0] !== "data" || path[1] !== "choices" || typeof path[2] !== "number" || path[3] !== "delta" || path[4] !== "content") continue;
				const received = issue.message.endsWith("received array") ? "an array" : issue.message.endsWith("received object") ? "an object" : void 0;
				if (received) error = /* @__PURE__ */ new Error(`invalid choices[0].delta.content: expected a string, null, or an omitted field; received ${received}`);
			}
			const errorPayload = toRunErrorPayload(error, `${this.name}.chatStream failed`);
			const rawEvent = toRunErrorRawEvent(error);
			if (!aguiState.hasEmittedRunStarted) {
				aguiState.hasEmittedRunStarted = true;
				yield {
					type: EventType.RUN_STARTED,
					runId: aguiState.runId,
					threadId: aguiState.threadId,
					model: options.model,
					timestamp: Date.now(),
					parentRunId: options.parentRunId
				};
			}
			yield {
				type: EventType.RUN_ERROR,
				model: options.model,
				timestamp: Date.now(),
				message: errorPayload.message,
				code: errorPayload.code,
				...rawEvent !== void 0 && { rawEvent },
				error: {
					message: errorPayload.message,
					code: errorPayload.code
				}
			};
			options.logger.errors(`${this.name}.chatStream fatal`, {
				error: errorPayload,
				source: `${this.name}.chatStream`
			});
		}
	}
	/**
	* Generate structured output via OpenRouter's `responseFormat`. Uses
	* `stream: false`. Default is strict `json_schema` from `outputSchema`.
	* Callers can opt into JSON mode with
	* `modelOptions.responseFormat: { type: 'json_object' }`.
	*/
	async structuredOutput(options) {
		const { chatOptions, outputSchema } = options;
		const chatRequest = this.mapOptionsToRequest(chatOptions);
		const responseFormat = this.resolveStructuredResponseFormat(chatRequest.responseFormat, outputSchema);
		try {
			const { streamOptions: _streamOptions, responseFormat: _responseFormat, ...cleanParams } = chatRequest;
			chatOptions.logger.request(`activity=structuredOutput provider=${this.name} model=${this.model} messages=${chatOptions.messages.length}`, {
				provider: this.name,
				model: this.model
			});
			const reqOptions = extractRequestOptions(chatOptions.request);
			const response = await clientForCall(this.orClient, this.sdkOptions, chatOptions.wrapFetch).chat.send({ chatRequest: {
				...cleanParams,
				stream: false,
				responseFormat
			} }, {
				...reqOptions.signal != null && { signal: reqOptions.signal },
				...reqOptions.headers && { headers: reqOptions.headers },
				...this.retryCodes && { retryCodes: this.retryCodes }
			});
			const choice = response.choices[0];
			if (choice?.finishReason === "length") throw new Error(`${this.name}.structuredOutput: the response was cut off because the maximum token limit was reached (finish_reason=length); raise maxCompletionTokens`);
			const message = choice?.message;
			const rawText = typeof message?.content === "string" ? message.content : "";
			if (rawText.length === 0) throw new Error(`${this.name}.structuredOutput: response contained no content`);
			let parsed;
			try {
				parsed = JSON.parse(rawText);
			} catch {
				throw new Error(`Failed to parse structured output as JSON. Content: ${rawText.slice(0, 200)}${rawText.length > 200 ? "..." : ""}`);
			}
			const transformed = this.transformStructuredOutput(parsed);
			const baseUsage = buildOpenRouterUsage(response.usage);
			return {
				data: transformed,
				rawText,
				...response.id && { responseId: response.id },
				...response.model && { model: response.model },
				...baseUsage && { usage: {
					...baseUsage,
					...extractUsageCost(response.usage)
				} }
			};
		} catch (caughtError) {
			let error = caughtError;
			if (typeof error === "object" && error !== null && "issues" in error && Array.isArray(error.issues)) for (const issue of error.issues) {
				if (typeof issue !== "object" || issue === null || !("path" in issue) || !Array.isArray(issue.path) || !("code" in issue) || issue.code !== "invalid_type" || !("expected" in issue) || issue.expected !== "string" || !("message" in issue) || typeof issue.message !== "string") continue;
				const path = issue.path;
				if (path.length !== 5 || path[0] !== "data" || path[1] !== "choices" || typeof path[2] !== "number" || path[3] !== "delta" || path[4] !== "content") continue;
				const received = issue.message.endsWith("received array") ? "an array" : issue.message.endsWith("received object") ? "an object" : void 0;
				if (received) error = /* @__PURE__ */ new Error(`invalid choices[0].delta.content: expected a string, null, or an omitted field; received ${received}`);
			}
			chatOptions.logger.errors(`${this.name}.structuredOutput fatal`, {
				error: toRunErrorPayload(error, `${this.name}.structuredOutput failed`),
				source: `${this.name}.structuredOutput`
			});
			throw error;
		}
	}
	/**
	* Streamed structured output: a single OpenRouter chat call with
	* `stream: true` and the format from {@link resolveStructuredResponseFormat}.
	* Emits AG-UI lifecycle events plus a terminal
	* `CUSTOM { name: 'structured-output.complete' }` carrying the parsed
	* object and raw JSON text.
	*
	* Mirrors the chat-completions structured-output stream from
	* `@tanstack/openai-base`, adapted to OpenRouter's camelCase wire shape
	* (`responseFormat` / `streamOptions: { includeUsage: true }`) and SDK
	* call surface (`orClient.chat.send({ chatRequest })`). Reasoning flows
	* through the existing `extractReasoningText` helper used by
	* `processStreamChunks`; the final parsed JSON runs through
	* {@link transformStructuredOutput} (null-preserving for OpenRouter).
	*/
	async *structuredOutputStream(options) {
		const source = {
			provider: this.provider,
			api: this.api,
			model: options.chatOptions.model
		};
		for await (const chunk of this.structuredOutputRequestStream(options)) yield {
			...chunk,
			metadata: {
				...chunk.metadata,
				tanstack: {
					...tanstackMetadata(chunk),
					source
				}
			}
		};
	}
	async *structuredOutputRequestStream(options) {
		const { chatOptions, outputSchema } = options;
		const chatRequest = this.mapOptionsToRequest(chatOptions);
		const responseFormat = this.resolveStructuredResponseFormat(chatRequest.responseFormat, outputSchema);
		const aguiState = {
			runId: generateId(this.name),
			threadId: chatOptions.threadId ?? generateId(this.name),
			messageId: generateId(this.name),
			hasEmittedRunStarted: false
		};
		let accumulatedContent = "";
		let accumulatedReasoning = "";
		let hasEmittedTextMessageStart = false;
		let reasoningMessageId;
		let hasClosedReasoning = false;
		let stepId;
		let lastModel;
		let responseId;
		let finishReason;
		let lastUsage;
		const closeReasoningLifecycle = function* () {
			if (reasoningMessageId && !hasClosedReasoning) {
				hasClosedReasoning = true;
				yield {
					type: EventType.REASONING_MESSAGE_END,
					messageId: reasoningMessageId,
					model: lastModel || chatOptions.model,
					timestamp: Date.now()
				};
				yield {
					type: EventType.REASONING_END,
					messageId: reasoningMessageId,
					model: lastModel || chatOptions.model,
					timestamp: Date.now()
				};
				if (stepId) yield {
					type: EventType.STEP_FINISHED,
					stepName: stepId,
					stepId,
					model: lastModel || chatOptions.model,
					timestamp: Date.now(),
					content: accumulatedReasoning
				};
				reasoningMessageId = void 0;
				stepId = void 0;
				hasClosedReasoning = false;
			}
		}.bind(this);
		try {
			const { streamOptions: _so, tools: _t, responseFormat: _responseFormat, ...cleanParams } = chatRequest;
			chatOptions.logger.request(`activity=structuredOutputStream provider=${this.name} model=${this.model} messages=${chatOptions.messages.length}`, {
				provider: this.name,
				model: this.model
			});
			const reqOptions = extractRequestOptions(chatOptions.request);
			const stream = await clientForCall(this.orClient, this.sdkOptions, chatOptions.wrapFetch).chat.send({ chatRequest: {
				...cleanParams,
				stream: true,
				streamOptions: chatRequest.streamOptions?.includeUsage === false ? void 0 : { includeUsage: true },
				responseFormat
			} }, {
				...reqOptions.signal != null && { signal: reqOptions.signal },
				...reqOptions.headers && { headers: reqOptions.headers },
				...this.retryCodes && { retryCodes: this.retryCodes }
			});
			for await (const chunk of stream) {
				if (chunk.id) responseId = chunk.id;
				const firstChoice = chunk.choices[0];
				const finish = firstChoice?.finishReason;
				if (finish && ![
					"stop",
					"length",
					"tool_calls",
					"content_filter",
					"function_call"
				].includes(finish)) throw new Error(`Provider finish_reason: ${finish}`);
				const receivedContent = firstChoice?.delta.content;
				if (receivedContent !== null && typeof receivedContent === "object") throw new Error(`invalid choices[0].delta.content: expected a string, null, or an omitted field; received ${Array.isArray(receivedContent) ? "an array" : "an object"}`);
				const choiceForLog = chunk.choices[0];
				chatOptions.logger.provider(`provider=${this.name} finishReason=${choiceForLog?.finishReason ?? "none"} hasContent=${!!choiceForLog?.delta.content} hasUsage=${!!chunk.usage}`, {
					provider: this.name,
					model: chunk.model
				});
				if (chunk.model) lastModel = chunk.model;
				const usage = buildOpenRouterUsage(chunk.usage);
				if (usage) lastUsage = {
					...usage,
					...extractUsageCost(chunk.usage)
				};
				if (!aguiState.hasEmittedRunStarted) {
					aguiState.hasEmittedRunStarted = true;
					yield {
						type: EventType.RUN_STARTED,
						runId: aguiState.runId,
						threadId: aguiState.threadId,
						model: chunk.model || chatOptions.model,
						timestamp: Date.now(),
						parentRunId: chatOptions.parentRunId
					};
				}
				const reasoningText = extractReasoningText(chunk);
				if (reasoningText) {
					if (!reasoningMessageId) {
						reasoningMessageId = generateId(this.name);
						stepId = generateId(this.name);
						yield {
							type: EventType.REASONING_START,
							messageId: reasoningMessageId,
							model: chunk.model || chatOptions.model,
							timestamp: Date.now()
						};
						yield {
							type: EventType.REASONING_MESSAGE_START,
							messageId: reasoningMessageId,
							role: "reasoning",
							model: chunk.model || chatOptions.model,
							timestamp: Date.now()
						};
						yield {
							type: EventType.STEP_STARTED,
							stepName: stepId,
							stepId,
							model: chunk.model || chatOptions.model,
							timestamp: Date.now(),
							stepType: "thinking"
						};
					}
					accumulatedReasoning += reasoningText;
					yield {
						type: EventType.REASONING_MESSAGE_CONTENT,
						messageId: reasoningMessageId,
						delta: reasoningText,
						model: chunk.model || chatOptions.model,
						timestamp: Date.now()
					};
				}
				const choice = chunk.choices[0];
				if (!choice) continue;
				if (choice.finishReason) finishReason = choice.finishReason;
				const deltaContent = choice.delta.content;
				if (deltaContent) {
					yield* closeReasoningLifecycle();
					if (!hasEmittedTextMessageStart) {
						hasEmittedTextMessageStart = true;
						yield {
							type: EventType.TEXT_MESSAGE_START,
							messageId: aguiState.messageId,
							model: chunk.model || chatOptions.model,
							timestamp: Date.now(),
							role: "assistant"
						};
					}
					accumulatedContent += deltaContent;
					yield {
						type: EventType.TEXT_MESSAGE_CONTENT,
						messageId: aguiState.messageId,
						model: chunk.model || chatOptions.model,
						timestamp: Date.now(),
						delta: deltaContent,
						content: accumulatedContent
					};
				}
			}
			yield* closeReasoningLifecycle();
			if (hasEmittedTextMessageStart) yield {
				type: EventType.TEXT_MESSAGE_END,
				messageId: aguiState.messageId,
				model: lastModel || chatOptions.model,
				timestamp: Date.now()
			};
			if (finishReason === "length") {
				const message = `${this.name}.structuredOutputStream: the response was cut off because the maximum token limit was reached (finish_reason=length); raise maxCompletionTokens`;
				yield {
					type: EventType.RUN_ERROR,
					...lastUsage && { usage: lastUsage },
					runId: aguiState.runId,
					model: lastModel || chatOptions.model,
					timestamp: Date.now(),
					message,
					code: "max_tokens",
					error: {
						message,
						code: "max_tokens"
					}
				};
				return;
			}
			if (accumulatedContent.length === 0) {
				yield {
					type: EventType.RUN_ERROR,
					...lastUsage && { usage: lastUsage },
					runId: aguiState.runId,
					model: lastModel || chatOptions.model,
					timestamp: Date.now(),
					message: `${this.name}.structuredOutputStream: response contained no content`,
					code: "empty-response",
					error: {
						message: `${this.name}.structuredOutputStream: response contained no content`,
						code: "empty-response"
					}
				};
				return;
			}
			let parsed;
			try {
				parsed = JSON.parse(accumulatedContent);
			} catch {
				yield {
					type: EventType.RUN_ERROR,
					...lastUsage && { usage: lastUsage },
					runId: aguiState.runId,
					model: lastModel || chatOptions.model,
					timestamp: Date.now(),
					message: `Failed to parse structured output as JSON. Content: ${accumulatedContent.slice(0, 200)}${accumulatedContent.length > 200 ? "..." : ""}`,
					code: "parse-error",
					error: {
						message: "Failed to parse structured output as JSON",
						code: "parse-error"
					}
				};
				return;
			}
			const transformed = this.transformStructuredOutput(parsed);
			yield {
				type: EventType.CUSTOM,
				name: "structured-output.complete",
				value: {
					object: transformed,
					raw: accumulatedContent,
					...accumulatedReasoning ? { reasoning: accumulatedReasoning } : {}
				},
				model: lastModel || chatOptions.model,
				timestamp: Date.now()
			};
			yield {
				type: EventType.RUN_FINISHED,
				metadata: { tanstack: {
					...responseId && { responseId },
					...lastModel && { model: lastModel }
				} },
				runId: aguiState.runId,
				threadId: aguiState.threadId,
				model: lastModel || chatOptions.model,
				timestamp: Date.now(),
				finishReason: "stop",
				...lastUsage && { usage: lastUsage }
			};
		} catch (caughtError) {
			let error = caughtError;
			if (typeof error === "object" && error !== null && "issues" in error && Array.isArray(error.issues)) for (const issue of error.issues) {
				if (typeof issue !== "object" || issue === null || !("path" in issue) || !Array.isArray(issue.path) || !("code" in issue) || issue.code !== "invalid_type" || !("expected" in issue) || issue.expected !== "string" || !("message" in issue) || typeof issue.message !== "string") continue;
				const path = issue.path;
				if (path.length !== 5 || path[0] !== "data" || path[1] !== "choices" || typeof path[2] !== "number" || path[3] !== "delta" || path[4] !== "content") continue;
				const received = issue.message.endsWith("received array") ? "an array" : issue.message.endsWith("received object") ? "an object" : void 0;
				if (received) error = /* @__PURE__ */ new Error(`invalid choices[0].delta.content: expected a string, null, or an omitted field; received ${received}`);
			}
			if (!aguiState.hasEmittedRunStarted) {
				aguiState.hasEmittedRunStarted = true;
				yield {
					type: EventType.RUN_STARTED,
					runId: aguiState.runId,
					threadId: aguiState.threadId,
					model: chatOptions.model,
					timestamp: Date.now(),
					parentRunId: chatOptions.parentRunId
				};
			}
			const errName = error && typeof error === "object" ? error.name ?? "" : "";
			const isAbort = errName === "AbortError" || errName === "RequestAbortedError";
			const errorPayload = toRunErrorPayload(error, `${this.name}.structuredOutputStream failed`);
			const resolvedCode = isAbort ? "aborted" : errorPayload.code;
			const rawEvent = isAbort ? void 0 : toRunErrorRawEvent(error);
			yield {
				type: EventType.RUN_ERROR,
				...lastUsage && { usage: lastUsage },
				runId: aguiState.runId,
				model: lastModel || chatOptions.model,
				timestamp: Date.now(),
				message: errorPayload.message,
				...resolvedCode !== void 0 && { code: resolvedCode },
				...rawEvent !== void 0 && { rawEvent },
				error: {
					message: errorPayload.message,
					...resolvedCode !== void 0 && { code: resolvedCode }
				}
			};
			chatOptions.logger.errors(`${this.name}.structuredOutputStream fatal`, {
				error: errorPayload,
				source: `${this.name}.structuredOutputStream`
			});
		}
	}
	/**
	* Resolve the provider request format for a schema-bearing call.
	*
	* Explicit `modelOptions.responseFormat: { type: 'json_object' }` is
	* forwarded. Every other value is replaced with strict `json_schema`
	* generated from `outputSchema`.
	*/
	resolveStructuredResponseFormat(requested, outputSchema) {
		if (requested?.type === "json_object") return { type: "json_object" };
		return {
			type: "json_schema",
			jsonSchema: {
				name: "structured_output",
				schema: this.makeStructuredOutputCompatible(outputSchema, outputSchema.required),
				strict: true
			}
		};
	}
	/**
	* Applies provider-specific transformations for structured output compatibility.
	*/
	makeStructuredOutputCompatible(schema, originalRequired) {
		return makeStructuredOutputCompatible(schema, originalRequired);
	}
	/**
	* Final shaping pass applied to parsed structured-output JSON before it is
	* returned to the caller. OpenRouter routes through a wide variety of
	* upstream providers; some return `null` as a distinct sentinel ("the field
	* exists, the value is null") rather than collapsing it to absent, so we
	* passthrough and let the engine un-widen strict-mode nulls precisely. This
	* now matches the base adapters' default — kept as an explicit override
	* because OpenRouter extends `BaseTextAdapter` directly, not the OpenAI base.
	*/
	transformStructuredOutput(parsed) {
		return parsed;
	}
	/**
	* Processes streamed chunks from OpenRouter's chat-completions API and
	* yields AG-UI events. Reads the SDK's camelCase chunk shape directly
	* (`delta.toolCalls`, `delta.reasoningDetails`, `chunk.usage.promptTokens`,
	* `choice.finishReason`, etc.).
	*/
	async *processStreamChunks(stream, options, aguiState) {
		let accumulatedContent = "";
		let hasEmittedTextMessageStart = false;
		let lastModel;
		let responseId;
		let lastUsage;
		let pendingFinishReason;
		const toolCallsInProgress = /* @__PURE__ */ new Map();
		let reasoningMessageId;
		let hasClosedReasoning = false;
		let stepId;
		let accumulatedReasoning = "";
		let emittedAnyToolCallEnd = false;
		try {
			for await (const chunk of stream) {
				if (chunk.id) responseId = chunk.id;
				const firstChoice = chunk.choices[0];
				const finish = firstChoice?.finishReason;
				if (finish && ![
					"stop",
					"length",
					"tool_calls",
					"content_filter",
					"function_call"
				].includes(finish)) throw new Error(`Provider finish_reason: ${finish}`);
				const receivedContent = firstChoice?.delta.content;
				if (receivedContent !== null && typeof receivedContent === "object") throw new Error(`invalid choices[0].delta.content: expected a string, null, or an omitted field; received ${Array.isArray(receivedContent) ? "an array" : "an object"}`);
				const choiceForLog = chunk.choices[0];
				options.logger.provider(`provider=${this.name} finishReason=${choiceForLog?.finishReason ?? "none"} hasContent=${!!choiceForLog?.delta.content} hasToolCalls=${!!choiceForLog?.delta.toolCalls} hasUsage=${!!chunk.usage}`, {
					provider: this.name,
					model: chunk.model
				});
				if (chunk.error) throw Object.assign(new Error(chunk.error.message || "OpenRouter stream error"), {
					code: chunk.error.code,
					rawEvent: chunk.error
				});
				if (chunk.usage) lastUsage = chunk.usage;
				if (chunk.model) lastModel = chunk.model;
				if (!aguiState.hasEmittedRunStarted) {
					aguiState.hasEmittedRunStarted = true;
					yield {
						type: EventType.RUN_STARTED,
						runId: aguiState.runId,
						threadId: aguiState.threadId,
						model: chunk.model || options.model,
						timestamp: Date.now(),
						parentRunId: options.parentRunId
					};
				}
				const reasoningText = extractReasoningText(chunk);
				if (reasoningText) {
					if (!reasoningMessageId) {
						reasoningMessageId = generateId(this.name);
						stepId = generateId(this.name);
						yield {
							type: EventType.REASONING_START,
							messageId: reasoningMessageId,
							model: chunk.model || options.model,
							timestamp: Date.now()
						};
						yield {
							type: EventType.REASONING_MESSAGE_START,
							messageId: reasoningMessageId,
							role: "reasoning",
							model: chunk.model || options.model,
							timestamp: Date.now()
						};
						yield {
							type: EventType.STEP_STARTED,
							stepName: stepId,
							stepId,
							model: chunk.model || options.model,
							timestamp: Date.now(),
							stepType: "thinking"
						};
					}
					accumulatedReasoning += reasoningText;
					yield {
						type: EventType.REASONING_MESSAGE_CONTENT,
						messageId: reasoningMessageId,
						delta: reasoningText,
						model: chunk.model || options.model,
						timestamp: Date.now()
					};
				}
				const choice = chunk.choices[0];
				if (!choice) continue;
				const delta = choice.delta;
				const deltaContent = delta.content;
				const deltaToolCalls = delta.toolCalls;
				if (deltaContent) {
					if (reasoningMessageId && !hasClosedReasoning) {
						hasClosedReasoning = true;
						yield {
							type: EventType.REASONING_MESSAGE_END,
							messageId: reasoningMessageId,
							model: chunk.model || options.model,
							timestamp: Date.now()
						};
						yield {
							type: EventType.REASONING_END,
							messageId: reasoningMessageId,
							model: chunk.model || options.model,
							timestamp: Date.now()
						};
						if (stepId) yield {
							type: EventType.STEP_FINISHED,
							stepName: stepId,
							stepId,
							model: chunk.model || options.model,
							timestamp: Date.now(),
							content: accumulatedReasoning
						};
					}
					if (!hasEmittedTextMessageStart) {
						hasEmittedTextMessageStart = true;
						yield {
							type: EventType.TEXT_MESSAGE_START,
							messageId: aguiState.messageId,
							model: chunk.model || options.model,
							timestamp: Date.now(),
							role: "assistant"
						};
					}
					accumulatedContent += deltaContent;
					yield {
						type: EventType.TEXT_MESSAGE_CONTENT,
						messageId: aguiState.messageId,
						model: chunk.model || options.model,
						timestamp: Date.now(),
						delta: deltaContent,
						content: accumulatedContent
					};
				}
				if (deltaToolCalls) for (const toolCallDelta of deltaToolCalls) {
					const index = toolCallDelta.index;
					let toolCall = toolCallsInProgress.get(index);
					if (!toolCall) {
						toolCall = {
							id: toolCallDelta.id || "",
							name: toolCallDelta.function?.name || "",
							arguments: "",
							started: false
						};
						toolCallsInProgress.set(index, toolCall);
					}
					if (toolCallDelta.id) toolCall.id = toolCallDelta.id;
					if (toolCallDelta.function?.name) toolCall.name = toolCallDelta.function.name;
					if (toolCallDelta.function?.arguments) toolCall.arguments += toolCallDelta.function.arguments;
					if (toolCall.id && toolCall.name && !toolCall.started) {
						toolCall.started = true;
						yield {
							type: EventType.TOOL_CALL_START,
							toolCallId: toolCall.id,
							toolCallName: toolCall.name,
							toolName: toolCall.name,
							parentMessageId: aguiState.messageId,
							model: chunk.model || options.model,
							timestamp: Date.now(),
							index
						};
					}
					if (toolCallDelta.function?.arguments && toolCall.started) yield {
						type: EventType.TOOL_CALL_ARGS,
						toolCallId: toolCall.id,
						model: chunk.model || options.model,
						timestamp: Date.now(),
						delta: toolCallDelta.function.arguments
					};
				}
				if (choice.finishReason) {
					if (choice.finishReason === "tool_calls" || toolCallsInProgress.size > 0) {
						for (const [, toolCall] of toolCallsInProgress) {
							if (!toolCall.started) continue;
							let parsedInput;
							if (toolCall.arguments) try {
								parsedInput = JSON.parse(toolCall.arguments);
							} catch (parseError) {
								options.logger.errors(`${this.name}.processStreamChunks tool-args JSON parse failed`, {
									error: toRunErrorPayload(parseError, `tool ${toolCall.name} (${toolCall.id}) returned malformed JSON arguments`),
									source: `${this.name}.processStreamChunks`,
									toolCallId: toolCall.id,
									toolName: toolCall.name,
									rawArguments: toolCall.arguments
								});
								parsedInput = void 0;
							}
							yield {
								type: EventType.TOOL_CALL_END,
								toolCallId: toolCall.id,
								toolCallName: toolCall.name,
								toolName: toolCall.name,
								model: chunk.model || options.model,
								timestamp: Date.now(),
								args: toolCall.arguments,
								...parsedInput !== void 0 && { input: parsedInput }
							};
							emittedAnyToolCallEnd = true;
						}
						toolCallsInProgress.clear();
					}
					if (hasEmittedTextMessageStart) {
						yield {
							type: EventType.TEXT_MESSAGE_END,
							messageId: aguiState.messageId,
							model: chunk.model || options.model,
							timestamp: Date.now()
						};
						hasEmittedTextMessageStart = false;
					}
					pendingFinishReason = choice.finishReason;
				}
			}
			if (aguiState.hasEmittedRunStarted) {
				for (const [, toolCall] of toolCallsInProgress) {
					if (!toolCall.started) continue;
					let parsedInput;
					if (toolCall.arguments) try {
						parsedInput = JSON.parse(toolCall.arguments);
					} catch (parseError) {
						options.logger.errors(`${this.name}.processStreamChunks tool-args JSON parse failed (drain)`, {
							error: toRunErrorPayload(parseError, `tool ${toolCall.name} (${toolCall.id}) returned malformed JSON arguments`),
							source: `${this.name}.processStreamChunks`,
							toolCallId: toolCall.id,
							toolName: toolCall.name,
							rawArguments: toolCall.arguments
						});
						parsedInput = void 0;
					}
					yield {
						type: EventType.TOOL_CALL_END,
						toolCallId: toolCall.id,
						toolCallName: toolCall.name,
						toolName: toolCall.name,
						model: lastModel || options.model,
						timestamp: Date.now(),
						args: toolCall.arguments,
						...parsedInput !== void 0 && { input: parsedInput }
					};
					emittedAnyToolCallEnd = true;
				}
				toolCallsInProgress.clear();
				if (hasEmittedTextMessageStart) yield {
					type: EventType.TEXT_MESSAGE_END,
					messageId: aguiState.messageId,
					model: lastModel || options.model,
					timestamp: Date.now()
				};
				if (reasoningMessageId && !hasClosedReasoning) {
					hasClosedReasoning = true;
					yield {
						type: EventType.REASONING_MESSAGE_END,
						messageId: reasoningMessageId,
						model: lastModel || options.model,
						timestamp: Date.now()
					};
					yield {
						type: EventType.REASONING_END,
						messageId: reasoningMessageId,
						model: lastModel || options.model,
						timestamp: Date.now()
					};
					if (stepId) yield {
						type: EventType.STEP_FINISHED,
						stepName: stepId,
						stepId,
						model: lastModel || options.model,
						timestamp: Date.now(),
						content: accumulatedReasoning
					};
				}
				const finishReason = emittedAnyToolCallEnd ? "tool_calls" : pendingFinishReason === "tool_calls" ? "stop" : pendingFinishReason === "length" ? "length" : pendingFinishReason === "content_filter" ? "content_filter" : "stop";
				const finalUsage = buildOpenRouterUsage(lastUsage);
				yield {
					type: EventType.RUN_FINISHED,
					metadata: { tanstack: {
						...responseId && { responseId },
						...lastModel && { model: lastModel }
					} },
					runId: aguiState.runId,
					threadId: aguiState.threadId,
					model: lastModel || options.model,
					timestamp: Date.now(),
					...finalUsage && { usage: {
						...finalUsage,
						...extractUsageCost(lastUsage)
					} },
					finishReason
				};
			}
		} catch (caughtError) {
			let error = caughtError;
			if (typeof error === "object" && error !== null && "issues" in error && Array.isArray(error.issues)) for (const issue of error.issues) {
				if (typeof issue !== "object" || issue === null || !("path" in issue) || !Array.isArray(issue.path) || !("code" in issue) || issue.code !== "invalid_type" || !("expected" in issue) || issue.expected !== "string" || !("message" in issue) || typeof issue.message !== "string") continue;
				const path = issue.path;
				if (path.length !== 5 || path[0] !== "data" || path[1] !== "choices" || typeof path[2] !== "number" || path[3] !== "delta" || path[4] !== "content") continue;
				const received = issue.message.endsWith("received array") ? "an array" : issue.message.endsWith("received object") ? "an object" : void 0;
				if (received) error = /* @__PURE__ */ new Error(`invalid choices[0].delta.content: expected a string, null, or an omitted field; received ${received}`);
			}
			const errorPayload = toRunErrorPayload(error, `${this.name}.processStreamChunks failed`);
			const rawEvent = toRunErrorRawEvent(error);
			options.logger.errors(`${this.name}.processStreamChunks fatal`, {
				error: errorPayload,
				source: `${this.name}.processStreamChunks`
			});
			yield {
				type: EventType.RUN_ERROR,
				model: options.model,
				timestamp: Date.now(),
				message: errorPayload.message,
				...errorPayload.code !== void 0 && { code: errorPayload.code },
				...rawEvent !== void 0 && { rawEvent },
				error: {
					message: errorPayload.message,
					...errorPayload.code !== void 0 && { code: errorPayload.code }
				}
			};
		}
	}
	/**
	* Build an OpenRouter `ChatRequest` (camelCase) from `TextOptions`. Applies
	* `:variant` model suffixing and routes tools through OpenRouter's
	* converter (function tools + branded web_search tool).
	*/
	mapOptionsToRequest(options) {
		const { variant, ...restModelOptions } = options.modelOptions ?? {};
		const variantSuffix = variant ? `:${variant}` : "";
		const effort = openRouterEffort(resolveReasoning(options.reasoning, OPENROUTER_MODEL_REASONING[options.model]));
		const messages = [];
		const systemPrompts = normalizeSystemPrompts(options.systemPrompts);
		if (systemPrompts.length > 0) {
			const hasCacheControl = systemPrompts.some((p) => p.metadata?.cache_control);
			messages.push({
				role: "system",
				content: hasCacheControl ? systemPrompts.map((p) => ({
					type: "text",
					text: sanitizeUnicode(p.content),
					...p.metadata?.cache_control && { cacheControl: p.metadata.cache_control }
				})) : systemPrompts.map((p) => sanitizeUnicode(p.content)).join("\n")
			});
		}
		const replay = transformMessagesForReplay(options.messages, {
			provider: this.provider,
			api: this.api,
			model: options.model
		}, (id, { attempt }) => {
			if (attempt > 0) return `${id.split("|")[0]?.replace(/[^a-zA-Z0-9_-]/g, "_").slice(0, 31) || "call"}_${hashToolCallId(`${id}:${attempt}`).slice(0, 8)}`;
			if (id.includes("|")) {
				const separator = id.indexOf("|");
				const call = id.slice(0, separator).replace(/[^a-zA-Z0-9_-]/g, "_");
				const item = id.slice(separator + 1).replace(/[^a-zA-Z0-9_-]/g, "_");
				const combined = item ? `${call}_${item}` : call;
				return combined.length <= 40 ? combined : `${call.slice(0, 31)}_${hashToolCallId(id).slice(0, 8)}`;
			}
			return id.replace(/[^a-zA-Z0-9_-]/g, "_").slice(0, 40);
		});
		const pendingImages = [];
		const flushImages = () => {
			if (pendingImages.length) messages.push({
				role: "user",
				content: pendingImages.splice(0)
			});
		};
		for (const m of replay.messages) {
			if (m.role !== "tool") flushImages();
			if (m.role === "tool" && Array.isArray(m.content)) {
				const images = m.content.filter((part) => part.type === "image" && (this.inputModalities?.includes("image") ?? true));
				for (const image of images) {
					const converted = this.convertContentPart(image);
					if (converted) pendingImages.push(converted);
				}
				const text = this.extractTextContent(m.content);
				messages.push({
					role: "tool",
					toolCallId: m.toolCallId || "",
					content: sanitizeJsonArguments(text) || (m.content.some((part) => part.type === "image") ? "(see attached image)" : "(no tool output)")
				});
			} else messages.push(this.convertMessage(m));
		}
		flushImages();
		const tools = options.tools ? convertToolsToProviderFormat(options.tools) : void 0;
		const combinedOutputSchema = options.outputSchema;
		const requestedResponseFormat = options.modelOptions != null && "responseFormat" in options.modelOptions ? options.modelOptions.responseFormat : void 0;
		const combinedSchema = combinedOutputSchema && requestedResponseFormat?.type !== "json_object" && this.supportsCombinedToolsAndSchema(options.modelOptions) ? this.makeStructuredOutputCompatible(combinedOutputSchema, combinedOutputSchema.required) : void 0;
		const request = {
			...tools?.length && options.toolChoice !== void 0 ? { toolChoice: toOpenRouterChatToolChoice(options.toolChoice) } : void 0,
			...restModelOptions,
			...effort && { reasoning: { effort } },
			model: options.model + variantSuffix,
			messages,
			...tools && tools.length > 0 ? { tools } : options.messages.some((message) => message.toolCalls?.length || message.role === "tool") ? { tools: [] } : {},
			...combinedSchema && { responseFormat: {
				type: "json_schema",
				jsonSchema: {
					name: "structured_output",
					schema: combinedSchema,
					strict: true
				}
			} }
		};
		return options.promptCache ? addPromptCacheMarkers(request, options.promptCache) : request;
	}
	/**
	* Combined mode is safe only when this model and every `modelOptions.models`
	* fallback are in `OPENROUTER_COMBINED_TOOLS_AND_SCHEMA_MODELS`.
	* `:variant` suffixes are routing directives and do not change the gate.
	*/
	supportsCombinedToolsAndSchema(modelOptions) {
		return openRouterSupportsCombinedToolsAndSchema(this.model, modelOptions);
	}
	/**
	* Convert a ModelMessage to OpenRouter's ChatMessages discriminated union
	* (camelCase: `toolCallId`, `toolCalls`).
	*/
	convertMessage(message) {
		if (message.role === "tool") return {
			role: "tool",
			content: typeof message.content === "string" ? sanitizeJsonArguments(sanitizeUnicode(message.content)) : sanitizeJsonArguments(this.extractTextContent(message.content)),
			toolCallId: message.toolCallId || ""
		};
		if (message.role === "assistant") {
			const toolCalls = message.toolCalls?.map((tc) => ({
				...tc,
				function: {
					name: sanitizeUnicode(tc.function.name),
					arguments: sanitizeJsonArguments(typeof tc.function.arguments === "string" ? tc.function.arguments : JSON.stringify(tc.function.arguments))
				}
			}));
			const textContent = this.extractTextContent(message.content);
			return {
				role: "assistant",
				content: !!toolCalls && toolCalls.length > 0 && !textContent ? null : textContent,
				toolCalls
			};
		}
		const contentParts = this.normalizeContent(message.content);
		if (contentParts.length === 1 && contentParts[0]?.type === "text") {
			const text = sanitizeUnicode(contentParts[0].content);
			if (text.length === 0) throw new Error(`User message for ${this.name} has empty text content. Empty user messages would produce a paid request with no input; provide non-empty content or omit the message.`);
			return {
				role: "user",
				content: text
			};
		}
		const parts = [];
		for (const part of contentParts) {
			const converted = this.convertContentPart(part);
			if (!converted) throw new Error(`Unsupported content part type for ${this.name}: ${part.type}. Override convertContentPart to handle this type, or remove it from the message.`);
			parts.push(converted);
		}
		if (parts.length === 0) throw new Error(`User message for ${this.name} has no content parts. Empty user messages would produce a paid request with no input; provide at least one text/image/audio part or omit the message.`);
		return {
			role: "user",
			content: parts
		};
	}
	/** OpenRouter content-part converter (camelCase imageUrl/inputAudio/videoUrl). */
	convertContentPart(part) {
		if (part.type === "text") return {
			type: "text",
			text: sanitizeUnicode(part.content)
		};
		const source = part.source;
		if (source === void 0) return null;
		if (isFileSource(source)) throw unsupportedFileSourceError(this.name);
		switch (part.type) {
			case "image": {
				const meta = part.metadata;
				const value = source.value;
				const imageMime = source.mimeType || "application/octet-stream";
				return {
					type: "image_url",
					imageUrl: {
						url: source.type === "data" && !value.startsWith("data:") ? `data:${imageMime};base64,${value}` : value,
						detail: meta?.detail || "auto"
					}
				};
			}
			case "audio":
				if (source.type === "url") return {
					type: "text",
					text: `[Audio: ${source.value}]`
				};
				return {
					type: "input_audio",
					inputAudio: {
						data: source.value,
						format: "mp3"
					}
				};
			case "video": return {
				type: "video_url",
				videoUrl: { url: source.value }
			};
			case "document":
				if (source.type === "data") throw new Error(`${this.name} chat-completions does not support inline (data) document content parts. Use the Responses adapter (openRouterResponsesText) for document data, or pass the document as a URL.`);
				return {
					type: "text",
					text: `[Document: ${source.value}]`
				};
			default: return null;
		}
	}
	/**
	* Normalizes message content to an array of ContentPart.
	* Handles backward compatibility with string content.
	*/
	normalizeContent(content) {
		if (content === null || content === void 0) return [];
		if (typeof content === "string") return [{
			type: "text",
			content
		}];
		return content;
	}
	/**
	* Extracts text content from a content value that may be string, null, or ContentPart array.
	*/
	extractTextContent(content) {
		if (content === null || content === void 0) return "";
		if (typeof content === "string") return sanitizeUnicode(content);
		return content.filter((p) => p.type === "text").map((p) => sanitizeUnicode(p.content)).join("");
	}
};
/**
* Flatten any reasoning deltas in a stream chunk into a single string.
* OpenRouter emits reasoning content via `delta.reasoningDetails`, a union of
* variants including `{ type: 'reasoning.text', text }` and
* `{ type: 'reasoning.summary', summary }`.
*/
function extractReasoningText(chunk) {
	let text = "";
	for (const choice of chunk.choices) {
		const details = choice.delta.reasoningDetails;
		if (!Array.isArray(details)) continue;
		for (const detail of details) {
			const d = detail;
			if (d.type === "reasoning.text" && typeof d.text === "string") text += d.text;
			else if (d.type === "reasoning.summary" && typeof d.summary === "string") text += d.summary;
		}
	}
	return text;
}
function createOpenRouterText(model, apiKey, config) {
	return new OpenRouterTextAdapter({
		apiKey,
		...config
	}, model);
}
function openRouterText(model, config) {
	return createOpenRouterText(model, getOpenRouterApiKeyFromEnv(), config);
}
//#endregion
export { OpenRouterTextAdapter, createOpenRouterText, openRouterText };

//# sourceMappingURL=text.js.map