//#region src/video/video-provider-options.ts
var GROK_VIDEO_ASPECT_RATIOS = [
	"1:1",
	"16:9",
	"9:16",
	"4:3",
	"3:4",
	"3:2",
	"2:3"
];
var GROK_VIDEO_RESOLUTIONS = [
	"480p",
	"720p",
	"1080p"
];
/**
* Parses a grok video size string into its components.
* Format: "aspectRatio" or "aspectRatio_resolution",
* e.g. "16:9_720p" → { aspectRatio: "16:9", resolution: "720p" }.
* Returns undefined when the string doesn't match the template.
*/
function parseGrokVideoSize(size) {
	const [, aspectRatio, resolution] = size.match(/^([\d.]+:[\d.]+)(?:_(.+))?$/) ?? [];
	if (aspectRatio === void 0) return void 0;
	return {
		aspectRatio,
		...resolution !== void 0 && { resolution }
	};
}
/**
* Models that accept native 1080p on text-to-video and image-to-video.
* Reference-to-video stays capped at 720p even on these models.
*
* @experimental Video generation is an experimental feature and may change.
*/
function isGrokVideoNative1080pModel(model) {
	return model === "grok-imagine-video-1.5";
}
/**
* Validate the `size` template for a given grok video model.
*
* @experimental Video generation is an experimental feature and may change.
*/
function validateVideoSize(model, size) {
	if (size === void 0) return;
	const parsed = parseGrokVideoSize(size);
	if (!parsed || !GROK_VIDEO_ASPECT_RATIOS.includes(parsed.aspectRatio)) throw new Error(`Size "${size}" is not supported by model "${model}". Expected "aspectRatio" or "aspectRatio_resolution" (e.g. "16:9_720p") with aspect ratio one of: ${GROK_VIDEO_ASPECT_RATIOS.join(", ")}`);
	if (parsed.resolution !== void 0 && !GROK_VIDEO_RESOLUTIONS.includes(parsed.resolution)) throw new Error(`Resolution "${parsed.resolution}" is not supported by model "${model}". Supported resolutions: ${GROK_VIDEO_RESOLUTIONS.join(", ")}`);
	if (parsed.resolution === "1080p" && !isGrokVideoNative1080pModel(model)) throw new Error(`Resolution "1080p" is not supported by model "${model}". Use 'grok-imagine-video-1.5' for native 1080p text-to-video / image-to-video.`);
}
/**
* Runtime duration table backing `availableDurations()` / `snapDuration()`.
* Both grok-imagine video models accept the same continuous 1–15 integer-second
* range.
*
* @experimental Video generation is an experimental feature and may change.
*/
var GROK_VIDEO_DURATIONS = {
	"grok-imagine-video": {
		kind: "range",
		min: 1,
		max: 15,
		step: 1,
		unit: "seconds"
	},
	"grok-imagine-video-1.5": {
		kind: "range",
		min: 1,
		max: 15,
		step: 1,
		unit: "seconds"
	}
};
/**
* Look up the duration options for a grok video model.
*
* @experimental Video generation is an experimental feature and may change.
*/
function getGrokVideoDurationOptions(model) {
	return GROK_VIDEO_DURATIONS[model];
}
/**
* Models that support reference-to-video inputs (`reference_images` /
* `reference_audios`). The per-model provider-options map hides the fields
* from other models at compile time; this backs the runtime gate for
* untyped callers (e.g. deserialized JSON) so they get a clear error
* instead of a raw API 400.
*
* @experimental Video generation is an experimental feature and may change.
*/
var GROK_VIDEO_REFERENCE_MODELS = /* @__PURE__ */ new Set(["grok-imagine-video-1.5"]);
/**
* True when the model accepts reference-to-video inputs.
*
* @experimental Video generation is an experimental feature and may change.
*/
function isGrokVideoReferenceModel(model) {
	return GROK_VIDEO_REFERENCE_MODELS.has(model);
}
/**
* Models that accept a source-video prompt part for `/v1/videos/edits`
* and `/v1/videos/extensions`. xAI lists video input only on
* grok-imagine-video (v1.0).
*
* @experimental Video generation is an experimental feature and may change.
*/
var GROK_VIDEO_SOURCE_MODELS = /* @__PURE__ */ new Set(["grok-imagine-video"]);
/**
* True when the model accepts edit / extend source-video jobs.
*
* @experimental Video generation is an experimental feature and may change.
*/
function isGrokVideoSourceModel(model) {
	return GROK_VIDEO_SOURCE_MODELS.has(model);
}
//#endregion
export { GROK_VIDEO_DURATIONS, getGrokVideoDurationOptions, isGrokVideoNative1080pModel, isGrokVideoReferenceModel, isGrokVideoSourceModel, parseGrokVideoSize, validateVideoSize };

//# sourceMappingURL=video-provider-options.js.map