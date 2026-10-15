import { Tool } from '@tanstack/ai';
import { ChatCompletionTool } from '../message-types.js';
export type FunctionTool = ChatCompletionTool;
/**
 * Converts a standard Tool to Mistral ChatCompletionTool format.
 *
 * Tool schemas are already JSON Schema in the ai layer. When the schema can
 * be inverted, rewrite it for strict mode (required, nullable optionals,
 * `additionalProperties: false`) and set `strict: true`. Otherwise leave the
 * schema intact and set `strict: false`.
 */
export declare function convertFunctionToolToAdapterFormat(tool: Tool): FunctionTool;
