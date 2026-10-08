import { createGeminiClient, generateId, getGeminiApiKeyFromEnv } from "../utils/client.js";
import "../utils/index.js";
import { requireTextOnlyEmbeddingInput } from "@tanstack/ai";
import { toRunErrorPayload } from "@tanstack/ai/adapter-internals";
import { BaseEmbeddingAdapter } from "@tanstack/ai/adapters";
//#region src/adapters/embedding.ts
/**
* Gemini Embedding Adapter
*
* Tree-shakeable adapter for Gemini text embeddings.
* Supports gemini-embedding-001.
*
* Features:
* - Batch embedding (one request for the whole input array)
* - Matryoshka dimension reduction via the top-level `dimensions` option
*   (mapped to the SDK's `outputDimensionality`)
* - Task-type hints (`taskType`, `title`) via provider options
*/
var GeminiEmbeddingAdapter = class extends BaseEmbeddingAdapter {
	name = "gemini";
	client;
	constructor(config, model) {
		super(model, {});
		this.client = createGeminiClient(config);
	}
	async createEmbeddings(options) {
		const { model, logger, modelOptions } = options;
		const texts = requireTextOnlyEmbeddingInput(options.input, this.name, model);
		try {
			const config = {};
			if (options.dimensions !== void 0) config.outputDimensionality = options.dimensions;
			if (modelOptions?.taskType !== void 0) config.taskType = modelOptions.taskType;
			if (modelOptions?.title !== void 0) config.title = modelOptions.title;
			logger.request(`activity=embed provider=${this.name} model=${model} inputs=${texts.length}`, {
				provider: this.name,
				model
			});
			const embeddings = (await this.client.models.embedContent({
				model,
				contents: texts,
				config
			})).embeddings;
			if (!embeddings || embeddings.length !== texts.length) throw new Error(`Gemini embedContent returned ${embeddings ? embeddings.length : "no"} embeddings for ${texts.length} inputs (model: ${model}).`);
			return {
				id: generateId(this.name),
				model,
				embeddings: embeddings.map((embedding, index) => ({
					vector: embedding.values ?? [],
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
/**
* Creates a Gemini embedding adapter with explicit API key.
* Type resolution happens here at the call site.
*
* @param model - The model name (e.g., 'gemini-embedding-001')
* @param apiKey - Your Google API key
* @param config - Optional additional configuration
* @returns Configured Gemini embedding adapter instance with resolved types
*
* @example
* ```typescript
* const adapter = createGeminiEmbedding('gemini-embedding-001', "your-api-key");
*
* const result = await embed({
*   adapter,
*   input: 'a red guitar'
* });
* ```
*/
function createGeminiEmbedding(model, apiKey, config) {
	return new GeminiEmbeddingAdapter({
		...config,
		apiKey
	}, model);
}
/**
* Creates a Gemini embedding adapter with automatic API key detection from environment variables.
* Type resolution happens here at the call site.
*
* Looks for `GOOGLE_API_KEY` or `GEMINI_API_KEY` in:
* - `process.env` (Node.js)
* - `window.env` (Browser with injected env)
*
* @param model - The model name (e.g., 'gemini-embedding-001')
* @param config - Optional configuration (excluding apiKey which is auto-detected)
* @returns Configured Gemini embedding adapter instance with resolved types
* @throws Error if GOOGLE_API_KEY or GEMINI_API_KEY is not found in environment
*
* @example
* ```typescript
* // Automatically uses GOOGLE_API_KEY from environment
* const adapter = geminiEmbedding('gemini-embedding-001');
*
* const result = await embed({
*   adapter,
*   input: ['a red guitar', 'a blue drum kit'],
*   dimensions: 1536
* });
*
* console.log(result.embeddings[0].vector)
* ```
*/
function geminiEmbedding(model, config) {
	return createGeminiEmbedding(model, getGeminiApiKeyFromEnv(), config);
}
//#endregion
export { GeminiEmbeddingAdapter, createGeminiEmbedding, geminiEmbedding };

//# sourceMappingURL=embedding.js.map