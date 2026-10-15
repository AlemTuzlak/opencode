import { ProviderTool } from '@tanstack/ai';
import { MCPToolConfig } from '@tanstack/openai-base';
export { type MCPToolConfig, type MCPTool, validateMCPtool, convertMCPToolToAdapterFormat, } from '@tanstack/openai-base';
export type OpenAIMCPTool = ProviderTool<'openai', 'mcp'>;
/**
 * Creates a standard Tool from MCPTool parameters, branded as an OpenAI provider tool.
 */
export declare function mcpTool(toolData: Omit<MCPToolConfig, 'type'>): OpenAIMCPTool;
