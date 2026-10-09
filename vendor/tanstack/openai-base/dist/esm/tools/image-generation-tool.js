import { getOpenAIProviderToolMetadata, openAIProviderTool } from "./openai-provider-tool.js";
//#region src/tools/image-generation-tool.ts
var validatePartialImages = (value) => {
	if (value !== void 0 && (value < 0 || value > 3)) throw new Error("partial_images must be between 0 and 3");
};
/**
* Converts a standard Tool to OpenAI ImageGenerationTool format. Spread
* `metadata` first, then force `type: 'image_generation'` last so a stray
* `metadata.type` cannot shadow the wire discriminator.
*/
function convertImageGenerationToolToAdapterFormat(tool) {
	return {
		...getOpenAIProviderToolMetadata(tool),
		type: "image_generation"
	};
}
/**
* Creates a standard Tool from ImageGenerationTool parameters.
*
* Base (non-branded) factory. Providers that need branded return types should
* re-wrap this in their own package.
*/
function imageGenerationTool(toolData) {
	validatePartialImages(toolData.partial_images);
	return openAIProviderTool({
		name: "image_generation",
		description: "Generate images based on text descriptions",
		metadata: { ...toolData }
	}, "image_generation");
}
//#endregion
export { convertImageGenerationToolToAdapterFormat, imageGenerationTool, validatePartialImages };

//# sourceMappingURL=image-generation-tool.js.map