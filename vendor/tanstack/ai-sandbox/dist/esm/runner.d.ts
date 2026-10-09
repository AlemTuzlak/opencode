import { ProcessOptions, SandboxHandle } from './contracts.js';
import { RunStore } from '@tanstack/ai';
export interface SpawnNdjsonOptions extends ProcessOptions {
    /**
     * Called for each raw stdout line that is non-empty but fails JSON parsing
     * (e.g. a CLI banner). Defaults to ignoring it. Stderr is never parsed.
     */
    onNonJsonLine?: (line: string) => void;
    /**
     * Written to the process stdin (then stdin is closed) right after spawn —
     * e.g. the agent prompt for `claude -p`. Avoids putting the prompt in argv.
     */
    input?: string;
    /**
     * Route the agent's stdout through an in-sandbox journal rather than holding
     * its pipe directly.
     *
     * This is what makes a run survive host death: with nothing piped, there is
     * no reader whose disappearance can SIGPIPE the agent, and a later host reads
     * the same file from byte 0. Opt-in so every existing caller (and every
     * existing test) is unaffected.
     */
    journal?: JournalOptions;
}
/** Journaling configuration for {@link spawnNdjson}. */
export interface JournalOptions {
    /** Run id the journal path is derived from. Must match across hosts. */
    runId: string;
    /** Journal directory. Defaults to `/tmp/tanstack-runs`. */
    dir?: string;
    /**
     * Read an EXISTING journal instead of starting the agent. The read still
     * begins at byte 0 — the alignment step, not the reader, decides what has
     * already been delivered.
     */
    attach?: boolean;
    /** Poll interval for providers that cannot follow. */
    pollIntervalMs?: number;
    /**
     * Run record store, consulted ONLY on an attach and only when the journal is
     * absent, to tell "not written yet" from "will never be written" (see
     * `attach-preflight.ts`). Optional so an attach with no store wired keeps the
     * bounded wait while losing the unknown/terminal classification.
     */
    runs?: RunStore;
    /**
     * Bounded wait for a live run's journal to appear on an attach, AND — on every
     * path, attach or fresh — the bound on the read's first byte
     * (`ReadJournalOptions.firstByteTimeoutMs`). One knob for both because they
     * bound the same question from two sides: the preflight covers "the file does
     * not exist", the read covers "the file exists but nothing is writing to it",
     * and a caller that widens one always means to widen the other.
     *
     * Defaults to `DEFAULT_ATTACH_JOURNAL_WAIT_MS`.
     */
    attachWaitMs?: number;
}
type JournaledOptions = SpawnNdjsonOptions & {
    journal: JournalOptions;
};
/** Split a stream of arbitrary string chunks into complete lines. */
export declare function toLines(chunks: AsyncIterable<string>): AsyncIterable<string>;
/**
 * Start the agent with its stdout (and the `{"__exit":N}` sentinel) redirected
 * into the journal, then return.
 *
 * Deliberately does NOT wait for the process and does NOT read its stdout: the
 * whole point of journaling is that the host holds no handle on the agent's
 * output, so a host that dies mid-run cannot take the agent down with it (no
 * pipe to SIGPIPE). The spawned process is left running in the sandbox; the
 * sentinel line the wrapper appends on exit is how anyone — this host or a
 * successor — learns it finished. Stdin is still written directly to the
 * spawned process, exactly as the unjournaled path does, since that transport
 * is unaffected by where stdout goes.
 */
export declare function startJournaledAgent(handle: SandboxHandle, command: string, options: JournaledOptions): Promise<void>;
/**
 * Read a run's journal and yield each line parsed as JSON.
 *
 * Always reads from byte 0 — the alignment step (a later phase), not this
 * reader, decides what a client has already seen. Stops at the `{"__exit":N}`
 * sentinel, and throws for a non-zero N so the calling adapter's existing
 * `catch` turns it into a `RUN_ERROR`, the same observable outcome the
 * unjournaled path produces from a non-zero `wait()`. There is nothing to
 * `wait()` on here: the host holds a `tail`, not the agent process, so the
 * sentinel line IS the exit code.
 *
 * The sentinel is also what bounds journal growth: reaching it means the run is
 * terminal, and a terminal run's record is the event log, so both journal files
 * are deleted before this iterable finishes. The ordering below is load-bearing
 * and is asserted, not merely commented:
 *
 * - The sentinel is captured and the loop is `break`-ed, so the source's
 *   `finally` kills the `tail` BEFORE the `rm` runs — the reader is stopped, then
 *   its input is deleted, never the other way round.
 * - `exitCode` stays `undefined` if the journal stream ends without a sentinel.
 *   NOTHING is deleted on that path either way — the run may be mid-flight and a
 *   successor host may still need every byte — but the two causes are then
 *   separated by `options.signal.aborted`: an aborted consumer returns quietly,
 *   while a stream that died on its own (killed `tail`, destroyed sandbox, torn
 *   pipe) THROWS. Returning for both is how a truncated read used to reach the
 *   client as a normally-completing run.
 * - A non-zero sentinel deletes too. The run is terminal either way.
 * - The stderr sidecar is read BEFORE the deletion that destroys it, so a
 *   non-zero exit carries up to {@link STDERR_ERROR_CHARS} chars of the agent's
 *   own diagnostics, exactly as the unjournaled path below does. That closes the
 *   "Known regression" this function used to document; the read is bounded and
 *   failure-swallowing (see {@link readStderrTail}), so it cannot turn a run
 *   failure into a cleanup failure.
 *
 * On an ATTACH (`journal.attach === true`) the read is preceded by
 * {@link awaitAttachableJournal}, which fails fast for a runId the store does not
 * know or has already terminalized and otherwise waits a BOUNDED time for a live
 * run's journal to appear. Without it, an attach to a runId with no journal
 * created an empty one (`journalFollowCommand` does that deliberately) and tailed
 * it forever — no sentinel, no error, no timeout.
 *
 * One case this does NOT bound: a run that reaches its sentinel while DETACHED
 * has no host reading it, so nothing observes the sentinel and nothing here
 * runs. Sweeping those is `pruneJournals`' job (`journal-sweep.ts`): it consults
 * the run store's status for each journal it finds and deletes only the terminal
 * ones, from a cron the application schedules rather than from a run.
 */
export declare function readJournalNdjson(handle: SandboxHandle, options: JournaledOptions): AsyncIterable<unknown>;
/**
 * Spawn `command` in the sandbox and yield each stdout line parsed as JSON.
 *
 * Without `options.journal`, behavior is byte-identical to before: resolves
 * the spawn handle's exit via `wait()` after stdout closes; a non-zero exit
 * with no events surfaced is the adapter's concern to detect.
 *
 * With `options.journal`, the agent's stdout is redirected into an in-sandbox
 * journal (unless `journal.attach` is set, meaning a run already in flight)
 * and then read back from byte 0 — one code path for a fresh run and an
 * attach, both going through {@link readJournalNdjson}.
 */
export declare function spawnNdjson(handle: SandboxHandle, command: string, options?: SpawnNdjsonOptions): AsyncIterable<unknown>;
export {};
