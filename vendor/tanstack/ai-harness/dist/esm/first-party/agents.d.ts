import { AnyTextAdapter, AnyTool, ChatMiddleware, KeyedAdapter } from '@tanstack/ai';
import { PermissionRule } from './permissions.js';
/** A named agent: its prompt, tools, model, rules, and step limit. */
export interface AgentProfile {
    name: string;
    /** What the agent does. The model reads it to pick a subagent. */
    description: string;
    /**
     * - `primary`: it answers the user's turns. Pick it with `/agent`.
     * - `subagent`: the main model starts it with the `subagent` tool.
     * - `all`: both.
     */
    mode: 'primary' | 'subagent' | 'all';
    /**
     * A model id. `agents({ adapter })` turns it into an adapter. Without it,
     * a primary agent keeps the harness model, and a subagent uses the model
     * of the main turn.
     */
    model?: string;
    /** System prompt text added to each turn of this agent. */
    system?: string;
    /**
     * The tools this agent can call, by name. A `*` matches any text, for
     * example `todo_*`. Without it, the agent gets every tool.
     */
    tools?: ReadonlyArray<string>;
    /**
     * Permission rules that count while this agent is the primary agent.
     * `permissions()` reads them. They do not apply in a subagent run.
     */
    permissions?: ReadonlyArray<PermissionRule>;
    /**
     * The most model calls with tools in one run. The next call gets no tool
     * calls and a note to answer now, and then the run stops.
     */
    steps?: number;
    /**
     * Leave it out of the `/agent` list and the `agent` setting. The model
     * can still start it as a subagent.
     */
    hidden?: boolean;
}
/** The built-in agents: `build`, `plan`, `general`, and `explore`. */
export declare const builtInAgents: ReadonlyArray<AgentProfile>;
/**
 * Named agents, each with its own system prompt, tools, model, permission
 * rules, and step limit.
 *
 * - A primary agent answers the user's turns. Switch it with
 *   `/agent <name>` or the `agent` setting. It applies at the next turn.
 * - A subagent is a child that the main model starts with the `subagent`
 *   tool. For one `subagent` tool, give the harness
 *   `subagents: { agents: [], tool: 'single' }`.
 *
 * The built-in agents are `build` (primary, the default, every tool),
 * `plan` (primary, read-only tools), `general` (subagent, every tool), and
 * `explore` (subagent, read-only tools). See {@link builtInAgents}.
 *
 * @param options.adapter - Turns a model id into an adapter: the `model` of
 *   a profile, or for a subagent without one, the model id of the main turn.
 *   A `keyedAdapter(...)` is built with the user's key.
 * @param options.agents - More profiles. A profile replaces an earlier one
 *   with the same name: built-ins first, then `dirs`, then `agents`.
 * @param options.dirs - Folders of `*.md` agent files. The file name is the
 *   agent name and the body is its system prompt. The frontmatter sets
 *   `description`, `mode` (default `all`), `model`, `tools` (a list),
 *   `steps`, and `hidden`.
 * @param options.builtIns - `false` drops the built-in agents.
 * @param options.default - The primary agent of a new session. Default: the
 *   first primary agent, `build` with the built-ins.
 *
 * @example
 * ```ts
 * const models: Record<string, AnyTextAdapter> = {
 *   'claude-sonnet-4-5': anthropicText('claude-sonnet-4-5'),
 * }
 * agents({
 *   adapter: (model) => models[model] ?? openaiText('gpt-5.5'),
 *   dirs: ['.agents/agents'],
 * })
 * ```
 */
export declare function agents(options: {
    adapter: (model: string) => AnyTextAdapter | KeyedAdapter<AnyTextAdapter>;
    agents?: ReadonlyArray<AgentProfile>;
    dirs?: ReadonlyArray<string>;
    builtIns?: boolean;
    default?: string;
}): import('..').HarnessPlugin<{
    readonly name: "tanstack/agents";
    readonly setup: (ctx: import('..').PluginSetupContext) => Promise<{
        config: {
            agent: {
                type: "select";
                options: ReadonlyArray<string>;
                default: string;
                description?: string;
                category?: string;
            };
        };
        commands: {
            agent: import('..').CommandDefinition<any>;
        };
        prompts: {
            id: string;
            text: () => string;
        }[];
        adapter: () => AnyTextAdapter | KeyedAdapter<AnyTextAdapter> | undefined;
        prepareTools: ({ tools, model }: {
            tools: ReadonlyArray<AnyTool>;
            model: string;
        }) => readonly AnyTool[];
        middleware: ChatMiddleware<unknown, never>[];
        subagents: import('@tanstack/ai').DefinedAgent<string, readonly [], undefined, readonly [], undefined, import('@tanstack/ai').ChatStream, undefined>[];
        contribute: import('..').ExtensionItem<PermissionRule>[];
    }>;
}>;
