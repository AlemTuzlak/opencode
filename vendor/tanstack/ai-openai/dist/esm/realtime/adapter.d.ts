import { RealtimeAdapter } from '@tanstack/ai';
import { OpenAIRealtimeOptions } from './types.js';
/**
 * Creates an OpenAI realtime adapter for client-side use.
 *
 * Uses WebRTC for browser connections (default) or WebSocket for Node.js.
 *
 * @param options - Optional configuration
 * @returns A RealtimeAdapter for use with RealtimeClient
 *
 * @example
 * ```typescript
 * import { RealtimeClient } from '@tanstack/ai-client'
 * import { openaiRealtime } from '@tanstack/ai-openai'
 *
 * const client = new RealtimeClient({
 *   getToken: () => fetch('/api/realtime-token').then(r => r.json()),
 *   adapter: openaiRealtime(),
 * })
 * ```
 */
export declare function openaiRealtime(options?: OpenAIRealtimeOptions): RealtimeAdapter;
