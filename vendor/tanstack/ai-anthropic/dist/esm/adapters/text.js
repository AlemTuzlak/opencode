import { getAnthropicProviderToolKind } from "../tools/anthropic-provider-tool.js";
import { readCodeExecutionConfig, readCodeExecutionSkills } from "../tools/code-execution-tool.js";
import { convertToolsToProviderFormat } from "../tools/tool-converter.js";
import { validateTextProviderOptions } from "../text/text-provider-options.js";
import { ANTHROPIC_DEFERRED_TOOL_PLACEHOLDER_NAME, applyAnthropicPromptCache } from "../prompt-cache.js";
import { anthropicThinking, isAnthropicEffort } from "../text/reasoning.js";
import { ANTHROPIC_MODEL_REASONING } from "../model-reasoning.js";
import { buildAnthropicUsage } from "../usage.js";
import { createAnthropicClient, generateId, resolveAnthropicCredentials } from "../utils/client.js";
import { ANTHROPIC_COMBINED_TOOLS_AND_SCHEMA_MODELS, ANTHROPIC_MID_CONVERSATION_EFFORT_MODELS, ANTHROPIC_MODEL_INPUT_MODALITIES, ANTHROPIC_MODEL_MID_CONVERSATION_CHANNELS, getAnthropicDefaultMaxTokens } from "../model-meta.js";
import { EventType, fileReferenceFor, isFileSource, normalizeSystemPrompts } from "@tanstack/ai";
import { REDACTED_THINKING_ID_PREFIX, orderedAssistantBlocks, sanitizeJsonArguments, sanitizeUnicode, splitMidConversationChanges, toRetryAfterMs, toRunErrorRawEvent, transformMessagesForReplay } from "@tanstack/ai/adapter-internals";
import { BaseTextAdapter } from "@tanstack/ai/adapters";
//#region src/adapters/text.ts
/**
* Narrow an opaque tool-call `metadata` to {@link AnthropicServerToolMetadata}
* when it follows the provider-executed convention, else `null`.
*/
function readAnthropicServerToolMetadata(metadata) {
	if (typeof metadata !== "object" || metadata === null) return null;
	const outer = metadata;
	if (outer.providerExecuted !== true) return null;
	const inner = outer.anthropic;
	if (typeof inner !== "object" || inner === null) return null;
	const { serverToolType, resultBlockType, result } = inner;
	if (typeof serverToolType !== "string" || resultBlockType !== "web_search_tool_result" && resultBlockType !== "web_fetch_tool_result") return null;
	return {
		serverToolType,
		resultBlockType,
		result
	};
}
/**
* Reconstruct the `*_tool_result` block param from stored server-tool metadata.
* The `result` content is opaque round-trip data, asserted to the SDK's param
* content type at this single boundary.
*/
function buildServerToolResultBlock(toolUseId, meta) {
	if (meta.resultBlockType === "web_search_tool_result") return {
		type: "web_search_tool_result",
		tool_use_id: toolUseId,
		content: meta.result
	};
	return {
		type: "web_fetch_tool_result",
		tool_use_id: toolUseId,
		content: meta.result
	};
}
/**
* True when any message carries a provider file-handle source, so the request
* must send the Files API beta header.
*/
function messagesHaveFileSource(messages) {
	return messages.some((message) => Array.isArray(message.content) && message.content.some((part) => "source" in part && isFileSource(part.source)));
}
/**
* Computes the `betas` array for a Messages request. Unions:
* - `interleaved-thinking-2025-05-14` when interleaved thinking is enabled,
* - `code-execution-2025-08-25` when a `code_execution` tool is present,
* - `skills-2025-10-02` when that tool carries skills,
* - `context-management-2025-06-27` when `context_management` is set,
* - `files-api-2025-04-14` when a message references an uploaded file handle,
* - `mid-conversation-tool-changes-2026-07-01` in mid-conversation tool mode,
* - `mid-conversation-output-config-2026-07-01` and
*   `thinking-binding-controls-2026-08-01` with mid-conversation effort
*   (`thinking.block_binding`).
* Returns `undefined` when none apply (so the call site omits `betas`).
*/
function computeAnthropicBetas(tools, modelOptions, hasFileSource = false, midConversationToolChanges = false) {
	const betas = /* @__PURE__ */ new Set();
	if (hasFileSource) betas.add("files-api-2025-04-14");
	if (midConversationToolChanges) betas.add("mid-conversation-tool-changes-2026-07-01");
	if (modelOptions?.thinking?.type === "enabled" && typeof modelOptions.thinking.budget_tokens === "number" && modelOptions.thinking.budget_tokens > 0) betas.add("interleaved-thinking-2025-05-14");
	if (modelOptions?.thinking?.block_binding) {
		betas.add("mid-conversation-output-config-2026-07-01");
		betas.add("thinking-binding-controls-2026-08-01");
	}
	if (modelOptions?.context_management != null) betas.add("context-management-2025-06-27");
	if (modelOptions?.mcp_servers && modelOptions.mcp_servers.length > 0) betas.add("mcp-client-2025-04-04");
	const codeExecTool = tools?.find((tool) => getAnthropicProviderToolKind(tool) === "code_execution");
	if (codeExecTool) {
		const cfgType = readCodeExecutionConfig(codeExecTool)?.type;
		betas.add(cfgType === "code_execution_20250522" ? "code-execution-2025-05-22" : "code-execution-2025-08-25");
	}
	if (tools?.some((tool) => getAnthropicProviderToolKind(tool) === "code_execution" && (readCodeExecutionSkills(tool)?.length ?? 0) > 0)) betas.add("skills-2025-10-02");
	return betas.size > 0 ? Array.from(betas) : void 0;
}
/**
* The models that reject a forced tool (`any` or a named `tool`) on every
* request, with or without thinking.
* ponytail: a hand list, because the model sync script writes model-meta.ts.
* Move it to a model-meta capability when that script can set one.
*/
var ANTHROPIC_NO_FORCED_TOOL_MODELS = /* @__PURE__ */ new Set([
	"claude-fable-5-1",
	"claude-opus-5-5",
	"claude-sonnet-5-5"
]);
/**
* Maps `chat({ toolChoice })` to the Messages `tool_choice`. When the
* request cannot force a tool, a forced choice falls back to `auto`.
*/
function toAnthropicToolChoice(choice, { canForceTool }) {
	if (choice === "none") return { type: "none" };
	if (choice === "auto" || !canForceTool) return { type: "auto" };
	if (choice === "required") return { type: "any" };
	return {
		type: "tool",
		name: choice.name
	};
}
/**
* The tool placeholder of mid-conversation tool mode, copied from pi 0.87.1.
* Anthropic adds hidden scaffolding once any tool has `defer_loading`. This
* deferred tool is in every tool-mode request, so that scaffolding stays in
* the cached prefix. The model never sees it.
*/
var DEFERRED_TOOL_PLACEHOLDER = {
	name: ANTHROPIC_DEFERRED_TOOL_PLACEHOLDER_NAME,
	description: "Reserved placeholder. Never available. Never call this.",
	input_schema: {
		type: "object",
		properties: {},
		required: []
	},
	defer_loading: true
};
/** pi's effort message: a `system` message with no content that sets the effort. */
function effortMessage(effort) {
	return {
		role: "system",
		content: [],
		output_config: { effort }
	};
}
/**
* Restore the package SDK's precise overloads at the adapter boundary.
* Alternative clients may use a separate Anthropic 0.x SDK whose declarations
* drift while implementing the same Messages protocol at runtime.
*/
function asSdkAnthropicMessagesClient(client) {
	return client;
}
/**
* Anthropic Text (Chat) Adapter
*
* Tree-shakeable adapter for Anthropic chat/text completion functionality.
* Import only what you need for smaller bundle sizes.
*/
var AnthropicTextAdapter = class extends BaseTextAdapter {
	kind = "text";
	name = "anthropic";
	api = "anthropic-messages";
	provider;
	supportsFileSources = true;
	inputModalities = ANTHROPIC_MODEL_INPUT_MODALITIES[this.model];
	/** Set from `ANTHROPIC_MODEL_MID_CONVERSATION_CHANNELS` in the constructor. */
	midConversationChannels = void 0;
	client;
	/** The adapter's own SDK client. An injected client cannot take a fetch. */
	sdkClient;
	baseFetch;
	/** `config.reasoning`, which wins over `ANTHROPIC_MODEL_REASONING`. */
	modelReasoning;
	oauth;
	allowEmptySignature;
	tokenAuthentication;
	oauthHeaders = new Headers({
		"user-agent": "claude-cli/2.1.280",
		"x-app": "cli"
	});
	constructor(config, model) {
		super({}, model);
		this.provider = config.provider ?? this.name;
		const credentials = "client" in config ? void 0 : resolveAnthropicCredentials(config, config.oauth);
		this.oauth = config.oauth ?? credentials?.oauth ?? false;
		this.tokenAuthentication = Boolean(credentials?.authToken) || this.oauth;
		if (!("client" in config)) {
			for (const [name, value] of Object.entries(config.defaultHeaders ?? {})) if (value != null && (name.toLowerCase() === "x-app" || name.toLowerCase() === "user-agent" || name.toLowerCase() === "anthropic-beta")) this.oauthHeaders.set(name, value);
		}
		this.allowEmptySignature = config.allowEmptySignature ?? false;
		if ("client" in config) this.client = asSdkAnthropicMessagesClient(config.client);
		else {
			this.sdkClient = createAnthropicClient({
				...config,
				...this.oauth && { defaultHeaders: {
					"user-agent": "claude-cli/2.1.280",
					"x-app": "cli",
					...config.defaultHeaders
				} }
			}, this.oauth);
			this.client = this.sdkClient;
			this.baseFetch = config.fetch;
		}
		const envBaseURL = typeof process !== "undefined" && Boolean(process.env.ANTHROPIC_BASE_URL);
		const customEndpoint = "client" in config || Boolean(config.baseURL || config.fetch) || envBaseURL;
		const ownReasoning = ANTHROPIC_MODEL_REASONING[this.model];
		this.modelReasoning = config.reasoning ?? (ownReasoning && !customEndpoint && ANTHROPIC_MID_CONVERSATION_EFFORT_MODELS.has(model) ? {
			...ownReasoning,
			midConversationEffort: true
		} : ownReasoning);
		const table = ANTHROPIC_MODEL_MID_CONVERSATION_CHANNELS[model];
		const option = config.midConversationChannels;
		if (typeof option === "object") {
			if (table) this.midConversationChannels = {
				tools: table.tools && option.tools === true,
				systemPrompts: table.systemPrompts && option.systemPrompts === true
			};
		} else if (option ?? !customEndpoint) this.midConversationChannels = table;
	}
	/** Use a client whose fetch goes through `wrapFetch` for one call. */
	clientFor(wrapFetch) {
		if (!wrapFetch || !this.sdkClient) return this.client;
		return this.sdkClient.withOptions({ fetch: wrapFetch(this.baseFetch ?? globalThis.fetch) });
	}
	async *chatStream(options) {
		const { logger } = options;
		try {
			const requestParams = this.mapCommonOptionsToAnthropic(options);
			logger.request(`activity=chat provider=anthropic model=${this.model} messages=${options.messages.length} tools=${options.tools?.length ?? 0} stream=true`, {
				provider: "anthropic",
				model: this.model
			});
			const betas = computeAnthropicBetas(options.tools, requestParams, messagesHaveFileSource(options.messages), requestParams.tools?.some((tool) => tool.name === DEFERRED_TOOL_PLACEHOLDER.name));
			const requestBetas = this.oauth ? [.../* @__PURE__ */ new Set([
				"claude-code-20250219",
				"oauth-2025-04-20",
				...betas ?? []
			])] : betas;
			const stream = await this.clientFor(options.wrapFetch).beta.messages.create({
				...requestParams,
				stream: true,
				...requestBetas && { betas: requestBetas }
			}, {
				signal: options.request?.signal,
				headers: this.requestHeaders(options.request?.headers, requestBetas)
			});
			yield* this.processAnthropicStream(stream, options, () => generateId(this.name), logger);
		} catch (error) {
			const err = error;
			const rawEvent = toRunErrorRawEvent(error);
			const retryAfterMs = toRetryAfterMs(error);
			logger.errors("anthropic.chatStream fatal", {
				error,
				source: "anthropic.chatStream"
			});
			yield {
				type: EventType.RUN_ERROR,
				model: options.model,
				timestamp: Date.now(),
				message: err.message || "Unknown error occurred",
				code: err.code || String(err.status),
				...rawEvent !== void 0 && { rawEvent },
				...retryAfterMs !== void 0 && { retryAfterMs },
				error: {
					message: err.message || "Unknown error occurred",
					code: err.code || String(err.status)
				},
				metadata: { tanstack: { source: {
					provider: this.provider,
					api: this.api,
					model: options.model
				} } }
			};
		}
	}
	/**
	* Generate structured output using Anthropic's tool-based approach.
	* Anthropic doesn't have native structured output, so we use a tool with the schema
	* and force the model to call it.
	* The outputSchema is already JSON Schema (converted in the ai layer).
	*/
	async structuredOutput(options) {
		const { chatOptions, outputSchema } = options;
		const { logger } = chatOptions;
		const requestParams = this.mapCommonOptionsToAnthropic(chatOptions, { stream: false });
		const structuredOutputTool = {
			name: "structured_output",
			description: "Use this tool to provide your response in the required structured format.",
			input_schema: {
				type: "object",
				properties: outputSchema.properties ?? {},
				required: outputSchema.required ?? []
			}
		};
		try {
			logger.request(`activity=chat provider=anthropic model=${this.model} messages=${chatOptions.messages.length} tools=${chatOptions.tools?.length ?? 0} stream=false`, {
				provider: "anthropic",
				model: this.model
			});
			const betas = computeAnthropicBetas(chatOptions.tools, requestParams, messagesHaveFileSource(chatOptions.messages));
			const requestBetas = this.oauth ? [.../* @__PURE__ */ new Set([
				"claude-code-20250219",
				"oauth-2025-04-20",
				...betas ?? []
			])] : betas;
			const response = await this.clientFor(chatOptions.wrapFetch).beta.messages.create({
				...requestParams,
				stream: false,
				tools: [structuredOutputTool],
				tool_choice: {
					type: "tool",
					name: "structured_output"
				},
				...requestBetas && { betas: requestBetas }
			}, {
				signal: chatOptions.request?.signal,
				headers: this.requestHeaders(chatOptions.request?.headers, requestBetas)
			});
			if (response.stop_reason === "max_tokens") throw new Error("anthropic.structuredOutput: the response was cut off because the maximum token limit was reached (stop_reason=max_tokens); raise modelOptions.max_tokens");
			let parsed = null;
			let rawText = "";
			for (const block of response.content) if (block.type === "tool_use" && block.name === "structured_output") {
				parsed = block.input;
				rawText = JSON.stringify(block.input);
				break;
			}
			if (parsed === null) {
				rawText = response.content.map((b) => {
					if (b.type === "text") return b.text;
					return "";
				}).join("");
				try {
					parsed = JSON.parse(rawText);
				} catch {
					throw new Error(`Failed to extract structured output from response. Content: ${rawText.slice(0, 200)}${rawText.length > 200 ? "..." : ""}`);
				}
			}
			return {
				data: parsed,
				rawText,
				usage: buildAnthropicUsage(response.usage),
				responseId: response.id,
				model: response.model
			};
		} catch (error) {
			const err = error;
			logger.errors("anthropic.structuredOutput fatal", {
				error,
				source: "anthropic.structuredOutput"
			});
			throw new Error(`Structured output generation failed: ${err.message || "Unknown error occurred"}`);
		}
	}
	requestHeaders(headers, betas) {
		if (!this.tokenAuthentication) return headers;
		const requestHeaders = new Headers(this.oauth ? this.oauthHeaders : void 0);
		new Headers(headers).forEach((value, name) => requestHeaders.set(name, value));
		if (this.oauth) {
			const configured = (requestHeaders.get("anthropic-beta") ?? "").split(",").map((value) => value.trim()).filter(Boolean);
			requestHeaders.set("anthropic-beta", [.../* @__PURE__ */ new Set([...betas ?? [], ...configured])].join(","));
		}
		return {
			...Object.fromEntries(requestHeaders),
			"x-api-key": null
		};
	}
	mapCommonOptionsToAnthropic(options, { stream = true } = {}) {
		const modelOptions = options.modelOptions;
		const replay = transformMessagesForReplay(options.messages, {
			provider: this.provider,
			api: this.api,
			model: options.model
		}, (id, { attempt }) => {
			const clean = id.replace(/[^a-zA-Z0-9_-]/g, "_");
			const suffix = attempt === 0 ? "" : `_${attempt}`;
			return clean.slice(0, 64 - suffix.length) + suffix;
		});
		const originalChanges = options.midConversationChanges?.changes ?? [];
		const mappedChanges = originalChanges.map((change) => ({
			...change,
			before: replay.boundaryMap[change.before] ?? change.before
		}));
		const grouped = /* @__PURE__ */ new Map();
		for (const change of mappedChanges) {
			const previous = grouped.get(change.before);
			grouped.set(change.before, previous ? {
				before: change.before,
				...previous.tools || change.tools ? { tools: [...previous.tools ?? [], ...change.tools ?? []] } : {},
				...previous.systemPrompts !== void 0 || change.systemPrompts !== void 0 ? { systemPrompts: (previous.systemPrompts ?? 0) + (change.systemPrompts ?? 0) } : {}
			} : change);
		}
		const uniqueOriginalBoundaries = new Set(originalChanges.map((change) => change.before)).size === originalChanges.length;
		options = {
			...options,
			messages: replay.messages,
			...options.midConversationChanges && { midConversationChanges: {
				...options.midConversationChanges,
				changes: uniqueOriginalBoundaries ? [...grouped.values()] : mappedChanges
			} }
		};
		const mid = this.midConversationRequest(options);
		const { output_config: reasoningOutputConfig, messageEffort, ...thinkingFields } = anthropicThinking(this.model, options.reasoning, this.modelReasoning);
		const formattedMessages = this.formatMessages(options.messages, mid?.systemMessages, messageEffort);
		const tools = options.tools ? mid?.tools ?? convertToolsToProviderFormat(options.tools) : void 0;
		const validProviderOptions = {};
		if (modelOptions) {
			const validKeys = [
				"cache_control",
				"container",
				"context_management",
				"mcp_servers",
				"service_tier",
				"stop_sequences",
				"tool_choice",
				"top_k",
				"temperature",
				"top_p"
			];
			const droppedKeyExemptSet = /* @__PURE__ */ new Set([...validKeys, "max_tokens"]);
			const droppedKeys = Object.keys(modelOptions).filter((key) => !droppedKeyExemptSet.has(key));
			if (droppedKeys.length > 0) options.logger.errors(`anthropic.mapCommonOptionsToAnthropic dropped unknown modelOptions key(s): ${droppedKeys.join(", ")}`, {
				source: "anthropic.mapCommonOptionsToAnthropic",
				droppedKeys,
				hint: droppedKeys.includes("system") ? "pass system prompts via the top-level `systemPrompts` option; `modelOptions.system` is no longer honored" : void 0
			});
			for (const key of validKeys) if (key in modelOptions) {
				const value = modelOptions[key];
				if (key === "tool_choice" && typeof value === "string") validProviderOptions[key] = { type: value };
				else validProviderOptions[key] = value;
			}
		}
		if (messageEffort !== void 0) delete validProviderOptions.temperature;
		const thinkingBudget = thinkingFields.thinking?.type === "enabled" ? thinkingFields.thinking.budget_tokens : void 0;
		const defaultMaxTokens = modelOptions?.max_tokens ?? getAnthropicDefaultMaxTokens(this.model, { stream });
		const maxTokens = thinkingBudget && thinkingBudget >= defaultMaxTokens ? thinkingBudget + 1 : defaultMaxTokens;
		const systemBlocks = (() => {
			const normalized = mid?.systemPrompts ?? normalizeSystemPrompts(options.systemPrompts);
			if (normalized.length === 0 && !this.oauth) return void 0;
			const blocks = normalized.map((p) => ({
				type: "text",
				text: sanitizeUnicode(p.content),
				...p.metadata?.cache_control && { cache_control: p.metadata.cache_control }
			}));
			return this.oauth ? [{
				type: "text",
				text: "You are Claude Code, Anthropic's official CLI for Claude."
			}, ...blocks] : blocks;
		})();
		const combinedSchema = options.outputSchema;
		const outputConfig = combinedSchema || reasoningOutputConfig ? { output_config: {
			...reasoningOutputConfig,
			...combinedSchema ? { format: {
				type: "json_schema",
				schema: combinedSchema
			} } : {}
		} } : void 0;
		const toolSkills = options.tools?.map((tool) => getAnthropicProviderToolKind(tool) === "code_execution" ? readCodeExecutionSkills(tool) : void 0).find((skills) => skills && skills.length > 0);
		if (toolSkills && toolSkills.length > 0) validProviderOptions.container = {
			id: (validProviderOptions.container ?? void 0)?.id ?? null,
			skills: toolSkills
		};
		const requestParams = {
			model: options.model,
			max_tokens: maxTokens,
			messages: formattedMessages,
			...systemBlocks !== void 0 && { system: systemBlocks },
			...tools !== void 0 && { tools },
			...validProviderOptions,
			...thinkingFields,
			...outputConfig ?? {}
		};
		validateTextProviderOptions(requestParams);
		const canForceTool = !(thinkingFields.thinking !== void 0 && thinkingFields.thinking.type !== "disabled") && !ANTHROPIC_NO_FORCED_TOOL_MODELS.has(this.model);
		return {
			...tools?.length && options.toolChoice !== void 0 ? { tool_choice: toAnthropicToolChoice(options.toolChoice, { canForceTool }) } : void 0,
			...applyAnthropicPromptCache(requestParams, options.promptCache)
		};
	}
	/**
	* Mid-conversation changes: the start prompts for `system`, the tool-mode
	* `tools`, and a `system` message for each change by message index.
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
		const toolMode = channels.tools && split.startTools.length > 0 && ![...split.startTools, ...split.addedTools].some((tool) => getAnthropicProviderToolKind(tool) !== void 0);
		const systemMessages = /* @__PURE__ */ new Map();
		for (const [before, change] of split.at) {
			const content = [...channels.systemPrompts ? change.systemPrompts.map((p) => ({
				type: "text",
				text: sanitizeUnicode(p.content)
			})) : [], ...toolMode ? change.tools.map((tool) => ({
				type: "tool_addition",
				tool: {
					type: "tool_reference",
					name: tool.name
				}
			})) : []];
			if (content.length === 0) continue;
			const message = {
				role: "system",
				content
			};
			systemMessages.set(before, message);
		}
		return {
			...channels.systemPrompts && { systemPrompts: split.startSystemPrompts },
			...toolMode && { tools: [
				...convertToolsToProviderFormat(split.startTools),
				DEFERRED_TOOL_PLACEHOLDER,
				...convertToolsToProviderFormat(split.addedTools).map((tool) => ({
					...tool,
					defer_loading: true
				}))
			] },
			systemMessages
		};
	}
	/**
	* Anthropic supports `output_config.format` + `tools` in a single streaming
	* Messages request only for Claude 4.5+ (GA 2026-01-29). For 4.4 and
	* earlier we keep the forced-tool-use workaround in
	* {@link structuredOutput} via the engine's finalization path.
	*/
	supportsCombinedToolsAndSchema() {
		return ANTHROPIC_COMBINED_TOOLS_AND_SCHEMA_MODELS.has(this.model);
	}
	convertContentPartToAnthropic(part) {
		switch (part.type) {
			case "text": {
				const metadata = part.metadata;
				return {
					type: "text",
					text: sanitizeUnicode(part.content),
					...metadata
				};
			}
			case "image": {
				const metadata = part.metadata;
				let imageSource;
				if (isFileSource(part.source)) imageSource = {
					type: "file",
					file_id: fileReferenceFor(part.source, this.name)
				};
				else if (part.source.type === "data") imageSource = {
					type: "base64",
					data: part.source.value,
					media_type: part.source.mimeType
				};
				else imageSource = {
					type: "url",
					url: part.source.value
				};
				return {
					type: "image",
					source: imageSource,
					...metadata?.cache_control !== void 0 && { cache_control: metadata.cache_control }
				};
			}
			case "document": {
				const metadata = part.metadata;
				const title = metadata?.title ?? metadata?.filename;
				let docSource;
				if (isFileSource(part.source)) docSource = {
					type: "file",
					file_id: fileReferenceFor(part.source, this.name)
				};
				else if (part.source.type === "data") docSource = {
					type: "base64",
					data: part.source.value,
					media_type: part.source.mimeType
				};
				else docSource = {
					type: "url",
					url: part.source.value
				};
				return {
					type: "document",
					source: docSource,
					...metadata?.cache_control !== void 0 && { cache_control: metadata.cache_control },
					...metadata?.citations !== void 0 && { citations: metadata.citations },
					...metadata?.context !== void 0 && { context: metadata.context },
					...title !== void 0 && { title }
				};
			}
			case "audio":
			case "video": throw new Error(`Anthropic does not support ${part.type} content directly`);
			default: throw new Error(`Unsupported content part type: ${part.type}`);
		}
	}
	formatMessages(messages, systemMessages, messageEffort) {
		const formattedMessages = [];
		const pendingSystemMessages = [];
		for (const [index, message] of messages.entries()) {
			const role = message.role;
			const systemMessage = systemMessages?.get(index);
			if (systemMessage) pendingSystemMessages.push(systemMessage);
			if (role === "assistant") {
				formattedMessages.push(...pendingSystemMessages.splice(0));
				const stored = messageEffort && this.storedEffort(message);
				if (stored) formattedMessages.push(effortMessage(stored));
			}
			if (role === "tool" && message.toolCallId) {
				const toolContent = message.content;
				formattedMessages.push({
					role: "user",
					content: [{
						type: "tool_result",
						tool_use_id: message.toolCallId,
						content: Array.isArray(toolContent) ? toolContent.map((part) => this.convertContentPartToAnthropic(part)) : typeof toolContent === "string" ? sanitizeUnicode(toolContent) : "",
						...message.error !== void 0 && { is_error: true }
					}]
				});
				continue;
			}
			const ordered = role === "assistant" ? orderedAssistantBlocks(message) : void 0;
			if (ordered) {
				const contentBlocks = [];
				for (const block of ordered) if (block.type === "thinking") this.appendThinkingBlocks(contentBlocks, [block.thinking]);
				else if (block.type === "tool-call") this.appendToolCallBlocks(contentBlocks, block.toolCall);
				else contentBlocks.push({
					type: "text",
					text: sanitizeUnicode(block.text)
				});
				formattedMessages.push({
					role: "assistant",
					content: contentBlocks.length > 0 ? contentBlocks : ""
				});
				continue;
			}
			if (role === "assistant" && message.toolCalls?.length) {
				const contentBlocks = [];
				this.appendThinkingBlocks(contentBlocks, message.thinking);
				if (message.content) {
					const content = typeof message.content === "string" ? message.content : "";
					const textBlock = {
						type: "text",
						text: sanitizeUnicode(content)
					};
					contentBlocks.push(textBlock);
				}
				for (const toolCall of message.toolCalls) this.appendToolCallBlocks(contentBlocks, toolCall);
				formattedMessages.push({
					role: "assistant",
					content: contentBlocks
				});
				continue;
			}
			if (role === "assistant") {
				const contentBlocks = [];
				this.appendThinkingBlocks(contentBlocks, message.thinking);
				if (Array.isArray(message.content)) for (const part of message.content) contentBlocks.push(this.convertContentPartToAnthropic(part));
				else if (message.content) contentBlocks.push({
					type: "text",
					text: sanitizeUnicode(message.content)
				});
				formattedMessages.push({
					role: "assistant",
					content: contentBlocks.length > 0 ? contentBlocks : ""
				});
				continue;
			}
			if (role === "user" && Array.isArray(message.content)) {
				const contentBlocks = message.content.map((part) => this.convertContentPartToAnthropic(part));
				formattedMessages.push({
					role: "user",
					content: contentBlocks
				});
				continue;
			}
			formattedMessages.push({
				role: "user",
				content: typeof message.content === "string" ? sanitizeUnicode(message.content) : message.content ? message.content.map((c) => this.convertContentPartToAnthropic(c)) : ""
			});
		}
		const endSystemMessage = systemMessages?.get(messages.length);
		if (endSystemMessage) pendingSystemMessages.push(endSystemMessage);
		formattedMessages.push(...pendingSystemMessages);
		const merged = this.mergeConsecutiveSameRoleMessages(formattedMessages);
		return messageEffort ? [...merged, effortMessage(messageEffort)] : merged;
	}
	/** The effort an assistant message of this provider was made with. */
	storedEffort(message) {
		const tanstack = message.metadata?.tanstack;
		const effort = tanstack?.reasoningEffort;
		return tanstack?.source?.provider === this.provider && tanstack.source.api === this.api && isAnthropicEffort(effort) ? effort : void 0;
	}
	appendThinkingBlocks(contentBlocks, thinkingParts) {
		if (!thinkingParts?.length) return;
		for (const thinking of thinkingParts) {
			if (!thinking.signature && (thinking.redacted || !this.allowEmptySignature)) continue;
			if (thinking.redacted) {
				if (!thinking.signature) continue;
				contentBlocks.push({
					type: "redacted_thinking",
					data: thinking.signature
				});
				continue;
			}
			const block = {
				type: "thinking",
				thinking: sanitizeUnicode(thinking.content),
				signature: thinking.signature ?? ""
			};
			contentBlocks.push(block);
		}
	}
	/** A tool call as a `tool_use` block, or a server tool as its two blocks. */
	appendToolCallBlocks(contentBlocks, toolCall) {
		let parsedInput = {};
		try {
			const parsed = toolCall.function.arguments ? JSON.parse(sanitizeJsonArguments(toolCall.function.arguments)) : {};
			parsedInput = parsed && typeof parsed === "object" ? parsed : {};
		} catch {
			parsedInput = {};
		}
		const serverMeta = readAnthropicServerToolMetadata(toolCall.metadata);
		if (serverMeta) {
			const serverToolUseBlock = {
				type: "server_tool_use",
				id: toolCall.id,
				name: serverMeta.serverToolType,
				input: parsedInput
			};
			contentBlocks.push(serverToolUseBlock);
			contentBlocks.push(buildServerToolResultBlock(toolCall.id, serverMeta));
			return;
		}
		const toolUseBlock = {
			type: "tool_use",
			id: toolCall.id,
			name: toolCall.function.name,
			input: parsedInput
		};
		contentBlocks.push(toolUseBlock);
	}
	/**
	* Merge consecutive messages of the same role into a single message.
	* Anthropic's API requires strictly alternating user/assistant roles.
	* Tool results are wrapped as role:'user' messages, which can collide
	* with actual user messages in multi-turn conversations.
	*
	* Also filters out empty assistant messages (e.g., from a previous failed request).
	*/
	mergeConsecutiveSameRoleMessages(messages) {
		const merged = [];
		for (const msg of messages) {
			if (msg.role === "assistant") {
				if (!(Array.isArray(msg.content) ? msg.content.length > 0 : typeof msg.content === "string" && msg.content.length > 0)) continue;
			}
			const prev = merged[merged.length - 1];
			if (prev && prev.role === msg.role && !("output_config" in prev) && !("output_config" in msg)) {
				const prevBlocks = Array.isArray(prev.content) ? prev.content : typeof prev.content === "string" && prev.content ? [{
					type: "text",
					text: prev.content
				}] : [];
				const msgBlocks = Array.isArray(msg.content) ? msg.content : typeof msg.content === "string" && msg.content ? [{
					type: "text",
					text: msg.content
				}] : [];
				prev.content = [...prevBlocks, ...msgBlocks];
			} else merged.push({ ...msg });
		}
		const last = merged.at(-1);
		if (last?.role === "assistant" && Array.isArray(last.content) && last.content.every((block) => block.type === "thinking" || block.type === "redacted_thinking")) merged.pop();
		for (const msg of merged) if (Array.isArray(msg.content)) {
			const seenToolResultIds = /* @__PURE__ */ new Set();
			msg.content = msg.content.filter((block) => {
				if (block.type === "tool_result" && block.tool_use_id) {
					if (seenToolResultIds.has(block.tool_use_id)) return false;
					seenToolResultIds.add(block.tool_use_id);
				}
				return true;
			});
		}
		return merged;
	}
	async *processAnthropicStream(stream, options, genId, logger) {
		let model = options.model;
		let responseId;
		const source = {
			provider: this.provider,
			api: this.api,
			model: options.model
		};
		const { messageEffort } = anthropicThinking(this.model, options.reasoning, this.modelReasoning);
		const effortMetadata = messageEffort ? { metadata: { tanstack: { reasoningEffort: messageEffort } } } : {};
		let accumulatedContent = "";
		let accumulatedThinking = "";
		let accumulatedSignature = "";
		const toolCallsMap = /* @__PURE__ */ new Map();
		let currentToolIndex = -1;
		let currentServerTool = null;
		const completedServerTools = /* @__PURE__ */ new Map();
		const runId = options.runId ?? genId();
		const threadId = options.threadId ?? genId();
		const messageId = genId();
		let stepId = null;
		let reasoningMessageId = null;
		let hasClosedReasoning = false;
		let hasEmittedRunStarted = false;
		let hasEmittedTextMessageStart = false;
		let hasEmittedRunFinished = false;
		let currentBlockType = null;
		let messageStartUsage;
		try {
			for await (const event of stream) {
				if (event.type === "message_start") {
					responseId = event.message.id;
					model = event.message.model;
				}
				logger.provider(`provider=anthropic type=${event.type}`, { chunk: event });
				if (!hasEmittedRunStarted) {
					hasEmittedRunStarted = true;
					yield {
						type: EventType.RUN_STARTED,
						runId,
						threadId,
						model,
						timestamp: Date.now(),
						parentRunId: options.parentRunId,
						metadata: { tanstack: { source } }
					};
				}
				if (event.type === "message_start") messageStartUsage = event.message.usage;
				else if (event.type === "content_block_start") {
					currentBlockType = event.content_block.type;
					if (event.content_block.type === "tool_use") {
						currentToolIndex++;
						toolCallsMap.set(currentToolIndex, {
							id: event.content_block.id,
							name: event.content_block.name,
							input: JSON.stringify(event.content_block.input) ?? "",
							started: false,
							hasInputDelta: false
						});
					} else if (event.content_block.type === "server_tool_use") currentServerTool = {
						id: event.content_block.id,
						name: event.content_block.name,
						input: ""
					};
					else if (event.content_block.type === "web_fetch_tool_result" || event.content_block.type === "web_search_tool_result") {
						const content = event.content_block.content;
						const errorBlock = !Array.isArray(content) && (content.type === "web_fetch_tool_result_error" || content.type === "web_search_tool_result_error") ? content : null;
						if (errorBlock) logger.errors(`anthropic.${event.content_block.type} error_code=${errorBlock.error_code}`, {
							toolUseId: event.content_block.tool_use_id,
							blockType: event.content_block.type,
							errorCode: errorBlock.error_code,
							source: "anthropic.processAnthropicStream"
						});
						const serverTool = completedServerTools.get(event.content_block.tool_use_id);
						if (serverTool) {
							completedServerTools.delete(serverTool.id);
							let parsedInput = {};
							try {
								const parsed = serverTool.input ? JSON.parse(serverTool.input) : {};
								parsedInput = parsed && typeof parsed === "object" ? parsed : {};
							} catch {
								parsedInput = {};
							}
							const serverToolMetadata = {
								providerExecuted: true,
								anthropic: {
									serverToolType: serverTool.name,
									resultBlockType: event.content_block.type,
									result: content
								}
							};
							currentToolIndex++;
							yield {
								type: EventType.TOOL_CALL_START,
								toolCallId: serverTool.id,
								toolCallName: serverTool.name,
								toolName: serverTool.name,
								parentMessageId: messageId,
								model,
								timestamp: Date.now(),
								index: currentToolIndex,
								metadata: serverToolMetadata
							};
							yield {
								type: EventType.TOOL_CALL_END,
								toolCallId: serverTool.id,
								toolCallName: serverTool.name,
								toolName: serverTool.name,
								model,
								timestamp: Date.now(),
								input: parsedInput
							};
							hasEmittedTextMessageStart = false;
						}
					} else if (event.content_block.type === "thinking") {
						accumulatedThinking = "";
						accumulatedSignature = "";
						hasClosedReasoning = false;
						stepId = genId();
						reasoningMessageId = genId();
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
					} else if (event.content_block.type === "redacted_thinking") {
						const redactedId = `${REDACTED_THINKING_ID_PREFIX}${genId()}`;
						yield {
							type: EventType.REASONING_START,
							messageId: redactedId,
							model,
							timestamp: Date.now()
						};
						yield {
							type: EventType.REASONING_MESSAGE_START,
							messageId: redactedId,
							role: "reasoning",
							model,
							timestamp: Date.now()
						};
						yield {
							type: EventType.STEP_STARTED,
							stepName: redactedId,
							stepId: redactedId,
							model,
							timestamp: Date.now(),
							stepType: "thinking"
						};
						yield {
							type: EventType.STEP_FINISHED,
							stepName: redactedId,
							stepId: redactedId,
							model,
							timestamp: Date.now(),
							delta: "",
							content: ""
						};
						yield {
							type: EventType.REASONING_ENCRYPTED_VALUE,
							subtype: "message",
							entityId: redactedId,
							encryptedValue: event.content_block.data,
							model,
							timestamp: Date.now()
						};
						yield {
							type: EventType.REASONING_MESSAGE_END,
							messageId: redactedId,
							model,
							timestamp: Date.now()
						};
						yield {
							type: EventType.REASONING_END,
							messageId: redactedId,
							model,
							timestamp: Date.now()
						};
					}
				} else if (event.type === "content_block_delta") {
					if (event.delta.type === "text_delta") {
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
						}
						if (!hasEmittedTextMessageStart) {
							hasEmittedTextMessageStart = true;
							yield {
								type: EventType.TEXT_MESSAGE_START,
								messageId,
								model,
								timestamp: Date.now(),
								role: "assistant"
							};
						}
						const delta = event.delta.text;
						accumulatedContent += delta;
						yield {
							type: EventType.TEXT_MESSAGE_CONTENT,
							messageId,
							model,
							timestamp: Date.now(),
							delta,
							content: accumulatedContent
						};
					} else if (event.delta.type === "thinking_delta" && reasoningMessageId) {
						const delta = event.delta.thinking;
						accumulatedThinking += delta;
						yield {
							type: EventType.REASONING_MESSAGE_CONTENT,
							messageId: reasoningMessageId,
							delta,
							model,
							timestamp: Date.now()
						};
						yield {
							type: EventType.STEP_FINISHED,
							stepName: stepId || genId(),
							stepId: stepId || genId(),
							model,
							timestamp: Date.now(),
							delta,
							content: accumulatedThinking
						};
					} else if (event.delta.type === "signature_delta") accumulatedSignature += event.delta.signature || "";
					else if (event.delta.type === "input_json_delta") {
						if (currentBlockType === "tool_use") {
							const existing = toolCallsMap.get(currentToolIndex);
							if (existing) {
								if (!existing.started) {
									existing.started = true;
									yield {
										type: EventType.TOOL_CALL_START,
										toolCallId: existing.id,
										toolCallName: existing.name,
										toolName: existing.name,
										parentMessageId: messageId,
										model,
										timestamp: Date.now(),
										index: currentToolIndex
									};
								}
								if (!existing.hasInputDelta) {
									existing.input = "";
									existing.hasInputDelta = true;
								}
								existing.input += event.delta.partial_json;
								yield {
									type: EventType.TOOL_CALL_ARGS,
									toolCallId: existing.id,
									model,
									timestamp: Date.now(),
									delta: event.delta.partial_json,
									args: existing.input
								};
							}
						} else if (currentBlockType === "server_tool_use" && currentServerTool) currentServerTool.input += event.delta.partial_json;
					}
				} else if (event.type === "content_block_stop") {
					if (currentBlockType === "thinking") {
						if (accumulatedSignature && stepId && reasoningMessageId) {
							yield {
								type: EventType.STEP_FINISHED,
								stepName: stepId,
								stepId,
								model,
								timestamp: Date.now(),
								delta: "",
								content: accumulatedThinking
							};
							yield {
								type: EventType.REASONING_ENCRYPTED_VALUE,
								subtype: "message",
								entityId: reasoningMessageId,
								encryptedValue: accumulatedSignature,
								model,
								timestamp: Date.now()
							};
						}
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
						}
					} else if (currentBlockType === "tool_use") {
						const existing = toolCallsMap.get(currentToolIndex);
						if (existing) {
							if (!existing.started) {
								existing.started = true;
								yield {
									type: EventType.TOOL_CALL_START,
									toolCallId: existing.id,
									toolCallName: existing.name,
									toolName: existing.name,
									parentMessageId: messageId,
									model,
									timestamp: Date.now(),
									index: currentToolIndex
								};
							}
							let parsedInput;
							try {
								parsedInput = JSON.parse(existing.input);
							} catch {}
							yield {
								type: EventType.TOOL_CALL_END,
								toolCallId: existing.id,
								toolCallName: existing.name,
								toolName: existing.name,
								model,
								timestamp: Date.now(),
								args: existing.input,
								...parsedInput === void 0 ? {} : { input: parsedInput }
							};
							hasEmittedTextMessageStart = false;
						}
					} else if (currentBlockType === "server_tool_use") {
						if (currentServerTool) {
							logger.provider(`provider=anthropic server_tool_use name=${currentServerTool.name}`, {
								toolUseId: currentServerTool.id,
								name: currentServerTool.name,
								input: currentServerTool.input
							});
							completedServerTools.set(currentServerTool.id, currentServerTool);
						}
						currentServerTool = null;
					} else if (currentBlockType === "web_fetch_tool_result" || currentBlockType === "web_search_tool_result") {} else if (hasEmittedTextMessageStart && accumulatedContent) yield {
						type: EventType.TEXT_MESSAGE_END,
						messageId,
						model,
						timestamp: Date.now()
					};
					currentBlockType = null;
				} else if (event.type === "message_stop") {
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
					}
					if (!hasEmittedRunFinished) yield {
						type: EventType.RUN_FINISHED,
						...responseId !== void 0 && { responseId },
						...effortMetadata,
						runId,
						threadId,
						model,
						timestamp: Date.now(),
						finishReason: "stop"
					};
				} else if (event.type === "message_delta") {
					if (event.delta.stop_reason) {
						hasEmittedRunFinished = true;
						const usage = buildAnthropicUsage(event.usage, messageStartUsage);
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
						}
						switch (event.delta.stop_reason) {
							case "tool_use":
								yield {
									type: EventType.RUN_FINISHED,
									...responseId !== void 0 && { responseId },
									...effortMetadata,
									runId,
									threadId,
									model,
									timestamp: Date.now(),
									finishReason: "tool_calls",
									usage
								};
								break;
							case "max_tokens":
								if (options.modelOptions?.max_tokens == null) {
									const defaultedMaxTokens = getAnthropicDefaultMaxTokens(model);
									logger.warn(`anthropic response truncated at the default max_tokens (${defaultedMaxTokens}) for model=${model}; pass maxTokens (or modelOptions.max_tokens) to raise the output ceiling`, {
										source: "anthropic.processAnthropicStream",
										model,
										defaultedMaxTokens
									});
								}
								yield {
									type: EventType.RUN_ERROR,
									model,
									timestamp: Date.now(),
									message: "The response was cut off because the maximum token limit was reached.",
									code: "max_tokens",
									error: {
										message: "The response was cut off because the maximum token limit was reached.",
										code: "max_tokens"
									},
									usage
								};
								break;
							default: yield {
								type: EventType.RUN_FINISHED,
								...responseId !== void 0 && { responseId },
								...effortMetadata,
								runId,
								threadId,
								model,
								timestamp: Date.now(),
								finishReason: "stop",
								usage
							};
						}
					}
				}
			}
		} catch (error) {
			const err = error;
			const rawEvent = toRunErrorRawEvent(error);
			const retryAfterMs = toRetryAfterMs(error);
			logger.errors("anthropic.processAnthropicStream fatal", {
				error,
				source: "anthropic.processAnthropicStream"
			});
			yield {
				type: EventType.RUN_ERROR,
				model,
				metadata: { tanstack: { source } },
				timestamp: Date.now(),
				message: err.message || "Unknown error occurred",
				code: err.code || String(err.status),
				...rawEvent !== void 0 && { rawEvent },
				...retryAfterMs !== void 0 && { retryAfterMs },
				error: {
					message: err.message || "Unknown error occurred",
					code: err.code || String(err.status)
				}
			};
		}
	}
};
/**
* Creates an Anthropic chat adapter with explicit API key.
* Type resolution happens here at the call site.
*/
function createAnthropicChat(model, apiKey, config) {
	return new AnthropicTextAdapter({
		apiKey,
		...config
	}, model);
}
/**
* Creates an Anthropic chat adapter with an injected Messages client.
* Type resolution happens here at the call site.
*/
function createAnthropicChatWithClient(model, client) {
	return new AnthropicTextAdapter({ client }, model);
}
/**
* Creates an Anthropic text adapter with automatic API key detection.
* Type resolution happens here at the call site.
*/
function anthropicText(model, config) {
	return new AnthropicTextAdapter(config ?? {}, model);
}
//#endregion
export { AnthropicTextAdapter, anthropicText, computeAnthropicBetas, createAnthropicChat, createAnthropicChatWithClient, messagesHaveFileSource };

//# sourceMappingURL=text.js.map