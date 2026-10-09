import { RealtimeAdapter } from '@tanstack/ai';
import { GeminiRealtimeOptions } from './types.js';
/**
 * Creates a Gemini realtime adapter for client-side use.
 *
 * @param options - Optional configuration
 * @returns A RealtimeAdapter for use with RealtimeClient
 *
 * @example
 * ```typescript
 * import { RealtimeClient } from '@tanstack/ai-client'
 * import { geminiRealtime } from '@tanstack/ai-gemini'
 *
 * const client = new RealtimeClient({
 *   getToken: () => fetch('/api/realtime-token').then(r => r.json()),
 *   adapter: geminiRealtime(),
 *   onGoAway: () => client.updateSession({ ... }) // Resume session with new config (available only for Gemini Live adapter)
 * })
 *
 * ```
 */
export declare function geminiRealtime(options?: GeminiRealtimeOptions): RealtimeAdapter;
