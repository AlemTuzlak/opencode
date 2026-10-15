import { Tool as SDKTool } from 'openai/resources/responses/responses';
import { Tool } from '@tanstack/ai';
type MCPToolConfig = SDKTool.Mcp;
export type { MCPToolConfig };
/** @deprecated Renamed to `MCPToolConfig`. Will be removed in a future release. */
export type MCPTool = MCPToolConfig;
export declare function validateMCPtool(tool: MCPToolConfig): void;
/**
 * Converts a standard Tool to OpenAI MCPTool format
 */
export declare function convertMCPToolToAdapterFormat(tool: Tool): MCPToolConfig;
/**
 * Creates a standard Tool from MCPTool parameters.
 *
 * Base (non-branded) factory. Providers that need branded return types should
 * re-wrap this in their own package.
 */
export declare function mcpTool(toolData: Omit<MCPToolConfig, 'type'>): Tool;
