import { BaseTextAdapter, StructuredOutputOptions, StructuredOutputResult } from '@tanstack/ai/adapters';
import { MistralModelReasoningByName } from '../model-reasoning.js';
import { Modality, AdapterYieldChunk, ModelReasoning, ConfigReasoning, ReasoningCapability, TextOptions } from '@tanstack/ai';
import { MistralChatModelProviderOptionsByName, MistralModelInputModalitiesByName, MistralTextAdapterModel } from '../model-meta.js';
import { ExternalTextProviderOptions } from '../text/text-provider-options.js';
import { MistralMessageMetadataByModality } from '../message-types.js';
import { MistralClientConfig } from '../utils/client.js';
/**
 * Configuration for Mistral text adapter.
 */
export interface MistralTextConfig extends MistralClientConfig {
    /**
     * The model's reasoning data, for example `modelReasoning(record)` from a
     * `@tanstack/ai-models` record. It wins over the adapter's own table, for
     * `reasoning_effort` and for the levels `chat({ reasoning })` takes.
     * `false`: the model does not reason, so no reasoning field goes out.
     */
    reasoning?: ModelReasoning;
}
/**
 * A model id: a known Mistral model, or any other id, for example a catalog
 * id that this package does not list yet.
 */
export type MistralModelId = MistralTextAdapterModel | (string & {});
/**
 * Alias for TextProviderOptions for external use.
 */
export type MistralTextProviderOptions = ExternalTextProviderOptions;
type ResolveProviderOptions<TModel extends string> = TModel extends keyof MistralChatModelProviderOptionsByName ? MistralChatModelProviderOptionsByName[TModel] : MistralTextProviderOptions;
/** The reasoning levels of a model, for `chat({ reasoning })`. `never`: none. */
type ResolveReasoning<TModel extends string> = TModel extends keyof MistralModelReasoningByName ? MistralModelReasoningByName[TModel] : never;
type ResolveInputModalities<TModel extends string> = TModel extends keyof MistralModelInputModalitiesByName ? MistralModelInputModalitiesByName[TModel] : readonly ['text'];
/**
 * Mistral Text (Chat) Adapter.
 *
 * Tree-shakeable adapter for Mistral chat/text completion functionality.
 */
export declare class MistralTextAdapter<TModel extends MistralModelId, TProviderOptions extends Record<string, any> = ResolveProviderOptions<TModel>, TInputModalities extends ReadonlyArray<Modality> = ResolveInputModalities<TModel>, TReasoning extends ReasoningCapability = ResolveReasoning<TModel>> extends BaseTextAdapter<TModel, TProviderOptions, TInputModalities, MistralMessageMetadataByModality, ReadonlyArray<string>, unknown, never, TReasoning> {
    readonly name: "mistral";
    readonly api: "mistral-conversations";
    readonly provider: string;
    readonly inputModalities: readonly ("text" | "image" | "audio" | "document" | "video")[] | undefined;
    private readonly client;
    private readonly rawConfig;
    constructor(config: MistralTextConfig, model: TModel);
    chatStream(options: TextOptions<TProviderOptions>): AsyncIterable<AdapterYieldChunk>;
    /**
     * Generate structured output using Mistral's JSON Schema response format.
     */
    structuredOutput(options: StructuredOutputOptions<TProviderOptions>): Promise<StructuredOutputResult<unknown>>;
    /**
     * Processes streaming chunks from the Mistral API and yields AG-UI stream events.
     */
    private processMistralStreamChunks;
    /**
     * Makes a raw fetch request to the Mistral chat completions endpoint and
     * parses the SSE stream manually, bypassing the SDK's Zod validation which
     * rejects streaming tool call chunks that omit `name` in argument deltas.
     */
    private fetchRawMistralStream;
    /**
     * Converts the SDK's camelCase `ChatCompletionStreamRequest` into the
     * snake_case wire body, including converting messages.
     */
    private toWireBody;
    /**
     * Splits a Mistral delta content payload into text and reasoning deltas.
     * Mistral reasoning models (magistral-*) stream reasoning content as
     * `{ type: 'thinking', thinking: [{ type: 'text', text }, ...] }` content
     * parts. A single delta may contain text only, thinking only, or — rarely —
     * both (when a step transitions); both fields are returned so the caller
     * can sequence REASONING and TEXT lifecycle events in order.
     */
    private extractDeltaParts;
    /**
     * Maps common TextOptions to Mistral Chat Completions request parameters.
     */
    private mapTextOptionsToMistral;
    /**
     * Converts a TanStack AI ModelMessage to a Mistral ChatCompletionMessageParam.
     */
    private convertMessageToMistral;
    /** Keep supported thinking and text blocks in their stored order. */
    private assistantContent;
    private convertContentPartToMistral;
    /**
     * Normalizes message content to an array of ContentPart.
     */
    private normalizeContent;
    /**
     * Extracts text content from a content value that may be string, null, or ContentPart array.
     */
    private extractTextContent;
}
/**
 * The adapter type for a model and a config. A config with `reasoning` sets
 * the levels `chat({ reasoning })` takes; see {@link ConfigReasoning}.
 */
export type MistralTextAdapterFor<TModel extends MistralModelId, TConfig = MistralTextConfig> = MistralTextAdapter<TModel, ResolveProviderOptions<TModel>, ResolveInputModalities<TModel>, ConfigReasoning<TConfig, ResolveReasoning<TModel>>>;
/**
 * Creates a Mistral text adapter with explicit API key.
 *
 * @param model - The model name (e.g., 'mistral-large-latest')
 * @param apiKey - Your Mistral API key
 * @param config - Optional additional configuration
 * @returns Configured Mistral text adapter instance
 *
 * @example
 * ```typescript
 * const adapter = createMistralText('mistral-large-latest', 'api_key');
 * ```
 */
export declare function createMistralText<TModel extends MistralModelId, TConfig extends Omit<MistralTextConfig, 'apiKey'> = Omit<MistralTextConfig, 'apiKey'>>(model: TModel, apiKey: string, config?: TConfig): MistralTextAdapterFor<TModel, TConfig>;
/**
 * Creates a Mistral text adapter using the `MISTRAL_API_KEY` environment variable.
 *
 * @param model - The model name (e.g., 'mistral-large-latest')
 * @param config - Optional configuration (excluding apiKey)
 * @returns Configured Mistral text adapter instance
 * @throws Error if MISTRAL_API_KEY is not found in environment
 *
 * @example
 * ```typescript
 * const adapter = mistralText('mistral-large-latest');
 * ```
 */
export declare function mistralText<TModel extends MistralModelId, TConfig extends Omit<MistralTextConfig, 'apiKey'> = Omit<MistralTextConfig, 'apiKey'>>(model: TModel, config?: TConfig): MistralTextAdapterFor<TModel, TConfig>;
export {};
