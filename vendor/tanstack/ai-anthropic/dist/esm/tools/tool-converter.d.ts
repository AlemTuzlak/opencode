import { AnthropicTool } from './index.js';
import { Tool } from '@tanstack/ai';
/**
 * Converts standard Tool format to Anthropic-specific tool format
 *
 * @param tools - Array of standard Tool objects
 * @returns Array of Anthropic-specific tool definitions
 *
 * @example
 * ```typescript
 * const tools: Tool[] = [{
 *   type: "function",
 *   function: {
 *     name: "get_weather",
 *     description: "Get weather for a location",
 *     parameters: {
 *       type: "object",
 *       properties: { location: { type: "string" } },
 *       required: ["location"]
 *     }
 *   }
 * }];
 *
 * const anthropicTools = convertToolsToProviderFormat(tools);
 * ```
 */
export declare function convertToolsToProviderFormat<TTool extends Tool>(tools: Array<TTool>): Array<AnthropicTool>;
