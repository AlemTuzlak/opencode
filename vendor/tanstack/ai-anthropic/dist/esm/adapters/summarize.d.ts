import { ChatStreamSummarizeAdapter, InferTextProviderOptions } from '@tanstack/ai/adapters';
import { AnthropicTextAdapter } from './text.js';
import { ANTHROPIC_MODELS } from '../model-meta.js';
import { AnthropicClientConfig } from '../utils/client.js';
/**
 * Configuration for Anthropic summarize adapter
 */
export interface AnthropicSummarizeConfig extends AnthropicClientConfig {
}
/** Model type for Anthropic summarization */
export type AnthropicSummarizeModel = (typeof ANTHROPIC_MODELS)[number];
/**
 * Creates an Anthropic summarize adapter with explicit API key.
 * Type resolution happens here at the call site.
 *
 * @param model - The model name (e.g., 'claude-sonnet-5', 'claude-haiku-4-5')
 * @param apiKey - Your Anthropic API key
 * @param config - Optional additional configuration
 * @returns Configured Anthropic summarize adapter instance with resolved types
 *
 * @example
 * ```typescript
 * const adapter = createAnthropicSummarize('claude-sonnet-4-5', 'sk-ant-...');
 * ```
 */
export declare function createAnthropicSummarize<TModel extends AnthropicSummarizeModel>(model: TModel, apiKey: string, config?: Omit<AnthropicSummarizeConfig, 'apiKey'>): ChatStreamSummarizeAdapter<TModel, InferTextProviderOptions<AnthropicTextAdapter<TModel>>>;
/**
 * Creates an Anthropic summarize adapter with automatic API key detection.
 * Type resolution happens here at the call site.
 *
 * @param model - The model name (e.g., 'claude-sonnet-5', 'claude-haiku-4-5')
 * @param config - Optional configuration (excluding apiKey which is auto-detected)
 * @returns Configured Anthropic summarize adapter instance with resolved types
 *
 * @example
 * ```typescript
 * const adapter = anthropicSummarize('claude-sonnet-4-5');
 * await summarize({ adapter, text: 'Long article text...' });
 * ```
 */
export declare function anthropicSummarize<TModel extends AnthropicSummarizeModel>(model: TModel, config?: AnthropicSummarizeConfig): ChatStreamSummarizeAdapter<TModel, InferTextProviderOptions<AnthropicTextAdapter<TModel>>>;
