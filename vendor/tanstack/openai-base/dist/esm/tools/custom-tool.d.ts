import { CustomTool as CustomToolConfig } from 'openai/resources/responses/responses';
import { Tool } from '@tanstack/ai';
export type { CustomToolConfig };
/** @deprecated Renamed to `CustomToolConfig`. Will be removed in a future release. */
export type CustomTool = CustomToolConfig;
/**
 * Converts a standard Tool to OpenAI CustomTool format
 */
export declare function convertCustomToolToAdapterFormat(tool: Tool): CustomToolConfig;
/**
 * Creates a standard Tool from CustomTool parameters.
 */
export declare function customTool(toolData: CustomToolConfig): Tool;
