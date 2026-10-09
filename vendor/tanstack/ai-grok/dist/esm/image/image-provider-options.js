//#region src/image/image-provider-options.ts
var GROK_IMAGINE_ASPECT_RATIOS = [
	"1:1",
	"3:4",
	"4:3",
	"9:16",
	"16:9",
	"2:3",
	"3:2",
	"9:19.5",
	"19.5:9",
	"9:20",
	"20:9",
	"1:2",
	"2:1",
	"auto"
];
var GROK_IMAGINE_RESOLUTIONS = ["1k", "2k"];
/**
* Models served by xAI's Imagine API. They are aspect-ratio sized and
* support image-conditioned generation via `/v1/images/edits`.
*/
function isGrokImagineImageModel(model) {
	return model.startsWith("grok-imagine-image");
}
/**
* Parses a grok-imagine size string into its components.
* Format: "aspectRatio" or "aspectRatio_resolution",
* e.g. "16:9_2k" → { aspectRatio: "16:9", resolution: "2k" }.
* Returns undefined when the string doesn't match the template.
*/
function parseGrokImagineSize(size) {
	const [, aspectRatio, resolution] = size.match(/^([\d.]+:[\d.]+|auto)(?:_(.+))?$/) ?? [];
	if (aspectRatio === void 0) return void 0;
	return {
		aspectRatio,
		...resolution !== void 0 && { resolution }
	};
}
/**
* Validates that the provided size is supported by the model.
* Throws a descriptive error if the size is not supported.
*/
function validateImageSize(model, size) {
	if (!size) return;
	if (isGrokImagineImageModel(model)) {
		const parsed = parseGrokImagineSize(size);
		if (!parsed || !GROK_IMAGINE_ASPECT_RATIOS.includes(parsed.aspectRatio) || parsed.resolution !== void 0 && !GROK_IMAGINE_RESOLUTIONS.includes(parsed.resolution)) throw new Error(`Size "${size}" is not supported by model "${model}". Expected an aspect ratio (${GROK_IMAGINE_ASPECT_RATIOS.join(", ")}) optionally suffixed with a resolution ("16:9_2k"; resolutions: ${GROK_IMAGINE_RESOLUTIONS.join(", ")}).`);
		return;
	}
	throw new Error(`Unknown image model: ${model}`);
}
/**
* Validates that the number of images is within bounds for the model.
*/
function validateNumberOfImages(_model, numberOfImages) {
	if (numberOfImages === void 0) return;
	if (numberOfImages < 1 || numberOfImages > 10) throw new Error(`Number of images must be between 1 and 10. Requested: ${numberOfImages}`);
}
var validatePrompt = (prompt) => {
	if (prompt.length === 0) throw new Error("Prompt cannot be empty.");
};
//#endregion
export { isGrokImagineImageModel, parseGrokImagineSize, validateImageSize, validateNumberOfImages, validatePrompt };

//# sourceMappingURL=image-provider-options.js.map