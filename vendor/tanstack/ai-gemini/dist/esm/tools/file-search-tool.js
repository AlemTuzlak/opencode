import { brandGeminiProviderTool, getGeminiProviderToolMetadata } from "./gemini-provider-tool.js";
//#region src/tools/file-search-tool.ts
function convertFileSearchToolToAdapterFormat(tool) {
	return { fileSearch: getGeminiProviderToolMetadata(tool) };
}
function fileSearchTool(config) {
	return brandGeminiProviderTool({
		name: "file_search",
		description: "",
		metadata: config
	}, "file_search");
}
//#endregion
export { convertFileSearchToolToAdapterFormat, fileSearchTool };

//# sourceMappingURL=file-search-tool.js.map