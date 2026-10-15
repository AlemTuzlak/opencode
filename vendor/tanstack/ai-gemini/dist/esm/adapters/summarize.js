import { getGeminiApiKeyFromEnv } from "../utils/client.js";
import "../utils/index.js";
import { GeminiTextAdapter } from "./text.js";
import { ChatStreamSummarizeAdapter } from "@tanstack/ai/adapters";
//#region src/adapters/summarize.ts
/**
* Creates a Gemini summarize adapter with explicit API key and model.
*
* Note: keeps the historical (apiKey, model, config) argument order to
* avoid breaking existing callers.
*
* @example
* ```typescript
* const adapter = createGeminiSummarize('AIza...', 'gemini-2.5-flash');
* ```
*/
function createGeminiSummarize(apiKey, model, config) {
	return new ChatStreamSummarizeAdapter(new GeminiTextAdapter({
		...config,
		apiKey
	}, model), model, "gemini");
}
/**
* Creates a Gemini summarize adapter with API key from `GOOGLE_API_KEY` /
* `GEMINI_API_KEY` environment variables.
*
* @example
* ```typescript
* const adapter = geminiSummarize('gemini-2.5-flash');
* await summarize({ adapter, text: 'Long article text...' });
* ```
*/
function geminiSummarize(model, config) {
	return createGeminiSummarize(getGeminiApiKeyFromEnv(), model, config);
}
//#endregion
export { createGeminiSummarize, geminiSummarize };

//# sourceMappingURL=summarize.js.map