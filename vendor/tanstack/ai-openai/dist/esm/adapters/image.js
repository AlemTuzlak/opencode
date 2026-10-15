import { getOpenAIApiKeyFromEnv } from "../utils/client.js";
import { imagePartToFile } from "../image/image-input-to-file.js";
import { validateImageSize, validateNumberOfImages, validatePrompt } from "../image/image-provider-options.js";
import OpenAI$1 from "openai";
import { buildImagesUsage } from "@tanstack/openai-base";
import { generateId } from "@tanstack/ai-utils";
import { BaseImageAdapter } from "@tanstack/ai/adapters";
import { resolveMediaPrompt } from "@tanstack/ai";
import { toRunErrorPayload } from "@tanstack/ai/adapter-internals";
//#region src/adapters/image.ts
var EDIT_MAX_IMAGES = {
	"gpt-image-2.5-flare": 16,
	"gpt-image-2.5-sunburst": 16,
	"dall-e-2": 1,
	"gpt-image-1": 16,
	"gpt-image-1-mini": 16,
	"gpt-image-2": 16,
	"dall-e-3": 0
};
/**
* OpenAI Image Generation Adapter
*
* Tree-shakeable adapter for OpenAI image generation functionality.
* Supports gpt-image-2.5-flare, gpt-image-2.5-sunburst, gpt-image-2,
* gpt-image-1, gpt-image-1-mini, dall-e-3, and dall-e-2 models.
*
* Features:
* - Model-specific type-safe provider options
* - Size validation per model
* - Number of images validation
*/
var OpenAIImageAdapter = class extends BaseImageAdapter {
	kind = "image";
	name = "openai";
	client;
	allowUrlFetch;
	constructor(config, model) {
		super(model, {});
		const { allowUrlFetch, ...clientOptions } = config;
		this.client = new OpenAI$1(clientOptions);
		this.allowUrlFetch = allowUrlFetch ?? false;
	}
	async generateImages(options) {
		const { model, numberOfImages, size, modelOptions } = options;
		const resolved = resolveMediaPrompt(options.prompt);
		const prompt = resolved.text;
		validatePrompt({
			prompt,
			model
		});
		validateImageSize(model, size);
		validateNumberOfImages(model, numberOfImages);
		if (resolved.videos.length > 0) throw new Error(`${this.name}.generateImages does not support video prompt parts (model: ${model}).`);
		if (resolved.audios.length > 0) throw new Error(`${this.name}.generateImages does not support audio prompt parts (model: ${model}).`);
		if (resolved.images.length > 0) return this.editImages({
			model,
			prompt,
			numberOfImages,
			size,
			modelOptions,
			imageInputs: resolved.images,
			logger: options.logger
		});
		const request = {
			model,
			prompt,
			n: numberOfImages ?? 1,
			...modelOptions ?? {}
		};
		if (size !== void 0) request.size = size;
		try {
			options.logger.request(`activity=image provider=${this.name} model=${model} n=${request.n ?? 1} size=${request.size ?? "default"}`, {
				provider: this.name,
				model
			});
			const response = await this.client.images.generate({
				...request,
				stream: false
			});
			const images = (response.data ?? []).flatMap((item) => {
				const revisedPromptField = item.revised_prompt !== void 0 ? { revisedPrompt: item.revised_prompt } : {};
				if (item.b64_json) return [{
					b64Json: item.b64_json,
					...revisedPromptField
				}];
				if (item.url) return [{
					url: item.url,
					...revisedPromptField
				}];
				return [];
			});
			if (images.length === 0) throw new Error(`${this.name}: image response contained no images`);
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
	* Image-conditioned generation via OpenAI's `images.edit()` endpoint.
	* dall-e-2 accepts 1 input image; the gpt-image models accept up to 16;
	* dall-e-3 rejects entirely. A part with `metadata.role === 'mask'` is
	* routed to the SDK's `mask` field (PNG with alpha channel).
	*/
	async editImages(args) {
		const { model, prompt, numberOfImages, size, modelOptions, logger } = args;
		const maxImages = EDIT_MAX_IMAGES[model];
		if (maxImages === 0) throw new Error(`${this.name}: model "${model}" does not support image prompt parts. Use a gpt-image model or dall-e-2 for image-conditioned generation.`);
		const maskParts = args.imageInputs.filter((part) => part.metadata?.role === "mask");
		const sourceParts = args.imageInputs.filter((part) => part.metadata?.role !== "mask");
		if (maskParts.length > 1) throw new Error(`${this.name}: only one input with metadata.role === 'mask' is supported per request.`);
		if (sourceParts.length === 0) throw new Error(`${this.name}: the prompt contained only mask image parts; at least one source image is required.`);
		if (sourceParts.length > maxImages) throw new Error(`${this.name}: model "${model}" accepts at most ${maxImages} source image(s); received ${sourceParts.length}.`);
		const sourceFiles = await Promise.all(sourceParts.map((part, i) => imagePartToFile(part, `source-${i}`, this.allowUrlFetch)));
		const [firstSourceFile] = sourceFiles;
		const maskFile = maskParts[0] ? await imagePartToFile(maskParts[0], "mask", this.allowUrlFetch) : void 0;
		const request = {
			model,
			prompt,
			image: firstSourceFile && sourceFiles.length === 1 ? firstSourceFile : sourceFiles,
			n: numberOfImages ?? 1,
			stream: false,
			...modelOptions ?? {}
		};
		if (size !== void 0) request.size = size;
		if (maskFile) request.mask = maskFile;
		try {
			logger.request(`activity=imageEdit provider=${this.name} model=${model} n=${request.n ?? 1} size=${request.size ?? "default"} sources=${sourceFiles.length}${maskFile ? " mask" : ""}`, {
				provider: this.name,
				model
			});
			const response = await this.client.images.edit(request);
			const images = (response.data ?? []).flatMap((item) => {
				const revisedPromptField = item.revised_prompt !== void 0 ? { revisedPrompt: item.revised_prompt } : {};
				if (item.b64_json) return [{
					b64Json: item.b64_json,
					...revisedPromptField
				}];
				if (item.url) return [{
					url: item.url,
					...revisedPromptField
				}];
				return [];
			});
			if (images.length === 0) throw new Error(`${this.name}: image edit response contained no images`);
			return {
				id: generateId(this.name),
				model,
				images,
				...(() => {
					const usage = buildImagesUsage(response.usage);
					return usage ? { usage } : {};
				})()
			};
		} catch (error) {
			logger.errors(`${this.name}.editImages fatal`, {
				error: toRunErrorPayload(error, `${this.name}.editImages failed`),
				source: `${this.name}.editImages`
			});
			throw error;
		}
	}
};
/**
* Creates an OpenAI image adapter with explicit API key.
* Type resolution happens here at the call site.
*
* @param model - The model name (e.g., 'dall-e-3', 'gpt-image-1')
* @param apiKey - Your OpenAI API key
* @param config - Optional additional configuration
* @returns Configured OpenAI image adapter instance with resolved types
*
* @example
* ```typescript
* const adapter = createOpenaiImage('dall-e-3', "sk-...");
*
* const result = await generateImage({
*   adapter,
*   prompt: 'A cute baby sea otter'
* });
* ```
*/
function createOpenaiImage(model, apiKey, config) {
	return new OpenAIImageAdapter({
		apiKey,
		...config
	}, model);
}
/**
* Creates an OpenAI image adapter with automatic API key detection from environment variables.
* Type resolution happens here at the call site.
*
* Looks for `OPENAI_API_KEY` in:
* - `process.env` (Node.js)
* - `window.env` (Browser with injected env)
*
* @param model - The model name (e.g., 'dall-e-3', 'gpt-image-1')
* @param config - Optional configuration (excluding apiKey which is auto-detected)
* @returns Configured OpenAI image adapter instance with resolved types
* @throws Error if OPENAI_API_KEY is not found in environment
*
* @example
* ```typescript
* // Automatically uses OPENAI_API_KEY from environment
* const adapter = openaiImage('dall-e-3');
*
* const result = await generateImage({
*   adapter,
*   prompt: 'A beautiful sunset over mountains'
* });
* ```
*/
function openaiImage(model, config) {
	return createOpenaiImage(model, getOpenAIApiKeyFromEnv(), config);
}
//#endregion
export { OpenAIImageAdapter, createOpenaiImage, openaiImage };

//# sourceMappingURL=image.js.map