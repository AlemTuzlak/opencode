import { default as OpenAI } from 'openai';
import { BaseImageAdapter } from '@tanstack/ai/adapters';
import { ImageGenerationOptions, ImageGenerationResult } from '@tanstack/ai';
import { GrokImageModel } from '../model-meta.js';
import { GrokImageModelInputModalitiesByName, GrokImageModelProviderOptionsByName, GrokImageModelSizeByName, GrokImagineImageProviderOptions } from '../image/image-provider-options.js';
import { GrokClientConfig } from '../utils/client.js';
/**
 * Configuration for Grok image adapter
 */
export interface GrokImageConfig extends GrokClientConfig {
}
/**
 * Grok Image Generation Adapter
 *
 * Tree-shakeable adapter for Grok image generation functionality.
 * Supports the grok-imagine image models. Image prompt parts use xAI's
 * `/v1/images/edits` endpoint (up to 3 source images).
 *
 * Features:
 * - Model-specific type-safe provider options
 * - Size / aspect-ratio validation per model
 * - Number of images validation
 */
export declare class GrokImageAdapter<TModel extends GrokImageModel> extends BaseImageAdapter<TModel, GrokImagineImageProviderOptions, GrokImageModelProviderOptionsByName, GrokImageModelSizeByName, GrokImageModelInputModalitiesByName> {
    readonly kind: "image";
    readonly name: "grok";
    protected client: OpenAI;
    private readonly clientConfig;
    constructor(config: GrokImageConfig, model: TModel);
    generateImages(options: ImageGenerationOptions<GrokImagineImageProviderOptions>): Promise<ImageGenerationResult>;
    /**
     * Image-conditioned generation via xAI's Imagine API.
     *
     * The `/v1/images/edits` endpoint takes `application/json` (the OpenAI
     * SDK's `images.edit()` sends `multipart/form-data`, which xAI rejects),
     * so this path issues the request directly. One input is sent as
     * `image: { url }`; multiple inputs (up to 3) as `images: [{ url }, ...]`,
     * addressed by xAI in the order they are sent. The prompt text is sent
     * verbatim — no referencing markers are injected.
     */
    private editImages;
}
/**
 * Creates a Grok image adapter with explicit API key.
 * Type resolution happens here at the call site.
 *
 * @param model - The model name (e.g., 'grok-imagine-image-2.0')
 * @param apiKey - Your xAI API key
 * @param config - Optional additional configuration
 * @returns Configured Grok image adapter instance with resolved types
 *
 * @example
 * ```typescript
 * const adapter = createGrokImage('grok-imagine-image-2.0', "xai-...");
 *
 * const result = await generateImage({
 *   adapter,
 *   prompt: 'A cute baby sea otter'
 * });
 * ```
 */
export declare function createGrokImage<TModel extends GrokImageModel>(model: TModel, apiKey: string, config?: Omit<GrokImageConfig, 'apiKey'>): GrokImageAdapter<TModel>;
/**
 * Creates a Grok image adapter with automatic API key detection from environment variables.
 * Type resolution happens here at the call site.
 *
 * Looks for `XAI_API_KEY` in:
 * - `process.env` (Node.js)
 * - `window.env` (Browser with injected env)
 *
 * @param model - The model name (e.g., 'grok-imagine-image-2.0')
 * @param config - Optional configuration (excluding apiKey which is auto-detected)
 * @returns Configured Grok image adapter instance with resolved types
 * @throws Error if XAI_API_KEY is not found in environment
 *
 * @example
 * ```typescript
 * // Automatically uses XAI_API_KEY from environment
 * const adapter = grokImage('grok-imagine-image-2.0');
 *
 * const result = await generateImage({
 *   adapter,
 *   prompt: 'A beautiful sunset over mountains'
 * });
 * ```
 */
export declare function grokImage<TModel extends GrokImageModel>(model: TModel, config?: Omit<GrokImageConfig, 'apiKey'>): GrokImageAdapter<TModel>;
