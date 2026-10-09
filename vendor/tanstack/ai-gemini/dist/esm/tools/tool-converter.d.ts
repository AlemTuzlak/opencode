import { Tool } from '@tanstack/ai';
import { ToolUnion } from '@google/genai';
/**
 * Converts standard Tool format to Gemini-specific tool format
 *
 * @param tools - Array of standard Tool objects
 * @returns Array of Gemini-specific tool definitions
 *
 * @example
 * ```typescript
 * const tools: Tool[] = [{
 *   name: "get_weather",
 *   description: "Get weather for a location",
 *   inputSchema: z.object({
 *     location: z.string()
 *   })
 * }];
 *
 * const geminiTools = convertToolsToProviderFormat(tools);
 * ```
 */
export declare function convertToolsToProviderFormat<TTool extends Tool>(tools: Array<TTool> | undefined): Array<ToolUnion>;
