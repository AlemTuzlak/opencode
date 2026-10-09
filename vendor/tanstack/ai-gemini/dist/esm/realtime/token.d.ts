import { RealtimeTokenAdapter } from '@tanstack/ai';
import { GeminiRealtimeTokenOptions } from './types.js';
/**
 * Creates a Google Gemini realtime token adapter.
 *
 * This adapter generates ephemeral tokens for client-side WebSocket connections.
 *
 * @param options - Configuration options for the realtime session
 * @returns A RealtimeTokenAdapter for use with realtimeToken()
 *
 * @example
 * ```typescript
 * import { realtimeToken } from '@tanstack/ai'
 * import { geminiRealtimeToken } from '@tanstack/ai-gemini'
 *
 * const token = await realtimeToken({
 *   adapter: geminiRealtimeToken({
 *     // Optional: constraint model config by token
 *     liveConnectConstraints: {
 *       model: 'gemini-3.8-live',
 *     },
 *   }),
 * })
 * ```
 */
export declare function geminiRealtimeToken(options?: GeminiRealtimeTokenOptions): RealtimeTokenAdapter;
