import { AnthropicTextAdapterFor } from '../adapters/text.js';
import { AnthropicVertexChatModel } from '../model-meta.js';
import { AnthropicVertexConfig } from './auth.js';
export { AnthropicVertexAuthError, resolveAnthropicVertexOptions, type AnthropicVertexConfig, } from './auth.js';
export { ANTHROPIC_VERTEX_CHAT_MODELS, type AnthropicVertexChatModel, } from '../model-meta.js';
/**
 * Creates an Anthropic chat adapter that talks to Claude on Vertex AI.
 *
 * Install `@anthropic-ai/vertex-sdk` next to `@tanstack/ai-anthropic`.
 */
export declare function anthropicVertexText<TModel extends AnthropicVertexChatModel | (string & {}), TConfig extends AnthropicVertexConfig = AnthropicVertexConfig>(model: TModel, config?: TConfig): AnthropicTextAdapterFor<TModel, TConfig>;
