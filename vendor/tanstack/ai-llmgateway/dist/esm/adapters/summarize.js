import { getLLMGatewayApiKeyFromEnv } from "../utils/client.js";
import { LLMGatewayTextAdapter } from "./text.js";
import { ChatStreamSummarizeAdapter } from "@tanstack/ai/adapters";
//#region src/adapters/summarize.ts
/**
* Creates an LLM Gateway summarize adapter with explicit API key.
* Type resolution happens here at the call site.
*
* @param model - The model id (e.g., 'gpt-5.6-terra')
* @param apiKey - Your LLM Gateway API key
* @param config - Optional additional configuration
* @returns Configured LLM Gateway summarize adapter instance with resolved types
*
* @example
* ```typescript
* const adapter = createLLMGatewaySummarize('gpt-5.6-terra', "llmgtwy_...");
* ```
*/
function createLLMGatewaySummarize(model, apiKey, config) {
	return new ChatStreamSummarizeAdapter(new LLMGatewayTextAdapter({
		apiKey,
		...config
	}, model), model, "llmgateway");
}
/**
* Creates an LLM Gateway summarize adapter with automatic API key detection
* from environment variables. Type resolution happens here at the call site.
*
* Looks for `LLM_GATEWAY_API_KEY` in:
* - `process.env` (Node.js)
* - `window.env` (Browser with injected env)
*
* @param model - The model id (e.g., 'gpt-5.6-terra')
* @param config - Optional configuration (excluding apiKey which is auto-detected)
* @returns Configured LLM Gateway summarize adapter instance with resolved types
* @throws Error if LLM_GATEWAY_API_KEY is not found in environment
*
* @example
* ```typescript
* // Automatically uses LLM_GATEWAY_API_KEY from environment
* const adapter = llmGatewaySummarize('gpt-5.6-terra');
*
* await summarize({
*   adapter,
*   text: "Long article text..."
* });
* ```
*/
function llmGatewaySummarize(model, config) {
	return createLLMGatewaySummarize(model, getLLMGatewayApiKeyFromEnv(), config);
}
//#endregion
export { createLLMGatewaySummarize, llmGatewaySummarize };

//# sourceMappingURL=summarize.js.map