import { BetaWebFetchTool20250910 } from '@anthropic-ai/sdk/resources/beta';
import { ProviderTool, Tool } from '@tanstack/ai';
export type WebFetchToolConfig = BetaWebFetchTool20250910;
/** @deprecated Renamed to `WebFetchToolConfig`. Will be removed in a future release. */
export type WebFetchTool = WebFetchToolConfig;
export type AnthropicWebFetchTool = ProviderTool<'anthropic', 'web_fetch'>;
export declare function convertWebFetchToolToAdapterFormat(tool: Tool): WebFetchToolConfig;
export declare function webFetchTool(config?: Omit<WebFetchToolConfig, 'type' | 'name'>): AnthropicWebFetchTool;
