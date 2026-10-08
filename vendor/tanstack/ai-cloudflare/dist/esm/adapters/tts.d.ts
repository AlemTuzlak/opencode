import { BaseTTSAdapter } from '@tanstack/ai/adapters';
import { TTSOptions, TTSResult } from '@tanstack/ai';
import { CloudflareConfig, CloudflareConfigInput } from '../utils/config.js';
import { CloudflareTTSModel } from '../utils/models.js';
/** Text-to-speech inputs forwarded to the model (Deepgram Aura fields). */
export interface CloudflareTTSProviderOptions {
    speaker?: string;
    encoding?: 'linear16' | 'flac' | 'mulaw' | 'alaw' | 'mp3' | 'opus' | 'aac';
    container?: 'none' | 'wav' | 'ogg';
    sample_rate?: number;
    bit_rate?: number;
    [key: string]: unknown;
}
/**
 * Cloudflare text-to-speech adapter for Workers AI models such as Deepgram
 * Aura. `voice` maps to `speaker` and `format` to `encoding`; the audio comes
 * back base64-encoded.
 */
export declare class CloudflareTTSAdapter<TModel extends CloudflareTTSModel> extends BaseTTSAdapter<TModel, CloudflareTTSProviderOptions> {
    private readonly cfConfig;
    readonly name: "cloudflare";
    constructor(cfConfig: CloudflareConfig, model: TModel);
    generateSpeech(options: TTSOptions<CloudflareTTSProviderOptions>): Promise<TTSResult>;
}
export declare function createCloudflareTTS<TModel extends CloudflareTTSModel>(model: TModel, config: CloudflareConfig): CloudflareTTSAdapter<TModel>;
export declare function cloudflareTTS<TModel extends CloudflareTTSModel>(model: TModel, config?: CloudflareConfigInput): CloudflareTTSAdapter<TModel>;
