import { durationToSeconds } from "@tanstack/ai/adapters";
//#region src/video/video-provider-options.ts
/**
* OpenAI Video Generation Provider Options
*
* Based on https://platform.openai.com/docs/api-reference/videos/create
*
* @experimental Video generation is an experimental feature and may change.
*/
var SORA_SECONDS = [
	"4",
	"8",
	"12"
];
/**
* Runtime duration table backing `availableDurations()` / `snapDuration()`.
* `snapDuration` returns the API string (`'4' | '8' | '12'`).
*
* @experimental Video generation is an experimental feature and may change.
*/
var OPENAI_VIDEO_DURATIONS = {
	"sora-2": {
		kind: "discrete",
		values: SORA_SECONDS
	},
	"sora-2-pro": {
		kind: "discrete",
		values: SORA_SECONDS
	}
};
/**
* Look up the duration options for a Sora model.
*
* @experimental Video generation is an experimental feature and may change.
*/
function getOpenAIVideoDurationOptions(model) {
	return OPENAI_VIDEO_DURATIONS[model];
}
/**
* Validate video size for a given model.
*
* @experimental Video generation is an experimental feature and may change.
*/
function validateVideoSize(model, size) {
	const validSizes = [
		"1280x720",
		"720x1280",
		"1792x1024",
		"1024x1792"
	];
	if (size && !validSizes.includes(size)) throw new Error(`Size "${size}" is not supported by model "${model}". Supported sizes: ${validSizes.join(", ")}`);
}
/**
* Validate a Sora duration. Accepts `4`, `"4"`, and `"4s"` (and 8, 12).
* Rejects other lengths, including `"6s"` and `"auto"`.
*
* @experimental Video generation is an experimental feature and may change.
*/
function validateVideoSeconds(model, seconds) {
	if (seconds === void 0) return;
	if (toApiSeconds(seconds) !== void 0) return;
	throw new Error(`Duration "${seconds}" is not supported by model "${model}". Supported durations: 4, 8, or 12 seconds ("4", "4s", or 4).`);
}
/**
* Convert a duration spelling to the API string (`'4' | '8' | '12'`).
*/
function toApiSeconds(seconds) {
	if (seconds === void 0) return void 0;
	const value = durationToSeconds(seconds);
	if (value === 4) return "4";
	if (value === 8) return "8";
	if (value === 12) return "12";
}
//#endregion
export { OPENAI_VIDEO_DURATIONS, getOpenAIVideoDurationOptions, toApiSeconds, validateVideoSeconds, validateVideoSize };

//# sourceMappingURL=video-provider-options.js.map