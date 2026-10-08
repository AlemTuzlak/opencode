import { CodeModeToolConfig, CreateCodeModeResult } from './types.js';
/**
 * Create the `execute_typescript` tool, its matching system prompt, and (when
 * any tools are marked `lazy: true`) a `discover_tools` companion tool.
 *
 * @example
 * ```typescript
 * import { createCodeMode } from '@tanstack/ai-code-mode'
 * import { createNodeIsolateDriver } from '@tanstack/ai-isolate-node'
 *
 * const { tools, systemPrompt } = createCodeMode({
 *   driver: createNodeIsolateDriver(),
 *   tools: [weatherTool, rarelyUsedTool], // mark rarelyUsedTool lazy: true
 * })
 *
 * chat({
 *   systemPrompts: [myPrompt, systemPrompt],
 *   tools: [...tools, ...otherTools],
 *   messages,
 * })
 * ```
 */
export declare function createCodeMode(config: CodeModeToolConfig): CreateCodeModeResult;
