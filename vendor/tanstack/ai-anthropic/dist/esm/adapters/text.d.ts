import { BaseTextAdapter, StructuredOutputOptions, StructuredOutputResult } from '@tanstack/ai/adapters';
import { AnthropicModelReasoningByName } from '../model-reasoning.js';
import { ANTHROPIC_MODELS, AnthropicChatModelProviderOptionsByName, AnthropicChatModelToolCapabilitiesByName, AnthropicModelInputModalitiesByName } from '../model-meta.js';
import { AnthropicBeta } from '@anthropic-ai/sdk/resources/beta/beta';
import { AnyTool, ConfigReasoning, MidConversationChannels, Modality, ModelMessage, ModelReasoning, AdapterYieldChunk, ReasoningCapability, TextOptions } from '@tanstack/ai';
import { AnthropicSystemPromptMetadata, ExternalTextProviderOptions } from '../text/text-provider-options.js';
import { AnthropicMessageMetadataByModality } from '../message-types.js';
import { AnthropicClientConfig, AnthropicMessagesClient } from '../utils/client.js';
/**
 * True when any message carries a provider file-handle source, so the request
 * must send the Files API beta header.
 */
export declare function messagesHaveFileSource(messages: Array<ModelMessage>): boolean;
/**
 * Computes the `betas` array for a Messages request. Unions:
 * - `interleaved-thinking-2025-05-14` when interleaved thinking is enabled,
 * - `code-execution-2025-08-25` when a `code_execution` tool is present,
 * - `skills-2025-10-02` when that tool carries skills,
 * - `context-management-2025-06-27` when `context_management` is set,
 * - `files-api-2025-04-14` when a message references an uploaded file handle,
 * - `mid-conversation-tool-changes-2026-07-01` in mid-conversation tool mode,
 * - `mid-conversation-output-config-2026-07-01` and
 *   `thinking-binding-controls-2026-08-01` with mid-conversation effort
 *   (`thinking.block_binding`).
 * Returns `undefined` when none apply (so the call site omits `betas`).
 */
export declare function computeAnthropicBetas(tools: Array<AnyTool> | undefined, modelOptions: {
    thinking?: {
        type?: 'enabled' | 'disabled' | 'adaptive';
        budget_tokens?: number;
        block_binding?: unknown;
    };
    context_management?: unknown | null;
    mcp_servers?: ReadonlyArray<unknown>;
} | undefined, hasFileSource?: boolean, midConversationToolChanges?: boolean): Array<AnthropicBeta> | undefined;
/**
 * Configuration for Anthropic text adapter
 */
export interface AnthropicTextConfig extends AnthropicClientConfig {
    /** Add the Claude Code identity and OAuth headers. */
    oauth?: boolean;
    /** Replay ordinary thinking without a signature. The default is false. */
    allowEmptySignature?: boolean;
    /** Identify a gateway separately from the direct Anthropic API. */
    provider?: string;
    /**
     * The model's reasoning data, for example `modelReasoning(record)` from a
     * `@tanstack/ai-models` record. It wins over the adapter's own table, for
     * the thinking fields and for the levels `chat({ reasoning })` takes.
     * `false`: the model does not reason, so no thinking field goes out.
     */
    reasoning?: ModelReasoning;
    /**
     * The mid-conversation channels (the
     * `mid-conversation-tool-changes-2026-07-01` beta and mid-conversation
     * `system` messages) of the models in
     * `ANTHROPIC_MODEL_MID_CONVERSATION_CHANNELS`. When absent, they are on
     * only for Anthropic's own API: a `baseURL`, a `fetch`, an injected
     * `client`, or the SDK's `ANTHROPIC_BASE_URL` env var turns the default off. `true` turns them on anyway, for a
     * gateway that passes the changes. `false` turns them off, so every
     * request is built as before. An object turns on only the channels it
     * names, for a gateway that passes one of them:
     * `{ systemPrompts: true }` sends a system prompt change in place and a
     * tool change as the full tool list.
     */
    midConversationChannels?: boolean | Partial<MidConversationChannels>;
}
export type AnthropicTextAdapterConfig = AnthropicTextConfig | {
    client: AnthropicMessagesClient;
    /** See {@link AnthropicTextConfig.midConversationChannels}. */
    midConversationChannels?: AnthropicTextConfig['midConversationChannels'];
    oauth?: boolean;
    allowEmptySignature?: boolean;
    provider?: string;
    /** See {@link AnthropicTextConfig.reasoning}. */
    reasoning?: ModelReasoning;
};
/**
 * Anthropic-specific provider options for text/chat
 */
export type AnthropicTextProviderOptions = ExternalTextProviderOptions;
/**
 * Resolve provider options for a specific model.
 * If the model has explicit options in the map, use those; otherwise use base options.
 */
type ResolveProviderOptions<TModel extends string> = TModel extends keyof AnthropicChatModelProviderOptionsByName ? AnthropicChatModelProviderOptionsByName[TModel] : AnthropicTextProviderOptions;
/**
 * Resolve input modalities for a specific model.
 * If the model has explicit modalities in the map, use those; otherwise use default.
 */
type ResolveInputModalities<TModel extends string> = TModel extends keyof AnthropicModelInputModalitiesByName ? AnthropicModelInputModalitiesByName[TModel] : readonly ['text', 'image', 'document'];
/** The reasoning levels of a model, for `chat({ reasoning })`. `never`: none. */
type ResolveReasoning<TModel extends string> = TModel extends keyof AnthropicModelReasoningByName ? AnthropicModelReasoningByName[TModel] : never;
/**
 * A model id: a known Anthropic model, or any other id, for example a
 * gateway or catalog id such as `anthropic/claude-sonnet-4.6`.
 */
export type AnthropicModelId = (typeof ANTHROPIC_MODELS)[number] | (string & {});
type ResolveToolCapabilities<TModel extends string> = TModel extends keyof AnthropicChatModelToolCapabilitiesByName ? NonNullable<AnthropicChatModelToolCapabilitiesByName[TModel]> : readonly [];
/**
 * Anthropic Text (Chat) Adapter
 *
 * Tree-shakeable adapter for Anthropic chat/text completion functionality.
 * Import only what you need for smaller bundle sizes.
 */
export declare class AnthropicTextAdapter<TModel extends AnthropicModelId, TProviderOptions extends Record<string, any> = ResolveProviderOptions<TModel>, TInputModalities extends ReadonlyArray<Modality> = ResolveInputModalities<TModel>, TToolCapabilities extends ReadonlyArray<string> = ResolveToolCapabilities<TModel>, TReasoning extends ReasoningCapability = ResolveReasoning<TModel>> extends BaseTextAdapter<TModel, TProviderOptions, TInputModalities, AnthropicMessageMetadataByModality, TToolCapabilities, unknown, AnthropicSystemPromptMetadata, TReasoning> {
    readonly kind: "text";
    readonly name: "anthropic";
    readonly api = "anthropic-messages";
    readonly provider: string;
    readonly supportsFileSources = true;
    readonly inputModalities: readonly ("text" | "image" | "document" | "audio" | "video")[] | undefined;
    /** Set from `ANTHROPIC_MODEL_MID_CONVERSATION_CHANNELS` in the constructor. */
    readonly midConversationChannels: MidConversationChannels | undefined;
    private readonly client;
    /** The adapter's own SDK client. An injected client cannot take a fetch. */
    private readonly sdkClient;
    private readonly baseFetch;
    /** `config.reasoning`, which wins over `ANTHROPIC_MODEL_REASONING`. */
    private readonly modelReasoning;
    private readonly oauth;
    private readonly allowEmptySignature;
    private readonly tokenAuthentication;
    private readonly oauthHeaders;
    constructor(config: AnthropicTextAdapterConfig, model: TModel);
    /** Use a client whose fetch goes through `wrapFetch` for one call. */
    private clientFor;
    chatStream(options: TextOptions<TProviderOptions>): AsyncIterable<AdapterYieldChunk>;
    /**
     * Generate structured output using Anthropic's tool-based approach.
     * Anthropic doesn't have native structured output, so we use a tool with the schema
     * and force the model to call it.
     * The outputSchema is already JSON Schema (converted in the ai layer).
     */
    structuredOutput(options: StructuredOutputOptions<TProviderOptions>): Promise<StructuredOutputResult<unknown>>;
    private requestHeaders;
    private mapCommonOptionsToAnthropic;
    /**
     * Mid-conversation changes: the start prompts for `system`, the tool-mode
     * `tools`, and a `system` message for each change by message index.
     * Undefined when the request stays as today: the adapter has no channels,
     * the engine passed no changes, or the changes do not fit the current lists.
     */
    private midConversationRequest;
    /**
     * Anthropic supports `output_config.format` + `tools` in a single streaming
     * Messages request only for Claude 4.5+ (GA 2026-01-29). For 4.4 and
     * earlier we keep the forced-tool-use workaround in
     * {@link structuredOutput} via the engine's finalization path.
     */
    supportsCombinedToolsAndSchema(): boolean;
    private convertContentPartToAnthropic;
    private formatMessages;
    /** The effort an assistant message of this provider was made with. */
    private storedEffort;
    private appendThinkingBlocks;
    /** A tool call as a `tool_use` block, or a server tool as its two blocks. */
    private appendToolCallBlocks;
    /**
     * Merge consecutive messages of the same role into a single message.
     * Anthropic's API requires strictly alternating user/assistant roles.
     * Tool results are wrapped as role:'user' messages, which can collide
     * with actual user messages in multi-turn conversations.
     *
     * Also filters out empty assistant messages (e.g., from a previous failed request).
     */
    private mergeConsecutiveSameRoleMessages;
    private processAnthropicStream;
}
/**
 * The adapter type for a model and a config. A config with `reasoning` sets
 * the levels `chat({ reasoning })` takes; see {@link ConfigReasoning}.
 */
export type AnthropicTextAdapterFor<TModel extends AnthropicModelId, TConfig = AnthropicTextConfig> = AnthropicTextAdapter<TModel, ResolveProviderOptions<TModel>, ResolveInputModalities<TModel>, ResolveToolCapabilities<TModel>, ConfigReasoning<TConfig, ResolveReasoning<TModel>>>;
/**
 * Creates an Anthropic chat adapter with explicit API key.
 * Type resolution happens here at the call site.
 */
export declare function createAnthropicChat<TModel extends AnthropicModelId, TConfig extends Omit<AnthropicTextConfig, 'apiKey'> = Omit<AnthropicTextConfig, 'apiKey'>>(model: TModel, apiKey: string, config?: TConfig): AnthropicTextAdapterFor<TModel, TConfig>;
/**
 * Creates an Anthropic chat adapter with an injected Messages client.
 * Type resolution happens here at the call site.
 */
export declare function createAnthropicChatWithClient<TModel extends AnthropicModelId>(model: TModel, client: AnthropicMessagesClient): AnthropicTextAdapter<TModel, ResolveProviderOptions<TModel>, ResolveInputModalities<TModel>>;
/**
 * Creates an Anthropic text adapter with automatic API key detection.
 * Type resolution happens here at the call site.
 */
export declare function anthropicText<TModel extends AnthropicModelId, TConfig extends AnthropicTextConfig = AnthropicTextConfig>(model: TModel, config?: TConfig): AnthropicTextAdapterFor<TModel, TConfig>;
export {};
