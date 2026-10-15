import { brandAnthropicProviderTool, getAnthropicProviderToolMetadata } from "./anthropic-provider-tool.js";
//#region src/tools/bash-tool.ts
function convertBashToolToAdapterFormat(tool) {
	return getAnthropicProviderToolMetadata(tool);
}
function bashTool(config) {
	return brandAnthropicProviderTool({
		name: "bash",
		description: "",
		metadata: config
	}, "bash");
}
//#endregion
export { bashTool, convertBashToolToAdapterFormat };

//# sourceMappingURL=bash-tool.js.map