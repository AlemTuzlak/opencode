import { WebSearchTool as WebSearchToolConfig } from 'openai/resources/responses/responses';
import { Tool } from '@tanstack/ai';
export type { WebSearchToolConfig };
/** @deprecated Renamed to `WebSearchToolConfig`. Will be removed in a future release. */
export type WebSearchTool = WebSearchToolConfig;
/**
 * Converts a standard Tool to OpenAI WebSearchTool format. Spread `metadata`
 * first, then force `type: 'web_search'` last so a different metadata type
 * cannot produce a malformed payload.
 */
export declare function convertWebSearchToolToAdapterFormat(tool: Tool): WebSearchToolConfig;
/**
 * Creates a standard Tool from WebSearchTool parameters.
 *
 * Base (non-branded) factory. Providers that need branded return types should
 * re-wrap this in their own package.
 */
export declare function webSearchTool(toolData: WebSearchToolConfig): Tool;
