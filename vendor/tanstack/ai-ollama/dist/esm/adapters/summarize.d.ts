import { ChatStreamSummarizeAdapter, InferTextProviderOptions } from '@tanstack/ai/adapters';
import { OllamaTextAdapter } from './text.js';
import { OLLAMA_TEXT_MODELS as OllamaSummarizeModels } from '../model-meta.js';
export type OllamaSummarizeModel = (typeof OllamaSummarizeModels)[number] | (string & {});
export interface OllamaSummarizeAdapterOptions {
    host?: string;
}
/**
 * Creates an Ollama summarize adapter with explicit host and model.
 *
 * @example
 * ```typescript
 * const adapter = createOllamaSummarize('mistral', 'http://localhost:11434');
 * ```
 */
export declare function createOllamaSummarize<TModel extends OllamaSummarizeModel>(model: TModel, host?: string, _options?: OllamaSummarizeAdapterOptions): ChatStreamSummarizeAdapter<TModel, InferTextProviderOptions<OllamaTextAdapter<TModel>>>;
/**
 * Creates an Ollama summarize adapter with host from `OLLAMA_HOST` env var
 * (falling back to the Ollama default).
 *
 * @example
 * ```typescript
 * const adapter = ollamaSummarize('mistral');
 * await summarize({ adapter, text: 'Long article text...' });
 * ```
 */
export declare function ollamaSummarize<TModel extends OllamaSummarizeModel>(model: TModel, options?: OllamaSummarizeAdapterOptions): ChatStreamSummarizeAdapter<TModel, InferTextProviderOptions<OllamaTextAdapter<TModel>>>;
