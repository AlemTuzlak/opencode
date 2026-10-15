import { RealtimeAdapter } from '@tanstack/ai';
import { GrokRealtimeOptions } from './types.js';
/**
 * Creates a Grok realtime adapter for client-side use.
 *
 * Uses WebRTC for browser connections (default). Mirrors the OpenAI realtime
 * adapter because xAI's Voice Agent API is OpenAI-realtime-compatible — the
 * only differences are the endpoint URL and default model.
 *
 * @example
 * ```typescript
 * import { RealtimeClient } from '@tanstack/ai-client'
 * import { grokRealtime } from '@tanstack/ai-grok'
 *
 * const client = new RealtimeClient({
 *   getToken: () => fetch('/api/realtime-token').then(r => r.json()),
 *   adapter: grokRealtime(),
 * })
 * ```
 */
export declare function grokRealtime(options?: GrokRealtimeOptions): RealtimeAdapter;
