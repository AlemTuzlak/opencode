import { getOpenAIProviderToolMetadata, openAIProviderTool } from "./openai-provider-tool.js";
//#region src/tools/web-search-tool.ts
/**
* Converts a standard Tool to OpenAI WebSearchTool format. Spread `metadata`
* first, then force `type: 'web_search'` last so a different metadata type
* cannot produce a malformed payload.
*/
function convertWebSearchToolToAdapterFormat(tool) {
	return {
		...getOpenAIProviderToolMetadata(tool),
		type: "web_search"
	};
}
/**
* Creates a standard Tool from WebSearchTool parameters.
*
* Base (non-branded) factory. Providers that need branded return types should
* re-wrap this in their own package.
*/
function webSearchTool(toolData) {
	return openAIProviderTool({
		name: "web_search",
		description: "Search the web",
		metadata: toolData
	}, "web_search");
}
//#endregion
export { convertWebSearchToolToAdapterFormat, webSearchTool };

//# sourceMappingURL=web-search-tool.js.map