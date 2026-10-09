//#region src/image/image-provider-options.ts
/**
* Gemini native image models that use the Interactions API path.
* These models take an aspect-ratio-based size rather than Imagen's
* WIDTHxHEIGHT pixel strings.
*
* This array is the single source of truth for the native/Imagen split: the
* `GeminiNativeImageModels` union and the per-model option/size/modality maps
* all derive from it. The `satisfies` clause makes a typo (or a name that
* is not a known image model) a build error rather than a phantom key on every
* per-model map.
*
* It is also the single source of truth for the adapter's runtime routing
* — see {@link isGeminiNativeImageModel}. Adding a new `gemini-*` image model
* means adding it here as well as to `GEMINI_IMAGE_MODELS` in model-meta.
* Until it is listed here it routes to the Imagen API instead and fails
* loudly on the first call, rather than silently taking the wrong option
* shape.
*/
var GEMINI_NATIVE_IMAGE_MODELS = [
	"gemini-nano-banana-2.1",
	"gemini-3.1-flash-image",
	"gemini-3.1-flash-image-preview",
	"gemini-3.1-flash-lite-image",
	"gemini-3-pro-image",
	"gemini-3-pro-image-preview",
	"gemini-2.5-flash-image"
];
var NATIVE_IMAGE_MODEL_NAMES = new Set(GEMINI_NATIVE_IMAGE_MODELS);
/**
* Runtime counterpart to {@link GeminiNativeImageModels} — decides which of
* the two Gemini image APIs a model goes to.
*
* Membership in {@link GEMINI_NATIVE_IMAGE_MODELS}, not a `gemini-` prefix
* test, so the runtime route and the type-level split cannot drift apart. An
* id this package does not know about reaches the Imagen endpoint and fails
* there, which is the intended signal to add the model here rather than to
* have it silently take the native path with Imagen-shaped option types.
*/
function isGeminiNativeImageModel(model) {
	return NATIVE_IMAGE_MODEL_NAMES.has(model);
}
/**
* Valid sizes for Gemini Imagen models
* Gemini uses aspect ratios, but we map common WIDTHxHEIGHT formats to aspect ratios
* These are approximate mappings based on common image dimensions
*/
var GEMINI_SIZE_TO_ASPECT_RATIO = {
	"1024x1024": "1:1",
	"512x512": "1:1",
	"1024x768": "4:3",
	"1536x1024": "4:3",
	"1792x1024": "16:9",
	"1920x1080": "16:9",
	"768x1024": "3:4",
	"1024x1536": "3:4",
	"1024x1792": "9:16",
	"1080x1920": "9:16"
};
/**
* Maps a WIDTHxHEIGHT size string to a Gemini aspect ratio
* Returns undefined if the size cannot be mapped
*/
function sizeToAspectRatio(size) {
	if (!size) return void 0;
	return GEMINI_SIZE_TO_ASPECT_RATIO[size];
}
/**
* Validates that the provided size can be mapped to an aspect ratio
* Throws an error if the size is invalid
*/
function validateImageSize(model, size) {
	if (!size) return;
	if (!sizeToAspectRatio(size)) {
		const validSizes = Object.keys(GEMINI_SIZE_TO_ASPECT_RATIO);
		throw new Error(`Invalid size "${size}" for model "${model}". Gemini Imagen uses aspect ratios. Valid sizes that map to aspect ratios: ${validSizes.join(", ")}. Alternatively, use providerOptions.aspectRatio directly with values: 1:1, 3:4, 4:3, 9:16, 16:9, 9:21, 21:9`);
	}
}
/**
* Per-model caps on images per request.
* The Imagen 4 family all support up to 4 images per request via the Gemini
* API (the rumored 8-image tier is Vertex-only and isn't reachable through
* @google/genai today). Unknown models fall through to the shared cap
* defined below.
*
* @see https://ai.google.dev/gemini-api/docs/imagen
*/
var IMAGEN_MAX_IMAGES_BY_MODEL = {
	"imagen-4.0-generate-001": 4,
	"imagen-4.0-ultra-generate-001": 4,
	"imagen-4.0-fast-generate-001": 4
};
var DEFAULT_IMAGEN_MAX_IMAGES = 4;
/**
* Validates the number of images requested against the model's known cap.
* Uses a per-model table where available and falls back to the shared
* default otherwise — no more "some support up to 8" comments that don't
* match the error message.
*/
function validateNumberOfImages(model, numberOfImages) {
	if (numberOfImages === void 0) return;
	const maxImages = IMAGEN_MAX_IMAGES_BY_MODEL[model] ?? DEFAULT_IMAGEN_MAX_IMAGES;
	if (numberOfImages < 1 || numberOfImages > maxImages) throw new Error(`Invalid numberOfImages "${numberOfImages}" for model "${model}". Must be between 1 and ${maxImages}.`);
}
/**
* Validates the prompt is not empty
*/
function validatePrompt(options) {
	const { prompt, model } = options;
	if (!prompt || prompt.trim().length === 0) throw new Error(`Prompt cannot be empty for model "${model}".`);
}
/**
* Parses a Gemini native image size string into its components.
*
* Format: `"aspectRatio_resolution"`, e.g. `"16:9_4K"` →
* `{ aspectRatio: "16:9", resolution: "4K" }`.
*
* The resolution suffix is optional: `gemini-2.5-flash-image` takes a bare
* aspect ratio (`"16:9"` → `{ aspectRatio: "16:9" }`) because Google documents
* no `image_size` for it, and the caller must then omit `imageSize` from the
* request rather than substituting a default.
*/
function parseNativeImageSize(size) {
	const [, aspectRatio, resolution] = size.match(/^(\d+:\d+)(?:_(.+))?$/) ?? [];
	if (aspectRatio === void 0) return void 0;
	return {
		aspectRatio,
		...resolution !== void 0 && { resolution }
	};
}
//#endregion
export { GEMINI_NATIVE_IMAGE_MODELS, GEMINI_SIZE_TO_ASPECT_RATIO, isGeminiNativeImageModel, parseNativeImageSize, sizeToAspectRatio, validateImageSize, validateNumberOfImages, validatePrompt };

//# sourceMappingURL=image-provider-options.js.map