import { InternalLogger } from '@tanstack/ai/adapter-internals';
import { RunRecord } from '@tanstack/ai';
import { SandboxProvider } from './contracts.js';
import { SandboxInstanceStore } from './instance-store.js';
export interface ReclaimSandboxOptions {
    provider: SandboxProvider;
    instances: SandboxInstanceStore;
    logger?: InternalLogger;
}
export type ReclaimOutcome = 
/** The provider was asked to destroy it and the instance record is gone. */
'destroyed'
/**
 * The provider's `destroy` THREW. The instance record was still deleted (see
 * the ordering note on {@link reclaimSandbox}), so the sandbox — if it is in
 * fact still running — is now unreachable from here and bills until the
 * provider's own idle reclamation, if any.
 *
 * This is the one outcome that means the cost leak the reaper exists to stop
 * is still leaking, so it is reported distinctly instead of being folded into
 * `'destroyed'`, and {@link sandboxReclaimer} logs it above debug level.
 */
 | 'destroy-failed'
/** The run never ran in a sandbox. */
 | 'no-sandbox-key'
/** No instance record for that key; nothing to do. */
 | 'not-found'
/** The record belongs to a different provider; refused. */
 | 'provider-mismatch';
/**
 * Destroy the sandbox a terminal run was bound to.
 *
 * Two orderings are load-bearing:
 *
 * - **The provider check before either `destroy` or `delete`.** A multi-provider
 *   application would otherwise hand a Docker container id to Daytona's
 *   `destroy`, which at best errors and at worst matches an unrelated sandbox
 *   in the other provider's id namespace. Getting this wrong destroys a
 *   stranger's workload, so it is the first gate — a mismatch touches NOTHING,
 *   including the record, which the right provider still needs.
 * - **`destroy` before `delete`, and `delete` regardless of whether `destroy`
 *   succeeded.** The provider sandbox may already be gone (idle-reclaimed, the
 *   region wiped, the container pruned). Keeping an instance record that points
 *   at nothing guarantees a failed `resume` on the thread's next turn, which is
 *   strictly worse than an orphaned provider sandbox — one is a broken user
 *   experience, the other is a bounded cost the provider itself will reclaim.
 *   The delete is therefore unconditional — but a failed `destroy` returns
 *   `'destroy-failed'`, not `'destroyed'`: the record is gone either way, and an
 *   operator has to be able to tell "torn down" from "possibly still billing and
 *   no longer reachable from here".
 */
export declare function reclaimSandbox(record: RunRecord, options: ReclaimSandboxOptions): Promise<ReclaimOutcome>;
/**
 * Thrown by {@link sandboxReclaimer} when {@link reclaimSandbox} answers
 * `'destroy-failed'`.
 *
 * WHY AN EXCEPTION AND NOT A RETURN VALUE. `ReapOptions.reclaim` is
 * `(record) => Promise<void>`, and the sweep's only channel for "the sandbox was
 * NOT reclaimed" is a rejection — `reapOne` catches one and reports the run
 * `'reclaim-failed'` with its `status` and `exitCode` intact. A reclaimer that
 * logged this arm and returned normally therefore reported `'finalized'`, and
 * `outcomes['reclaim-failed']` read `0` on precisely the leak it watches for.
 *
 * It carries no `cause`: `reclaimSandbox` returns a {@link ReclaimOutcome}, not
 * the provider's rejection, and widening that return to smuggle the error out
 * would change an outcome contract whose ordering and arms are load-bearing. The
 * underlying `destroy` rejection is on `reclaimSandbox`'s own `warn` line, which
 * carries the same `runId` and `sandboxKey` this error does.
 */
export declare class SandboxReclaimFailedError extends Error {
    readonly runId: string;
    /** Absent only in the impossible case; see the throw site in `sandboxReclaimer`. */
    readonly sandboxKey: string | undefined;
    constructor(runId: string, sandboxKey: string | undefined);
}
/**
 * Adapt {@link reclaimSandbox} to `ReapOptions.reclaim`.
 *
 * REJECTS on `'destroy-failed'` — see {@link SandboxReclaimFailedError} for why
 * that arm must not resolve. Every other outcome resolves: `'destroyed'` did the
 * job, and `'no-sandbox-key'` / `'not-found'` / `'provider-mismatch'` all mean
 * there is nothing for this reclaimer to tear down, which is not a sweep failure.
 */
export declare function sandboxReclaimer(options: ReclaimSandboxOptions): (record: RunRecord) => Promise<void>;
