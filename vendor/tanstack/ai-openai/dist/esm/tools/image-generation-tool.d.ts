import { ProviderTool } from '@tanstack/ai';
import { ImageGenerationToolConfig } from '@tanstack/openai-base';
export { type ImageGenerationToolConfig, type ImageGenerationTool, convertImageGenerationToolToAdapterFormat, } from '@tanstack/openai-base';
export type OpenAIImageGenerationTool = ProviderTool<'openai', 'image_generation'>;
/**
 * Creates a standard Tool from ImageGenerationTool parameters, branded as an
 * OpenAI provider tool.
 */
export declare function imageGenerationTool(toolData: Omit<ImageGenerationToolConfig, 'type'>): OpenAIImageGenerationTool;
