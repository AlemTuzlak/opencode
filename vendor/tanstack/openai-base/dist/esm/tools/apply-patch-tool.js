import { openAIProviderTool } from "./openai-provider-tool.js";
//#region src/tools/apply-patch-tool.ts
/**
* Converts a standard Tool to OpenAI ApplyPatchTool format
*/
function convertApplyPatchToolToAdapterFormat(_tool) {
	return { type: "apply_patch" };
}
/**
* Creates a standard Tool from ApplyPatchTool parameters.
*
* Base (non-branded) factory. Providers that need branded return types should
* re-wrap this in their own package.
*/
function applyPatchTool() {
	return openAIProviderTool({
		name: "apply_patch",
		description: "Apply a patch to modify files",
		metadata: {}
	}, "apply_patch");
}
//#endregion
export { applyPatchTool, convertApplyPatchToolToAdapterFormat };

//# sourceMappingURL=apply-patch-tool.js.map