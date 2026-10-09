import { JournalPaths } from './journal.js';
import { JournalLine } from './journal-bytes.js';
import { SandboxHandle } from './contracts.js';
/**
 * Poll interval for the bounded-`exec` strategy. Matches the interval
 * `ai-sandbox-cloudflare`'s run-log Durable Object already uses, so the two
 * readers have the same latency profile.
 */
export declare const DEFAULT_JOURNAL_POLL_MS = 250;
export interface ReadJournalOptions {
    paths: JournalPaths;
    /**
     * Count of journal bytes already consumed. The read starts at the next byte.
     * Defaults to 0, which is also what a takeover uses: the alignment step, not
     * the reader, decides what has already been delivered.
     */
    fromByte?: number;
    /** Stop reading. On the follow strategy this also kills the `tail`. */
    signal?: AbortSignal;
    /** Override the capability-derived strategy. Tests and diagnostics only. */
    strategy?: 'follow' | 'poll';
    /** Poll strategy only. Defaults to {@link DEFAULT_JOURNAL_POLL_MS}. */
    pollIntervalMs?: number;
    /** Working directory for the read command. Paths are absolute, so rarely needed. */
    cwd?: string;
    /**
     * How long to wait for the FIRST byte of the journal before failing with
     * `'journal-stalled'`. Defaults to {@link DEFAULT_ATTACH_JOURNAL_WAIT_MS} — the
     * same number that bounds the attach preflight, because it bounds the same
     * question from the other side. `0` or a non-finite value disables the bound;
     * do that only where some OTHER deadline already covers the read, since an
     * unbounded read of an empty journal never returns.
     *
     * Only the first byte is bounded. An agent that streams slowly is never cut
     * off.
     */
    firstByteTimeoutMs?: number;
    /**
     * Run id, for the stall error's message only. Defaults to naming the journal
     * path, which is always available and always identifies the run uniquely.
     */
    runId?: string;
}
/**
 * Which read strategy a provider supports.
 *
 * Keyed on capabilities, never on `handle.provider`: a BYO provider with the
 * same limitation must get the same treatment, and name-sniffing would silently
 * hand it an unstoppable `tail -f`.
 */
export declare function journalReadStrategy(handle: SandboxHandle): 'follow' | 'poll';
/**
 * Read a run's journal as positioned lines.
 *
 * **This is a public entry point and it CANNOT hang.** It has no `RunStore` in
 * its signature and no runId to look one up with, so it cannot run the
 * `attach-preflight.ts` gate that classifies a stale or mistyped runId as
 * `'unknown-run'`/`'terminal-run'`; what it has instead is the unconditional
 * bound described in the module doc. A runId with no journal therefore fails with
 * {@link JournalAttachUnavailableError} (`reason: 'journal-stalled'`) after
 * {@link DEFAULT_ATTACH_JOURNAL_WAIT_MS} rather than tailing an empty file it
 * just created, for ever, with no error and no log line. Callers that DO have a
 * store — `runner.ts` on an attach — run the preflight as well, for the sharper
 * diagnosis.
 */
export declare function readJournal(handle: SandboxHandle, options: ReadJournalOptions): AsyncIterable<JournalLine>;
