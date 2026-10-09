import { BaseVideoAdapter, DurationOptions } from '@tanstack/ai/adapters';
import { VideoGenerationOptions, VideoJobResult, VideoStatusResult, VideoUrlResult } from '@tanstack/ai';
import { GoogleGenAI } from '@google/genai';
import { GeminiVideoModel, GeminiVideoModelDurationByName, GeminiVideoModelInputModalitiesByName, GeminiVideoModelProviderOptionsByName, GeminiVideoModelSizeByName } from '../video/video-provider-options.js';
import { GeminiClientConfig } from '../utils/client.js';
/**
 * Configuration for Gemini video adapter.
 *
 * @experimental Video generation is an experimental feature and may change.
 */
export interface GeminiVideoConfig extends GeminiClientConfig {
    /**
     * Opt into fetching HTTP(S) image URL inputs. Veo's predict API accepts
     * only inline `imageBytes` or a `gcsUri`, so an HTTP(S) URL has to be
     * downloaded and base64-encoded locally — which buffers the whole image in
     * memory and can OOM constrained runtimes (e.g. Cloudflare Workers). When
     * `false` (the default), HTTP(S) URL image inputs throw; pass a `data:` URI
     * or a `gs://` reference, or set this to `true` to opt into buffering.
     */
    allowUrlFetch?: boolean;
}
/**
 * Gemini Video Generation Adapter (Veo + Gemini Omni Flash)
 *
 * Tree-shakeable adapter for Google video generation, routing by model:
 *
 * **Veo models** run as a long-running operation: `createVideoJob` starts
 * the operation via the `:predictLongRunning` endpoint, `getVideoStatus`
 * polls it, and `getVideo` extracts the generated video's URI once it
 * completes. Image prompt parts are routed by `metadata.role`:
 * - `'start_frame'` (or the first un-roled image) → the input image the
 *   video starts from
 * - `'end_frame'` → `lastFrame` (the frame the video ends on)
 * - `'reference'` / `'character'` → `referenceImages` (asset references,
 *   Veo 3.1)
 *
 * Note: the returned Veo video URI is served by the Gemini Files API and
 * requires the API key (`x-goog-api-key` header or `?key=` query
 * parameter) to download.
 *
 * **Gemini Omni Flash** (`gemini-omni-1.1-flash`) only serves the Interactions API:
 * `createVideoJob` creates a background interaction with
 * `response_modalities: ['video']`, `getVideoStatus` polls it by id, and
 * `getVideo` returns the inline base64 MP4 as a `data:` URL (or the
 * Files API URI when the server delivers by reference). Image and video
 * prompt parts are sent as interaction content blocks, grouped as images,
 * then videos, then the text prompt (interleaving is not preserved); pass
 * `modelOptions.previous_interaction_id` to conversationally edit a prior
 * Omni generation. `size` is an `aspectRatio_resolution` template
 * (`'16:9'` or `'16:9_1080p'`); the optional suffix maps onto
 * `response_format.resolution` (`'360p' | '720p' | '1080p' | '4k'`,
 * default 720p).
 *
 * @experimental Video generation is an experimental feature and may change.
 */
export declare class GeminiVideoAdapter<TModel extends GeminiVideoModel> extends BaseVideoAdapter<TModel, GeminiVideoModelProviderOptionsByName[TModel], GeminiVideoModelProviderOptionsByName, GeminiVideoModelSizeByName, GeminiVideoModelInputModalitiesByName, GeminiVideoModelDurationByName> {
    readonly name: "gemini";
    readonly supportsFileSources = true;
    protected client: GoogleGenAI;
    private readonly allowUrlFetch;
    constructor(config: GeminiVideoConfig, model: TModel);
    createVideoJob(options: VideoGenerationOptions<GeminiVideoModelProviderOptionsByName[TModel], GeminiVideoModelSizeByName[TModel], GeminiVideoModelDurationByName[TModel]>): Promise<VideoJobResult>;
    /**
     * Gemini Omni Flash job creation via the Interactions API. Creates a
     * background interaction requesting video output; the interaction id is
     * the job id polled by `getVideoStatus` / `getVideo`.
     */
    private createInteractionsVideoJob;
    /**
     * Route image prompt parts onto Veo's request fields by `metadata.role`.
     */
    private routeImageParts;
    getVideoStatus(jobId: string): Promise<VideoStatusResult>;
    /**
     * Poll an Omni background interaction. `in_progress` maps to
     * 'processing'; a `completed` interaction with no video content (e.g.
     * filtered output) is surfaced as a failure so `getVideo` doesn't
     * throw on an empty response. `requires_action` also fails: the adapter
     * never sends tools, so it can only arise via
     * `previous_interaction_id` chaining onto a tool-bearing interaction —
     * and such an interaction never progresses without a client response,
     * so polling it would spin until timeout.
     */
    private getInteractionsVideoStatus;
    getVideo(jobId: string): Promise<VideoUrlResult>;
    /**
     * Extract the finished Omni video. Inline base64 output (the API default)
     * becomes a `data:` URL — matching the OpenAI Sora adapter's inline
     * delivery — and URI delivery passes through (Files API URIs need the API
     * key to download, like Veo). Usage carries the video-modality output
     * tokens (Omni bills per second of video, reported as tokens).
     */
    private getInteractionsVideoUrl;
    availableDurations(): DurationOptions<GeminiVideoModelDurationByName[TModel]>;
    /**
     * Fetch the long-running operation by name. The SDK's
     * `operations.getVideosOperation` needs a real `GenerateVideosOperation`
     * instance (it calls `_fromAPIResponse` on it), so reconstruct one from
     * the job ID rather than passing an object literal.
     */
    private getOperation;
    /**
     * Fetch an Omni background interaction by id.
     */
    private getInteraction;
}
/**
 * Creates a Gemini video adapter with an explicit API key.
 * Type resolution happens here at the call site.
 *
 * @experimental Video generation is an experimental feature and may change.
 *
 * @param model - The model name (e.g., 'veo-3.1-generate-preview')
 * @param apiKey - Your Google API key
 * @param config - Optional additional configuration
 * @returns Configured Gemini video adapter instance with resolved types
 *
 * @example
 * ```typescript
 * const adapter = createGeminiVideo('veo-3.1-generate-preview', 'your-api-key');
 *
 * const { jobId } = await generateVideo({
 *   adapter,
 *   prompt: 'A beautiful sunset over the ocean',
 *   duration: adapter.snapDuration(7), // → 6
 * });
 * ```
 */
export declare function createGeminiVideo<TModel extends GeminiVideoModel>(model: TModel, apiKey: string, config?: Omit<GeminiVideoConfig, 'apiKey'>): GeminiVideoAdapter<TModel>;
/**
 * Creates a Gemini video adapter with automatic API key detection from environment variables.
 * Type resolution happens here at the call site.
 *
 * Looks for `GOOGLE_API_KEY` or `GEMINI_API_KEY` in:
 * - `process.env` (Node.js)
 * - `window.env` (Browser with injected env)
 *
 * @experimental Video generation is an experimental feature and may change.
 *
 * @param model - The model name (e.g., 'veo-3.1-generate-preview')
 * @param config - Optional configuration (excluding apiKey which is auto-detected)
 * @returns Configured Gemini video adapter instance with resolved types
 * @throws Error if GOOGLE_API_KEY or GEMINI_API_KEY is not found in environment
 *
 * @example
 * ```typescript
 * // Automatically uses GOOGLE_API_KEY from environment
 * const adapter = geminiVideo('veo-3.1-generate-preview');
 *
 * // Create a video generation job
 * const { jobId } = await generateVideo({
 *   adapter,
 *   prompt: 'A cat playing piano'
 * });
 *
 * // Poll for status
 * const status = await getVideoJobStatus({ adapter, jobId });
 * ```
 */
export declare function geminiVideo<TModel extends GeminiVideoModel>(model: TModel, config?: Omit<GeminiVideoConfig, 'apiKey'>): GeminiVideoAdapter<TModel>;
