/**
 * @module @tanstack/ai-vercel-gateway
 *
 * Vercel AI Gateway adapter for TanStack AI.
 */
export { VercelGatewayTextAdapter, type VercelGatewayTextConfig, type VercelGatewayTextProviderOptions, } from './adapters/text.js';
export { createVercelGatewayText, vercelGatewayText, type VercelGatewayTextApi, type VercelGatewayResponsesApiConfig, type VercelGatewayChatApiConfig, } from './adapters/factory.js';
export { VercelGatewayResponsesTextAdapter, createVercelGatewayResponsesText, vercelGatewayResponsesText, type VercelGatewayResponsesTextConfig, type VercelGatewayResponsesTextProviderOptions, } from './adapters/responses-text.js';
export { createVercelGatewaySummarize, vercelGatewaySummarize, type VercelGatewaySummarizeConfig, type VercelGatewaySummarizeModel, } from './adapters/summarize.js';
export { VercelGatewayEmbeddingAdapter, createVercelGatewayEmbedding, vercelGatewayEmbedding, type VercelGatewayEmbeddingConfig, } from './adapters/embedding.js';
export { VercelGatewayImageAdapter, createVercelGatewayImage, vercelGatewayImage, type VercelGatewayImageConfig, } from './adapters/image.js';
export { VercelGatewayEvaluateAdapter, createVercelGatewayDecider, vercelGatewayDecider, type VercelGatewayEvaluateConfig, } from './adapters/evaluate.js';
export type { VercelGatewayEmbeddingProviderOptions } from './embedding/embedding-provider-options.js';
export type { VercelGatewayImageProviderOptions } from './image/image-provider-options.js';
export type { VercelGatewayBaseOptions, VercelGatewayCommonOptions, VercelGatewayRoutingOptions, } from './text/text-provider-options.js';
export { VERCEL_GATEWAY_CHAT_MODELS, VERCEL_GATEWAY_EMBEDDING_MODELS, VERCEL_GATEWAY_IMAGE_MODELS, VERCEL_GATEWAY_MODEL_TAGS, VERCEL_GATEWAY_PROVIDERS, } from './model-meta.js';
export type { VercelGatewayChatModel, VercelGatewayChatModelProviderOptionsByName, VercelGatewayEmbeddingModel, VercelGatewayImageModel, VercelGatewayModelInputModalitiesByName, VercelGatewayModelTag, VercelGatewayProvider, } from './model-meta.js';
export { getVercelGatewayApiKeyFromEnv, type VercelGatewayClientConfig, } from './utils/client.js';
