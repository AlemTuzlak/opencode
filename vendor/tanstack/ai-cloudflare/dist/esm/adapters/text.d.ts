import { default as OpenAI } from 'openai';
import { OpenAIBaseChatCompletionsTextAdapter } from '@tanstack/openai-base';
import { ChatCompletionChunk, ChatCompletionMessageParam } from 'openai/resources/chat/completions/completions';
import { CloudflareConfigInput, CloudflareTextConfig, CloudflareTextReasoningConfig, CloudflareTextRestConfig } from '../utils/config.js';
import { CloudflareTextModel } from '../utils/models.js';
import { ConfigReasoning, DefaultMessageMetadataByModality, Modality, ModelMessage, ReasoningCapability, TextOptions } from '@tanstack/ai';
import { CloudflareModelReasoningByName } from '../model-reasoning.js';
/** The reasoning levels of a model, for `chat({ reasoning })`. `never`: none. */
type ResolveReasoning<TModel extends string> = TModel extends keyof CloudflareModelReasoningByName ? CloudflareModelReasoningByName[TModel] : never;
/**
 * Chat Completions parameters forwarded verbatim to Workers AI. Reasoning
 * effort is set with `chat({ reasoning })`; reasoning models (GLM, Kimi,
 * gpt-oss, QwQ) also read `chat_template_kwargs`.
 */
export interface CloudflareTextProviderOptions {
    temperature?: number;
    max_tokens?: number;
    top_p?: number;
    top_k?: number;
    seed?: number;
    repetition_penalty?: number;
    frequency_penalty?: number;
    presence_penalty?: number;
    chat_template_kwargs?: {
        enable_thinking?: boolean;
        clear_thinking?: boolean;
    };
}
/**
 * Cloudflare text (chat) adapter.
 *
 * Drives Workers AI's OpenAI-compatible Chat Completions surface with the
 * OpenAI SDK. Inside a Worker pass `{ binding: env.AI }`; anywhere else pass
 * `{ accountId, apiKey }`. Add `gateway` to route through AI Gateway. Any
 * catalog model works, including third-party `provider/model` ids billed
 * through AI Gateway.
 */
export declare class CloudflareTextAdapter<TModel extends CloudflareTextModel, TProviderOptions extends Record<string, any> = CloudflareTextProviderOptions, TReasoning extends ReasoningCapability = ResolveReasoning<TModel>> extends OpenAIBaseChatCompletionsTextAdapter<TModel, TProviderOptions, ReadonlyArray<Modality>, DefaultMessageMetadataByModality, ReadonlyArray<string>, TReasoning> {
    readonly kind: "text";
    readonly name: "cloudflare";
    /** `config.reasoning`, which wins over `CLOUDFLARE_MODEL_REASONING`. */
    private readonly configReasoning;
    constructor(config: CloudflareTextConfig, model: TModel);
    /**
     * `chat({ reasoning })` as `reasoning_effort`. Workers AI turns reasoning
     * off with `null`, so `off` sends `null`, not the model's off value.
     */
    protected mapOptionsToRequest(options: TextOptions): OpenAI.Chat.Completions.ChatCompletionCreateParamsStreaming;
    /**
     * Workers AI validates `messages[].content` as a string, so a tool-call-only
     * assistant turn (which OpenAI accepts as `content: null`) is sent as `''`.
     */
    protected convertMessage(message: ModelMessage): ChatCompletionMessageParam;
    /**
     * Workers AI accepts `response_format` next to `tools` but its models answer
     * the tool follow-up turn in prose, so structured output with tools runs as
     * a separate finalization request instead.
     */
    supportsCombinedToolsAndSchema(): boolean;
    /** Workers AI reasoning models stream thinking as `reasoning_content` (some as `reasoning`). */
    protected extractReasoning(chunk: ChatCompletionChunk): {
        text: string;
    } | undefined;
}
/**
 * Creates a Cloudflare text adapter with explicit configuration.
 *
 * @example
 * ```typescript
 * // Inside a Worker
 * const adapter = createCloudflareText('@cf/zai-org/glm-5.3-flash', { binding: env.AI })
 * // Anywhere, over REST
 * const adapter = createCloudflareText('@cf/zai-org/glm-5.3-flash', { accountId, apiKey })
 * ```
 */
export declare function createCloudflareText<TModel extends CloudflareTextModel, TConfig extends CloudflareTextConfig = CloudflareTextConfig>(model: TModel, config: TConfig): CloudflareTextAdapter<TModel, CloudflareTextProviderOptions, ConfigReasoning<TConfig, ResolveReasoning<TModel>>>;
/**
 * Creates a Cloudflare text adapter, reading `CLOUDFLARE_ACCOUNT_ID` and
 * `CLOUDFLARE_API_TOKEN` from the environment unless a binding is passed.
 */
export declare function cloudflareText<TModel extends CloudflareTextModel, TConfig extends CloudflareConfigInput<CloudflareTextRestConfig> & CloudflareTextReasoningConfig = CloudflareConfigInput<CloudflareTextRestConfig>>(model: TModel, config?: TConfig): CloudflareTextAdapter<TModel, CloudflareTextProviderOptions, ConfigReasoning<TConfig, ResolveReasoning<TModel>>>;
export {};
