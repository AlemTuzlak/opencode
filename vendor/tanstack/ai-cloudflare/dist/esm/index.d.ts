/**
 * @module @tanstack/ai-cloudflare
 *
 * Cloudflare provider adapter for TanStack AI: Workers AI chat, embeddings,
 * images, speech and transcription over the `env.AI` binding or the REST
 * API, plus AI Gateway routing for any provider.
 */
export { CloudflareTextAdapter, createCloudflareText, cloudflareText, type CloudflareTextProviderOptions, } from './adapters/text.js';
export { createCloudflareSummarize, cloudflareSummarize, type CloudflareSummarizeModel, } from './adapters/summarize.js';
export { CloudflareEmbeddingAdapter, createCloudflareEmbedding, cloudflareEmbedding, type CloudflareEmbeddingProviderOptions, } from './adapters/embedding.js';
export { CloudflareEvaluateAdapter, createCloudflareDecider, cloudflareDecider, } from './adapters/evaluate.js';
export { CloudflareImageAdapter, createCloudflareImage, cloudflareImage, type CloudflareImageProviderOptions, } from './adapters/image.js';
export { CloudflareTTSAdapter, createCloudflareTTS, cloudflareTTS, type CloudflareTTSProviderOptions, } from './adapters/tts.js';
export { CloudflareTranscriptionAdapter, createCloudflareTranscription, cloudflareTranscription, type CloudflareTranscriptionProviderOptions, } from './adapters/transcription.js';
export { cloudflareGateway, type CloudflareGatewayTarget } from './gateway.js';
export { cloudflareBindingFetch, type CloudflareBindingFetchOptions, } from './utils/fetch.js';
export type { CloudflareBindingConfig, CloudflareConfig, CloudflareConfigInput, CloudflareGatewayOptions, CloudflareRestConfig, CloudflareTextConfig, CloudflareTextReasoningConfig, CloudflareTextRestConfig, } from './utils/config.js';
export type { CloudflareEmbeddingModel, CloudflareEvaluateModel, CloudflareImageModel, CloudflareTextModel, CloudflareTranscriptionModel, CloudflareTTSModel, } from './utils/models.js';
