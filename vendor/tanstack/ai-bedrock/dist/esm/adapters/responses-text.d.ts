import { OpenAIBaseResponsesTextAdapter, OpenAIBaseTextAdapterOptions } from '@tanstack/openai-base';
import { BedrockModelReasoningByName } from '../model-reasoning.js';
import { Modality } from '@tanstack/ai';
import { BedrockClientConfig } from '../utils/client.js';
import { BedrockMessageMetadataByModality } from '../message-types.js';
import { BedrockChatModelToolCapabilitiesByName, BedrockResponsesModels, ResolveInputModalities } from '../model-meta.js';
import { ExternalResponsesProviderOptions } from '../text/responses-provider-options.js';
export interface BedrockResponsesConfig extends BedrockClientConfig, OpenAIBaseTextAdapterOptions {
}
export type { ExternalResponsesProviderOptions as BedrockResponsesProviderOptions } from '../text/responses-provider-options.js';
/** The reasoning levels of a model, for `chat({ reasoning })`. `never`: none. */
type ResolveReasoning<TModel extends string> = TModel extends keyof BedrockModelReasoningByName ? BedrockModelReasoningByName[TModel] : never;
type ResolveToolCapabilities<TModel extends string> = TModel extends keyof BedrockChatModelToolCapabilitiesByName ? NonNullable<BedrockChatModelToolCapabilitiesByName[TModel]> : readonly [];
/**
 * Bedrock Responses adapter. Drives mantle's OpenAI-compatible `/responses`
 * endpoint via the OpenAI SDK (`client.responses.create`) — the same base
 * class ai-openai's `openaiText` uses. Responses is mantle-only, so the
 * constructor forces the mantle baseURL.
 */
export declare class BedrockResponsesTextAdapter<TModel extends BedrockResponsesModels, TProviderOptions extends Record<string, any> = ExternalResponsesProviderOptions, TInputModalities extends ReadonlyArray<Modality> = ResolveInputModalities<TModel>, TToolCapabilities extends ReadonlyArray<string> = ResolveToolCapabilities<TModel>> extends OpenAIBaseResponsesTextAdapter<TModel, TProviderOptions, TInputModalities, BedrockMessageMetadataByModality, TToolCapabilities, ResolveReasoning<TModel>> {
    readonly kind: "text";
    readonly name: "bedrock-responses";
    readonly provider: string;
    readonly inputModalities: ReadonlyArray<Modality>;
    constructor(config: BedrockResponsesConfig, model: TModel);
    protected modelReasoning(model: string): import('@tanstack/ai').ModelReasoning | undefined;
}
/** Responses adapter with an explicit API key (low-level; the public branching factory delegates here). */
export declare function createBedrockResponsesText<TModel extends BedrockResponsesModels>(model: TModel, apiKey: string, config?: Omit<BedrockResponsesConfig, 'apiKey'>): BedrockResponsesTextAdapter<TModel>;
