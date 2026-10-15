import { default as OpenAI } from 'openai';
import { BaseTranscriptionAdapter } from '@tanstack/ai/adapters';
import { TranscriptionOptions, TranscriptionResult } from '@tanstack/ai';
import { OpenAITranscriptionModel } from '../model-meta.js';
import { OpenAITranscriptionProviderOptions, OpenAITranscriptionResponseFormat } from '../audio/transcription-provider-options.js';
import { OpenAIClientConfig } from '../utils/client.js';
/**
 * Configuration for OpenAI Transcription adapter
 */
export interface OpenAITranscriptionConfig extends OpenAIClientConfig {
}
/**
 * OpenAI Transcription (Speech-to-Text) Adapter
 *
 * Tree-shakeable adapter for OpenAI audio transcription functionality.
 * Supports whisper-1, gpt-4o-transcribe, gpt-4o-mini-transcribe, and gpt-4o-transcribe-diarize.
 *
 * Features:
 * - Multiple transcription models with different capabilities
 * - Language detection or specification
 * - Multiple output formats: json, text, srt, verbose_json, vtt, diarized_json
 * - Word and segment-level timestamps (with verbose_json — whisper-1 only;
 *   gpt-4o-transcribe and gpt-4o-mini-transcribe accept only json/text and
 *   reject verbose_json with HTTP 400)
 * - Speaker diarization (with gpt-4o-transcribe-diarize, which accepts json,
 *   text, and diarized_json)
 */
export declare class OpenAITranscriptionAdapter<TModel extends OpenAITranscriptionModel> extends BaseTranscriptionAdapter<TModel, OpenAITranscriptionProviderOptions> {
    readonly name: "openai";
    protected client: OpenAI;
    constructor(config: OpenAITranscriptionConfig, model: TModel);
    transcribe(options: TranscriptionOptions<OpenAITranscriptionProviderOptions>): Promise<TranscriptionResult>;
    private buildTranscriptionRequest;
    private resolveResponseMode;
    protected prepareAudioFile(audio: string | File | Blob | ArrayBuffer): File;
    private ensureFileSupport;
    private validateDiarizationOptions;
    protected mapResponseFormat(format?: OpenAITranscriptionResponseFormat): OpenAITranscriptionResponseFormat;
}
/**
 * Creates an OpenAI transcription adapter with explicit API key.
 * Type resolution happens here at the call site.
 *
 * @param model - The model name (e.g., 'whisper-1')
 * @param apiKey - Your OpenAI API key
 * @param config - Optional additional configuration
 * @returns Configured OpenAI transcription adapter instance with resolved types
 *
 * @example
 * ```typescript
 * const adapter = createOpenaiTranscription('whisper-1', "sk-...");
 *
 * const result = await generateTranscription({
 *   adapter,
 *   audio: audioFile,
 *   language: 'en'
 * });
 * ```
 */
export declare function createOpenaiTranscription<TModel extends OpenAITranscriptionModel>(model: TModel, apiKey: string, config?: Omit<OpenAITranscriptionConfig, 'apiKey'>): OpenAITranscriptionAdapter<TModel>;
/**
 * Creates an OpenAI transcription adapter with automatic API key detection from environment variables.
 * Type resolution happens here at the call site.
 *
 * Looks for `OPENAI_API_KEY` in:
 * - `process.env` (Node.js)
 * - `window.env` (Browser with injected env)
 *
 * @param model - The model name (e.g., 'whisper-1')
 * @param config - Optional configuration (excluding apiKey which is auto-detected)
 * @returns Configured OpenAI transcription adapter instance with resolved types
 * @throws Error if OPENAI_API_KEY is not found in environment
 *
 * @example
 * ```typescript
 * // Automatically uses OPENAI_API_KEY from environment
 * const adapter = openaiTranscription('whisper-1');
 *
 * const result = await generateTranscription({
 *   adapter,
 *   audio: audioFile
 * });
 *
 * console.log(result.text)
 * ```
 */
export declare function openaiTranscription<TModel extends OpenAITranscriptionModel>(model: TModel, config?: Omit<OpenAITranscriptionConfig, 'apiKey'>): OpenAITranscriptionAdapter<TModel>;
