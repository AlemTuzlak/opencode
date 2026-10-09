import { default as OpenAI } from 'openai';
import { BaseTTSAdapter } from '@tanstack/ai/adapters';
import { TTSOptions, TTSResult } from '@tanstack/ai';
import { GroqTTSModel } from '../model-meta.js';
import { GroqTTSProviderOptions } from '../audio/tts-provider-options.js';
import { GroqClientConfig } from '../utils/client.js';
/**
 * Configuration for Groq TTS adapter
 */
export interface GroqTTSConfig extends GroqClientConfig {
}
/**
 * Groq Text-to-Speech Adapter
 *
 * Tree-shakeable adapter for Groq TTS functionality. Groq exposes an
 * OpenAI-compatible `/audio/speech` endpoint, so the adapter drives it with
 * the OpenAI SDK via a `baseURL` override (the same pattern as the Groq text
 * adapter).
 *
 * Supports `canopylabs/orpheus-v1-english` and
 * `canopylabs/orpheus-arabic-saudi`.
 *
 * Features:
 * - English voices: autumn(f), diana(f), hannah(f), austin(m), daniel(m), troy(m)
 * - Arabic voices: fahad(m), sultan(m), lulwa(f), noura(f)
 * - Output formats: flac, mp3, mulaw, ogg, wav (default wav)
 * - Speed control
 * - Configurable sample rate via `modelOptions`
 */
export declare class GroqTTSAdapter<TModel extends GroqTTSModel> extends BaseTTSAdapter<TModel, GroqTTSProviderOptions> {
    readonly name: "groq";
    protected client: OpenAI;
    constructor(config: GroqTTSConfig, model: TModel);
    generateSpeech(options: TTSOptions<GroqTTSProviderOptions>): Promise<TTSResult>;
    private getContentType;
}
/**
 * Creates a Groq speech adapter with explicit API key.
 * Type resolution happens here at the call site.
 *
 * @param model - The model name (e.g., 'canopylabs/orpheus-v1-english')
 * @param apiKey - Your Groq API key
 * @param config - Optional additional configuration
 * @returns Configured Groq speech adapter instance with resolved types
 *
 * @example
 * ```typescript
 * const adapter = createGroqSpeech('canopylabs/orpheus-v1-english', 'gsk_...')
 *
 * const result = await generateSpeech({
 *   adapter,
 *   text: 'Hello, world!',
 *   voice: 'autumn',
 * })
 * ```
 */
export declare function createGroqSpeech<TModel extends GroqTTSModel>(model: TModel, apiKey: string, config?: Omit<GroqTTSConfig, 'apiKey'>): GroqTTSAdapter<TModel>;
/**
 * Creates a Groq speech adapter with automatic API key detection from
 * environment variables.
 *
 * Looks for `GROQ_API_KEY` in the environment.
 *
 * @param model - The model name (e.g., 'canopylabs/orpheus-v1-english')
 * @param config - Optional configuration (excluding apiKey which is auto-detected)
 * @returns Configured Groq speech adapter instance with resolved types
 * @throws Error if GROQ_API_KEY is not found in environment
 *
 * @example
 * ```typescript
 * const adapter = groqSpeech('canopylabs/orpheus-v1-english')
 *
 * const result = await generateSpeech({
 *   adapter,
 *   text: 'Welcome to TanStack AI!',
 *   voice: 'autumn',
 *   format: 'wav',
 * })
 * ```
 */
export declare function groqSpeech<TModel extends GroqTTSModel>(model: TModel, config?: Omit<GroqTTSConfig, 'apiKey'>): GroqTTSAdapter<TModel>;
