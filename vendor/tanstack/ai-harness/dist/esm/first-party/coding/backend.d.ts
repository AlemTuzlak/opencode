import { WorkspaceHooks } from '../workspace-hooks.js';
import * as nodePath from 'node:path';
/**
 * Where the workspace tools read and write files and run commands. Every
 * path is absolute. {@link hostBackend} is this machine. Another backend, for
 * example a sandbox, lets the same tools work there.
 */
export interface WorkspaceBackend {
    /**
     * The shell that runs the commands: `'sh'` (a POSIX shell) or `'cmd'`
     * (Windows `cmd.exe`). The tools quote arguments for it. It also sets the
     * path style: POSIX paths for `'sh'`, Windows paths for `'cmd'`. Without
     * it, arguments are quoted for `sh`, and paths have the style of this
     * machine. A Linux sandbox sets `'sh'`, so its root `/workspace` stays a
     * POSIX path on a Windows host.
     */
    shell?: 'sh' | 'cmd';
    /** The bytes of a file. Throws when there is no file. */
    readFile: (path: string) => Promise<Uint8Array>;
    /** Create or replace a file. Missing parent folders are created. */
    writeFile: (path: string, data: Uint8Array | string) => Promise<void>;
    /**
     * Remove one file. Throws when there is no file, or for a folder. Optional:
     * without it, the `patch` tool cannot delete or move files.
     */
    remove?: (path: string) => Promise<void>;
    /** A file or a folder, or `undefined` when nothing is at `path`. */
    stat: (path: string) => Promise<{
        type: 'file' | 'dir';
        size: number;
        mtimeMs: number;
    } | undefined>;
    /**
     * The real path of `path`, with every link resolved, or `undefined` when
     * nothing is at `path`. Throws for a link to a target that is not there.
     * The tools use it to refuse a link that leads out of the workspace.
     * Optional: without it, the tools do not check links.
     */
    realpath?: (path: string) => Promise<string | undefined>;
    /**
     * The entries of a folder. A symbolic link (or a Windows junction) has
     * the type `'link'`, whatever it points to. The tools do not follow it.
     */
    readdir: (path: string) => Promise<Array<{
        name: string;
        type: 'file' | 'dir' | 'link';
    }>>;
    /**
     * Run a shell command and wait for it to end. `env` is added to the
     * environment. A command that fails resolves with its exit code.
     */
    exec: (command: string, options?: {
        cwd?: string;
        env?: Record<string, string>;
        timeoutMs?: number;
        signal?: AbortSignal;
    }) => Promise<{
        exitCode: number;
        stdout: string;
        stderr: string;
    }>;
    /**
     * Start a shell command in the background. `output()` is stdout and
     * stderr so far. Optional: without it, background commands give an error.
     */
    spawn?: (command: string, options?: {
        cwd?: string;
        env?: Record<string, string>;
    }) => {
        wait: () => Promise<{
            exitCode: number;
        }>;
        kill: () => void;
        output: () => string;
    };
}
/** What each workspace tool gets from `workspaceTools()`. */
export interface ToolEnv {
    backend: WorkspaceBackend;
    /** The workspace folder, an absolute path. */
    root: string;
    /** The hooks that plugins added. Read them when the tool runs. */
    hooks: () => ReadonlyArray<WorkspaceHooks>;
    /** Run `fn` when the work before it on `path` is done, one at a time. */
    lock: <T>(path: string, fn: () => Promise<T>) => Promise<T>;
    /**
     * The absolute path of `path`, a file or a folder. A path outside the
     * workspace is refused, or needs the user's yes for its folder. The check
     * uses the real path, so a link that leads out counts as outside.
     */
    reach: (path: string, tool: string, kind: 'file' | 'folder') => Promise<string>;
    /** A path for the model: from the workspace, or the full path outside it. */
    shown: (full: string) => string;
    /**
     * A test for the files in `folder`, a path from `reach`. It takes a path
     * from `folder` with `/`, and is true when the permission rules protect
     * the file: a `read_file` of it, by its path or its real path, would ask
     * or be denied. `undefined` without `permissions()`.
     */
    protectedIn?: (folder: string) => Promise<((path: string) => boolean) | undefined>;
}
/**
 * The path functions for the paths of `backend`: POSIX for a `'sh'`
 * backend, Windows for a `'cmd'` backend. Without `shell`, the functions of
 * this machine.
 */
export declare function pathsOf(backend: WorkspaceBackend): nodePath.PlatformPath;
/**
 * The environment of a command: the environment of this process, plus
 * `env`. Without `env` off Windows: `undefined`, so the command gets the
 * environment of this process. On Windows it sets
 * `NoDefaultCurrentDirectoryInExePath`. Then `cmd.exe` takes a program
 * name like `rg` from the PATH only, and not from the current folder, where
 * a cloned repo can put an `rg.cmd`.
 */
export declare function commandEnv(env: Record<string, string> | undefined, platform: NodeJS.Platform): {
    [x: string]: string | undefined;
    TZ?: string | undefined;
} | {
    NoDefaultCurrentDirectoryInExePath: string;
    TZ?: string | undefined;
} | undefined;
/**
 * The workspace on this machine, with `node:fs` and `node:child_process`.
 * Commands run in the system shell. `exec` gives exit code 124, like GNU
 * `timeout`, when the timeout stops a command or the output is over 10 MiB.
 * It gives 1 when the signal stops a command, or the command did not
 * start. A stopped command is stopped with every command it started.
 */
export declare const hostBackend: {
    shell: "sh" | "cmd";
    readFile: (path: string) => Promise<NonSharedBuffer>;
    writeFile: (path: string, data: string | Uint8Array<ArrayBufferLike>) => Promise<void>;
    remove: (path: string) => Promise<void>;
    stat: (path: string) => Promise<{
        type: "file" | "dir";
        size: number;
        mtimeMs: number;
    } | undefined>;
    realpath: (path: string) => Promise<string | undefined>;
    readdir: (path: string) => Promise<{
        name: string;
        type: "link" | "file" | "dir";
    }[]>;
    exec: (command: string, options?: {
        cwd?: string;
        env?: Record<string, string>;
        timeoutMs?: number;
        signal?: AbortSignal;
    } | undefined) => Promise<{
        exitCode: number;
        stdout: string;
        stderr: string;
    }>;
    spawn: (command: string, options?: {
        cwd?: string;
        env?: Record<string, string>;
    } | undefined) => {
        wait: () => Promise<{
            exitCode: number;
        }>;
        kill: () => void;
        output: () => string;
    };
};
/** Cut text after 20,000 characters, and say how many were cut. */
export declare function clip(text: string): string;
/** The string argument `key` of a tool call. Throws when it is not a string. */
export declare function stringArg(args: unknown, key: string): string;
/** The string argument `key` of a tool call, or `undefined`. */
export declare function optionalString(args: unknown, key: string): string | undefined;
/** The text of the file at `path`, as UTF-8. */
export declare function readText(backend: WorkspaceBackend, path: string): Promise<string>;
/**
 * Run the `afterWrite` hooks for `path`, one after another. Resolves to the
 * texts that the hooks return, for the tool result.
 */
export declare function afterWrite(env: ToolEnv, path: string): Promise<string[]>;
