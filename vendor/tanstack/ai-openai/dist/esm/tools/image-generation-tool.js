import { convertImageGenerationToolToAdapterFormat, imageGenerationTool } from "@tanstack/openai-base";
//#region src/tools/image-generation-tool.ts
/**
* Creates a standard Tool from ImageGenerationTool parameters, branded as an
* OpenAI provider tool.
*/
function imageGenerationTool$1(toolData) {
	return imageGenerationTool(toolData);
}
//#endregion
export { convertImageGenerationToolToAdapterFormat, imageGenerationTool$1 as imageGenerationTool };

//# sourceMappingURL=image-generation-tool.js.map