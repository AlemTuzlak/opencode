//#region src/image/image-provider-options.ts
/**
* Validates that the provided size is supported by the model.
* Throws a descriptive error if the size is not supported.
*/
function validateImageSize(model, size) {
	if (!size || size === "auto") return;
	const modelSizes = {
		"gpt-image-2.5-flare": [
			"1024x1024",
			"1536x1024",
			"1024x1536",
			"auto"
		],
		"gpt-image-2.5-sunburst": [
			"1024x1024",
			"1536x1024",
			"1024x1536",
			"auto"
		],
		"gpt-image-2": [
			"1024x1024",
			"1536x1024",
			"1024x1536",
			"auto"
		],
		"gpt-image-1": [
			"1024x1024",
			"1536x1024",
			"1024x1536",
			"auto"
		],
		"gpt-image-1-mini": [
			"1024x1024",
			"1536x1024",
			"1024x1536",
			"auto"
		],
		"dall-e-3": [
			"1024x1024",
			"1792x1024",
			"1024x1792"
		],
		"dall-e-2": [
			"256x256",
			"512x512",
			"1024x1024"
		]
	}[model];
	if (!modelSizes) throw new Error(`Unknown image model: ${model}`);
	if (!modelSizes.includes(size)) throw new Error(`Size "${size}" is not supported by model "${model}". Supported sizes: ${modelSizes.join(", ")}`);
}
/**
* Validates that the number of images is within bounds for the model.
*/
function validateNumberOfImages(model, numberOfImages) {
	if (numberOfImages === void 0) return;
	if (model === "dall-e-3" && numberOfImages !== 1) throw new Error(`Model "dall-e-3" only supports generating 1 image at a time. Requested: ${numberOfImages}`);
	if (numberOfImages < 1 || numberOfImages > 10) throw new Error(`Number of images must be between 1 and 10. Requested: ${numberOfImages}`);
}
var validatePrompt = (options) => {
	if (options.prompt.length === 0) throw new Error("Prompt cannot be empty.");
	if ((options.model === "gpt-image-2" || options.model === "gpt-image-1" || options.model === "gpt-image-1-mini") && options.prompt.length > 32e3) throw new Error("For gpt-image-2/gpt-image-1/gpt-image-1-mini, prompt length must be less than or equal to 32000 characters.");
	if (options.model === "dall-e-2" && options.prompt.length > 1e3) throw new Error("For dall-e-2, prompt length must be less than or equal to 1000 characters.");
	if (options.model === "dall-e-3" && options.prompt.length > 4e3) throw new Error("For dall-e-3, prompt length must be less than or equal to 4000 characters.");
};
//#endregion
export { validateImageSize, validateNumberOfImages, validatePrompt };

//# sourceMappingURL=image-provider-options.js.map