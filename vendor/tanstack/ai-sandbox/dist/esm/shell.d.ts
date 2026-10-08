import { SandboxHandle } from './contracts.js';
/** The surface the bootstrap engine uses. */
export interface BootstrapShell {
    /** Run a shell command and capture its stdout + exit code. */
    run: (command: string) => Promise<{
        exitCode: number;
        stdout: string;
    }>;
    /**
     * Snapshot the shell's current working directory and exported environment.
     * Used to fork parallel exec calls that inherit the serial shell's state.
     */
    forkState: () => Promise<{
        cwd: string;
        env: Record<string, string>;
    }>;
    /** End the shell session (closes stdin, kills the process). */
    dispose: () => Promise<void>;
}
/** Options for {@link createBootstrapShell}. */
export interface BootstrapShellOptions {
    /** Working directory to start the shell in (passed as ProcessOptions.cwd). */
    cwd?: string;
    /**
     * Belt-and-braces deadline for a single `run()` to see its sentinel. The
     * primary termination condition is the stdout stream ending (see
     * {@link createBootstrapShell}); this only catches a shell that is alive,
     * silent, and never going to answer. Generous by default because setup steps
     * legitimately run for a long time (`npm install`, image pulls).
     */
    commandTimeoutMs?: number;
}
/**
 * Spawn one `sh` process and return a {@link BootstrapShell} that drives it
 * via the sentinel-echo protocol.
 *
 * Protocol: for each `run(cmd)` call, we write
 *   `<cmd>; printf "\n__BSSH_<N>__ $?\n"` to stdin, then read stdout lines
 * until we see a line matching `__BSSH_<N>__ <exitCode>`. Everything before
 * that line is the command's stdout; the trailing integer is the exit code.
 * The counter `N` is a module-level monotonic integer — no Date.now / random.
 */
export declare function createBootstrapShell(handle: SandboxHandle, opts?: BootstrapShellOptions): Promise<BootstrapShell>;
/**
 * Exec-backed {@link BootstrapShell} for providers WITHOUT a writable stdin.
 *
 * There is no persistent process to feed commands into, so persistence of `cd`
 * and exported variables is reproduced by threading state across discrete
 * {@link SandboxHandle.process.exec} calls: each `run()` executes the command in
 * the tracked cwd+env, then captures the resulting `pwd` and `export -p` (via
 * marker lines) so the NEXT command inherits any directory change or exports.
 */
export declare function createExecBootstrapShell(handle: SandboxHandle, opts?: BootstrapShellOptions): BootstrapShell;
