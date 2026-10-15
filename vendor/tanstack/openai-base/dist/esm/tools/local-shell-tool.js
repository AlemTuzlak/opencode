import { openAIProviderTool } from "./openai-provider-tool.js";
//#region src/tools/local-shell-tool.ts
/**
* Converts a standard Tool to OpenAI LocalShellTool format
*/
function convertLocalShellToolToAdapterFormat(_tool) {
	return { type: "local_shell" };
}
/**
* Creates a standard Tool from LocalShellTool parameters.
*
* Base (non-branded) factory. Providers that need branded return types should
* re-wrap this in their own package.
*/
function localShellTool() {
	return openAIProviderTool({
		name: "local_shell",
		description: "Execute local shell commands",
		metadata: {}
	}, "local_shell");
}
//#endregion
export { convertLocalShellToolToAdapterFormat, localShellTool };

//# sourceMappingURL=local-shell-tool.js.map