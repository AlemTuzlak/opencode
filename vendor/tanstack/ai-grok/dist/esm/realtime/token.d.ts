import { RealtimeTokenAdapter } from '@tanstack/ai';
import { GrokRealtimeTokenOptions } from './types.js';
/**
 * Creates a Grok realtime token adapter.
 *
 * Generates ephemeral client secrets for browser-side WebRTC connections to
 * the xAI Voice Agent API.
 *
 * @param options - Configuration options for the realtime session.
 * @returns A RealtimeTokenAdapter for use with `realtimeToken()`.
 *
 * @example
 * ```typescript
 * import { realtimeToken } from '@tanstack/ai'
 * import { grokRealtimeToken } from '@tanstack/ai-grok'
 *
 * const token = await realtimeToken({
 *   adapter: grokRealtimeToken({ model: 'grok-voice-think-fast-2.0' }),
 * })
 * ```
 */
export declare function grokRealtimeToken(options?: GrokRealtimeTokenOptions): RealtimeTokenAdapter;
