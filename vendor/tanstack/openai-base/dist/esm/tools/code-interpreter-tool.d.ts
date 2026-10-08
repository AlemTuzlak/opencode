import { Tool as SDKTool } from 'openai/resources/responses/responses';
import { Tool } from '@tanstack/ai';
type CodeInterpreterToolConfig = SDKTool.CodeInterpreter;
export type { CodeInterpreterToolConfig };
/** @deprecated Renamed to `CodeInterpreterToolConfig`. Will be removed in a future release. */
export type CodeInterpreterTool = CodeInterpreterToolConfig;
/**
 * Converts a standard Tool to OpenAI CodeInterpreterTool format
 */
export declare function convertCodeInterpreterToolToAdapterFormat(tool: Tool): CodeInterpreterToolConfig;
/**
 * Creates a standard Tool from CodeInterpreterTool parameters.
 *
 * Base (non-branded) factory. Providers that need branded return types should
 * re-wrap this in their own package.
 */
export declare function codeInterpreterTool(container: CodeInterpreterToolConfig): Tool;
