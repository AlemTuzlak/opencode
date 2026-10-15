import { BaseTextAdapter, StructuredOutputOptions, StructuredOutputResult } from '@tanstack/ai/adapters';
import { GeminiModelReasoningByName } from '../model-reasoning.js';
import { GEMINI_MODELS, GeminiChatModelProviderOptionsByName, GeminiChatModelToolCapabilitiesByName, GeminiModelInputModalitiesByName } from '../model-meta.js';
import { ConfigReasoning, Modality, ModelMessage, ModelReasoning, MessageSource, ReasoningCapability, AdapterYieldChunk, TextOptions } from '@tanstack/ai';
import { ExternalTextProviderOptions } from '../text/text-provider-options.js';
import { GeminiMessageMetadataByModality, GeminiToolCallMetadata } from '../message-types.js';
import { GeminiClientConfig } from '../utils/client.js';
/** Request-local replay for the selected Google API. */
export declare function prepareGeminiMessagesForReplay(messages: Array<ModelMessage>, target: MessageSource): Array<ModelMessage>;
/** Keep source identity local to this call, including errors. */
export declare function withGeminiSource(chunk: AdapterYieldChunk, source: MessageSource): AdapterYieldChunk;
/**
 * Configuration for Gemini text adapter
 */
export interface GeminiTextConfig extends GeminiClientConfig {
    /**
     * The model's reasoning data, for example `modelReasoning(record)` from a
     * `@tanstack/ai-models` record. It wins over the adapter's own table, for
     * `thinkingConfig` and for the levels `chat({ reasoning })` takes.
     * `false`: the model does not reason, so no thinking config goes out.
     */
    reasoning?: ModelReasoning;
}
/**
 * A model id: a known Gemini model, or any other id, for example a Vertex or
 * catalog id that this package does not list yet.
 */
export type GeminiModelId = (typeof GEMINI_MODELS)[number] | (string & {});
/**
 * Gemini-specific provider options for text/chat
 */
export type GeminiTextProviderOptions = ExternalTextProviderOptions;
/**
 * Resolve provider options for a specific model.
 * If the model has explicit options in the map, use those; otherwise use base options.
 */
type ResolveProviderOptions<TModel extends string> = TModel extends keyof GeminiChatModelProviderOptionsByName ? GeminiChatModelProviderOptionsByName[TModel] : GeminiTextProviderOptions;
/**
 * Resolve input modalities for a specific model.
 * If the model has explicit modalities in the map, use those; otherwise use all modalities.
 */
type ResolveInputModalities<TModel extends string> = TModel extends keyof GeminiModelInputModalitiesByName ? GeminiModelInputModalitiesByName[TModel] : readonly ['text', 'image', 'audio', 'video', 'document'];
/**
 * Resolve tool capabilities for a specific model.
 * If the model has explicit tools in the map, use those; otherwise use empty tuple.
 */
/** The reasoning levels of a model, for `chat({ reasoning })`. `never`: none. */
type ResolveReasoning<TModel extends string> = TModel extends keyof GeminiModelReasoningByName ? GeminiModelReasoningByName[TModel] : never;
type ResolveToolCapabilities<TModel extends string> = TModel extends keyof GeminiChatModelToolCapabilitiesByName ? NonNullable<GeminiChatModelToolCapabilitiesByName[TModel]> : readonly [];
/**
 * Gemini Text (Chat) Adapter
 *
 * Tree-shakeable adapter for Gemini chat/text completion functionality.
 * Import only what you need for smaller bundle sizes.
 */
export declare class GeminiTextAdapter<TModel extends GeminiModelId, TProviderOptions extends Record<string, any> = ResolveProviderOptions<TModel>, TInputModalities extends ReadonlyArray<Modality> = ResolveInputModalities<TModel>, TToolCapabilities extends ReadonlyArray<string> = ResolveToolCapabilities<TModel>, TReasoning extends ReasoningCapability = ResolveReasoning<TModel>> extends BaseTextAdapter<TModel, TProviderOptions, TInputModalities, GeminiMessageMetadataByModality, TToolCapabilities, GeminiToolCallMetadata, never, TReasoning> {
    readonly kind: "text";
    readonly name: "gemini";
    readonly provider: string;
    readonly api: string;
    readonly supportsFileSources = true;
    readonly inputModalities: readonly ("text" | "image" | "audio" | "video" | "document")[] | undefined;
    private readonly client;
    /** `config.reasoning`, which wins over `GEMINI_MODEL_REASONING`. */
    private readonly configReasoning;
    constructor(config: GeminiTextConfig, model: TModel);
    chatStream(options: TextOptions<GeminiTextProviderOptions>): AsyncIterable<AdapterYieldChunk>;
    private chatStreamRequest;
    /**
     * Agentic video-understanding path via the Interactions API.
     *
     * The Interactions API (unlike `generateContent`) requires message parts to
     * be wrapped in `user_input` / `model_output` steps, and it accepts the
     * `processing: 'agentic'` video flag. This is a non-streaming call whose
     * single text result is re-emitted as AG-UI stream chunks.
     */
    private interactionsStream;
    /**
     * Generate structured output using Gemini's native JSON response format.
     * Uses responseMimeType: 'application/json' and responseSchema for structured output.
     * The outputSchema is already JSON Schema (converted in the ai layer).
     */
    structuredOutput(options: StructuredOutputOptions<GeminiTextProviderOptions>): Promise<StructuredOutputResult<unknown>>;
    /**
     * Stream schema-constrained JSON from Gemini natively.
     *
     * `chat({ outputSchema, stream: true })` calls this when the adapter
     * implements it. Without it, the engine buffers `structuredOutput()` and
     * emits one synthetic delta.
     */
    structuredOutputStream(options: StructuredOutputOptions<GeminiTextProviderOptions>): AsyncIterable<AdapterYieldChunk>;
    private structuredOutputRequestStream;
    /**
     * Extract text content from a non-streaming response
     */
    private extractTextFromResponse;
    private processStreamChunks;
    private convertContentPartToGemini;
    private formatMessages;
    /**
     * Merge consecutive messages of the same role into a single message.
     * Gemini's API requires strictly alternating user/model roles.
     * Tool results are mapped to role:'user', which can collide with actual
     * user messages in multi-turn conversations.
     *
     * Also filters out empty model messages (e.g., from a previous failed request)
     * and deduplicates functionResponse parts with the same id (tool call ID).
     */
    private mergeConsecutiveSameRoleMessages;
    private mapCommonOptionsToGemini;
    /**
     * Gemini 3.x natively combines `tools` + `responseSchema` in a single
     * streaming `generateContentStream` call (issue #605). Gemini 2.x is
     * documented as brittle for the combination and keeps the engine's
     * legacy finalization path.
     */
    supportsCombinedToolsAndSchema(): boolean;
}
/**
 * The adapter type for a model and a config. A config with `reasoning` sets
 * the levels `chat({ reasoning })` takes; see {@link ConfigReasoning}.
 */
export type GeminiTextAdapterFor<TModel extends GeminiModelId, TConfig = GeminiTextConfig> = GeminiTextAdapter<TModel, ResolveProviderOptions<TModel>, ResolveInputModalities<TModel>, ResolveToolCapabilities<TModel>, ConfigReasoning<TConfig, ResolveReasoning<TModel>>>;
/**
 * Creates a Gemini text adapter with explicit API key.
 * Type resolution happens here at the call site.
 */
export declare function createGeminiChat<TModel extends GeminiModelId, TConfig extends Omit<GeminiTextConfig, 'apiKey'> = Omit<GeminiTextConfig, 'apiKey'>>(model: TModel, apiKey: string, config?: TConfig): GeminiTextAdapterFor<TModel, TConfig>;
/**
 * Creates a Gemini text adapter with automatic API key detection.
 * Type resolution happens here at the call site.
 */
export declare function geminiText<TModel extends GeminiModelId, TConfig extends Omit<GeminiTextConfig, 'apiKey'> = Omit<GeminiTextConfig, 'apiKey'>>(model: TModel, config?: TConfig): GeminiTextAdapterFor<TModel, TConfig>;
export {};
