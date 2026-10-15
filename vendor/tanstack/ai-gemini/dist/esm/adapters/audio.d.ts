import { BaseAudioAdapter } from '@tanstack/ai/adapters';
import { GEMINI_AUDIO_MODELS } from '../model-meta.js';
import { AudioGenerationOptions, AudioGenerationResult } from '@tanstack/ai';
import { GeminiClientConfig } from '../utils/client.js';
/**
 * Provider options for Gemini Lyria music generation.
 *
 * Notes on the Lyria 3 surface area:
 * - `lyria-3-clip-preview` always returns MP3 (30-second clips). It does
 *   not accept `responseMimeType`, and duration is fixed at 30 seconds —
 *   the generic `duration` option on `AudioActivityOptions` is ignored.
 * - `lyria-3-pro-preview` returns MP3 by default. Duration is controlled
 *   via the natural-language prompt, not a separate SDK field, so the
 *   generic `duration` option is similarly ignored.
 * - `negativePrompt` is NOT accepted by `GenerateContentConfig` and has
 *   therefore been removed from this surface to avoid giving callers a
 *   silently-dropped knob.
 *
 * @see https://ai.google.dev/gemini-api/docs/music-generation
 */
export interface GeminiAudioProviderOptions {
    /**
     * Seed for deterministic generation.
     */
    seed?: number;
}
export interface GeminiAudioConfig extends GeminiClientConfig {
}
/** Model type for Gemini Lyria audio generation */
export type GeminiAudioModel = (typeof GEMINI_AUDIO_MODELS)[number];
/**
 * Gemini Lyria Music Generation Adapter.
 *
 * Tree-shakeable adapter for Google Lyria music generation via the Gemini API.
 *
 * Models:
 * - `lyria-3-pro-preview` — flagship model, full-length songs with verses,
 *   choruses, and bridges. Outputs MP3 or WAV at 48 kHz stereo.
 * - `lyria-3-clip-preview` — 30-second clips in MP3.
 *
 * @see https://ai.google.dev/gemini-api/docs/music-generation
 *
 * @example
 * ```typescript
 * const adapter = geminiAudio('lyria-3-pro-preview')
 * const result = await generateAudio({
 *   adapter,
 *   prompt: 'An upbeat jazz track with saxophone and drums',
 * })
 * ```
 */
export declare class GeminiAudioAdapter<TModel extends GeminiAudioModel> extends BaseAudioAdapter<TModel, GeminiAudioProviderOptions> {
    readonly name: "gemini";
    private readonly client;
    constructor(config: GeminiAudioConfig, model: TModel);
    generateAudio(options: AudioGenerationOptions<GeminiAudioProviderOptions>): Promise<AudioGenerationResult>;
}
/**
 * Creates a Gemini Lyria audio adapter with an explicit API key.
 *
 * @param model - The Lyria model name (e.g., 'lyria-3-pro-preview')
 * @param apiKey - Your Google API key
 * @param config - Optional additional configuration
 *
 * @example
 * ```typescript
 * const adapter = createGeminiAudio('lyria-3-pro-preview', 'your-api-key')
 * const result = await generateAudio({
 *   adapter,
 *   prompt: 'Ambient electronic music with soft pads',
 * })
 * ```
 */
export declare function createGeminiAudio<TModel extends GeminiAudioModel>(model: TModel, apiKey: string, config?: Omit<GeminiAudioConfig, 'apiKey'>): GeminiAudioAdapter<TModel>;
/**
 * Creates a Gemini Lyria audio adapter with automatic API key detection.
 *
 * Looks for `GOOGLE_API_KEY` or `GEMINI_API_KEY` in the environment.
 *
 * @param model - The Lyria model name (e.g., 'lyria-3-pro-preview')
 * @param config - Optional configuration (excluding apiKey)
 *
 * @example
 * ```typescript
 * const adapter = geminiAudio('lyria-3-pro-preview')
 * const result = await generateAudio({
 *   adapter,
 *   prompt: 'An orchestral piece with strings and brass',
 * })
 * ```
 */
export declare function geminiAudio<TModel extends GeminiAudioModel>(model: TModel, config?: Omit<GeminiAudioConfig, 'apiKey'>): GeminiAudioAdapter<TModel>;
