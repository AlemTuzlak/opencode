import { flattenModalityTokenCounts, hasModalityTokens } from "../usage.js";
import { createGeminiClient, generateId, getGeminiApiKeyFromEnv } from "../utils/client.js";
import "../utils/index.js";
import { isGeminiNativeImageModel, parseNativeImageSize, sizeToAspectRatio, validateImageSize, validateNumberOfImages, validatePrompt } from "../image/image-provider-options.js";
import { ThinkingLevel } from "@google/genai";
import { fileReferenceFor, isFileSource, resolveMediaPrompt } from "@tanstack/ai";
import { BaseImageAdapter } from "@tanstack/ai/adapters";
//#region src/adapters/image.ts
/**
* Gemini Image Generation Adapter
*
* Tree-shakeable adapter for Gemini image generation functionality.
* Supports Imagen 3/4 models (via generateImages API) and Gemini native
* image models like Nano Banana 2 (via the Interactions API).
*
* Features:
* - Aspect ratio-based image sizing
* - Person generation controls
* - Safety filtering
* - Watermark options
* - Extended resolution tiers (Nano Banana 2)
*/
var GeminiImageAdapter = class extends BaseImageAdapter {
	kind = "image";
	name = "gemini";
	supportsFileSources = true;
	client;
	constructor(config, model) {
		super(model, config);
		this.client = createGeminiClient(config);
	}
	async generateImages(options) {
		const { model, logger } = options;
		logger.request(`activity=generateImage provider=gemini model=${this.model}`, {
			provider: "gemini",
			model: this.model
		});
		try {
			const resolved = resolveMediaPrompt(options.prompt);
			if (resolved.images.length === 0) validatePrompt({
				prompt: resolved.text,
				model
			});
			if (resolved.videos.length > 0) throw new Error(`${this.name}.generateImages does not support video prompt parts (model: ${model}).`);
			if (resolved.audios.length > 0) throw new Error(`${this.name}.generateImages does not support audio prompt parts (model: ${model}).`);
			if (isGeminiNativeImageModel(model)) return await this.generateWithGeminiApi(options, resolved);
			if (resolved.images.length > 0) throw new Error(`${this.name}: model "${model}" (Imagen) does not support image prompt parts. Use a Gemini-native image model (e.g. gemini-2.5-flash-image, "nano-banana") for image-conditioned generation.`);
			if (options.modelOptions?.previous_interaction_id) throw new Error(`${this.name}: previous_interaction_id is only supported on Gemini-native image models.`);
			validateImageSize(model, options.size);
			validateNumberOfImages(model, options.numberOfImages);
			const config = this.buildImagenConfig(options);
			const response = await this.client.models.generateImages({
				model,
				prompt: resolved.text,
				config
			});
			return this.transformImagenResponse(model, response);
		} catch (error) {
			logger.errors("gemini.generateImage fatal", {
				error,
				source: "gemini.generateImage"
			});
			throw error;
		}
	}
	async generateWithGeminiApi(options, resolved) {
		const { model, size, numberOfImages, modelOptions } = options;
		const parsedSize = size ? parseNativeImageSize(size) : void 0;
		const aspectRatio = modelOptions?.imageConfig?.aspectRatio ?? parsedSize?.aspectRatio;
		const imageSize = interactionImageSize(modelOptions?.imageConfig?.imageSize ?? parsedSize?.resolution);
		const thinking = modelOptions?.thinkingConfig;
		if (thinking?.thinkingBudget !== void 0) throw new Error(`${this.name}: thinkingConfig.thinkingBudget is not supported on the Interactions image API. Set thinkingConfig.thinkingLevel ('minimal' | 'low' | 'medium' | 'high') instead.`);
		const generationConfig = {
			...modelOptions?.seed !== void 0 && { seed: modelOptions.seed },
			...interactionThinking(thinking)
		};
		const request = {
			model,
			input: this.buildInteractionInput(resolved, numberOfImages),
			stream: false,
			response_format: {
				type: "image",
				...aspectRatio !== void 0 && { aspect_ratio: aspectRatio },
				...imageSize !== void 0 && { image_size: imageSize }
			},
			...modelOptions?.systemInstruction !== void 0 && { system_instruction: systemInstructionText(modelOptions.systemInstruction) },
			...Object.keys(generationConfig).length > 0 && { generation_config: generationConfig },
			...modelOptions?.previous_interaction_id && { previous_interaction_id: modelOptions.previous_interaction_id },
			...modelOptions?.store !== void 0 && { store: modelOptions.store }
		};
		if (modelOptions?.safetySettings !== void 0 && modelOptions.safetySettings.length > 0) Object.assign(request, { safety_settings: modelOptions.safetySettings.map(interactionSafety) });
		const interaction = options.abortSignal ? await this.client.interactions.create(request, { signal: options.abortSignal }) : await this.client.interactions.create(request);
		return this.transformInteractionResponse(model, interaction);
	}
	/**
	* Text-only prompts pass through as a string. Prompts with image parts
	* become content blocks in prompt order. The Interactions API has no
	* image count, so more than one image appends an instruction.
	*/
	buildInteractionInput(resolved, numberOfImages) {
		const countInstruction = numberOfImages && numberOfImages > 1 ? `Generate ${numberOfImages} distinct images.` : void 0;
		if (resolved.images.length === 0) return countInstruction ? `${resolved.text} ${countInstruction}` : resolved.text;
		const blocks = resolved.parts.map((part) => {
			if (part.type === "text") return {
				type: "text",
				text: part.content
			};
			if (part.type === "image") return this.imagePartToInteraction(part);
			throw new Error(`gemini: unsupported prompt part type "${part.type}" in image generation.`);
		});
		if (countInstruction) blocks.push({
			type: "text",
			text: countInstruction
		});
		return blocks;
	}
	imagePartToInteraction(part) {
		if (part.source.type === "data") return {
			type: "image",
			data: part.source.value,
			mime_type: part.source.mimeType || "image/png"
		};
		return {
			type: "image",
			uri: isFileSource(part.source) ? fileReferenceFor(part.source, this.name) : part.source.value,
			mime_type: part.source.mimeType ?? "image/jpeg"
		};
	}
	transformInteractionResponse(model, interaction) {
		if (interaction.status !== "completed") throw new Error(`Gemini ${model} image interaction ended with status "${interaction.status}".`);
		if (!interaction.id) throw new Error(`Gemini ${model} image interaction returned no id.`);
		const images = [];
		const textParts = [];
		for (const step of interaction.steps ?? []) {
			if (step.type !== "model_output") continue;
			for (const block of step.content ?? []) if (block.type === "image") {
				const image = generatedImageFromBlock(block);
				if (image) images.push(image);
			} else if (block.type === "text" && block.text.length > 0) textParts.push(block.text);
		}
		if (images.length === 0 && interaction.output_image) {
			const image = generatedImageFromBlock(interaction.output_image);
			if (image) images.push(image);
		}
		if (images.length === 0) {
			if (textParts.length === 0 && interaction.output_text) textParts.push(interaction.output_text);
			const reason = textParts.length > 0 ? `: ${textParts.join(" ").trim()}` : " (no image was returned).";
			throw new Error(`Gemini ${model} returned no images${reason}`);
		}
		const usage = interactionImageUsage(interaction.usage);
		return {
			id: interaction.id,
			model,
			images,
			...usage ? { usage } : {}
		};
	}
	buildImagenConfig(options) {
		const { size, numberOfImages, modelOptions } = options;
		const sizeAspectRatio = size ? sizeToAspectRatio(size) : void 0;
		return {
			numberOfImages: numberOfImages ?? 1,
			...sizeAspectRatio !== void 0 && { aspectRatio: sizeAspectRatio },
			...modelOptions?.aspectRatio !== void 0 && { aspectRatio: modelOptions.aspectRatio },
			...modelOptions?.personGeneration !== void 0 && { personGeneration: modelOptions.personGeneration },
			...modelOptions?.safetyFilterLevel !== void 0 && { safetyFilterLevel: modelOptions.safetyFilterLevel },
			...modelOptions?.seed !== void 0 && { seed: modelOptions.seed },
			...modelOptions?.addWatermark !== void 0 && { addWatermark: modelOptions.addWatermark },
			...modelOptions?.language !== void 0 && { language: modelOptions.language },
			...modelOptions?.negativePrompt !== void 0 && { negativePrompt: modelOptions.negativePrompt },
			...modelOptions?.outputMimeType !== void 0 && { outputMimeType: modelOptions.outputMimeType },
			...modelOptions?.outputCompressionQuality !== void 0 && { outputCompressionQuality: modelOptions.outputCompressionQuality },
			...modelOptions?.guidanceScale !== void 0 && { guidanceScale: modelOptions.guidanceScale },
			...modelOptions?.enhancePrompt !== void 0 && { enhancePrompt: modelOptions.enhancePrompt },
			...modelOptions?.includeSafetyAttributes !== void 0 && { includeSafetyAttributes: modelOptions.includeSafetyAttributes },
			...modelOptions?.includeRaiReason !== void 0 && { includeRaiReason: modelOptions.includeRaiReason },
			...modelOptions?.outputGcsUri !== void 0 && { outputGcsUri: modelOptions.outputGcsUri },
			...modelOptions?.labels !== void 0 && { labels: modelOptions.labels }
		};
	}
	transformImagenResponse(model, response) {
		const entries = response.generatedImages ?? [];
		const images = [];
		const filterReasons = [];
		for (const item of entries) {
			const b64Json = item.image?.imageBytes;
			if (b64Json) {
				images.push({
					b64Json,
					...item.enhancedPrompt !== void 0 && { revisedPrompt: item.enhancedPrompt }
				});
				continue;
			}
			const reason = item.raiFilteredReason;
			if (reason) filterReasons.push(reason);
		}
		if (entries.length > 0 && images.length === 0) {
			const joined = filterReasons.length > 0 ? filterReasons.join("; ") : "";
			throw new Error(`Imagen ${model} returned no images: all ${entries.length} generated image(s) were filtered by Responsible-AI${joined ? ` (${joined})` : ""}.`);
		}
		if (filterReasons.length > 0 && typeof console !== "undefined") console.warn(`[gemini-image] ${filterReasons.length} of ${entries.length} images from ${model} were filtered by Responsible-AI: ${filterReasons.join("; ")}`);
		return {
			id: generateId(this.name),
			model,
			images
		};
	}
};
function createGeminiImage(model, apiKey, config) {
	return new GeminiImageAdapter({
		apiKey,
		...config
	}, model);
}
function geminiImage(model, config) {
	return createGeminiImage(model, getGeminiApiKeyFromEnv(), config);
}
function interactionThinking(thinking) {
	if (!thinking) return {};
	const level = interactionThinkingLevel(thinking.thinkingLevel);
	return {
		...level !== void 0 && { thinking_level: level },
		...thinking.includeThoughts !== void 0 && { thinking_summaries: thinking.includeThoughts ? "auto" : "none" }
	};
}
function interactionImageSize(value) {
	if (value === "512" || value === "1K" || value === "2K" || value === "4K") return value;
}
function interactionThinkingLevel(level) {
	switch (level) {
		case ThinkingLevel.MINIMAL: return "minimal";
		case ThinkingLevel.LOW: return "low";
		case ThinkingLevel.MEDIUM: return "medium";
		case ThinkingLevel.HIGH: return "high";
		case ThinkingLevel.THINKING_LEVEL_UNSPECIFIED:
		case void 0: return;
	}
}
function interactionSafety(setting) {
	const category = setting.category;
	const threshold = setting.threshold;
	if (!category || category === "HARM_CATEGORY_UNSPECIFIED") throw new Error("gemini: safetySettings.category is required on the Interactions image API.");
	if (!threshold || threshold === "HARM_BLOCK_THRESHOLD_UNSPECIFIED") throw new Error("gemini: safetySettings.threshold is required on the Interactions image API.");
	return {
		type: category.replace(/^HARM_CATEGORY_/, "").toLowerCase(),
		threshold: threshold.toLowerCase()
	};
}
function systemInstructionText(instruction) {
	if (typeof instruction === "string") return instruction;
	if (Array.isArray(instruction)) return instruction.map(partUnionText).join("");
	if (isPart(instruction)) return partUnionText(instruction);
	const parts = instruction.parts;
	if (!parts || parts.length === 0) throw new Error("gemini: systemInstruction on the Interactions image API must be text.");
	return parts.map(partUnionText).join("");
}
function isPart(value) {
	return !("parts" in value);
}
function partUnionText(part) {
	if (typeof part === "string") return part;
	if (part.inlineData || part.fileData || part.functionCall || part.functionResponse) throw new Error("gemini: systemInstruction on the Interactions image API must be text. Inline media is not supported.");
	if (typeof part.text !== "string") throw new Error("gemini: systemInstruction on the Interactions image API must be text.");
	return part.text;
}
function generatedImageFromBlock(block) {
	if (typeof block.data === "string" && block.data.length > 0) return { b64Json: block.data };
	if (typeof block.uri === "string" && block.uri.length > 0) return { url: block.uri };
}
function interactionImageUsage(usage) {
	if (!usage) return void 0;
	const promptTokens = usage.total_input_tokens ?? 0;
	const completionTokens = usage.total_output_tokens ?? 0;
	const promptModalities = flattenModalityTokenCounts(usage.input_tokens_by_modality?.map((item) => ({
		modality: item.modality,
		tokenCount: item.tokens
	})));
	const completionModalities = flattenModalityTokenCounts(usage.output_tokens_by_modality?.map((item) => ({
		modality: item.modality,
		tokenCount: item.tokens
	})));
	const promptTokensDetails = {
		...hasModalityTokens(promptModalities) ? promptModalities : {},
		...usage.total_cached_tokens ? { cachedTokens: usage.total_cached_tokens } : {}
	};
	const completionTokensDetails = {
		...hasModalityTokens(completionModalities) ? completionModalities : {},
		...usage.total_thought_tokens ? { reasoningTokens: usage.total_thought_tokens } : {}
	};
	return {
		promptTokens,
		completionTokens,
		totalTokens: usage.total_tokens ?? promptTokens + completionTokens,
		...Object.keys(promptTokensDetails).length > 0 ? { promptTokensDetails } : {},
		...Object.keys(completionTokensDetails).length > 0 ? { completionTokensDetails } : {}
	};
}
//#endregion
export { GeminiImageAdapter, createGeminiImage, geminiImage };

//# sourceMappingURL=image.js.map