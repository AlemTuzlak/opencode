import { getOpenAIApiKeyFromEnv } from "../utils/client.js";
import { OpenAITextAdapter } from "./text.js";
import { ChatStreamSummarizeAdapter } from "@tanstack/ai/adapters";
//#region src/adapters/summarize.ts
/**
* Creates an OpenAI summarize adapter with explicit API key.
* Type resolution happens here at the call site.
*
* @param model - The model name (e.g., 'gpt-4o-mini', 'gpt-4o')
* @param apiKey - Your OpenAI API key
* @param config - Optional additional configuration
* @returns Configured OpenAI summarize adapter instance with resolved types
*
* @example
* ```typescript
* const adapter = createOpenaiSummarize('gpt-4o-mini', "sk-...");
* ```
*/
function createOpenaiSummarize(model, apiKey, config) {
	return new ChatStreamSummarizeAdapter(new OpenAITextAdapter({
		apiKey,
		...config
	}, model), model, "openai");
}
/**
* Creates an OpenAI summarize adapter with automatic API key detection from environment variables.
* Type resolution happens here at the call site.
*
* Looks for `OPENAI_API_KEY` in:
* - `process.env` (Node.js)
* - `window.env` (Browser with injected env)
*
* @param model - The model name (e.g., 'gpt-4o-mini', 'gpt-4o')
* @param config - Optional configuration (excluding apiKey which is auto-detected)
* @returns Configured OpenAI summarize adapter instance with resolved types
* @throws Error if OPENAI_API_KEY is not found in environment
*
* @example
* ```typescript
* // Automatically uses OPENAI_API_KEY from environment
* const adapter = openaiSummarize('gpt-4o-mini');
*
* await summarize({
*   adapter,
*   text: "Long article text..."
* });
* ```
*/
function openaiSummarize(model, config) {
	return createOpenaiSummarize(model, getOpenAIApiKeyFromEnv(), config);
}
//#endregion
export { createOpenaiSummarize, openaiSummarize };

//# sourceMappingURL=summarize.js.map