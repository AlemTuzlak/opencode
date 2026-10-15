import { ProviderTool } from '@tanstack/ai';
import { WebSearchPreviewToolConfig } from '@tanstack/openai-base';
export { type WebSearchPreviewToolConfig, type WebSearchPreviewTool, convertWebSearchPreviewToolToAdapterFormat, } from '@tanstack/openai-base';
export type OpenAIWebSearchPreviewTool = ProviderTool<'openai', 'web_search_preview'>;
/**
 * Creates a standard Tool from WebSearchPreviewTool parameters, branded as an
 * OpenAI provider tool.
 */
export declare function webSearchPreviewTool(toolData: WebSearchPreviewToolConfig): OpenAIWebSearchPreviewTool;
