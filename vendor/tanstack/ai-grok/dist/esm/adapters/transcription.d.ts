import { BaseTranscriptionAdapter } from '@tanstack/ai/adapters';
import { TranscriptionOptions, TranscriptionResult, TranscriptionWord } from '@tanstack/ai';
import { GrokTranscriptionModel } from '../model-meta.js';
import { GrokTranscriptionProviderOptions } from '../audio/transcription-provider-options.js';
/**
 * Grok-specific extension of `TranscriptionWord` that surfaces the extra
 * fields xAI returns when diarization / confidence are enabled. The base
 * cross-provider `TranscriptionWord` contract doesn't include these, so
 * callers who know they're using Grok can narrow with:
 *
 * ```ts
 * const words = result.words as Array<GrokTranscriptionWord> | undefined
 * ```
 */
export interface GrokTranscriptionWord extends TranscriptionWord {
    /** Model confidence for the word, when xAI returns one. */
    confidence?: number;
    /** Speaker index, populated when `modelOptions.diarize === true`. */
    speaker?: number;
}
/**
 * Configuration for the Grok transcription adapter.
 *
 * Uses direct `fetch` rather than the OpenAI SDK because xAI's `/v1/stt`
 * endpoint is not OpenAI-compatible.
 */
export interface GrokTranscriptionConfig {
    apiKey: string;
    baseURL?: string;
    /** Additional headers to merge into every request (e.g., test IDs). */
    defaultHeaders?: Record<string, string>;
}
/**
 * Grok Speech-to-Text Adapter.
 *
 * Talks to `POST {baseURL}/stt` per
 * https://docs.x.ai/developers/rest-api-reference/inference/voice
 */
export declare class GrokTranscriptionAdapter<TModel extends GrokTranscriptionModel> extends BaseTranscriptionAdapter<TModel, GrokTranscriptionProviderOptions> {
    readonly name: "grok";
    private readonly apiKey;
    private readonly baseURL;
    private readonly defaultHeaders;
    constructor(config: GrokTranscriptionConfig, model: TModel);
    transcribe(options: TranscriptionOptions<GrokTranscriptionProviderOptions>): Promise<TranscriptionResult>;
}
/**
 * Build the multipart/form-data body for `POST /v1/stt`, coercing SDK-level
 * model options into xAI's wire format (booleans as `'true'`/`'false'`
 * strings, numeric fields stringified, etc.).
 *
 * Wire-field mapping:
 *   - `modelOptions.inverse_text_normalization` → `format` (xAI's chosen
 *     wire-field name for the ITN boolean; the SDK surfaces it under the
 *     clearer `inverse_text_normalization` key).
 *   - `modelOptions.audio_format`, `sample_rate`, `multichannel`, `channels`,
 *     `diarize` map to same-named form fields.
 */
export declare function buildTranscriptionFormData(options: {
    file: File;
    language: string | undefined;
    modelOptions: GrokTranscriptionProviderOptions | undefined;
}): FormData;
/**
 * Creates a Grok transcription adapter with an explicit API key.
 *
 * @example
 * ```typescript
 * const adapter = createGrokTranscription('grok-stt', 'xai-...')
 * const result = await generateTranscription({
 *   adapter,
 *   audio: audioFile,
 *   language: 'en',
 * })
 * ```
 */
export declare function createGrokTranscription<TModel extends GrokTranscriptionModel>(model: TModel, apiKey: string, config?: Omit<GrokTranscriptionConfig, 'apiKey'>): GrokTranscriptionAdapter<TModel>;
/**
 * Creates a Grok transcription adapter, reading the API key from
 * `XAI_API_KEY` in the environment.
 *
 * @throws Error if `XAI_API_KEY` is not set.
 */
export declare function grokTranscription<TModel extends GrokTranscriptionModel>(model: TModel, config?: Omit<GrokTranscriptionConfig, 'apiKey'>): GrokTranscriptionAdapter<TModel>;
