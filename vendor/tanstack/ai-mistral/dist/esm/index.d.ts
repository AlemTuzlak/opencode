/**
 * @module @tanstack/ai-mistral
 *
 * Mistral provider adapter for TanStack AI.
 * Provides tree-shakeable adapters for Mistral's Chat Completions API.
 */
export { MistralTextAdapter, createMistralText, mistralText, type MistralModelId, type MistralTextAdapterFor, type MistralTextConfig, type MistralTextProviderOptions, } from './adapters/text.js';
export { MistralEmbeddingAdapter, createMistralEmbedding, mistralEmbedding, type MistralEmbeddingConfig, } from './adapters/embedding.js';
export type { MistralEmbeddingProviderOptions, MistralEmbedProviderOptions, CodestralEmbedProviderOptions, } from './embedding/embedding-provider-options.js';
export type { MistralChatModelProviderOptionsByName, MistralModelInputModalitiesByName, ResolveProviderOptions, ResolveInputModalities, MistralChatModels, MistralVertexChatModel, MistralEmbeddingModel, MistralEmbeddingModelProviderOptionsByName, MistralEmbeddingModelInputModalitiesByName, } from './model-meta.js';
export { MISTRAL_CHAT_MODELS, MISTRAL_EMBEDDING_MODELS, MISTRAL_VERTEX_CHAT_MODELS, } from './model-meta.js';
export type { MistralTextMetadata, MistralImageMetadata, MistralAudioMetadata, MistralVideoMetadata, MistralDocumentMetadata, MistralMessageMetadataByModality, } from './message-types.js';
