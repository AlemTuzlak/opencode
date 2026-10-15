import { MistralTextAdapter } from '../adapters/text.js';
import { MistralVertexChatModel } from '../model-meta.js';
import { MistralVertexConfig } from './auth.js';
export { MistralVertexAuthError, resolveMistralVertexAccessToken, resolveMistralVertexLocation, resolveMistralVertexModelUrl, resolveMistralVertexProject, type MistralVertexConfig, type VertexAuthClient, } from './auth.js';
export { MISTRAL_VERTEX_CHAT_MODELS, type MistralVertexChatModel, } from '../model-meta.js';
/**
 * Creates a Mistral chat adapter that talks to Mistral on Vertex AI.
 *
 * Install `google-auth-library` next to `@tanstack/ai-mistral` for
 * Application Default Credentials. Or pass `authClient` or `getAccessToken`.
 */
export declare function mistralVertexText<TModel extends MistralVertexChatModel>(model: TModel, config?: MistralVertexConfig): MistralTextAdapter<TModel>;
