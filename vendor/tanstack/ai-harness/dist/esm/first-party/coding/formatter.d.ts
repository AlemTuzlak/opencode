import { WorkspaceHooks } from '../workspace-hooks.js';
import { WorkspaceBackend } from './backend.js';
/** What a formatter can check in the project root folder. */
export interface FormatterProject {
    /** The names of the files and folders in the root folder. */
    files: ReadonlyArray<string>;
    /** The text of the file `name` in the root folder, or `''` without one. */
    read: (name: string) => Promise<string>;
}
/** A formatter CLI for some file types. */
export interface Formatter {
    /** A short name, for the warning when it fails. */
    name: string;
    /** The file extensions it formats, with the dot, like `'.ts'`. */
    extensions: ReadonlyArray<string>;
    /**
     * The shell command that formats `file` in place. `file` is the absolute
     * path, already quoted for the shell. Put it in the command as it is.
     */
    command: (file: string) => string;
    /** Does the project use this formatter? Default: yes. */
    when?: (project: FormatterProject) => boolean | Promise<boolean>;
}
export interface FormatterOptions {
    /** The workspace folder. Commands run in it. */
    root: string;
    /** Where the files are and commands run. Default: {@link hostBackend}. */
    backend?: WorkspaceBackend;
    /** Your formatters. They come before the built-in formatters. */
    formatters?: ReadonlyArray<Formatter>;
    /** `false` turns the built-in formatters off. Default: `true`. */
    builtins?: boolean;
    /** The time limit of each run. Default: 20 seconds. */
    timeoutMs?: number;
}
/** A formatter run that failed. The written file stays as it was. */
export interface FormatFailure {
    /** The absolute path of the file. */
    path: string;
    message: string;
}
/** Sent when a formatter fails. The tool call does not fail. */
export declare const FormatFailed: import('../..').PluginEvent<FormatFailure>;
/**
 * The `afterWrite` hook of {@link formatter}. It runs the first formatter
 * that the project uses for the file type. The project is checked at the
 * first write, once. A failure goes to `onFailure` and never throws.
 * `allow` says if the formatter `name` can run on `path`. When it says no,
 * the hook resolves to a note for the tool result.
 */
export declare function formatOnWrite(options: FormatterOptions, onFailure: (failure: FormatFailure) => void, allow?: (name: string, path: string) => Promise<boolean>): (path: string) => Promise<string | void | undefined>;
/**
 * Format each file that `write_file`, `edit_file`, and `patch` write, with
 * the formatter that the project uses for its file type. Use it with
 * `workspaceTools`.
 *
 * At the first write in a session, the plugin checks the config files in
 * `root`, and keeps the result:
 *
 * - prettier: `.prettierrc*`, `prettier.config.*`, or `prettier` in
 *   `package.json`.
 * - biome: `biome.json` or `biome.jsonc`.
 * - oxfmt: `.oxfmtrc*`, or `oxfmt` in the `devDependencies`.
 * - ruff (`.py`): `ruff.toml`, or `[tool.ruff]` in `pyproject.toml`.
 * - gofmt (`.go`): `go.mod`. rustfmt (`.rs`): `Cargo.toml`.
 *
 * Your `formatters` come first. `builtins: false` turns the list above off.
 * Each run is a command through `backend.exec` in `root`, with a time limit
 * (`timeoutMs`, default 20 seconds). A formatter that fails, times out, or
 * is not installed does not fail the tool call: the file stays as written,
 * and the plugin sends a {@link FormatFailed} event.
 *
 * A formatter runs code from the project, like its config files. So with
 * `permissions()`, each run is a command named `formatter:<name>`, for
 * example `formatter:prettier`. It asks like `bash`, also in `acceptEdits`
 * mode. A no skips the formatter, keeps the write, and the tool result says
 * so. Without `permissions()`, the formatter runs without a question.
 *
 * @example
 * ```ts
 * plugins: () => [
 *   workspaceTools({ root }),
 *   formatter({
 *     root,
 *     formatters: [
 *       { name: 'taplo', extensions: ['.toml'], command: (file) => `taplo fmt ${file}` },
 *     ],
 *   }),
 * ]
 * ```
 */
export declare function formatter(options: FormatterOptions): import('../..').HarnessPlugin<{
    readonly name: "tanstack/formatter";
    readonly optionalRequires: readonly [import('@tanstack/ai').Capability<(tool: string, message: string) => Promise<boolean>, "tanstack/permission-prompt">];
    readonly setup: (ctx: import('../..').PluginSetupContext) => {
        contribute: (import('../..').ExtensionItem<import('..').PermissionRule> | import('../..').ExtensionItem<WorkspaceHooks>)[];
    };
}>;
