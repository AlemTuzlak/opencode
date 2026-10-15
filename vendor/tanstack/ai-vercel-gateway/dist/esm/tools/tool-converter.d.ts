import { FunctionTool } from './function-tool.js';
import { Tool } from '@tanstack/ai';
/**
 * Converts an array of standard Tools to Vercel AI Gateway format.
 * The Gateway Chat Completions API is OpenAI-compatible, so we support function tools.
 */
export declare function convertToolsToProviderFormat(tools: Array<Tool>): Array<FunctionTool>;
