import { BaseTextAdapter, StructuredOutputOptions, StructuredOutputResult } from '@tanstack/ai/adapters';
import { GeminiModelReasoningByName } from '../../model-reasoning.js';
import { GeminiChatModelToolCapabilitiesByName, GeminiModelInputModalitiesByName, GeminiModels } from '../../model-meta.js';
import { Modality, AdapterYieldChunk, TextOptions } from '@tanstack/ai';
import { GeminiInteractionsStream } from './events.js';
import { ExternalTextInteractionsProviderOptions } from './provider-options.js';
import { GeminiMessageMetadataByModality } from '../../message-types.js';
import { GeminiClientConfig } from '../../utils/client.js';
export type GeminiTextInteractionsConfig = GeminiClientConfig;
export type GeminiTextInteractionsProviderOptions = ExternalTextInteractionsProviderOptions;
/**
 * Resolve provider options for a specific model. Thinking is not here:
 * `chat({ reasoning })` sets `thinking_level` and `thinking_summaries`.
 */
type ResolveProviderOptions = Omit<GeminiTextInteractionsProviderOptions, 'generation_config'> & {
    generation_config?: Omit<NonNullable<GeminiTextInteractionsProviderOptions['generation_config']>, 'thinking_level' | 'thinking_summaries'>;
};
/** The reasoning levels of a model, for `chat({ reasoning })`. `never`: none. */
type ResolveReasoning<TModel extends string> = TModel extends keyof GeminiModelReasoningByName ? GeminiModelReasoningByName[TModel] : never;
/**
 * Resolve input modalities for a specific model. Reuses the chat-model
 * modality map from `model-meta.ts`: passing a `document` content block
 * to a model that doesn't support it is a compile error, matching the
 * sibling `GeminiTextAdapter`.
 */
type ResolveInputModalities<TModel extends string> = TModel extends keyof GeminiModelInputModalitiesByName ? GeminiModelInputModalitiesByName[TModel] : readonly ['text', 'image', 'audio', 'video', 'document'];
/**
 * Resolve tool capabilities for a specific model. Reuses the chat-model
 * capability map: `google_maps` / `google_search_retrieval` are rejected at
 * runtime by `convertToolsToInteractionsFormat`, but per-model gating happens
 * here at compile time.
 */
type ResolveToolCapabilities<TModel extends string> = TModel extends keyof GeminiChatModelToolCapabilitiesByName ? NonNullable<GeminiChatModelToolCapabilitiesByName[TModel]> : readonly [];
/**
 * Tree-shakeable adapter for Gemini's stateful Interactions API. Routes
 * through `client.interactions.create` and surfaces the server-assigned
 * `interactionId` via an AG-UI `CUSTOM` event with
 * `name: 'gemini.interactionId'` emitted just before `RUN_FINISHED`; pass
 * that id back on the next turn via `modelOptions.previous_interaction_id`
 * to continue the conversation without resending history.
 *
 * The Interactions API does NOT support stateless multi-turn replay —
 * passing more than one message in `messages` without a
 * `previous_interaction_id` throws. For a chat UI that maintains local
 * history (e.g. `useChat`), see the "Wiring with `useChat`" section of
 * `docs/adapters/gemini.md` for the canonical client/server pattern.
 *
 * Supports user-defined function tools and the built-in tools
 * `google_search`, `code_execution`, `url_context`, `file_search`, and
 * `computer_use`. Built-in tool *activity* for the four search/exec
 * variants is surfaced via `CUSTOM` events
 * (`gemini.googleSearchCall` / `gemini.googleSearchResult` and the
 * corresponding per-tool variants) carrying the raw Interactions delta;
 * see {@link GeminiInteractionsCustomEvent}. `computer_use` is accepted
 * in the request but the Interactions API does not currently stream
 * per-delta CUSTOM events for it. The `google_search_retrieval` and
 * `google_maps` provider-tool factories are not supported on this adapter and
 * throw a targeted error. There is no Gemini `mcp_server` factory, so a tool
 * merely *named* `mcp_server` is an ordinary function and is sent as a function
 * declaration like any other.
 *
 * @experimental Interactions API is in Beta per Google; shapes may change.
 * @see https://ai.google.dev/gemini-api/docs/interactions
 */
export declare class GeminiTextInteractionsAdapter<TModel extends GeminiModels, TProviderOptions extends Record<string, any> = ResolveProviderOptions, TInputModalities extends ReadonlyArray<Modality> = ResolveInputModalities<TModel>, TToolCapabilities extends ReadonlyArray<string> = ResolveToolCapabilities<TModel>> extends BaseTextAdapter<TModel, TProviderOptions, TInputModalities, GeminiMessageMetadataByModality, TToolCapabilities, unknown, never, ResolveReasoning<TModel>> {
    readonly kind: "text";
    readonly name: "gemini-text-interactions";
    readonly api = "google-interactions";
    readonly provider: string;
    readonly supportsFileSources = true;
    private readonly client;
    private readonly interactionIdByThread;
    constructor(config: GeminiTextInteractionsConfig, model: TModel);
    chatStream(options: TextOptions<GeminiTextInteractionsProviderOptions>): AsyncIterable<AdapterYieldChunk>;
    private chatStreamRequest;
    structuredOutput(options: StructuredOutputOptions<GeminiTextInteractionsProviderOptions>): Promise<StructuredOutputResult<unknown>>;
    structuredOutputStream(options: StructuredOutputOptions<GeminiTextInteractionsProviderOptions>): AsyncIterable<AdapterYieldChunk>;
    private structuredOutputRequestStream;
}
/** @experimental Interactions API is in Beta. */
export declare function createGeminiTextInteractions<TModel extends GeminiModels>(model: TModel, apiKey: string, config?: Omit<GeminiTextInteractionsConfig, 'apiKey'>): GeminiTextInteractionsAdapter<TModel, ResolveProviderOptions, ResolveInputModalities<TModel>, ResolveToolCapabilities<TModel>>;
/** @experimental Interactions API is in Beta. */
export declare function geminiTextInteractions<TModel extends GeminiModels>(model: TModel, config?: Omit<GeminiTextInteractionsConfig, 'apiKey'>): GeminiTextInteractionsAdapter<TModel, ResolveProviderOptions, ResolveInputModalities<TModel>, ResolveToolCapabilities<TModel>>;
export type { GeminiInteractionsStream };
