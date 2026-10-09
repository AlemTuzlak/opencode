import { OpenAIBaseResponsesTextAdapter, OpenAIBaseTextAdapterOptions } from '@tanstack/openai-base';
import { VercelGatewayModelReasoningByName } from '../model-reasoning.js';
import { Modality, TextOptions } from '@tanstack/ai';
import { ResponseCreateParams } from 'openai/resources/responses/responses';
import { VERCEL_GATEWAY_CHAT_MODELS, VercelGatewayChatModelToolCapabilitiesByName, ResolveInputModalities, ResolveProviderOptions } from '../model-meta.js';
import { VercelGatewayMessageMetadataByModality } from '../message-types.js';
import { ExternalResponsesProviderOptions } from '../text/responses-provider-options.js';
import { VercelGatewayClientConfig } from '../utils/client.js';
export interface VercelGatewayResponsesTextConfig extends VercelGatewayClientConfig, OpenAIBaseTextAdapterOptions {
}
export type VercelGatewayResponsesTextProviderOptions = ExternalResponsesProviderOptions;
/**
 * The reasoning levels of a model, for `chat({ reasoning })`. This API has
 * no token budget field, so no model takes `budgetTokens` here. `never`:
 * the model does not reason.
 */
type ResolveReasoning<TModel extends string> = TModel extends keyof VercelGatewayModelReasoningByName ? {
    levels: VercelGatewayModelReasoningByName[TModel]['levels'];
    budget: false;
} : never;
type ResolveToolCapabilities<TModel extends string> = TModel extends keyof VercelGatewayChatModelToolCapabilitiesByName ? NonNullable<VercelGatewayChatModelToolCapabilitiesByName[TModel]> : readonly [];
/**
 * Vercel AI Gateway Responses text adapter.
 *
 * Talks to the public OpenAI-compatible Responses API at
 * `https://ai-gateway.vercel.sh/v1`.
 */
export declare class VercelGatewayResponsesTextAdapter<TModel extends (typeof VERCEL_GATEWAY_CHAT_MODELS)[number], TProviderOptions extends Record<string, any> = ResolveProviderOptions<TModel>, TInputModalities extends ReadonlyArray<Modality> = ResolveInputModalities<TModel>, TToolCapabilities extends ReadonlyArray<string> = ResolveToolCapabilities<TModel>> extends OpenAIBaseResponsesTextAdapter<TModel, TProviderOptions, TInputModalities, VercelGatewayMessageMetadataByModality, TToolCapabilities, ResolveReasoning<TModel>> {
    readonly kind: "text";
    readonly name: "vercel-gateway";
    constructor(config: VercelGatewayResponsesTextConfig, model: TModel);
    protected modelReasoning(model: string): import('@tanstack/ai').ModelReasoning | undefined;
    protected mapOptionsToRequest(options: TextOptions<TProviderOptions>): Omit<ResponseCreateParams, 'stream'>;
}
export declare function createVercelGatewayResponsesText<TModel extends (typeof VERCEL_GATEWAY_CHAT_MODELS)[number]>(model: TModel, apiKey: string, config?: Omit<VercelGatewayResponsesTextConfig, 'apiKey'>): VercelGatewayResponsesTextAdapter<TModel>;
export declare function vercelGatewayResponsesText<TModel extends (typeof VERCEL_GATEWAY_CHAT_MODELS)[number]>(model: TModel, config?: Omit<VercelGatewayResponsesTextConfig, 'apiKey'>): VercelGatewayResponsesTextAdapter<TModel>;
export {};
