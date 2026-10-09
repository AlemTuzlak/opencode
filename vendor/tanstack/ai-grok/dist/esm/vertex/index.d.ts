import { ChatStreamSummarizeAdapter, InferTextProviderOptions } from '@tanstack/ai/adapters';
import { GrokTextAdapter } from '../adapters/text.js';
import { GrokVertexChatModel, ResolveInputModalities, ResolveProviderOptions } from '../model-meta.js';
import { GrokVertexConfig } from './auth.js';
export { GrokVertexAuthError, resolveGrokVertexAccessToken, resolveGrokVertexBaseURL, resolveGrokVertexLocation, resolveGrokVertexProject, toVertexGrokModelId, type GrokVertexConfig, type VertexAuthClient, } from './auth.js';
export { GROK_VERTEX_CHAT_MODELS, type GrokVertexChatModel, } from '../model-meta.js';
/**
 * Creates a Grok chat adapter that talks to xAI Grok on Vertex AI.
 *
 * Install `google-auth-library` next to `@tanstack/ai-grok` for Application
 * Default Credentials. Or pass `authClient` or `getAccessToken`.
 */
export declare function grokVertexText<TModel extends GrokVertexChatModel>(model: TModel, config?: GrokVertexConfig): GrokTextAdapter<TModel, ResolveProviderOptions<TModel>, ResolveInputModalities<TModel>, readonly []>;
/**
 * Creates a Grok summarize adapter that talks to xAI Grok on Vertex AI.
 */
export declare function grokVertexSummarize<TModel extends GrokVertexChatModel>(model: TModel, config?: GrokVertexConfig): ChatStreamSummarizeAdapter<TModel, InferTextProviderOptions<GrokTextAdapter<TModel>>>;
