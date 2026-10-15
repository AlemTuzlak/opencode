import { getGrokApiKeyFromEnv } from "../utils/client.js";
import { GrokTextAdapter } from "./text.js";
import { ChatStreamSummarizeAdapter } from "@tanstack/ai/adapters";
//#region src/adapters/summarize.ts
/**
* Creates a Grok summarize adapter with explicit API key.
* Type resolution happens here at the call site.
*
* @param model - The model name (e.g., 'grok-build-0.1')
* @param apiKey - Your xAI API key
* @param config - Optional additional configuration
* @returns Configured Grok summarize adapter instance with resolved types
*
* @example
* ```typescript
* const adapter = createGrokSummarize('grok-build-0.1', "xai-...");
* ```
*/
function createGrokSummarize(model, apiKey, config) {
	return new ChatStreamSummarizeAdapter(new GrokTextAdapter({
		apiKey,
		...config
	}, model), model, "grok");
}
/**
* Creates a Grok summarize adapter with automatic API key detection from environment variables.
* Type resolution happens here at the call site.
*
* Looks for `XAI_API_KEY` in:
* - `process.env` (Node.js)
* - `window.env` (Browser with injected env)
*
* @param model - The model name (e.g., 'grok-build-0.1')
* @param config - Optional configuration (excluding apiKey which is auto-detected)
* @returns Configured Grok summarize adapter instance with resolved types
* @throws Error if XAI_API_KEY is not found in environment
*
* @example
* ```typescript
* // Automatically uses XAI_API_KEY from environment
* const adapter = grokSummarize('grok-build-0.1');
*
* await summarize({
*   adapter,
*   text: "Long article text..."
* });
* ```
*/
function grokSummarize(model, config) {
	return createGrokSummarize(model, getGrokApiKeyFromEnv(), config);
}
//#endregion
export { createGrokSummarize, grokSummarize };

//# sourceMappingURL=summarize.js.map