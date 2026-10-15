import { Tool as SDKTool } from 'openai/resources/responses/responses';
import { Tool } from '@tanstack/ai';
type ImageGenerationToolConfig = SDKTool.ImageGeneration;
export type { ImageGenerationToolConfig };
/** @deprecated Renamed to `ImageGenerationToolConfig`. Will be removed in a future release. */
export type ImageGenerationTool = ImageGenerationToolConfig;
declare const validatePartialImages: (value: number | undefined) => void;
/**
 * Converts a standard Tool to OpenAI ImageGenerationTool format. Spread
 * `metadata` first, then force `type: 'image_generation'` last so a stray
 * `metadata.type` cannot shadow the wire discriminator.
 */
export declare function convertImageGenerationToolToAdapterFormat(tool: Tool): ImageGenerationToolConfig;
/**
 * Creates a standard Tool from ImageGenerationTool parameters.
 *
 * Base (non-branded) factory. Providers that need branded return types should
 * re-wrap this in their own package.
 */
export declare function imageGenerationTool(toolData: Omit<ImageGenerationToolConfig, 'type'>): Tool;
export { validatePartialImages };
