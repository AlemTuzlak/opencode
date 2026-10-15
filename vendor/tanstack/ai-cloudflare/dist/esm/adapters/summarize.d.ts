import { ChatStreamSummarizeAdapter, InferTextProviderOptions } from '@tanstack/ai/adapters';
import { CloudflareTextAdapter } from './text.js';
import { CloudflareConfigInput, CloudflareTextConfig, CloudflareTextRestConfig } from '../utils/config.js';
import { CloudflareTextModel } from '../utils/models.js';
export type CloudflareSummarizeModel = CloudflareTextModel;
/**
 * Creates a Cloudflare summarize adapter. Summaries run as a chat request
 * against the given model.
 */
export declare function createCloudflareSummarize<TModel extends CloudflareSummarizeModel>(model: TModel, config: CloudflareTextConfig): ChatStreamSummarizeAdapter<TModel, InferTextProviderOptions<CloudflareTextAdapter<TModel>>>;
/**
 * Creates a Cloudflare summarize adapter, reading `CLOUDFLARE_ACCOUNT_ID` and
 * `CLOUDFLARE_API_TOKEN` from the environment unless a binding is passed.
 */
export declare function cloudflareSummarize<TModel extends CloudflareSummarizeModel>(model: TModel, config?: CloudflareConfigInput<CloudflareTextRestConfig>): ChatStreamSummarizeAdapter<TModel, InferTextProviderOptions<CloudflareTextAdapter<TModel>>>;
