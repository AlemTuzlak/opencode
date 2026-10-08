import { CodeModeToolConfig } from './types.js';
/**
 * Create a system prompt snippet that documents the execute_typescript tool
 * and all available external_* functions.
 *
 * Add this to your system prompts array when using createCodeModeTool.
 *
 * @example
 * ```typescript
 * import { createCodeMode } from '@tanstack/ai-code-mode'
 * import { createNodeIsolateDriver } from '@tanstack/ai-isolate-node'
 *
 * const { tool, systemPrompt } = createCodeMode({
 *   driver: createNodeIsolateDriver(),
 *   tools: [weatherTool, dbTool],
 * })
 *
 * chat({
 *   systemPrompts: ['You are a helpful assistant.', systemPrompt],
 *   tools: [tool, ...otherTools],
 * })
 * ```
 */
export declare function createCodeModeSystemPrompt(config: CodeModeToolConfig): string;
