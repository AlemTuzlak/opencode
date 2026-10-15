import { default as OpenAI } from 'openai';
import { OpenAIBaseChatCompletionsTextAdapter, OpenAIBaseTextAdapterOptions } from '@tanstack/openai-base';
import { VercelGatewayModelReasoningByName } from '../model-reasoning.js';
import { Modality, TextOptions } from '@tanstack/ai';
import { VERCEL_GATEWAY_CHAT_MODELS, VercelGatewayChatModelToolCapabilitiesByName, ResolveInputModalities, ResolveProviderOptions } from '../model-meta.js';
import { VercelGatewayMessageMetadataByModality } from '../message-types.js';
import { VercelGatewayClientConfig } from '../utils/client.js';
/** The reasoning levels of a model, for `chat({ reasoning })`. `never`: none. */
type ResolveReasoning<TModel extends string> = TModel extends keyof VercelGatewayModelReasoningByName ? VercelGatewayModelReasoningByName[TModel] : never;
type ResolveToolCapabilities<TModel extends string> = TModel extends keyof VercelGatewayChatModelToolCapabilitiesByName ? NonNullable<VercelGatewayChatModelToolCapabilitiesByName[TModel]> : readonly [];
export interface VercelGatewayTextConfig extends VercelGatewayClientConfig, OpenAIBaseTextAdapterOptions {
}
export type { ExternalTextProviderOptions as VercelGatewayTextProviderOptions } from '../text/text-provider-options.js';
/**
 * Vercel AI Gateway text adapter.
 *
 * Talks to the public OpenAI-compatible Chat Completions API at
 * `https://ai-gateway.vercel.sh/v1`.
 */
export declare class VercelGatewayTextAdapter<TModel extends (typeof VERCEL_GATEWAY_CHAT_MODELS)[number], TProviderOptions extends Record<string, any> = ResolveProviderOptions<TModel>, TInputModalities extends ReadonlyArray<Modality> = ResolveInputModalities<TModel>, TToolCapabilities extends ReadonlyArray<string> = ResolveToolCapabilities<TModel>> extends OpenAIBaseChatCompletionsTextAdapter<TModel, TProviderOptions, TInputModalities, VercelGatewayMessageMetadataByModality, TToolCapabilities, ResolveReasoning<TModel>> {
    readonly kind: "text";
    readonly name: "vercel-gateway";
    constructor(config: VercelGatewayTextConfig, model: TModel);
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
