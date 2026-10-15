import { brandGeminiProviderTool } from "./gemini-provider-tool.js";
//#region src/tools/code-execution-tool.ts
function convertCodeExecutionToolToAdapterFormat(_tool) {
	return { codeExecution: {} };
}
function codeExecutionTool() {
	return brandGeminiProviderTool({
		name: "code_execution",
		description: "",
		metadata: {}
	}, "code_execution");
}
//#endregion
export { codeExecutionTool, convertCodeExecutionToolToAdapterFormat };

//# sourceMappingURL=code-execution-tool.js.map