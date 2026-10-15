import { BaseEmbeddingAdapter } from '@tanstack/ai/adapters';
import { EmbeddingOptions, EmbeddingResult } from '@tanstack/ai';
import { CloudflareConfig, CloudflareConfigInput } from '../utils/config.js';
import { CloudflareEmbeddingModel } from '../utils/models.js';
/** Extra inputs forwarded to the embedding model (model specific). */
export type CloudflareEmbeddingProviderOptions = Record<string, unknown>;
/**
 * Cloudflare embedding adapter. Runs Workers AI text-embedding models
 * (`{ text: [...] }` in, `{ data: number[][] }` out) through the binding or
 * the REST API.
 */
export declare class CloudflareEmbeddingAdapter<TModel extends CloudflareEmbeddingModel> extends BaseEmbeddingAdapter<TModel, CloudflareEmbeddingProviderOptions> {
    private readonly cfConfig;
    readonly name: "cloudflare";
    constructor(cfConfig: CloudflareConfig, model: TModel);
    createEmbeddings(options: EmbeddingOptions<CloudflareEmbeddingProviderOptions>): Promise<EmbeddingResult>;
}
export declare function createCloudflareEmbedding<TModel extends CloudflareEmbeddingModel>(model: TModel, config: CloudflareConfig): CloudflareEmbeddingAdapter<TModel>;
export declare function cloudflareEmbedding<TModel extends CloudflareEmbeddingModel>(model: TModel, config?: CloudflareConfigInput): CloudflareEmbeddingAdapter<TModel>;
