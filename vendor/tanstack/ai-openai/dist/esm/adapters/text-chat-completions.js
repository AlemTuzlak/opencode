import { getOpenAIApiKeyFromEnv } from "../utils/client.js";
import { OPENAI_MODEL_INPUT_MODALITIES } from "../model-meta.js";
import { chatPromptCacheFields } from "../prompt-cache.js";
import OpenAI$1 from "openai";
import { OpenAIBaseChatCompletionsTextAdapter } from "@tanstack/openai-base";
//#region src/adapters/text-chat-completions.ts
/**
* OpenAI Text adapter targeting the **Chat Completions** API
* (`/v1/chat/completions`).
*
* Sibling of `OpenAITextAdapter`, which targets the Responses API. Use this
* one when you want the older, more broadly compatible wire format (e.g. to
* compare streaming behaviour across providers that don't speak Responses yet).
*/
var OpenAIChatCompletionsTextAdapter = class extends OpenAIBaseChatCompletionsTextAdapter {
	kind = "text";
	inputModalities = OPENAI_MODEL_INPUT_MODALITIES[this.model];
	constructor(config, model) {
		super(model, "openai-chat", new OpenAI$1(config), config);
	}
	/** The request, plus the prompt cache fields for `chat({ promptCache })`. */
	mapOptionsToRequest(options) {
		return {
			...chatPromptCacheFields(options.promptCache, {
				baseURL: this.client.baseURL ?? "",
				longRetention: true
			}),
			...super.mapOptionsToRequest(options)
		};
	}
};
function createOpenaiChatCompletions(model, apiKey, config) {
	return new OpenAIChatCompletionsTextAdapter({
		apiKey,
		...config
	}, model);
}
function openaiChatCompletions(model, config) {
	return createOpenaiChatCompletions(model, getOpenAIApiKeyFromEnv(), config);
}
//#endregion
export { OpenAIChatCompletionsTextAdapter, createOpenaiChatCompletions, openaiChatCompletions };

//# sourceMappingURL=text-chat-completions.js.map