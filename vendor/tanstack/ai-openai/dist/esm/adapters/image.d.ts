import { default as OpenAI } from 'openai';
import { BaseImageAdapter } from '@tanstack/ai/adapters';
import { ImageGenerationOptions, ImageGenerationResult } from '@tanstack/ai';
import { OpenAIImageModel } from '../model-meta.js';
import { OpenAIImageModelInputModalitiesByName, OpenAIImageModelProviderOptionsByName, OpenAIImageModelSizeByName, OpenAIImageProviderOptions } from '../image/image-provider-options.js';
import { OpenAIClientConfig } from '../utils/client.js';
/**
 * Configuration for OpenAI image adapter
 */
export interface OpenAIImageConfig extends OpenAIClientConfig {
    /**
     * Opt into fetching HTTP(S) image URL inputs for image edits. OpenAI's
     * `/images/edits` endpoint requires uploaded file bytes (no URL
     * passthrough), so an HTTP(S) URL has to be downloaded and buffered in
     * memory — which can OOM constrained runtimes (e.g. Cloudflare Workers).
     * When `false` (the default), HTTP(S) URL image inputs throw; pass a `data:`
     * URI, or set this to `true` to opt into buffering.
     */
    allowUrlFetch?: boolean;
}
/**
 * OpenAI Image Generation Adapter
 *
 * Tree-shakeable adapter for OpenAI image generation functionality.
 * Supports gpt-image-2.5-flare, gpt-image-2.5-sunburst, gpt-image-2,
 * gpt-image-1, gpt-image-1-mini, dall-e-3, and dall-e-2 models.
 *
 * Features:
 * - Model-specific type-safe provider options
 * - Size validation per model
 * - Number of images validation
 */
export declare class OpenAIImageAdapter<TModel extends OpenAIImageModel> extends BaseImageAdapter<TModel, OpenAIImageProviderOptions, OpenAIImageModelProviderOptionsByName, OpenAIImageModelSizeByName, OpenAIImageModelInputModalitiesByName> {
    readonly kind: "image";
    readonly name: "openai";
    protected client: OpenAI;
    private readonly allowUrlFetch;
    constructor(config: OpenAIImageConfig, model: TModel);
    generateImages(options: ImageGenerationOptions<OpenAIImageProviderOptions>): Promise<ImageGenerationResult>;
    /**
     * Image-conditioned generation via OpenAI's `images.edit()` endpoint.
     * dall-e-2 accepts 1 input image; the gpt-image models accept up to 16;
     * dall-e-3 rejects entirely. A part with `metadata.role === 'mask'` is
     * routed to the SDK's `mask` field (PNG with alpha channel).
     */
    private editImages;
}
/**
 * Creates an OpenAI image adapter with explicit API key.
 * Type resolution happens here at the call site.
 *
 * @param model - The model name (e.g., 'dall-e-3', 'gpt-image-1')
 * @param apiKey - Your OpenAI API key
 * @param config - Optional additional configuration
 * @returns Configured OpenAI image adapter instance with resolved types
 *
 * @example
 * ```typescript
 * const adapter = createOpenaiImage('dall-e-3', "sk-...");
 *
 * const result = await generateImage({
 *   adapter,
 *   prompt: 'A cute baby sea otter'
 * });
 * ```
 */
export declare function createOpenaiImage<TModel extends OpenAIImageModel>(model: TModel, apiKey: string, config?: Omit<OpenAIImageConfig, 'apiKey'>): OpenAIImageAdapter<TModel>;
/**
 * Creates an OpenAI image adapter with automatic API key detection from environment variables.
 * Type resolution happens here at the call site.
 *
 * Looks for `OPENAI_API_KEY` in:
 * - `process.env` (Node.js)
 * - `window.env` (Browser with injected env)
 *
 * @param model - The model name (e.g., 'dall-e-3', 'gpt-image-1')
 * @param config - Optional configuration (excluding apiKey which is auto-detected)
 * @returns Configured OpenAI image adapter instance with resolved types
 * @throws Error if OPENAI_API_KEY is not found in environment
 *
 * @example
 * ```typescript
 * // Automatically uses OPENAI_API_KEY from environment
 * const adapter = openaiImage('dall-e-3');
 *
 * const result = await generateImage({
 *   adapter,
 *   prompt: 'A beautiful sunset over mountains'
 * });
 * ```
 */
export declare function openaiImage<TModel extends OpenAIImageModel>(model: TModel, config?: Omit<OpenAIImageConfig, 'apiKey'>): OpenAIImageAdapter<TModel>;
