import { RealtimeToken, RealtimeTokenAdapter } from '@tanstack/ai';
import { OpenAIRealtimeClientSecretResponse, OpenAIRealtimeModel, OpenAIRealtimeTokenOptions } from './types.js';
/**
 * Builds the GA `/v1/realtime/client_secrets` request body.
 *
 * The session config (including its required `type`) is nested under the
 * `session` key. The model is bound to the resulting ephemeral key, so the
 * client never sends it during the WebRTC SDP exchange.
 */
export declare function buildClientSecretRequest(model: OpenAIRealtimeModel): Record<string, unknown>;
/**
 * Parses the GA client secret response into a {@link RealtimeToken}.
 *
 * GA returns the ephemeral key at the top level (`value` / `expires_at`),
 * not nested under `client_secret` like the retired Beta
 * `/v1/realtime/sessions` response did.
 */
export declare function parseClientSecretResponse(data: Partial<OpenAIRealtimeClientSecretResponse> | undefined, fallbackModel: OpenAIRealtimeModel): RealtimeToken;
/**
 * Creates an OpenAI realtime token adapter.
 *
 * This adapter generates ephemeral keys for client-side WebRTC connections
 * via the GA `/v1/realtime/client_secrets` endpoint. The key is valid for
 * 10 minutes by default.
 *
 * @param options - Configuration options for the realtime session
 * @returns A RealtimeTokenAdapter for use with realtimeToken()
 *
 * @example
 * ```typescript
 * import { realtimeToken } from '@tanstack/ai'
 * import { openaiRealtimeToken } from '@tanstack/ai-openai'
 *
 * const token = await realtimeToken({
 *   adapter: openaiRealtimeToken({ model: 'gpt-realtime-2.1' }),
 * })
 * ```
 */
export declare function openaiRealtimeToken(options?: OpenAIRealtimeTokenOptions): RealtimeTokenAdapter;
