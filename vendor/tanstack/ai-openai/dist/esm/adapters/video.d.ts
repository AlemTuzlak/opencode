import { default as OpenAI } from 'openai';
import { BaseVideoAdapter, DurationOptions } from '@tanstack/ai/adapters';
import { VideoGenerationOptions, VideoJobResult, VideoStatusResult, VideoStreamResult, VideoUrlResult } from '@tanstack/ai';
import { OpenAIVideoModel } from '../model-meta.js';
import { OpenAIVideoModelDurationByName, OpenAIVideoModelInputModalitiesByName, OpenAIVideoModelProviderOptionsByName, OpenAIVideoModelSizeByName, OpenAIVideoProviderOptions, OpenAIVideoSeconds } from '../video/video-provider-options.js';
import { OpenAIClientConfig } from '../utils/client.js';
/**
 * Configuration for OpenAI video adapter.
 *
 * @experimental Video generation is an experimental feature and may change.
 */
export interface OpenAIVideoConfig extends OpenAIClientConfig {
    /**
     * Opt into fetching HTTP(S) image URL inputs for Sora's `input_reference`.
     * The endpoint requires uploaded file bytes (no URL passthrough), so an
     * HTTP(S) URL has to be downloaded and buffered in memory — which can OOM
     * constrained runtimes (e.g. Cloudflare Workers). When `false` (the
     * default), HTTP(S) URL image inputs throw; pass a `data:` URI, or set this
     * to `true` to opt into buffering.
     */
    allowUrlFetch?: boolean;
}
/**
 * OpenAI Video Generation Adapter
 *
 * Tree-shakeable adapter for OpenAI video generation functionality using Sora-2.
 * Uses a jobs/polling architecture for async video generation.
 *
 * @experimental Video generation is an experimental feature and may change.
 *
 * Features:
 * - Async job-based video generation
 * - Status polling for job progress
 * - URL retrieval for completed videos
 * - Model-specific type-safe provider options
 */
export declare class OpenAIVideoAdapter<TModel extends OpenAIVideoModel> extends BaseVideoAdapter<TModel, OpenAIVideoProviderOptions, OpenAIVideoModelProviderOptionsByName, OpenAIVideoModelSizeByName, OpenAIVideoModelInputModalitiesByName, OpenAIVideoModelDurationByName> {
    readonly name: "openai";
    protected client: OpenAI;
    protected clientConfig: OpenAIVideoConfig;
    constructor(config: OpenAIVideoConfig, model: TModel);
    createVideoJob(options: VideoGenerationOptions<OpenAIVideoProviderOptions, OpenAIVideoModelSizeByName[TModel], OpenAIVideoModelDurationByName[TModel]>): Promise<VideoJobResult>;
    /**
     * The video API on the OpenAI SDK is still experimental and shipped on some
     * SDK versions but not others; access through `videosClient` lets us treat
     * the path uniformly even when the SDK lacks first-class typings here.
     */
    private getVideosClient;
    getVideoStatus(jobId: string): Promise<VideoStatusResult>;
    getVideo(jobId: string): Promise<VideoUrlResult | VideoStreamResult>;
    availableDurations(): DurationOptions<OpenAIVideoSeconds>;
    /**
     * Returns the API string (`'4' | '8' | '12'`). Ties keep the earlier
     * option, so `6` and `"6s"` snap to `'4'`.
     */
    snapDuration(input: number | string): OpenAIVideoSeconds | undefined;
    protected mapStatus(apiStatus: string): 'pending' | 'processing' | 'completed' | 'failed';
}
/**
 * Creates an OpenAI video adapter with an explicit API key.
 * Type resolution happens here at the call site.
 *
 * @experimental Video generation is an experimental feature and may change.
 *
 * @param model - The model name (e.g., 'sora-2')
 * @param apiKey - Your OpenAI API key
 * @param config - Optional additional configuration
 * @returns Configured OpenAI video adapter instance with resolved types
 *
 * @example
 * ```typescript
 * const adapter = createOpenaiVideo('sora-2', 'your-api-key');
 *
 * const { jobId } = await generateVideo({
 *   adapter,
 *   prompt: 'A beautiful sunset over the ocean'
 * });
 * ```
 */
export declare function createOpenaiVideo<TModel extends OpenAIVideoModel>(model: TModel, apiKey: string, config?: Omit<OpenAIVideoConfig, 'apiKey'>): OpenAIVideoAdapter<TModel>;
/**
 * Creates an OpenAI video adapter with automatic API key detection from environment variables.
 * Type resolution happens here at the call site.
 *
 * Looks for `OPENAI_API_KEY` in:
 * - `process.env` (Node.js)
 * - `window.env` (Browser with injected env)
 *
 * @experimental Video generation is an experimental feature and may change.
 *
 * @param model - The model name (e.g., 'sora-2')
 * @param config - Optional configuration (excluding apiKey which is auto-detected)
 * @returns Configured OpenAI video adapter instance with resolved types
 * @throws Error if OPENAI_API_KEY is not found in environment
 *
 * @example
 * ```typescript
 * // Automatically uses OPENAI_API_KEY from environment
 * const adapter = openaiVideo('sora-2');
 *
 * // Create a video generation job
 * const { jobId } = await generateVideo({
 *   adapter,
 *   prompt: 'A cat playing piano'
 * });
 *
 * // Poll for status
 * const status = await getVideoJobStatus({
 *   adapter,
 *   jobId
 * });
 * ```
 */
export declare function openaiVideo<TModel extends OpenAIVideoModel>(model: TModel, config?: Omit<OpenAIVideoConfig, 'apiKey'>): OpenAIVideoAdapter<TModel>;
