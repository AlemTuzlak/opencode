import { createMistralClient, generateId, getMistralApiKeyFromEnv } from "../utils/client.js";
import { requireTextOnlyEmbeddingInput } from "@tanstack/ai";
import { BaseEmbeddingAdapter } from "@tanstack/ai/adapters";
import { toRunErrorPayload } from "@tanstack/ai/adapter-internals";
//#region src/adapters/embedding.ts
/**
* Mistral Embedding Adapter
*
* Tree-shakeable adapter for Mistral text embeddings.
* Supports mistral-embed and codestral-embed.
*
* Features:
* - Batch embedding (one request for the whole input array)
* - Dimension reduction for codestral-embed via the top-level `dimensions`
*   option (mapped to Mistral's `outputDimension`); mistral-embed has a fixed
*   1024-dimension output and rejects `dimensions`.
*/
var MistralEmbeddingAdapter = class extends BaseEmbeddingAdapter {
	name = "mistral";
	client;
	constructor(config, model) {
		super(model, {});
		this.client = createMistralClient(config);
	}
	async createEmbeddings(options) {
		const { model, logger, modelOptions } = options;
		const texts = requireTextOnlyEmbeddingInput(options.input, this.name, model);
		if (options.dimensions !== void 0 && model === "mistral-embed") throw new Error("mistral-embed does not support requesting dimensions (output is a fixed 1024-dimension vector). Use codestral-embed for dimension reduction, or omit `dimensions`.");
		try {
			const request = {
				...modelOptions,
				model,
				inputs: texts
			};
			if (options.dimensions !== void 0) request.outputDimension = options.dimensions;
			logger.request(`activity=embed provider=${this.name} model=${model} inputs=${texts.length}`, {
				provider: this.name,
				model
			});
			const response = await this.client.embeddings.create(request);
			const usage = {
				promptTokens: response.usage.promptTokens ?? 0,
				completionTokens: 0,
				totalTokens: response.usage.totalTokens ?? 0
			};
			return {
				id: generateId(this.name),
				model,
				embeddings: response.data.map((item, arrayIndex) => ({
					vector: item.embedding ?? [],
					index: item.index ?? arrayIndex
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
/**
* Creates a Mistral embedding adapter with explicit API key.
* Type resolution happens here at the call site.
*
* @param model - The model name (e.g., 'mistral-embed')
* @param apiKey - Your Mistral API key
* @param config - Optional additional configuration
* @returns Configured Mistral embedding adapter instance with resolved types
*
* @example
* ```typescript
* const adapter = createMistralEmbedding('mistral-embed', 'api_key');
*
* const result = await embed({
*   adapter,
*   input: 'a red guitar'
* });
* ```
*/
function createMistralEmbedding(model, apiKey, config) {
	return new MistralEmbeddingAdapter({
		apiKey,
		...config
	}, model);
}
/**
* Creates a Mistral embedding adapter using the `MISTRAL_API_KEY` environment variable.
* Type resolution happens here at the call site.
*
* Looks for `MISTRAL_API_KEY` in:
* - `process.env` (Node.js)
* - `window.env` (Browser with injected env)
*
* @param model - The model name (e.g., 'codestral-embed')
* @param config - Optional configuration (excluding apiKey which is auto-detected)
* @returns Configured Mistral embedding adapter instance with resolved types
* @throws Error if MISTRAL_API_KEY is not found in environment
*
* @example
* ```typescript
* // Automatically uses MISTRAL_API_KEY from environment
* const adapter = mistralEmbedding('codestral-embed');
*
* const result = await embed({
*   adapter,
*   input: ['a red guitar', 'a blue drum kit'],
*   dimensions: 256
* });
*
* console.log(result.embeddings[0].vector)
* ```
*/
function mistralEmbedding(model, config) {
	return createMistralEmbedding(model, getMistralApiKeyFromEnv(), config);
}
//#endregion
export { MistralEmbeddingAdapter, createMistralEmbedding, mistralEmbedding };

//# sourceMappingURL=embedding.js.map