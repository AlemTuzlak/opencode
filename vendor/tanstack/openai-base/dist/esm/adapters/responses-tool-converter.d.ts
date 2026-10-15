import { Tool } from '@tanstack/ai';
/**
 * Responses API function tool format.
 * This is distinct from the Chat Completions API tool format.
 *
 * The Responses API uses a flatter structure:
 *   { type: 'function', name: string, description?: string, parameters: object, strict?: boolean }
 *
 * vs. Chat Completions:
 *   { type: 'function', function: { name, description, parameters }, strict?: boolean }
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
 * This enables strict mode for tools whose schemas fit OpenAI's strict subset.
 *
 * Schemas using keywords outside that subset (`oneOf`/`allOf`/`not`/`$ref`/
 * `$defs` — common with MCP servers like Notion) can't be coerced to a
 * strict-valid shape, and `strict: true` would make the Responses API reject
 * the ENTIRE request with a 400. Such tools are emitted with `strict: false`
 * (their schema passed through, only unsupported `format` keywords stripped) so
 * they stay callable.
 */
export declare function convertFunctionToolToResponsesFormat(tool: Tool, schemaConverter?: (schema: Record<string, any>, required: Array<string>) => Record<string, any>): ResponsesFunctionTool;
/**
 * Converts an array of standard Tools to Responses API format.
 * The Responses API primarily supports function tools at the base level.
 */
export declare function convertToolsToResponsesFormat(tools: Array<Tool>, schemaConverter?: (schema: Record<string, any>, required: Array<string>) => Record<string, any>): Array<ResponsesFunctionTool>;
