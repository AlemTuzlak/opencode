import { ResolvedPromptCache } from '@tanstack/ai';
import { ChatRequest } from '@openrouter/sdk/models';
type OpenRouterChatRequest = Omit<ChatRequest, 'stream'>;
/**
 * Add the automatic prompt cache fields for `chat({ promptCache })` to an
 * OpenRouter chat request.
 *
 * - The cache key becomes `sessionId` on every model, so OpenRouter sends the
 *   requests of one session to the same provider. A `sessionId` from
 *   `modelOptions` wins.
 * - Only `anthropic/*` models get cache markers, and only when the request
 *   has no manual marker (system prompt, tool, or content block). Then the
 *   system message, the last function tool, and the last message each get a
 *   marker on their last text block.
 *
 * `'none'` returns the request with no change. `'long'` asks for the 1-hour
 * TTL. The function returns a new request and does not change `request`.
 */
export declare function addPromptCacheMarkers(request: OpenRouterChatRequest, promptCache: ResolvedPromptCache): OpenRouterChatRequest;
export {};
