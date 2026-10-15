import { default as OpenAI } from 'openai';
import { BaseImageAdapter } from '@tanstack/ai/adapters';
import { ImageGenerationOptions, ImageGenerationResult } from '@tanstack/ai';
import { VercelGatewayImageModel, VercelGatewayImageModelInputModalitiesByName, VercelGatewayImageModelProviderOptionsByName, VercelGatewayImageModelSizeByName } from '../model-meta.js';
import { VercelGatewayImageProviderOptions } from '../image/image-provider-options.js';
import { VercelGatewayClientConfig } from '../utils/client.js';
export interface VercelGatewayImageConfig extends VercelGatewayClientConfig {
}
/**
 * Vercel AI Gateway image adapter.
 *
 * Text-to-image only via `POST /v1/images/generations`.
 */
export declare class VercelGatewayImageAdapter<TModel extends VercelGatewayImageModel> extends BaseImageAdapter<TModel, VercelGatewayImageProviderOptions, VercelGatewayImageModelProviderOptionsByName, VercelGatewayImageModelSizeByName, VercelGatewayImageModelInputModalitiesByName> {
    readonly kind: "image";
    readonly name: "vercel-gateway";
    protected client: OpenAI;
    constructor(config: VercelGatewayImageConfig, model: TModel);
    generateImages(options: ImageGenerationOptions<VercelGatewayImageProviderOptions>): Promise<ImageGenerationResult>;
}
export declare function createVercelGatewayImage<TModel extends VercelGatewayImageModel>(model: TModel, apiKey: string, config?: Omit<VercelGatewayImageConfig, 'apiKey'>): VercelGatewayImageAdapter<TModel>;
export declare function vercelGatewayImage<TModel extends VercelGatewayImageModel>(model: TModel, config?: Omit<VercelGatewayImageConfig, 'apiKey'>): VercelGatewayImageAdapter<TModel>;
