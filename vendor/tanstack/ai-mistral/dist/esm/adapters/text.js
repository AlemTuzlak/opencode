import { makeMistralStructuredOutputCompatibleWithMap } from "../utils/schema-converter.js";
import { convertToolsToProviderFormat } from "../tools/tool-converter.js";
import { createMistralClient, generateId, getMistralApiKeyFromEnv } from "../utils/client.js";
import { createToolInputNormalizer } from "../utils/tool-input-normalizer.js";
import { MISTRAL_MODEL_INPUT_MODALITIES } from "../model-meta.js";
import { MISTRAL_MODEL_REASONING } from "../model-reasoning.js";
import { isFileSource, unsupportedFileSourceError } from "@tanstack/ai";
import { BaseTextAdapter } from "@tanstack/ai/adapters";
import { undoNullWidening } from "@tanstack/ai-utils";
import { hashToolCallId, orderedAssistantBlocks, resolveReasoning, sanitizeJsonArguments, sanitizeUnicode, transformMessagesForReplay } from "@tanstack/ai/adapter-internals";
//#region src/adapters/text.ts
/** Cast an event object to StreamChunk. Adapters construct events with string
*  literal types which are structurally compatible with the EventType enum. */
var asChunk = (chunk) => chunk;
/**
* Parse the accumulated streaming arguments for a tool call. Throws a clear
* error if the JSON is malformed — silently substituting `{}` would let a
* tool fire with empty inputs, masking truncated streams or mis-shaped output.
*/
function parseToolCallInput(toolCall, normalizeToolInput) {
	if (!toolCall.arguments) return void 0;
	try {
		return normalizeToolInput(toolCall.name, JSON.parse(toolCall.arguments));
	} catch (cause) {
		const preview = toolCall.arguments.slice(0, 200);
		const ellipsis = toolCall.arguments.length > 200 ? "..." : "";
		throw new Error(`Failed to parse tool call arguments for tool '${toolCall.name}' (id: ${toolCall.id}). Arguments: ${preview}${ellipsis}`, { cause });
	}
}
/**
* The Mistral reasoning fields for `chat({ reasoning })`, by pi's rule:
* - a model with effort levels (Mistral Small, Mistral Medium):
*   `reasoningEffort` with the level's value, `none` for `off`.
* - another reasoning model (Magistral): `promptMode: 'reasoning'`, and
*   nothing for `off`.
*/
function mistralReasoning(request, reasoning) {
	const resolved = resolveReasoning(request, reasoning);
	if (!resolved || !reasoning) return {};
	if (reasoning.map) return resolved.value === null ? {} : { reasoningEffort: resolved.value };
	return resolved.level === "off" ? {} : { promptMode: "reasoning" };
}
/** Maps `chat({ toolChoice })` to the Mistral `toolChoice`. */
function toMistralToolChoice(choice) {
	if (typeof choice === "string") return choice;
	return {
		type: "function",
		function: { name: choice.name }
	};
}
/**
* The Mistral wire field for `chat({ promptCache })`, by pi's rule. Mistral
* caches without a flag, so only the key goes out. There is no key for
* `'none'`. The SDK request type has no cache key field, so only the raw
* stream path sends it.
*/
function mistralPromptCacheKey(promptCache) {
	if (!promptCache?.key || promptCache.retention === "none") return {};
	return { prompt_cache_key: promptCache.key };
}
/**
* `promptTokensDetails.cachedTokens` when Mistral read prompt tokens from the
* cache. Mistral sends the count in `prompt_tokens_details.cached_tokens` or
* in `num_cached_tokens`. The SDK keeps these raw keys on `usage` with no
* types, so the values are checked here.
*/
function mistralCachedTokens(usage) {
	const details = usage.prompt_tokens_details;
	const cachedTokens = typeof details === "object" && details !== null && "cached_tokens" in details ? details.cached_tokens : usage.num_cached_tokens;
	return typeof cachedTokens === "number" && cachedTokens > 0 ? { promptTokensDetails: { cachedTokens } } : {};
}
/**
* Mistral Text (Chat) Adapter.
*
* Tree-shakeable adapter for Mistral chat/text completion functionality.
*/
var MistralTextAdapter = class extends BaseTextAdapter {
	name = "mistral";
	api = "mistral-conversations";
	provider;
	inputModalities = MISTRAL_MODEL_INPUT_MODALITIES[this.model];
	client;
	rawConfig;
	constructor(config, model) {
		super(config, model);
		this.client = createMistralClient(config);
		this.rawConfig = config;
		this.provider = config.getAccessToken && config.resolveRequestUrl ? "google-vertex" : this.name;
	}
	async *chatStream(options) {
		const timestamp = Date.now();
		const aguiState = {
			runId: options.runId ?? generateId(this.name),
			threadId: options.threadId ?? generateId(this.name),
			messageId: generateId(this.name),
			timestamp,
			hasEmittedRunStarted: false
		};
		try {
			const requestParams = this.mapTextOptionsToMistral(options);
			const body = {
				...this.toWireBody(requestParams),
				...mistralPromptCacheKey(options.promptCache)
			};
			const stream = this.fetchRawMistralStream(body, this.rawConfig, options.wrapFetch);
			for await (const chunk of this.processMistralStreamChunks(stream, options, aguiState)) yield chunk.type === "RUN_STARTED" || chunk.type === "RUN_ERROR" ? {
				...chunk,
				metadata: { tanstack: { source: {
					provider: this.provider,
					api: this.api,
					model: options.model
				} } }
			} : chunk;
		} catch (error) {
			const err = error;
			if (!aguiState.hasEmittedRunStarted) {
				aguiState.hasEmittedRunStarted = true;
				yield asChunk({
					type: "RUN_STARTED",
					runId: aguiState.runId,
					threadId: aguiState.threadId,
					metadata: { tanstack: { source: {
						provider: this.provider,
						api: this.api,
						model: options.model
					} } },
					model: options.model,
					timestamp
				});
			}
			yield asChunk({
				type: "RUN_ERROR",
				metadata: { tanstack: { source: {
					provider: this.provider,
					api: this.api,
					model: options.model
				} } },
				runId: aguiState.runId,
				model: options.model,
				timestamp,
				message: err.message || "Unknown error",
				code: err.code,
				error: {
					message: err.message || "Unknown error",
					code: err.code
				}
			});
			throw err;
		}
	}
	/**
	* Generate structured output using Mistral's JSON Schema response format.
	*/
	async structuredOutput(options) {
		const { chatOptions, outputSchema } = options;
		const { stream: _stream, ...nonStreamParams } = this.mapTextOptionsToMistral(chatOptions);
		const { schema: jsonSchema, nullWideningMap, strict } = makeMistralStructuredOutputCompatibleWithMap(outputSchema, outputSchema.required || []);
		const response = await (chatOptions.wrapFetch ? createMistralClient(this.rawConfig, chatOptions.wrapFetch(fetch)) : this.client).chat.complete({
			...nonStreamParams,
			responseFormat: {
				type: "json_schema",
				jsonSchema: {
					name: "structured_output",
					schemaDefinition: jsonSchema,
					strict
				}
			}
		});
		if (response.choices[0]?.finishReason === "length") throw new Error("mistral.structuredOutput: the response was cut off because the maximum token limit was reached (finish_reason=length); raise modelOptions.max_tokens");
		const rawText = response.choices[0]?.message?.content;
		const textContent = typeof rawText === "string" ? rawText : "";
		let parsed;
		try {
			parsed = JSON.parse(textContent);
		} catch {
			throw new Error(`Failed to parse structured output as JSON. Content: ${textContent.slice(0, 200)}${textContent.length > 200 ? "..." : ""}`);
		}
		const usage = response.usage;
		return {
			data: undoNullWidening(parsed, nullWideningMap),
			...response.id && { responseId: response.id },
			...response.model && { model: response.model },
			rawText: textContent,
			...usage && { usage: {
				promptTokens: usage.promptTokens ?? 0,
				completionTokens: usage.completionTokens ?? 0,
				totalTokens: usage.totalTokens ?? 0,
				...mistralCachedTokens(usage)
			} }
		};
	}
	/**
	* Processes streaming chunks from the Mistral API and yields AG-UI stream events.
	*/
	async *processMistralStreamChunks(stream, options, aguiState) {
		let accumulatedContent = "";
		const timestamp = aguiState.timestamp;
		let hasEmittedTextMessageStart = false;
		let hasEmittedTextMessageEnd = false;
		let hasEmittedToolCall = false;
		let hasEmittedRunFinished = false;
		let lastChunkModel = options.model;
		let responseId;
		const normalizeToolInput = createToolInputNormalizer(options.tools);
		let reasoningMessageId = null;
		let hasClosedReasoning = false;
		const toolCallsInProgress = /* @__PURE__ */ new Map();
		try {
			for await (const chunk of stream) {
				lastChunkModel = chunk.model || lastChunkModel;
				if (chunk.id) responseId = chunk.id;
				const choice = chunk.choices?.[0];
				if (!choice) continue;
				const chunkModel = chunk.model || options.model;
				if (!aguiState.hasEmittedRunStarted) {
					aguiState.hasEmittedRunStarted = true;
					yield asChunk({
						type: "RUN_STARTED",
						runId: aguiState.runId,
						threadId: aguiState.threadId,
						model: chunkModel,
						timestamp
					});
				}
				const delta = choice.delta;
				const { text: deltaContent, thinking: deltaThinkingFromContent } = this.extractDeltaParts(delta?.content);
				const deltaThinking = deltaThinkingFromContent + (typeof delta?.reasoning_content === "string" ? delta.reasoning_content : "");
				const deltaToolCalls = delta?.tool_calls;
				if (deltaThinking) {
					if (reasoningMessageId === null) {
						reasoningMessageId = generateId(this.name);
						yield asChunk({
							type: "REASONING_START",
							messageId: reasoningMessageId,
							model: chunkModel,
							timestamp
						});
						yield asChunk({
							type: "REASONING_MESSAGE_START",
							messageId: reasoningMessageId,
							role: "reasoning",
							model: chunkModel,
							timestamp
						});
					}
					yield asChunk({
						type: "REASONING_MESSAGE_CONTENT",
						messageId: reasoningMessageId,
						model: chunkModel,
						timestamp,
						delta: deltaThinking
					});
				}
				const aboutToEmitOutput = !!deltaContent || !!deltaToolCalls && deltaToolCalls.length > 0;
				if (reasoningMessageId !== null && !hasClosedReasoning && aboutToEmitOutput) {
					hasClosedReasoning = true;
					yield asChunk({
						type: "REASONING_MESSAGE_END",
						messageId: reasoningMessageId,
						model: chunkModel,
						timestamp
					});
					yield asChunk({
						type: "REASONING_END",
						messageId: reasoningMessageId,
						model: chunkModel,
						timestamp
					});
				}
				if (deltaContent) {
					if (!hasEmittedTextMessageStart) {
						hasEmittedTextMessageStart = true;
						yield asChunk({
							type: "TEXT_MESSAGE_START",
							messageId: aguiState.messageId,
							model: chunkModel,
							timestamp,
							role: "assistant"
						});
					}
					accumulatedContent += deltaContent;
					yield asChunk({
						type: "TEXT_MESSAGE_CONTENT",
						messageId: aguiState.messageId,
						model: chunkModel,
						timestamp,
						delta: deltaContent,
						content: accumulatedContent
					});
				}
				if (deltaToolCalls) for (const [i, toolCallDelta] of deltaToolCalls.entries()) {
					const index = toolCallDelta.index ?? i;
					let toolCall = toolCallsInProgress.get(index);
					if (!toolCall) {
						toolCall = {
							id: toolCallDelta.id || "",
							name: toolCallDelta.function?.name || "",
							arguments: "",
							hasArguments: false,
							started: false,
							ended: false
						};
						toolCallsInProgress.set(index, toolCall);
					}
					if (toolCallDelta.id) toolCall.id = toolCallDelta.id;
					if (toolCallDelta.function?.name) toolCall.name = toolCallDelta.function.name;
					const rawArgs = toolCallDelta.function?.arguments;
					const argsDelta = rawArgs === void 0 ? void 0 : typeof rawArgs === "string" ? rawArgs : JSON.stringify(rawArgs);
					if (argsDelta !== void 0) {
						toolCall.hasArguments = true;
						toolCall.arguments += argsDelta;
					}
					if (!!toolCall.id && !!toolCall.name && !toolCall.started) {
						toolCall.started = true;
						yield asChunk({
							type: "TOOL_CALL_START",
							toolCallId: toolCall.id,
							toolCallName: toolCall.name,
							toolName: toolCall.name,
							model: chunkModel,
							timestamp,
							index
						});
						if (toolCall.arguments.length > 0) yield asChunk({
							type: "TOOL_CALL_ARGS",
							toolCallId: toolCall.id,
							model: chunkModel,
							timestamp,
							delta: toolCall.arguments
						});
					} else if (argsDelta !== void 0 && toolCall.started) yield asChunk({
						type: "TOOL_CALL_ARGS",
						toolCallId: toolCall.id,
						model: chunkModel,
						timestamp,
						delta: argsDelta
					});
				}
				const finishReason = choice.finish_reason;
				if (finishReason) {
					if (finishReason === "tool_calls" || toolCallsInProgress.size > 0) for (const [, toolCall] of toolCallsInProgress) {
						if (!toolCall.started || !toolCall.id || !toolCall.name || toolCall.ended) continue;
						const parsedInput = parseToolCallInput(toolCall, normalizeToolInput);
						toolCall.ended = true;
						hasEmittedToolCall = true;
						yield asChunk({
							type: "TOOL_CALL_END",
							toolCallId: toolCall.id,
							toolCallName: toolCall.name,
							toolName: toolCall.name,
							model: chunkModel,
							timestamp,
							...toolCall.hasArguments ? { args: toolCall.arguments } : {},
							...toolCall.hasArguments && parsedInput !== void 0 ? { input: parsedInput } : {}
						});
					}
					const computedFinishReason = finishReason === "tool_calls" || hasEmittedToolCall ? "tool_calls" : finishReason === "length" ? "length" : "stop";
					if (reasoningMessageId !== null && !hasClosedReasoning) {
						hasClosedReasoning = true;
						yield asChunk({
							type: "REASONING_MESSAGE_END",
							messageId: reasoningMessageId,
							model: chunkModel,
							timestamp
						});
						yield asChunk({
							type: "REASONING_END",
							messageId: reasoningMessageId,
							model: chunkModel,
							timestamp
						});
					}
					if (hasEmittedTextMessageStart && !hasEmittedTextMessageEnd) {
						hasEmittedTextMessageEnd = true;
						yield asChunk({
							type: "TEXT_MESSAGE_END",
							messageId: aguiState.messageId,
							model: chunkModel,
							timestamp
						});
					}
					const usage = chunk.usage;
					hasEmittedRunFinished = true;
					yield asChunk({
						type: "RUN_FINISHED",
						...responseId && { responseId },
						runId: aguiState.runId,
						threadId: aguiState.threadId,
						model: chunkModel,
						timestamp,
						usage: usage ? {
							promptTokens: usage.prompt_tokens || 0,
							completionTokens: usage.completion_tokens || 0,
							totalTokens: usage.total_tokens || 0,
							...mistralCachedTokens(usage)
						} : void 0,
						finishReason: computedFinishReason
					});
				}
			}
			if (!hasEmittedRunFinished) {
				if (reasoningMessageId !== null && !hasClosedReasoning) {
					hasClosedReasoning = true;
					yield asChunk({
						type: "REASONING_MESSAGE_END",
						messageId: reasoningMessageId,
						model: lastChunkModel,
						timestamp
					});
					yield asChunk({
						type: "REASONING_END",
						messageId: reasoningMessageId,
						model: lastChunkModel,
						timestamp
					});
				}
				for (const [, toolCall] of toolCallsInProgress) if (toolCall.started && !toolCall.ended) {
					const parsedInput = parseToolCallInput(toolCall, normalizeToolInput);
					toolCall.ended = true;
					hasEmittedToolCall = true;
					yield asChunk({
						type: "TOOL_CALL_END",
						toolCallId: toolCall.id,
						toolCallName: toolCall.name,
						toolName: toolCall.name,
						model: lastChunkModel,
						timestamp,
						...toolCall.hasArguments ? { args: toolCall.arguments } : {},
						...toolCall.hasArguments && parsedInput !== void 0 ? { input: parsedInput } : {}
					});
				}
				if (hasEmittedTextMessageStart && !hasEmittedTextMessageEnd) {
					hasEmittedTextMessageEnd = true;
					yield asChunk({
						type: "TEXT_MESSAGE_END",
						messageId: aguiState.messageId,
						model: lastChunkModel,
						timestamp
					});
				}
				hasEmittedRunFinished = true;
				yield asChunk({
					type: "RUN_FINISHED",
					...responseId && { responseId },
					runId: aguiState.runId,
					threadId: aguiState.threadId,
					model: lastChunkModel,
					timestamp,
					usage: void 0,
					finishReason: hasEmittedToolCall ? "tool_calls" : "stop"
				});
			}
		} catch (error) {
			if (reasoningMessageId !== null && !hasClosedReasoning) {
				hasClosedReasoning = true;
				yield asChunk({
					type: "REASONING_MESSAGE_END",
					messageId: reasoningMessageId,
					model: lastChunkModel,
					timestamp
				});
				yield asChunk({
					type: "REASONING_END",
					messageId: reasoningMessageId,
					model: lastChunkModel,
					timestamp
				});
			}
			if (hasEmittedTextMessageStart && !hasEmittedTextMessageEnd) {
				hasEmittedTextMessageEnd = true;
				yield asChunk({
					type: "TEXT_MESSAGE_END",
					messageId: aguiState.messageId,
					model: lastChunkModel,
					timestamp
				});
			}
			for (const [, toolCall] of toolCallsInProgress) if (toolCall.started && !toolCall.ended) {
				toolCall.ended = true;
				let partialInput;
				try {
					if (toolCall.hasArguments) partialInput = normalizeToolInput(toolCall.name, JSON.parse(toolCall.arguments));
				} catch {}
				yield asChunk({
					type: "TOOL_CALL_END",
					toolCallId: toolCall.id,
					toolCallName: toolCall.name,
					toolName: toolCall.name,
					model: lastChunkModel,
					timestamp,
					...toolCall.hasArguments ? { args: toolCall.arguments } : {},
					...partialInput === void 0 ? {} : { input: partialInput }
				});
			}
			throw error;
		}
	}
	/**
	* Makes a raw fetch request to the Mistral chat completions endpoint and
	* parses the SSE stream manually, bypassing the SDK's Zod validation which
	* rejects streaming tool call chunks that omit `name` in argument deltas.
	*/
	async *fetchRawMistralStream(body, config, wrapFetch) {
		const serverURL = (config.baseURL ?? config.serverURL ?? "https://api.mistral.ai").replace(/\/+$/, "").replace(/\/v1$/, "");
		const url = config.resolveRequestUrl?.(true) ?? `${serverURL}/v1/chat/completions`;
		const headers = {
			"Content-Type": "application/json",
			Authorization: `Bearer ${config.getAccessToken === void 0 ? config.apiKey : await config.getAccessToken()}`,
			...config.defaultHeaders
		};
		const response = await (wrapFetch ? wrapFetch(fetch) : fetch)(url, {
			method: "POST",
			headers,
			body: JSON.stringify(body)
		});
		if (!response.ok) {
			const errorText = await response.text();
			throw new Error(`Mistral API error ${response.status}: ${errorText}`);
		}
		if (!response.body) throw new Error("Mistral API returned a response with no body. This may indicate a proxy or runtime that does not support streaming.");
		const reader = response.body.getReader();
		const decoder = new TextDecoder();
		let buffer = "";
		try {
			for (;;) {
				const { done, value } = await reader.read();
				if (done) break;
				buffer += decoder.decode(value, { stream: true });
				const lines = buffer.split("\n");
				buffer = lines.pop() ?? "";
				for (const line of lines) {
					const trimmed = line.trim();
					if (!trimmed.startsWith("data:")) continue;
					const data = trimmed.slice(5).trimStart();
					if (data === "[DONE]") return;
					let parsed;
					try {
						parsed = JSON.parse(data);
					} catch (e) {
						if (e instanceof SyntaxError) {
							console.warn(`[mistral] skipped unparseable SSE chunk: ${data.slice(0, 200)}`);
							continue;
						}
						throw e;
					}
					if (parsed && typeof parsed === "object" && "error" in parsed && !("choices" in parsed)) {
						const errPayload = parsed.error;
						const message = typeof errPayload === "string" ? errPayload : errPayload && typeof errPayload === "object" && "message" in errPayload ? String(errPayload.message) : JSON.stringify(errPayload);
						throw new Error(`Mistral stream error: ${message}`);
					}
					yield parsed;
				}
			}
		} finally {
			await reader.cancel().catch(() => {});
			reader.releaseLock();
		}
	}
	/**
	* Converts the SDK's camelCase `ChatCompletionStreamRequest` into the
	* snake_case wire body, including converting messages.
	*/
	toWireBody(params) {
		const { messages, maxTokens, topP, randomSeed, responseFormat, toolChoice, parallelToolCalls, frequencyPenalty, presencePenalty, safePrompt, reasoningEffort, promptMode, stream: _stream, ...rest } = params;
		return {
			...rest,
			messages: messages.map(messageToWire),
			stream: true,
			stream_options: { include_usage: true },
			...maxTokens != null && { max_tokens: maxTokens },
			...topP != null && { top_p: topP },
			...randomSeed != null && { random_seed: randomSeed },
			...responseFormat != null && { response_format: responseFormat },
			...toolChoice != null && { tool_choice: toolChoice },
			...parallelToolCalls != null && { parallel_tool_calls: parallelToolCalls },
			...frequencyPenalty != null && { frequency_penalty: frequencyPenalty },
			...presencePenalty != null && { presence_penalty: presencePenalty },
			...safePrompt != null && { safe_prompt: safePrompt },
			...reasoningEffort != null && { reasoning_effort: reasoningEffort },
			...promptMode != null && { prompt_mode: promptMode }
		};
	}
	/**
	* Splits a Mistral delta content payload into text and reasoning deltas.
	* Mistral reasoning models (magistral-*) stream reasoning content as
	* `{ type: 'thinking', thinking: [{ type: 'text', text }, ...] }` content
	* parts. A single delta may contain text only, thinking only, or — rarely —
	* both (when a step transitions); both fields are returned so the caller
	* can sequence REASONING and TEXT lifecycle events in order.
	*/
	extractDeltaParts(content) {
		if (!content) return {
			text: "",
			thinking: ""
		};
		if (typeof content === "string") return {
			text: content,
			thinking: ""
		};
		let text = "";
		let thinking = "";
		for (const part of content) if (part.type === "text" && typeof part.text === "string") text += part.text;
		else if (part.type === "thinking" && Array.isArray(part.thinking)) {
			for (const inner of part.thinking) if (inner.type === "text" && typeof inner.text === "string") thinking += inner.text;
		}
		return {
			text,
			thinking
		};
	}
	/**
	* Maps common TextOptions to Mistral Chat Completions request parameters.
	*/
	mapTextOptionsToMistral(options) {
		const modelOptions = options.modelOptions;
		const tools = options.tools ? convertToolsToProviderFormat(options.tools) : void 0;
		const replay = transformMessagesForReplay(options.messages, {
			provider: this.provider,
			api: this.api,
			model: options.model
		}, (id, { attempt }) => {
			const normalized = id.replace(/[^a-zA-Z0-9]/g, "");
			if (attempt === 0 && normalized.length === 9) return normalized;
			const seed = normalized || id;
			return hashToolCallId(attempt === 0 ? seed : `${seed}:${attempt}`).replace(/[^a-zA-Z0-9]/g, "").slice(0, 9);
		});
		const messages = [];
		if (options.systemPrompts && options.systemPrompts.length > 0) messages.push({
			role: "system",
			content: sanitizeUnicode(options.systemPrompts.join("\n"))
		});
		for (const message of replay.messages) messages.push(this.convertMessageToMistral(message));
		return {
			...tools?.length && options.toolChoice !== void 0 ? { toolChoice: toMistralToolChoice(options.toolChoice) } : void 0,
			model: this.rawConfig.requestModel ?? options.model,
			messages,
			temperature: modelOptions?.temperature ?? void 0,
			maxTokens: modelOptions?.max_tokens ?? void 0,
			topP: modelOptions?.top_p ?? void 0,
			tools,
			stream: true,
			...mistralReasoning(options.reasoning, this.rawConfig.reasoning ?? MISTRAL_MODEL_REASONING[options.model]),
			...modelOptions && {
				...modelOptions.stop != null && { stop: modelOptions.stop },
				...modelOptions.random_seed != null && { randomSeed: modelOptions.random_seed },
				...modelOptions.response_format != null && { responseFormat: modelOptions.response_format },
				...modelOptions.tool_choice != null && { toolChoice: modelOptions.tool_choice },
				...modelOptions.parallel_tool_calls != null && { parallelToolCalls: modelOptions.parallel_tool_calls },
				...modelOptions.frequency_penalty != null && { frequencyPenalty: modelOptions.frequency_penalty },
				...modelOptions.presence_penalty != null && { presencePenalty: modelOptions.presence_penalty },
				...modelOptions.n != null && { n: modelOptions.n },
				...modelOptions.prediction != null && { prediction: modelOptions.prediction },
				...modelOptions.safe_prompt != null && { safePrompt: modelOptions.safe_prompt }
			}
		};
	}
	/**
	* Converts a TanStack AI ModelMessage to a Mistral ChatCompletionMessageParam.
	*/
	convertMessageToMistral(message) {
		if (message.role === "tool") {
			if (!message.toolCallId) throw new Error("Missing toolCallId for tool message");
			const stringText = typeof message.content === "string" ? sanitizeUnicode(message.content) : void 0;
			if (stringText?.trim() && message.error === void 0) return {
				role: "tool",
				toolCallId: message.toolCallId,
				content: stringText
			};
			const parts = this.normalizeContent(message.content);
			const text = parts.filter((part) => part.type === "text").map((part) => sanitizeUnicode(part.content)).join("\n").trim();
			const hasImages = parts.some((part) => part.type === "image");
			const supportsImages = this.inputModalities?.includes("image") ?? false;
			const prefix = message.error !== void 0 ? "[tool error] " : "";
			const content = [{
				type: "text",
				text: text ? prefix + text + (hasImages && !supportsImages ? "\n[tool image omitted: model does not support images]" : "") : hasImages ? prefix + (supportsImages ? "(see attached image)" : "(image omitted: model does not support images)") : prefix + "(no tool output)"
			}, ...supportsImages ? parts.filter((part) => part.type === "image").map((part) => this.convertContentPartToMistral(part)) : []];
			return {
				role: "tool",
				toolCallId: message.toolCallId,
				content
			};
		}
		if (message.role === "assistant") {
			const toolCalls = message.toolCalls?.map((tc) => ({
				id: tc.id,
				type: "function",
				function: {
					name: tc.function.name,
					arguments: typeof tc.function.arguments === "string" ? sanitizeJsonArguments(tc.function.arguments) : sanitizeJsonArguments(JSON.stringify(tc.function.arguments))
				}
			}));
			return {
				role: "assistant",
				content: this.assistantContent(message),
				...toolCalls && toolCalls.length > 0 ? { toolCalls } : {}
			};
		}
		const contentParts = this.normalizeContent(message.content);
		if (contentParts.length === 1 && contentParts[0]?.type === "text") return {
			role: "user",
			content: sanitizeUnicode(contentParts[0].content)
		};
		const parts = contentParts.map((part) => this.convertContentPartToMistral(part));
		return {
			role: "user",
			content: parts.length > 0 ? parts : ""
		};
	}
	/** Keep supported thinking and text blocks in their stored order. */
	assistantContent(message) {
		if (!message.thinking?.length) return this.extractTextContent(message.content);
		const blocks = orderedAssistantBlocks(message) ?? [...message.thinking.map((thinking) => ({
			type: "thinking",
			thinking
		})), {
			type: "text",
			text: this.extractTextContent(message.content)
		}];
		const content = [];
		for (const block of blocks) if (block.type === "text") content.push({
			type: "text",
			text: sanitizeUnicode(block.text)
		});
		else if (block.type === "thinking" && !block.thinking.redacted && block.thinking.content.trim()) content.push({
			type: "thinking",
			thinking: [{
				type: "text",
				text: sanitizeUnicode(block.thinking.content)
			}]
		});
		return content;
	}
	convertContentPartToMistral(part) {
		if (part.type === "text") return {
			type: "text",
			text: sanitizeUnicode(part.content)
		};
		if (part.type === "image") {
			if (isFileSource(part.source)) throw unsupportedFileSourceError("mistral");
			const imageMetadata = part.metadata;
			const imageValue = part.source.value;
			const imageUrl = part.source.type === "data" && !imageValue.startsWith("data:") ? `data:${part.source.mimeType};base64,${imageValue}` : imageValue;
			return {
				type: "image_url",
				imageUrl: imageMetadata?.detail ? {
					url: imageUrl,
					detail: imageMetadata.detail
				} : imageUrl
			};
		}
		if (part.type === "document") {
			if (isFileSource(part.source)) throw unsupportedFileSourceError("mistral");
			const documentValue = part.source.value;
			return {
				type: "document_url",
				documentUrl: part.source.type === "data" && !documentValue.startsWith("data:") ? `data:${part.source.mimeType};base64,${documentValue}` : documentValue
			};
		}
		throw new Error(`Mistral text adapter does not support content part of type '${part.type}'. Supported types: text, image, document. Use a vision-capable model (mistral-medium-latest or mistral-small-latest) for images and documents.`);
	}
	/**
	* Normalizes message content to an array of ContentPart.
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
* Snake-cases a Mistral SDK message into the wire format expected by the API.
*/
function messageToWire(msg) {
	if (msg.role === "tool") return {
		role: "tool",
		tool_call_id: msg.toolCallId,
		content: Array.isArray(msg.content) ? msg.content.map((part) => part.type === "image_url" ? {
			type: "image_url",
			image_url: part.imageUrl
		} : part) : msg.content,
		...msg.name !== void 0 ? { name: msg.name } : {}
	};
	if (msg.role === "assistant") {
		const base = {
			role: "assistant",
			content: msg.content ?? null
		};
		if (msg.toolCalls && msg.toolCalls.length > 0) base.tool_calls = msg.toolCalls.map((tc) => ({
			id: tc.id,
			type: tc.type ?? "function",
			function: tc.function
		}));
		if (msg.prefix !== void 0) base.prefix = msg.prefix;
		return base;
	}
	if (msg.role === "user" && Array.isArray(msg.content)) return {
		role: "user",
		content: msg.content.map((part) => {
			if (part.type === "image_url") return {
				type: "image_url",
				image_url: part.imageUrl
			};
			if (part.type === "document_url") return {
				type: "document_url",
				document_url: part.documentUrl
			};
			return part;
		})
	};
	return msg;
}
/**
* Creates a Mistral text adapter with explicit API key.
*
* @param model - The model name (e.g., 'mistral-large-latest')
* @param apiKey - Your Mistral API key
* @param config - Optional additional configuration
* @returns Configured Mistral text adapter instance
*
* @example
* ```typescript
* const adapter = createMistralText('mistral-large-latest', 'api_key');
* ```
*/
function createMistralText(model, apiKey, config) {
	return new MistralTextAdapter({
		apiKey,
		...config
	}, model);
}
/**
* Creates a Mistral text adapter using the `MISTRAL_API_KEY` environment variable.
*
* @param model - The model name (e.g., 'mistral-large-latest')
* @param config - Optional configuration (excluding apiKey)
* @returns Configured Mistral text adapter instance
* @throws Error if MISTRAL_API_KEY is not found in environment
*
* @example
* ```typescript
* const adapter = mistralText('mistral-large-latest');
* ```
*/
function mistralText(model, config) {
	return createMistralText(model, getMistralApiKeyFromEnv(), config);
}
//#endregion
export { MistralTextAdapter, createMistralText, mistralText };

//# sourceMappingURL=text.js.map