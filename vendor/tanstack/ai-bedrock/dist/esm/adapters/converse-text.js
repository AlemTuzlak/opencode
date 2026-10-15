import { GENERATED_BEDROCK_MODELS } from "../model-catalog.generated.js";
import { resolveBedrockAuth } from "../utils/auth.js";
import { BEDROCK_MODEL_REASONING } from "../model-reasoning.js";
import { toConverseMessages, toolBlocksToText } from "../converse/message-converter.js";
import { toToolConfig } from "../converse/tool-converter.js";
import { buildConverseUsage } from "../converse/usage.js";
import { processConverseStream, throwIfConverseStreamError } from "../converse/stream-processor.js";
import { converseThinking } from "../converse/reasoning.js";
import { addPromptCachePoints } from "../converse/prompt-cache.js";
import { buildStructuredOutputConfig, buildStructuredToolConfig } from "../converse/structured-output.js";
import { EventType, convertSchemaToJsonSchema } from "@tanstack/ai";
import { BaseTextAdapter } from "@tanstack/ai/adapters";
import { toRunErrorPayload } from "@tanstack/ai/adapter-internals";
//#region src/adapters/converse-text.ts
/**
* The Claude models that reject a forced tool (`any` or a named `tool`) on
* every request, with or without thinking. A Bedrock id has the family name
* inside it, for example `us.anthropic.claude-opus-5-5-...`.
* ponytail: a hand list, the same as the Anthropic adapter. Move it to the
* model catalog when the catalog script can set it.
*/
var CLAUDE_NO_FORCED_TOOL_MODELS = [
	"claude-fable-5-1",
	"claude-mythos-5-1",
	"claude-opus-5-5",
	"claude-sonnet-5-5"
];
var BedrockConverseTextAdapter = class extends BaseTextAdapter {
	kind = "text";
	name = "bedrock-converse";
	api = "bedrock-converse-stream";
	provider = "amazon-bedrock";
	inputModalities = GENERATED_BEDROCK_MODELS.find((entry) => entry.id === this.model)?.input ?? ["text"];
	clientPromise;
	clientConfig;
	constructor(config, model) {
		super({}, model);
		this.clientConfig = config;
	}
	/**
	* Dynamically import `@aws-sdk/client-bedrock-runtime`. The specifier is held
	* in a variable (not a string literal) so bundler dep scanners (e.g. Vite/
	* esbuild optimizeDeps) cannot statically discover the AWS SDK and try to
	* pre-bundle it for the browser — it would fail on the SDK's Node-only
	* `fromTokenFile` export chain. The SDK is Node/server-only and is only
	* reached on a real request. `typeof import(...)` is a type-only reference
	* (erased at emit) so the imported members keep full typing.
	*/
	importBedrockRuntime() {
		return import(
			/* @vite-ignore */
			"@aws-sdk/client-bedrock-runtime"
);
	}
	/**
	* Lazily construct the `BedrockRuntimeClient`. The dynamic import keeps
	* `@aws-sdk/client-bedrock-runtime` out of the static/browser graph and
	* defers `resolveBedrockAuth` until a real request is made.
	*/
	async getClient() {
		if (!this.clientPromise) this.clientPromise = (async () => {
			const { BedrockRuntimeClient } = await this.importBedrockRuntime();
			const region = this.clientConfig.region ?? "us-east-1";
			const resolved = resolveBedrockAuth({
				apiKey: this.clientConfig.apiKey,
				region,
				auth: this.clientConfig.auth
			}, "runtime");
			const client = new BedrockRuntimeClient(this.buildClientConfig(resolved, region, this.clientConfig.baseURL));
			const defaultHeaders = this.clientConfig.defaultHeaders;
			if (defaultHeaders) client.middlewareStack.add((next) => (args) => {
				const request = args.request;
				if (typeof request === "object" && request !== null && "headers" in request && typeof request.headers === "object" && request.headers !== null) Object.assign(request.headers, defaultHeaders);
				return next(args);
			}, {
				step: "build",
				name: "tanstackDefaultHeaders"
			});
			return client;
		})().catch((error) => {
			this.clientPromise = void 0;
			throw error;
		});
		return this.clientPromise;
	}
	/**
	* Map resolved auth + endpoint to a `BedrockRuntimeClientConfig`.
	*
	* Recent `@aws-sdk/client-bedrock-runtime` exposes a first-class `token`
	* config field for Bedrock API-key bearer auth. But the client's default
	* auth-scheme order is SigV4 first, then bearer — so passing `token` alone is
	* not enough: the SDK still resolves SigV4 and throws "Could not load
	* credentials from any providers". Pinning `authSchemePreference` to the
	* bearer scheme makes the API key actually get used. SigV4 uses the AWS
	* credential provider chain and the default scheme order.
	*/
	buildClientConfig(resolved, region, endpoint) {
		if (resolved.kind === "bearer") return {
			region,
			token: { token: resolved.token },
			authSchemePreference: ["httpBearerAuth"],
			...endpoint ? { endpoint } : {}
		};
		return {
			region: resolved.region,
			credentials: resolved.credentials,
			...endpoint ? { endpoint } : {}
		};
	}
	async sendStream(input) {
		const { ConverseStreamCommand } = await this.importBedrockRuntime();
		const client = await this.getClient();
		const command = new ConverseStreamCommand(input);
		command.middlewareStack.add((next) => async (args) => {
			this.restoreDocumentInputs(args.request, input);
			return next(args);
		}, {
			step: "build",
			name: "tanstackDocumentInputs",
			priority: "high"
		});
		const res = await client.send(command);
		if (!res.stream) throw new Error("Bedrock Converse: empty stream response");
		return res.stream;
	}
	async send(input) {
		const { ConverseCommand } = await this.importBedrockRuntime();
		const client = await this.getClient();
		const command = new ConverseCommand(input);
		command.middlewareStack.add((next) => async (args) => {
			this.restoreDocumentInputs(args.request, input);
			return next(args);
		}, {
			step: "build",
			name: "tanstackDocumentInputs",
			priority: "high"
		});
		return client.send(command);
	}
	restoreDocumentInputs(request, input) {
		if (typeof request !== "object" || request === null || !("body" in request) || typeof request.body !== "string") return;
		const body = JSON.parse(request.body);
		if (typeof body !== "object" || body === null || !("messages" in body) || !Array.isArray(body.messages)) return;
		let changed = false;
		const restore = (target, key, value) => {
			if (value === void 0 || typeof target !== "object" || target === null) return;
			const previous = key in target ? Reflect.get(target, key) : void 0;
			if (Object.hasOwn(target, key) && JSON.stringify(previous) === JSON.stringify(value)) return;
			Object.defineProperty(target, key, {
				value,
				enumerable: true,
				configurable: true,
				writable: true
			});
			changed = true;
		};
		for (const [messageIndex, message] of (input.messages ?? []).entries()) {
			const wireMessage = body.messages[messageIndex];
			if (typeof wireMessage !== "object" || wireMessage === null || !("content" in wireMessage) || !Array.isArray(wireMessage.content)) continue;
			for (const [blockIndex, block] of (message.content ?? []).entries()) {
				const wireBlock = wireMessage.content[blockIndex];
				if (typeof wireBlock !== "object" || wireBlock === null) continue;
				if (block.toolUse && "toolUse" in wireBlock) restore(wireBlock.toolUse, "input", block.toolUse.input);
				if (!block.toolResult || !("toolResult" in wireBlock)) continue;
				const wireResult = wireBlock.toolResult;
				if (typeof wireResult !== "object" || wireResult === null || !("content" in wireResult) || !Array.isArray(wireResult.content)) continue;
				for (const [resultIndex, result] of (block.toolResult.content ?? []).entries()) if ("json" in result) restore(wireResult.content[resultIndex], "json", result.json);
			}
		}
		if ("toolConfig" in body && typeof body.toolConfig === "object" && body.toolConfig !== null && "tools" in body.toolConfig && Array.isArray(body.toolConfig.tools)) for (const [index, tool] of (input.toolConfig?.tools ?? []).entries()) {
			if (!("toolSpec" in tool) || !tool.toolSpec?.inputSchema || !("json" in tool.toolSpec.inputSchema)) continue;
			const wireTool = body.toolConfig.tools[index];
			if (typeof wireTool !== "object" || wireTool === null || !("toolSpec" in wireTool)) continue;
			const wireSpec = wireTool.toolSpec;
			if (typeof wireSpec !== "object" || wireSpec === null || !("inputSchema" in wireSpec)) continue;
			restore(wireSpec.inputSchema, "json", tool.toolSpec.inputSchema.json);
		}
		if (changed) request.body = JSON.stringify(body);
	}
	async *chatStream(options) {
		try {
			options.logger.request(`activity=chat provider=${this.name} model=${this.model} messages=${options.messages.length} tools=${options.tools?.length ?? 0} stream=true`, {
				provider: this.name,
				model: this.model
			});
			const input = this.buildInput(options);
			const stream = await this.sendStream(input);
			for await (const chunk of processConverseStream(stream, () => this.generateId(), {
				threadId: options.threadId,
				parentRunId: options.parentRunId,
				model: options.model
			})) yield chunk.type === EventType.RUN_STARTED || chunk.type === EventType.RUN_FINISHED ? {
				...chunk,
				metadata: { tanstack: { source: {
					provider: this.provider,
					api: this.api,
					model: options.model
				} } }
			} : chunk;
		} catch (error) {
			const errorPayload = toRunErrorPayload(error, `${this.name}.chatStream failed`);
			options.logger.errors(`${this.name}.chatStream fatal`, {
				error: errorPayload,
				source: `${this.name}.chatStream`
			});
			yield {
				type: EventType.RUN_ERROR,
				metadata: { tanstack: { source: {
					provider: this.provider,
					api: this.api,
					model: options.model
				} } },
				model: options.model,
				timestamp: Date.now(),
				message: errorPayload.message,
				...errorPayload.code !== void 0 && { code: errorPayload.code },
				error: {
					message: errorPayload.message,
					...errorPayload.code !== void 0 && { code: errorPayload.code }
				}
			};
		}
	}
	/**
	* Structured output. A model that takes a forced tool gets a single forced
	* tool whose input schema is the requested output schema, and its
	* `toolUse.input` is the result. A model that rejects a forced tool gets
	* Converse's native JSON schema output, and its text answer is the result.
	*/
	async structuredOutput(options) {
		const { chatOptions, outputSchema } = options;
		try {
			chatOptions.logger.request(`activity=structuredOutput provider=${this.name} model=${this.model} messages=${chatOptions.messages.length}`, {
				provider: this.name,
				model: this.model
			});
			const input = this.buildInput(chatOptions, outputSchema);
			const res = await this.send(input);
			if (res.stopReason === "max_tokens") throw new Error(`${this.name}.structuredOutput: the response was cut off because the maximum token limit was reached (stopReason=max_tokens); raise modelOptions.max_completion_tokens`);
			const structured = input.outputConfig ? parseJsonAnswer(res, `${this.name}.structuredOutput: ${this.model}`) : extractStructuredToolInput(res);
			if (structured === void 0) throw new Error(`${this.name}.structuredOutput: response contained no forced-tool output`);
			const usage = res.usage;
			return {
				data: structured,
				rawText: JSON.stringify(structured),
				...usage && { usage: buildConverseUsage(usage) }
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
	* Streaming structured output. Same strategy as `structuredOutput`, but
	* streamed: the JSON fragments (the forced tool's `toolUse.input`, or the
	* text of the native JSON schema output) are accumulated from the Converse
	* stream and a terminal `CUSTOM 'structured-output.complete'` event carries
	* `{ object, raw }`, mirroring openai-base's `structuredOutputStream`
	* contract exactly.
	*/
	async *structuredOutputStream(options) {
		const { chatOptions, outputSchema } = options;
		const runId = this.generateId();
		const threadId = chatOptions.threadId ?? this.generateId();
		const messageId = this.generateId();
		let hasEmittedRunStarted = false;
		let hasEmittedTextMessageStart = false;
		let accumulatedRaw = "";
		let finishReason = "stop";
		let usage;
		try {
			chatOptions.logger.request(`activity=structuredOutputStream provider=${this.name} model=${this.model} messages=${chatOptions.messages.length}`, {
				provider: this.name,
				model: this.model
			});
			const input = this.buildInput(chatOptions, outputSchema);
			const native = input.outputConfig !== void 0;
			const stream = await this.sendStream(input);
			for await (const ev of stream) {
				if (!hasEmittedRunStarted) {
					hasEmittedRunStarted = true;
					yield {
						type: EventType.RUN_STARTED,
						metadata: { tanstack: { source: {
							provider: this.provider,
							api: this.api,
							model: chatOptions.model
						} } },
						runId,
						threadId,
						model: chatOptions.model,
						timestamp: Date.now(),
						parentRunId: chatOptions.parentRunId
					};
				}
				throwIfConverseStreamError(ev);
				if ("contentBlockDelta" in ev) {
					const delta = ev.contentBlockDelta?.delta;
					const fragment = native ? delta?.text : delta?.toolUse?.input;
					if (fragment !== void 0) {
						if (!hasEmittedTextMessageStart) {
							hasEmittedTextMessageStart = true;
							yield {
								type: EventType.TEXT_MESSAGE_START,
								messageId,
								role: "assistant",
								model: chatOptions.model,
								timestamp: Date.now()
							};
						}
						accumulatedRaw += fragment;
						yield {
							type: EventType.TEXT_MESSAGE_CONTENT,
							messageId,
							delta: fragment,
							content: accumulatedRaw,
							model: chatOptions.model,
							timestamp: Date.now()
						};
					}
					continue;
				}
				if ("messageStop" in ev) {
					const stopReason = ev.messageStop?.stopReason;
					finishReason = stopReason === "max_tokens" ? "length" : stopReason === "content_filtered" ? "content_filter" : "stop";
					continue;
				}
				if ("metadata" in ev) {
					const u = ev.metadata?.usage;
					if (u) usage = buildConverseUsage(u);
					continue;
				}
			}
			if (!hasEmittedRunStarted) {
				hasEmittedRunStarted = true;
				yield {
					type: EventType.RUN_STARTED,
					metadata: { tanstack: { source: {
						provider: this.provider,
						api: this.api,
						model: chatOptions.model
					} } },
					runId,
					threadId,
					model: chatOptions.model,
					timestamp: Date.now(),
					parentRunId: chatOptions.parentRunId
				};
			}
			if (hasEmittedTextMessageStart) yield {
				type: EventType.TEXT_MESSAGE_END,
				messageId,
				model: chatOptions.model,
				timestamp: Date.now()
			};
			if (finishReason === "length") {
				const message = `${this.name}.structuredOutputStream: the response was cut off because the maximum token limit was reached (stopReason=max_tokens); raise modelOptions.max_completion_tokens`;
				yield {
					type: EventType.RUN_ERROR,
					runId,
					model: chatOptions.model,
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
			if (accumulatedRaw.length === 0) {
				yield {
					type: EventType.RUN_ERROR,
					metadata: { tanstack: { source: {
						provider: this.provider,
						api: this.api,
						model: chatOptions.model
					} } },
					runId,
					model: chatOptions.model,
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
				parsed = JSON.parse(accumulatedRaw);
			} catch {
				yield {
					type: EventType.RUN_ERROR,
					metadata: { tanstack: { source: {
						provider: this.provider,
						api: this.api,
						model: chatOptions.model
					} } },
					runId,
					model: chatOptions.model,
					timestamp: Date.now(),
					message: `Failed to parse structured output as JSON. Content: ${accumulatedRaw.slice(0, 200)}${accumulatedRaw.length > 200 ? "..." : ""}`,
					code: "parse-error",
					error: {
						message: "Failed to parse structured output as JSON",
						code: "parse-error"
					}
				};
				return;
			}
			yield {
				type: EventType.CUSTOM,
				name: "structured-output.complete",
				value: {
					object: parsed,
					raw: accumulatedRaw
				},
				model: chatOptions.model,
				timestamp: Date.now()
			};
			yield {
				type: EventType.RUN_FINISHED,
				metadata: { tanstack: { source: {
					provider: this.provider,
					api: this.api,
					model: chatOptions.model
				} } },
				runId,
				threadId,
				model: chatOptions.model,
				timestamp: Date.now(),
				finishReason,
				...usage && { usage }
			};
		} catch (error) {
			if (!hasEmittedRunStarted) {
				hasEmittedRunStarted = true;
				yield {
					type: EventType.RUN_STARTED,
					metadata: { tanstack: { source: {
						provider: this.provider,
						api: this.api,
						model: chatOptions.model
					} } },
					runId,
					threadId,
					model: chatOptions.model,
					timestamp: Date.now(),
					parentRunId: chatOptions.parentRunId
				};
			}
			const errorPayload = toRunErrorPayload(error, `${this.name}.structuredOutputStream failed`);
			chatOptions.logger.errors(`${this.name}.structuredOutputStream fatal`, {
				error: errorPayload,
				source: `${this.name}.structuredOutputStream`
			});
			yield {
				type: EventType.RUN_ERROR,
				metadata: { tanstack: { source: {
					provider: this.provider,
					api: this.api,
					model: chatOptions.model
				} } },
				runId,
				model: chatOptions.model,
				timestamp: Date.now(),
				message: errorPayload.message,
				...errorPayload.code !== void 0 && { code: errorPayload.code },
				error: {
					message: errorPayload.message,
					...errorPayload.code !== void 0 && { code: errorPayload.code }
				}
			};
		}
	}
	/**
	* Converse sends `tools` and a forced structured-output tool via two separate
	* mechanisms, never together. Declaring `false` makes the engine run the
	* agent loop without `outputSchema` and finalize via `structuredOutput` /
	* `structuredOutputStream`.
	*/
	supportsCombinedToolsAndSchema() {
		return false;
	}
	/**
	* Translate `TextOptions` into a `ConverseCommandInput`. Shared by chatStream,
	* structuredOutput, and structuredOutputStream (the latter two pass the
	* `outputSchema`, which replaces the tools of `options`).
	*/
	buildInput(options, outputSchema) {
		const { system, messages } = toConverseMessages(options.messages, options.systemPrompts, {
			model: options.model,
			provider: this.provider,
			inputModalities: this.inputModalities
		});
		const modelOptions = options.modelOptions;
		const temperature = modelOptions?.temperature;
		const topP = modelOptions?.top_p;
		const { additionalModelRequestFields, minMaxTokens } = converseThinking(this.model, options.reasoning, this.clientConfig.reasoning ?? BEDROCK_MODEL_REASONING[this.model]);
		const canForceTool = additionalModelRequestFields === void 0 && !CLAUDE_NO_FORCED_TOOL_MODELS.some((name) => this.model.includes(name));
		const hasToolBlocks = messages.some((message) => message.content?.some((block) => block.toolUse || block.toolResult));
		const toolChoice = options.toolChoice === "none" ? hasToolBlocks ? "auto" : "none" : canForceTool ? options.toolChoice : "auto";
		const toolConfig = outputSchema === void 0 ? options.tools ? toToolConfig(convertTools(options.tools), toolChoice) : void 0 : canForceTool ? buildStructuredToolConfig(outputSchema) : void 0;
		const outputConfig = outputSchema !== void 0 && !canForceTool ? buildStructuredOutputConfig(outputSchema) : void 0;
		const requestedMaxTokens = modelOptions?.max_completion_tokens;
		const maxTokens = minMaxTokens !== void 0 && (requestedMaxTokens == null || requestedMaxTokens < minMaxTokens) ? minMaxTokens : requestedMaxTokens;
		const stop = modelOptions?.stop;
		const stopSequences = stop == null ? void 0 : Array.isArray(stop) ? stop : [stop];
		const inferenceConfig = temperature != null || topP != null || maxTokens != null || stopSequences != null ? {
			...temperature != null && { temperature },
			...topP != null && { topP },
			...maxTokens != null && { maxTokens },
			...stopSequences != null && { stopSequences }
		} : void 0;
		const input = {
			modelId: this.model,
			messages: hasToolBlocks && !toolConfig ? toolBlocksToText(messages) : messages,
			...system.length > 0 && { system },
			...toolConfig && { toolConfig },
			...outputConfig && { outputConfig },
			...inferenceConfig && { inferenceConfig },
			...additionalModelRequestFields && { additionalModelRequestFields }
		};
		return addPromptCachePoints(this.model, input, options.promptCache);
	}
};
/**
* Convert TanStack `Tool[]` to the Converse tool-converter input shape. Reuses
* the SAME `convertSchemaToJsonSchema` the other adapters use so the Converse
* tool input schemas match what every other provider sends.
*/
function convertTools(tools) {
	return tools.map((tool) => {
		const inputSchema = convertSchemaToJsonSchema(tool.inputSchema) ?? {
			type: "object",
			properties: {},
			required: []
		};
		const { cachePoint } = tool.metadata ?? {};
		return {
			name: tool.name,
			description: tool.description,
			inputSchema,
			...cachePoint && { cachePoint }
		};
	});
}
/**
* Find the forced structured-output tool's `input` in a non-streaming Converse
* response. SDK-boundary narrowing only — `ConverseOutput` is a tagged union
* (`{ message }`) and a tool-use block is `{ toolUse: { input } }`.
*/
function extractStructuredToolInput(res) {
	const content = (res.output && "message" in res.output ? res.output.message : void 0)?.content ?? [];
	for (const block of content) if ("toolUse" in block && block.toolUse) {
		if (block.toolUse.name === "structured_output" || block.toolUse.name === void 0) return block.toolUse.input;
	}
}
/**
* Parse the text answer of the native JSON schema output. A text that is not
* JSON fails with `source` (the model name) and the text, so no unchecked
* text becomes the structured result.
*/
function parseJsonAnswer(res, source) {
	const text = (res.output?.message?.content ?? []).map((block) => block.text ?? "").join("");
	try {
		return JSON.parse(text);
	} catch {
		throw new Error(`${source} did not answer with JSON for the output schema. Content: ${text.slice(0, 200)}`);
	}
}
/** Converse adapter with an explicit API key (low-level; mirrors createBedrockChat). */
function createBedrockConverse(model, apiKey, config) {
	return new BedrockConverseTextAdapter({
		...config,
		apiKey
	}, model);
}
//#endregion
export { BedrockConverseTextAdapter, createBedrockConverse };

//# sourceMappingURL=converse-text.js.map