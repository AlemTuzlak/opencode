import { default as OpenAI } from 'openai';
import { BaseEmbeddingAdapter } from '@tanstack/ai/adapters';
import { EmbeddingOptions, EmbeddingResult } from '@tanstack/ai';
import { VercelGatewayEmbeddingModel, VercelGatewayEmbeddingModelInputModalitiesByName, VercelGatewayEmbeddingModelProviderOptionsByName } from '../model-meta.js';
import { VercelGatewayEmbeddingProviderOptions } from '../embedding/embedding-provider-options.js';
import { VercelGatewayClientConfig } from '../utils/client.js';
export interface VercelGatewayEmbeddingConfig extends VercelGatewayClientConfig {
}
/**
 * Vercel AI Gateway embedding adapter.
 *
 * Talks to `POST /v1/embeddings` on the public OpenAI-compatible Gateway API.
 */
export declare class VercelGatewayEmbeddingAdapter<TModel extends VercelGatewayEmbeddingModel> extends BaseEmbeddingAdapter<TModel, VercelGatewayEmbeddingProviderOptions, VercelGatewayEmbeddingModelProviderOptionsByName, VercelGatewayEmbeddingModelInputModalitiesByName> {
    readonly name: "vercel-gateway";
    protected client: OpenAI;
    constructor(config: VercelGatewayEmbeddingConfig, model: TModel);
    createEmbeddings(options: EmbeddingOptions<VercelGatewayEmbeddingProviderOptions>): Promise<EmbeddingResult>;
}
export declare function createVercelGatewayEmbedding<TModel extends VercelGatewayEmbeddingModel>(model: TModel, apiKey: string, config?: Omit<VercelGatewayEmbeddingConfig, 'apiKey'>): VercelGatewayEmbeddingAdapter<TModel>;
export declare function vercelGatewayEmbedding<TModel extends VercelGatewayEmbeddingModel>(model: TModel, config?: Omit<VercelGatewayEmbeddingConfig, 'apiKey'>): VercelGatewayEmbeddingAdapter<TModel>;
