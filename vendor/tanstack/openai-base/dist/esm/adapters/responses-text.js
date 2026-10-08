import { makeStructuredOutputCompatibleWithMap, warnStrictFallback } from "../utils/schema-converter.js";
import { buildResponsesUsage } from "../usage.js";
import { getOpenAIProviderToolKind } from "../tools/openai-provider-tool.js";
import { toResponsesToolChoice } from "../tools/tool-choice.js";
import { clientFor, extractRequestOptions } from "../utils/request-options.js";
import { createToolInputNormalizer } from "../utils/tool-input-normalizer.js";
import { convertToolsToResponsesFormat } from "./responses-tool-converter.js";
import { hostedShellCallIds, readUserExecutedCall, userToolRequestItem, userToolResultItem } from "./responses-user-tools.js";
import { EventType, fileReferenceFor, isFileSource, normalizeSystemPrompts, unsupportedFileSourceError } from "@tanstack/ai";
import { hashToolCallId, orderedAssistantBlocks, resolveReasoning, sanitizeJsonArguments, sanitizeUnicode, splitMidConversationChanges, toRetryAfterMs, toRunErrorPayload, toRunErrorRawEvent, transformMessagesForReplay } from "@tanstack/ai/adapter-internals";
import { BaseTextAdapter } from "@tanstack/ai/adapters";
import { generateId } from "@tanstack/ai-utils";
//#region src/adapters/responses-text.ts
var PDF_BASE64_MAGIC = "JVBERi";
function isRecord(value) {
	return typeof value === "object" && value !== null;
}
function readURLCitation(value) {
	if (!isRecord(value) || value.type !== "url_citation") return void 0;
	if (typeof value.url !== "string" || typeof value.title !== "string" || typeof value.start_index !== "number" || typeof value.end_index !== "number") return;
	return {
		type: "url_citation",
		url: value.url,
		title: value.title,
		start_index: value.start_index,
		end_index: value.end_index
	};
}
function readWebSearchCall(value) {
	if (!isRecord(value) || value.type !== "web_search_call") return void 0;
	if (typeof value.id !== "string" || typeof value.status !== "string" || !isRecord(value.action) || typeof value.action.type !== "string") return;
	return value;
}
function collectWebSearchSources(item, citations) {
	const sources = /* @__PURE__ */ new Map();
	const add = (url, title) => {
		if (typeof url !== "string" || url.length === 0) return;
		const existing = sources.get(url);
		if (existing) {
			if (!existing.title && typeof title === "string" && title.length > 0) existing.title = title;
			return;
		}
		sources.set(url, {
			url,
			...typeof title === "string" && title.length > 0 ? { title } : {}
		});
	};
	if (item.action.type === "search") for (const source of item.action.sources ?? []) add(source.url);
	for (const citation of citations) add(citation.url, citation.title);
	return [...sources.values()];
}
function packResponsesReasoningSignature(id, encryptedContent) {
	if (!id && !encryptedContent) return void 0;
	return JSON.stringify({
		...id ? { id } : {},
		...encryptedContent ? { encrypted_content: encryptedContent } : {}
	});
}
function unpackResponsesReasoningSignature(signature) {
	try {
		const parsed = JSON.parse(signature);
		if (!isRecord(parsed)) return void 0;
		const id = typeof parsed.id === "string" ? parsed.id : void 0;
		const encrypted_content = typeof parsed.encrypted_content === "string" ? parsed.encrypted_content : void 0;
		if (!id && !encrypted_content) return void 0;
		return {
			...id ? { id } : {},
			...encrypted_content ? { encrypted_content } : {}
		};
	} catch {
		return;
	}
}
function readReasoningItem(item) {
	if (!isRecord(item) || item.type !== "reasoning") return void 0;
	const id = typeof item.id === "string" ? item.id : void 0;
	const encrypted_content = typeof item.encrypted_content === "string" ? item.encrypted_content : void 0;
	if (!id && !encrypted_content) return void 0;
	return {
		...id ? { id } : {},
		...encrypted_content ? { encrypted_content } : {}
	};
}
/** The compaction item packed in a thinking signature, or `undefined`. */
function readCompactionSignature(signature) {
	try {
		const parsed = JSON.parse(signature);
		if (!isRecord(parsed) || parsed.type !== "compaction" || typeof parsed.encrypted_content !== "string") return void 0;
		return {
			type: "compaction",
			...typeof parsed.id === "string" ? { id: parsed.id } : {},
			encrypted_content: parsed.encrypted_content
		};
	} catch {
		return;
	}
}
/** The texts of a list of output parts. */
function partTexts(content) {
	return content.flatMap((part) => isRecord(part) && typeof part.text === "string" ? [part.text] : []);
}
/**
* Map one item of a `/responses/compact` output to a message. The
* compaction item and reasoning items go in thinking signatures, so they
* go back to the same model as they are.
*/
function fromCompactedItem(item, metadata) {
	if (isRecord(item) && item.type === "compaction") return {
		role: "assistant",
		content: null,
		thinking: [{
			content: "",
			redacted: true,
			signature: JSON.stringify({
				type: "compaction",
				id: item.id,
				encrypted_content: item.encrypted_content
			})
		}],
		metadata
	};
	const reasoning = readReasoningItem(item);
	if (reasoning && isRecord(item)) return {
		role: "assistant",
		content: null,
		thinking: [{
			content: (Array.isArray(item.summary) ? partTexts(item.summary) : []).join("\n"),
			signature: packResponsesReasoningSignature(reasoning.id, reasoning.encrypted_content)
		}],
		metadata
	};
	if (isRecord(item) && item.type === "message" && Array.isArray(item.content) && (item.role === "user" || item.role === "assistant")) {
		if (item.role === "assistant") return {
			role: "assistant",
			content: partTexts(item.content).join(""),
			metadata
		};
		return {
			role: "user",
			content: item.content.map((part) => {
				if (isRecord(part) && typeof part.text === "string") return {
					type: "text",
					content: part.text
				};
				if (isRecord(part) && part.type === "input_image" && typeof part.image_url === "string") return {
					type: "image",
					source: {
						type: "url",
						value: part.image_url
					}
				};
				throw new Error(`Cannot map a compacted ${isRecord(part) ? String(part.type) : "part"} part.`);
			})
		};
	}
	throw new Error("Cannot map a compacted output item.");
}
/** The tool call metadata of a streamed `function_call` item. */
function functionCallMetadata(item) {
	return {
		...item.id ? { itemId: item.id } : {},
		...item.namespace ? { namespace: item.namespace } : {}
	};
}
/**
* The assistant's text as Responses input. A same-model message with one
* saved answer item per text block replays each block with its item `id`
* and `phase`. Another model's message, or one whose blocks do not match its
* items, replays as plain text.
*/
function answerItems(message, text, foreign) {
	const items = foreign ? void 0 : message.metadata?.tanstack?.responseItems;
	const texts = orderedAssistantBlocks(message)?.flatMap((block) => block.type === "text" ? [block.text] : []) ?? [text];
	if (!items || items.length !== texts.length) return [{
		type: "message",
		role: "assistant",
		content: text
	}];
	return items.map((item, index) => ({
		type: "message",
		role: "assistant",
		id: item.id,
		status: "completed",
		content: [{
			type: "output_text",
			text: sanitizeUnicode(texts[index] ?? ""),
			annotations: []
		}],
		...item.phase === "commentary" || item.phase === "final_answer" ? { phase: item.phase } : {}
	}));
}
/**
* Shared implementation of the OpenAI Responses API. Holds the stream-event
* accumulator + AG-UI lifecycle and calls the OpenAI SDK directly. Subclasses
* (today: ai-openai) construct an OpenAI client with their provider-specific
* `baseURL` / headers and pass it in.
*/
var OpenAIBaseResponsesTextAdapter = class extends BaseTextAdapter {
	kind = "text";
	api = "openai-responses";
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
	/**
	* A copy of the client that sends its requests through `fetch`. Override it
	* when the SDK copy loses an option of your client.
	*/
	withFetch(fetch) {
		return this.client.withOptions({ fetch });
	}
	async *chatStream(options) {
		const toolCallMetadata = /* @__PURE__ */ new Map();
		const aguiState = {
			runId: options.runId ?? generateId(this.name),
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
			const response = await clientFor(this.client, options, this.baseFetch, (fetch) => this.withFetch(fetch)).responses.create({
				...requestParams,
				stream: true
			}, extractRequestOptions(options.request));
			yield* this.processStreamChunks(response, toolCallMetadata, options, aguiState);
		} catch (error) {
			const errorPayload = toRunErrorPayload(error, `${this.name}.chatStream failed`);
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
			yield {
				type: EventType.RUN_ERROR,
				metadata: this.sourceMetadata(options.model, this.isAbortError(error) ? "aborted" : "error"),
				model: options.model,
				timestamp: Date.now(),
				message: errorPayload.message,
				code: errorPayload.code,
				...rawEvent !== void 0 && { rawEvent },
				...retryAfterMs !== void 0 && { retryAfterMs },
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
	* Generate structured output using the provider's native JSON Schema response format.
	* Uses stream: false to get the complete response in one call.
	*
	* OpenAI-compatible Responses APIs have strict requirements for structured output:
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
			const { stream: _stream, stream_options: _streamOptions, ...cleanParams } = requestParams;
			chatOptions.logger.request(`activity=structuredOutput provider=${this.name} model=${this.model} messages=${chatOptions.messages.length}`, {
				provider: this.name,
				model: this.model
			});
			const response = await clientFor(this.client, chatOptions, this.baseFetch, (fetch) => this.withFetch(fetch)).responses.create({
				...cleanParams,
				stream: false,
				text: { format: {
					type: "json_schema",
					name: "structured_output",
					schema: jsonSchema,
					strict: true
				} }
			}, extractRequestOptions(chatOptions.request));
			const rawText = this.extractTextFromResponse(response);
			if (rawText.length === 0) throw new Error(`${this.name}.structuredOutput: response contained no content`);
			let parsed;
			try {
				parsed = JSON.parse(rawText);
			} catch {
				throw new Error(`Failed to parse structured output as JSON. Content: ${rawText.slice(0, 200)}${rawText.length > 200 ? "..." : ""}`);
			}
			const transformed = this.transformStructuredOutput(parsed);
			const usage = buildResponsesUsage(response.usage);
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
	* Stream structured output via the Responses API: single request with
	* `text.format: json_schema` + `stream: true`. Consumes Responses-API
	* events (`response.output_text.delta`, `response.reasoning_text.delta`,
	* `response.reasoning_summary_text.delta`, the legacy
	* `response.reasoning.delta`, `response.refusal.delta`,
	* `response.completed`, `response.failed`) and re-emits the standard AG-UI
	* lifecycle ending with `CUSTOM 'structured-output.complete'`.
	*
	* Tools are stripped (structured output is mutually exclusive with tool
	* calls in this path). Reasoning text is accumulated and surfaced both as
	* REASONING_* lifecycle events during the stream and on the terminal
	* CUSTOM event's `value.reasoning`.
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
		let stepId;
		let hasClosedReasoning = false;
		let model = chatOptions.model;
		let responseId;
		let usage;
		let responseCompleted = false;
		const closeReasoning = function* () {
			if (reasoningMessageId && !hasClosedReasoning) {
				hasClosedReasoning = true;
				yield {
					type: EventType.REASONING_MESSAGE_END,
					messageId: reasoningMessageId,
					model,
					timestamp: Date.now()
				};
				yield {
					type: EventType.REASONING_END,
					messageId: reasoningMessageId,
					model,
					timestamp: Date.now()
				};
				if (stepId) yield {
					type: EventType.STEP_FINISHED,
					stepName: stepId,
					stepId,
					model,
					timestamp: Date.now(),
					content: accumulatedReasoning
				};
				reasoningMessageId = void 0;
				stepId = void 0;
				hasClosedReasoning = false;
			}
		}.bind(this);
		const openReasoning = function* () {
			if (reasoningMessageId) return;
			reasoningMessageId = generateId(this.name);
			stepId = generateId(this.name);
			yield {
				type: EventType.REASONING_START,
				messageId: reasoningMessageId,
				model,
				timestamp: Date.now()
			};
			yield {
				type: EventType.REASONING_MESSAGE_START,
				messageId: reasoningMessageId,
				role: "reasoning",
				model,
				timestamp: Date.now()
			};
			yield {
				type: EventType.STEP_STARTED,
				stepName: stepId,
				stepId,
				model,
				timestamp: Date.now(),
				stepType: "thinking"
			};
		}.bind(this);
		try {
			const { tools: _tools, ...cleanParams } = requestParams;
			chatOptions.logger.request(`activity=structuredOutputStream provider=${this.name} model=${this.model} messages=${chatOptions.messages.length}`, {
				provider: this.name,
				model: this.model
			});
			const stream = await clientFor(this.client, chatOptions, this.baseFetch, (fetch) => this.withFetch(fetch)).responses.create({
				...cleanParams,
				stream: true,
				..._tools?.length === 0 ? { tools: [] } : {},
				text: { format: {
					type: "json_schema",
					name: "structured_output",
					schema: jsonSchema,
					strict: true
				} }
			}, extractRequestOptions(chatOptions.request));
			for await (const chunk of stream) {
				chatOptions.logger.provider(`provider=${this.name} type=${chunk.type}`, {
					provider: this.name,
					type: chunk.type
				});
				if (!aguiState.hasEmittedRunStarted) {
					aguiState.hasEmittedRunStarted = true;
					yield {
						type: EventType.RUN_STARTED,
						metadata: this.sourceMetadata(chatOptions.model),
						runId: aguiState.runId,
						threadId: aguiState.threadId,
						model,
						timestamp: Date.now(),
						parentRunId: chatOptions.parentRunId
					};
				}
				if (chunk.type === "response.created" || chunk.type === "response.in_progress") {
					const responseModel = chunk.response?.model;
					if (responseModel) model = responseModel;
					continue;
				}
				if (chunk.type === "response.refusal.delta") {
					const delta = typeof chunk.delta === "string" ? chunk.delta : "";
					yield {
						type: EventType.RUN_ERROR,
						metadata: this.sourceMetadata(chatOptions.model),
						runId: aguiState.runId,
						model,
						timestamp: Date.now(),
						message: `Model refused: ${delta}`,
						code: "refusal",
						error: {
							message: `Model refused: ${delta}`,
							code: "refusal"
						}
					};
					return;
				}
				if (chunk.type === "response.reasoning_text.delta" || chunk.type === "response.reasoning_summary_text.delta" || chunk.type === "response.reasoning.delta") {
					const raw = chunk.delta;
					const reasoningDelta = Array.isArray(raw) ? raw.join("") : typeof raw === "string" ? raw : "";
					if (!reasoningDelta) continue;
					yield* openReasoning();
					if (!reasoningMessageId) continue;
					accumulatedReasoning += reasoningDelta;
					yield {
						type: EventType.REASONING_MESSAGE_CONTENT,
						messageId: reasoningMessageId,
						delta: reasoningDelta,
						model,
						timestamp: Date.now()
					};
					continue;
				}
				if (chunk.type === "response.output_text.delta") {
					const raw = chunk.delta;
					const textDelta = Array.isArray(raw) ? raw.join("") : typeof raw === "string" ? raw : "";
					if (!textDelta) continue;
					yield* closeReasoning();
					if (!hasEmittedTextMessageStart) {
						hasEmittedTextMessageStart = true;
						yield {
							type: EventType.TEXT_MESSAGE_START,
							messageId: aguiState.messageId,
							model,
							timestamp: Date.now(),
							role: "assistant"
						};
					}
					accumulatedContent += textDelta;
					yield {
						type: EventType.TEXT_MESSAGE_CONTENT,
						messageId: aguiState.messageId,
						model,
						timestamp: Date.now(),
						delta: textDelta,
						content: accumulatedContent
					};
					continue;
				}
				if (chunk.type === "response.completed") {
					responseCompleted = true;
					const response = chunk.response;
					if (response.id) responseId = response.id;
					if (response.model) model = response.model;
					if (response.usage) usage = response.usage;
					if (response.model) model = response.model;
					break;
				}
				if (chunk.type === "response.failed") {
					const response = chunk.response;
					const message = response?.error?.message || "Responses API stream failed";
					const code = response?.error?.code;
					yield {
						type: EventType.RUN_ERROR,
						metadata: this.sourceMetadata(chatOptions.model),
						runId: aguiState.runId,
						model,
						timestamp: Date.now(),
						message,
						...code !== void 0 && { code },
						error: {
							message,
							...code !== void 0 && { code }
						}
					};
					return;
				}
			}
			yield* closeReasoning();
			if (hasEmittedTextMessageStart) yield {
				type: EventType.TEXT_MESSAGE_END,
				messageId: aguiState.messageId,
				model,
				timestamp: Date.now()
			};
			if (!responseCompleted) {
				const message = "Response stream ended before response.completed";
				yield {
					type: EventType.RUN_ERROR,
					metadata: this.sourceMetadata(chatOptions.model),
					runId: aguiState.runId,
					model,
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
			if (accumulatedContent.length === 0) {
				yield {
					type: EventType.RUN_ERROR,
					metadata: this.sourceMetadata(chatOptions.model),
					runId: aguiState.runId,
					model,
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
					model,
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
				model,
				timestamp: Date.now()
			};
			yield {
				type: EventType.RUN_FINISHED,
				...responseId ? { responseId } : {},
				runId: aguiState.runId,
				threadId: aguiState.threadId,
				model,
				timestamp: Date.now(),
				finishReason: "stop",
				...usage && { usage: buildResponsesUsage(usage) }
			};
		} catch (error) {
			if (!aguiState.hasEmittedRunStarted) {
				aguiState.hasEmittedRunStarted = true;
				yield {
					type: EventType.RUN_STARTED,
					metadata: this.sourceMetadata(chatOptions.model),
					runId: aguiState.runId,
					threadId: aguiState.threadId,
					model,
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
				model,
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
	* Compact the history with `POST /responses/compact`. The result holds
	* the user messages and one encrypted compaction item. A result with no
	* compaction item throws.
	*/
	async compact(options) {
		const prompts = normalizeSystemPrompts(options.systemPrompts);
		const response = await clientFor(this.client, options, this.baseFetch, (fetch) => this.withFetch(fetch)).responses.compact({
			model: options.model,
			input: this.convertMessagesToInput(options.messages, void 0, options.model),
			...prompts.length > 0 && { instructions: prompts.map((p) => sanitizeUnicode(p.content)).join("\n") },
			...options.tools?.length && { tools: this.convertTools(options.tools) }
		}, options.signal ? { signal: options.signal } : {});
		if (!response.output.some((item) => item.type === "compaction")) throw new Error("The compact result has no compaction item.");
		const metadata = { tanstack: { source: {
			provider: this.provider ?? this.name,
			api: this.api,
			model: options.model
		} } };
		return response.output.map((item) => fromCompactedItem(item, metadata));
	}
	/**
	* Cross-SDK abort detection for `structuredOutputStream`. Mirrors the
	* Chat Completions base; subclasses with proprietary error types override.
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
	* The model's reasoning data for `chat({ reasoning })`. The default is
	* none, so the base sends no reasoning field. A subclass returns the
	* model's entry from its generated `model-reasoning.ts` map.
	*/
	modelReasoning(_model) {}
	/**
	* Extract text content from a non-streaming Responses API response.
	* Override this in subclasses for provider-specific response shapes.
	*/
	extractTextFromResponse(response) {
		let textContent = "";
		let refusal;
		let sawMessageItem = false;
		const observedItemTypes = /* @__PURE__ */ new Set();
		for (const item of response.output) {
			observedItemTypes.add(item.type);
			if (item.type === "message") {
				sawMessageItem = true;
				for (const part of item.content) {
					const partType = part.type;
					if (partType === "output_text") textContent += part.text ?? "";
					else if (partType === "refusal") refusal = part.refusal || refusal || "Refused without explanation";
					else throw new Error(`${this.name}.extractTextFromResponse: unsupported message content part type "${partType}"`);
				}
			}
		}
		if (!textContent && refusal !== void 0) {
			const err = /* @__PURE__ */ new Error(`Model refused to respond: ${refusal}`);
			err.code = "refusal";
			throw err;
		}
		if (!textContent && response.output.length > 0 && !sawMessageItem) throw new Error(`${this.name}.extractTextFromResponse: response.output contained items of type(s) [${[...observedItemTypes].sort().join(", ")}] but no message text — the model returned a non-text response`);
		return textContent;
	}
	/**
	* Processes streamed chunks from the Responses API and yields AG-UI events.
	* Override this in subclasses to handle provider-specific stream behavior.
	*
	* Handles the following event types:
	* - response.created / response.incomplete / response.failed
	* - response.output_text.delta
	* - response.reasoning_text.delta
	* - response.reasoning.delta (the legacy type used before response.reasoning_text.delta)
	* - response.reasoning_summary_text.delta
	* - response.content_part.added / response.content_part.done
	* - response.output_item.added
	* - response.function_call_arguments.delta / response.function_call_arguments.done
	* - response.completed
	* - error
	*/
	async *processStreamChunks(stream, toolCallMetadata, options, aguiState) {
		const normalizeToolInput = createToolInputNormalizer(options.tools, (schema, required) => this.makeStructuredOutputCompatibleWithMap(schema, required));
		let accumulatedContent = "";
		let accumulatedReasoning = "";
		let hasStreamedContentDeltas = false;
		let hasStreamedReasoningDeltas = false;
		let model = options.model;
		let responseId;
		let stepId = null;
		let hasEmittedTextMessageStart = false;
		let reasoningMessageId;
		let reasoningItemId;
		let reasoningEncryptedContent;
		let closedReasoningMessageId;
		let hasClosedReasoning = false;
		let runFinishedEmitted = false;
		const providerWebSearchCalls = /* @__PURE__ */ new Map();
		const webSearchCitations = [];
		const adapterName = this.name;
		const emitModel = () => model || options.model;
		const recordProviderWebSearchCall = (value, index) => {
			const item = readWebSearchCall(value);
			if (!item) return;
			const existing = providerWebSearchCalls.get(item.id);
			if (existing) {
				existing.item = item;
				existing.index = index;
			} else providerWebSearchCalls.set(item.id, {
				item,
				index,
				started: false
			});
		};
		const emitProviderWebSearchCalls = function* (assistantMessage, completedOnly = false) {
			for (const entry of providerWebSearchCalls.values()) {
				if (entry.started || completedOnly && entry.item.status !== "completed") continue;
				const callUrls = new Set(entry.item.action.type === "search" ? (entry.item.action.sources ?? []).map((source) => source.url) : []);
				const citations = webSearchCitations.filter((citation) => callUrls.has(citation.url));
				const metadata = {
					itemId: entry.item.id,
					providerExecuted: true,
					sources: collectWebSearchSources(entry.item, citations),
					openai: {
						webSearchCall: entry.item,
						urlCitations: citations,
						...assistantMessage ? { assistantMessage } : {}
					}
				};
				entry.started = true;
				yield {
					type: EventType.TOOL_CALL_START,
					toolCallId: entry.item.id,
					toolCallName: "web_search",
					toolName: "web_search",
					parentMessageId: aguiState.messageId,
					model: emitModel(),
					timestamp: Date.now(),
					index: entry.index,
					metadata
				};
				yield {
					type: EventType.TOOL_CALL_END,
					toolCallId: entry.item.id,
					toolCallName: "web_search",
					toolName: "web_search",
					model: emitModel(),
					timestamp: Date.now(),
					input: entry.item.action
				};
			}
		};
		const openReasoning = function* () {
			if (reasoningMessageId) return;
			reasoningMessageId = generateId(adapterName);
			stepId = generateId(adapterName);
			const timestamp = Date.now();
			const currentModel = emitModel();
			yield {
				type: EventType.REASONING_START,
				messageId: reasoningMessageId,
				model: currentModel,
				timestamp
			};
			yield {
				type: EventType.REASONING_MESSAGE_START,
				messageId: reasoningMessageId,
				role: "reasoning",
				model: currentModel,
				timestamp
			};
			yield {
				type: EventType.STEP_STARTED,
				stepName: stepId,
				stepId,
				model: currentModel,
				timestamp,
				stepType: "thinking"
			};
		};
		const captureReasoningItem = (item) => {
			const parsed = readReasoningItem(item);
			if (!parsed) return;
			if (parsed.id) reasoningItemId = parsed.id;
			if (parsed.encrypted_content) reasoningEncryptedContent = parsed.encrypted_content;
		};
		const closeReasoning = function* () {
			if (!reasoningMessageId || hasClosedReasoning) return;
			hasClosedReasoning = true;
			const timestamp = Date.now();
			const currentModel = emitModel();
			const signature = packResponsesReasoningSignature(reasoningItemId, reasoningEncryptedContent);
			yield {
				type: EventType.REASONING_MESSAGE_END,
				messageId: reasoningMessageId,
				model: currentModel,
				timestamp
			};
			yield {
				type: EventType.REASONING_END,
				messageId: reasoningMessageId,
				model: currentModel,
				timestamp
			};
			if (stepId) {
				closedReasoningMessageId = reasoningMessageId;
				yield {
					type: EventType.STEP_FINISHED,
					stepName: stepId,
					stepId,
					model: currentModel,
					timestamp,
					content: accumulatedReasoning
				};
				if (signature) yield {
					type: EventType.REASONING_ENCRYPTED_VALUE,
					subtype: "message",
					entityId: reasoningMessageId,
					encryptedValue: signature,
					model: currentModel,
					timestamp
				};
			}
			reasoningMessageId = void 0;
			reasoningItemId = void 0;
			reasoningEncryptedContent = void 0;
			stepId = null;
			hasClosedReasoning = false;
			accumulatedReasoning = "";
		};
		const trackedCall = (id, outputIndex) => {
			const tracked = toolCallMetadata.get(id) ?? (outputIndex === void 0 ? void 0 : [...toolCallMetadata.values()].find((metadata) => metadata.index === outputIndex));
			if (tracked) toolCallMetadata.set(id, tracked);
			return tracked;
		};
		const userToolChunks = (item, outputIndex, bareShell) => {
			const call = readUserExecutedCall(item, { bareShell });
			if (!call || toolCallMetadata.get(call.callId)?.ended) return [];
			const tracked = toolCallMetadata.get(call.callId) ?? {
				callId: call.callId,
				index: outputIndex,
				name: call.name,
				started: false
			};
			toolCallMetadata.set(call.callId, tracked);
			tracked.started = true;
			tracked.ended = true;
			tracked.name = call.name;
			const timestamp = Date.now();
			const modelName = model || options.model;
			const metadata = {
				openaiUserTool: call.name,
				...call.itemId ? { itemId: call.itemId } : {},
				...call.maxOutputLength !== void 0 ? { maxOutputLength: call.maxOutputLength } : {}
			};
			return [{
				type: EventType.TOOL_CALL_START,
				toolCallId: call.callId,
				toolCallName: call.name,
				toolName: call.name,
				parentMessageId: aguiState.messageId,
				model: modelName,
				timestamp,
				index: outputIndex,
				metadata
			}, {
				type: EventType.TOOL_CALL_END,
				toolCallId: call.callId,
				toolCallName: call.name,
				toolName: call.name,
				model: modelName,
				timestamp,
				input: call.input
			}];
		};
		const emitReasoningDelta = function* (text) {
			if (!text) return;
			yield* openReasoning();
			if (!reasoningMessageId) return;
			accumulatedReasoning += text;
			hasStreamedReasoningDeltas = true;
			yield {
				type: EventType.REASONING_MESSAGE_CONTENT,
				messageId: reasoningMessageId,
				delta: text,
				model: emitModel(),
				timestamp: Date.now()
			};
		};
		try {
			for await (const chunk of stream) {
				options.logger.provider(`provider=${this.name} type=${chunk.type}`, {
					provider: this.name,
					type: chunk.type
				});
				if (!aguiState.hasEmittedRunStarted) {
					aguiState.hasEmittedRunStarted = true;
					yield {
						type: EventType.RUN_STARTED,
						metadata: this.sourceMetadata(options.model),
						runId: aguiState.runId,
						threadId: aguiState.threadId,
						model: model || options.model,
						timestamp: Date.now(),
						parentRunId: options.parentRunId
					};
				}
				const handleContentPart = (contentPart) => {
					if (contentPart.type === "output_text") {
						accumulatedContent += contentPart.text || "";
						return {
							type: EventType.TEXT_MESSAGE_CONTENT,
							messageId: aguiState.messageId,
							model: model || options.model,
							timestamp: Date.now(),
							delta: contentPart.text || "",
							content: accumulatedContent
						};
					}
					const isRefusal = contentPart.type === "refusal";
					const message = isRefusal ? contentPart.refusal || "Refused without explanation" : `Unsupported response content_part type: ${contentPart.type}`;
					const code = isRefusal ? "refusal" : contentPart.type;
					return {
						type: EventType.RUN_ERROR,
						metadata: this.sourceMetadata(options.model),
						model: model || options.model,
						timestamp: Date.now(),
						message,
						code,
						error: {
							message,
							code
						}
					};
				};
				if (chunk.type === "response.created" || chunk.type === "response.incomplete" || chunk.type === "response.failed") {
					if (chunk.response.id) responseId = chunk.response.id;
					model = chunk.response.model;
				}
				if (chunk.type === "response.created") {
					hasStreamedContentDeltas = false;
					hasStreamedReasoningDeltas = false;
					hasEmittedTextMessageStart = false;
					reasoningMessageId = void 0;
					hasClosedReasoning = false;
					stepId = null;
					accumulatedContent = "";
					accumulatedReasoning = "";
				}
				if (chunk.type === "response.failed" || chunk.type === "response.incomplete") {
					if (chunk.type === "response.incomplete") {
						for (const [index, item] of (chunk.response.output ?? []).entries()) recordProviderWebSearchCall(item, index);
						yield* emitProviderWebSearchCalls(void 0, true);
					}
					yield* closeReasoning();
					if (hasEmittedTextMessageStart) {
						yield {
							type: EventType.TEXT_MESSAGE_END,
							messageId: aguiState.messageId,
							model: chunk.response.model,
							timestamp: Date.now()
						};
						hasEmittedTextMessageStart = false;
					}
					const errorMessage = chunk.response.error?.message || chunk.response.incomplete_details?.reason || (chunk.type === "response.failed" ? "Response failed" : "Response ended incomplete");
					const errorCode = chunk.response.error?.code ?? (chunk.response.incomplete_details ? "incomplete" : void 0) ?? void 0;
					yield {
						type: EventType.RUN_ERROR,
						metadata: this.sourceMetadata(options.model),
						model: chunk.response.model,
						timestamp: Date.now(),
						message: errorMessage,
						...errorCode !== void 0 && { code: errorCode },
						error: {
							message: errorMessage,
							...errorCode !== void 0 && { code: errorCode }
						}
					};
					runFinishedEmitted = true;
					return;
				}
				if (chunk.type === "response.output_text.delta" && chunk.delta) {
					const textDelta = Array.isArray(chunk.delta) ? chunk.delta.join("") : typeof chunk.delta === "string" ? chunk.delta : "";
					if (textDelta) {
						yield* closeReasoning();
						if (!hasEmittedTextMessageStart) {
							hasEmittedTextMessageStart = true;
							yield {
								type: EventType.TEXT_MESSAGE_START,
								messageId: aguiState.messageId,
								model: model || options.model,
								timestamp: Date.now(),
								role: "assistant"
							};
						}
						accumulatedContent += textDelta;
						hasStreamedContentDeltas = true;
						yield {
							type: EventType.TEXT_MESSAGE_CONTENT,
							messageId: aguiState.messageId,
							model: model || options.model,
							timestamp: Date.now(),
							delta: textDelta,
							content: accumulatedContent
						};
					}
				}
				if ((chunk.type === "response.reasoning_text.delta" || chunk.type === "response.reasoning.delta") && chunk.delta) yield* emitReasoningDelta(Array.isArray(chunk.delta) ? chunk.delta.join("") : typeof chunk.delta === "string" ? chunk.delta : "");
				if (chunk.type === "response.reasoning_summary_text.delta" && chunk.delta) yield* emitReasoningDelta(typeof chunk.delta === "string" ? chunk.delta : "");
				if (chunk.type === "response.content_part.added") {
					const contentPart = chunk.part;
					if ((contentPart.type === "output_text" || contentPart.type === "reasoning_text") && !contentPart.text) continue;
					if (contentPart.type === "reasoning_text") {
						yield* emitReasoningDelta(contentPart.text || "");
						continue;
					}
					if (contentPart.type === "output_text" && !hasEmittedTextMessageStart) {
						yield* closeReasoning();
						hasEmittedTextMessageStart = true;
						yield {
							type: EventType.TEXT_MESSAGE_START,
							messageId: aguiState.messageId,
							model: model || options.model,
							timestamp: Date.now(),
							role: "assistant"
						};
					}
					if (contentPart.type === "output_text") hasStreamedContentDeltas = true;
					const partChunk = handleContentPart(contentPart);
					yield partChunk;
					if (partChunk.type === "RUN_ERROR") {
						runFinishedEmitted = true;
						return;
					}
				}
				if (chunk.type === "response.content_part.done") {
					const contentPart = chunk.part;
					if (contentPart.type === "output_text" && hasStreamedContentDeltas) continue;
					if (contentPart.type === "reasoning_text" && hasStreamedReasoningDeltas) continue;
					if (contentPart.type === "reasoning_text") {
						yield* emitReasoningDelta(contentPart.text || "");
						continue;
					}
					if (contentPart.type === "output_text" && !hasEmittedTextMessageStart) {
						yield* closeReasoning();
						hasEmittedTextMessageStart = true;
						yield {
							type: EventType.TEXT_MESSAGE_START,
							messageId: aguiState.messageId,
							model: model || options.model,
							timestamp: Date.now(),
							role: "assistant"
						};
					}
					const doneChunk = handleContentPart(contentPart);
					yield doneChunk;
					if (doneChunk.type === "RUN_ERROR") {
						runFinishedEmitted = true;
						return;
					}
				}
				if (chunk.type === "response.output_item.added") {
					const item = chunk.item;
					if (item.type === "web_search_call") recordProviderWebSearchCall(item, chunk.output_index);
					if (item.type === "reasoning") {
						captureReasoningItem(item);
						yield* openReasoning();
					}
					if (item.type === "function_call" && item.id) {
						let metadata = trackedCall(item.id, chunk.output_index);
						if (!metadata) {
							metadata = {
								callId: item.call_id || item.id,
								index: chunk.output_index,
								name: item.name || "",
								started: false
							};
							toolCallMetadata.set(item.id, metadata);
						} else {
							if (item.call_id) metadata.callId = item.call_id;
							if (!metadata.name && item.name) metadata.name = item.name;
						}
						if (!metadata.started && metadata.name) {
							yield {
								type: EventType.TOOL_CALL_START,
								toolCallId: metadata.callId,
								toolCallName: metadata.name,
								toolName: metadata.name,
								parentMessageId: aguiState.messageId,
								model: model || options.model,
								timestamp: Date.now(),
								index: chunk.output_index,
								metadata: functionCallMetadata(item)
							};
							metadata.started = true;
						}
					}
					yield* userToolChunks(item, chunk.output_index, false);
				}
				if (chunk.type === "response.function_call_arguments.delta" && typeof chunk.delta === "string") {
					let metadata = trackedCall(chunk.item_id, chunk.output_index);
					if (!metadata) {
						metadata = {
							callId: chunk.item_id,
							index: chunk.output_index,
							name: "",
							started: false
						};
						toolCallMetadata.set(chunk.item_id, metadata);
					}
					metadata.pendingArguments = (metadata.pendingArguments ?? "") + chunk.delta;
					if (!metadata.started) {
						options.logger.errors(`${this.name}.processStreamChunks orphan function_call_arguments.delta`, {
							source: `${this.name}.processStreamChunks`,
							itemId: chunk.item_id,
							rawDelta: chunk.delta
						});
						continue;
					}
					yield {
						type: EventType.TOOL_CALL_ARGS,
						toolCallId: metadata.callId,
						model: model || options.model,
						timestamp: Date.now(),
						delta: chunk.delta
					};
				}
				if (chunk.type === "response.function_call_arguments.done") {
					const { item_id } = chunk;
					let metadata = trackedCall(item_id, chunk.output_index);
					if (!metadata) {
						metadata = {
							callId: item_id,
							index: chunk.output_index,
							name: "",
							started: false
						};
						toolCallMetadata.set(item_id, metadata);
					}
					metadata.pendingArguments = chunk.arguments;
					if (!metadata.started) {
						options.logger.errors(`${this.name}.processStreamChunks deferring function_call_arguments.done — TOOL_CALL_START not yet emitted (waiting for name)`, {
							source: `${this.name}.processStreamChunks`,
							...metadata && { toolCallId: metadata.callId },
							itemId: item_id,
							rawArguments: chunk.arguments
						});
						continue;
					}
					if (metadata.ended) continue;
					const name = metadata.name || "";
					metadata.ended = true;
					let parsedInput;
					if (chunk.arguments) try {
						parsedInput = normalizeToolInput(name, JSON.parse(chunk.arguments));
					} catch (parseError) {
						options.logger.errors(`${this.name}.processStreamChunks tool-args JSON parse failed`, {
							error: toRunErrorPayload(parseError, `tool ${name} (${metadata.callId}) returned malformed JSON arguments`),
							source: `${this.name}.processStreamChunks`,
							toolCallId: metadata.callId,
							itemId: item_id,
							toolName: name,
							rawArguments: chunk.arguments
						});
						parsedInput = void 0;
					}
					yield {
						type: EventType.TOOL_CALL_END,
						toolCallId: metadata.callId,
						toolCallName: name,
						toolName: name,
						model: model || options.model,
						timestamp: Date.now(),
						args: chunk.arguments,
						...parsedInput !== void 0 && { input: parsedInput }
					};
				}
				if (chunk.type === "response.output_item.done") {
					const item = chunk.item;
					if (item.type === "web_search_call") recordProviderWebSearchCall(item, chunk.output_index);
					if (item.type === "reasoning") {
						captureReasoningItem(item);
						yield* openReasoning();
						yield* closeReasoning();
					}
					if (item.type === "function_call" && item.id) {
						const metadata = trackedCall(item.id, chunk.output_index) ?? {
							callId: item.call_id || item.id,
							index: chunk.output_index,
							name: item.name || "",
							started: false
						};
						if (!toolCallMetadata.has(item.id)) toolCallMetadata.set(item.id, metadata);
						else {
							if (item.call_id) metadata.callId = item.call_id;
							if (!metadata.name && item.name) metadata.name = item.name;
						}
						if (!metadata.started && metadata.name) {
							yield {
								type: EventType.TOOL_CALL_START,
								toolCallId: metadata.callId,
								toolCallName: metadata.name,
								toolName: metadata.name,
								parentMessageId: aguiState.messageId,
								model: model || options.model,
								timestamp: Date.now(),
								index: metadata.index,
								metadata: functionCallMetadata(item)
							};
							metadata.started = true;
						}
						const rawArgs = typeof item.arguments === "string" ? item.arguments : metadata.pendingArguments;
						if (metadata.started && !metadata.ended && rawArgs !== void 0) {
							const name = metadata.name || "";
							let parsedInput;
							if (rawArgs) try {
								parsedInput = normalizeToolInput(name, JSON.parse(rawArgs));
							} catch (parseError) {
								options.logger.errors(`${this.name}.processStreamChunks tool-args JSON parse failed (output_item.done backfill)`, {
									error: toRunErrorPayload(parseError, `tool ${name} (${metadata.callId}) returned malformed JSON arguments`),
									source: `${this.name}.processStreamChunks`,
									toolCallId: metadata.callId,
									itemId: item.id,
									toolName: name,
									rawArguments: rawArgs
								});
								parsedInput = void 0;
							}
							yield {
								type: EventType.TOOL_CALL_END,
								toolCallId: metadata.callId,
								toolCallName: name,
								toolName: name,
								model: model || options.model,
								timestamp: Date.now(),
								...rawArgs !== void 0 && { args: rawArgs },
								...parsedInput !== void 0 && { input: parsedInput }
							};
							metadata.ended = true;
							metadata.pendingArguments = void 0;
						}
					}
					yield* userToolChunks(item, chunk.output_index, false);
				}
				if (chunk.type === "response.output_text.annotation.added") {
					const citation = readURLCitation(chunk.annotation);
					if (citation) webSearchCitations.push(citation);
				}
				if (chunk.type === "response.completed") {
					if (chunk.response.id) responseId = chunk.response.id;
					if (chunk.response.model) model = chunk.response.model;
					const responseOutput = Array.isArray(chunk.response.output) ? chunk.response.output : [];
					const assistantMessage = responseOutput.find((item) => item.type === "message");
					for (const [index, item] of responseOutput.entries()) if (item.type === "web_search_call") recordProviderWebSearchCall(item, index);
					const completedText = responseOutput.flatMap((item) => item.type === "message" ? item.content : []).filter((part) => part.type === "output_text").map((part) => part.text).join("");
					if (accumulatedContent.length === 0 && completedText.length > 0) {
						if (!hasEmittedTextMessageStart) {
							hasEmittedTextMessageStart = true;
							yield {
								type: EventType.TEXT_MESSAGE_START,
								messageId: aguiState.messageId,
								model: model || options.model,
								timestamp: Date.now(),
								role: "assistant"
							};
						}
						accumulatedContent = completedText;
						hasStreamedContentDeltas = true;
						yield {
							type: EventType.TEXT_MESSAGE_CONTENT,
							messageId: aguiState.messageId,
							model: model || options.model,
							timestamp: Date.now(),
							delta: completedText,
							content: accumulatedContent
						};
					}
					for (const item of responseOutput) captureReasoningItem(item);
					if (!reasoningMessageId && (reasoningItemId || reasoningEncryptedContent)) {
						const signature = packResponsesReasoningSignature(reasoningItemId, reasoningEncryptedContent);
						if (closedReasoningMessageId && signature) yield {
							type: EventType.REASONING_ENCRYPTED_VALUE,
							subtype: "message",
							entityId: closedReasoningMessageId,
							encryptedValue: signature,
							model: emitModel(),
							timestamp: Date.now()
						};
						else if (!closedReasoningMessageId) yield* openReasoning();
					}
					for (const [outputIndex, item] of responseOutput.entries()) {
						if (item.type !== "function_call" || !item.id) continue;
						const metadata = trackedCall(item.id, outputIndex) ?? {
							callId: item.call_id || item.id,
							index: outputIndex,
							name: item.name || "",
							started: false
						};
						if (!toolCallMetadata.has(item.id)) toolCallMetadata.set(item.id, metadata);
						else {
							if (item.call_id) metadata.callId = item.call_id;
							if (!metadata.name && item.name) metadata.name = item.name;
						}
						if (!metadata.started && metadata.name) {
							yield {
								type: EventType.TOOL_CALL_START,
								toolCallId: metadata.callId,
								toolCallName: metadata.name,
								toolName: metadata.name,
								parentMessageId: aguiState.messageId,
								model: model || options.model,
								timestamp: Date.now(),
								index: metadata.index,
								metadata: functionCallMetadata(item)
							};
							metadata.started = true;
						}
						const rawArgs = typeof item.arguments === "string" ? item.arguments : metadata.pendingArguments;
						if (metadata.started && !metadata.ended) {
							const name = metadata.name || "";
							let parsedInput;
							if (rawArgs) try {
								parsedInput = normalizeToolInput(name, JSON.parse(rawArgs));
							} catch (parseError) {
								options.logger.errors(`${this.name}.processStreamChunks tool-args JSON parse failed (response.completed backfill)`, {
									error: toRunErrorPayload(parseError, `tool ${name} (${metadata.callId}) returned malformed JSON arguments`),
									source: `${this.name}.processStreamChunks`,
									toolCallId: metadata.callId,
									itemId: item.id,
									toolName: name,
									rawArguments: rawArgs
								});
								parsedInput = void 0;
							}
							yield {
								type: EventType.TOOL_CALL_END,
								toolCallId: metadata.callId,
								toolCallName: name,
								toolName: name,
								model: model || options.model,
								timestamp: Date.now(),
								...rawArgs !== void 0 && { args: rawArgs },
								...parsedInput !== void 0 && { input: parsedInput }
							};
							metadata.ended = true;
							metadata.pendingArguments = void 0;
						}
					}
					yield* emitProviderWebSearchCalls(assistantMessage);
					const shellOutputs = hostedShellCallIds(responseOutput);
					for (const [outputIndex, item] of responseOutput.entries()) {
						if (isRecord(item) && item.type === "shell_call" && typeof item.call_id === "string" && shellOutputs.has(item.call_id)) continue;
						yield* userToolChunks(item, outputIndex, true);
					}
					yield* closeReasoning();
					if (hasEmittedTextMessageStart) {
						yield {
							type: EventType.TEXT_MESSAGE_END,
							messageId: aguiState.messageId,
							model: model || options.model,
							timestamp: Date.now()
						};
						hasEmittedTextMessageStart = false;
					}
					const hasFunctionCalls = responseOutput.some((item) => {
						if (!isRecord(item)) return false;
						if (item.type === "function_call") return true;
						if (item.type === "shell_call" && typeof item.call_id === "string" && shellOutputs.has(item.call_id)) return false;
						return readUserExecutedCall(item, { bareShell: true }) !== null;
					});
					const incompleteReason = chunk.response.incomplete_details?.reason;
					const finishReason = hasFunctionCalls ? "tool_calls" : incompleteReason === "max_output_tokens" ? "length" : incompleteReason === "content_filter" ? "content_filter" : "stop";
					const responseItems = responseOutput.flatMap((item) => item.type === "message" && item.id ? [{
						id: item.id,
						...item.phase ? { phase: item.phase } : {}
					}] : []);
					yield {
						type: EventType.RUN_FINISHED,
						...responseId ? { responseId } : {},
						...responseItems.length > 0 ? { metadata: { tanstack: { responseItems } } } : {},
						runId: aguiState.runId,
						threadId: aguiState.threadId,
						model: model || options.model,
						timestamp: Date.now(),
						...chunk.response.usage && { usage: buildResponsesUsage(chunk.response.usage) },
						finishReason
					};
					runFinishedEmitted = true;
					return;
				}
				if (chunk.type === "error") {
					const code = chunk.code ?? void 0;
					yield {
						type: EventType.RUN_ERROR,
						metadata: this.sourceMetadata(options.model),
						model: model || options.model,
						timestamp: Date.now(),
						message: chunk.message,
						...code !== void 0 && { code },
						error: {
							message: chunk.message,
							...code !== void 0 && { code }
						}
					};
					runFinishedEmitted = true;
					return;
				}
			}
			if (!runFinishedEmitted && aguiState.hasEmittedRunStarted) {
				yield* emitProviderWebSearchCalls(void 0, true);
				yield* closeReasoning();
				if (hasEmittedTextMessageStart) yield {
					type: EventType.TEXT_MESSAGE_END,
					messageId: aguiState.messageId,
					model: model || options.model,
					timestamp: Date.now()
				};
				const message = "Response stream ended before response.completed";
				yield {
					type: EventType.RUN_ERROR,
					metadata: this.sourceMetadata(options.model),
					model: model || options.model,
					timestamp: Date.now(),
					message,
					code: "incomplete-stream",
					error: {
						message,
						code: "incomplete-stream"
					}
				};
			}
		} catch (error) {
			const errorPayload = toRunErrorPayload(error, `${this.name}.processStreamChunks failed`);
			const rawEvent = toRunErrorRawEvent(error);
			const retryAfterMs = toRetryAfterMs(error);
			options.logger.errors(`${this.name}.processStreamChunks fatal`, {
				error: errorPayload,
				source: `${this.name}.processStreamChunks`
			});
			yield {
				type: EventType.RUN_ERROR,
				metadata: this.sourceMetadata(options.model, this.isAbortError(error) ? "aborted" : "error"),
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
	}
	/**
	* Maps common TextOptions to Responses API request format.
	* Override this in subclasses to add provider-specific options.
	*/
	mapOptionsToRequest(options) {
		const mid = this.midConversationRequest(options);
		const input = this.convertMessagesToInput(options.messages, mid?.items, options.model);
		if (this.strictFallbackWarning) warnStrictFallback(options.tools, options.logger);
		const tools = options.tools ? this.convertTools(mid?.tools ?? options.tools) : void 0;
		const modelOptions = options.modelOptions;
		const combinedSchema = options.outputSchema;
		const textFormat = combinedSchema ? { text: { format: {
			type: "json_schema",
			name: "structured_output",
			schema: this.makeStructuredOutputCompatible(combinedSchema, Array.isArray(combinedSchema.required) ? combinedSchema.required : void 0),
			strict: true
		} } } : void 0;
		const params = {
			...tools?.length && options.toolChoice !== void 0 ? { tool_choice: toResponsesToolChoice(options.toolChoice) } : void 0,
			...modelOptions,
			model: options.model,
			...options.metadata !== void 0 && { metadata: options.metadata },
			...(() => {
				const prompts = mid?.systemPrompts ?? normalizeSystemPrompts(options.systemPrompts);
				if (prompts.length === 0) return {};
				return { instructions: prompts.map((p) => sanitizeUnicode(p.content)).join("\n") };
			})(),
			input,
			...tools && tools.length > 0 && { tools },
			...!tools?.length && modelOptions?.tools === void 0 && options.messages.some((message) => message.role === "tool" || !!message.toolCalls?.length) ? { tools: [] } : {},
			...textFormat ?? {}
		};
		const reasoning = resolveReasoning(options.reasoning, this.modelReasoning(options.model));
		if (reasoning?.value) Object.assign(params, { reasoning: {
			effort: reasoning.value,
			...reasoning.summary && reasoning.level !== "off" ? { summary: "auto" } : {}
		} });
		return params;
	}
	/**
	* Converts the tools for the request. A subclass with its own tool
	* converter overrides this, so the start set and the `additional_tools`
	* items of a mid-conversation change use that converter too.
	*/
	convertTools(tools) {
		return convertToolsToResponsesFormat(tools, this.makeStructuredOutputCompatible.bind(this));
	}
	/**
	* Mid-conversation changes: the start tools for `tools`, the start prompts
	* for `instructions`, and the input items of each change by message index.
	* Undefined when the request stays as today: the adapter has no channels,
	* the engine passed no changes, or the changes do not fit the current lists.
	*/
	midConversationRequest(options) {
		const channels = this.midConversationChannels;
		if (!channels || !options.midConversationChanges) return void 0;
		const split = splitMidConversationChanges({
			changes: options.midConversationChanges,
			tools: options.tools ?? [],
			systemPrompts: normalizeSystemPrompts(options.systemPrompts)
		});
		if (!split) return void 0;
		const toolChannel = channels.tools && ![...split.startTools, ...split.addedTools].some((tool) => getOpenAIProviderToolKind(tool) !== void 0);
		const items = /* @__PURE__ */ new Map();
		for (const [before, change] of split.at) {
			const changeItems = [];
			if (toolChannel && change.tools.length > 0) changeItems.push({
				type: "additional_tools",
				role: "developer",
				tools: this.convertTools(change.tools)
			});
			if (channels.systemPrompts && change.systemPrompts.length > 0) changeItems.push({
				role: "developer",
				content: change.systemPrompts.map((p) => sanitizeUnicode(p.content)).join("\n")
			});
			if (changeItems.length > 0) items.set(before, changeItems);
		}
		return {
			...toolChannel && { tools: split.startTools },
			...channels.systemPrompts && { systemPrompts: split.startSystemPrompts },
			items
		};
	}
	/**
	* The OpenAI Responses API supports `tools` and `text.format: json_schema`
	* together in a single streaming request (per issue #605). Subclasses
	* that route to providers without this capability should override.
	*/
	supportsCombinedToolsAndSchema() {
		return true;
	}
	/**
	* Converts ModelMessage[] to Responses API ResponseInput format.
	* Override this in subclasses for provider-specific message format quirks.
	*
	* Key differences from Chat Completions:
	* - Tool results use `function_call_output` type (not `tool` role)
	* - Assistant tool calls are `function_call` objects (not nested in `tool_calls`)
	* - User content uses `input_text`, `input_image`, `input_file` types
	* - System prompts go in `instructions`, not as messages
	*/
	convertMessagesToInput(messages, insertBefore, targetModel = this.model) {
		const target = {
			provider: this.provider ?? this.name,
			api: this.api,
			model: targetModel
		};
		const itemIds = /* @__PURE__ */ new Map();
		const usedCallIds = /* @__PURE__ */ new Set();
		const usedItemIds = /* @__PURE__ */ new Set();
		const normalizedCompositeIds = /* @__PURE__ */ new Set();
		for (const message of messages) {
			const source = message.metadata?.tanstack?.source;
			const sameSource = !source || source.provider === target.provider && source.api === target.api && source.model === target.model;
			for (const call of message.toolCalls ?? []) {
				if (sameSource) usedCallIds.add(call.id);
				const metadata = call.metadata;
				const itemId = metadata !== null && typeof metadata === "object" && "itemId" in metadata && typeof metadata.itemId === "string" ? metadata.itemId : void 0;
				if (itemId) itemIds.set(call.id, itemId);
				if (sameSource && itemId) usedItemIds.add(itemId);
			}
		}
		const normalizePart = (part) => part.replace(/[^a-zA-Z0-9_-]/g, "_").slice(0, 64).replace(/_+$/, "");
		const replay = transformMessagesForReplay(messages, target, (id, { source, attempt }) => {
			const [call = "", compositeItem] = id.split("|");
			const item = compositeItem ?? itemIds.get(id);
			let retry = attempt;
			let callId = normalizePart(retry ? `${call.slice(0, 48)}_${hashToolCallId(`${id}:${retry}`)}` : call);
			while (!callId || usedCallIds.has(callId)) {
				retry++;
				callId = normalizePart(`${call.slice(0, 48)}_${hashToolCallId(`${id}:${retry}`)}`);
			}
			usedCallIds.add(callId);
			if (item === void 0) return callId;
			let itemId = source && (source.provider !== target.provider || source.api !== target.api) ? `fc_${hashToolCallId(item)}` : normalizePart(item);
			if (!itemId.startsWith("fc_")) itemId = normalizePart(`fc_${itemId}`);
			let itemRetry = attempt;
			while (usedItemIds.has(itemId)) {
				itemRetry++;
				itemId = `fc_${hashToolCallId(`${item}:${itemRetry}`)}`;
			}
			usedItemIds.add(itemId);
			const composite = `${callId}|${itemId}`;
			normalizedCompositeIds.add(composite);
			return composite;
		});
		const callIdFor = (id) => normalizedCompositeIds.has(id) ? id.split("|")[0] ?? id : id;
		const mappedInsertions = /* @__PURE__ */ new Map();
		for (const [index, items] of insertBefore ?? []) {
			const mapped = replay.boundaryMap[index] ?? replay.messages.length;
			mappedInsertions.set(mapped, [...mappedInsertions.get(mapped) ?? [], ...items]);
		}
		messages = replay.messages;
		insertBefore = mappedInsertions;
		const result = [];
		const seenReasoningIds = /* @__PURE__ */ new Set();
		const userToolCalls = /* @__PURE__ */ new Map();
		for (const [index, message] of messages.entries()) {
			result.push(...insertBefore?.get(index) ?? []);
			if (message.role === "tool") {
				const owner = message.toolCallId ? userToolCalls.get(message.toolCallId) : void 0;
				const userOutput = owner ? userToolResultItem(owner, message.content) : null;
				if (userOutput) {
					if (userOutput.type === "shell_call_output") result.push({
						...userOutput,
						output: userOutput.output.map((entry) => ({
							...entry,
							stdout: sanitizeUnicode(entry.stdout),
							stderr: sanitizeUnicode(entry.stderr)
						}))
					});
					else if (userOutput.type === "local_shell_call_output") result.push({
						...userOutput,
						output: sanitizeUnicode(userOutput.output)
					});
					else if (userOutput.type === "apply_patch_call_output") result.push({
						...userOutput,
						...typeof userOutput.output === "string" ? { output: sanitizeUnicode(userOutput.output) } : {}
					});
					else result.push(userOutput);
					continue;
				}
				const toolContent = message.content;
				const parts = Array.isArray(toolContent) ? toolContent.filter((part) => part.type !== "image" || (this.inputModalities?.includes("image") ?? true)) : void 0;
				const output = parts ? parts.length > 0 ? parts.map((part) => this.convertContentPartToInput(part)) : Array.isArray(toolContent) && toolContent.some((part) => part.type === "image") ? "(see attached image)" : "(no tool output)" : typeof toolContent === "string" ? sanitizeUnicode(toolContent) || "(no tool output)" : "(no tool output)";
				result.push({
					type: "function_call_output",
					call_id: message.toolCallId ? callIdFor(message.toolCallId) : "",
					output
				});
				continue;
			}
			if (message.role === "assistant") {
				const firstItem = result.length;
				const source = message.metadata?.tanstack?.source;
				const foreign = source && (source.provider !== target.provider || source.api !== target.api || source.model !== target.model);
				let reasoningCandidates = 0;
				let emittedReasoning = 0;
				if (message.thinking) for (const thinking of message.thinking) {
					if (!thinking.signature) continue;
					const compaction = readCompactionSignature(thinking.signature);
					if (compaction) {
						result.push(compaction);
						continue;
					}
					const packed = unpackResponsesReasoningSignature(thinking.signature);
					if (!packed?.id) continue;
					reasoningCandidates++;
					if (seenReasoningIds.has(packed.id)) continue;
					seenReasoningIds.add(packed.id);
					emittedReasoning++;
					result.push({
						type: "reasoning",
						id: packed.id,
						...packed.encrypted_content ? { encrypted_content: packed.encrypted_content } : {},
						summary: thinking.content ? [{
							type: "summary_text",
							text: sanitizeUnicode(thinking.content)
						}] : []
					});
				}
				const canPairReasoning = reasoningCandidates === 0 || reasoningCandidates === 1 && emittedReasoning === 1;
				let rawAssistantMessage;
				if (message.toolCalls && message.toolCalls.length > 0) for (const toolCall of message.toolCalls) {
					const metadata = toolCall.metadata;
					if (metadata?.providerExecuted) {
						const webSearchCall = metadata.openai?.webSearchCall;
						if (webSearchCall && canPairReasoning && !foreign) {
							result.push(webSearchCall);
							rawAssistantMessage ??= metadata.openai?.assistantMessage;
						}
						continue;
					}
					const argumentsString = typeof toolCall.function.arguments === "string" ? toolCall.function.arguments : JSON.stringify(toolCall.function.arguments);
					const replayItemId = normalizedCompositeIds.has(toolCall.id) ? toolCall.id.split("|")[1] : void 0;
					const replayMetadata = replayItemId ? {
						...metadata,
						itemId: replayItemId
					} : toolCall.metadata;
					const replayCall = {
						id: callIdFor(toolCall.id),
						function: {
							name: sanitizeUnicode(toolCall.function.name),
							arguments: sanitizeJsonArguments(argumentsString)
						},
						...replayMetadata !== void 0 ? { metadata: replayMetadata } : {}
					};
					const userItem = userToolRequestItem(replayCall);
					if (userItem) {
						userToolCalls.set(toolCall.id, replayCall);
						result.push(userItem);
						continue;
					}
					const callId = callIdFor(toolCall.id);
					const itemId = replayItemId ?? metadata?.itemId;
					result.push({
						type: "function_call",
						call_id: callId ?? "",
						...itemId && canPairReasoning && { id: itemId },
						name: sanitizeUnicode(toolCall.function.name),
						arguments: sanitizeJsonArguments(argumentsString),
						...metadata?.namespace && { namespace: metadata.namespace }
					});
				}
				if (rawAssistantMessage) result.push(rawAssistantMessage);
				else if (message.content) {
					const contentStr = this.extractTextContent(message.content);
					if (contentStr) result.push(...answerItems(message, contentStr, Boolean(foreign)));
				}
				if (foreign) {
					const emitted = result.splice(firstItem);
					const text = this.extractTextContent(message.content);
					const blocks = orderedAssistantBlocks(message) ?? [...text ? [{
						type: "text",
						text
					}] : [], ...(message.toolCalls ?? []).map((toolCall) => ({
						type: "tool-call",
						toolCall
					}))];
					for (const block of blocks) if (block.type === "text") result.push({
						type: "message",
						role: "assistant",
						content: sanitizeUnicode(block.text)
					});
					else if (block.type === "tool-call") {
						const callId = callIdFor(block.toolCall.id);
						const item = emitted.find((item) => "call_id" in item && item.call_id === callId);
						if (item) result.push(item);
					}
				}
				continue;
			}
			const contentParts = this.normalizeContent(message.content);
			const inputContent = [];
			for (const part of contentParts) inputContent.push(this.convertContentPartToInput(part));
			if (inputContent.length === 0) throw new Error(`User message for ${this.name} has no content parts. Empty user messages would produce a paid request with no input; provide at least one text/image/audio/document part or omit the message.`);
			result.push({
				type: "message",
				role: "user",
				content: inputContent
			});
		}
		result.push(...insertBefore?.get(messages.length) ?? []);
		return result;
	}
	/**
	* Converts a ContentPart to Responses API input content item.
	* Handles text, image, audio, and document (PDF) content parts.
	* Override this in subclasses for additional content types or provider-specific metadata.
	*/
	convertContentPartToInput(part) {
		switch (part.type) {
			case "text": return {
				type: "input_text",
				text: sanitizeUnicode(part.content)
			};
			case "image": {
				const imageMetadata = part.metadata;
				if (isFileSource(part.source)) {
					if (this.supportsFileSources !== true) throw unsupportedFileSourceError(this.name);
					return {
						type: "input_image",
						file_id: fileReferenceFor(part.source, this.name),
						detail: imageMetadata?.detail || "auto"
					};
				}
				if (part.source.type === "url") return {
					type: "input_image",
					image_url: part.source.value,
					detail: imageMetadata?.detail || "auto"
				};
				const imageValue = part.source.value;
				const imageMime = part.source.mimeType || "application/octet-stream";
				return {
					type: "input_image",
					image_url: imageValue.startsWith("data:") ? imageValue : `data:${imageMime};base64,${imageValue}`,
					detail: imageMetadata?.detail || "auto"
				};
			}
			case "audio": {
				if (isFileSource(part.source)) {
					if (this.supportsFileSources !== true) throw unsupportedFileSourceError(this.name);
					return {
						type: "input_file",
						file_id: fileReferenceFor(part.source, this.name)
					};
				}
				if (part.source.type === "url") return {
					type: "input_file",
					file_url: part.source.value
				};
				const audioValue = part.source.value;
				const audioMime = part.source.mimeType || "application/octet-stream";
				return {
					type: "input_file",
					file_data: audioValue.startsWith("data:") ? audioValue : `data:${audioMime};base64,${audioValue}`
				};
			}
			case "document": {
				const documentMetadata = part.metadata;
				const documentDetail = documentMetadata?.detail !== void 0 ? { detail: documentMetadata.detail } : {};
				if (isFileSource(part.source)) {
					if (this.supportsFileSources !== true) throw unsupportedFileSourceError(this.name);
					return {
						type: "input_file",
						file_id: fileReferenceFor(part.source, this.name),
						...documentDetail
					};
				}
				if (part.source.type === "url") return {
					type: "input_file",
					file_url: part.source.value,
					...documentDetail
				};
				const documentValue = part.source.value;
				const documentMime = ((part.source.mimeType || "application/pdf").split(";")[0] ?? "").trim().toLowerCase();
				if (documentMime !== "application/pdf") throw new Error(`${this.name} document parts only support application/pdf (received ${documentMime})`);
				if (documentValue.startsWith("data:") && !/^data:application\/pdf[;,]/i.test(documentValue)) throw new Error(`${this.name} document parts only support application/pdf (received data URL with non-PDF media type)`);
				const documentBase64 = documentValue.startsWith("data:") ? /;base64,/i.test(documentValue) ? documentValue.slice(documentValue.indexOf(",") + 1) : "" : documentValue;
				if (documentBase64 && !documentBase64.startsWith(PDF_BASE64_MAGIC)) throw new Error(`${this.name} document parts only support application/pdf (inline data does not start with the %PDF header)`);
				const documentFileData = documentValue.startsWith("data:") ? documentValue : `data:${documentMime};base64,${documentValue}`;
				return {
					type: "input_file",
					filename: documentMetadata?.filename || "document.pdf",
					file_data: documentFileData,
					...documentDetail
				};
			}
			default: throw new Error(`Unsupported content part type: ${part.type}`);
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
//#endregion
export { OpenAIBaseResponsesTextAdapter };

//# sourceMappingURL=responses-text.js.map