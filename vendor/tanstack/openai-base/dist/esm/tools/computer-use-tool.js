import { getOpenAIProviderToolMetadata, openAIProviderTool } from "./openai-provider-tool.js";
//#region src/tools/computer-use-tool.ts
/**
* Converts a standard Tool to OpenAI ComputerUseTool format
*/
function convertComputerUseToolToAdapterFormat(tool) {
	const metadata = getOpenAIProviderToolMetadata(tool);
	return {
		type: "computer_use_preview",
		display_height: metadata.display_height,
		display_width: metadata.display_width,
		environment: metadata.environment
	};
}
/**
* Creates a standard Tool from ComputerUseTool parameters.
*
* Base (non-branded) factory. Providers that need branded return types should
* re-wrap this in their own package.
*/
function computerUseTool(toolData) {
	return openAIProviderTool({
		name: "computer_use_preview",
		description: "Control a virtual computer",
		metadata: { ...toolData }
	}, "computer_use");
}
//#endregion
export { computerUseTool, convertComputerUseToolToAdapterFormat };

//# sourceMappingURL=computer-use-tool.js.map