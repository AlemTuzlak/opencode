import { ProviderTool } from '@tanstack/ai';
import { WebSearchToolConfig } from '@tanstack/openai-base';
export { type WebSearchToolConfig, type WebSearchTool, convertWebSearchToolToAdapterFormat, } from '@tanstack/openai-base';
export type OpenAIWebSearchTool = ProviderTool<'openai', 'web_search'>;
/**
 * Creates a standard Tool from WebSearchTool parameters, branded as an OpenAI
 * provider tool.
 */
export declare function webSearchTool(toolData: WebSearchToolConfig): OpenAIWebSearchTool;
