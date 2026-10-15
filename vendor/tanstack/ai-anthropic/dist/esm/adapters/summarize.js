import { AnthropicTextAdapter } from "./text.js";
import { ChatStreamSummarizeAdapter } from "@tanstack/ai/adapters";
//#region src/adapters/summarize.ts
/**
* Creates an Anthropic summarize adapter with explicit API key.
* Type resolution happens here at the call site.
*
* @param model - The model name (e.g., 'claude-sonnet-5', 'claude-haiku-4-5')
* @param apiKey - Your Anthropic API key
* @param config - Optional additional configuration
* @returns Configured Anthropic summarize adapter instance with resolved types
*
* @example
* ```typescript
* const adapter = createAnthropicSummarize('claude-sonnet-4-5', 'sk-ant-...');
* ```
*/
function createAnthropicSummarize(model, apiKey, config) {
	return new ChatStreamSummarizeAdapter(new AnthropicTextAdapter({
		apiKey,
		...config
	}, model), model, "anthropic");
}
/**
* Creates an Anthropic summarize adapter with automatic API key detection.
* Type resolution happens here at the call site.
*
* @param model - The model name (e.g., 'claude-sonnet-5', 'claude-haiku-4-5')
* @param config - Optional configuration (excluding apiKey which is auto-detected)
* @returns Configured Anthropic summarize adapter instance with resolved types
*
* @example
* ```typescript
* const adapter = anthropicSummarize('claude-sonnet-4-5');
* await summarize({ adapter, text: 'Long article text...' });
* ```
*/
function anthropicSummarize(model, config) {
	return new ChatStreamSummarizeAdapter(new AnthropicTextAdapter(config ?? {}, model), model, "anthropic");
}
//#endregion
export { anthropicSummarize, createAnthropicSummarize };

//# sourceMappingURL=summarize.js.map