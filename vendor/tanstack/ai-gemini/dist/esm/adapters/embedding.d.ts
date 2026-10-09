import { BaseEmbeddingAdapter } from '@tanstack/ai/adapters';
import { EmbeddingOptions, EmbeddingResult } from '@tanstack/ai';
import { GoogleGenAI } from '@google/genai';
import { GeminiEmbeddingModel, GeminiEmbeddingModelInputModalitiesByName, GeminiEmbeddingModelProviderOptionsByName } from '../model-meta.js';
import { GeminiEmbeddingProviderOptions } from '../embedding/embedding-provider-options.js';
import { GeminiClientConfig } from '../utils/client.js';
/**
 * Configuration for Gemini Embedding adapter
 */
export interface GeminiEmbeddingConfig extends GeminiClientConfig {
}
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
export declare class GeminiEmbeddingAdapter<TModel extends GeminiEmbeddingModel> extends BaseEmbeddingAdapter<TModel, GeminiEmbeddingProviderOptions, GeminiEmbeddingModelProviderOptionsByName, GeminiEmbeddingModelInputModalitiesByName> {
    readonly name: "gemini";
    protected client: GoogleGenAI;
    constructor(config: GeminiEmbeddingConfig, model: TModel);
    createEmbeddings(options: EmbeddingOptions<GeminiEmbeddingProviderOptions>): Promise<EmbeddingResult>;
}
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
export declare function createGeminiEmbedding<TModel extends GeminiEmbeddingModel>(model: TModel, apiKey: string, config?: Omit<GeminiEmbeddingConfig, 'apiKey'>): GeminiEmbeddingAdapter<TModel>;
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
export declare function geminiEmbedding<TModel extends GeminiEmbeddingModel>(model: TModel, config?: Omit<GeminiEmbeddingConfig, 'apiKey'>): GeminiEmbeddingAdapter<TModel>;
