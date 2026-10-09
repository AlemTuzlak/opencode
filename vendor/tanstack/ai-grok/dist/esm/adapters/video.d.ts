import { BaseVideoAdapter, DurationOptions } from '@tanstack/ai/adapters';
import { VideoGenerationOptions, VideoJobResult, VideoStatusResult, VideoUrlResult } from '@tanstack/ai';
import { GrokVideoModel } from '../model-meta.js';
import { GrokVideoModelDurationByName, GrokVideoModelInputModalitiesByName, GrokVideoModelProviderOptionsByName, GrokVideoModelSizeByName } from '../video/video-provider-options.js';
import { GrokClientConfig } from '../utils/client.js';
/**
 * Configuration for Grok video adapter.
 *
 * @experimental Video generation is an experimental feature and may change.
 */
export interface GrokVideoConfig extends GrokClientConfig {
}
/**
 * Grok Video Generation Adapter (xAI Imagine API)
 *
 * Tree-shakeable adapter for the grok-imagine video models using the
 * async jobs/polling architecture: create a generation request, poll it,
 * then read the completed video URL.
 *
 * Both models support text-to-video and image-to-video;
 * `grok-imagine-video-1.5` is xAI's documented default and adds native
 * 1080p generation plus reference-to-video inputs. Source-video edit
 * and extend are `grok-imagine-video` only.
 *
 * The Imagine video endpoints are not part of the OpenAI SDK surface (and
 * xAI rejects the SDK's multipart paths), so requests are plain JSON calls
 * issued with the configured `fetch` (or the global one).
 *
 * @experimental Video generation is an experimental feature and may change.
 *
 * Features:
 * - Async job-based video generation (1–15 second clips with audio)
 * - Aspect-ratio sizing via the "aspectRatio_resolution" size template
 *   (e.g. '16:9_720p'), consistent with the grok-imagine image models
 * - Image-to-video via an `image` prompt part (starting frame URL or data URI)
 * - Reference-to-video via image prompt parts with
 *   `metadata.role: 'reference'` or `'character'` (→ `reference_images`)
 *   and preset voices via `modelOptions.reference_audios`
 *   (grok-imagine-video-1.5 only)
 * - Video editing / extension on `grok-imagine-video` via a source
 *   `video` prompt part and `modelOptions.mode: 'edit' | 'extend'`
 *   (`/v1/videos/edits` / `/v1/videos/extensions`; in extend mode
 *   `duration` is the added tail)
 * - Usage reporting: billed seconds (`usage.billed`) and exact cost
 */
export declare class GrokVideoAdapter<TModel extends GrokVideoModel> extends BaseVideoAdapter<TModel, GrokVideoModelProviderOptionsByName[TModel], GrokVideoModelProviderOptionsByName, GrokVideoModelSizeByName, GrokVideoModelInputModalitiesByName, GrokVideoModelDurationByName> {
    readonly name: "grok";
    private readonly clientConfig;
    constructor(config: GrokVideoConfig, model: TModel);
    private request;
    /**
     * Reads the error message out of an Imagine API error body
     * (`{"code": "...", "error": "..."}`), falling back to the raw text.
     */
    private errorMessage;
    createVideoJob(options: VideoGenerationOptions<GrokVideoModelProviderOptionsByName[TModel], GrokVideoModelSizeByName[TModel], GrokVideoModelDurationByName[TModel]>): Promise<VideoJobResult>;
    /**
     * Build and post an edit / extension request. Both endpoints take only
     * `model`, `prompt`, and the source `video` (plus `duration` — the length
     * of the added tail — for extensions): output geometry is inherited from
     * the source clip, capped at 720p, and edit outputs also inherit the
     * source length. Rather than sending fields the API documents as ignored,
     * the inapplicable options are rejected with actionable errors.
     */
    private createSourceVideoJob;
    /**
     * POST a create-job request body to one of the Imagine video endpoints
     * (`/videos/generations`, `/videos/edits`, `/videos/extensions`) and read
     * the `request_id` out of the shared response shape.
     */
    private postVideoJob;
    private retrieveJob;
    getVideoStatus(jobId: string): Promise<VideoStatusResult>;
    getVideo(jobId: string): Promise<VideoUrlResult>;
    /**
     * Maps Imagine API job statuses onto the generic video status set. The
     * API reports 'pending' while queued/generating (with a numeric
     * `progress`), then a terminal 'done' / 'failed' / 'expired'.
     */
    protected mapStatus(apiStatus: string | undefined): 'pending' | 'processing' | 'completed' | 'failed';
    /**
     * Both grok-imagine video models accept a continuous 1–15 integer-second
     * range. Consumers can use this to render UI without provider knowledge.
     */
    availableDurations(): DurationOptions<GrokVideoModelDurationByName[TModel]>;
}
/**
 * Creates a Grok video adapter with an explicit API key.
 * Type resolution happens here at the call site.
 *
 * @experimental Video generation is an experimental feature and may change.
 *
 * @param model - The model name (e.g., 'grok-imagine-video-1.5')
 * @param apiKey - Your xAI API key
 * @param config - Optional additional configuration
 * @returns Configured Grok video adapter instance with resolved types
 *
 * @example
 * ```typescript
 * const adapter = createGrokVideo('grok-imagine-video-1.5', 'xai-...');
 *
 * const { jobId } = await generateVideo({
 *   adapter,
 *   prompt: 'A beautiful sunset over the ocean',
 *   size: '16:9_720p',
 *   duration: 5
 * });
 * ```
 */
export declare function createGrokVideo<TModel extends GrokVideoModel>(model: TModel, apiKey: string, config?: Omit<GrokVideoConfig, 'apiKey'>): GrokVideoAdapter<TModel>;
/**
 * Creates a Grok video adapter with automatic API key detection from environment variables.
 * Type resolution happens here at the call site.
 *
 * Looks for `XAI_API_KEY` in:
 * - `process.env` (Node.js)
 * - `window.env` (Browser with injected env)
 *
 * @experimental Video generation is an experimental feature and may change.
 *
 * @param model - The model name (e.g., 'grok-imagine-video-1.5')
 * @param config - Optional configuration (excluding apiKey which is auto-detected)
 * @returns Configured Grok video adapter instance with resolved types
 * @throws Error if XAI_API_KEY is not found in environment
 *
 * @example
 * ```typescript
 * // Automatically uses XAI_API_KEY from environment
 * const adapter = grokVideo('grok-imagine-video-1.5');
 *
 * // Image-to-video: an optional image prompt part is the starting frame.
 * const { jobId } = await generateVideo({
 *   adapter,
 *   prompt: [
 *     { type: 'text', content: 'Make the cat start playing the piano' },
 *     { type: 'image', source: { type: 'url', value: 'https://example.com/cat.png' } },
 *   ],
 * });
 *
 * // Poll for status
 * const status = await getVideoJobStatus({ adapter, jobId });
 * ```
 */
export declare function grokVideo<TModel extends GrokVideoModel>(model: TModel, config?: Omit<GrokVideoConfig, 'apiKey'>): GrokVideoAdapter<TModel>;
