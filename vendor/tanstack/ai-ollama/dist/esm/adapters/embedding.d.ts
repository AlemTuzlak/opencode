import { BaseEmbeddingAdapter } from '@tanstack/ai/adapters';
import { OllamaClientConfig } from '../utils/client.js';
import { Ollama } from 'ollama';
import { EmbeddingOptions, EmbeddingResult } from '@tanstack/ai';
import { OllamaEmbeddingModel } from '../model-meta.js';
import { OllamaEmbeddingProviderOptions } from '../embedding/embedding-provider-options.js';
/**
 * Configuration for the Ollama Embedding adapter.
 * Ollama has no API key — only an optional host (and headers).
 */
export interface OllamaEmbeddingConfig extends OllamaClientConfig {
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
export declare class OllamaEmbeddingAdapter<TModel extends OllamaEmbeddingModel> extends BaseEmbeddingAdapter<TModel, OllamaEmbeddingProviderOptions> {
    readonly name: "ollama";
    protected client: Ollama;
    constructor(hostOrClientOrConfig: string | Ollama | OllamaEmbeddingConfig | undefined, model: TModel);
    createEmbeddings(options: EmbeddingOptions<OllamaEmbeddingProviderOptions>): Promise<EmbeddingResult>;
}
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
export declare function createOllamaEmbedding<TModel extends OllamaEmbeddingModel>(model: TModel, hostOrConfig?: string | OllamaEmbeddingConfig): OllamaEmbeddingAdapter<TModel>;
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
export declare function ollamaEmbedding<TModel extends OllamaEmbeddingModel>(model: TModel): OllamaEmbeddingAdapter<TModel>;
