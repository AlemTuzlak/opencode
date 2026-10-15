import { InternalLogger } from '@tanstack/ai/adapter-internals';
import { LockStore } from '@tanstack/ai/locks';
import { RunDriverOptions, RunStore, StreamChunk, StreamDurability } from '@tanstack/ai';
export interface SandboxRunDriverOptions<TOffset extends string = string> {
    /** The attach request; core reads its run id with `resolveResumeRunId`. */
    request: Request;
    runs: RunStore;
    locks: LockStore;
    /**
     * Per-run event log factory, the same shape `RunDeps.durability` takes — a
     * `StreamDurability` is bound to one run, so the log is resolved FROM the
     * `runId` rather than handed in pre-bound.
     *
     * Generic in the offset type, defaulted to `string` so an existing call site
     * needs no change. Hardcoding the default made a branded-cursor backend
     * unusable here: `durableStream` returns
     * `StreamDurability<DurableStreamOffset>`, which is not assignable to
     * `StreamDurability<string>` because `read` is contravariant in its offset.
     */
    durability: (runId: string) => StreamDurability<TOffset>;
    /** Produce the run's remaining events. Called only once the claim is held. */
    drive: (input: {
        runId: string;
        threadId: string;
        signal: AbortSignal;
    }) => AsyncIterable<StreamChunk>;
    /** Quiescence window; defaults to {@link DEFAULT_FENCE_QUIET_MS}. */
    fenceQuietMs?: number;
    /** Platform keep-alive (e.g. `ctx.waitUntil`) for the background drive. */
    waitUntil?: (promise: Promise<unknown>) => void;
    logger?: InternalLogger;
}
/**
 * `pipe` ran without a held claim. Not a recoverable condition: it means the
 * returned options object was taken apart and `pipe` called outside `claim`, so
 * there is no epoch to fence with and no lease guaranteeing exclusivity. Any
 * append made in that state is exactly the duplicate-write bug the claim exists
 * to prevent, so this fails loudly rather than appending unfenced.
 */
export declare class RunDriverPipeOutsideClaimError extends Error {
    readonly runId: string;
    constructor(runId: string);
}
/**
 * Fill in a core `driver` block with this package's claim and run log.
 *
 * `drive` receives an `AbortSignal` — the driver owns the abort, so it hands
 * out a signal rather than a controller — but `chat()` takes an
 * `AbortController`. Mirror one onto the other, exactly as
 * {@link https://tanstack.com/ai/latest/docs/sandbox/takeover | Takeover & Detached Runs}'s
 * `controllerFor` does, so a lost claim actually stops the drive.
 *
 * @example
 * ```typescript
 * function controllerFor(signal: AbortSignal): AbortController {
 *   const controller = new AbortController()
 *   const abort = (): void => controller.abort(signal.reason)
 *   if (signal.aborted) abort()
 *   else signal.addEventListener('abort', abort, { once: true })
 *   return controller
 * }
 *
 * export async function GET(request: Request) {
 *   return resumeServerSentEventsResponse({
 *     adapter: memoryStream(request),
 *     driver: sandboxRunDriver({
 *       request,
 *       runs,
 *       locks,
 *       durability: (runId) => logFor(runId),
 *       drive: ({ runId, threadId, signal }) =>
 *         chat({
 *           ...config,
 *           runId,
 *           threadId,
 *           abortController: controllerFor(signal),
 *         }),
 *     }),
 *   })
 * }
 * ```
 */
export declare function sandboxRunDriver<TOffset extends string = string>(input: SandboxRunDriverOptions<TOffset>): RunDriverOptions;
