import { default as OpenAI } from 'openai';
import { OpenAIBaseChatCompletionsTextAdapter, OpenAIBaseTextAdapterOptions } from '@tanstack/openai-base';
import { LLMGatewayModelReasoningByName } from '../model-reasoning.js';
import { Modality } from '@tanstack/ai';
import { LLMGatewayChatModelToolCapabilitiesByName, LLMGatewayModelId, ResolveInputModalities, ResolveProviderOptions } from '../model-meta.js';
import { LLMGatewayMessageMetadataByModality } from '../message-types.js';
import { LLMGatewayClientConfig } from '../utils/client.js';
/**
 * The reasoning levels of a model, for `chat({ reasoning })`. This API has
 * no token budget field, so no model takes `budgetTokens` here. `never`:
 * the model does not reason.
 */
type ResolveReasoning<TModel extends string> = TModel extends keyof LLMGatewayModelReasoningByName ? {
    levels: LLMGatewayModelReasoningByName[TModel]['levels'];
    budget: false;
} : never;
type ResolveToolCapabilities<TModel extends string> = TModel extends keyof LLMGatewayChatModelToolCapabilitiesByName ? NonNullable<LLMGatewayChatModelToolCapabilitiesByName[TModel]> : readonly [];
/**
 * Configuration for LLM Gateway text adapter
 */
export interface LLMGatewayTextConfig extends LLMGatewayClientConfig, OpenAIBaseTextAdapterOptions {
}
/**
 * Re-export of the public provider options type
 */
export type { ExternalTextProviderOptions as LLMGatewayTextProviderOptions } from '../text/text-provider-options.js';
/**
 * LLM Gateway Text (Chat) Adapter
 *
 * Tree-shakeable adapter for LLM Gateway chat/text completion. LLM Gateway
 * exposes one OpenAI-compatible Chat Completions endpoint that routes to
 * hundreds of models across many providers, so the adapter drives it with
 * the OpenAI SDK via a `baseURL` override (the same pattern as `ai-grok`
 * and `ai-groq`).
 *
 * Model ids are open-ended: curated ids get per-model type metadata, and
 * any other id from https://llmgateway.io/models works with text-only
 * defaults. A `provider/model` id (e.g. `openai/gpt-5.5`) pins routing to
 * that provider; a bare id lets the gateway pick.
 */
export declare class LLMGatewayTextAdapter<TModel extends LLMGatewayModelId, TProviderOptions extends Record<string, any> = ResolveProviderOptions<TModel>, TInputModalities extends ReadonlyArray<Modality> = ResolveInputModalities<TModel>, TToolCapabilities extends ReadonlyArray<string> = ResolveToolCapabilities<TModel>> extends OpenAIBaseChatCompletionsTextAdapter<TModel, TProviderOptions, TInputModalities, LLMGatewayMessageMetadataByModality, TToolCapabilities, ResolveReasoning<TModel>> {
    readonly kind: "text";
    readonly name: "llmgateway";
    readonly inputModalities: readonly ("text" | "image" | "audio" | "video" | "document")[] | undefined;
    constructor(config: LLMGatewayTextConfig, model: TModel);
    protected modelReasoning(model: string): import('@tanstack/ai').ModelReasoning | undefined;
    /**
     * Surfaces reasoning deltas during streaming. LLM Gateway normalizes
     * upstream reasoning output to `delta.reasoning_content` on the OpenAI
     * Chat Completions wire format (the DeepSeek-style field most
     * OpenAI-compatible providers emit); some routed providers emit
     * `delta.reasoning` instead, so both are read.
     */
    protected extractReasoning(chunk: OpenAI.Chat.Completions.ChatCompletionChunk): {
        text: string;
    } | undefined;
}
/**
 * Creates an LLM Gateway text adapter with explicit API key.
 *
 * @example
 * ```typescript
 * const adapter = createLLMGatewayText('gpt-5.6-terra', "llmgtwy_...");
 * ```
 */
export declare function createLLMGatewayText<TModel extends LLMGatewayModelId>(model: TModel, apiKey: string, config?: Omit<LLMGatewayTextConfig, 'apiKey'>): LLMGatewayTextAdapter<TModel>;
/**
 * Creates an LLM Gateway text adapter with API key from
 * `LLM_GATEWAY_API_KEY`.
 *
 * @example
 * ```typescript
 * const adapter = llmGatewayText('gpt-5.6-terra');
 * ```
 */
export declare function llmGatewayText<TModel extends LLMGatewayModelId>(model: TModel, config?: Omit<LLMGatewayTextConfig, 'apiKey'>): LLMGatewayTextAdapter<TModel>;
