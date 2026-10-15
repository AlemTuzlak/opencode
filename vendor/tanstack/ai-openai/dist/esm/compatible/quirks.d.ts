import { ModelReasoning, ReasoningRequest, ResolvedPromptCache } from '@tanstack/ai';
/** How a Chat Completions request asks for thinking. */
export type OpenAICompatibleThinkingFormat = 'openai' | 'deepseek' | 'zai' | 'qwen' | 'qwen-chat-template' | 'chat-template' | 'baseten' | 'openrouter' | 'together' | 'string-thinking' | 'ant-ling';
/**
 * The request quirks of an OpenAI-compatible provider or model. The same
 * fields as pi's `OpenAICompletionsCompat` and as `ModelCompat` in
 * `@tanstack/ai-models`, so a catalog record's `compat` drops in. An absent
 * field keeps today's request.
 */
export interface OpenAICompatibleCompat {
    /** How to ask for thinking. Default `'openai'` (`reasoning_effort`). */
    thinkingFormat?: OpenAICompatibleThinkingFormat;
    /** `false`: the provider takes no `reasoning_effort`. Default `true`. */
    supportsReasoningEffort?: boolean;
    /** `false`: send instructions as `system`, not `developer`. Default `true`. */
    supportsDeveloperRole?: boolean;
    /** The field for the output token limit. Set only to rename it. */
    maxTokensField?: 'max_completion_tokens' | 'max_tokens';
    /** `true`: every earlier assistant message carries `reasoning_content` (DeepSeek). */
    requiresReasoningContentOnAssistantMessages?: boolean;
    /** `false`: the provider rejects `store`, so it is dropped. */
    supportsStore?: boolean;
    /** `false`: tools are sent with `strict: false`. */
    supportsStrictMode?: boolean;
    /** `false`: no `stream_options: { include_usage }`. */
    supportsUsageInStreaming?: boolean;
    /** `true`: send `tool_stream: true` with tools (Z.AI). */
    zaiToolStream?: boolean;
    /** `true`: send the conversation id as session headers. */
    sendSessionAffinityHeaders?: boolean;
    sessionAffinityFormat?: 'openai' | 'openrouter' | 'openai-nosession';
    /** `'anthropic'`: add Anthropic cache markers (Claude through OpenRouter). */
    cacheControlFormat?: 'anthropic';
    /** `false`: the provider has no long cache, so a `'long'` retention acts as `'short'`. */
    supportsLongCacheRetention?: boolean;
    /** `true`: the model takes `prompt_cache_options` (OpenAI gpt-5.6 and later); older models reject it. */
    supportsExplicitPromptCacheMode?: boolean;
    /** A top-level field for the thinking token budget, for example `thinking_token_budget`. */
    thinkingTokenBudgetField?: string;
    /** Values for `chat_template_kwargs` (the `chat-template` format). */
    chatTemplateKwargs?: Record<string, unknown>;
    /** Values for `chat_template_args` (the `baseten` format). */
    chatTemplateArgs?: Record<string, unknown>;
    supportsTemperature?: boolean;
}
/** A Chat Completions request body, as loose JSON. */
type Params = Record<string, unknown>;
/**
 * Write the thinking fields of `request` into `params`, the way pi's
 * `buildParams` does for each `thinkingFormat`. `reasoning: false` (a model
 * that does not reason) gets nothing.
 */
export declare function applyThinking(params: Params, request: ReasoningRequest, reasoning: ModelReasoning | undefined, compat: OpenAICompatibleCompat, modelMaxTokens?: number): void;
/**
 * The quirks that are not about thinking: the instruction role, the token
 * field name, `store`, strict tools, `tool_stream`, and cache markers.
 * `promptCache` sets the cache markers. When it is absent, the markers stay
 * as today.
 */
export declare function applyRequestQuirks(params: Params, compat: OpenAICompatibleCompat, reasons: boolean, promptCache: ResolvedPromptCache | undefined): void;
/**
 * The thinking of an earlier assistant turn, sent back as
 * `reasoning_content`. Some providers (DeepSeek) refuse the next turn without
 * it, so it is `''` when the turn had no thinking.
 */
export declare function replayReasoning(thinking: ReadonlyArray<{
    content: string;
}> | undefined): string;
/** The session headers for `sendSessionAffinityHeaders`, as pi sends them. */
export declare function sessionHeaders(compat: OpenAICompatibleCompat, sessionId: string | undefined): Record<string, string> | undefined;
export {};
