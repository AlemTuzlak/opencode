import { createOllamaClient, getOllamaHostFromEnv } from "../utils/client.js";
import "../utils/index.js";
import { requireTextOnlyEmbeddingInput } from "@tanstack/ai";
import { toRunErrorPayload } from "@tanstack/ai/adapter-internals";
import { BaseEmbeddingAdapter } from "@tanstack/ai/adapters";
import { generateId } from "@tanstack/ai-utils";
//#region src/adapters/embedding.ts
/**
* Extract `prompt_eval_count` through an optional-field view of the response.
* The Ollama SDK types it as required, but servers can omit it at runtime;
* widening here keeps the presence check honest without any casts.
*/
function extractPromptEvalCount(response) {
	return response.prompt_eval_count;
}
/**
* Ollama Embedding Adapter
*
* Tree-shakeable adapter for Ollama text embeddings (`/api/embed`).
*
* Notes:
* - Batch embedding: one request for the whole input array.
* - Ollama models are loaded dynamically, so any model name string is
*   accepted; `OLLAMA_EMBEDDING_MODELS` lists common embedding models.
* - Ollama does not support requesting embedding dimensions, so the
*   top-level `dimensions` option is rejected.
*/
var OllamaEmbeddingAdapter = class extends BaseEmbeddingAdapter {
	name = "ollama";
	client;
	constructor(hostOrClientOrConfig, model) {
		super(model, {});
		if (typeof hostOrClientOrConfig === "string" || hostOrClientOrConfig === void 0) this.client = createOllamaClient({ host: hostOrClientOrConfig });
		else if ("embed" in hostOrClientOrConfig) this.client = hostOrClientOrConfig;
		else this.client = createOllamaClient(hostOrClientOrConfig);
	}
	async createEmbeddings(options) {
		const { model, logger, modelOptions } = options;
		const texts = requireTextOnlyEmbeddingInput(options.input, this.name, model);
		if (options.dimensions !== void 0) throw new Error("Ollama does not support requesting embedding dimensions");
		try {
			const request = {
				model,
				input: texts
			};
			if (modelOptions?.truncate !== void 0) request.truncate = modelOptions.truncate;
			if (modelOptions?.keepAlive !== void 0) request.keep_alive = modelOptions.keepAlive;
			if (modelOptions?.options !== void 0) request.options = { ...modelOptions.options };
			logger.request(`activity=embed provider=${this.name} model=${model} inputs=${texts.length}`, {
				provider: this.name,
				model
			});
			const response = await this.client.embed(request);
			const promptEvalCount = extractPromptEvalCount(response);
			const usage = promptEvalCount !== void 0 ? {
				promptTokens: promptEvalCount,
				completionTokens: 0,
				totalTokens: promptEvalCount
			} : void 0;
			return {
				id: generateId(this.name),
				model,
				embeddings: response.embeddings.map((vector, index) => ({
					vector,
					index
				})),
				...usage !== void 0 && { usage }
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
* Creates an Ollama embedding adapter with explicit host (or client config).
* Type resolution happens here at the call site.
*
* @param model - The model name (e.g., 'nomic-embed-text')
* @param hostOrConfig - Ollama host URL or client config (defaults to http://localhost:11434)
* @returns Configured Ollama embedding adapter instance with resolved types
*
* @example
* ```typescript
* const adapter = createOllamaEmbedding('nomic-embed-text', 'http://localhost:11434');
*
* const result = await embed({
*   adapter,
*   input: 'a red guitar'
* });
* ```
*/
function createOllamaEmbedding(model, hostOrConfig) {
	return new OllamaEmbeddingAdapter(hostOrConfig, model);
}
/**
* Creates an Ollama embedding adapter with host from the `OLLAMA_HOST`
* environment variable (falling back to the Ollama default).
* Type resolution happens here at the call site.
*
* @param model - The model name (e.g., 'nomic-embed-text')
* @returns Configured Ollama embedding adapter instance with resolved types
*
* @example
* ```typescript
* const adapter = ollamaEmbedding('mxbai-embed-large');
*
* const result = await embed({
*   adapter,
*   input: ['a red guitar', 'a blue drum kit']
* });
*
* console.log(result.embeddings[0].vector)
* ```
*/
function ollamaEmbedding(model) {
	return new OllamaEmbeddingAdapter(getOllamaHostFromEnv(), model);
}
//#endregion
export { OllamaEmbeddingAdapter, createOllamaEmbedding, ollamaEmbedding };

//# sourceMappingURL=embedding.js.map