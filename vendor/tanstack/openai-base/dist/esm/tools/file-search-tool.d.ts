import { FileSearchTool as FileSearchToolConfig } from 'openai/resources/responses/responses';
import { Tool } from '@tanstack/ai';
export type { FileSearchToolConfig };
declare const validateMaxNumResults: (maxNumResults: number | undefined) => void;
/** @deprecated Renamed to `FileSearchToolConfig`. Will be removed in a future release. */
export type FileSearchTool = FileSearchToolConfig;
/**
 * Converts a standard Tool to OpenAI FileSearchTool format
 */
export declare function convertFileSearchToolToAdapterFormat(tool: Tool): FileSearchToolConfig;
/**
 * Creates a standard Tool from FileSearchTool parameters.
 *
 * Validates max_num_results. Base (non-branded) factory; providers that need
 * branded return types should re-wrap in their own package.
 */
export declare function fileSearchTool(toolData: FileSearchToolConfig): Tool;
export { validateMaxNumResults };
