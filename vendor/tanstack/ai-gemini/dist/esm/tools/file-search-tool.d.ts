import { FileSearch } from '@google/genai';
import { ProviderTool, Tool } from '@tanstack/ai';
export type FileSearchToolConfig = FileSearch;
/** @deprecated Renamed to `FileSearchToolConfig`. Will be removed in a future release. */
export type FileSearchTool = FileSearchToolConfig;
export type GeminiFileSearchTool = ProviderTool<'gemini', 'file_search'>;
export declare function convertFileSearchToolToAdapterFormat(tool: Tool): {
    fileSearch: FileSearch;
};
export declare function fileSearchTool(config: FileSearchToolConfig): GeminiFileSearchTool;
