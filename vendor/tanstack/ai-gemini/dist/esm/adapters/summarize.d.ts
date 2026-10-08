import { ChatStreamSummarizeAdapter, InferTextProviderOptions } from '@tanstack/ai/adapters';
import { GeminiTextAdapter } from './text.js';
import { GEMINI_MODELS } from '../model-meta.js';
import { GeminiClientConfig } from '../utils/client.js';
/**
 * Configuration for Gemini summarize adapter
 */
export interface GeminiSummarizeConfig extends GeminiClientConfig {
}
export type GeminiSummarizeModel = (typeof GEMINI_MODELS)[number];
/**
 * Creates a Gemini summarize adapter with explicit API key and model.
 *
 * Note: keeps the historical (apiKey, model, config) argument order to
 * avoid breaking existing callers.
 *
 * @example
 * ```typescript
 * const adapter = createGeminiSummarize('AIza...', 'gemini-2.5-flash');
 * ```
 */
export declare function createGeminiSummarize<TModel extends GeminiSummarizeModel>(apiKey: string, model: TModel, config?: Omit<GeminiSummarizeConfig, 'apiKey'>): ChatStreamSummarizeAdapter<TModel, InferTextProviderOptions<GeminiTextAdapter<TModel>>>;
/**
 * Creates a Gemini summarize adapter with API key from `GOOGLE_API_KEY` /
 * `GEMINI_API_KEY` environment variables.
 *
 * @example
 * ```typescript
 * const adapter = geminiSummarize('gemini-2.5-flash');
 * await summarize({ adapter, text: 'Long article text...' });
 * ```
 */
export declare function geminiSummarize<TModel extends GeminiSummarizeModel>(model: TModel, config?: Omit<GeminiSummarizeConfig, 'apiKey'>): ChatStreamSummarizeAdapter<TModel, InferTextProviderOptions<GeminiTextAdapter<TModel>>>;
