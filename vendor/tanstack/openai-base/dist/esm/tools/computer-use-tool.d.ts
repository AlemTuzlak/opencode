import { ComputerUsePreviewTool as ComputerUseToolConfig } from 'openai/resources/responses/responses';
import { Tool } from '@tanstack/ai';
export type { ComputerUseToolConfig };
/** @deprecated Renamed to `ComputerUseToolConfig`. Will be removed in a future release. */
export type ComputerUseTool = ComputerUseToolConfig;
/**
 * Converts a standard Tool to OpenAI ComputerUseTool format
 */
export declare function convertComputerUseToolToAdapterFormat(tool: Tool): ComputerUseToolConfig;
/**
 * Creates a standard Tool from ComputerUseTool parameters.
 *
 * Base (non-branded) factory. Providers that need branded return types should
 * re-wrap this in their own package.
 */
export declare function computerUseTool(toolData: ComputerUseToolConfig): Tool;
