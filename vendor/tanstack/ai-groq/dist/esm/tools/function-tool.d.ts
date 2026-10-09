import { Tool } from '@tanstack/ai';
import { ChatCompletionTool } from '../message-types.js';
export type FunctionTool = ChatCompletionTool;
/**
 * Converts a standard Tool to Groq ChatCompletionTool format.
 *
 * Tool schemas are already converted to JSON Schema in the ai layer.
 * We apply Groq-specific transformations for strict mode:
 * - All properties in required array
 * - Optional fields made nullable
 * - additionalProperties: false
 */
export declare function convertFunctionToolToAdapterFormat(tool: Tool): FunctionTool;
