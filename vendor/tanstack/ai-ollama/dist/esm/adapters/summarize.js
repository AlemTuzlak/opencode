import { getOllamaHostFromEnv } from "../utils/client.js";
import "../utils/index.js";
import { OllamaTextAdapter } from "./text.js";
import { ChatStreamSummarizeAdapter } from "@tanstack/ai/adapters";
//#region src/adapters/summarize.ts
/**
* Creates an Ollama summarize adapter with explicit host and model.
*
* @example
* ```typescript
* const adapter = createOllamaSummarize('mistral', 'http://localhost:11434');
* ```
*/
function createOllamaSummarize(model, host, _options) {
	return new ChatStreamSummarizeAdapter(new OllamaTextAdapter(host, model), model, "ollama");
}
/**
* Creates an Ollama summarize adapter with host from `OLLAMA_HOST` env var
* (falling back to the Ollama default).
*
* @example
* ```typescript
* const adapter = ollamaSummarize('mistral');
* await summarize({ adapter, text: 'Long article text...' });
* ```
*/
function ollamaSummarize(model, options) {
	return createOllamaSummarize(model, getOllamaHostFromEnv(), options);
}
//#endregion
export { createOllamaSummarize, ollamaSummarize };

//# sourceMappingURL=summarize.js.map