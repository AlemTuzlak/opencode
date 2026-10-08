import { OpenAIBaseChatCompletionsTextAdapter, OpenAIBaseResponsesTextAdapter, OpenAIBaseTextAdapterOptions } from '@tanstack/openai-base';
import { default as OpenAI, ClientOptions } from 'openai';
import { ChatCompletionCreateParamsStreaming, ChatCompletionMessageParam } from 'openai/resources/chat/completions/completions';
import { Modality, ModelMessage, ReasoningCapability, ReasoningMap, TextOptions } from '@tanstack/ai';
import { OpenAIMessageMetadataByModality } from '../message-types.js';
import { OpenAICompatibleCompat } from './quirks.js';
/** One model's reasoning and request quirks, from its `models` entry and the provider. */
export interface CompatibleModelConfig {
    input?: ReadonlyArray<Modality>;
    /** `false`: the model does not reason. `true`: no level map. Or its level map. */
    reasoning?: boolean | ReasoningMap;
    compat?: OpenAICompatibleCompat;
}
/**
 * Generic OpenAI-compatible adapter over the Chat Completions API
 * (`{baseURL}/chat/completions`). Capability type-args are supplied by the
 * `openaiCompatible` factory from the user's `models` tuple.
 */
export declare class OpenAICompatibleChatAdapter<TModel extends string, TProviderOptions extends Record<string, any> = Record<string, any>, TInputModalities extends ReadonlyArray<Modality> = ReadonlyArray<Modality>, TToolCapabilities extends ReadonlyArray<string> = ReadonlyArray<string>, TReasoning extends ReasoningCapability = never> extends OpenAIBaseChatCompletionsTextAdapter<TModel, TProviderOptions, TInputModalities, OpenAIMessageMetadataByModality, TToolCapabilities, TReasoning> {
    readonly kind: "text";
    readonly inputModalities: ReadonlyArray<Modality>;
    readonly maxTokensKey = "max_tokens";
    private readonly compat;
    private readonly reasoning;
    constructor(client: OpenAI, model: TModel, name: string, options?: OpenAIBaseTextAdapterOptions & Pick<ClientOptions, 'fetch'>, config?: CompatibleModelConfig);
    /**
     * The request with the `chat({ promptCache })` fields, then the provider's
     * quirks: the thinking fields for
     * `reasoning`, and (with `compat`) the instruction role, the token field,
     * `store`, strict tools, `tool_stream`, and cache markers.
     */
    protected mapOptionsToRequest(options: TextOptions): ChatCompletionCreateParamsStreaming;
    /**
     * An assistant message carries its thinking back as `reasoning_content`
     * when the provider needs it (DeepSeek fails the second turn without it).
     */
    protected convertMessage(message: ModelMessage): ChatCompletionMessageParam;
    protected includeUsageInStream(): boolean;
    protected requestHeaders(options: TextOptions): Record<string, string> | undefined;
    /**
     * OpenAI-compatible reasoning providers stream their thinking outside the
     * OpenAI wire format, on `delta.reasoning_content` (DeepSeek, Qwen, GLM,
     * Kimi, most vLLM/SGLang deployments), `delta.reasoning` (a smaller set of
     * gateways), or `delta.reasoning_text` (GitHub Copilot). The base adapter has no reasoning hook by default because plain
     * Chat Completions carries none, so without this the thinking was dropped
     * silently and the only way to see it was to monkey-patch the prototype.
     *
     * Same shape as the dedicated adapters that already do this
     * (`@tanstack/ai-cloudflare`, `@tanstack/ai-byteplus`, `@tanstack/ai-groq`).
     * Providers that send neither field are unaffected.
     */
    protected extractReasoning(chunk: OpenAI.Chat.Completions.ChatCompletionChunk): {
        text: string;
    } | undefined;
}
/**
 * Generic OpenAI-compatible adapter over the Responses API
 * (`{baseURL}/responses`). For the rare compatible provider that implements
 * Responses (e.g. Azure OpenAI).
 */
export declare class OpenAICompatibleResponsesAdapter<TModel extends string, TProviderOptions extends Record<string, any> = Record<string, any>, TInputModalities extends ReadonlyArray<Modality> = ReadonlyArray<Modality>, TToolCapabilities extends ReadonlyArray<string> = ReadonlyArray<string>> extends OpenAIBaseResponsesTextAdapter<TModel, TProviderOptions, TInputModalities, OpenAIMessageMetadataByModality, TToolCapabilities> {
    readonly kind: "text";
    readonly inputModalities: ReadonlyArray<Modality>;
    readonly maxTokensKey = "max_output_tokens";
    private readonly compat;
    constructor(client: OpenAI, model: TModel, name: string, options?: OpenAIBaseTextAdapterOptions & Pick<ClientOptions, 'fetch'>, config?: CompatibleModelConfig);
    /** The request, plus the prompt cache fields for `chat({ promptCache })`. */
    protected mapOptionsToRequest(options: TextOptions<TProviderOptions>): {
        background?: boolean | null | undefined;
        model?: import('openai/resources/shared.mjs').ResponsesModel | undefined;
        moderation?: (OpenAI.Responses.ResponseCreateParams.Moderation | null) | undefined;
        conversation?: (string | OpenAI.Responses.ResponseConversationParam | null) | undefined;
        include?: (Array<OpenAI.Responses.ResponseIncludable> | null) | undefined;
        previous_response_id?: string | null | undefined;
        prompt?: (OpenAI.Responses.ResponsePrompt | null) | undefined;
        prompt_cache_key?: string | null | undefined;
        prompt_cache_retention?: "in_memory" | "24h" | null | undefined;
        safety_identifier?: string | null | undefined;
        service_tier?: (OpenAI.Responses.ServiceTier | null) | undefined;
        store?: boolean | null | undefined;
        top_logprobs?: number | null | undefined;
        truncation?: "auto" | "disabled" | null | undefined;
        input?: (string | OpenAI.Responses.ResponseInput) | undefined;
        instructions?: string | null | undefined;
        tools?: Array<OpenAI.Responses.Tool> | undefined;
        text?: OpenAI.Responses.ResponseTextConfig | undefined;
        prompt_cache_options?: OpenAI.Responses.ResponseCreateParams.PromptCacheOptions | undefined;
        reasoning?: (import('openai/resources/shared.mjs').Reasoning | null) | undefined;
        access_programs?: OpenAI.Responses.ResponseCreateParams.AccessPrograms | undefined;
        context_management?: (Array<OpenAI.Responses.ResponseCreateParams.ContextManagement> | null) | undefined;
        max_output_tokens?: number | null | undefined;
        metadata?: (import('openai/resources/shared.mjs').Metadata | null) | undefined;
        parallel_tool_calls?: boolean | null | undefined;
        stream_options?: (OpenAI.Responses.ResponseCreateParams.StreamOptions | null) | undefined;
        temperature?: number | null | undefined;
        tool_choice?: (OpenAI.Responses.ToolChoiceOptions | OpenAI.Responses.ToolChoiceAllowed | OpenAI.Responses.ToolChoiceTypes | OpenAI.Responses.ToolChoiceFunction | OpenAI.Responses.ToolChoiceMcp | OpenAI.Responses.ToolChoiceCustom | OpenAI.Responses.ResponseCreateParams.SpecificProgrammaticToolCallingParam | OpenAI.Responses.ToolChoiceApplyPatch | OpenAI.Responses.ToolChoiceShell) | undefined;
        top_p?: number | null | undefined;
        user?: string | undefined;
    };
}
