import { FunctionTool } from './function-tool.js';
import { Tool } from '@tanstack/ai';
/**
 * Converts an array of standard Tools to Mistral-specific format.
 */
export declare function convertToolsToProviderFormat(tools: Array<Tool>): Array<FunctionTool>;
