import { ProviderTool } from '@tanstack/ai';
import { FileSearchToolConfig } from '@tanstack/openai-base';
export { type FileSearchToolConfig, type FileSearchTool, convertFileSearchToolToAdapterFormat, } from '@tanstack/openai-base';
export type OpenAIFileSearchTool = ProviderTool<'openai', 'file_search'>;
/**
 * Creates a standard Tool from FileSearchTool parameters, branded as an
 * OpenAI provider tool.
 */
export declare function fileSearchTool(toolData: FileSearchToolConfig): OpenAIFileSearchTool;
