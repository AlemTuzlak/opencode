import { WebSearchTool20250305 } from '@anthropic-ai/sdk/resources/messages';
import { ProviderTool, Tool } from '@tanstack/ai';
export type WebSearchToolConfig = WebSearchTool20250305;
/** @deprecated Renamed to `WebSearchToolConfig`. Will be removed in a future release. */
export type WebSearchTool = WebSearchToolConfig;
export type AnthropicWebSearchTool = ProviderTool<'anthropic', 'web_search'>;
export declare function convertWebSearchToolToAdapterFormat(tool: Tool): WebSearchToolConfig;
export declare function webSearchTool(config: WebSearchToolConfig): AnthropicWebSearchTool;
