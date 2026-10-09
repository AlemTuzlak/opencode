import { BaseEmbeddingAdapter } from '@tanstack/ai/adapters';
import { EmbeddingOptions, EmbeddingResult } from '@tanstack/ai';
import { Mistral } from '@mistralai/mistralai';
import { MistralEmbeddingModel, MistralEmbeddingModelInputModalitiesByName, MistralEmbeddingModelProviderOptionsByName } from '../model-meta.js';
import { MistralEmbeddingProviderOptions } from '../embedding/embedding-provider-options.js';
import { MistralClientConfig } from '../utils/client.js';
/**
 * Configuration for Mistral embedding adapter.
 */
export type MistralEmbeddingConfig = MistralClientConfig;
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
export declare class MistralEmbeddingAdapter<TModel extends MistralEmbeddingModel> extends BaseEmbeddingAdapter<TModel, MistralEmbeddingProviderOptions, MistralEmbeddingModelProviderOptionsByName, MistralEmbeddingModelInputModalitiesByName> {
    readonly name: "mistral";
    protected client: Mistral;
    constructor(config: MistralEmbeddingConfig, model: TModel);
    createEmbeddings(options: EmbeddingOptions<MistralEmbeddingProviderOptions>): Promise<EmbeddingResult>;
}
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
export declare function createMistralEmbedding<TModel extends MistralEmbeddingModel>(model: TModel, apiKey: string, config?: Omit<MistralEmbeddingConfig, 'apiKey'>): MistralEmbeddingAdapter<TModel>;
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
export declare function mistralEmbedding<TModel extends MistralEmbeddingModel>(model: TModel, config?: Omit<MistralEmbeddingConfig, 'apiKey'>): MistralEmbeddingAdapter<TModel>;
