import { ApplyPatchTool as ApplyPatchToolConfig } from 'openai/resources/responses/responses';
import { Tool } from '@tanstack/ai';
export type { ApplyPatchToolConfig };
/** @deprecated Renamed to `ApplyPatchToolConfig`. Will be removed in a future release. */
export type ApplyPatchTool = ApplyPatchToolConfig;
/**
 * Converts a standard Tool to OpenAI ApplyPatchTool format
 */
export declare function convertApplyPatchToolToAdapterFormat(_tool: Tool): ApplyPatchToolConfig;
/**
 * Creates a standard Tool from ApplyPatchTool parameters.
 *
 * Base (non-branded) factory. Providers that need branded return types should
 * re-wrap this in their own package.
 */
export declare function applyPatchTool(): Tool;
