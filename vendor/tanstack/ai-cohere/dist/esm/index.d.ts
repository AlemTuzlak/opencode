/**
 * @module @tanstack/ai-cohere
 *
 * Cohere provider adapter for TanStack AI.
 * Provides tree-shakeable adapters for Cohere's v2/embed API (multimodal
 * embeddings) and v2/rerank API (document reranking) using plain fetch —
 * no SDK dependency.
 */
export { CohereEmbeddingAdapter, createCohereEmbedding, cohereEmbedding, type CohereEmbeddingConfig, } from './adapters/embedding.js';
export type { CohereEmbeddingProviderOptions } from './embedding/embedding-provider-options.js';
export { CohereRerankAdapter, createCohereRerank, cohereRerank, } from './adapters/rerank.js';
export { getCohereApiKeyFromEnv, type CohereClientConfig } from './utils/client.js';
export type { CohereEmbeddingModel, CohereEmbeddingModelProviderOptionsByName, CohereEmbeddingModelInputModalitiesByName, } from './model-meta.js';
export { COHERE_EMBEDDING_MODELS } from './model-meta.js';
export { COHERE_RERANK_MODELS, type CohereRerankModel, type CohereRerankProviderOptions, type CohereRerankModelProviderOptionsByName, type InferCohereRerankProviderOptions, } from './model-meta.js';
