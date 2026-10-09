import { convertFunctionToolToAdapterFormat } from "./function-tool.js";
//#region src/tools/tool-converter.ts
/**
* Converts an array of standard Tools to Vercel AI Gateway format.
* The Gateway Chat Completions API is OpenAI-compatible, so we support function tools.
*/
function convertToolsToProviderFormat(tools) {
	return tools.map((tool) => {
		return convertFunctionToolToAdapterFormat(tool);
	});
}
//#endregion
export { convertToolsToProviderFormat };

//# sourceMappingURL=tool-converter.js.map