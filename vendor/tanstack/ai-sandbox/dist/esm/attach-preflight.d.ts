import { JournalPaths } from './journal.js';
import { SandboxHandle } from './contracts.js';
import { InternalLogger } from '@tanstack/ai/adapter-internals';
import { RunStore } from '@tanstack/ai';
/**
 * How long an attach waits for a live run's journal to appear before failing.
 *
 * User-relevant, hence exported: this bounds how long an attach REQUEST can sit
 * before it answers, so an application that fronts the attach route with its own
 * timeout needs to know the number. Generous relative to the gap between a
 * driver claiming a run and its first journal write (a `spawn` plus one line),
 * and short relative to any sane HTTP timeout. Override per run with
 * `SandboxDurabilityOptions.attachWaitMs`.
 */
export declare const DEFAULT_ATTACH_JOURNAL_WAIT_MS = 10000;
/**
 * How often the bounded wait re-probes for the journal. Not user-facing: it
 * trades a `test -f` per interval for attach latency, and neither number is
 * something an application tunes.
 */
export declare const DEFAULT_ATTACH_PROBE_INTERVAL_MS = 100;
/**
 * Which of the three hopeless-attach cases was hit. Exported so a consumer can
 * branch (a 404 for `'unknown-run'`, a 410 for `'terminal-run'`, a 504 for
 * `'journal-timeout'`) instead of matching on message text.
 */
export type AttachUnavailableReason = 'unknown-run' | 'terminal-run' | 'journal-timeout'
/**
 * The journal EXISTS but produced no bytes at all within the deadline, so no
 * sentinel can be coming and the follow would tail an empty (or abandoned)
 * file forever. Raised by `journal-reader.ts`, not by the preflight: the
 * preflight cannot see this state, because `test -f` succeeds for it.
 *
 * A 504 at an attach route, exactly like `'journal-timeout'`, which is why it
 * shares {@link JournalAttachUnavailableError} — but a distinct value, because
 * the cause is different: `'journal-timeout'` means nobody created the
 * journal, `'journal-stalled'` means somebody did and then stopped (a
 * SIGKILLed agent shell, a destroyed sandbox, a reader that created the file
 * itself on a fail-open path).
 */
 | 'journal-stalled';
/**
 * An attach cannot succeed, and waiting longer would not change that.
 *
 * One class with a {@link AttachUnavailableReason} discriminant rather than three
 * classes: every consumer of this path handles all three cases at the same seam
 * (the attach route), so one `instanceof` plus a `switch (error.reason)` is the
 * shape that is actually written, while the message names the specific case for a
 * human reading a log.
 */
export declare class JournalAttachUnavailableError extends Error {
    readonly runId: string;
    readonly reason: AttachUnavailableReason;
    constructor(runId: string, reason: AttachUnavailableReason, detail: string);
}
export interface AwaitAttachableJournalOptions {
    /** The run's journal paths, as {@link journalPaths} derived them. */
    paths: JournalPaths;
    /** Run id, for the store lookup and the error messages. */
    runId: string;
    /**
     * The authoritative run record store. Omitted only by a caller with no store
     * wired, which loses the unknown/terminal classification but keeps the bound.
     */
    runs?: RunStore;
    /** Bounded wait. Defaults to {@link DEFAULT_ATTACH_JOURNAL_WAIT_MS}. */
    waitMs?: number;
    /** Re-probe interval. Defaults to {@link DEFAULT_ATTACH_PROBE_INTERVAL_MS}. */
    probeIntervalMs?: number;
    /**
     * The consumer's abort. An aborted wait returns rather than throwing: the
     * caller stopped caring, which is not a diagnosis about the run.
     */
    signal?: AbortSignal;
    logger?: InternalLogger;
}
/**
 * Resolve once the run's journal can be tailed, or reject with a
 * {@link JournalAttachUnavailableError} explaining why it never will be.
 *
 * Call this BEFORE the first follow/poll read of an attach, never on a fresh
 * run: a fresh run's journal is created by its own `journaledCommand` spawn,
 * which has not happened yet, so gating it would fail every new run.
 */
export declare function awaitAttachableJournal(handle: SandboxHandle, options: AwaitAttachableJournalOptions): Promise<void>;
