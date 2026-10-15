import { LockStore } from '@tanstack/ai/locks';
import { InternalLogger } from '@tanstack/ai/adapter-internals';
import { RunStore, StreamDurability } from '@tanstack/ai';
/** Quiescence window before a successor's first append. */
export declare const DEFAULT_FENCE_QUIET_MS = 5000;
/**
 * Appends a fenced log makes between `driverEpoch` re-reads.
 *
 * Deliberately a COUNT, not an interval: `pipeToRunLog` appends one chunk per
 * call, so this bounds a superseded driver to at most 31 further chunk batches
 * (the bump can land immediately after a check) regardless of how fast the run
 * streams. At 500 chunks/sec that worst case is ~62ms of writes; at 5
 * chunks/sec it is ~6s of writes — either way 31 chunks, never ~1000.
 *
 * The cost of a smaller number is one extra `RunStore.get` per 32 chunks.
 */
export declare const DEFAULT_EPOCH_RECHECK_APPENDS = 32;
/** Lock key for a run's driver. Per-run, so two runs never serialize. */
export declare function runDriverLockKey(runId: string): string;
/** The claim was never acquired, so the caller must not drive the run. */
export declare class RunClaimNotAcquiredError extends Error {
    readonly runId: string;
    readonly reason: 'terminal' | 'unknown' | 'superseded';
    constructor(runId: string, reason: 'terminal' | 'unknown' | 'superseded');
}
/** The claim was held and has been superseded; stop writing immediately. */
export declare class RunClaimLostError extends Error {
    readonly runId: string;
    readonly heldEpoch: number;
    readonly observedEpoch: number | 'lease-lost';
    constructor(runId: string, heldEpoch: number, observedEpoch: number | 'lease-lost');
}
/** A held claim on one run. */
export interface RunClaim {
    runId: string;
    /** This driver's fencing token; strictly greater than any predecessor's. */
    epoch: number;
    /** Aborts when the lock can no longer guarantee ownership. */
    signal: AbortSignal;
}
export interface WithRunClaimOptions {
    runs: RunStore;
    locks: LockStore;
    runId: string;
    /**
     * Quiescence window for {@link awaitLogQuiescence}. Defaults to
     * {@link DEFAULT_FENCE_QUIET_MS}.
     *
     * `withRunClaim` itself does not read this: it has no durability handle. It
     * lives here so a caller assembling a drive passes ONE options object to
     * `withRunClaim`, `awaitLogQuiescence`, and {@link fenceDurability} instead of
     * three that can drift apart.
     */
    fenceQuietMs?: number;
    /**
     * Forwarded to {@link fenceDurability}. Defaults to
     * {@link DEFAULT_EPOCH_RECHECK_APPENDS}. Same rationale as `fenceQuietMs`.
     */
    epochRecheckAppends?: number;
    logger?: InternalLogger;
}
/**
 * Claim exclusive driver rights on `runId` for the duration of `fn`.
 *
 * The ENTIRE body runs inside the lock, so a snapshot taken by `fn` and every
 * append that follows it sit in one critical section.
 *
 * Rejects with {@link RunClaimNotAcquiredError} when the run is unknown or
 * already terminal — a terminal run has nothing left to drive, and bumping its
 * epoch would fence out nobody while confusing an operator reading the record.
 *
 * The epoch is bumped INSIDE the lock and only after those checks pass, so a
 * refused claim leaves `driverEpoch` untouched.
 */
export declare function withRunClaim<T>(options: WithRunClaimOptions, fn: (claim: RunClaim) => Promise<T>): Promise<T>;
/**
 * Wait until the stored log stops growing, then answer how many entries it
 * holds.
 *
 * Uses `snapshot()`, never `read()`: `read` tails and only resolves once the log
 * is terminalized or the caller aborts, and a taken-over run's log is open by
 * definition — the host that would have closed it is the host that died.
 *
 * Rejects rather than looping forever. A log that never quiesces means a
 * predecessor is still actively writing, which is a condition to surface, not to
 * append into.
 *
 * This only detects a CONCURRENT predecessor, which means it can only fire when
 * the two drivers are in different processes. Within one process an
 * `InMemoryLockStore` serializes the claims, so the predecessor has already
 * stopped by the time the successor probes.
 */
export declare function awaitLogQuiescence<TOffset extends string = string>(durability: StreamDurability<TOffset>, quietMs: number): Promise<number>;
/**
 * Wrap a log so every `append` is fenced by `claim`.
 *
 * `append` is the ONLY fenced method, deliberately:
 *
 * - `close()` must never be fenced. It runs on every teardown path including
 *   the teardown caused by losing the claim, and a fenced `close` would leave
 *   the record wedged at `'running'` with every live tailer parked forever (a
 *   `read` only ends when the log closes).
 * - `read` / `snapshot` / `resumeFrom` do not mutate, so a superseded host
 *   reading them is harmless.
 *
 * The lease check is synchronous and happens before any I/O, so a fenced append
 * cannot half-land. The epoch re-check is throttled to `epochRecheckAppends`
 * because it costs a store read and the append path is hot.
 *
 * ONE REFUSAL CLOSES THE FENCE FOR GOOD. The first `append` that is refused —
 * for EITHER cause, lost lease or moved epoch — latches this wrapper shut, and
 * every later `append` refuses immediately without consulting the throttle and
 * without a store read. This is not a nicety:
 *
 * - Losing a claim is not transient. Epochs only move forward and a lease is
 *   never handed back, so a wrapper that has refused once can never legitimately
 *   append again. Re-deciding per append can only produce a WRONG answer.
 * - The throttle makes that wrong answer reachable. A refusal consumes the
 *   re-read budget, so the very next append rides a fresh throttle window and is
 *   NOT re-checked. `pipeToRunLog`'s recovery path appends a `RUN_ERROR` right
 *   after the refusal it is recovering from, and that log belongs to the
 *   SUCCESSOR: a terminal `RUN_ERROR` from a dead host would fail the stream for
 *   every client attached to the live, healthy run.
 * - It is also strictly cheaper: a latched boolean replaces a store read.
 *
 * The latch deliberately does NOT extend to `close()` — see above.
 *
 * PASSES THE OFFSET TYPE THROUGH, rather than collapsing it to `string`. The
 * fence sits mid-chain between a caller's log and `pipeToRunLog`, so widening
 * here would reintroduce the branded-offset wall one layer in: a
 * `StreamDurability<DurableStreamOffset>` would go in and a
 * `StreamDurability<string>` would come out, which is not assignable back to
 * the caller's own type.
 */
export declare function fenceDurability<TOffset extends string = string>(durability: StreamDurability<TOffset>, claim: RunClaim, options: {
    runs: RunStore;
    epochRecheckAppends?: number;
}): StreamDurability<TOffset>;
/**
 * Wrap a run store so a TERMINAL record write is fenced by `claim`.
 *
 * The record is the run's other authoritative channel, and the same rule applies
 * to it: a host that has lost its claim must not state that the run is over. It
 * reaches this seam by the most ordinary route — `pipeToRunLog` catches the
 * `RunClaimLostError` its refused append threw, folds it in, and calls
 * `finish(ctx, 'failed', …)` — so fencing the log alone only moves where the harm
 * surfaces. `'completed'` and `'aborted'` arrive the same way (an empty stream
 * that never appended; a lease loss that aborts `claim.signal`, which
 * `pipeToRunLog` reads as an abort before it appends anything), which is why the
 * gate is {@link isTerminalRunStatus} and not "did an append refuse".
 *
 * SUPPRESSED, NOT ATTEMPTED-AND-SWALLOWED, and not thrown either. `update`
 * resolves without writing. `pipeToRunLog` must not reject — `RunController.start`
 * consumes its promise fire-and-forget — and a rejection here would additionally
 * make `finish` report the run through the local rebuilt record as if the store
 * had broken, which is a different and false fact.
 *
 * WHAT IS *NOT* FENCED, deliberately:
 *
 * - **`close()`** is not on this seam at all, and must stay off it: see
 *   {@link fenceDurability}. A wedged `'running'` record with tailers parked
 *   forever is worse than the write being prevented.
 * - **Non-terminal writes pass through**, including `detachedSince` and
 *   `sandboxKey` written by a superseded host. They are stale, but staleness is
 *   not the harm being fixed: none of them can make a live run look finished, so
 *   none can mislead `isTerminalRunStatus`, `findActiveRun`, or the reaper. They
 *   are also self-healing — the successor owns those fields and overwrites them —
 *   whereas over-suppressing strands a record: `createOrResume` is how the row
 *   comes into existence at all, and refusing a non-terminal write on a
 *   mis-observed loss would leave a run with no record to recover from. Suppress
 *   the writes that assert an outcome; let bookkeeping through.
 * - **Reads** (`get`, `listByThread`, `listReclaimable`, `findActiveRun`) do not
 *   mutate, so a superseded host reading them is harmless. `finish`'s terminal
 *   re-read therefore still works and answers with the SUCCESSOR's live record,
 *   which is the truthful thing to resolve with.
 * - **Another run's record.** The fence knows about `claim.runId` only; a write
 *   aimed elsewhere is not this claim's to judge.
 *
 * The OPTIONAL methods (`listByThread`, `listReclaimable`) are forwarded only
 * when the wrapped store actually has them: consumers feature-detect
 * (`store.listReclaimable?.(…)`), so materializing one that delegates to a
 * missing method would turn a graceful degrade into a `TypeError`.
 * `findActiveRun` is required on the contract, so it forwards unconditionally.
 */
export declare function fenceRunStore(runs: RunStore, claim: RunClaim, options?: {
    logger?: InternalLogger;
}): RunStore;
