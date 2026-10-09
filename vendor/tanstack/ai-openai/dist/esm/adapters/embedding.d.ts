import { default as OpenAI } from 'openai';
import { BaseEmbeddingAdapter } from '@tanstack/ai/adapters';
import { EmbeddingOptions, EmbeddingResult } from '@tanstack/ai';
import { OpenAIEmbeddingModel, OpenAIEmbeddingModelInputModalitiesByName, OpenAIEmbeddingModelProviderOptionsByName } from '../model-meta.js';
import { OpenAIEmbeddingProviderOptions } from '../embedding/embedding-provider-options.js';
import { OpenAIClientConfig } from '../utils/client.js';
/**
 * Configuration for OpenAI Embedding adapter
 */
export interface OpenAIEmbeddingConfig extends OpenAIClientConfig {
}
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
export declare class OpenAIEmbeddingAdapter<TModel extends OpenAIEmbeddingModel> extends BaseEmbeddingAdapter<TModel, OpenAIEmbeddingProviderOptions, OpenAIEmbeddingModelProviderOptionsByName, OpenAIEmbeddingModelInputModalitiesByName> {
    readonly name: "openai";
    protected client: OpenAI;
    constructor(config: OpenAIEmbeddingConfig, model: TModel);
    createEmbeddings(options: EmbeddingOptions<OpenAIEmbeddingProviderOptions>): Promise<EmbeddingResult>;
}
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
export declare function createOpenaiEmbedding<TModel extends OpenAIEmbeddingModel>(model: TModel, apiKey: string, config?: Omit<OpenAIEmbeddingConfig, 'apiKey'>): OpenAIEmbeddingAdapter<TModel>;
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
export declare function openaiEmbedding<TModel extends OpenAIEmbeddingModel>(model: TModel, config?: Omit<OpenAIEmbeddingConfig, 'apiKey'>): OpenAIEmbeddingAdapter<TModel>;
