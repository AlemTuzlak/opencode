import { makeStructuredOutputCompatibleWithMap, warnStrictFallback } from "../utils/schema-converter.js";
import { buildChatCompletionsUsage } from "../usage.js";
import { toChatCompletionsToolChoice } from "../tools/tool-choice.js";
import { clientFor, extractRequestOptions } from "../utils/request-options.js";
import { createToolInputNormalizer } from "../utils/tool-input-normalizer.js";
import { convertToolsToChatCompletionsFormat } from "./chat-completions-tool-converter.js";
import { EventType, isFileSource, normalizeSystemPrompts, unsupportedFileSourceError } from "@tanstack/ai";
import { hashToolCallId, resolveReasoning, sanitizeJsonArguments, sanitizeUnicode, toRetryAfterMs, toRunErrorPayload, toRunErrorRawEvent, transformMessagesForReplay } from "@tanstack/ai/adapter-internals";
import { BaseTextAdapter } from "@tanstack/ai/adapters";
import { generateId } from "@tanstack/ai-utils";
//#region src/adapters/chat-completions-text.ts
/**
* Shared implementation of the OpenAI Chat Completions API. Holds the
* stream-accumulator + AG-UI lifecycle logic and calls the OpenAI SDK
* directly. Subclasses (ai-openai, ai-grok, ai-groq) construct an OpenAI
* client with their provider-specific `baseURL` / headers and pass it in.
*/
var OpenAIBaseChatCompletionsTextAdapter = class extends BaseTextAdapter {
	kind = "text";
	api = "openai-completions";
	name;
	client;
	sourceMetadata(model, stopReason) {
		return { tanstack: {
			source: {
				provider: this.provider ?? this.name,
				api: this.api,
				model
			},
			...stopReason ? { stopReason } : {}
		} };
	}
	validateChoice(choice) {
		const reason = choice.finish_reason;
		if (reason != null && ![
			"stop",
			"length",
			"content_filter",
			"tool_calls",
			"function_call"
		].includes(reason)) throw new Error(`Provider finish_reason: ${reason}`);
		const content = choice.delta?.content;
		if (content !== void 0 && content !== null && typeof content !== "string") throw new Error(`invalid choices[0].delta.content: expected a string, null, or an omitted field; received ${Array.isArray(content) ? "an array" : "an object"}`);
	}
	/** See {@link OpenAIBaseTextAdapterOptions.strictFallbackWarning}. */
	strictFallbackWarning;
	/** The fetch that the adapter gave the client. */
	baseFetch;
	/**
	* `options.fetch` must be the fetch that the client uses. A `wrapFetch`
	* call wraps it.
	*/
	constructor(model, name, client, options = {}) {
		super({}, model);
		this.name = name;
		this.client = client;
		this.strictFallbackWarning = options.strictFallbackWarning ?? true;
		this.baseFetch = options.fetch;
	}
	async *chatStream(options) {
		const aguiState = {
			runId: generateId(this.name),
			threadId: options.threadId ?? generateId(this.name),
			messageId: generateId(this.name),
			hasEmittedRunStarted: false
		};
		try {
			const requestParams = this.mapOptionsToRequest(options);
			options.logger.request(`activity=chat provider=${this.name} model=${this.model} messages=${options.messages.length} tools=${options.tools?.length ?? 0} stream=true`, {
				provider: this.name,
				model: this.model
			});
			const stream = await clientFor(this.client, options, this.baseFetch).chat.completions.create({
				...requestParams,
				stream: true,
				...this.includeUsageInStream() ? { stream_options: { include_usage: true } } : {}
			}, this.requestOptionsFor(options));
			yield* this.processStreamChunks(stream, options, aguiState);
		} catch (error) {
			yield* this.handleChatStreamError(error, options, aguiState, "chatStream");
		}
	}
	async *handleChatStreamError(error, options, aguiState, source) {
		const errorPayload = toRunErrorPayload(error, `${this.name}.${source} failed`);
		const rawEvent = toRunErrorRawEvent(error);
		const retryAfterMs = toRetryAfterMs(error);
		if (!aguiState.hasEmittedRunStarted) {
			aguiState.hasEmittedRunStarted = true;
			yield {
				type: EventType.RUN_STARTED,
				metadata: this.sourceMetadata(options.model),
				runId: aguiState.runId,
				threadId: aguiState.threadId,
				model: options.model,
				timestamp: Date.now(),
				parentRunId: options.parentRunId
			};
		}
		const rejectedToolCall = this.extractRejectedToolCall(rawEvent, errorPayload.message);
		if (rejectedToolCall) {
			const toolCallId = generateId(this.name);
			yield {
				type: EventType.TOOL_CALL_START,
				toolCallId,
				toolCallName: rejectedToolCall.toolName,
				toolName: rejectedToolCall.toolName,
				parentMessageId: aguiState.messageId,
				model: options.model,
				timestamp: Date.now()
			};
			yield {
				type: EventType.TOOL_CALL_ARGS,
				toolCallId,
				delta: rejectedToolCall.arguments,
				args: rejectedToolCall.arguments,
				model: options.model,
				timestamp: Date.now()
			};
			yield {
				type: EventType.TOOL_CALL_END,
				toolCallId,
				toolCallName: rejectedToolCall.toolName,
				toolName: rejectedToolCall.toolName,
				...rejectedToolCall.input !== void 0 && { input: rejectedToolCall.input },
				result: JSON.stringify({ error: rejectedToolCall.error }),
				state: "output-error",
				model: options.model,
				timestamp: Date.now()
			};
			yield {
				type: EventType.RUN_FINISHED,
				runId: aguiState.runId,
				threadId: aguiState.threadId,
				model: options.model,
				timestamp: Date.now(),
				finishReason: "tool_calls"
			};
			return;
		}
		options.logger.errors(`${this.name}.${source} fatal`, {
			error: errorPayload,
			source: `${this.name}.${source}`
		});
		yield {
			type: EventType.RUN_ERROR,
			metadata: this.sourceMetadata(options.model, this.isAbortError(error) ? "aborted" : "error"),
			runId: aguiState.runId,
			threadId: aguiState.threadId,
			model: options.model,
			timestamp: Date.now(),
			message: errorPayload.message,
			...errorPayload.code !== void 0 && { code: errorPayload.code },
			...rawEvent !== void 0 && { rawEvent },
			...retryAfterMs !== void 0 && { retryAfterMs },
			error: {
				message: errorPayload.message,
				...errorPayload.code !== void 0 && { code: errorPayload.code }
			}
		};
	}
	/**
	* Extracts a rejected tool call from a provider error. Returned calls are
	* emitted as non-executable `output-error` results so the model can repair them.
	*/
	extractRejectedToolCall(_rawEvent, _fallbackMessage) {}
	/**
	* Generate structured output using the provider's JSON Schema response format.
	* Uses stream: false to get the complete response in one call.
	*
	* OpenAI-compatible APIs have strict requirements for structured output:
	* - All properties must be in the `required` array
	* - Optional fields should have null added to their type union
	* - additionalProperties must be false for all objects
	*
	* The outputSchema is already JSON Schema (converted in the ai layer).
	* We apply provider-specific transformations for structured output compatibility.
	*/
	async structuredOutput(options) {
		const { chatOptions, outputSchema } = options;
		const requestParams = this.mapOptionsToRequest(chatOptions);
		const jsonSchema = this.makeStructuredOutputCompatible(outputSchema, outputSchema.required);
		try {
			const { stream_options: _, stream: __, ...cleanParams } = requestParams;
			chatOptions.logger.request(`activity=structuredOutput provider=${this.name} model=${this.model} messages=${chatOptions.messages.length}`, {
				provider: this.name,
				model: this.model
			});
			const response = await clientFor(this.client, chatOptions, this.baseFetch).chat.completions.create({
				...cleanParams,
				stream: false,
				response_format: {
					type: "json_schema",
					json_schema: {
						name: "structured_output",
						schema: jsonSchema,
						strict: true
					}
				}
			}, extractRequestOptions(chatOptions.request));
			const choice = response.choices[0];
			if (choice) this.validateChoice({ finish_reason: choice.finish_reason });
			if (choice?.finish_reason === "length") throw new Error(`${this.name}.structuredOutput: the response was cut off because the maximum token limit was reached (finish_reason=length); raise the output token limit (max_completion_tokens or max_tokens, depending on the provider)`);
			const rawText = choice?.message.content;
			if (typeof rawText !== "string" || rawText.length === 0) throw new Error(`${this.name}.structuredOutput: response contained no content`);
			let parsed;
			try {
				parsed = JSON.parse(rawText);
			} catch {
				throw new Error(`Failed to parse structured output as JSON. Content: ${rawText.slice(0, 200)}${rawText.length > 200 ? "..." : ""}`);
			}
			const transformed = this.transformStructuredOutput(parsed);
			const usage = buildChatCompletionsUsage(response.usage);
			return {
				data: transformed,
				rawText,
				...response.id ? { responseId: response.id } : {},
				...response.model ? { model: response.model } : {},
				...usage && { usage }
			};
		} catch (error) {
			chatOptions.logger.errors(`${this.name}.structuredOutput fatal`, {
				error: toRunErrorPayload(error, `${this.name}.structuredOutput failed`),
				source: `${this.name}.structuredOutput`
			});
			throw error;
		}
	}
	/**
	* Stream structured output. Single Chat Completions request with
	* `response_format: json_schema` + `stream: true`. Emits the standard
	* AG-UI lifecycle (`RUN_STARTED` → `REASONING_*?` → `TEXT_MESSAGE_*`
	* carrying raw JSON deltas → terminal `CUSTOM 'structured-output.complete'`
	* → `RUN_FINISHED`). Subclasses use the same SDK-call / reasoning /
	* structured-output-transform hooks as `chatStream` / `structuredOutput` —
	* no per-subclass override should be needed.
	*/
	async *structuredOutputStream(options) {
		const { chatOptions, outputSchema } = options;
		const requestParams = this.mapOptionsToRequest(chatOptions);
		const jsonSchema = this.makeStructuredOutputCompatible(outputSchema, outputSchema.required);
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
		let lastResponseId;
		let finishReason = null;
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
			const { stream_options: _so, stream: _s, tools: _t, ...cleanParams } = requestParams;
			chatOptions.logger.request(`activity=structuredOutputStream provider=${this.name} model=${this.model} messages=${chatOptions.messages.length}`, {
				provider: this.name,
				model: this.model
			});
			const stream = await clientFor(this.client, chatOptions, this.baseFetch).chat.completions.create({
				...cleanParams,
				stream: true,
				..._t?.length === 0 ? { tools: [] } : {},
				stream_options: { include_usage: true },
				response_format: {
					type: "json_schema",
					json_schema: {
						name: "structured_output",
						schema: jsonSchema,
						strict: true
					}
				}
			}, extractRequestOptions(chatOptions.request));
			for await (const chunk of stream) {
				const choiceForLog = chunk.choices[0];
				chatOptions.logger.provider(`provider=${this.name} finish_reason=${choiceForLog?.finish_reason ?? "none"} hasContent=${!!choiceForLog?.delta.content} hasUsage=${!!chunk.usage}`, {
					provider: this.name,
					model: chunk.model
				});
				if (chunk.id) lastResponseId = chunk.id;
				if (chunk.model) lastModel = chunk.model;
				const usage = chunk.usage ?? chunk.x_groq?.usage;
				if (usage) lastUsage = usage;
				if (!aguiState.hasEmittedRunStarted) {
					aguiState.hasEmittedRunStarted = true;
					yield {
						type: EventType.RUN_STARTED,
						metadata: this.sourceMetadata(chatOptions.model),
						runId: aguiState.runId,
						threadId: aguiState.threadId,
						model: chunk.model || chatOptions.model,
						timestamp: Date.now(),
						parentRunId: chatOptions.parentRunId
					};
				}
				const reasoning = this.extractReasoning(chunk);
				if (reasoning && reasoning.text) {
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
					accumulatedReasoning += reasoning.text;
					yield {
						type: EventType.REASONING_MESSAGE_CONTENT,
						messageId: reasoningMessageId,
						delta: reasoning.text,
						model: chunk.model || chatOptions.model,
						timestamp: Date.now()
					};
				}
				const choice = chunk.choices[0];
				if (!choice) continue;
				this.validateChoice(choice);
				if (choice.finish_reason) finishReason = choice.finish_reason;
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
				const message = `${this.name}.structuredOutputStream: the response was cut off because the maximum token limit was reached (finish_reason=length); raise the output token limit (max_completion_tokens or max_tokens, depending on the provider)`;
				yield {
					type: EventType.RUN_ERROR,
					metadata: this.sourceMetadata(chatOptions.model),
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
					metadata: this.sourceMetadata(chatOptions.model),
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
					metadata: this.sourceMetadata(chatOptions.model),
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
				...lastResponseId ? { responseId: lastResponseId } : {},
				runId: aguiState.runId,
				threadId: aguiState.threadId,
				model: lastModel || chatOptions.model,
				timestamp: Date.now(),
				finishReason: finishReason === "function_call" ? "tool_calls" : finishReason === "content_filter" ? "content_filter" : finishReason === "tool_calls" ? "tool_calls" : "stop",
				...lastUsage && { usage: buildChatCompletionsUsage(lastUsage) }
			};
		} catch (error) {
			if (!aguiState.hasEmittedRunStarted) {
				aguiState.hasEmittedRunStarted = true;
				yield {
					type: EventType.RUN_STARTED,
					metadata: this.sourceMetadata(chatOptions.model),
					runId: aguiState.runId,
					threadId: aguiState.threadId,
					model: chatOptions.model,
					timestamp: Date.now(),
					parentRunId: chatOptions.parentRunId
				};
			}
			const isAbort = this.isAbortError(error);
			const errorPayload = toRunErrorPayload(error, `${this.name}.structuredOutputStream failed`);
			const resolvedCode = isAbort ? "aborted" : errorPayload.code;
			const rawEvent = isAbort ? void 0 : toRunErrorRawEvent(error);
			yield {
				type: EventType.RUN_ERROR,
				metadata: this.sourceMetadata(chatOptions.model, isAbort ? "aborted" : "error"),
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
	* Cross-SDK abort detection for `structuredOutputStream`. Default duck-types
	* on `name === 'APIUserAbortError'` (OpenAI SDK), `code === 'ERR_CANCELED'`,
	* and standard `AbortError`s. Subclasses with proprietary error types (e.g.
	* `@openrouter/sdk`'s `RequestAbortedError`) override to extend the check.
	*/
	isAbortError(error) {
		if (!error || typeof error !== "object") return false;
		const e = error;
		return e.name === "APIUserAbortError" || e.name === "AbortError" || e.code === "ERR_CANCELED";
	}
	/**
	* Strict conversion plus the inverse null-widening map for this request.
	* Override this when schema conversion changes, so tool-input undo matches
	* the wire schema.
	*/
	makeStructuredOutputCompatibleWithMap(schema, originalRequired) {
		return makeStructuredOutputCompatibleWithMap(schema, originalRequired);
	}
	/**
	* Applies provider-specific transformations for structured output compatibility.
	* Override `makeStructuredOutputCompatibleWithMap` when you need the inverse map
	* to match the wire schema.
	*/
	makeStructuredOutputCompatible(schema, originalRequired) {
		return this.makeStructuredOutputCompatibleWithMap(schema, originalRequired).schema;
	}
	/**
	* Extract reasoning content from a stream chunk. Default returns
	* `undefined` because the OpenAI Chat Completions chunk shape doesn't
	* carry reasoning. The chunk param is typed `unknown` so an override can
	* narrow to its own SDK chunk type without an `as` dance — the base only
	* passes through `processStreamChunks`'s structurally-iterated chunk.
	*/
	extractReasoning(_chunk) {}
	/**
	* Final shaping pass applied to parsed structured-output JSON before it is
	* returned to the caller. Default is a passthrough.
	*
	* Provider `null`s are no longer stripped here: strict-mode null-widening is
	* now undone precisely by the engine (`undoNullWidening`, driven by the
	* schema's null-widening map) the moment the result is captured, so a blind
	* `transformNullsToUndefined` at the adapter would only destroy genuine
	* `.nullable()` nulls. Subclasses may still override to remap or reshape the
	* provider's structured output.
	*/
	transformStructuredOutput(parsed) {
		return parsed;
	}
	/**
	* Processes streamed chunks from the Chat Completions API and yields AG-UI events.
	* Override this in subclasses to handle provider-specific stream behavior.
	*/
	async *processStreamChunks(stream, options, aguiState) {
		const normalizeToolInput = createToolInputNormalizer(options.tools, (schema, required) => this.makeStructuredOutputCompatibleWithMap(schema, required));
		let accumulatedContent = "";
		let hasEmittedTextMessageStart = false;
		let lastModel;
		let lastResponseId;
		let lastUsage;
		let endsWithUsageOnlyChunk = false;
		let pendingFinishReason;
		const toolCallsInProgress = /* @__PURE__ */ new Map();
		let reasoningMessageId;
		let hasClosedReasoning = false;
		let stepId;
		let accumulatedReasoning = "";
		let emittedAnyToolCallEnd = false;
		try {
			for await (const chunk of stream) {
				endsWithUsageOnlyChunk = chunk.choices.length === 0 && chunk.usage != null;
				const choiceForLog = chunk.choices[0];
				options.logger.provider(`provider=${this.name} finish_reason=${choiceForLog?.finish_reason ?? "none"} hasContent=${!!choiceForLog?.delta.content} hasToolCalls=${!!choiceForLog?.delta.tool_calls} hasUsage=${!!chunk.usage}`, {
					provider: this.name,
					model: chunk.model
				});
				if (chunk.usage) lastUsage = chunk.usage;
				if (chunk.id) lastResponseId = chunk.id;
				if (chunk.model) lastModel = chunk.model;
				if (!aguiState.hasEmittedRunStarted) {
					aguiState.hasEmittedRunStarted = true;
					yield {
						type: EventType.RUN_STARTED,
						metadata: this.sourceMetadata(options.model),
						runId: aguiState.runId,
						threadId: aguiState.threadId,
						model: chunk.model || options.model,
						timestamp: Date.now(),
						parentRunId: options.parentRunId
					};
				}
				const reasoning = this.extractReasoning(chunk);
				if (reasoning && reasoning.text) {
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
					accumulatedReasoning += reasoning.text;
					yield {
						type: EventType.REASONING_MESSAGE_CONTENT,
						messageId: reasoningMessageId,
						delta: reasoning.text,
						model: chunk.model || options.model,
						timestamp: Date.now()
					};
				}
				const choice = chunk.choices[0];
				if (!choice) continue;
				this.validateChoice(choice);
				const delta = choice.delta;
				const deltaContent = delta.content;
				const deltaToolCalls = delta.tool_calls;
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
				if (choice.finish_reason) {
					if (choice.finish_reason === "tool_calls" || toolCallsInProgress.size > 0) {
						for (const [, toolCall] of toolCallsInProgress) {
							if (!toolCall.started) continue;
							let parsedInput;
							if (toolCall.arguments) try {
								const parsed = JSON.parse(toolCall.arguments);
								parsedInput = normalizeToolInput(toolCall.name, parsed);
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
					pendingFinishReason = choice.finish_reason;
				}
			}
			if (aguiState.hasEmittedRunStarted) {
				let pendingToolCount = 0;
				for (const [, toolCall] of toolCallsInProgress) {
					if (!toolCall.started) continue;
					let parsedInput;
					if (toolCall.arguments) try {
						const parsed = JSON.parse(toolCall.arguments);
						parsedInput = normalizeToolInput(toolCall.name, parsed);
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
					pendingToolCount += 1;
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
				if (!pendingFinishReason && !endsWithUsageOnlyChunk) {
					const message = "Chat Completions stream ended without a finish_reason or usage-only tail";
					yield {
						type: EventType.RUN_ERROR,
						runId: aguiState.runId,
						model: lastModel || options.model,
						timestamp: Date.now(),
						message,
						code: "incomplete-stream",
						error: {
							message,
							code: "incomplete-stream"
						}
					};
					return;
				}
				const finishReason = emittedAnyToolCallEnd ? "tool_calls" : pendingFinishReason === "tool_calls" ? "stop" : pendingFinishReason === "function_call" ? "tool_calls" : pendingFinishReason ?? "stop";
				yield {
					type: EventType.RUN_FINISHED,
					...lastResponseId ? { responseId: lastResponseId } : {},
					runId: aguiState.runId,
					threadId: aguiState.threadId,
					model: lastModel || options.model,
					timestamp: Date.now(),
					...lastUsage && { usage: buildChatCompletionsUsage(lastUsage) },
					finishReason
				};
			}
		} catch (error) {
			yield* this.handleChatStreamError(error, options, aguiState, "processStreamChunks");
		}
	}
	/**
	* Whether a streaming request asks for usage with
	* `stream_options: { include_usage: true }`. Override for a provider that
	* rejects the field.
	*/
	includeUsageInStream() {
		return true;
	}
	/**
	* The model's reasoning data for `chat({ reasoning })`. The default is
	* none, so the base sends no reasoning field. A subclass returns the
	* model's entry from its generated `model-reasoning.ts` map.
	*/
	modelReasoning(_model) {}
	/**
	* Extra headers for one call, for example session headers. They go on top
	* of the headers of `options.request`.
	*/
	requestHeaders(_options) {}
	requestOptionsFor(options) {
		const base = extractRequestOptions(options.request);
		const extra = this.requestHeaders(options);
		if (!extra) return base;
		return {
			...base,
			headers: {
				...Object.fromEntries(new Headers(base.headers).entries()),
				...extra
			}
		};
	}
	/**
	* Maps common TextOptions to Chat Completions API request format.
	* Override this in subclasses to add provider-specific options.
	*/
	mapOptionsToRequest(options) {
		if (this.strictFallbackWarning) warnStrictFallback(options.tools, options.logger);
		const tools = options.tools ? convertToolsToChatCompletionsFormat(options.tools, this.makeStructuredOutputCompatible.bind(this)) : void 0;
		const messages = [];
		const systemPrompts = normalizeSystemPrompts(options.systemPrompts);
		if (systemPrompts.length > 0) messages.push({
			role: "system",
			content: systemPrompts.map((p) => sanitizeUnicode(p.content)).join("\n")
		});
		const replay = transformMessagesForReplay(options.messages, {
			provider: this.provider ?? this.name,
			api: this.api,
			model: options.model
		}, (id, { attempt }) => {
			if (attempt > 0) {
				const hash = hashToolCallId(`${id}:${attempt}`).slice(0, 8);
				return `${id.split("|")[0]?.replace(/[^a-zA-Z0-9_-]/g, "_").slice(0, 31) || "call"}_${hash}`;
			}
			if (id.includes("|")) {
				const separator = id.indexOf("|");
				const call = id.slice(0, separator).replace(/[^a-zA-Z0-9_-]/g, "_");
				const item = id.slice(separator + 1).replace(/[^a-zA-Z0-9_-]/g, "_");
				const combined = item ? `${call}_${item}` : call;
				return combined.length <= 40 ? combined : `${call.slice(0, 31)}_${hashToolCallId(id).slice(0, 8)}`;
			}
			return (this.provider ?? this.name) === "openai" ? id.slice(0, 40) : id;
		});
		const pendingImages = [];
		const flushImages = () => {
			if (pendingImages.length > 0) messages.push({
				role: "user",
				content: pendingImages.splice(0)
			});
		};
		for (const message of replay.messages) {
			if (message.role !== "tool") flushImages();
			messages.push(this.convertMessage(message));
			if (message.role === "tool" && Array.isArray(message.content) && (this.inputModalities?.includes("image") ?? true)) {
				for (const part of message.content) if (part.type === "image") {
					const image = this.convertContentPart(part);
					if (image) pendingImages.push(image);
				}
			}
		}
		flushImages();
		const modelOptions = options.modelOptions;
		const combinedSchema = options.outputSchema;
		const responseFormat = combinedSchema ? { response_format: {
			type: "json_schema",
			json_schema: {
				name: "structured_output",
				schema: this.makeStructuredOutputCompatible(combinedSchema, Array.isArray(combinedSchema.required) ? combinedSchema.required : void 0),
				strict: true
			}
		} } : void 0;
		const reasoning = resolveReasoning(options.reasoning, this.modelReasoning(options.model));
		const params = {
			...tools?.length && options.toolChoice !== void 0 ? { tool_choice: toChatCompletionsToolChoice(options.toolChoice) } : void 0,
			...modelOptions,
			model: options.model,
			messages,
			...tools && tools.length > 0 && { tools },
			...!tools?.length && modelOptions?.tools === void 0 && replay.messages.some((message) => message.role === "tool" || !!message.toolCalls?.length) ? { tools: [] } : {},
			...responseFormat ?? {},
			stream: true
		};
		if (reasoning?.value) Object.assign(params, { reasoning_effort: reasoning.value });
		return params;
	}
	/**
	* Modern OpenAI-compatible Chat Completions APIs support `tools` and
	* `response_format: json_schema` together in a single streaming request
	* (per issue #605). Subclasses can override — Groq, for instance, must
	* return `false` because its API rejects schema + tools + stream with a
	* 400.
	*/
	supportsCombinedToolsAndSchema() {
		return true;
	}
	/**
	* Converts a single ModelMessage to the Chat Completions API message format.
	* Override this in subclasses to handle provider-specific message formats.
	*/
	convertMessage(message) {
		if (message.role === "tool") return {
			role: "tool",
			tool_call_id: message.toolCallId || "",
			content: typeof message.content === "string" ? sanitizeUnicode(message.content) || "(no tool output)" : Array.isArray(message.content) ? sanitizeUnicode(message.content.filter((part) => part.type === "text").map((part) => part.content).join("\n") || (message.content.some((part) => part.type === "image") ? "(see attached image)" : "(no tool output)")) : "(no tool output)"
		};
		if (message.role === "assistant") {
			const toolCalls = message.toolCalls?.map((tc) => ({
				id: tc.id,
				type: "function",
				function: {
					name: sanitizeUnicode(tc.function.name),
					arguments: sanitizeJsonArguments(typeof tc.function.arguments === "string" ? tc.function.arguments : JSON.stringify(tc.function.arguments))
				}
			}));
			const hasToolCalls = !!toolCalls && toolCalls.length > 0;
			const textContent = this.extractTextContent(message.content);
			return {
				role: "assistant",
				content: hasToolCalls && !textContent ? null : textContent,
				...hasToolCalls ? { tool_calls: toolCalls } : {}
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
			if (!converted) throw new Error(`Unsupported content part type for ${this.name}: ${part.type}. Override convertContentPart() in a subclass to handle this type, or remove it from the message.`);
			parts.push(converted);
		}
		if (parts.length === 0) throw new Error(`User message for ${this.name} has no content parts. Empty user messages would produce a paid request with no input; provide at least one text/image/audio part or omit the message.`);
		return {
			role: "user",
			content: parts
		};
	}
	/**
	* Converts a single ContentPart to the Chat Completions API content part format.
	* Override this in subclasses to handle additional content types or provider-specific metadata.
	*/
	convertContentPart(part) {
		if (part.type === "text") return {
			type: "text",
			text: sanitizeUnicode(part.content)
		};
		if (part.type === "image") {
			const imageMetadata = part.metadata;
			if (isFileSource(part.source)) throw unsupportedFileSourceError(this.name, this.name === "openai-chat" ? "on the Chat Completions API — use the Responses adapter (openaiText) to reference an uploaded file by file_id" : "on the Chat Completions API");
			const imageValue = part.source.value;
			const imageMime = part.source.mimeType || "application/octet-stream";
			return {
				type: "image_url",
				image_url: {
					url: part.source.type === "data" && !imageValue.startsWith("data:") ? `data:${imageMime};base64,${imageValue}` : imageValue,
					detail: imageMetadata?.detail || "auto"
				}
			};
		}
		if (part.type === "document") throw new Error(`${this.name} does not support document parts on the Chat Completions API; use the Responses adapter, which sends them as input_file.`);
		return null;
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
//#endregion
export { OpenAIBaseChatCompletionsTextAdapter };

//# sourceMappingURL=chat-completions-text.js.map