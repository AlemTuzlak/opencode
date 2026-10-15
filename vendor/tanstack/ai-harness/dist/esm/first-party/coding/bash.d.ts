import { ToolEnv } from './backend.js';
/**
 * The simple commands in a shell command, so a permission rule can check
 * each one. It splits on `&&`, `||`, `;`, `|`, and new lines that are not
 * in quotes or after a backslash.
 *
 * It fails closed: for `$(`, a backtick, `<(`, `>(`, a heredoc (`<<`), an
 * unquoted `(`, or a quote that does not close, the whole command comes
 * back as one part. The permission rules never allow a part that still has
 * shell syntax in it.
 *
 * @example
 * ```ts
 * splitCommand('ls && rm -rf x') // ['ls', 'rm -rf x']
 * splitCommand('echo $(rm x)') // ['echo $(rm x)']
 * ```
 */
export declare function splitCommand(command: string): string[];
/**
 * The command parts of a `bash` call, for `PermissionResources`. Throws when
 * `command` is not a string, and that refuses the call.
 *
 * @example
 * ```ts
 * PermissionResources.item({ bash: { commands: bashResources } })
 * ```
 */
export declare function bashResources(input: unknown): string[];
/**
 * `bash`: run a shell command in the workspace folder. Every command gets
 * `AGENT=1` in its environment. The model gets the exit code and the last
 * part of the output.
 *
 * With `background: true`, the call returns at once with a job id, and
 * `note` tells the model when the job ends. Background jobs need
 * `env.backend.spawn`. They are killed when `signal` aborts.
 *
 * A command that runs in the foreground supports `detach` of the tool
 * context: the host can move it to the background while it runs.
 */
export declare function bashTools(env: ToolEnv, options?: {
    /** Stop the command after this many milliseconds. Default: 120,000. */
    timeoutMs?: number;
    /** Tells the model that a background job ended. Without it, no one is told. */
    note?: (text: string) => Promise<void>;
    /**
     * When the model gets only the end of the output, the full output is
     * saved in this folder, and the model gets the path. Relative to the
     * workspace, or absolute.
     */
    spillDir?: string;
    /** Kills the background jobs that still run, for example on plugin cleanup. */
    signal?: AbortSignal;
    /** Told when a background job starts and ends. A durable session logs it. */
    jobs?: {
        started: (jobId: string) => void;
        ended: (jobId: string) => void;
    };
}): (import('@tanstack/ai').ServerTool<{
    type: string;
    properties: {
        command: {
            type: string;
        };
        timeoutMs: {
            type: string;
            description: string;
        };
        background: {
            type: string;
            description: string;
        };
    };
    required: string[];
}, undefined, "bash", unknown, false, undefined> & {
    inputSchema: {
        type: string;
        properties: {
            command: {
                type: string;
            };
            timeoutMs: {
                type: string;
                description: string;
            };
            background: {
                type: string;
                description: string;
            };
        };
        required: string[];
    };
    outputSchema: undefined;
    approvalSchema: undefined;
})[];
