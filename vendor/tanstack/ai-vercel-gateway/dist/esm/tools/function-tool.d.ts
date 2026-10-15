import { Tool } from '@tanstack/ai';
export interface FunctionTool {
    type: 'function';
    function: {
        name: string;
        description?: string;
        parameters: Record<string, unknown>;
        strict?: boolean;
    };
}
/**
 * Converts a standard Tool to Vercel AI Gateway Chat Completions tool format.
 *
 * Tool schemas are already converted to JSON Schema in the ai layer.
 */
export declare function convertFunctionToolToAdapterFormat(tool: Tool): FunctionTool;
