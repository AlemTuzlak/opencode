import { default as OpenAI } from 'openai';
import { OpenAIBaseChatCompletionsTextAdapter, OpenAIBaseTextAdapterOptions } from '@tanstack/openai-base';
import { GroqModelReasoningByName } from '../model-reasoning.js';
import { Modality, TextOptions } from '@tanstack/ai';
import { GROQ_CHAT_MODELS, GroqChatModelToolCapabilitiesByName, ResolveInputModalities, ResolveProviderOptions } from '../model-meta.js';
import { GroqMessageMetadataByModality } from '../message-types.js';
import { GroqClientConfig } from '../utils/client.js';
/** The reasoning levels of a model, for `chat({ reasoning })`. `never`: none. */
type ResolveReasoning<TModel extends string> = TModel extends keyof GroqModelReasoningByName ? GroqModelReasoningByName[TModel] : never;
type ResolveToolCapabilities<TModel extends string> = TModel extends keyof GroqChatModelToolCapabilitiesByName ? NonNullable<GroqChatModelToolCapabilitiesByName[TModel]> : readonly [];
/**
 * Configuration for Groq text adapter
 */
export interface GroqTextConfig extends GroqClientConfig, OpenAIBaseTextAdapterOptions {
}
/**
 * Re-export of the public provider options type
 */
export type { ExternalTextProviderOptions as GroqTextProviderOptions } from '../text/text-provider-options.js';
/**
 * Groq Text (Chat) Adapter
 *
 * Tree-shakeable adapter for Groq chat/text completion. Groq exposes an
 * OpenAI-compatible Chat Completions endpoint at `/openai/v1`, so we drive
 * it with the OpenAI SDK via a `baseURL` override (the same pattern as
 * `ai-grok`).
 *
 * Quirk: when usage is present on a stream, Groq historically delivered it
 * under `chunk.x_groq.usage` rather than `chunk.usage`. The override below
 * promotes it to the standard location so the base's RUN_FINISHED usage
 * accounting works unchanged.
 */
export declare class GroqTextAdapter<TModel extends (typeof GROQ_CHAT_MODELS)[number], TProviderOptions extends Record<string, any> = ResolveProviderOptions<TModel>, TInputModalities extends ReadonlyArray<Modality> = ResolveInputModalities<TModel>, TToolCapabilities extends ReadonlyArray<string> = ResolveToolCapabilities<TModel>> extends OpenAIBaseChatCompletionsTextAdapter<TModel, TProviderOptions, TInputModalities, GroqMessageMetadataByModality, TToolCapabilities, ResolveReasoning<TModel>> {
    readonly kind: "text";
    readonly name: "groq";
    readonly inputModalities: readonly ("text" | "image" | "audio" | "video" | "document")[] | undefined;
    constructor(config: GroqTextConfig, model: TModel);
    protected modelReasoning(model: string): import('@tanstack/ai').ModelReasoning | undefined;
    protected extractRejectedToolCall(rawEvent: unknown, fallbackMessage: string): {
        toolName: string;
        arguments: string;
        input?: unknown;
        error: string;
    } | undefined;
    protected makeStructuredOutputCompatibleWithMap(schema: Record<string, any>, originalRequired?: Array<string>): {
        schema: Record<string, any>;
        nullWideningMap: import('@tanstack/ai-utils').NullWideningMap | undefined;
    };
    protected processStreamChunks(stream: AsyncIterable<OpenAI.Chat.Completions.ChatCompletionChunk>, options: TextOptions, aguiState: {
        runId: string;
        threadId: string;
        messageId: string;
        hasEmittedRunStarted: boolean;
    }): AsyncGenerator<import('@tanstack/ai').AdapterYieldChunk, void, any>;
    /**
     * Surfaces Groq's reasoning deltas during streaming structured output.
     * Groq emits `delta.reasoning` (or legacy `delta.reasoning_content`) on
     * reasoning models when the caller sets `reasoning_format: 'parsed'` in
     * modelOptions. The base's chatStream and structuredOutputStream both
     * route reasoning through this hook.
     */
    protected extractReasoning(chunk: OpenAI.Chat.Completions.ChatCompletionChunk): {
        text: string;
    } | undefined;
    /**
     * Groq's API rejects `response_format: json_schema` together with `tools`
     * + `stream` (returns 400 — see Groq Structured Outputs docs:
     * "Streaming and tool use are not currently supported with Structured
     * Outputs."). Force the engine onto the legacy finalization path even
     * though the OpenAI Chat Completions base would otherwise opt in.
     */
    supportsCombinedToolsAndSchema(): boolean;
}
/**
 * Creates a Groq text adapter with explicit API key.
 *
 * @example
 * ```typescript
 * const adapter = createGroqText('llama-3.3-70b-versatile', "gsk_...");
 * ```
 */
export declare function createGroqText<TModel extends (typeof GROQ_CHAT_MODELS)[number]>(model: TModel, apiKey: string, config?: Omit<GroqTextConfig, 'apiKey'>): GroqTextAdapter<TModel>;
/**
 * Creates a Groq text adapter with API key from `GROQ_API_KEY`.
 *
 * @example
 * ```typescript
 * const adapter = groqText('llama-3.3-70b-versatile');
 * ```
 */
export declare function groqText<TModel extends (typeof GROQ_CHAT_MODELS)[number]>(model: TModel, config?: Omit<GroqTextConfig, 'apiKey'>): GroqTextAdapter<TModel>;
