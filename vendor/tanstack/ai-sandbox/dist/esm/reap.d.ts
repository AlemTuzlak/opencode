import { SandboxHandle } from './contracts.js';
import { InternalLogger } from '@tanstack/ai/adapter-internals';
import { LockStore } from '@tanstack/ai/locks';
import { RunRecord, RunStatus, RunStore, StreamChunk, StreamDurability } from '@tanstack/ai';
/**
 * Safety net for a single run's drive. Not the mechanism that decides whether a
 * run finished — see the module doc for why that design was rejected — so this is
 * generous rather than tight: it only has to stop a drive that has genuinely
 * wedged on a run the journal already said was over.
 *
 * On the expiry path it is not merely a net: it is what stops a still-producing
 * agent, since nothing polls the cancel recorded before that drive. A caller that
 * expires live agents may want a tighter value there than a finalization replay
 * needs.
 */
export declare const DEFAULT_RUN_BUDGET_MS = 30000;
/**
 * Runs one sweep will touch. A cron invocation is bounded (a Worker's CPU
 * budget, a Lambda timeout), and an unbounded sweep over a backlog of thousands
 * would be killed mid-run rather than finishing 25 and returning; the next tick
 * takes the next batch.
 */
export declare const DEFAULT_MAX_RUNS = 25;
/** Journal tail bytes {@link probeRunExit} reads. The sentinel is the last line. */
export declare const DEFAULT_EXIT_PROBE_BYTES = 4096;
/**
 * What the out-of-band probe learned about a detached run's agent.
 *
 * THREE ARMS, not a boolean, because "could not tell" must not be
 * indistinguishable from "still working": both leave the run alone, but only one
 * of them is a condition an operator should see. A two-valued probe would also
 * invite the caller to treat a provider `exec` failure as "finished" and drive a
 * live run — the exact defect this module exists to prevent.
 */
export type RunExitProbe = 
/** The `{"__exit":N}` sentinel is in the journal. The agent is over. */
{
    state: 'finished';
    exitCode: number;
}
/** No sentinel. The agent is mid-flight (or never started). LEAVE IT ALONE. */
 | {
    state: 'producing';
}
/** The probe could not answer — no sandbox, `exec` rejected, frame undecodable. */
 | {
    state: 'unknown';
    error?: unknown;
};
/** What one sweep did to one run. */
export type ReapRunOutcome = 
/**
 * The probe saw `{"__exit":N}`, the run was driven to a terminal status, and
 * its transcript is saved. The happy path.
 */
'finalized'
/**
 * Past `detachedRunTtlMs`. Cancelled first, then driven to terminal. The probe
 * is skipped: the outcome is terminal whether the agent finished or not.
 *
 * Reported even when {@link ReapOptions.runBudgetMs} is what ended the drive —
 * on this path that is the mechanism rather than an anomaly, so `'expired'` is
 * the truthful outcome. The run's own `status` distinguishes the two shapes:
 * an agent that had already finished replays to `'completed'`, while one still
 * producing when the budget fired is `'aborted'`.
 */
 | 'expired'
/**
 * Still producing. `pipeToRunLog` was NEVER entered — nothing appended, no
 * terminal record written, `close()` not called, `detachedSince` untouched.
 */
 | 'producing'
/** The probe could not answer. Left exactly as untouched as `'producing'`. */
 | 'unknown'
/**
 * ANOMALY. The drive outran {@link ReapOptions.runBudgetMs} on a run the
 * journal already said was finished. The record IS terminal and the log IS
 * closed (`pipeToRunLog` guarantees both), so this is a diagnostic, not a leak
 * — but a finished run that would not replay in 30s means the journal read, the
 * translation, or the log is misbehaving.
 *
 * FINALIZATION ONLY. An expired run that outran its budget reports `'expired'`:
 * there was no probe on that path and the agent may legitimately still have been
 * producing, so the budget firing is the designed stop, not a misbehaving replay.
 */
 | 'budget-exceeded'
/**
 * Another host holds the claim, or held it and superseded us mid-drive. Normal:
 * a real viewer attaching mid-sweep is exactly this. Also covers a run that
 * reached terminal in another host's hands between the listing and the claim.
 */
 | 'not-claimed'
/**
 * The transcript IS saved and the record IS terminal — only
 * {@link ReapOptions.reclaim} threw, so the sandbox is still up.
 *
 * A DISTINCT outcome rather than `'failed'`, because the two need opposite
 * operator responses and `'failed'` cannot express this one: it carries no
 * `status` and no `exitCode`, so "transcript saved, sandbox NOT reclaimed"
 * read identically to "the sweep failed and the run was never finalized".
 *
 * NOT RETRYABLE BY THE SWEEP. The record is terminal by now, so the run has
 * left `listReclaimable` for good; the sandbox leaks until something else
 * tears it down. This entry, with its `error`, is the only notice of that.
 *
 * OVERWRITES `'budget-exceeded'` when both happened, because the leak is what
 * needs acting on — {@link ReapRunEntry.terminalizedAnyway} is what preserves
 * the budget half of that pair.
 *
 * `sandboxReclaimer` REJECTS on its `'destroy-failed'` arm precisely so this
 * outcome is reachable through the shipped reclaimer and not only through a
 * custom one; see `SandboxReclaimFailedError` in `reclaim.ts`.
 */
 | 'reclaim-failed'
/** Something threw. Logged, recorded here, and the sweep continued. */
 | 'failed';
/** One run's line in the sweep summary. */
export interface ReapRunEntry {
    runId: string;
    outcome: ReapRunOutcome;
    /** The run's status after the sweep, when the run was driven. */
    status?: RunStatus;
    /** The agent's exit code, when the probe read one. */
    exitCode?: number;
    /**
     * THE BUDGET ANOMALY MARKER, and the only field whose mere PRESENCE carries a
     * fact: it is set if and only if the drive outran
     * {@link ReapOptions.runBudgetMs} on the finalization path — the condition
     * `'budget-exceeded'` names. Its value is whether the record nonetheless
     * reached a terminal status, practically always `true` since `pipeToRunLog` is
     * total; it is reported rather than assumed so an operator does not have to
     * infer it.
     *
     * SURVIVES A FAILED RECLAIM. `reclaim` runs after the outcome is classified
     * and overwrites it with `'reclaim-failed'`, which is the more urgent fact (a
     * leaked sandbox nothing will retry) and so wins the single `outcome` slot.
     * This field is therefore what keeps the budget anomaly on the entry: an
     * operator seeing `'reclaim-failed'` WITH `terminalizedAnyway` present is
     * looking at a run that blew its budget and then leaked, and needs both halves.
     */
    terminalizedAnyway?: boolean;
    error?: unknown;
}
export interface ReapResult {
    /** Runs in this batch — i.e. after the {@link ReapOptions.maxRuns} cap. */
    considered: number;
    /** Runs {@link ReapOptions.hasFinished} was actually called for. */
    probed: number;
    outcomes: Record<ReapRunOutcome, number>;
    runs: Array<ReapRunEntry>;
}
export interface ReapOptions<TOffset extends string = string> {
    runs: RunStore;
    locks: LockStore;
    /**
     * Per-run event log factory, same shape `RunDeps.durability` takes.
     *
     * Generic in the offset type, defaulted to `string` so an existing call site
     * needs no change — see {@link SandboxRunDriverOptions.durability} for why
     * hardcoding the default locked out branded-cursor backends.
     */
    durability: (runId: string) => StreamDurability<TOffset>;
    /**
     * The out-of-band "did the agent reach its sentinel?" probe. INJECTED, because
     * neither the delivery log nor this package can answer it — see the module doc.
     * {@link probeRunExit} is the implementation an application wires in once it has
     * resolved the run's `SandboxHandle`.
     */
    hasFinished: (record: RunRecord) => Promise<RunExitProbe>;
    /** Produce the run's remaining events. Called only once the claim is held. */
    drive: (input: {
        runId: string;
        threadId: string;
        signal: AbortSignal;
    }) => AsyncIterable<StreamChunk>;
    /** Sweep clock, passed rather than read so a sweep is reproducible. */
    now: number;
    /** Detached-run TTL; `detachedSince <= now - ttl` expires, INCLUSIVELY. */
    detachedRunTtlMs: number;
    /** Safety net per drive. Defaults to {@link DEFAULT_RUN_BUDGET_MS}. */
    runBudgetMs?: number;
    /** Batch cap. Defaults to {@link DEFAULT_MAX_RUNS}. */
    maxRuns?: number;
    /** Quiescence window; defaults to `DEFAULT_FENCE_QUIET_MS`. */
    fenceQuietMs?: number;
    /**
     * Tear the run's sandbox down. Called ONLY after the run reached a terminal
     * status, and with the ORIGINALLY LISTED record — see {@link reapDetachedRuns}.
     * `sandboxReclaimer` in `reclaim.ts` is the ready-made implementation.
     */
    reclaim?: (record: RunRecord) => Promise<void>;
    logger?: InternalLogger;
}
/**
 * Read the END of a run's journal and answer whether the agent reached its
 * `{"__exit":N}` sentinel. Read-only: no append, no record write, no `close()`.
 *
 * This is the whole reason the reaper is safe. It is the ONLY way to learn that a
 * detached run is over without driving it, because the delivery log stops growing
 * the moment the viewer leaves while the journal does not.
 *
 * ANY failure answers `'unknown'`, never `'finished'`: the caller drives a run it
 * is told finished, so a provider `exec` that rejected, a sandbox that is gone, or
 * a frame the provider truncated must never be read as "the agent exited".
 *
 * An EMPTY tail answers `'producing'` — the fail-safe direction. A journal that
 * does not exist yet is indistinguishable here from one with no sentinel, and both
 * mean "do not touch this run".
 */
export declare function probeRunExit(input: {
    handle: SandboxHandle;
    runId: string;
    /** Journal directory; defaults to `DEFAULT_JOURNAL_DIR`, as `journalPaths` does. */
    dir?: string;
    /** Tail bytes to read. Defaults to {@link DEFAULT_EXIT_PROBE_BYTES}. */
    maxBytes?: number;
}): Promise<RunExitProbe>;
/**
 * Sweep the detached runs a `RunStore` surfaces, saving each finished run's
 * transcript and reclaiming its sandbox.
 *
 * A plain async function with no timer and no daemon: call it from a cron, a
 * queue consumer, a Durable Object `alarm()`, or a `waitUntil`. It NEVER rejects
 * — every failure is logged and counted in the returned {@link ReapResult}.
 *
 * ONE `listReclaimable({ now, ttlMs: 0 })` call, deliberately: `ttlMs: 0` is
 * every detached run, which is the candidate set for FINALIZATION (a run that hit
 * its sentinel one second after the viewer left has an unsaved transcript and
 * must not wait out the TTL), and expiry is then classified in-process against
 * the same inclusive cutoff. Listing twice with two TTLs would cost a second
 * store round-trip to compute a subset.
 *
 * `listReclaimable` is OPTIONAL on `RunStore`. A backend without it cannot be
 * reaped, which answers `{ considered: 0 }` plus one log line rather than
 * throwing — the same graceful degrade every other optional-method call site in
 * the repo does (`store.findActiveRun?.(threadId)`).
 */
export declare function reapDetachedRuns<TOffset extends string = string>(options: ReapOptions<TOffset>): Promise<ReapResult>;
