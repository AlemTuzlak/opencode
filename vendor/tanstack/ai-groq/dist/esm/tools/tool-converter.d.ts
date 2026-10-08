import { FunctionTool } from './function-tool.js';
import { Tool } from '@tanstack/ai';
/**
 * Converts an array of standard Tools to Groq-specific format.
 * Groq uses an OpenAI-compatible API, so we primarily support function tools.
 */
export declare function convertToolsToProviderFormat(tools: Array<Tool>): Array<FunctionTool>;
