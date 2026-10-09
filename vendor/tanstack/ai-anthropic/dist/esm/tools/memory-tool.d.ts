import { BetaMemoryTool20250818 } from '@anthropic-ai/sdk/resources/beta';
import { ProviderTool, Tool } from '@tanstack/ai';
export type MemoryToolConfig = BetaMemoryTool20250818;
/** @deprecated Renamed to `MemoryToolConfig`. Will be removed in a future release. */
export type MemoryTool = MemoryToolConfig;
export type AnthropicMemoryTool = ProviderTool<'anthropic', 'memory'>;
export declare function convertMemoryToolToAdapterFormat(tool: Tool): MemoryToolConfig;
export declare function memoryTool(config?: MemoryToolConfig): AnthropicMemoryTool;
