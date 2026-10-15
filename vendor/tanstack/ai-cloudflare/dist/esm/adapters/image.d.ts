import { BaseImageAdapter } from '@tanstack/ai/adapters';
import { ImageGenerationOptions, ImageGenerationResult } from '@tanstack/ai';
import { CloudflareConfig, CloudflareConfigInput } from '../utils/config.js';
import { CloudflareImageModel } from '../utils/models.js';
/** Text-to-image inputs forwarded to the model (`steps`, `guidance`, ...). */
export interface CloudflareImageProviderOptions {
    negative_prompt?: string;
    steps?: number;
    num_steps?: number;
    guidance?: number;
    seed?: number;
    [key: string]: unknown;
}
/**
 * Cloudflare image adapter. Runs Workers AI text-to-image models and returns
 * base64 images, whether the model answers with `{ image }` JSON (Flux,
 * Leonardo) or raw PNG bytes (Stable Diffusion).
 */
export declare class CloudflareImageAdapter<TModel extends CloudflareImageModel> extends BaseImageAdapter<TModel, CloudflareImageProviderOptions> {
    private readonly cfConfig;
    readonly name: "cloudflare";
    constructor(cfConfig: CloudflareConfig, model: TModel);
    generateImages(options: ImageGenerationOptions<CloudflareImageProviderOptions>): Promise<ImageGenerationResult>;
}
export declare function createCloudflareImage<TModel extends CloudflareImageModel>(model: TModel, config: CloudflareConfig): CloudflareImageAdapter<TModel>;
export declare function cloudflareImage<TModel extends CloudflareImageModel>(model: TModel, config?: CloudflareConfigInput): CloudflareImageAdapter<TModel>;
