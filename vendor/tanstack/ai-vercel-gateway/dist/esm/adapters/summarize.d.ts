import { ChatStreamSummarizeAdapter, InferTextProviderOptions } from '@tanstack/ai/adapters';
import { VercelGatewayTextAdapter } from './text.js';
import { VERCEL_GATEWAY_CHAT_MODELS } from '../model-meta.js';
import { VercelGatewayClientConfig } from '../utils/client.js';
export interface VercelGatewaySummarizeConfig extends VercelGatewayClientConfig {
}
export type VercelGatewaySummarizeModel = (typeof VERCEL_GATEWAY_CHAT_MODELS)[number];
export declare function createVercelGatewaySummarize<TModel extends VercelGatewaySummarizeModel>(model: TModel, apiKey: string, config?: Omit<VercelGatewaySummarizeConfig, 'apiKey'>): ChatStreamSummarizeAdapter<TModel, InferTextProviderOptions<VercelGatewayTextAdapter<TModel>>>;
export declare function vercelGatewaySummarize<TModel extends VercelGatewaySummarizeModel>(model: TModel, config?: Omit<VercelGatewaySummarizeConfig, 'apiKey'>): ChatStreamSummarizeAdapter<TModel, InferTextProviderOptions<VercelGatewayTextAdapter<TModel>>>;
