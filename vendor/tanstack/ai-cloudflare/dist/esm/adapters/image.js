import { resolveConfigFromEnv } from "../utils/config.js";
import { outputToBase64, runModel } from "../utils/run.js";
import { toRunErrorPayload } from "@tanstack/ai/adapter-internals";
import { generateId } from "@tanstack/ai-utils";
import { BaseImageAdapter } from "@tanstack/ai/adapters";
import { resolveMediaPrompt } from "@tanstack/ai";
//#region src/adapters/image.ts
/**
* Cloudflare image adapter. Runs Workers AI text-to-image models and returns
* base64 images, whether the model answers with `{ image }` JSON (Flux,
* Leonardo) or raw PNG bytes (Stable Diffusion).
*/
var CloudflareImageAdapter = class extends BaseImageAdapter {
	cfConfig;
	name = "cloudflare";
	constructor(cfConfig, model) {
		super(model, {});
		this.cfConfig = cfConfig;
	}
	async generateImages(options) {
		const { model, logger, numberOfImages = 1 } = options;
		const prompt = resolveMediaPrompt(options.prompt);
		const [width, height] = options.size?.split("x").map(Number) ?? [];
		const inputs = {
			...width && { width },
			...height && { height },
			...options.modelOptions,
			prompt: prompt.text
		};
		try {
			logger.request(`activity=image provider=${this.name} model=${model} n=${numberOfImages}`, {
				provider: this.name,
				model
			});
			const images = await Promise.all(Array.from({ length: numberOfImages }, async () => {
				const output = await runModel(this.cfConfig, model, inputs, { signal: options.abortSignal });
				return { b64Json: output && typeof output === "object" && "image" in output ? output.image : await outputToBase64(output) };
			}));
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
function createCloudflareImage(model, config) {
	return new CloudflareImageAdapter(config, model);
}
function cloudflareImage(model, config) {
	return new CloudflareImageAdapter(resolveConfigFromEnv(config), model);
}
//#endregion
export { CloudflareImageAdapter, cloudflareImage, createCloudflareImage };

//# sourceMappingURL=image.js.map