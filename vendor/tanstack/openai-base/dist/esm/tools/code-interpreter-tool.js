import { getOpenAIProviderToolMetadata, openAIProviderTool } from "./openai-provider-tool.js";
//#region src/tools/code-interpreter-tool.ts
/**
* Converts a standard Tool to OpenAI CodeInterpreterTool format
*/
function convertCodeInterpreterToolToAdapterFormat(tool) {
	return {
		type: "code_interpreter",
		container: getOpenAIProviderToolMetadata(tool).container
	};
}
/**
* Creates a standard Tool from CodeInterpreterTool parameters.
*
* Base (non-branded) factory. Providers that need branded return types should
* re-wrap this in their own package.
*/
function codeInterpreterTool(container) {
	return openAIProviderTool({
		name: "code_interpreter",
		description: "Execute code in a sandboxed environment",
		metadata: {
			type: "code_interpreter",
			container
		}
	}, "code_interpreter");
}
//#endregion
export { codeInterpreterTool, convertCodeInterpreterToolToAdapterFormat };

//# sourceMappingURL=code-interpreter-tool.js.map