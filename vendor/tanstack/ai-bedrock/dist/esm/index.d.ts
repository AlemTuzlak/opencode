import { BedrockTextAdapter, BedrockTextConfig } from './adapters/text.js';
import { BedrockResponsesTextAdapter, BedrockResponsesConfig } from './adapters/responses-text.js';
import { BedrockConverseTextAdapter, BedrockConverseConfig } from './adapters/converse-text.js';
import { BedrockChatModels, BedrockConverseModels, BedrockResponsesModels } from './model-meta.js';
/** Config for the branching factory's converse mode (default, or api: 'converse'). */
export type BedrockConverseApiConfig = BedrockConverseConfig & {
    api?: 'converse';
};
/** Config for the branching factory's chat mode (api: 'chat' required). */
export type BedrockChatApiConfig = BedrockTextConfig & {
    api: 'chat';
};
/** Config for the branching factory's responses mode (api: 'responses' required). */
export type BedrockResponsesApiConfig = BedrockResponsesConfig & {
    api: 'responses';
};
export declare function createBedrockText<TModel extends BedrockConverseModels>(model: TModel, apiKey: string, config?: BedrockConverseApiConfig): BedrockConverseTextAdapter<TModel>;
export declare function createBedrockText<TModel extends BedrockChatModels>(model: TModel, apiKey: string, config: BedrockChatApiConfig): BedrockTextAdapter<TModel>;
export declare function createBedrockText<TModel extends BedrockResponsesModels>(model: TModel, apiKey: string, config: BedrockResponsesApiConfig): BedrockResponsesTextAdapter<TModel>;
export declare function bedrockText<TModel extends BedrockConverseModels>(model: TModel, config?: BedrockConverseApiConfig): BedrockConverseTextAdapter<TModel>;
export declare function bedrockText<TModel extends BedrockChatModels>(model: TModel, config: BedrockChatApiConfig): BedrockTextAdapter<TModel>;
export declare function bedrockText<TModel extends BedrockResponsesModels>(model: TModel, config: BedrockResponsesApiConfig): BedrockResponsesTextAdapter<TModel>;
export { BedrockTextAdapter, createBedrockChat, type BedrockTextConfig, type BedrockTextProviderOptions, } from './adapters/text.js';
export { BedrockResponsesTextAdapter, createBedrockResponsesText, type BedrockResponsesConfig, type BedrockResponsesProviderOptions, } from './adapters/responses-text.js';
export { BedrockConverseTextAdapter, createBedrockConverse, type BedrockConverseConfig, type BedrockConverseModelId, } from './adapters/converse-text.js';
export { BedrockEmbeddingAdapter, bedrockEmbedding, createBedrockEmbedding, type BedrockEmbeddingConfig, } from './adapters/embedding.js';
export type { BedrockCohereEmbeddingInputType, BedrockCohereEmbeddingProviderOptions, BedrockEmbeddingProviderOptions, BedrockTitanImageEmbeddingProviderOptions, BedrockTitanTextEmbeddingProviderOptions, } from './embedding/embedding-provider-options.js';
export type { BedrockConverseProviderOptions } from './converse/provider-options.js';
export { resolveBedrockAuth, withBedrockDefaults, type BedrockClientConfig, type BedrockEndpoint, type ResolvedBedrockAuth, } from './utils/client.js';
export { BEDROCK_CHAT_MODELS, BEDROCK_RESPONSES_MODELS, BEDROCK_CONVERSE_MODELS, BEDROCK_EMBEDDING_MODELS, type BedrockEmbeddingModel, type BedrockEmbeddingModelProviderOptionsByName, type BedrockEmbeddingModelInputModalitiesByName, type BedrockChatModels, type BedrockResponsesModels, type BedrockConverseModels, type BedrockChatModelProviderOptionsByName, type BedrockChatModelToolCapabilitiesByName, type BedrockModelInputModalitiesByName, } from './model-meta.js';
export type { BedrockCachePoint, BedrockSystemPromptMetadata, BedrockToolMetadata, BedrockMessageMetadataByModality, BedrockTextMetadata, BedrockImageMetadata, BedrockAudioMetadata, BedrockVideoMetadata, BedrockDocumentMetadata, } from './message-types.js';
