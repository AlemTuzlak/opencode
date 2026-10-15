import { AnyTool } from '@tanstack/ai';
import { CodeModeTool, CodeModeToolConfig } from './types.js';
export interface CodeModePluginOptions extends Omit<CodeModeToolConfig, 'tools'> {
    /**
     * Which tools move into code mode. Default: every server tool that does
     * not need approval and that `permissions()` allows in plan mode (so no
     * edits, no commands, nothing that asks first). Without `permissions()`,
     * the rules of tool plugins decide. A safe tool with
     * `metadata.codeMode: true`, for example a tool of an `mcp()` server with
     * `codeMode: true`, moves even when `include` does not pick it.
     */
    include?: (tool: CodeModeTool) => boolean;
    /**
     * Make each tool that moves into code mode lazy. The prompt then lists only
     * the tool names, and `lazyToolsConfig.includeDescription` adds part of
     * each description. The model calls `discover_tools` for the signatures of
     * the tools it needs, then calls them in `execute_typescript`. This saves
     * tokens on each turn when there are many tools. Default `false`.
     */
    lazy?: boolean;
}
/**
 * A harness plugin that gives the model an `execute_typescript` tool. The
 * model writes one TypeScript program that calls several tools, and the
 * program runs in the isolate of `driver` (any `@tanstack/ai-isolate-*`
 * driver). The tools it calls leave the model's tool list, including tools
 * that plugins find at run time, such as MCP tools after `/connect`.
 *
 * Calls inside the isolate do not stop for approval, so by default only
 * tools that are safe to run without a question move into code mode. The
 * other tools stay normal tool calls. A tool with `metadata.codeMode: true`
 * moves even when `include` does not pick it, but only when it is safe in
 * the same way. Calls inside the isolate also skip the permission checks,
 * so a tool that declares `PermissionResources` never moves. With
 * `lazy: true`, the model gets only the names of the moved tools and asks
 * `discover_tools` for the signatures.
 *
 * @example
 * ```ts
 * import { codeMode } from '@tanstack/ai-code-mode/harness'
 * import { createQuickJSIsolateDriver } from '@tanstack/ai-isolate-quickjs'
 *
 * defineHarness({
 *   name: 'acme/agent',
 *   adapter,
 *   plugins: () => [codeMode({ driver: createQuickJSIsolateDriver() })],
 * })
 * ```
 */
export declare function codeMode(options: CodeModePluginOptions): import('@tanstack/ai-harness').HarnessPlugin<{
    readonly name: "tanstack/code-mode";
    readonly optionalRequires: readonly [import('@tanstack/ai').Capability<(tool: string, mode: import('@tanstack/ai-harness').PermissionMode, resources?: import('@tanstack/ai-harness').CallResources) => import('@tanstack/ai-harness').PermissionDecision, "tanstack/permission-decision">];
    readonly setup: (ctx: import('@tanstack/ai-harness').PluginSetupContext) => {
        prompts: {
            id: string;
            text: () => string;
        }[];
        prepareTools: ({ tools }: {
            tools: ReadonlyArray<AnyTool>;
            model: string;
        }) => readonly AnyTool[] | (import('@tanstack/ai').ServerTool<import('@tanstack/ai').SchemaInput, import('@tanstack/ai').SchemaInput, string, unknown, false, undefined> | AnyTool)[];
    };
}>;
