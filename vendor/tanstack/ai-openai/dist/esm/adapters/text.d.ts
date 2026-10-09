import { OpenAIBaseResponsesTextAdapter, OpenAIBaseTextAdapterOptions } from '@tanstack/openai-base';
import { OPENAI_CHAT_MODELS, OpenAIChatModelProviderOptionsByName, OpenAIChatModelToolCapabilitiesByName, OpenAIModelInputModalitiesByName } from '../model-meta.js';
import { ResponseCreateParams, Tool as ResponsesTool } from 'openai/resources/responses/responses';
import { AnyTool, ConfigReasoning, MidConversationChannels, Modality, ModelReasoning, ReasoningCapability, TextOptions } from '@tanstack/ai';
import { OpenAIModelReasoningByName } from '../model-reasoning.js';
import { ExternalTextProviderOptions } from '../text/text-provider-options.js';
import { OpenAIMessageMetadataByModality } from '../message-types.js';
import { OpenAIClientConfig } from '../utils/client.js';
/**
 * Configuration for OpenAI text adapter
 */
export interface OpenAITextConfig extends OpenAIClientConfig, OpenAIBaseTextAdapterOptions {
    /**
     * The mid-conversation channels (`additional_tools` and a mid-conversation
     * `developer` message) of the models in
     * `OPENAI_MODEL_MID_CONVERSATION_CHANNELS`. When absent, they are on only
     * for OpenAI's own API: a `baseURL`, a `fetch`, or the SDK's
     * `OPENAI_BASE_URL` env var turns the default off.
     * `true` turns them on anyway, for a gateway that passes the changes.
     * `false` turns them off, so every request is built as before.
     */
    midConversationChannels?: boolean;
    /**
     * The model's reasoning data, for example `modelReasoning(record)` from a
     * `@tanstack/ai-models` record. It wins over the adapter's own table, for
     * `reasoning.effort` and for the levels `chat({ reasoning })` takes.
     * `false`: the model does not reason, so no reasoning field goes out.
     */
    reasoning?: ModelReasoning;
}
/**
 * A model id: a known OpenAI model, or any other id, for example a catalog
 * id that this package does not list yet.
 */
export type OpenAIModelId = (typeof OPENAI_CHAT_MODELS)[number] | (string & {});
/**
 * Alias for TextProviderOptions
 */
export type OpenAITextProviderOptions = ExternalTextProviderOptions;
/**
 * Resolve provider options for a specific model.
 * If the model has explicit options in the map, use those; otherwise use base options.
 */
type ResolveProviderOptions<TModel extends string> = TModel extends keyof OpenAIChatModelProviderOptionsByName ? OpenAIChatModelProviderOptionsByName[TModel] : OpenAITextProviderOptions;
/**
 * Resolve input modalities for a specific model.
 * If the model has explicit modalities in the map, use those; otherwise use all modalities.
 */
/** The reasoning levels of a model, for `chat({ reasoning })`. `never`: none. */
type ResolveReasoning<TModel extends string> = TModel extends keyof OpenAIModelReasoningByName ? OpenAIModelReasoningByName[TModel] : never;
type ResolveInputModalities<TModel extends string> = TModel extends keyof OpenAIModelInputModalitiesByName ? OpenAIModelInputModalitiesByName[TModel] : readonly ['text', 'image', 'audio'];
/**
 * Resolve tool capabilities for a specific model.
 * If the model has explicit tools in the map, use those; otherwise use empty tuple.
 */
type ResolveToolCapabilities<TModel extends string> = TModel extends keyof OpenAIChatModelToolCapabilitiesByName ? NonNullable<OpenAIChatModelToolCapabilitiesByName[TModel]> : readonly [];
/**
 * OpenAI Text (Chat) Adapter
 *
 * Tree-shakeable adapter for OpenAI chat/text completion functionality.
 * Delegates implementation to {@link OpenAIBaseResponsesTextAdapter} from
 * `@tanstack/openai-base`. The base calls `openai.responses.create`
 * directly; this subclass hands it a configured client, overrides
 * `convertTools` to use OpenAI's full tool converter (supporting
 * file_search, web_search, etc.), and overrides `mapOptionsToRequest` to
 * apply provider option validation.
 */
export declare class OpenAITextAdapter<TModel extends OpenAIModelId, TProviderOptions extends Record<string, any> = ResolveProviderOptions<TModel>, TInputModalities extends ReadonlyArray<Modality> = ResolveInputModalities<TModel>, TToolCapabilities extends ReadonlyArray<string> = ResolveToolCapabilities<TModel>, TReasoning extends ReasoningCapability = ResolveReasoning<TModel>> extends OpenAIBaseResponsesTextAdapter<TModel, TProviderOptions, TInputModalities, OpenAIMessageMetadataByModality, TToolCapabilities, TReasoning> {
    readonly kind: "text";
    readonly name: "openai";
    readonly supportsFileSources = true;
    readonly inputModalities: readonly ("text" | "image" | "audio" | "video" | "document")[] | undefined;
    /** Set from `OPENAI_MODEL_MID_CONVERSATION_CHANNELS` in the constructor. */
    readonly midConversationChannels: MidConversationChannels | undefined;
    /** `config.reasoning`, which wins over `OPENAI_MODEL_REASONING`. */
    private readonly configReasoning;
    constructor(config: OpenAITextConfig, model: TModel);
    protected modelReasoning(model: string): ModelReasoning | undefined;
    /** OpenAI's full tool converter (file_search, web_search, etc.). */
    protected convertTools(tools: Array<AnyTool>): Array<ResponsesTool>;
    /**
     * Maps common options to OpenAI-specific format.
     * Overrides the base class to apply OpenAI-specific provider option
     * validation and request fields. The tools go through `convertTools`.
     */
    protected mapOptionsToRequest(options: TextOptions<TProviderOptions>): Omit<ResponseCreateParams, 'stream'>;
}
/**
 * The adapter type for a model and a config. A config with `reasoning` sets
 * the levels `chat({ reasoning })` takes; see {@link ConfigReasoning}.
 */
export type OpenAITextAdapterFor<TModel extends OpenAIModelId, TConfig = OpenAITextConfig> = OpenAITextAdapter<TModel, ResolveProviderOptions<TModel>, ResolveInputModalities<TModel>, ResolveToolCapabilities<TModel>, ConfigReasoning<TConfig, ResolveReasoning<TModel>>>;
/**
 * Creates an OpenAI chat adapter with explicit API key.
 * Type resolution happens here at the call site.
 *
 * @param model - The model name (e.g., 'gpt-4o', 'gpt-4-turbo')
 * @param apiKey - Your OpenAI API key
 * @param config - Optional additional configuration
 * @returns Configured OpenAI chat adapter instance with resolved types
 *
 * @example
 * ```typescript
 * const adapter = createOpenaiChat('gpt-4o', "sk-...");
 * // adapter has type-safe modelOptions for gpt-4o
 * ```
 */
export declare function createOpenaiChat<TModel extends OpenAIModelId, TConfig extends Omit<OpenAITextConfig, 'apiKey'> = Omit<OpenAITextConfig, 'apiKey'>>(model: TModel, apiKey: string, config?: TConfig): OpenAITextAdapterFor<TModel, TConfig>;
/**
 * Creates an OpenAI text adapter with automatic API key detection from environment variables.
 * Type resolution happens here at the call site.
 *
 * Looks for `OPENAI_API_KEY` in:
 * - `process.env` (Node.js)
 * - `window.env` (Browser with injected env)
 *
 * @param model - The model name (e.g., 'gpt-4o', 'gpt-4-turbo')
 * @param config - Optional configuration (excluding apiKey which is auto-detected)
 * @returns Configured OpenAI text adapter instance with resolved types
 * @throws Error if OPENAI_API_KEY is not found in environment
 *
 * @example
 * ```typescript
 * // Automatically uses OPENAI_API_KEY from environment
 * const adapter = openaiText('gpt-4o');
 *
 * const stream = chat({
 *   adapter,
 *   messages: [{ role: "user", content: "Hello!" }]
 * });
 * ```
 */
export declare function openaiText<TModel extends OpenAIModelId, TConfig extends Omit<OpenAITextConfig, 'apiKey'> = Omit<OpenAITextConfig, 'apiKey'>>(model: TModel, config?: TConfig): OpenAITextAdapterFor<TModel, TConfig>;
export {};
