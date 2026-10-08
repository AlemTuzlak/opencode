import { BaseTTSAdapter } from '@tanstack/ai/adapters';
import { TTSOptions, TTSResult } from '@tanstack/ai';
import { GrokTTSModel } from '../model-meta.js';
import { GrokTTSCodec, GrokTTSProviderOptions } from '../audio/tts-provider-options.js';
/**
 * Configuration for the Grok TTS adapter.
 *
 * Unlike chat/image/summarize adapters, TTS does not use the OpenAI SDK
 * because xAI's `/v1/tts` endpoint is not OpenAI-compatible. This config
 * is a minimal subset suitable for direct `fetch` calls.
 */
export interface GrokSpeechConfig {
    apiKey: string;
    baseURL?: string;
    /** Additional headers to merge into every request (e.g., test IDs). */
    defaultHeaders?: Record<string, string>;
}
/**
 * Grok Text-to-Speech Adapter.
 *
 * Talks to `POST {baseURL}/tts` per
 * https://docs.x.ai/developers/model-capabilities/audio/text-to-speech
 */
export declare class GrokSpeechAdapter<TModel extends GrokTTSModel> extends BaseTTSAdapter<TModel, GrokTTSProviderOptions> {
    readonly name: "grok";
    private readonly apiKey;
    private readonly baseURL;
    private readonly defaultHeaders;
    constructor(config: GrokSpeechConfig, model: TModel);
    generateSpeech(options: TTSOptions<GrokTTSProviderOptions>): Promise<TTSResult>;
}
/**
 * Build the JSON body for `POST /v1/tts`, resolving codec / sample-rate / voice
 * defaults in one place.
 *
 * Returns the request `body`, the resolved `codec`, and the `sampleRateForContentType`
 * used by the caller to label the response via `getContentType`.
 */
export declare function buildTTSRequestBody(options: {
    text: string;
    voice: string | undefined;
    format: TTSOptions['format'] | undefined;
    modelOptions: GrokTTSProviderOptions | undefined;
}): {
    body: Record<string, unknown>;
    codec: GrokTTSCodec;
    sampleRateForContentType: number;
};
export declare function getContentType(codec: GrokTTSCodec, sampleRate: number): string;
/**
 * Creates a Grok speech (TTS) adapter with an explicit API key.
 *
 * @example
 * ```typescript
 * const adapter = createGrokSpeech('grok-tts', 'xai-...')
 * const result = await generateSpeech({
 *   adapter,
 *   text: 'Hello from Grok',
 *   voice: 'eve',
 * })
 * ```
 */
export declare function createGrokSpeech<TModel extends GrokTTSModel>(model: TModel, apiKey: string, config?: Omit<GrokSpeechConfig, 'apiKey'>): GrokSpeechAdapter<TModel>;
/**
 * Creates a Grok speech (TTS) adapter, reading the API key from
 * `XAI_API_KEY` in the environment.
 *
 * @throws Error if `XAI_API_KEY` is not set.
 */
export declare function grokSpeech<TModel extends GrokTTSModel>(model: TModel, config?: Omit<GrokSpeechConfig, 'apiKey'>): GrokSpeechAdapter<TModel>;
