import { OpenAIBaseResponsesTextAdapter } from '@tanstack/openai-base';
import { GrokModelReasoningByName } from '../model-reasoning.js';
import { GROK_CHAT_MODELS, GrokChatModelToolCapabilitiesByName, GrokTextAdapterModel, ResolveInputModalities, ResolveProviderOptions } from '../model-meta.js';
import { ContentPart, Modality, TextOptions } from '@tanstack/ai';
import { GrokMessageMetadataByModality } from '../message-types.js';
import { GrokClientConfig } from '../utils/client.js';
import { ResponseCreateParams, ResponseInputContent } from 'openai/resources/responses/responses';
/**
 * Resolve tool capabilities for a specific Grok model.
 */
/** The reasoning levels of a model, for `chat({ reasoning })`. `never`: none. */
type ResolveReasoning<TModel extends string> = TModel extends keyof GrokModelReasoningByName ? GrokModelReasoningByName[TModel] : never;
type ResolveToolCapabilities<TModel extends string> = TModel extends keyof GrokChatModelToolCapabilitiesByName ? NonNullable<GrokChatModelToolCapabilitiesByName[TModel]> : readonly [];
/**
 * Configuration for Grok text adapter
 */
export interface GrokTextConfig extends GrokClientConfig {
}
/**
 * Alias for TextProviderOptions for external use
 */
export type { ExternalTextProviderOptions as GrokTextProviderOptions } from '../text/text-provider-options.js';
/**
 * Grok Text (Chat) Adapter
 *
 * Tree-shakeable adapter for Grok chat/text completion functionality.
 * Uses xAI's OpenAI-compatible Responses API.
 *
 * Delegates implementation to {@link OpenAIBaseResponsesTextAdapter}
 * from `@tanstack/openai-base` and threads Grok-specific tool-capability
 * typing through the 5th generic of the base class.
 */
export declare class GrokTextAdapter<TModel extends GrokTextAdapterModel, TProviderOptions extends Record<string, any> = ResolveProviderOptions<TModel>, TInputModalities extends ReadonlyArray<Modality> = ResolveInputModalities<TModel>, TToolCapabilities extends ReadonlyArray<string> = ResolveToolCapabilities<TModel>> extends OpenAIBaseResponsesTextAdapter<TModel, TProviderOptions, TInputModalities, GrokMessageMetadataByModality, TToolCapabilities, ResolveReasoning<TModel>> {
    readonly kind: "text";
    readonly name: "grok";
    readonly supportsFileSources = true;
    readonly inputModalities: readonly ("text" | "image" | "audio" | "video" | "document")[] | undefined;
    constructor(config: GrokTextConfig, model: TModel);
    protected modelReasoning(model: string): import('@tanstack/ai').ModelReasoning | undefined;
    /**
     * Route a `{ type: 'file' }` source to xAI's URL-shaped fields rather than
     * the `file_id` the OpenAI Responses base emits.
     *
     * xAI accepts `file_id` only on `input_file`, and only on agentic-capable
     * models; its image path takes `image_url`. A `grokFiles()` handle carries
     * an xAI public URL, which both fields accept, so one handle works for
     * every modality on every chat model.
     */
    protected convertContentPartToInput(part: ContentPart): ResponseInputContent;
    protected mapOptionsToRequest(options: TextOptions<TProviderOptions>): Omit<ResponseCreateParams, 'stream'>;
}
/**
 * Creates a Grok text adapter with explicit API key.
 * Type resolution happens here at the call site.
 *
 * @param model - The model name (e.g., 'grok-build-0.1')
 * @param apiKey - Your xAI API key
 * @param config - Optional additional configuration
 * @returns Configured Grok text adapter instance with resolved types
 *
 * @example
 * ```typescript
 * const adapter = createGrokText('grok-build-0.1', "xai-...");
 * // adapter has type-safe providerOptions for grok-build-0.1
 * ```
 */
export declare function createGrokText<TModel extends (typeof GROK_CHAT_MODELS)[number]>(model: TModel, apiKey: string, config?: Omit<GrokTextConfig, 'apiKey'>): GrokTextAdapter<TModel>;
/**
 * Creates a Grok text adapter with automatic API key detection from environment variables.
 * Type resolution happens here at the call site.
 *
 * Looks for `XAI_API_KEY` in:
 * - `process.env` (Node.js)
 * - `window.env` (Browser with injected env)
 *
 * @param model - The model name (e.g., 'grok-build-0.1')
 * @param config - Optional configuration (excluding apiKey which is auto-detected)
 * @returns Configured Grok text adapter instance with resolved types
 * @throws Error if XAI_API_KEY is not found in environment
 *
 * @example
 * ```typescript
 * // Automatically uses XAI_API_KEY from environment
 * const adapter = grokText('grok-build-0.1');
 *
 * const stream = chat({
 *   adapter,
 *   messages: [{ role: "user", content: "Hello!" }]
 * });
 * ```
 */
export declare function grokText<TModel extends (typeof GROK_CHAT_MODELS)[number]>(model: TModel, config?: Omit<GrokTextConfig, 'apiKey'>): GrokTextAdapter<TModel>;
