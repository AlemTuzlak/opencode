import { computerUseTool, convertComputerUseToolToAdapterFormat } from "@tanstack/openai-base";
//#region src/tools/computer-use-tool.ts
/**
* Creates a standard Tool from ComputerUseTool parameters, branded as an
* OpenAI provider tool.
*/
function computerUseTool$1(toolData) {
	return computerUseTool(toolData);
}
//#endregion
export { computerUseTool$1 as computerUseTool, convertComputerUseToolToAdapterFormat };

//# sourceMappingURL=computer-use-tool.js.map