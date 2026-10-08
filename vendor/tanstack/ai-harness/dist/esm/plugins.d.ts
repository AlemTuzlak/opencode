import { CapabilityRegistry, AgentProduces, AnyChatMiddleware, AnyGenerationMiddleware, AnyTextAdapter, AnyTool, Capability, CapabilityHandle, KeyedAdapter, MetadataStore, ModelMessage, ProviderKeys } from '@tanstack/ai';
import { AgentInputOf, AgentRegistry, AgentRegistryView, AgentResultOf, AnyAgent } from './agents.js';
import { AgentRun, Operation, TurnInfo } from './types.js';
import { CredentialsAccess } from './auth.js';
import { AnyCommand, PluginSessionApi } from './commands.js';
import { ConfigOption } from './config.js';
import { ExtensionItem, ExtensionPoint, PluginEvent } from './extensions.js';
/**
 * How long a plugin's `setup` result and resources live:
 * - `session` (default): from session open to session close. Resources such
 *   as an index, a watcher, or an LSP server stay up across turns.
 * - `turn`: set up for each chat turn, disposed when that turn ends.
 * - `run`: deprecated, the old name of `turn`. It works the same.
 */
export type PluginLifetime = 'session' | 'turn' | 'run';
/**
 * A prompt a plugin contributes. `id` must be unique in the session. A
 * function `text` is called for each turn, so it can show current state.
 */
export interface PluginPrompt {
    id: string;
    text: string | (() => string);
}
/** What a plugin's `setup` returns. Every field is optional. */
export interface PluginContributions {
    /** Tools for the main model. */
    tools?: ReadonlyArray<AnyTool>;
    /** System prompt text for every chat turn. A function runs for each turn. */
    prompts?: ReadonlyArray<string | (() => string) | PluginPrompt>;
    /** Chat middleware, the same type as `chat({ middleware })`. */
    middleware?: ReadonlyArray<AnyChatMiddleware>;
    /**
     * Chat middleware for every agent run: subagents, background agents, and
     * their children. Not the lead turn: add the same middleware to
     * `middleware` for that.
     */
    agentMiddleware?: ReadonlyArray<AnyChatMiddleware>;
    /** Middleware for the activities agents call (`ctx.generateImage`, ...). */
    generationMiddleware?: ReadonlyArray<AnyGenerationMiddleware>;
    /** Agents added to `session.agents`. `routing.router` can pick them. */
    agents?: ReadonlyArray<AnyAgent>;
    /**
     * Agents the main model can call as tools, merged into the turn's
     * `chat({ subagents })` after `defineHarness({ subagents })`. They are
     * also added to `session.agents`.
     */
    subagents?: ReadonlyArray<AnyAgent>;
    /** User actions, keyed by name. Run with `session.command(name, input)`. */
    commands?: Record<string, AnyCommand>;
    /** Session settings, keyed by name. Read with `ctx.config.get(name)`. */
    config?: Record<string, ConfigOption>;
    /** Items for extension points that other plugins read. */
    contribute?: ReadonlyArray<ExtensionItem>;
    /**
     * Pick the main-loop adapter for the next turn, or return `undefined` to
     * keep the harness adapter. The last plugin that returns one wins. The
     * session builds a `keyedAdapter(...)` with the user's key. `turn` is the
     * turn that starts: its input, context, and sender. Its
     * `overrides.adapter` wins over every pick.
     */
    adapter?: (turn: TurnInfo) => AnyTextAdapter | KeyedAdapter<AnyTextAdapter> | undefined;
    /**
     * Tools found at run time, for example the tools of an MCP server the user
     * signed in to after the session opened. Called before each chat turn. A
     * name that another tool already uses is skipped.
     */
    discoverTools?: () => ReadonlyArray<AnyTool> | Promise<ReadonlyArray<AnyTool>>;
    /**
     * Change the tool list of a turn: every tool the model gets, after
     * `discoverTools`. Return the new list. Runs before prompts resolve, so a
     * prompt `text()` can describe the tools this returned. Code mode uses it to
     * move tools behind `execute_typescript`. `model` is the model id of the
     * turn's adapter, so the list can differ for each model.
     */
    prepareTools?: (turn: {
        tools: ReadonlyArray<AnyTool>;
        model: string;
    }) => ReadonlyArray<AnyTool> | Promise<ReadonlyArray<AnyTool>>;
}
/** Plugin state that survives restarts, stored in the metadata store. */
export interface PluginState<T> {
    get: () => Promise<T>;
    /** Change the state. On a write conflict, `change` runs again with fresh state. */
    update: (change: (current: T) => T) => Promise<T>;
}
/** Run agents from a plugin: in the foreground, in the background, or as a group. */
export interface PluginAgentActions {
    run: {
        <TAgent extends AnyAgent>(agent: TAgent, input?: AgentInputOf<TAgent>): Operation<AgentResultOf<TAgent>>;
        (name: string, input?: unknown): Operation<unknown>;
    };
    start: {
        <TAgent extends AnyAgent>(agent: TAgent, input?: AgentInputOf<TAgent>, 
        /** See `AgentStartOptions`. */
        options?: {
            wake?: boolean;
            resume?: boolean;
        }): AgentRun<AgentResultOf<TAgent>>;
        (name: string, input?: unknown, 
        /** See `AgentStartOptions`. */
        options?: {
            wake?: boolean;
            resume?: boolean;
        }): AgentRun<unknown>;
    };
    /**
     * Run children together. With `onFailure: 'cancel-siblings'` (default), one
     * failure cancels the others. Every child settles before `group` returns.
     */
    group: <T>(options: {
        onFailure?: 'cancel-siblings' | 'collect';
    }, body: (group: AgentGroup) => Promise<T>) => Promise<T>;
}
/** The children of one `ctx.agents.group` call. */
export interface AgentGroup {
    run: {
        <TAgent extends AnyAgent>(agent: TAgent, input?: AgentInputOf<TAgent>): Promise<AgentResultOf<TAgent>>;
        (name: string, input?: unknown): Promise<unknown>;
    };
    /** Like `run`, but never rejects: resolves with the result or the error. */
    runSettled: {
        <TAgent extends AnyAgent>(agent: TAgent, input?: AgentInputOf<TAgent>): Promise<{
            ok: true;
            value: AgentResultOf<TAgent>;
        } | {
            ok: false;
            error: unknown;
        }>;
        (name: string, input?: unknown): Promise<{
            ok: true;
            value: unknown;
        } | {
            ok: false;
            error: unknown;
        }>;
    };
}
/** What the session gives plugins. */
export interface PluginServices {
    emit: (plugin: string, name: string, value: unknown) => void;
    on: (name: string, handler: (value: unknown) => void) => () => void;
    config: {
        get: (key: string) => unknown;
    };
    state: <T>(plugin: string, initial: T) => PluginState<T>;
    credentials: CredentialsAccess;
    keys: ProviderKeys;
    session: PluginSessionApi;
    agents: PluginAgentActions;
    /** Called after `ctx.commands` adds or removes a command. */
    commandsChanged?: () => void;
}
/**
 * The commands of the session, for a plugin that adds and removes its own
 * commands while the session runs, for example one command for each file in
 * a folder. Commands that never change go in the `commands` of `setup`.
 */
export interface PluginCommands {
    /** Is `name` a command of any plugin of this session? */
    has: (name: string) => boolean;
    /**
     * Add this plugin's command `name`, or replace it. A name that another
     * plugin owns throws. Session views get the new list at once.
     */
    set: (name: string, command: AnyCommand) => void;
    /** Remove this plugin's command `name`. Another plugin's name does nothing. */
    delete: (name: string) => void;
    /**
     * Resolves when every plugin of the session is set up. Wait for it before
     * `has` or `set`: during `setup`, the plugins after this one have not
     * added their commands yet.
     */
    ready: Promise<void>;
}
/** What a plugin's `setup` receives. */
export interface PluginSetupContext {
    /** Resources this plugin owns, with rollback and reverse-order cleanup. */
    resources: {
        acquire: <T>(open: () => T | Promise<T>, close: (resource: T) => unknown) => Promise<T>;
        signal: AbortSignal;
    };
    /** Read a capability another plugin or middleware provided. Throws if absent. */
    get: <T>(capability: Capability<T>) => T;
    /** Read a capability, or `undefined` when nobody provided it. */
    getOptional: <T>(capability: Capability<T>) => T | undefined;
    /** Provide a capability this plugin declared in `provides`. */
    provide: <T>(capability: Capability<T>, value: T) => void;
    /**
     * The agents of this session (harness agents plus earlier plugins'
     * agents): find them, and run them from commands, tools, and hooks.
     * `set` and `delete` change this plugin's agents while the session runs,
     * like `ctx.commands`.
     */
    agents: AgentRegistryView & PluginAgentActions & {
        /**
         * Add this plugin's agent, or replace the one with the same name. A
         * name that another plugin or the harness owns throws.
         */
        set: (agent: AnyAgent, options?: {
            /** Also give the model a tool that runs this agent as a subagent. */
            subagent?: boolean;
        }) => void;
        /**
         * Remove this plugin's agent `name`, also from the subagent tools.
         * Another owner's name does nothing.
         */
        delete: (name: string) => void;
    };
    /**
     * The items other plugins contributed to `point`. The list fills while
     * plugins set up, so read it at run time (in a tool, a command, or a
     * middleware hook), not during `setup`.
     */
    collect: <T>(point: ExtensionPoint<T>) => ReadonlyArray<T>;
    /** Send a typed event to every plugin that listens, and to clients. */
    emit: <T>(event: PluginEvent<T>, value: T) => void;
    /** Listen for a typed event. Returns a function that stops listening. */
    on: <T>(event: PluginEvent<T>, handler: (value: T) => void) => () => void;
    /** This plugin's state, created with `initial` the first time. */
    state: <T>(initial: T) => PluginState<T>;
    /** Session settings. A change applies at the next turn. */
    config: {
        get: (key: string) => unknown;
    };
    /**
     * Credentials of the running turn's sender. Outside a turn: of the
     * principal that opened the session. They are read at each call, so code
     * that runs after its turn ends (a tool of a background agent) gets the
     * sender of the turn that runs at that time. There, use the keys of the
     * agent run (`ctx.keys` in the agent) and, in a command, the `credentials`
     * of its `run` context.
     */
    credentials: CredentialsAccess;
    /**
     * Model provider keys of the same principal as `credentials`: the key saved with
     * `/connect <provider>`, else the provider's env var. Build a
     * `keyedAdapter(...)` with `await ctx.keys.adapter(adapter)` just before
     * the call. A missing key throws `AuthRequiredError`.
     */
    keys: ProviderKeys;
    session: PluginSessionApi;
    /** Add and remove this plugin's commands while the session runs. */
    commands: PluginCommands;
    /**
     * The turn this plugin is set up for: its input, context, and sender. Set
     * only for a plugin with `lifetime: 'turn'`. A session plugin has no turn
     * at setup.
     */
    turn?: TurnInfo;
}
export interface PluginDefinition {
    /** A stable, unique name, for example `'acme/todos'`. */
    name: string;
    lifetime?: PluginLifetime;
    /** Capabilities that an earlier plugin or harness middleware must provide. */
    requires?: ReadonlyArray<CapabilityHandle>;
    /** Capabilities this plugin provides in `setup`. */
    provides?: ReadonlyArray<CapabilityHandle>;
    /** Capabilities used when present. Never an error when missing. */
    optionalRequires?: ReadonlyArray<CapabilityHandle>;
    /** Agent outputs this plugin needs the session to have. */
    needs?: {
        produces?: ReadonlyArray<AgentProduces>;
    };
    setup?: (ctx: PluginSetupContext) => PluginContributions | void | Promise<PluginContributions | void>;
}
declare const PLUGIN_BRAND: unique symbol;
/** A plugin made with {@link definePlugin}. */
export type HarnessPlugin<TDefinition extends PluginDefinition = PluginDefinition> = Readonly<TDefinition> & {
    readonly [PLUGIN_BRAND]: true;
};
/**
 * Define a harness plugin. `setup` returns what the plugin contributes, and
 * closures in it can use the resources it acquired.
 *
 * @example
 * ```ts
 * const today = definePlugin({
 *   name: 'acme/today',
 *   setup: () => ({ prompts: [`Today is ${new Date().toDateString()}.`] }),
 * })
 * ```
 */
export declare function definePlugin<const TDefinition extends PluginDefinition>(definition: TDefinition): HarnessPlugin<TDefinition>;
/** Everything a set of mounted plugins contributes, plus its cleanup. */
export interface MountedPlugins {
    tools: Array<AnyTool>;
    /** Strings, or functions to call for each turn. */
    prompts: Array<string | (() => string)>;
    commands: Map<string, {
        command: AnyCommand;
        owner: string;
    }>;
    config: Map<string, {
        option: ConfigOption;
        owner: string;
    }>;
    /** Contributions to extension points, by point name. */
    extensions: Map<string, Array<{
        value: unknown;
        owner: string;
    }>>;
    adapters: Array<NonNullable<PluginContributions['adapter']>>;
    discoverers: Array<{
        discover: () => ReadonlyArray<AnyTool> | Promise<ReadonlyArray<AnyTool>>;
        owner: string;
    }>;
    preparers: Array<{
        prepare: NonNullable<PluginContributions['prepareTools']>;
        owner: string;
    }>;
    /** The `agents` of the plugins, in plugin order: root agents for routing. */
    agents: Array<AnyAgent>;
    /** Agents plugins give the main model, in plugin order. */
    subagents: Array<AnyAgent>;
    /** Who contributed what, for `session.inspect()`. */
    owners: {
        plugins: Array<{
            name: string;
            lifetime: PluginLifetime;
            requires: Array<string>;
            provides: Array<string>;
        }>;
        tools: Array<{
            name: string;
            owner: string;
        }>;
        /** The owner of each item of `prompts`, at the same index. */
        prompts: Array<{
            id: string;
            owner: string;
        }>;
        /** The owner of each item of `middleware`, at the same index. */
        middleware: Array<string>;
        /** The owner of each item of `adapters`, at the same index. */
        adapters: Array<string>;
    };
    middleware: Array<AnyChatMiddleware>;
    /** Chat middleware for every agent run. See `PluginContributions`. */
    agentMiddleware: Array<AnyChatMiddleware>;
    generationMiddleware: Array<AnyGenerationMiddleware>;
    /**
     * Chat middleware that provides every plugin capability to each chat run,
     * so any chat middleware can read it with `getX(ctx)`. Goes first.
     */
    capabilityBridge: AnyChatMiddleware | undefined;
    /** The capability values, so a run mount can read session capabilities. */
    values: CapabilityValues;
    /** Dispose every plugin scope, newest first. Safe to call twice. */
    dispose: () => Promise<void>;
}
export interface MountEnvironment {
    threadId: string;
    registry: AgentRegistry;
    /** Names already taken by the harness itself. */
    harnessTools: ReadonlyArray<AnyTool>;
    /** Capabilities provided by harness-level middleware. */
    harnessProvides: ReadonlyArray<CapabilityHandle>;
    /** Capability values from an outer mount (session plugins, for a run mount). */
    inherited?: CapabilityValues;
    /** Names taken by an outer mount (session plugins, for a run mount). */
    takenCommands?: ReadonlyMap<string, {
        owner: string;
    }>;
    takenConfig?: ReadonlyMap<string, {
        owner: string;
    }>;
    /** Extension items from an outer mount, visible to `collect`. */
    inheritedExtensions?: ReadonlyMap<string, ReadonlyArray<{
        value: unknown;
        owner: string;
    }>>;
    /** Session services. Tests of the mount alone can leave them out. */
    services?: PluginServices;
    /** The turn of a run mount. Plugins read it as `ctx.turn`. */
    turn?: TurnInfo;
}
/**
 * @internal The metadata store of the session, for first-party plugins that
 * need it outside a chat run (in a command). The package does not export it.
 */
export declare const SessionMetadata: Capability<MetadataStore, "tanstack/session-metadata">;
/**
 * @internal How the snapshots plugin puts files back for `session.revert`.
 * The package does not export it.
 */
export interface RevertFilesHandler {
    /**
     * Put back the files that the tool calls of `hidden` changed. Other files
     * stay as they are. `records` reads the host records of one type from the
     * session log. Resolves to what `unrevert` needs (JSON), or `undefined`
     * when no file changed.
     */
    revert: (hidden: ReadonlyArray<ModelMessage>, records: (type: string) => Promise<Array<Record<string, unknown>>>) => Promise<unknown>;
    /** Put the files back as they were before `revert`. */
    unrevert: (saved: unknown) => Promise<void>;
}
/** @internal See {@link RevertFilesHandler}. */
export declare const RevertFiles: Capability<RevertFilesHandler, "tanstack/revert-files">;
/**
 * @internal Tells first-party plugins whether a revert stands. The session
 * provides it. The package does not export it.
 */
export declare const RevertStanding: Capability<() => boolean, "tanstack/revert-standing">;
/**
 * @internal Aborts when the session closes, not on a reload. Work that
 * belongs to the session, like background `bash` jobs, stops with it. The
 * package does not export it.
 */
export declare const SessionSignal: Capability<AbortSignal, "tanstack/session-signal">;
/**
 * @internal Tells the session that a background job, like a `bash` job,
 * started or ended. A durable session logs it, so recovery can note a job
 * that a crash stopped. The package does not export it.
 */
export declare const BackgroundJobs: Capability<{
    started: (jobId: string) => void;
    ended: (jobId: string) => void;
}, "tanstack/background-jobs">;
/** Capability values provided by plugins, keyed by handle. */
export declare class CapabilityValues {
    private readonly parent?;
    readonly context: {
        capabilities: CapabilityRegistry;
    };
    readonly handles: Array<CapabilityHandle>;
    constructor(parent?: CapabilityValues | undefined);
    provide<T>(handle: Capability<T>, value: T): void;
    get<T>(handle: Capability<T>): T | undefined;
    /** Every handle provided here and in the parent chain. */
    all(): Array<CapabilityHandle>;
}
/**
 * Set up plugins in order and collect what they contribute.
 *
 * Before any `setup` runs: duplicate plugin names, capability name clashes,
 * and missing providers are errors. If a `setup` throws, or a contribution
 * clashes (the same tool, prompt id, or agent name from two owners), every
 * plugin set up so far is disposed newest first, and no chat turn starts.
 */
export declare function mountPlugins(plugins: ReadonlyArray<HarnessPlugin>, env: MountEnvironment): Promise<MountedPlugins>;
export {};
