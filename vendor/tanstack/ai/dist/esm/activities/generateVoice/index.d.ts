import { DebugOption } from '../../logger/types.js';
import { GenerationMiddleware } from '../middleware/types.js';
import { VoiceAdapter } from './adapter.js';
import { StreamChunk, VoiceResult } from '../../types.js';
/** The adapter kind this activity handles */
export declare const kind: "voice";
/**
 * Extract provider options from a VoiceAdapter via ~types.
 */
export type VoiceProviderOptions<TAdapter> = TAdapter extends {
    '~types': {
        providerOptions: infer P extends object;
    };
} ? P : object;
/**
 * Options for the voice activity.
 * The model is extracted from the adapter's model property.
 *
 * @template TAdapter - The voice adapter type
 * @template TStream - Whether to stream the output
 */
export interface VoiceActivityOptions<TAdapter extends VoiceAdapter<string, VoiceProviderOptions<TAdapter>>, TStream extends boolean = false> {
    /** The voice adapter to use (must be created with a model) */
    adapter: TAdapter & {
        kind: typeof kind;
    };
    /**
     * Text description of the voice to create, for design-capable models
     * (e.g. `'A warm, gravelly narrator in his sixties'`).
     */
    prompt?: string;
    /**
     * Reference audio of the speaker to clone, for clone-capable models.
     * Accepts a base64 string, base64 data URL, File, Blob, or ArrayBuffer.
     * Remote URLs are not accepted; read the file and pass the bytes.
     */
    referenceAudio?: string | File | Blob | ArrayBuffer;
    /**
     * Name to store the voice under in the provider's voice library. Check
     * `saved` on each returned voice to see whether it was actually persisted.
     */
    name?: string;
    /** Human-readable description stored alongside the voice */
    description?: string;
    /** Provider-specific options for voice creation */
    modelOptions?: VoiceProviderOptions<TAdapter>;
    /**
     * Whether to stream the generation result.
     * When true, returns an AsyncIterable<StreamChunk> for streaming transport.
     * When false or not provided, returns a Promise<VoiceResult>.
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
     * Maximum duration of this activity invocation in milliseconds.
     * No SDK-wide default — choose a value suitable for the provider and job.
     * Composed with {@link abortSignal}; the first abort wins.
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
 * Result type for the voice activity.
 * - If stream is true: AsyncIterable<StreamChunk>
 * - Otherwise: Promise<VoiceResult>
 */
export type VoiceActivityResult<TStream extends boolean = false> = TStream extends true ? AsyncIterable<StreamChunk> : Promise<VoiceResult>;
/**
 * Voice activity - creates a reusable voice.
 *
 * Providers create voices in one of two ways, and some support both: design a
 * new voice from a text description, or clone one from reference audio. Either
 * way the result carries voice ids you pass back to `generateSpeech()`.
 *
 * @example Design a voice from a description
 * ```ts
 * import { generateVoice, generateSpeech } from '@tanstack/ai'
 * import { elevenlabsVoiceDesign, elevenlabsSpeech } from '@tanstack/ai-elevenlabs'
 *
 * const designed = await generateVoice({
 *   adapter: elevenlabsVoiceDesign('eleven_ttv_v3'),
 *   prompt: 'A warm, gravelly narrator in his sixties with a slight Irish lilt',
 * })
 *
 * const [preview] = designed.voices
 * if (!preview) throw new Error('No voice candidates returned')
 *
 * const speech = await generateSpeech({
 *   adapter: elevenlabsSpeech('eleven_v4'),
 *   text: 'Once upon a time...',
 *   voice: preview.voiceId,
 * })
 * ```
 *
 * @example Save the voice to the provider's library
 * ```ts
 * const saved = await generateVoice({
 *   adapter: elevenlabsVoiceDesign('eleven_ttv_v3'),
 *   prompt: 'A bright, upbeat product demo host',
 *   name: 'Demo Host',
 *   description: 'Bright, upbeat, mid-30s',
 * })
 * ```
 */
export declare function generateVoice<TAdapter extends VoiceAdapter<string, VoiceProviderOptions<TAdapter>>, TStream extends boolean = false>(options: VoiceActivityOptions<TAdapter, TStream>): VoiceActivityResult<TStream>;
/**
 * Create typed options for the generateVoice() function without executing.
 */
export declare function createVoiceOptions<TAdapter extends VoiceAdapter<string, VoiceProviderOptions<TAdapter>>, TStream extends boolean = false>(options: VoiceActivityOptions<TAdapter, TStream>): VoiceActivityOptions<TAdapter, TStream>;
export type { VoiceAdapter, VoiceAdapterConfig, AnyVoiceAdapter, } from './adapter.js';
export { BaseVoiceAdapter } from './adapter.js';
