import { DebugOption } from '../../logger/types.js';
import { GenerationMiddleware } from '../middleware/types.js';
import { LiveVideoAdapter } from './adapter.js';
import { StreamChunk, LiveVideoGenerationResult } from '../../types.js';
/** The adapter kind this activity handles */
export declare const kind: "liveVideo";
/**
 * Extract provider options from a LiveVideoAdapter via ~types.
 */
export type LiveVideoProviderOptions<TAdapter> = TAdapter extends {
    '~types': {
        providerOptions: infer P extends object;
    };
} ? P : object;
/**
 * Options for the live generation activity.
 * The model is extracted from the adapter's model property.
 *
 * @template TAdapter - The live adapter type
 * @template TStream - Whether to stream the output
 *
 * @experimental Live generation is an experimental feature and may change.
 */
export interface LiveVideoActivityOptions<TAdapter extends LiveVideoAdapter<string, LiveVideoProviderOptions<TAdapter>>, TStream extends boolean = false> {
    /** The live adapter to use (must be created with a model) */
    adapter: TAdapter & {
        kind: typeof kind;
    };
    /** Natural-language description of the shot or scene */
    prompt: string;
    /** Provider-specific options for live generation */
    modelOptions?: LiveVideoProviderOptions<TAdapter>;
    /**
     * Whether to wrap the token result as StreamChunks for SSE transport.
     * This is not the live video. When false or omitted, returns
     * Promise<LiveVideoGenerationResult>.
     *
     * @default false
     */
    stream?: TStream;
    /**
     * Enable debug logging. Pass `true` to enable all categories, `false` to
     * silence everything including errors, or a `DebugConfig` object for granular
     * control and/or a custom `Logger`.
     */
    debug?: DebugOption;
    /**
     * Observe-only middleware notified on start, usage, success, and error. Pass
     * `otelMiddleware()` to emit OpenTelemetry spans, or implement the
     * `GenerationMiddleware` contract for a custom backend.
     */
    middleware?: Array<GenerationMiddleware>;
    /** Stable conversation/thread id for correlating this run when persisted. */
    threadId?: string;
    /** Stable run id for correlating this run when persisted. */
    runId?: string;
    /**
     * Maximum duration of the token mint in milliseconds.
     * No SDK-wide default. Composed with {@link abortSignal}; the first abort wins.
     */
    timeout?: number;
    /**
     * Caller cancellation signal (request disconnects, job/runtime cancellation).
     * Composed with {@link timeout} into an effective signal forwarded to the
     * adapter. Request-specific — not stored on global provider client config.
     */
    abortSignal?: AbortSignal;
}
/**
 * Result type for the live generation activity.
 * - If stream is true: AsyncIterable<StreamChunk>
 * - Otherwise: Promise<LiveVideoGenerationResult>
 */
export type LiveVideoActivityResult<TStream extends boolean = false> = TStream extends true ? AsyncIterable<StreamChunk> : Promise<LiveVideoGenerationResult>;
/**
 * Live generation activity - opens a live, prompt-steerable video session.
 *
 * @example Mint a session token on the server
 * ```ts
 * import { generateLiveVideo } from '@tanstack/ai'
 * import { reactorVideo } from '@tanstack/ai-reactor'
 *
 * const live = await generateLiveVideo({
 *   adapter: reactorVideo('helios'),
 *   prompt: 'A red sports car powerslides a mountain hairpin',
 * })
 *
 * // Hand live.token, live.model, and live.prompt to the browser.
 * ```
 *
 * @experimental Live generation is an experimental feature and may change.
 */
export declare function generateLiveVideo<TAdapter extends LiveVideoAdapter<string, LiveVideoProviderOptions<TAdapter>>, TStream extends boolean = false>(options: LiveVideoActivityOptions<TAdapter, TStream>): LiveVideoActivityResult<TStream>;
/**
 * Create typed options for the generateLiveVideo() function without executing.
 */
export declare function createLiveVideoOptions<TAdapter extends LiveVideoAdapter<string, LiveVideoProviderOptions<TAdapter>>, TStream extends boolean = false>(options: LiveVideoActivityOptions<TAdapter, TStream>): LiveVideoActivityOptions<TAdapter, TStream>;
export type { LiveVideoAdapter, LiveVideoAdapterConfig, AnyLiveVideoAdapter, } from './adapter.js';
export { BaseLiveVideoAdapter } from './adapter.js';
