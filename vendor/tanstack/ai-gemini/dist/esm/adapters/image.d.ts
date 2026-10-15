import { BaseImageAdapter } from '@tanstack/ai/adapters';
import { GeminiImageModels } from '../model-meta.js';
import { GeminiAnyImageProviderOptions, GeminiImageModelInputModalitiesByName, GeminiImageModelProviderOptionsByName, GeminiImageModelSizeByName } from '../image/image-provider-options.js';
import { ImageGenerationOptions, ImageGenerationResult } from '@tanstack/ai';
import { GeminiClientConfig } from '../utils/client.js';
/**
 * Configuration for Gemini image adapter
 */
export interface GeminiImageConfig extends GeminiClientConfig {
}
/** Model type for Gemini Image */
export type GeminiImageModel = GeminiImageModels;
/**
 * Gemini Image Generation Adapter
 *
 * Tree-shakeable adapter for Gemini image generation functionality.
 * Supports Imagen 3/4 models (via generateImages API) and Gemini native
 * image models like Nano Banana 2 (via the Interactions API).
 *
 * Features:
 * - Aspect ratio-based image sizing
 * - Person generation controls
 * - Safety filtering
 * - Watermark options
 * - Extended resolution tiers (Nano Banana 2)
 */
export declare class GeminiImageAdapter<TModel extends GeminiImageModel> extends BaseImageAdapter<TModel, GeminiAnyImageProviderOptions, GeminiImageModelProviderOptionsByName, GeminiImageModelSizeByName, GeminiImageModelInputModalitiesByName> {
    readonly kind: "image";
    readonly name: "gemini";
    readonly supportsFileSources = true;
    '~types': {
        providerOptions: GeminiAnyImageProviderOptions;
        modelProviderOptionsByName: GeminiImageModelProviderOptionsByName;
        modelSizeByName: GeminiImageModelSizeByName;
        modelInputModalitiesByName: GeminiImageModelInputModalitiesByName;
    };
    private readonly client;
    constructor(config: GeminiImageConfig, model: TModel);
    generateImages(options: ImageGenerationOptions<GeminiAnyImageProviderOptions>): Promise<ImageGenerationResult>;
    private generateWithGeminiApi;
    /**
     * Text-only prompts pass through as a string. Prompts with image parts
     * become content blocks in prompt order. The Interactions API has no
     * image count, so more than one image appends an instruction.
     */
    private buildInteractionInput;
    private imagePartToInteraction;
    private transformInteractionResponse;
    private buildImagenConfig;
    private transformImagenResponse;
}
/** @deprecated Shut down 2026-06-25. Use `gemini-3.1-flash-image`. */
export declare function createGeminiImage(model: 'gemini-3.1-flash-image-preview', apiKey: string, config?: Omit<GeminiImageConfig, 'apiKey'>): GeminiImageAdapter<'gemini-3.1-flash-image-preview'>;
/** @deprecated Shut down 2026-06-25. Use `gemini-3-pro-image`. */
export declare function createGeminiImage(model: 'gemini-3-pro-image-preview', apiKey: string, config?: Omit<GeminiImageConfig, 'apiKey'>): GeminiImageAdapter<'gemini-3-pro-image-preview'>;
/**
 * Creates a Gemini image adapter with explicit API key.
 * Type resolution happens here at the call site.
 *
 * @param model - The model name (e.g., 'imagen-4.0-generate-001')
 * @param apiKey - Your Google API key
 * @param config - Optional additional configuration
 * @returns Configured Gemini image adapter instance with resolved types
 *
 * @example
 * ```typescript
 * const adapter = createGeminiImage('imagen-4.0-generate-001', "your-api-key");
 *
 * const result = await generateImage({
 *   adapter,
 *   prompt: 'A cute baby sea otter'
 * });
 * ```
 */
export declare function createGeminiImage<TModel extends GeminiImageModel>(model: TModel, apiKey: string, config?: Omit<GeminiImageConfig, 'apiKey'>): GeminiImageAdapter<TModel>;
/** @deprecated Shut down 2026-06-25. Use `gemini-3.1-flash-image`. */
export declare function geminiImage(model: 'gemini-3.1-flash-image-preview', config?: Omit<GeminiImageConfig, 'apiKey'>): GeminiImageAdapter<'gemini-3.1-flash-image-preview'>;
/** @deprecated Shut down 2026-06-25. Use `gemini-3-pro-image`. */
export declare function geminiImage(model: 'gemini-3-pro-image-preview', config?: Omit<GeminiImageConfig, 'apiKey'>): GeminiImageAdapter<'gemini-3-pro-image-preview'>;
/**
 * Creates a Gemini image adapter with automatic API key detection from environment variables.
 * Type resolution happens here at the call site.
 *
 * Looks for `GOOGLE_API_KEY` or `GEMINI_API_KEY` in:
 * - `process.env` (Node.js)
 * - `window.env` (Browser with injected env)
 *
 * @param model - The model name (e.g., 'imagen-4.0-generate-001')
 * @param config - Optional configuration (excluding apiKey which is auto-detected)
 * @returns Configured Gemini image adapter instance with resolved types
 * @throws Error if GOOGLE_API_KEY or GEMINI_API_KEY is not found in environment
 *
 * @example
 * ```typescript
 * // Automatically uses GOOGLE_API_KEY from environment
 * const adapter = geminiImage('imagen-4.0-generate-001');
 *
 * const result = await generateImage({
 *   adapter,
 *   prompt: 'A beautiful sunset over mountains'
 * });
 * ```
 */
export declare function geminiImage<TModel extends GeminiImageModel>(model: TModel, config?: Omit<GeminiImageConfig, 'apiKey'>): GeminiImageAdapter<TModel>;
