import { convertWebSearchPreviewToolToAdapterFormat, webSearchPreviewTool } from "@tanstack/openai-base";
//#region src/tools/web-search-preview-tool.ts
/**
* Creates a standard Tool from WebSearchPreviewTool parameters, branded as an
* OpenAI provider tool.
*/
function webSearchPreviewTool$1(toolData) {
	return webSearchPreviewTool(toolData);
}
//#endregion
export { convertWebSearchPreviewToolToAdapterFormat, webSearchPreviewTool$1 as webSearchPreviewTool };

//# sourceMappingURL=web-search-preview-tool.js.map