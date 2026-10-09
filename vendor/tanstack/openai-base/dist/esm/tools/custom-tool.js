import { getOpenAIProviderToolMetadata, openAIProviderTool } from "./openai-provider-tool.js";
//#region src/tools/custom-tool.ts
/**
* Converts a standard Tool to OpenAI CustomTool format
*/
function convertCustomToolToAdapterFormat(tool) {
	const metadata = getOpenAIProviderToolMetadata(tool);
	return {
		type: "custom",
		name: metadata.name,
		...metadata.description !== void 0 && { description: metadata.description },
		...metadata.format !== void 0 && { format: metadata.format }
	};
}
/**
* Creates a standard Tool from CustomTool parameters.
*/
function customTool(toolData) {
	return openAIProviderTool({
		name: "custom",
		description: toolData.description || "A custom tool",
		metadata: { ...toolData }
	}, "custom");
}
//#endregion
export { convertCustomToolToAdapterFormat, customTool };

//# sourceMappingURL=custom-tool.js.map