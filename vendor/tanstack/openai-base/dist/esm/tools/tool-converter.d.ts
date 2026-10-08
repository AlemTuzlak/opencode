import { OpenAITool } from './index.js';
import { Tool } from '@tanstack/ai';
/**
 * Converts an array of standard Tools to OpenAI-specific format
 */
export declare function convertToolsToProviderFormat(tools: Array<Tool>): Array<OpenAITool>;
