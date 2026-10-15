import { openAIModelUsesExplicitPromptCache } from "../model-meta.js";
import { chatPromptCacheFields, responsesPromptCacheFields } from "../prompt-cache.js";
import { applyRequestQuirks, applyThinking, replayReasoning, sessionHeaders } from "./quirks.js";
import { OpenAIBaseChatCompletionsTextAdapter, OpenAIBaseResponsesTextAdapter } from "@tanstack/openai-base";
//#region src/compatible/adapter.ts
/** The runtime reasoning data of a `models` entry. `undefined`: not declared. */
function modelReasoning(reasoning) {
	if (reasoning === void 0) return void 0;
	if (reasoning === false) return false;
	return reasoning === true ? { budget: false } : {
		map: reasoning,
		budget: false
	};
}
/**
* Generic OpenAI-compatible adapter over the Chat Completions API
* (`{baseURL}/chat/completions`). Capability type-args are supplied by the
* `openaiCompatible` factory from the user's `models` tuple.
*/
var OpenAICompatibleChatAdapter = class extends OpenAIBaseChatCompletionsTextAdapter {
	kind = "text";
	inputModalities;
	maxTokensKey = "max_tokens";
	compat;
	reasoning;
	constructor(client, model, name, options, config = {}) {
		super(model, name, client, options);
		this.compat = config.compat;
		this.inputModalities = config.input ?? ["text", "image"];
		this.reasoning = modelReasoning(config.reasoning);
	}
	/**
	* The request with the `chat({ promptCache })` fields, then the provider's
	* quirks: the thinking fields for
	* `reasoning`, and (with `compat`) the instruction role, the token field,
	* `store`, strict tools, `tool_stream`, and cache markers.
	*/
	mapOptionsToRequest(options) {
		const params = {
			...chatPromptCacheFields(options.promptCache, {
				baseURL: this.client.baseURL ?? "",
				longRetention: this.compat?.supportsLongCacheRetention !== false
			}),
			...super.mapOptionsToRequest(options)
		};
		if (!options.reasoning && !this.compat) return params;
		const body = { ...params };
		if (options.reasoning) applyThinking(body, options.reasoning, this.reasoning, this.compat ?? {});
		if (this.compat) applyRequestQuirks(body, this.compat, this.reasoning !== void 0 && this.reasoning !== false, options.promptCache);
		for (const key of Object.keys(params)) if (!(key in body)) Reflect.deleteProperty(params, key);
		return Object.assign(params, body);
	}
	/**
	* An assistant message carries its thinking back as `reasoning_content`
	* when the provider needs it (DeepSeek fails the second turn without it).
	*/
	convertMessage(message) {
		const converted = super.convertMessage(message);
		if (!(message.role === "assistant" && this.compat?.requiresReasoningContentOnAssistantMessages === true && this.reasoning !== false)) return converted;
		return Object.assign(converted, { reasoning_content: replayReasoning(message.thinking) });
	}
	includeUsageInStream() {
		return this.compat?.supportsUsageInStreaming !== false;
	}
	requestHeaders(options) {
		return this.compat ? sessionHeaders(this.compat, options.promptCache?.key ?? options.conversationId ?? options.threadId) : void 0;
	}
	/**
	* OpenAI-compatible reasoning providers stream their thinking outside the
	* OpenAI wire format, on `delta.reasoning_content` (DeepSeek, Qwen, GLM,
	* Kimi, most vLLM/SGLang deployments), `delta.reasoning` (a smaller set of
	* gateways), or `delta.reasoning_text` (GitHub Copilot). The base adapter has no reasoning hook by default because plain
	* Chat Completions carries none, so without this the thinking was dropped
	* silently and the only way to see it was to monkey-patch the prototype.
	*
	* Same shape as the dedicated adapters that already do this
	* (`@tanstack/ai-cloudflare`, `@tanstack/ai-byteplus`, `@tanstack/ai-groq`).
	* Providers that send neither field are unaffected.
	*/
	extractReasoning(chunk) {
		const delta = chunk.choices[0]?.delta;
		const raw = delta?.reasoning_content ?? delta?.reasoning ?? delta?.reasoning_text;
		return typeof raw === "string" && raw.length > 0 ? { text: raw } : void 0;
	}
};
/**
* Generic OpenAI-compatible adapter over the Responses API
* (`{baseURL}/responses`). For the rare compatible provider that implements
* Responses (e.g. Azure OpenAI).
*/
var OpenAICompatibleResponsesAdapter = class extends OpenAIBaseResponsesTextAdapter {
	kind = "text";
	inputModalities;
	maxTokensKey = "max_output_tokens";
	compat;
	constructor(client, model, name, options, config = {}) {
		super(model, name, client, options);
		this.compat = config.compat;
		this.inputModalities = config.input ?? ["text", "image"];
	}
	/** The request, plus the prompt cache fields for `chat({ promptCache })`. */
	mapOptionsToRequest(options) {
		return {
			...responsesPromptCacheFields(options.promptCache, {
				explicitMode: this.compat?.supportsExplicitPromptCacheMode ?? openAIModelUsesExplicitPromptCache(options.model),
				longRetention: this.compat?.supportsLongCacheRetention !== false
			}),
			...super.mapOptionsToRequest(options)
		};
	}
};
//#endregion
export { OpenAICompatibleChatAdapter, OpenAICompatibleResponsesAdapter };

//# sourceMappingURL=adapter.js.map