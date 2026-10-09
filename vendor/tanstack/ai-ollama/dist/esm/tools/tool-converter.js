import { convertFunctionToolToAdapterFormat } from "./function-tool.js";
//#region src/tools/tool-converter.ts
/**
* Converts standard Tools to Ollama-specific format.
*
* Ollama only supports function-style tools today, so every entry flows
* through {@link convertFunctionToolToAdapterFormat}. Keeping this layered
* structure matches peer adapters (openai/anthropic/grok/groq) so special
* tool types can be added later without rewriting the adapter.
*/
function convertToolsToProviderFormat(tools) {
	if (!tools || tools.length === 0) return;
	return tools.map((tool) => convertFunctionToolToAdapterFormat(tool));
}
//#endregion
export { convertToolsToProviderFormat };

//# sourceMappingURL=tool-converter.js.map