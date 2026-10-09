import { BaseTranscriptionAdapter } from '@tanstack/ai/adapters';
import { TranscriptionOptions, TranscriptionResult } from '@tanstack/ai';
import { GroqTranscriptionModel } from '../model-meta.js';
import { GroqTranscriptionProviderOptions } from '../audio/transcription-provider-options.js';
import { GroqClientConfig } from '../utils/client.js';
/**
 * Configuration for the Groq Transcription adapter.
 */
export interface GroqTranscriptionConfig extends GroqClientConfig {
}
/**
 * Groq Transcription (Speech-to-Text) Adapter
 *
 * Tree-shakeable adapter for Groq audio transcription. Supports
 * whisper-large-v3 and whisper-large-v3-turbo.
 *
 * Features:
 * - Audio file uploads (File, Blob, ArrayBuffer, base64/data URL)
 * - Remote audio URLs passed directly via Groq's `url` field — no upload needed
 * - Verbose JSON response with segment and word timestamps
 * - Language detection or specification (ISO-639-1)
 * - Confidence scores derived from segment avg_logprob
 */
export declare class GroqTranscriptionAdapter<TModel extends GroqTranscriptionModel> extends BaseTranscriptionAdapter<TModel, GroqTranscriptionProviderOptions> {
    readonly name: "groq";
    private readonly apiKey;
    private readonly baseURL;
    private readonly defaultHeaders;
    constructor(config: GroqTranscriptionConfig, model: TModel);
    transcribe(options: TranscriptionOptions<GroqTranscriptionProviderOptions>): Promise<TranscriptionResult>;
    private prepareAudioFile;
    private ensureFileSupport;
}
/**
 * Creates a Groq transcription adapter with an explicit API key.
 * Type resolution happens here at the call site.
 *
 * @param model - The model name (e.g., 'whisper-large-v3-turbo')
 * @param apiKey - Your Groq API key
 * @param config - Optional additional configuration
 * @returns Configured Groq transcription adapter instance
 *
 * @example
 * ```typescript
 * const adapter = createGroqTranscription('whisper-large-v3-turbo', 'gsk_...');
 *
 * const result = await generateTranscription({
 *   adapter,
 *   audio: audioFile,
 *   language: 'en',
 * });
 * ```
 */
export declare function createGroqTranscription<TModel extends GroqTranscriptionModel>(model: TModel, apiKey: string, config?: Omit<GroqTranscriptionConfig, 'apiKey'>): GroqTranscriptionAdapter<TModel>;
/**
 * Creates a Groq transcription adapter using the `GROQ_API_KEY` environment
 * variable. Type resolution happens here at the call site.
 *
 * Looks for `GROQ_API_KEY` in:
 * - `process.env` (Node.js)
 * - `window.env` (browser with injected env)
 *
 * @param model - The model name (e.g., 'whisper-large-v3-turbo')
 * @param config - Optional configuration (excluding apiKey which is auto-detected)
 * @returns Configured Groq transcription adapter instance
 * @throws Error if GROQ_API_KEY is not found in environment
 *
 * @example
 * ```typescript
 * const adapter = groqTranscription('whisper-large-v3-turbo');
 *
 * const result = await generateTranscription({
 *   adapter,
 *   audio: 'https://example.com/audio.mp3',
 * });
 *
 * console.log(result.text)
 * ```
 */
export declare function groqTranscription<TModel extends GroqTranscriptionModel>(model: TModel, config?: Omit<GroqTranscriptionConfig, 'apiKey'>): GroqTranscriptionAdapter<TModel>;
