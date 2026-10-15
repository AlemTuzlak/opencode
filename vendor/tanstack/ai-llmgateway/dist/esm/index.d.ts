/**
 * @module @tanstack/ai-llmgateway
 *
 * LLM Gateway provider adapter for TanStack AI.
 * Provides tree-shakeable adapters for LLM Gateway's OpenAI-compatible Chat
 * Completions API, which routes one endpoint to hundreds of models across
 * many providers.
 */
export { LLMGatewayTextAdapter, createLLMGatewayText, llmGatewayText, type LLMGatewayTextConfig, type LLMGatewayTextProviderOptions, } from './adapters/text.js';
export { createLLMGatewaySummarize, llmGatewaySummarize, type LLMGatewaySummarizeConfig, type LLMGatewaySummarizeModel, } from './adapters/summarize.js';
export type { LLMGatewayChatModelProviderOptionsByName, LLMGatewayChatModelToolCapabilitiesByName, LLMGatewayModelInputModalitiesByName, ResolveProviderOptions, ResolveInputModalities, LLMGatewayChatModels, LLMGatewayModelId, } from './model-meta.js';
export { LLMGATEWAY_CHAT_MODELS } from './model-meta.js';
export type { LLMGatewayTextMetadata, LLMGatewayImageMetadata, LLMGatewayAudioMetadata, LLMGatewayVideoMetadata, LLMGatewayDocumentMetadata, LLMGatewayMessageMetadataByModality, } from './message-types.js';
export { getLLMGatewayApiKeyFromEnv, withLLMGatewayDefaults, type LLMGatewayClientConfig, } from './utils/client.js';
