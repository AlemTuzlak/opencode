import { Tool } from '@tanstack/ai';
/**
 * Responses API function tool format.
 *
 * Matches OpenRouter's `ResponsesRequestToolFunction` shape exactly:
 *   { type: 'function', name: string, description?: string, parameters: object, strict?: boolean }
 */
export interface ResponsesFunctionTool {
    type: 'function';
    name: string;
    description?: string | null;
    parameters: Record<string, any> | null;
    strict: boolean | null;
}
/**
 * Converts a standard Tool to the Responses API FunctionTool format.
 *
 * Tool schemas are already converted to JSON Schema in the ai layer.
 * We apply OpenAI-compatible transformations for strict mode:
 * - All properties in required array
 * - Optional fields made nullable
 * - additionalProperties: false
 *
 * This enables strict mode for all tools automatically.
 */
export declare function convertFunctionToolToResponsesFormat(tool: Tool, schemaConverter?: (schema: Record<string, any>, required: Array<string>) => Record<string, any>): ResponsesFunctionTool;
/**
 * Build the inverse of the strict null-widening applied to the tools of one
 * request. Strict tools reach the model with every optional field promoted to
 * required + nullable, so the model sends `null` for an omitted optional. The
 * returned function strips exactly those synthesized nulls, so the engine
 * validates the input against the original schema and `execute` sees the
 * field as absent. Pass the same converter the request used.
 */
export declare function createToolInputNormalizer(tools: Array<Tool> | undefined, schemaConverter?: Parameters<typeof convertFunctionToolToResponsesFormat>[1]): (toolName: string, input: unknown) => unknown;
