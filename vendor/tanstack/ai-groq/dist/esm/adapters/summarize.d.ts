import { ChatStreamSummarizeAdapter, InferTextProviderOptions } from '@tanstack/ai/adapters';
import { GroqTextAdapter } from './text.js';
import { GROQ_CHAT_MODELS } from '../model-meta.js';
import { GroqClientConfig } from '../utils/client.js';
/**
 * Configuration for Groq summarize adapter
 */
export interface GroqSummarizeConfig extends GroqClientConfig {
}
/** Model type for Groq summarization */
export type GroqSummarizeModel = (typeof GROQ_CHAT_MODELS)[number];
/**
 * Creates a Groq summarize adapter with explicit API key.
 * Type resolution happens here at the call site.
 *
 * @param model - The model name (e.g., 'llama-3.3-70b-versatile')
 * @param apiKey - Your Groq API key
 * @param config - Optional additional configuration
 * @returns Configured Groq summarize adapter instance with resolved types
 *
 * @example
 * ```typescript
 * const adapter = createGroqSummarize('llama-3.3-70b-versatile', "gsk_...");
 * ```
 */
export declare function createGroqSummarize<TModel extends GroqSummarizeModel>(model: TModel, apiKey: string, config?: Omit<GroqSummarizeConfig, 'apiKey'>): ChatStreamSummarizeAdapter<TModel, InferTextProviderOptions<GroqTextAdapter<TModel>>>;
/**
 * Creates a Groq summarize adapter with automatic API key detection from environment variables.
 * Type resolution happens here at the call site.
 *
 * Looks for `GROQ_API_KEY` in:
 * - `process.env` (Node.js)
 * - `window.env` (Browser with injected env)
 *
 * @param model - The model name (e.g., 'llama-3.3-70b-versatile')
 * @param config - Optional configuration (excluding apiKey which is auto-detected)
 * @returns Configured Groq summarize adapter instance with resolved types
 * @throws Error if GROQ_API_KEY is not found in environment
 *
 * @example
 * ```typescript
 * // Automatically uses GROQ_API_KEY from environment
 * const adapter = groqSummarize('llama-3.3-70b-versatile');
 *
 * await summarize({
 *   adapter,
 *   text: "Long article text..."
 * });
 * ```
 */
export declare function groqSummarize<TModel extends GroqSummarizeModel>(model: TModel, config?: Omit<GroqSummarizeConfig, 'apiKey'>): ChatStreamSummarizeAdapter<TModel, InferTextProviderOptions<GroqTextAdapter<TModel>>>;
