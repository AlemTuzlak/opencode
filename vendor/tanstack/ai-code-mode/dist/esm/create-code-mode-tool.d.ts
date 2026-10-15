import { z } from 'zod';
import { ServerTool } from '@tanstack/ai';
import { CodeModeToolConfig } from './types.js';
/**
 * Schema for the execute_typescript tool input
 */
declare const executeTypescriptInputSchema: z.ZodObject<{
    typescriptCode: z.ZodString;
}, z.core.$strip>;
/**
 * Schema for the execute_typescript tool output
 */
declare const executeTypescriptOutputSchema: z.ZodObject<{
    success: z.ZodBoolean;
    result: z.ZodOptional<z.ZodUnknown>;
    logs: z.ZodOptional<z.ZodArray<z.ZodString>>;
    error: z.ZodOptional<z.ZodObject<{
        message: z.ZodString;
        name: z.ZodOptional<z.ZodString>;
        line: z.ZodOptional<z.ZodNumber>;
        stack: z.ZodOptional<z.ZodString>;
    }, z.core.$strip>>;
}, z.core.$strip>;
export type ExecuteTypescriptInput = z.infer<typeof executeTypescriptInputSchema>;
export type ExecuteTypescriptOutput = z.infer<typeof executeTypescriptOutputSchema>;
/**
 * Create an execute_typescript tool that can be used alongside other agent tools.
 *
 * This tool allows an LLM to execute TypeScript code in a secure sandbox.
 * Tools passed in the config become `external_*` functions available inside the sandbox.
 *
 * @example
 * ```typescript
 * import { createCodeMode } from '@tanstack/ai-code-mode'
 * import { createNodeIsolateDriver } from '@tanstack/ai-isolate-node'
 *
 * const { tool, systemPrompt } = createCodeMode({
 *   driver: createNodeIsolateDriver(),
 *   tools: [weatherTool, dbTool],  // Become external_fetchWeather, external_dbQuery
 *   timeout: 30000,
 * })
 *
 * chat({
 *   systemPrompts: [myPrompt, systemPrompt],
 *   tools: [tool, searchTool, emailTool],
 *   messages,
 * })
 * ```
 */
export declare function createCodeModeTool(config: CodeModeToolConfig): ServerTool<typeof executeTypescriptInputSchema, typeof executeTypescriptOutputSchema, 'execute_typescript'>;
export {};
