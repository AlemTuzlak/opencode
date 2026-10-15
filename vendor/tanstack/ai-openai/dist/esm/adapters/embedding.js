import { getOpenAIApiKeyFromEnv } from "../utils/client.js";
import OpenAI$1 from "openai";
import { generateId } from "@tanstack/ai-utils";
import { BaseEmbeddingAdapter } from "@tanstack/ai/adapters";
import { requireTextOnlyEmbeddingInput } from "@tanstack/ai";
import { toRunErrorPayload } from "@tanstack/ai/adapter-internals";
//#region src/adapters/embedding.ts
/**
* OpenAI Embedding Adapter
*
* Tree-shakeable adapter for OpenAI text embeddings.
* Supports text-embedding-3-small and text-embedding-3-large.
*
* Features:
* - Batch embedding (one request for the whole input array)
* - Matryoshka dimension reduction via the top-level `dimensions` option
*/
var OpenAIEmbeddingAdapter = class extends BaseEmbeddingAdapter {
	name = "openai";
	client;
	constructor(config, model) {
		super(model, {});
		this.client = new OpenAI$1(config);
	}
	async createEmbeddings(options) {
		const { model, logger, modelOptions } = options;
		const texts = requireTextOnlyEmbeddingInput(options.input, this.name, model);
		try {
			const request = {
				...modelOptions,
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
/**
* Creates an OpenAI embedding adapter with explicit API key.
* Type resolution happens here at the call site.
*
* @param model - The model name (e.g., 'text-embedding-3-small')
* @param apiKey - Your OpenAI API key
* @param config - Optional additional configuration
* @returns Configured OpenAI embedding adapter instance with resolved types
*
* @example
* ```typescript
* const adapter = createOpenaiEmbedding('text-embedding-3-small', "sk-...");
*
* const result = await embed({
*   adapter,
*   input: 'a red guitar'
* });
* ```
*/
function createOpenaiEmbedding(model, apiKey, config) {
	return new OpenAIEmbeddingAdapter({
		apiKey,
		...config
	}, model);
}
/**
* Creates an OpenAI embedding adapter with automatic API key detection from environment variables.
* Type resolution happens here at the call site.
*
* Looks for `OPENAI_API_KEY` in:
* - `process.env` (Node.js)
* - `window.env` (Browser with injected env)
*
* @param model - The model name (e.g., 'text-embedding-3-small')
* @param config - Optional configuration (excluding apiKey which is auto-detected)
* @returns Configured OpenAI embedding adapter instance with resolved types
* @throws Error if OPENAI_API_KEY is not found in environment
*
* @example
* ```typescript
* // Automatically uses OPENAI_API_KEY from environment
* const adapter = openaiEmbedding('text-embedding-3-large');
*
* const result = await embed({
*   adapter,
*   input: ['a red guitar', 'a blue drum kit'],
*   dimensions: 1024
* });
*
* console.log(result.embeddings[0].vector)
* ```
*/
function openaiEmbedding(model, config) {
	return createOpenaiEmbedding(model, getOpenAIApiKeyFromEnv(), config);
}
//#endregion
export { OpenAIEmbeddingAdapter, createOpenaiEmbedding, openaiEmbedding };

//# sourceMappingURL=embedding.js.map