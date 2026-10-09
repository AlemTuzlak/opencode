import { getOpenAIProviderToolMetadata, openAIProviderTool } from "./openai-provider-tool.js";
//#region src/tools/file-search-tool.ts
var validateMaxNumResults = (maxNumResults) => {
	if (maxNumResults !== void 0 && (maxNumResults < 1 || maxNumResults > 50)) throw new Error("max_num_results must be between 1 and 50.");
};
/**
* Converts a standard Tool to OpenAI FileSearchTool format
*/
function convertFileSearchToolToAdapterFormat(tool) {
	const metadata = getOpenAIProviderToolMetadata(tool);
	return {
		type: "file_search",
		vector_store_ids: metadata.vector_store_ids,
		...metadata.max_num_results !== void 0 && { max_num_results: metadata.max_num_results },
		...metadata.ranking_options !== void 0 && { ranking_options: metadata.ranking_options },
		...metadata.filters !== void 0 && { filters: metadata.filters }
	};
}
/**
* Creates a standard Tool from FileSearchTool parameters.
*
* Validates max_num_results. Base (non-branded) factory; providers that need
* branded return types should re-wrap in their own package.
*/
function fileSearchTool(toolData) {
	validateMaxNumResults(toolData.max_num_results);
	return openAIProviderTool({
		name: "file_search",
		description: "Search files in vector stores",
		metadata: { ...toolData }
	}, "file_search");
}
//#endregion
export { convertFileSearchToolToAdapterFormat, fileSearchTool, validateMaxNumResults };

//# sourceMappingURL=file-search-tool.js.map