import { brandAnthropicProviderTool, getAnthropicProviderToolMetadata } from "./anthropic-provider-tool.js";
//#region src/tools/computer-use-tool.ts
function convertComputerUseToolToAdapterFormat(tool) {
	return getAnthropicProviderToolMetadata(tool);
}
function computerUseTool(config) {
	return brandAnthropicProviderTool({
		name: "computer",
		description: "",
		metadata: config
	}, "computer_use");
}
//#endregion
export { computerUseTool, convertComputerUseToolToAdapterFormat };

//# sourceMappingURL=computer-use-tool.js.map