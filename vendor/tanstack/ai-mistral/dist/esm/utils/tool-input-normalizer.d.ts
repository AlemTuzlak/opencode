import { Tool } from '@tanstack/ai';
export type ToolInputNormalizer = (toolName: string, input: unknown) => unknown;
/**
 * Per-request inverse of Mistral optional-null widening. Recomputes maps from
 * each tool's input schema; duplicate names and non-strict schemas are left
 * untouched so we never guess.
 */
export declare function createToolInputNormalizer(tools: Array<Tool> | undefined): ToolInputNormalizer;
