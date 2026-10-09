import { LLMGATEWAY_MODEL_INPUT_MODALITIES } from "../model-meta.js";
import { LLMGATEWAY_MODEL_REASONING } from "../model-reasoning.js";
import { getLLMGatewayApiKeyFromEnv, withLLMGatewayDefaults } from "../utils/client.js";
import OpenAI from "openai";
import { OpenAIBaseChatCompletionsTextAdapter } from "@tanstack/openai-base";
//#region src/adapters/text.ts
/**
* LLM Gateway Text (Chat) Adapter
*
* Tree-shakeable adapter for LLM Gateway chat/text completion. LLM Gateway
* exposes one OpenAI-compatible Chat Completions endpoint that routes to
* hundreds of models across many providers, so the adapter drives it with
* the OpenAI SDK via a `baseURL` override (the same pattern as `ai-grok`
* and `ai-groq`).
*
* Model ids are open-ended: curated ids get per-model type metadata, and
* any other id from https://llmgateway.io/models works with text-only
* defaults. A `provider/model` id (e.g. `openai/gpt-5.5`) pins routing to
* that provider; a bare id lets the gateway pick.
*/
var LLMGatewayTextAdapter = class extends OpenAIBaseChatCompletionsTextAdapter {
	kind = "text";
	name = "llmgateway";
	inputModalities = LLMGATEWAY_MODEL_INPUT_MODALITIES[this.model];
	constructor(config, model) {
		super(model, "llmgateway", new OpenAI(withLLMGatewayDefaults(config)), config);
	}
	modelReasoning(model) {
		return LLMGATEWAY_MODEL_REASONING[model];
	}
	/**
	* Surfaces reasoning deltas during streaming. LLM Gateway normalizes
	* upstream reasoning output to `delta.reasoning_content` on the OpenAI
	* Chat Completions wire format (the DeepSeek-style field most
	* OpenAI-compatible providers emit); some routed providers emit
	* `delta.reasoning` instead, so both are read.
	*/
	extractReasoning(chunk) {
		const delta = chunk.choices[0]?.delta;
		const raw = delta?.reasoning_content ?? delta?.reasoning;
		if (typeof raw === "string" && raw.length > 0) return { text: raw };
	}
};
/**
* Creates an LLM Gateway text adapter with explicit API key.
*
* @example
* ```typescript
* const adapter = createLLMGatewayText('gpt-5.6-terra', "llmgtwy_...");
* ```
*/
function createLLMGatewayText(model, apiKey, config) {
	return new LLMGatewayTextAdapter({
		apiKey,
		...config
	}, model);
}
/**
* Creates an LLM Gateway text adapter with API key from
* `LLM_GATEWAY_API_KEY`.
*
* @example
* ```typescript
* const adapter = llmGatewayText('gpt-5.6-terra');
* ```
*/
function llmGatewayText(model, config) {
	return createLLMGatewayText(model, getLLMGatewayApiKeyFromEnv(), config);
}
//#endregion
export { LLMGatewayTextAdapter, createLLMGatewayText, llmGatewayText };

//# sourceMappingURL=text.js.map