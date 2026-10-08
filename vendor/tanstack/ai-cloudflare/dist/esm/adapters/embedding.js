import { resolveConfigFromEnv } from "../utils/config.js";
import { runModel } from "../utils/run.js";
import { toRunErrorPayload } from "@tanstack/ai/adapter-internals";
import { generateId } from "@tanstack/ai-utils";
import { BaseEmbeddingAdapter } from "@tanstack/ai/adapters";
import { requireTextOnlyEmbeddingInput } from "@tanstack/ai";
//#region src/adapters/embedding.ts
/**
* Cloudflare embedding adapter. Runs Workers AI text-embedding models
* (`{ text: [...] }` in, `{ data: number[][] }` out) through the binding or
* the REST API.
*/
var CloudflareEmbeddingAdapter = class extends BaseEmbeddingAdapter {
	cfConfig;
	name = "cloudflare";
	constructor(cfConfig, model) {
		super(model, {});
		this.cfConfig = cfConfig;
	}
	async createEmbeddings(options) {
		const { model, logger } = options;
		const texts = requireTextOnlyEmbeddingInput(options.input, this.name, model);
		if (options.dimensions !== void 0) throw new Error("Workers AI embedding models have fixed dimensions; do not set `dimensions`");
		try {
			logger.request(`activity=embed provider=${this.name} model=${model} inputs=${texts.length}`, {
				provider: this.name,
				model
			});
			const output = await runModel(this.cfConfig, model, {
				...options.modelOptions,
				text: texts
			});
			if (!Array.isArray(output.data) || output.data.length !== texts.length) throw new Error(`Workers AI ${model} returned ${output.data?.length ?? 0} embeddings for ${texts.length} inputs`);
			return {
				id: generateId(this.name),
				model,
				embeddings: output.data.map((vector, index) => ({
					vector,
					index
				}))
			};
		} catch (error) {
			logger.errors(`${this.name}.createEmbeddings fatal`, {
				error: toRunErrorPayload(error, `${this.name}.createEmbeddings failed`),
				source: `${this.name}.createEmbeddings`
			});
			throw error;
		}
	}
};
function createCloudflareEmbedding(model, config) {
	return new CloudflareEmbeddingAdapter(config, model);
}
function cloudflareEmbedding(model, config) {
	return new CloudflareEmbeddingAdapter(resolveConfigFromEnv(config), model);
}
//#endregion
export { CloudflareEmbeddingAdapter, cloudflareEmbedding, createCloudflareEmbedding };

//# sourceMappingURL=embedding.js.map