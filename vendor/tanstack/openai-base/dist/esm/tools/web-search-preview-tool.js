import { getOpenAIProviderToolMetadata, openAIProviderTool } from "./openai-provider-tool.js";
//#region src/tools/web-search-preview-tool.ts
/**
* Converts a standard Tool to OpenAI WebSearchPreviewTool format. Force the
* literal `type: 'web_search_preview'` instead of trusting `metadata.type`,
* so a missing or wrong metadata type cannot produce a malformed payload.
*/
function convertWebSearchPreviewToolToAdapterFormat(tool) {
	return {
		...getOpenAIProviderToolMetadata(tool),
		type: "web_search_preview"
	};
}
/**
* Creates a standard Tool from WebSearchPreviewTool parameters.
*
* Base (non-branded) factory. Providers that need branded return types should
* re-wrap this in their own package.
*/
function webSearchPreviewTool(toolData) {
	return openAIProviderTool({
		name: "web_search_preview",
		description: "Search the web (preview version)",
		metadata: toolData
	}, "web_search_preview");
}
//#endregion
export { convertWebSearchPreviewToolToAdapterFormat, webSearchPreviewTool };

//# sourceMappingURL=web-search-preview-tool.js.map