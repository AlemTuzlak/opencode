import { convertWebSearchToolToAdapterFormat, webSearchTool } from "@tanstack/openai-base";
//#region src/tools/web-search-tool.ts
/**
* Creates a standard Tool from WebSearchTool parameters, branded as an OpenAI
* provider tool.
*/
function webSearchTool$1(toolData) {
	return webSearchTool(toolData);
}
//#endregion
export { convertWebSearchToolToAdapterFormat, webSearchTool$1 as webSearchTool };

//# sourceMappingURL=web-search-tool.js.map