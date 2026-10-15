import { convertFileSearchToolToAdapterFormat, fileSearchTool } from "@tanstack/openai-base";
//#region src/tools/file-search-tool.ts
/**
* Creates a standard Tool from FileSearchTool parameters, branded as an
* OpenAI provider tool.
*/
function fileSearchTool$1(toolData) {
	return fileSearchTool(toolData);
}
//#endregion
export { convertFileSearchToolToAdapterFormat, fileSearchTool$1 as fileSearchTool };

//# sourceMappingURL=file-search-tool.js.map