import { WorkspaceBackend } from './backend.js';
export interface SnapshotsOptions {
    /** The workspace folder, an absolute path. */
    root: string;
    /**
     * A folder for the shadow git repositories, an absolute path. Each
     * workspace gets its own repository in it. The project's own `.git` is
     * never used.
     */
    dataDir: string;
    /** Where the files are and git runs. Default: {@link hostBackend}. */
    backend?: WorkspaceBackend;
}
/** The files that one model step changed, between two snapshots. */
export interface SnapshotStep {
    /** The tree id at the start of the step. */
    from: string;
    /** The tree id at the end of the step. */
    to: string;
    /** The changed paths, relative to the workspace, with `/`. */
    files: Array<string>;
    /** The tool calls of the step. `session.revert` reads them. */
    toolCallIds: Array<string>;
}
/**
 * Snapshots of the workspace files at the start and the end of each model
 * step, in a shadow git repository in `dataDir`. Adds two commands:
 *
 * - `/undo`: put the files that the last turn changed back as they were
 *   before it, and remove that turn from the transcript. Other files stay
 *   as they are.
 * - `/redo`: bring back what the last `/undo` removed. A new turn clears it.
 *
 * `session.revert(messageId)` also puts back the files that the tool calls
 * after that message changed, and `session.unrevert()` brings them back.
 *
 * The changed files of each step go to the session log as a
 * `tanstack/snapshots:step` record on a durable host, else to the plugin
 * state. `diff(from, to?)` gives the changed files and a unified diff
 * between two tree ids. Without `to`, it compares with the files now.
 *
 * Needs the git CLI on the backend. Without git, the plugin does nothing.
 *
 * @example
 * ```ts
 * const root = process.cwd()
 * const history = snapshots({ root, dataDir: '/var/lib/agent/snapshots' })
 * defineHarness({ adapter, plugins: () => [workspaceTools({ root }), history] })
 * // `step` is a `tanstack/snapshots:step` record.
 * const { files, patch } = await history.diff(step.from, step.to)
 * ```
 */
export declare function snapshots(options: SnapshotsOptions): import('../..').HarnessPlugin<{
    readonly name: "tanstack/snapshots";
    readonly diff: (from: string, to?: string) => Promise<{
        files: string[];
        patch: string;
    }>;
    readonly provides: readonly [import('@tanstack/ai').Capability<import('../../plugins.js').RevertFilesHandler, "tanstack/revert-files">];
    readonly setup: (ctx: import('../..').PluginSetupContext) => Promise<{
        middleware: {
            name: string;
            optionalRequires: import('@tanstack/ai').Capability<import('@tanstack/ai').LogRecordsWriter, "log-records">[];
            onIteration: (_ctx: import('@tanstack/ai').ChatMiddlewareContext<any>, { iteration }: import('@tanstack/ai').IterationInfo) => Promise<void>;
            onToolPhaseComplete: (ctx: import('@tanstack/ai').ChatMiddlewareContext<any>, { toolCalls }: import('@tanstack/ai').ToolPhaseCompleteInfo) => Promise<void>;
        }[];
        commands: {
            undo: import('../..').CommandDefinition<any>;
            redo: import('../..').CommandDefinition<any>;
        };
    } | undefined>;
}>;
