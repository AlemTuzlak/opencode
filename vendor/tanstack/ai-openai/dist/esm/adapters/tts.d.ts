import { default as OpenAI } from 'openai';
import { BaseTTSAdapter } from '@tanstack/ai/adapters';
import { TTSOptions, TTSResult } from '@tanstack/ai';
import { OpenAITTSModel } from '../model-meta.js';
import { OpenAITTSProviderOptions } from '../audio/tts-provider-options.js';
import { OpenAIClientConfig } from '../utils/client.js';
/**
 * Configuration for OpenAI TTS adapter
 */
export interface OpenAITTSConfig extends OpenAIClientConfig {
}
/**
 * OpenAI Text-to-Speech Adapter
 *
 * Tree-shakeable adapter for OpenAI TTS functionality.
 * Supports tts-1, tts-1-hd, and gpt-4o-audio-preview models.
 *
 * Features:
 * - Multiple voice options: alloy, ash, ballad, coral, echo, fable, onyx, nova, sage, shimmer, verse
 * - Multiple output formats: mp3, opus, aac, flac, wav, pcm
 * - Speed control (0.25 to 4.0)
 */
export declare class OpenAITTSAdapter<TModel extends OpenAITTSModel> extends BaseTTSAdapter<TModel, OpenAITTSProviderOptions> {
    readonly name: "openai";
    protected client: OpenAI;
    constructor(config: OpenAITTSConfig, model: TModel);
    generateSpeech(options: TTSOptions<OpenAITTSProviderOptions>): Promise<TTSResult>;
}
/**
 * Creates an OpenAI speech adapter with explicit API key.
 * Type resolution happens here at the call site.
 *
 * @param model - The model name (e.g., 'tts-1', 'tts-1-hd')
 * @param apiKey - Your OpenAI API key
 * @param config - Optional additional configuration
 * @returns Configured OpenAI speech adapter instance with resolved types
 *
 * @example
 * ```typescript
 * const adapter = createOpenaiSpeech('tts-1-hd', "sk-...");
 *
 * const result = await generateSpeech({
 *   adapter,
 *   text: 'Hello, world!',
 *   voice: 'nova'
 * });
 * ```
 */
export declare function createOpenaiSpeech<TModel extends OpenAITTSModel>(model: TModel, apiKey: string, config?: Omit<OpenAITTSConfig, 'apiKey'>): OpenAITTSAdapter<TModel>;
/**
 * Creates an OpenAI speech adapter with automatic API key detection from environment variables.
 * Type resolution happens here at the call site.
 *
 * Looks for `OPENAI_API_KEY` in:
 * - `process.env` (Node.js)
 * - `window.env` (Browser with injected env)
 *
 * @param model - The model name (e.g., 'tts-1', 'tts-1-hd')
 * @param config - Optional configuration (excluding apiKey which is auto-detected)
 * @returns Configured OpenAI speech adapter instance with resolved types
 * @throws Error if OPENAI_API_KEY is not found in environment
 *
 * @example
 * ```typescript
 * // Automatically uses OPENAI_API_KEY from environment
 * const adapter = openaiSpeech('tts-1');
 *
 * const result = await generateSpeech({
 *   adapter,
 *   text: 'Welcome to TanStack AI!',
 *   voice: 'alloy',
 *   format: 'mp3'
 * });
 * ```
 */
export declare function openaiSpeech<TModel extends OpenAITTSModel>(model: TModel, config?: Omit<OpenAITTSConfig, 'apiKey'>): OpenAITTSAdapter<TModel>;
