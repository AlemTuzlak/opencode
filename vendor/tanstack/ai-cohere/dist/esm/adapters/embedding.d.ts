import { BaseEmbeddingAdapter } from '@tanstack/ai/adapters';
import { EmbeddingOptions, EmbeddingResult, ImagePart } from '@tanstack/ai';
import { CohereEmbeddingModel, CohereEmbeddingModelInputModalitiesByName, CohereEmbeddingModelProviderOptionsByName } from '../model-meta.js';
import { CohereEmbeddingProviderOptions } from '../embedding/embedding-provider-options.js';
import { CohereClientConfig } from '../utils/client.js';
/**
 * Configuration for Cohere embedding adapter.
 */
export interface CohereEmbeddingConfig extends CohereClientConfig {
}
/**
 * Cohere Embedding Adapter
 *
 * Tree-shakeable adapter for Cohere multimodal embeddings (embed-v4.0),
 * implemented with plain `fetch` against the v2/embed endpoint — no Cohere
 * SDK dependency.
 *
 * Features:
 * - Batch embedding (one request for the whole input array)
 * - Multimodal inputs: text, images, and fused text+image items (one vector
 *   per input item)
 * - Matryoshka dimension reduction via the top-level `dimensions` option
 *   (mapped to Cohere's `output_dimension`)
 */
export declare class CohereEmbeddingAdapter<TModel extends CohereEmbeddingModel> extends BaseEmbeddingAdapter<TModel, CohereEmbeddingProviderOptions, CohereEmbeddingModelProviderOptionsByName, CohereEmbeddingModelInputModalitiesByName> {
    readonly name: "cohere";
    protected clientConfig: CohereEmbeddingConfig;
    constructor(config: CohereEmbeddingConfig, model: TModel);
    createEmbeddings(options: EmbeddingOptions<CohereEmbeddingProviderOptions>): Promise<EmbeddingResult>;
    /**
     * Resolves an image part to a URL Cohere accepts. Cohere does not fetch
     * remote image URLs, so everything is normalized to a `data:` URI unless
     * the caller already provided one.
     */
    protected resolveImageUrl(image: ImagePart): Promise<string>;
}
/**
 * Creates a Cohere embedding adapter with explicit API key.
 * Type resolution happens here at the call site.
 *
 * @param model - The model name (e.g., 'embed-v4.0')
 * @param apiKey - Your Cohere API key
 * @param config - Optional additional configuration
 * @returns Configured Cohere embedding adapter instance with resolved types
 *
 * @example
 * ```typescript
 * const adapter = createCohereEmbedding('embed-v4.0', 'api_key');
 *
 * const result = await embed({
 *   adapter,
 *   input: 'a red guitar',
 *   modelOptions: { inputType: 'search_document' }
 * });
 * ```
 */
export declare function createCohereEmbedding<TModel extends CohereEmbeddingModel>(model: TModel, apiKey: string, config?: Omit<CohereEmbeddingConfig, 'apiKey'>): CohereEmbeddingAdapter<TModel>;
/**
 * Creates a Cohere embedding adapter using the `COHERE_API_KEY` environment variable.
 * Type resolution happens here at the call site.
 *
 * Looks for `COHERE_API_KEY` in:
 * - `process.env` (Node.js)
 * - `window.env` (Browser with injected env)
 *
 * @param model - The model name (e.g., 'embed-v4.0')
 * @param config - Optional configuration (excluding apiKey which is auto-detected)
 * @returns Configured Cohere embedding adapter instance with resolved types
 * @throws Error if COHERE_API_KEY is not found in environment
 *
 * @example
 * ```typescript
 * // Automatically uses COHERE_API_KEY from environment
 * const adapter = cohereEmbedding('embed-v4.0');
 *
 * const result = await embed({
 *   adapter,
 *   input: ['a red guitar', 'a blue drum kit'],
 *   modelOptions: { inputType: 'search_query' },
 *   dimensions: 1024
 * });
 *
 * console.log(result.embeddings[0].vector)
 * ```
 */
export declare function cohereEmbedding<TModel extends CohereEmbeddingModel>(model: TModel, config?: Omit<CohereEmbeddingConfig, 'apiKey'>): CohereEmbeddingAdapter<TModel>;
