import { InternalLogger } from '@tanstack/ai/adapter-internals';
import { RunStore } from '@tanstack/ai';
import { SandboxHandle } from './contracts.js';
/**
 * How long a journal whose runId the store does not know must go untouched
 * before the sweep will delete it.
 *
 * One hour, chosen against what the window actually protects: the gap between a
 * reader creating the journal with `: >> file` and the run record appearing in
 * the store. That gap is milliseconds in the normal case and seconds in the worst
 * case (a slow store, a retried write). An hour is three orders of magnitude of
 * headroom on the race, while still bounding a leaked journal to something a
 * sandbox's disk survives. Erring long is the cheap direction: the cost of too
 * long is bytes, the cost of too short is a destroyed live run.
 */
export declare const DEFAULT_ORPHAN_TTL_MS: number;
/**
 * Ceiling on deletions per sweep. A cron-driven sweep runs unattended, so a
 * mistake — a store that answers `terminal` for everything, a misconfigured
 * directory — is bounded by this rather than by how many journals happen to
 * exist. The remainder is reported as kept with reason `max-deletes` and picked
 * up by the next sweep.
 */
export declare const DEFAULT_MAX_DELETES = 200;
/** Why {@link pruneJournals} left a journal in place. */
export type KeptJournalReason = 
/** The store answered with a non-terminal status (`'running'`, `'interrupted'`). */
'non-terminal'
/** The store has never heard of this runId and the journal is still fresh. */
 | 'orphan-too-recent'
/**
 * The store has never heard of this runId and the age gate could not run at
 * all — {@link parseJournalMtimeListing} returned `unavailable`. THE
 * FAIL-CLOSED ARM: an unavailable listing is not an empty one and says nothing
 * about any file's age.
 */
 | 'age-gate-unavailable'
/**
 * The age gate ran but reported no mtime for this file, so its age is unknown.
 * (A file created between the two `exec`s, or a name the glob missed.)
 */
 | 'age-gate-missing-entry'
/** {@link decodeJournalRunId} refused the name (`truncated` or `malformed`). */
 | 'undecodable-name'
/** The store lookup threw. A question that was not answered is not a licence to delete. */
 | 'store-error'
/** The `rm` itself failed or exited non-zero. */
 | 'delete-failed'
/** {@link PruneJournalsOptions.maxDeletes} was already reached this sweep. */
 | 'max-deletes';
/** One journal (or one runId's journal + sidecar) the sweep declined to delete. */
export interface KeptJournal {
    /** The decoded runId; absent exactly when `reason` is `'undecodable-name'`. */
    runId?: string;
    /** Every listed filename this entry covers — the journal and its `.err` sidecar. */
    names: Array<string>;
    reason: KeptJournalReason;
}
/** A non-fatal failure the sweep folded into its result instead of throwing. */
export interface PruneJournalsFailure {
    stage: 'list' | 'mtime-list' | 'store' | 'delete';
    /** Present when the failure is attributable to one run. */
    runId?: string;
    message: string;
}
/** What one {@link pruneJournals} sweep did. */
export interface PruneJournalsResult {
    /** Filenames `ls -1` reported, before de-duplication by runId. */
    listed: number;
    /** Distinct runIds those filenames decoded to. */
    runIds: number;
    /** runIds whose journal AND sidecar were deleted, in the order deleted. */
    deleted: Array<string>;
    /** Everything left in place, with the reason. */
    kept: Array<KeptJournal>;
    /**
     * Whether the mtime age gate was usable this sweep. `'unavailable'` means no
     * orphan could be expired, by design.
     */
    ageGate: 'listed' | 'unavailable';
    failures: Array<PruneJournalsFailure>;
}
export interface PruneJournalsOptions {
    /** Sandbox holding the journal directory. Touched only via `process.exec`. */
    handle: SandboxHandle;
    /**
     * Run lookup. Only `get` is used: the sweep asks about the runIds it found on
     * disk and never enumerates the store, so no optional `RunStore` method is
     * required of a backend.
     */
    runs: Pick<RunStore, 'get'>;
    /** Journal directory. Defaults to {@link DEFAULT_JOURNAL_DIR}. */
    dir?: string;
    /** Age-gate reference time. Defaults to `Date.now()`; injectable for tests. */
    now?: number;
    /** See {@link DEFAULT_ORPHAN_TTL_MS}. */
    orphanTtlMs?: number;
    /** See {@link DEFAULT_MAX_DELETES}. */
    maxDeletes?: number;
    logger?: InternalLogger;
}
/**
 * Sweep the journal directory, deleting only journals whose runs the store
 * reports terminal (plus orphans that have been untouched past `orphanTtlMs`).
 *
 * **Never rejects.** This runs unattended from a cron, where a rejected promise
 * is an unhandled rejection and, worse, hides which journals were and were not
 * swept. Every failure — a listing that errored, a store that threw, an `rm` that
 * exited non-zero — is folded into
 * {@link PruneJournalsResult.failures} and the sweep continues with the entries
 * it can still decide about.
 */
export declare function pruneJournals(options: PruneJournalsOptions): Promise<PruneJournalsResult>;
