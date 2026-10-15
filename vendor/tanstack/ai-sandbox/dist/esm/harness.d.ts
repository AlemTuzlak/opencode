import { AnyTextAdapter, JSONSchema } from '@tanstack/ai';
import { SandboxMiddlewareOptions } from './middleware.js';
import { SandboxDefinition } from './sandbox.js';
export { sandboxWorkspaceBackend } from './workspace-backend.js';
export interface CodingAgentConfig {
    /** A coding-agent adapter: `claudeCodeText`, `codexText`, `grokBuildText`, `acpCompatibleText`, and more. */
    adapter: AnyTextAdapter;
    /** When the lead model should pick this agent. */
    description: string;
    /** Options for every call, for example Claude Code's `permissionMode`. */
    modelOptions?: Record<string, unknown>;
    /**
     * Options added when the harness `mode` setting is `plan`. Default: Claude
     * Code `{ permissionMode: 'plan' }` and Codex `{ sandboxMode: 'read-only' }`.
     */
    planModelOptions?: Record<string, unknown>;
}
export interface CodingAgentsOptions {
    /** Where the agents work. One sandbox per harness thread (or per agent). */
    sandbox: SandboxDefinition;
    /** The agents, keyed by the tool name the lead model sees. */
    agents: Record<string, CodingAgentConfig>;
    /**
     * `shared` (default): every agent of a thread works in one sandbox, one
     * agent at a time. `per-agent`: each agent gets its own sandbox.
     */
    workspace?: 'shared' | 'per-agent';
    /** Passed to `withSandbox`. Default: a memory instance store. */
    sandboxOptions?: SandboxMiddlewareOptions;
}
/**
 * A harness plugin that lets the lead model hand coding work to Claude Code,
 * Codex, Grok Build, or any ACP agent:
 *
 * - each agent runs in `sandbox`, so nobody wires `withSandbox` by hand;
 * - each agent keeps its own coding session per thread, also after a restart
 *   (`/fresh [agent]` starts over);
 * - the harness `plan` mode starts the agents read-only.
 *
 * @example
 * ```ts
 * codingAgents({
 *   sandbox: defineSandbox({ id: 'code', provider: localProcessSandbox() }),
 *   agents: {
 *     claude_code: { adapter: claudeCodeText('claude-opus-4-8'), description: 'Large refactors' },
 *     codex: { adapter: codexText('gpt-5.5'), description: 'Quick fixes and tests' },
 *   },
 * })
 * ```
 */
export declare function codingAgents(options: CodingAgentsOptions): import('@tanstack/ai-harness').HarnessPlugin<{
    readonly name: "tanstack/coding-agents";
    readonly setup: (ctx: import('@tanstack/ai-harness').PluginSetupContext) => {
        subagents: import('@tanstack/ai').DefinedAgent<string, readonly [], undefined, readonly [], JSONSchema, AsyncIterable<import('@tanstack/ai').AGUIEvent>, undefined>[];
        commands: {
            fresh: import('@tanstack/ai-harness').CommandDefinition<any>;
        };
    };
}>;
