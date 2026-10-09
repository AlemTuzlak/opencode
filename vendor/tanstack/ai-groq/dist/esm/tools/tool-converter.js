import { convertFunctionToolToAdapterFormat } from "./function-tool.js";
//#region src/tools/tool-converter.ts
/**
* Converts an array of standard Tools to Groq-specific format.
* Groq uses an OpenAI-compatible API, so we primarily support function tools.
*/
function convertToolsToProviderFormat(tools) {
	return tools.map((tool) => {
		return convertFunctionToolToAdapterFormat(tool);
	});
}
//#endregion
export { convertToolsToProviderFormat };

//# sourceMappingURL=tool-converter.js.map