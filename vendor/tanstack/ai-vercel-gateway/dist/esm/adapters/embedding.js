import { getVercelGatewayApiKeyFromEnv, withVercelGatewayDefaults } from "../utils/client.js";
import { mapGatewayModelOptions } from "../utils/map-gateway-options.js";
import OpenAI from "openai";
import { generateId } from "@tanstack/ai-utils";
import { toRunErrorPayload } from "@tanstack/ai/adapter-internals";
import { BaseEmbeddingAdapter } from "@tanstack/ai/adapters";
import { requireTextOnlyEmbeddingInput } from "@tanstack/ai";
//#region src/adapters/embedding.ts
/**
* Vercel AI Gateway embedding adapter.
*
* Talks to `POST /v1/embeddings` on the public OpenAI-compatible Gateway API.
*/
var VercelGatewayEmbeddingAdapter = class extends BaseEmbeddingAdapter {
	name = "vercel-gateway";
	client;
	constructor(config, model) {
		super(model, {});
		this.client = new OpenAI(withVercelGatewayDefaults(config));
	}
	async createEmbeddings(options) {
		const { model, logger } = options;
		const texts = requireTextOnlyEmbeddingInput(options.input, this.name, model);
		const mapped = mapGatewayModelOptions(options.modelOptions);
		try {
			const request = {
				...mapped,
				model,
				input: texts,
				encoding_format: "float"
			};
			if (options.dimensions !== void 0) request.dimensions = options.dimensions;
			logger.request(`activity=embed provider=${this.name} model=${model} inputs=${texts.length}`, {
				provider: this.name,
				model
			});
			const response = await this.client.embeddings.create(request);
			const usage = {
				promptTokens: response.usage.prompt_tokens,
				completionTokens: 0,
				totalTokens: response.usage.total_tokens
			};
			return {
				id: generateId(this.name),
				model,
				embeddings: response.data.map((item) => ({
					vector: item.embedding,
					index: item.index
				})),
				usage
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
function createVercelGatewayEmbedding(model, apiKey, config) {
	return new VercelGatewayEmbeddingAdapter({
		apiKey,
		...config
	}, model);
}
function vercelGatewayEmbedding(model, config) {
	return createVercelGatewayEmbedding(model, getVercelGatewayApiKeyFromEnv(), config);
}
//#endregion
export { VercelGatewayEmbeddingAdapter, createVercelGatewayEmbedding, vercelGatewayEmbedding };

//# sourceMappingURL=embedding.js.map