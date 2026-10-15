import { default as OpenAI } from 'openai';
import { OpenAIBaseChatCompletionsTextAdapter, OpenAIBaseTextAdapterOptions } from '@tanstack/openai-base';
import { OPENAI_CHAT_MODELS, OpenAIChatModel, OpenAIChatModelProviderOptionsByName, OpenAIChatModelToolCapabilitiesByName, OpenAIModelInputModalitiesByName } from '../model-meta.js';
import { Modality, TextOptions } from '@tanstack/ai';
import { OpenAIMessageMetadataByModality } from '../message-types.js';
import { OpenAIClientConfig } from '../utils/client.js';
import { ExternalTextProviderOptions } from '../text/text-provider-options.js';
/**
 * Configuration for the OpenAI Chat Completions adapter.
 *
 * Distinct from `OpenAITextConfig` (the Responses-API adapter) only in name —
 * both wrap the same `OpenAIClientConfig`. Kept separate so a future
 * chat-completions-only knob (e.g. legacy `function_call`) has a place to land
 * without leaking into the Responses adapter's surface.
 */
export interface OpenAIChatCompletionsConfig extends OpenAIClientConfig, OpenAIBaseTextAdapterOptions {
}
export type OpenAIChatCompletionsProviderOptions = ExternalTextProviderOptions;
type ResolveProviderOptions<TModel extends string> = TModel extends keyof OpenAIChatModelProviderOptionsByName ? OpenAIChatModelProviderOptionsByName[TModel] : OpenAIChatCompletionsProviderOptions;
type ResolveInputModalities<TModel extends string> = TModel extends keyof OpenAIModelInputModalitiesByName ? OpenAIModelInputModalitiesByName[TModel] : readonly ['text', 'image', 'audio'];
type ResolveToolCapabilities<TModel extends string> = TModel extends keyof OpenAIChatModelToolCapabilitiesByName ? NonNullable<OpenAIChatModelToolCapabilitiesByName[TModel]> : readonly [];
/**
 * OpenAI Text adapter targeting the **Chat Completions** API
 * (`/v1/chat/completions`).
 *
 * Sibling of `OpenAITextAdapter`, which targets the Responses API. Use this
 * one when you want the older, more broadly compatible wire format (e.g. to
 * compare streaming behaviour across providers that don't speak Responses yet).
 */
export declare class OpenAIChatCompletionsTextAdapter<TModel extends OpenAIChatModel, TProviderOptions extends Record<string, any> = ResolveProviderOptions<TModel>, TInputModalities extends ReadonlyArray<Modality> = ResolveInputModalities<TModel>, TToolCapabilities extends ReadonlyArray<string> = ResolveToolCapabilities<TModel>> extends OpenAIBaseChatCompletionsTextAdapter<TModel, TProviderOptions, TInputModalities, OpenAIMessageMetadataByModality, TToolCapabilities> {
    readonly kind: "text";
    readonly inputModalities: readonly ("text" | "image" | "audio" | "video" | "document")[] | undefined;
    constructor(config: OpenAIChatCompletionsConfig, model: TModel);
    /** The request, plus the prompt cache fields for `chat({ promptCache })`. */
    protected mapOptionsToRequest(options: TextOptions): {
        stream: true;
        messages: Array<OpenAI.Chat.Completions.ChatCompletionMessageParam>;
        model: (string & {}) | import('openai/resources/shared.mjs').ChatModel;
        audio?: OpenAI.Chat.Completions.ChatCompletionAudioParam | null;
        frequency_penalty?: number | null;
        function_call?: "none" | "auto" | OpenAI.Chat.Completions.ChatCompletionFunctionCallOption;
        functions?: Array<OpenAI.Chat.Completions.ChatCompletionCreateParams.Function>;
        logit_bias?: {
            [key: string]: number;
        } | null;
        logprobs?: boolean | null;
        max_completion_tokens?: number | null;
        max_tokens?: number | null;
        metadata?: import('openai/resources/shared.mjs').Metadata | null;
        modalities?: Array<"text" | "audio"> | null;
        moderation?: OpenAI.Chat.Completions.ChatCompletionCreateParams.Moderation | null;
        n?: number | null;
        parallel_tool_calls?: boolean;
        prediction?: OpenAI.Chat.Completions.ChatCompletionPredictionContent | null;
        presence_penalty?: number | null;
        prompt_cache_key?: string | null;
        prompt_cache_options?: OpenAI.Chat.Completions.ChatCompletionCreateParams.PromptCacheOptions;
        prompt_cache_retention?: "in_memory" | "24h" | null;
        reasoning_effort?: import('openai/resources/shared.mjs').ReasoningEffort | null;
        response_format?: import('openai/resources/shared.mjs').ResponseFormatText | import('openai/resources/shared.mjs').ResponseFormatJSONSchema | import('openai/resources/shared.mjs').ResponseFormatJSONObject;
        safety_identifier?: string | null;
        seed?: number | null;
        service_tier?: "auto" | "default" | "flex" | "scale" | "priority" | "fast" | null;
        stop?: string | Array<string> | null;
        store?: boolean | null;
        stream_options?: OpenAI.Chat.Completions.ChatCompletionStreamOptions | null;
        temperature?: number | null;
        tool_choice?: OpenAI.Chat.Completions.ChatCompletionToolChoiceOption;
        tools?: Array<OpenAI.Chat.Completions.ChatCompletionTool>;
        top_logprobs?: number | null;
        top_p?: number | null;
        user?: string;
        verbosity?: "low" | "medium" | "high" | null;
        web_search_options?: OpenAI.Chat.Completions.ChatCompletionCreateParams.WebSearchOptions;
    };
}
export declare function createOpenaiChatCompletions<TModel extends (typeof OPENAI_CHAT_MODELS)[number]>(model: TModel, apiKey: string, config?: Omit<OpenAIChatCompletionsConfig, 'apiKey'>): OpenAIChatCompletionsTextAdapter<TModel>;
export declare function openaiChatCompletions<TModel extends (typeof OPENAI_CHAT_MODELS)[number]>(model: TModel, config?: Omit<OpenAIChatCompletionsConfig, 'apiKey'>): OpenAIChatCompletionsTextAdapter<TModel>;
export {};
