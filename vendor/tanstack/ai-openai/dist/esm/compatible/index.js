import { OpenAICompatibleChatAdapter, OpenAICompatibleResponsesAdapter } from "./adapter.js";
import OpenAI$1 from "openai";
//#region src/compatible/index.ts
/** One model's reasoning and quirks: its `models` entry over the provider's `compat`. */
function modelConfig(models, model, compat) {
	const entry = models.find((item) => typeof item !== "string" && item.name === model);
	const own = typeof entry === "object" && "reasoning" in entry ? entry : void 0;
	const ownCompat = typeof entry === "object" && "compat" in entry ? entry.compat : void 0;
	const merged = compat || ownCompat ? {
		...compat,
		...ownCompat
	} : void 0;
	return {
		...typeof entry === "object" && "input" in entry && entry.input !== void 0 ? { input: entry.input } : {},
		...own?.reasoning !== void 0 ? { reasoning: own.reasoning } : {},
		...merged ? { compat: merged } : {}
	};
}
var DEFAULT_NAME = "openai-compatible";
/**
* Configure an OpenAI-compatible provider once, then select a model per call.
*
* @example
* ```ts
* const deepseek = openaiCompatible({
*   name: 'deepseek',
*   baseURL: 'https://api.deepseek.com/v1',
*   apiKey: process.env.DEEPSEEK_KEY!,
*   models: ['deepseek-chat', 'deepseek-reasoner'],
* })
* chat({ adapter: deepseek('deepseek-chat'), messages })
* ```
*/
function openaiCompatible(config) {
	const { name = DEFAULT_NAME, models, api = "chat-completions", strictFallbackWarning, compat, ...clientOptions } = config;
	const client = new OpenAI$1(clientOptions);
	return (model) => {
		if (api === "responses") return new OpenAICompatibleResponsesAdapter(client, model, name, {
			strictFallbackWarning,
			fetch: clientOptions.fetch
		}, modelConfig(models, model, compat));
		return new OpenAICompatibleChatAdapter(client, model, name, {
			strictFallbackWarning,
			fetch: clientOptions.fetch
		}, modelConfig(models, model, compat));
	};
}
/**
* One-shot helper: build a single-model OpenAI-compatible adapter inline.
*
* @example
* ```ts
* chat({
*   adapter: openaiCompatibleText('deepseek-chat', {
*     baseURL: 'https://api.deepseek.com/v1',
*     apiKey: process.env.DEEPSEEK_KEY!,
*   }),
*   messages,
* })
* ```
*/
function openaiCompatibleText(model, config) {
	const { name = DEFAULT_NAME, api = "chat-completions", strictFallbackWarning, compat, reasoning, ...clientOptions } = config;
	const client = new OpenAI$1(clientOptions);
	if (api === "responses") return new OpenAICompatibleResponsesAdapter(client, model, name, {
		strictFallbackWarning,
		fetch: clientOptions.fetch
	}, compat ? { compat } : {});
	return new OpenAICompatibleChatAdapter(client, model, name, {
		strictFallbackWarning,
		fetch: clientOptions.fetch
	}, {
		...reasoning !== void 0 ? { reasoning } : {},
		...compat ? { compat } : {}
	});
}
//#endregion
export { OpenAICompatibleChatAdapter, OpenAICompatibleResponsesAdapter, openaiCompatible, openaiCompatibleText };

//# sourceMappingURL=index.js.map