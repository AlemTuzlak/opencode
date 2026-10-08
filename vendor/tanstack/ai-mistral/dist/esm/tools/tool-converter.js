import { convertFunctionToolToAdapterFormat } from "./function-tool.js";
//#region src/tools/tool-converter.ts
/**
* Converts an array of standard Tools to Mistral-specific format.
*/
function convertToolsToProviderFormat(tools) {
	return tools.map((tool) => {
		return convertFunctionToolToAdapterFormat(tool);
	});
}
//#endregion
export { convertToolsToProviderFormat };

//# sourceMappingURL=tool-converter.js.map