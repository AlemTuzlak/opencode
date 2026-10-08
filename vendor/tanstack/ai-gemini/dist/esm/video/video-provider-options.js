import { GEMINI_INTERACTIONS_VIDEO_MODELS } from "../model-meta.js";
//#region src/video/video-provider-options.ts
/**
* Gemini Video Generation Provider Options
*
* Covers two request paths behind the one video adapter:
* - Veo models — long-running operations via `:predictLongRunning`
*   (https://ai.google.dev/gemini-api/docs/video)
* - Gemini Omni Flash — background jobs via the Interactions API
*   (https://ai.google.dev/gemini-api/docs/omni)
*
* @experimental Video generation is an experimental feature and may change.
*/
/**
* Runtime guard for the Interactions-served video models.
* @experimental Omni video generation is an experimental feature and may change.
*/
function isInteractionsVideoModel(model) {
	return GEMINI_INTERACTIONS_VIDEO_MODELS.includes(model);
}
/**
* Splits an Omni `size` into aspect ratio and optional resolution.
* `'16:9_1080p'` → `{ aspectRatio: '16:9', resolution: '1080p' }`.
* `'9:16'` → `{ aspectRatio: '9:16' }`.
*/
function parseGeminiOmniVideoSize(size) {
	const [, aspectRatio, resolution] = /^(\d+:\d+)(?:_(.+))?$/.exec(size) ?? [];
	if (aspectRatio === void 0) return void 0;
	return {
		aspectRatio,
		...resolution !== void 0 && { resolution }
	};
}
/**
* Runtime duration table backing `availableDurations()` / `snapDuration()`.
*
* Veo values are curated from the official docs
* (https://ai.google.dev/gemini-api/docs/video) — the Gemini OpenAPI spec
* types the `:predictLongRunning` request's `parameters` as unconstrained,
* so it carries no per-model duration information to derive these from.
* Omni Flash's 3–10s range was verified against the live API
* (2026-07-02): `response_format.duration` takes a `"<seconds>s"` string,
* fractional values are accepted, out-of-range values are rejected with
* "minimum allowed 3s" / "maximum allowed 10s", and omitting it defaults
* to a 10-second clip.
*
* @experimental Video generation is an experimental feature and may change.
*/
var GEMINI_VIDEO_DURATIONS = {
	"veo-3.1-generate-preview": {
		kind: "discrete",
		values: [
			4,
			6,
			8
		]
	},
	"veo-3.1-fast-generate-preview": {
		kind: "discrete",
		values: [
			4,
			6,
			8
		]
	},
	"veo-3.1-lite-generate-preview": {
		kind: "discrete",
		values: [
			4,
			6,
			8
		]
	},
	"gemini-omni-1.1-flash": {
		kind: "range",
		min: 3,
		max: 10,
		unit: "seconds"
	}
};
/**
* Look up the duration options for a Gemini video model.
*
* @experimental Video generation is an experimental feature and may change.
*/
function getGeminiVideoDurationOptions(model) {
	return GEMINI_VIDEO_DURATIONS[model];
}
//#endregion
export { GEMINI_VIDEO_DURATIONS, getGeminiVideoDurationOptions, isInteractionsVideoModel, parseGeminiOmniVideoSize };

//# sourceMappingURL=video-provider-options.js.map