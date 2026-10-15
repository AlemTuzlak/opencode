import { ToolExecutionContext } from '@tanstack/ai';
import { CodeModeTool, ToolBinding } from '../types.js';
/**
 * Convert an array of TanStack AI tools to a Record of ToolBindings
 *
 * @param tools - Array of tools to convert
 * @param prefix - Optional prefix to add to binding names (e.g., 'external_')
 */
export declare function toolsToBindings(tools: Array<CodeModeTool>, prefix?: string): Record<string, ToolBinding>;
/**
 * Convert a single TanStack AI tool to a ToolBinding
 *
 * @param tool - Tool to convert
 * @param prefix - Optional prefix to add to binding name (e.g., 'external_')
 * @throws Error if the tool doesn't have an execute function
 */
export declare function toolToBinding(tool: CodeModeTool, prefix?: string): ToolBinding;
/**
 * Create event-aware bindings that emit custom events for each external function call.
 * Wraps each binding's execute function to emit events before and after execution.
 *
 * Each call gets the parent tool's `abortSignal` and runtime `context`, so a tool
 * can cancel in-flight work when the run aborts. `toolCallId` and `inputResponse` are not
 * passed: they belong to the parent tool call, not to this nested call.
 *
 * @param bindings - Original tool bindings
 * @param emitCustomEvent - Callback to emit custom events to the stream
 * @param parentContext - Context of the tool that runs the code (e.g. `execute_typescript`)
 */
export declare function createEventAwareBindings(bindings: Record<string, ToolBinding>, emitCustomEvent: ToolExecutionContext['emitCustomEvent'], parentContext?: ToolExecutionContext): Record<string, ToolBinding>;
