import { Tool } from '@tanstack/ai';
import { Tool as OllamaTool } from 'ollama';
/**
 * Converts a standard Tool to Ollama's function-tool format.
 *
 * Tool schemas are already converted to JSON Schema in the ai layer. We
 * accept any JSONSchema and hand it to Ollama via a local type cast because
 * our JSONSchema type is broader than Ollama's (e.g. `type` can be a union
 * or array of strings).
 */
export declare function convertFunctionToolToAdapterFormat(tool: Tool): OllamaTool;
