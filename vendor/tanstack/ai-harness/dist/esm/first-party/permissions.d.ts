import { MetadataStore } from '@tanstack/ai';
export type PermissionDecision = 'allow' | 'ask' | 'deny';
/** A rule for one tool. `kind` lets the modes treat edits and commands differently. */
export interface PermissionRule {
    /** A tool name. A trailing `*` matches a prefix, for example `git_*`. */
    tool: string;
    /**
     * A glob on what the call touches: a path for file tools (`src/**`,
     * relative to the root), or a command part for shell tools (`git *`).
     * Without it, the rule matches every call of the tool.
     */
    resource?: string;
    decision: PermissionDecision;
    kind?: 'read' | 'edit' | 'execute';
}
/**
 * Tool plugins add their rules here. `permissions()` reads them, and adds its
 * own `rules` too, so other readers like `codeMode()` see them.
 */
export declare const PermissionRules: import('..').ExtensionPoint<PermissionRule>;
/**
 * What the calls of one tool touch. Each function gets the raw input the
 * model sent, before the schema check. A function that throws refuses the
 * call.
 */
export interface ToolResources {
    /** The files the call reads or writes, relative to the root or absolute. */
    paths?: (input: unknown) => ReadonlyArray<string>;
    /** The shell commands the call runs, one part for each simple command. */
    commands?: (input: unknown) => ReadonlyArray<string>;
}
/**
 * Tool plugins say what each call touches, so rules with a `resource` can
 * match it. Each item maps tool names to their resources, for example
 * `PermissionResources.item({ read_file: { paths: (input) => [...] } })`.
 */
export declare const PermissionResources: import('..').ExtensionPoint<Readonly<Record<string, ToolResources>>>;
export declare const PERMISSION_MODES: readonly ["default", "plan", "acceptEdits", "bypass"];
export type PermissionMode = (typeof PERMISSION_MODES)[number];
/**
 * What `permissions()` decides for a call of `tool` in `mode`. With
 * `resources`, for a call that touches them. Without, for a call that
 * declares no `PermissionResources`. It uses all rules in their order, the
 * `default`, and the `root`. Other plugins, like `codeMode()` and
 * `workspaceTools()`, ask it. Saved answers are not used: they only allow
 * more, so an answer here is never looser than a call.
 */
export declare const PermissionDecisionCapability: import('@tanstack/ai').Capability<(tool: string, mode: PermissionMode, resources?: CallResources) => PermissionDecision, "tanstack/permission-decision">;
/**
 * @internal Ask the rules of `permissions()` about `tool`, an action that is
 * not a tool call, like `formatter:prettier`. It uses the saved answers. On
 * `ask`, it asks the user with `message`, and saves an `always` answer.
 * Resolves to `true` when the action can run. The package does not export it.
 */
export declare const PermissionPrompt: import('@tanstack/ai').Capability<(tool: string, message: string) => Promise<boolean>, "tanstack/permission-prompt">;
/** Is the user's answer a yes: `true`, `y`, or `yes`? */
export declare function isYes(answer: unknown): boolean;
/**
 * True when a command part still has shell syntax that can run or chain
 * more commands (`$(`, a backtick, `;`, `&`, `|`, `<`, `>`, a new line), so
 * no allow rule applies to it.
 */
export declare function isUnsplittableCommand(part: string): boolean;
/** What one call touches, as a tool's `ToolResources` returns it. */
export interface CallResources {
    paths?: ReadonlyArray<string>;
    commands?: ReadonlyArray<string>;
}
/**
 * The decision for a tool call in a mode. The last matching rule wins.
 *
 * - With `resources`, each path and command part is checked, and every one
 *   must be allowed. A path outside `root`, a `.env` file, or a path that
 *   cannot be resolved asks, unless a rule with a `resource` allows it. A
 *   command part with shell syntax (see `isUnsplittableCommand`) never gets
 *   an allow.
 * - Without `resources`, the call could touch anything, so a later rule
 *   with a `resource` that asks or denies counts too.
 *
 * Modes: `bypass` allows all. `plan` denies edits, commands, and every call
 * that is not an allow. `acceptEdits` allows edits that would ask.
 */
export declare function decidePermission(rules: ReadonlyArray<PermissionRule>, tool: string, mode: PermissionMode, options?: {
    fallback?: PermissionDecision;
    resources?: CallResources;
    /** The workspace root. Without it, no path counts as outside. */
    root?: string;
}): "ask" | "allow" | "deny";
/**
 * The rules that `always` answers saved for `project`, in the saved order.
 * `project` is the `root` of `permissions()`. `stores` is the persistence
 * of the host, for example `persistence.stores`. Without a metadata store,
 * it resolves to an empty list.
 */
export declare function listSavedPermissions(stores: {
    metadata?: MetadataStore;
}, project: string | undefined): Promise<never[] | PermissionRule[]>;
/**
 * Delete one saved rule of `project`. The rule matches by its fields, as
 * `listSavedPermissions` gives them. An unknown rule does nothing. New
 * sessions stop using the rule. Open sessions can keep it until they open
 * again.
 */
export declare function deleteSavedPermission(stores: {
    metadata?: MetadataStore;
}, project: string | undefined, rule: PermissionRule): Promise<void>;
/**
 * Check every tool call against permission rules, with a `mode` setting and a
 * `/mode` command:
 *
 * - `default`: rules apply as written. `ask` asks the user.
 * - `plan`: read-only. Edits and commands are denied.
 * - `acceptEdits`: edits run without asking. Commands still ask.
 * - `bypass`: everything runs.
 *
 * Rules apply in this order, and the last match wins: rules from tool
 * plugins (`PermissionRules`), then `rules`, then saved answers. A saved
 * answer never beats a deny. Tool plugins say what a call touches through
 * `PermissionResources`. A path outside `root` or a `.env` file asks, unless
 * a rule with a `resource` allows it. A tool whose last rule denies with no
 * `resource` is removed from the model's tools.
 *
 * A question takes `once`, `always`, or `reject` with a `message` for the
 * model. `always` saves an allow rule for each path or command part of the
 * call, for the project (`root`), in the metadata store, else in memory for
 * the session. `/permissions` lists the saved rules, and
 * `/permissions forget <n>` deletes one.
 */
export declare function permissions(options?: {
    rules?: ReadonlyArray<PermissionRule>;
    default?: PermissionDecision;
    /**
     * The workspace root. A path outside it asks, and saved answers belong
     * to it. Without it, no path counts as outside.
     */
    root?: string;
}): import('..').HarnessPlugin<{
    readonly name: "tanstack/permissions";
    readonly provides: readonly [import('@tanstack/ai').Capability<(tool: string, mode: PermissionMode, resources?: CallResources) => PermissionDecision, "tanstack/permission-decision">, import('@tanstack/ai').Capability<(tool: string, message: string) => Promise<boolean>, "tanstack/permission-prompt">];
    readonly setup: (ctx: import('..').PluginSetupContext) => {
        config: {
            mode: {
                type: "select";
                options: ReadonlyArray<string>;
                default: string;
                description?: string;
                category?: string;
            };
        };
        prompts: {
            id: string;
            text: () => "" | "You are in plan mode. Do not change files or run commands. Read what you need, then describe your plan.";
        }[];
        commands: {
            mode: import('..').CommandDefinition<any>;
            permissions: import('..').CommandDefinition<any>;
        };
        prepareTools: ({ tools }: {
            tools: ReadonlyArray<import('@tanstack/ai').AnyTool>;
            model: string;
        }) => import('@tanstack/ai').AnyTool[];
        contribute: import('..').ExtensionItem<PermissionRule>[];
        middleware: {
            name: string;
            onBeforeToolCall: (run: import('@tanstack/ai').ChatMiddlewareContext<any>, hook: import('@tanstack/ai').ToolCallHookContext) => Promise<{
                type: "skip";
                result: {
                    error: string;
                };
            } | undefined>;
        }[];
        agentMiddleware: {
            name: string;
            onBeforeToolCall: (run: import('@tanstack/ai').ChatMiddlewareContext<any>, hook: import('@tanstack/ai').ToolCallHookContext) => Promise<{
                type: "skip";
                result: {
                    error: string;
                };
            } | undefined>;
        }[];
    };
}>;
