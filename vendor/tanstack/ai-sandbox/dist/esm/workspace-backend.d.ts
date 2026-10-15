import { ExecResult, SandboxHandle } from './contracts.js';
/**
 * A `WorkspaceBackend` over a live sandbox. With it, `workspaceTools()`
 * reads and writes files and runs commands in the sandbox, not on this
 * machine. You start the sandbox before, and you stop it after.
 *
 * - Paths are POSIX paths in the sandbox, like `/workspace/src/a.ts`.
 * - `exec` gives exit code 124 when `timeoutMs` stops a command, and 1 when
 *   `signal` stops it. A sandbox with `capabilities.killableProcesses` off
 *   cannot stop the command, so it continues in the sandbox.
 * - `spawn` is there only when the sandbox has
 *   `capabilities.backgroundProcesses`.
 * - `stat` gives `mtimeMs: 0`. The sandbox file system does not give the
 *   time of the last change.
 * - There is no `realpath`, so the tools do not check where links go.
 *
 * @param handle - The sandbox, from `provider.create()` or `provider.resume()`.
 *
 * @example
 * ```ts
 * const handle = await localProcessSandbox().create({})
 * workspaceTools({
 *   root: '/workspace',
 *   backend: sandboxWorkspaceBackend(handle),
 * })
 * ```
 */
export declare function sandboxWorkspaceBackend(handle: SandboxHandle): {
    spawn?: ((command: string, options?: {
        cwd?: string;
        env?: Record<string, string>;
    }) => {
        wait: () => Promise<{
            exitCode: number;
        }>;
        kill: () => void;
        output: () => string;
    }) | undefined;
    shell: "sh";
    readFile: (path: string) => Promise<Uint8Array<ArrayBufferLike>>;
    writeFile: (path: string, data: string | Uint8Array<ArrayBufferLike>) => Promise<void>;
    remove: (path: string) => Promise<void>;
    stat: (path: string) => Promise<{
        type: "file" | "dir";
        size: number;
        mtimeMs: number;
    } | undefined>;
    readdir: (path: string) => Promise<{
        name: string;
        type: "link" | "file" | "dir";
    }[]>;
    exec: (command: string, options?: {
        cwd?: string;
        env?: Record<string, string>;
        timeoutMs?: number;
        signal?: AbortSignal;
    } | undefined) => Promise<ExecResult>;
};
