import { buildOllamaUsage } from "../usage.js";
import { createOllamaClient, generateId, getOllamaHostFromEnv } from "../utils/client.js";
import "../utils/index.js";
import { convertToolsToProviderFormat } from "../tools/tool-converter.js";
import { OLLAMA_MODEL_REASONING } from "../model-reasoning.js";
import { EventType, isFileSource, normalizeSystemPrompts, unsupportedFileSourceError } from "@tanstack/ai";
import { resolveReasoning, tanstackMetadata, toRunErrorPayload, toRunErrorRawEvent } from "@tanstack/ai/adapter-internals";
import { BaseTextAdapter } from "@tanstack/ai/adapters";
//#region src/adapters/text.ts
/** The on/off toggle for a model name this package does not list. */
var UNLISTED_MODEL_REASONING = {
	map: {
		off: "false",
		minimal: null,
		low: null,
		medium: null,
		high: "true",
		xhigh: null,
		max: null
	},
	budget: false
};
/**
* Ollama's `think` for `chat({ reasoning })`: `true` or `false` for a model
* with the on/off toggle, the level name for gpt-oss.
*/
function ollamaThink(request, model) {
	const reasoning = model in OLLAMA_MODEL_REASONING ? OLLAMA_MODEL_REASONING[model] : UNLISTED_MODEL_REASONING;
	const value = resolveReasoning(request, reasoning)?.value;
	if (value === "true" || value === "false") return { think: value === "true" };
	if (value === "low" || value === "medium" || value === "high") return { think: value };
	return {};
}
/**
* Ollama Text/Chat Adapter
* A tree-shakeable chat adapter for Ollama
*
* Note: Ollama supports any model name as a string since models are loaded dynamically.
* The predefined OllamaTextModels are common models but any string is accepted.
*/
var OllamaTextAdapter = class extends BaseTextAdapter {
	kind = "text";
	name = "ollama";
	api = "ollama";
	client;
	/** The config of the adapter's own client. An injected client has none. */
	clientConfig;
	constructor(hostOrClientOrConfig, model) {
		super({}, model);
		if (typeof hostOrClientOrConfig === "string" || hostOrClientOrConfig === void 0) {
			this.clientConfig = { host: hostOrClientOrConfig };
			this.client = createOllamaClient(this.clientConfig);
		} else if ("chat" in hostOrClientOrConfig) this.client = hostOrClientOrConfig;
		else {
			this.clientConfig = hostOrClientOrConfig;
			this.client = createOllamaClient(hostOrClientOrConfig);
		}
	}
	/** Use a client whose fetch goes through `wrapFetch` for one call. */
	clientFor(wrapFetch) {
		return wrapFetch && this.clientConfig ? createOllamaClient(this.clientConfig, wrapFetch(fetch)) : this.client;
	}
	async *chatStream(options) {
		const { logger } = options;
		const source = {
			provider: "ollama",
			api: this.api,
			model: options.model
		};
		try {
			const mappedOptions = this.mapCommonOptionsToOllama(options);
			logger.request(`activity=chat provider=ollama model=${this.model} messages=${options.messages.length} tools=${options.tools?.length ?? 0} stream=true`, {
				provider: "ollama",
				model: this.model
			});
			const response = await this.clientFor(options.wrapFetch).chat({
				...mappedOptions,
				stream: true
			});
			for await (const chunk of this.processOllamaStreamChunks(response, options, logger)) yield {
				...chunk,
				metadata: {
					...chunk.metadata,
					tanstack: {
						...tanstackMetadata(chunk),
						source
					}
				}
			};
		} catch (error) {
			const errorPayload = toRunErrorPayload(error, "An unknown error occurred during the chat stream.");
			const rawEvent = toRunErrorRawEvent(error);
			logger.errors("ollama.chatStream fatal", {
				error,
				source: "ollama.chatStream"
			});
			yield {
				type: EventType.RUN_ERROR,
				metadata: { tanstack: { source } },
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
		}
	}
	/**
	* Generate structured output using Ollama's JSON format option.
	* Uses format: 'json' with the schema to ensure structured output.
	* The outputSchema is already JSON Schema (converted in the ai layer).
	*/
	async structuredOutput(options) {
		const { chatOptions, outputSchema } = options;
		const { logger } = chatOptions;
		const mappedOptions = this.mapCommonOptionsToOllama(chatOptions);
		try {
			logger.request(`activity=chat provider=ollama model=${this.model} messages=${chatOptions.messages.length} tools=${chatOptions.tools?.length ?? 0} stream=false`, {
				provider: "ollama",
				model: this.model
			});
			const response = await this.clientFor(chatOptions.wrapFetch).chat({
				...mappedOptions,
				stream: false,
				format: outputSchema
			});
			if (response.done_reason === "length") throw new Error("ollama.structuredOutput: the response was cut off because the maximum token limit was reached (done_reason=length); raise modelOptions.options.num_predict");
			const rawText = response.message.content;
			let parsed;
			try {
				parsed = JSON.parse(rawText);
			} catch {
				throw new Error(`Failed to parse structured output as JSON. Content: ${rawText.slice(0, 200)}${rawText.length > 200 ? "..." : ""}`);
			}
			return {
				data: parsed,
				rawText,
				usage: buildOllamaUsage(response)
			};
		} catch (error) {
			const err = error;
			logger.errors("ollama.structuredOutput fatal", {
				error,
				source: "ollama.structuredOutput"
			});
			throw new Error(`Structured output generation failed: ${err.message || "Unknown error occurred"}`);
		}
	}
	async *processOllamaStreamChunks(stream, options, logger) {
		let accumulatedContent = "";
		let accumulatedReasoning = "";
		const toolCallsEmitted = /* @__PURE__ */ new Set();
		const runId = options.runId ?? generateId("run");
		const threadId = options.threadId ?? generateId("thread");
		const messageId = generateId("msg");
		let stepId = null;
		let reasoningMessageId = null;
		let hasClosedReasoning = false;
		let hasEmittedRunStarted = false;
		let hasEmittedTextMessageStart = false;
		let hasEmittedStepStarted = false;
		for await (const chunk of stream) {
			logger.provider(`provider=ollama`, { chunk });
			if (!hasEmittedRunStarted) {
				hasEmittedRunStarted = true;
				yield {
					type: EventType.RUN_STARTED,
					runId,
					threadId,
					model: chunk.model,
					timestamp: Date.now(),
					parentRunId: options.parentRunId
				};
			}
			const handleToolCall = (toolCall) => {
				const actualToolCall = toolCall;
				const toolCallId = actualToolCall.id || `${actualToolCall.function.name}_${Date.now()}`;
				const events = [];
				if (!toolCallsEmitted.has(toolCallId)) {
					toolCallsEmitted.add(toolCallId);
					events.push({
						type: EventType.TOOL_CALL_START,
						toolCallId,
						toolCallName: actualToolCall.function.name || "",
						toolName: actualToolCall.function.name || "",
						parentMessageId: messageId,
						model: chunk.model,
						timestamp: Date.now(),
						index: actualToolCall.function.index
					});
				}
				let parsedInput;
				const argsStr = typeof actualToolCall.function.arguments === "string" ? actualToolCall.function.arguments : JSON.stringify(actualToolCall.function.arguments);
				try {
					parsedInput = JSON.parse(argsStr);
				} catch {
					parsedInput = void 0;
				}
				events.push({
					type: EventType.TOOL_CALL_ARGS,
					toolCallId,
					model: chunk.model,
					timestamp: Date.now(),
					delta: argsStr,
					args: argsStr
				});
				events.push({
					type: EventType.TOOL_CALL_END,
					toolCallId,
					toolCallName: actualToolCall.function.name || "",
					toolName: actualToolCall.function.name || "",
					model: chunk.model,
					timestamp: Date.now(),
					args: argsStr,
					...parsedInput !== void 0 && { input: parsedInput }
				});
				return events;
			};
			if (chunk.done) {
				if (chunk.message.tool_calls && chunk.message.tool_calls.length > 0) for (const toolCall of chunk.message.tool_calls) {
					const events = handleToolCall(toolCall);
					for (const event of events) yield event;
				}
				if (reasoningMessageId && !hasClosedReasoning) {
					hasClosedReasoning = true;
					yield {
						type: EventType.REASONING_MESSAGE_END,
						messageId: reasoningMessageId,
						model: chunk.model,
						timestamp: Date.now()
					};
					yield {
						type: EventType.REASONING_END,
						messageId: reasoningMessageId,
						model: chunk.model,
						timestamp: Date.now()
					};
				}
				if (hasEmittedTextMessageStart) yield {
					type: EventType.TEXT_MESSAGE_END,
					messageId,
					model: chunk.model,
					timestamp: Date.now()
				};
				const finishUsage = buildOllamaUsage(chunk);
				yield {
					type: EventType.RUN_FINISHED,
					runId,
					threadId,
					model: chunk.model,
					timestamp: Date.now(),
					finishReason: toolCallsEmitted.size > 0 ? "tool_calls" : "stop",
					...finishUsage && { usage: finishUsage }
				};
				continue;
			}
			if (chunk.message.content) {
				if (reasoningMessageId && !hasClosedReasoning) {
					hasClosedReasoning = true;
					yield {
						type: EventType.REASONING_MESSAGE_END,
						messageId: reasoningMessageId,
						model: chunk.model,
						timestamp: Date.now()
					};
					yield {
						type: EventType.REASONING_END,
						messageId: reasoningMessageId,
						model: chunk.model,
						timestamp: Date.now()
					};
				}
				if (!hasEmittedTextMessageStart) {
					hasEmittedTextMessageStart = true;
					yield {
						type: EventType.TEXT_MESSAGE_START,
						messageId,
						model: chunk.model,
						timestamp: Date.now(),
						role: "assistant"
					};
				}
				accumulatedContent += chunk.message.content;
				yield {
					type: EventType.TEXT_MESSAGE_CONTENT,
					messageId,
					model: chunk.model,
					timestamp: Date.now(),
					delta: chunk.message.content,
					content: accumulatedContent
				};
			}
			if (chunk.message.tool_calls && chunk.message.tool_calls.length > 0) for (const toolCall of chunk.message.tool_calls) {
				const events = handleToolCall(toolCall);
				for (const event of events) yield event;
			}
			if (chunk.message.thinking) {
				if (!hasEmittedStepStarted) {
					hasEmittedStepStarted = true;
					stepId = generateId("step");
					reasoningMessageId = generateId("msg");
					yield {
						type: EventType.REASONING_START,
						messageId: reasoningMessageId,
						model: chunk.model,
						timestamp: Date.now()
					};
					yield {
						type: EventType.REASONING_MESSAGE_START,
						messageId: reasoningMessageId,
						role: "reasoning",
						model: chunk.model,
						timestamp: Date.now()
					};
					yield {
						type: EventType.STEP_STARTED,
						stepName: stepId,
						stepId,
						model: chunk.model,
						timestamp: Date.now(),
						stepType: "thinking"
					};
				}
				accumulatedReasoning += chunk.message.thinking;
				if (reasoningMessageId) yield {
					type: EventType.REASONING_MESSAGE_CONTENT,
					messageId: reasoningMessageId,
					delta: chunk.message.thinking,
					model: chunk.model,
					timestamp: Date.now()
				};
				yield {
					type: EventType.STEP_FINISHED,
					stepName: stepId || generateId("step"),
					stepId: stepId || generateId("step"),
					model: chunk.model,
					timestamp: Date.now(),
					delta: chunk.message.thinking,
					content: accumulatedReasoning
				};
			}
		}
	}
	convertToolsToOllamaFormat(tools) {
		return convertToolsToProviderFormat(tools);
	}
	formatMessages(messages) {
		return messages.map((msg) => {
			let textContent = "";
			const images = [];
			if (Array.isArray(msg.content)) {
				for (const part of msg.content) if (part.type === "text") textContent += part.content;
				else if (part.type === "image") {
					if (isFileSource(part.source)) throw unsupportedFileSourceError(this.name);
					images.push(part.source.value);
				}
			} else textContent = msg.content || "";
			const hasToolCallId = msg.role === "tool" && msg.toolCallId;
			return {
				role: hasToolCallId ? "tool" : msg.role,
				content: hasToolCallId ? typeof msg.content === "string" ? msg.content : JSON.stringify(msg.content) : textContent,
				...images.length > 0 ? { images } : {},
				...msg.role === "assistant" && msg.toolCalls && msg.toolCalls.length > 0 ? { tool_calls: msg.toolCalls.map((toolCall) => {
					let parsedArguments = {};
					if (typeof toolCall.function.arguments === "string") try {
						parsedArguments = JSON.parse(toolCall.function.arguments);
					} catch {
						parsedArguments = {};
					}
					else parsedArguments = {};
					return {
						id: toolCall.id,
						type: toolCall.type,
						function: {
							name: toolCall.function.name,
							arguments: parsedArguments
						}
					};
				}) } : {}
			};
		});
	}
	mapCommonOptionsToOllama(options) {
		const model = options.model;
		const modelOptions = options.modelOptions;
		const formattedMessages = this.formatMessages(options.messages);
		const prompts = normalizeSystemPrompts(options.systemPrompts);
		if (prompts.length > 0) formattedMessages.unshift({
			role: "system",
			content: prompts.map((p) => p.content).join("\n")
		});
		const convertedTools = this.convertToolsToOllamaFormat(options.tools);
		return {
			model,
			messages: formattedMessages,
			options: { ...modelOptions?.options },
			...modelOptions?.format !== void 0 && { format: modelOptions.format },
			...modelOptions?.keep_alive !== void 0 && { keep_alive: modelOptions.keep_alive },
			...modelOptions?.logprobs !== void 0 && { logprobs: modelOptions.logprobs },
			...modelOptions?.top_logprobs !== void 0 && { top_logprobs: modelOptions.top_logprobs },
			...ollamaThink(options.reasoning, model),
			...convertedTools !== void 0 && { tools: convertedTools }
		};
	}
};
/**
* Creates an Ollama chat adapter with explicit host and optional config.
* Type resolution happens here at the call site.
*/
function createOllamaChat(model, hostOrConfig) {
	return new OllamaTextAdapter(hostOrConfig, model);
}
/**
* Creates an Ollama text adapter with host from environment.
* Type resolution happens here at the call site.
*/
function ollamaText(model) {
	return new OllamaTextAdapter(getOllamaHostFromEnv(), model);
}
//#endregion
export { OllamaTextAdapter, createOllamaChat, ollamaText };

//# sourceMappingURL=text.js.map