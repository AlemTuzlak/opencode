import { DebugOption } from '../../logger/types.js';
import { GenerationMiddleware } from '../middleware/types.js';
import { WorldAdapter } from './adapter.js';
import { StreamChunk, WorldGenerationResult } from '../../types.js';
/** The adapter kind this activity handles */
export declare const kind: "world";
/**
 * Extract provider options from a WorldAdapter via ~types.
 */
export type WorldProviderOptions<TAdapter> = TAdapter extends {
    '~types': {
        providerOptions: infer P extends object;
    };
} ? P : object;
/**
 * Options for the world generation activity.
 * The model is extracted from the adapter's model property.
 *
 * @template TAdapter - The world adapter type
 * @template TStream - Whether to stream the output
 *
 * @experimental World generation is an experimental feature and may change.
 */
export interface WorldActivityOptions<TAdapter extends WorldAdapter<string, WorldProviderOptions<TAdapter>>, TStream extends boolean = false> {
    /** The world adapter to use (must be created with a model) */
    adapter: TAdapter & {
        kind: typeof kind;
    };
    /** Natural-language description of the world or scene */
    prompt: string;
    /** Provider-specific options for world generation */
    modelOptions?: WorldProviderOptions<TAdapter>;
    /**
     * Whether to wrap the result as StreamChunks for SSE transport.
     * This is not the live video. When false or omitted, returns
     * Promise<WorldGenerationResult>.
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
     * Maximum wait for the mint or job poll, in milliseconds.
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
 * Result type for the world generation activity.
 * - If stream is true: AsyncIterable<StreamChunk>
 * - Otherwise: Promise<WorldGenerationResult>
 */
export type WorldActivityResult<TStream extends boolean = false> = TStream extends true ? AsyncIterable<StreamChunk> : Promise<WorldGenerationResult>;
/**
 * World generation activity. Live adapters mint a session token. Job
 * adapters return a viewer URL or an in-progress operation id.
 *
 * @example Mint a session token on the server
 * ```ts
 * import { generateWorld } from '@tanstack/ai'
 * import { reactorWorld } from '@tanstack/ai-reactor'
 *
 * const world = await generateWorld({
 *   adapter: reactorWorld('visko-orbis-stable'),
 *   prompt: 'A neon cyberpunk city at night, slow aerial drift',
 * })
 *
 * // Hand world.token, world.model, and world.prompt to the browser.
 * ```
 *
 * @experimental World generation is an experimental feature and may change.
 */
export declare function generateWorld<TAdapter extends WorldAdapter<string, WorldProviderOptions<TAdapter>>, TStream extends boolean = false>(options: WorldActivityOptions<TAdapter, TStream>): WorldActivityResult<TStream>;
/**
 * Create typed options for the generateWorld() function without executing.
 */
export declare function createWorldOptions<TAdapter extends WorldAdapter<string, WorldProviderOptions<TAdapter>>, TStream extends boolean = false>(options: WorldActivityOptions<TAdapter, TStream>): WorldActivityOptions<TAdapter, TStream>;
export type { WorldAdapter, WorldAdapterConfig, AnyWorldAdapter, } from './adapter.js';
export { BaseWorldAdapter } from './adapter.js';
