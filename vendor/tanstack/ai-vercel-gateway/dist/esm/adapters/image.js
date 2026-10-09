import { getVercelGatewayApiKeyFromEnv, withVercelGatewayDefaults } from "../utils/client.js";
import { mapGatewayModelOptions } from "../utils/map-gateway-options.js";
import OpenAI from "openai";
import { buildImagesUsage } from "@tanstack/openai-base";
import { generateId } from "@tanstack/ai-utils";
import { toRunErrorPayload } from "@tanstack/ai/adapter-internals";
import { BaseImageAdapter } from "@tanstack/ai/adapters";
import { resolveMediaPrompt } from "@tanstack/ai";
//#region src/adapters/image.ts
/**
* Vercel AI Gateway image adapter.
*
* Text-to-image only via `POST /v1/images/generations`.
*/
var VercelGatewayImageAdapter = class extends BaseImageAdapter {
	kind = "image";
	name = "vercel-gateway";
	client;
	constructor(config, model) {
		super(model, {});
		this.client = new OpenAI(withVercelGatewayDefaults(config));
	}
	async generateImages(options) {
		const { model, numberOfImages, size, logger } = options;
		const resolved = resolveMediaPrompt(options.prompt);
		const prompt = resolved.text;
		if (resolved.videos.length > 0) throw new Error(`${this.name}.generateImages does not support video prompt parts (model: ${model}).`);
		if (resolved.audios.length > 0) throw new Error(`${this.name}.generateImages does not support audio prompt parts (model: ${model}).`);
		if (resolved.images.length > 0) throw new Error(`${this.name}.generateImages does not support image edits in v1 (model: ${model}).`);
		const request = {
			...mapGatewayModelOptions(options.modelOptions),
			model,
			prompt,
			n: numberOfImages ?? 1
		};
		if (size !== void 0) request.size = size;
		try {
			logger.request(`activity=image provider=${this.name} model=${model} n=${request.n ?? 1} size=${request.size ?? "default"}`, {
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
			logger.errors(`${this.name}.generateImages fatal`, {
				error: toRunErrorPayload(error, `${this.name}.generateImages failed`),
				source: `${this.name}.generateImages`
			});
			throw error;
		}
	}
};
function createVercelGatewayImage(model, apiKey, config) {
	return new VercelGatewayImageAdapter({
		apiKey,
		...config
	}, model);
}
function vercelGatewayImage(model, config) {
	return createVercelGatewayImage(model, getVercelGatewayApiKeyFromEnv(), config);
}
//#endregion
export { VercelGatewayImageAdapter, createVercelGatewayImage, vercelGatewayImage };

//# sourceMappingURL=image.js.map