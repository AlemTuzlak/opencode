import { BaseTranscriptionAdapter } from '@tanstack/ai/adapters';
import { TranscriptionOptions, TranscriptionResult } from '@tanstack/ai';
import { CloudflareConfig, CloudflareConfigInput } from '../utils/config.js';
import { CloudflareTranscriptionModel } from '../utils/models.js';
/** Extra inputs forwarded to the transcription model (model specific). */
export type CloudflareTranscriptionProviderOptions = Record<string, unknown>;
/**
 * Cloudflare transcription adapter. Whisper models take base64 audio in the
 * `audio` input; Deepgram Nova takes the raw bytes. Both return text plus
 * timed words, and Whisper also returns segments.
 */
export declare class CloudflareTranscriptionAdapter<TModel extends CloudflareTranscriptionModel> extends BaseTranscriptionAdapter<TModel, CloudflareTranscriptionProviderOptions> {
    private readonly cfConfig;
    readonly name: "cloudflare";
    constructor(cfConfig: CloudflareConfig, model: TModel);
    transcribe(options: TranscriptionOptions<CloudflareTranscriptionProviderOptions>): Promise<TranscriptionResult>;
    private runWhisper;
    private runNova;
}
export declare function createCloudflareTranscription<TModel extends CloudflareTranscriptionModel>(model: TModel, config: CloudflareConfig): CloudflareTranscriptionAdapter<TModel>;
export declare function cloudflareTranscription<TModel extends CloudflareTranscriptionModel>(model: TModel, config?: CloudflareConfigInput): CloudflareTranscriptionAdapter<TModel>;
