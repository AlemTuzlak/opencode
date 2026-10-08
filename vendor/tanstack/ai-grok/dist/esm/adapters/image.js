import { getGrokApiKeyFromEnv, withGrokDefaults } from "../utils/client.js";
import { isGrokImagineImageModel, parseGrokImagineSize, validateImageSize, validateNumberOfImages, validatePrompt } from "../image/image-provider-options.js";
import OpenAI$1 from "openai";
import { isFileSource, resolveMediaPrompt, unsupportedFileSourceError } from "@tanstack/ai";
import { buildImagesUsage } from "@tanstack/openai-base";
import { generateId } from "@tanstack/ai-utils";
import { toRunErrorPayload } from "@tanstack/ai/adapter-internals";
import { BaseImageAdapter } from "@tanstack/ai/adapters";
//#region src/adapters/image.ts
/** Maximum source images accepted by xAI's image edit endpoint. */
var MAX_EDIT_IMAGES = 3;
/**
* Maps the generic `size` option onto Imagine API parameters: the
* "aspectRatio_resolution" template ("16:9_2k") splits into `aspect_ratio`
* and optional `resolution` request fields.
*/
function imagineSizeParams(size) {
	if (!size) return {};
	const parsed = parseGrokImagineSize(size);
	if (!parsed) return {};
	return {
		aspect_ratio: parsed.aspectRatio,
		...parsed.resolution !== void 0 && { resolution: parsed.resolution }
	};
}
/**
* Convert a TanStack ImagePart to the URL string accepted by xAI's edit
* endpoint: public URLs pass through (fetched by xAI's servers), data
* sources become base64 data URIs.
*/
function imagePartToUrl(part) {
	if (isFileSource(part.source)) throw unsupportedFileSourceError("grok");
	if (part.source.type === "url") return part.source.value;
	return `data:${part.source.mimeType};base64,${part.source.value}`;
}
/**
* Grok Image Generation Adapter
*
* Tree-shakeable adapter for Grok image generation functionality.
* Supports the grok-imagine image models. Image prompt parts use xAI's
* `/v1/images/edits` endpoint (up to 3 source images).
*
* Features:
* - Model-specific type-safe provider options
* - Size / aspect-ratio validation per model
* - Number of images validation
*/
var GrokImageAdapter = class extends BaseImageAdapter {
	kind = "image";
	name = "grok";
	client;
	clientConfig;
	constructor(config, model) {
		super(model, {});
		this.clientConfig = withGrokDefaults(config);
		this.client = new OpenAI$1(this.clientConfig);
	}
	async generateImages(options) {
		const { model, numberOfImages, size, modelOptions } = options;
		if (!isGrokImagineImageModel(model)) throw new Error(`Unknown image model: ${model}. Supported models: grok-imagine-image, grok-imagine-image-2.0, grok-imagine-image-quality.`);
		const resolved = resolveMediaPrompt(options.prompt);
		const prompt = resolved.text;
		if (resolved.videos.length > 0 || resolved.audios.length > 0) throw new Error(`grok.generateImages does not support video / audio prompt parts on model ${model}.`);
		if (resolved.images.length > 0) return await this.editImages(options, resolved);
		validatePrompt(prompt);
		validateImageSize(model, size);
		validateNumberOfImages(model, numberOfImages);
		const request = {
			model,
			prompt,
			n: numberOfImages ?? 1,
			...imagineSizeParams(size),
			stream: false,
			...modelOptions
		};
		try {
			options.logger.request(`activity=image provider=${this.name} model=${model} n=${request.n ?? 1} size=${request.size ?? "default"}`, {
				provider: this.name,
				model
			});
			const response = await this.client.images.generate(request);
			const images = (response.data ?? []).flatMap((item) => {
				const revisedPrompt = item.revised_prompt;
				if (item.b64_json) return [{
					b64Json: item.b64_json,
					...revisedPrompt !== void 0 && { revisedPrompt }
				}];
				if (item.url) return [{
					url: item.url,
					...revisedPrompt !== void 0 && { revisedPrompt }
				}];
				return [];
			});
			const usage = buildImagesUsage(response.usage);
			return {
				id: generateId(this.name),
				model,
				images,
				...usage ? { usage } : {}
			};
		} catch (error) {
			options.logger.errors(`${this.name}.generateImages fatal`, {
				error: toRunErrorPayload(error, `${this.name}.generateImages failed`),
				source: `${this.name}.generateImages`
			});
			throw error;
		}
	}
	/**
	* Image-conditioned generation via xAI's Imagine API.
	*
	* The `/v1/images/edits` endpoint takes `application/json` (the OpenAI
	* SDK's `images.edit()` sends `multipart/form-data`, which xAI rejects),
	* so this path issues the request directly. One input is sent as
	* `image: { url }`; multiple inputs (up to 3) as `images: [{ url }, ...]`,
	* addressed by xAI in the order they are sent. The prompt text is sent
	* verbatim — no referencing markers are injected.
	*/
	async editImages(options, resolved) {
		const { model, numberOfImages, size, modelOptions, logger } = options;
		const prompt = resolved.text;
		const imageInputs = resolved.images;
		const unsupportedRole = imageInputs.find((part) => part.metadata?.role === "mask" || part.metadata?.role === "control");
		if (unsupportedRole) throw new Error(`grok: the Imagine API has no ${unsupportedRole.metadata?.role} input; only source/reference images are supported.`);
		if (imageInputs.length > MAX_EDIT_IMAGES) throw new Error(`grok: model "${model}" accepts at most ${MAX_EDIT_IMAGES} source images; received ${imageInputs.length}.`);
		validatePrompt(prompt);
		validateImageSize(model, size);
		validateNumberOfImages(model, numberOfImages);
		const urls = imageInputs.map((part) => imagePartToUrl(part));
		const request = {
			model,
			prompt,
			...urls.length === 1 ? { image: { url: urls[0] } } : { images: urls.map((url) => ({ url })) },
			...numberOfImages !== void 0 && { n: numberOfImages },
			...imagineSizeParams(size),
			...modelOptions
		};
		try {
			logger.request(`activity=image provider=${this.name} model=${model} edit images=${urls.length}`, {
				provider: this.name,
				model
			});
			const response = await fetch(`${this.clientConfig.baseURL}/images/edits`, {
				method: "POST",
				headers: {
					"Content-Type": "application/json",
					Authorization: `Bearer ${this.clientConfig.apiKey}`
				},
				body: JSON.stringify(request)
			});
			if (!response.ok) {
				const body = await response.text();
				throw new Error(`grok: image edit request failed (${response.status} ${response.statusText}): ${body}`);
			}
			const images = ((await response.json()).data ?? []).flatMap((item) => {
				if (item.b64_json) return [{ b64Json: item.b64_json }];
				if (item.url) return [{ url: item.url }];
				return [];
			});
			if (images.length === 0) throw new Error("grok: image edit response contained no images");
			return {
				id: generateId(this.name),
				model,
				images
			};
		} catch (error) {
			logger.errors(`${this.name}.generateImages fatal`, {
				error: toRunErrorPayload(error, `${this.name}.generateImages failed`),
				source: `${this.name}.generateImages`
			});
			throw error;
		}
	}
};
/**
* Creates a Grok image adapter with explicit API key.
* Type resolution happens here at the call site.
*
* @param model - The model name (e.g., 'grok-imagine-image-2.0')
* @param apiKey - Your xAI API key
* @param config - Optional additional configuration
* @returns Configured Grok image adapter instance with resolved types
*
* @example
* ```typescript
* const adapter = createGrokImage('grok-imagine-image-2.0', "xai-...");
*
* const result = await generateImage({
*   adapter,
*   prompt: 'A cute baby sea otter'
* });
* ```
*/
function createGrokImage(model, apiKey, config) {
	return new GrokImageAdapter({
		apiKey,
		...config
	}, model);
}
/**
* Creates a Grok image adapter with automatic API key detection from environment variables.
* Type resolution happens here at the call site.
*
* Looks for `XAI_API_KEY` in:
* - `process.env` (Node.js)
* - `window.env` (Browser with injected env)
*
* @param model - The model name (e.g., 'grok-imagine-image-2.0')
* @param config - Optional configuration (excluding apiKey which is auto-detected)
* @returns Configured Grok image adapter instance with resolved types
* @throws Error if XAI_API_KEY is not found in environment
*
* @example
* ```typescript
* // Automatically uses XAI_API_KEY from environment
* const adapter = grokImage('grok-imagine-image-2.0');
*
* const result = await generateImage({
*   adapter,
*   prompt: 'A beautiful sunset over mountains'
* });
* ```
*/
function grokImage(model, config) {
	return createGrokImage(model, getGrokApiKeyFromEnv(), config);
}
//#endregion
export { GrokImageAdapter, createGrokImage, grokImage };

//# sourceMappingURL=image.js.map