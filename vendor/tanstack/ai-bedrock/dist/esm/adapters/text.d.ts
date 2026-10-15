import { OpenAIBaseChatCompletionsTextAdapter, OpenAIBaseTextAdapterOptions } from '@tanstack/openai-base';
import { BedrockModelReasoningByName } from '../model-reasoning.js';
import { Modality } from '@tanstack/ai';
import { BedrockClientConfig } from '../utils/client.js';
import { BedrockMessageMetadataByModality } from '../message-types.js';
import { BedrockChatModelToolCapabilitiesByName, BedrockChatModels, ResolveInputModalities, ResolveProviderOptions } from '../model-meta.js';
export interface BedrockTextConfig extends BedrockClientConfig, OpenAIBaseTextAdapterOptions {
}
export type { ExternalTextProviderOptions as BedrockTextProviderOptions } from '../text/text-provider-options.js';
/** The reasoning levels of a model, for `chat({ reasoning })`. `never`: none. */
type ResolveReasoning<TModel extends string> = TModel extends keyof BedrockModelReasoningByName ? BedrockModelReasoningByName[TModel] : never;
type ResolveToolCapabilities<TModel extends string> = TModel extends keyof BedrockChatModelToolCapabilitiesByName ? NonNullable<BedrockChatModelToolCapabilitiesByName[TModel]> : readonly [];
/**
 * Bedrock Chat Completions adapter. Drives Bedrock's OpenAI-compatible
 * `/chat/completions` endpoint via the OpenAI SDK with a baseURL override
 * (same pattern as ai-groq). Tool conversion, streaming, structured output,
 * and the agent loop come from the base.
 */
export declare class BedrockTextAdapter<TModel extends BedrockChatModels, TProviderOptions extends Record<string, any> = ResolveProviderOptions<TModel>, TInputModalities extends ReadonlyArray<Modality> = ResolveInputModalities<TModel>, TToolCapabilities extends ReadonlyArray<string> = ResolveToolCapabilities<TModel>> extends OpenAIBaseChatCompletionsTextAdapter<TModel, TProviderOptions, TInputModalities, BedrockMessageMetadataByModality, TToolCapabilities, ResolveReasoning<TModel>> {
    readonly kind: "text";
    readonly name: "bedrock";
    readonly provider: string;
    readonly inputModalities: ReadonlyArray<Modality>;
    constructor(config: BedrockTextConfig, model: TModel);
    protected modelReasoning(model: string): import('@tanstack/ai').ModelReasoning | undefined;
    /**
     * Surface reasoning deltas (gpt-oss / Claude reasoning) the OpenAI-compatible
     * way. Base types the chunk as `unknown`; narrow with runtime guards — no
     * `as` casts, no `any`.
     */
    protected extractReasoning(chunk: unknown): {
        text: string;
    } | undefined;
}
/** Chat adapter with an explicit API key (low-level; the public branching factory delegates here). */
export declare function createBedrockChat<TModel extends BedrockChatModels>(model: TModel, apiKey: string, config?: Omit<BedrockTextConfig, 'apiKey'>): BedrockTextAdapter<TModel>;
