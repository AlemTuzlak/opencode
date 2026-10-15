import { codeInterpreterTool, convertCodeInterpreterToolToAdapterFormat } from "@tanstack/openai-base";
//#region src/tools/code-interpreter-tool.ts
/**
* Creates a standard Tool from CodeInterpreterTool parameters, branded as an
* OpenAI provider tool. Delegates construction to the base factory and brands
* the result via a phantom-typed `ProviderTool` cast.
*/
function codeInterpreterTool$1(container) {
	return codeInterpreterTool(container);
}
//#endregion
export { codeInterpreterTool$1 as codeInterpreterTool, convertCodeInterpreterToolToAdapterFormat };

//# sourceMappingURL=code-interpreter-tool.js.map