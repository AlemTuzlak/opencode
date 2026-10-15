import { InternalLogger } from '@tanstack/ai/adapter-internals';
import { RunRecord, RunStore, StreamChunk, StreamDurability } from '@tanstack/ai';
/**
 * The two durable seams a run driver needs: lifecycle record + event log.
 *
 * Generic in the log's offset type, and DEFAULTED to `string` so every existing
 * call site keeps compiling unchanged. The parameter is not decoration: a
 * backend that brands its cursors — `@tanstack/ai-durable-stream`'s
 * `durableStream` returns `StreamDurability<DurableStreamOffset>` — is NOT
 * assignable to `StreamDurability<string>`, because `read` takes an offset and
 * is therefore contravariant in it. Hardcoding the default here made the
 * production multi-host backend unusable without a cast (see
 * `tests/offset-generics.test-d.ts`).
 */
export interface RunDeps<TOffset extends string = string> {
    /** Run lifecycle record (status, thread, timings). */
    runs: RunStore;
    /**
     * Per-run delivery-durable event log the run's chunks are appended to.
     *
     * A FACTORY, not an instance, and that is load-bearing rather than stylistic.
     * A `StreamDurability` is bound to one run — `memoryStream(request)` resolves
     * its `runId` from the request, and a backend adapter's offsets embed a cursor
     * into one log. Holding a single instance made two failures reachable:
     *
     * - **Silent mis-binding at concurrency 1.** `start({ runId })` accepted an
     *   arbitrary id while the instance was bound to another, writing the record
     *   under one id and the events under another with no error raised. Resolving
     *   the log FROM the `runId` makes that unrepresentable.
     * - **Cross-talk at concurrency > 1.** Parallel runs interleaved their chunks
     *   into one log, and whichever finished first called `close()` and
     *   terminalized every other run's stream.
     *
     * Called exactly once per run, at the start of {@link pipeToRunLog}. An
     * implementation MUST return the same instance for the same `runId` within a
     * process if it wants `snapshot()` to see its own appends.
     */
    durability: (runId: string) => StreamDurability<TOffset>;
    /**
     * Optional sink for failures this driver absorbs rather than rejecting with.
     * A detached run has no caller to receive an error, so without a logger a
     * failing store or event log is invisible to an operator. Same
     * `logger?.errors(...)` contract core uses in `stream-to-response.ts`.
     */
    logger?: InternalLogger;
}
export interface PipeToRunLogOptions<TOffset extends string = string> extends RunDeps<TOffset> {
    runId: string;
    threadId: string;
    /** Abort consumption mid-stream; the run finishes as `aborted`. */
    signal?: AbortSignal;
}
/**
 * Open the run, append every chunk from `stream`, and finish with the right
 * terminal status. Resolves with the final {@link RunRecord} and never rejects:
 * a thrown stream error is surfaced as a `RUN_ERROR` event plus the record's
 * `error`, which is what tailing clients see. A store or event-log failure
 * along the way is logged through {@link RunDeps.logger} and still terminalizes
 * the run rather than escaping to a caller that does not exist.
 *
 * - normal completion → `completed`
 * - a `RUN_ERROR` chunk → append it, then `failed`
 * - the stream throws → append a synthesized `RUN_ERROR`, then `failed`
 * - `signal` aborts at ANY point before the stream ends → `aborted`, whether the
 *   producer keeps yielding, ends its stream, or is never asked for another
 *   chunk. An abort outranks a clean exit: the run did not complete.
 */
export declare function pipeToRunLog<TOffset extends string = string>(stream: AsyncIterable<StreamChunk>, opts: PipeToRunLogOptions<TOffset>): Promise<RunRecord>;
export interface RunControllerStartInput {
    runId: string;
    threadId: string;
    stream: AsyncIterable<StreamChunk>;
    /** Abort consumption mid-stream; the run finishes as `aborted`. */
    signal?: AbortSignal;
}
export interface RunHandle {
    runId: string;
    /** Resolves with the final record once the run reaches a terminal status. */
    done: Promise<RunRecord>;
}
/**
 * Thin orchestration helper over {@link RunDeps}: fire-and-track a run via
 * {@link pipeToRunLog}, tail one run by id, and `drain()` all in-flight runs
 * (e.g. inside a `ctx.waitUntil`). Holds no run state of its own beyond the set
 * of currently in-flight `done` promises.
 *
 * Safe for concurrent runs. {@link RunDeps.durability} is a per-run factory, so
 * each run appends to its own log and no run's `close()` terminalizes another's.
 * The identity trap this class used to document — `start({ runId })` writing the
 * lifecycle record under one id and the events under another, silently and at
 * concurrency 1 — is unrepresentable now that the log is resolved FROM the
 * `runId`. Every method is keyed by run accordingly: `attach(runId, …)` and
 * `status(runId)` no longer disagree about whether the surface is per-run.
 */
export declare class RunController<TOffset extends string = string> {
    private readonly deps;
    private readonly inFlight;
    constructor(deps: RunDeps<TOffset>);
    /**
     * Kick off `pipeToRunLog` without awaiting it and return the `runId`
     * immediately plus a `done` promise the orchestrator may await or detach.
     */
    start(input: RunControllerStartInput): RunHandle;
    /**
     * Resumable client tail for ONE run — replay from `fromOffset`, then
     * live-tail. Takes `runId` because the log it reads is per-run; the old
     * `attach(fromOffset)` signature advertised a multi-run surface the type could
     * not deliver.
     */
    attach(runId: string, fromOffset: TOffset, signal?: AbortSignal): AsyncIterable<{
        offset: TOffset;
        chunk: StreamChunk;
    }>;
    /** Current run record, or null when the run is unknown. */
    status(runId: string): Promise<RunRecord | null>;
    /**
     * Await every currently in-flight run's `done` promise.
     *
     * Uses `allSettled` rather than `all` because this is typically awaited
     * inside a `ctx.waitUntil`: `all` would reject on the first failure, abandon
     * the wait on every other run, and surface that rejection to the platform.
     * Draining is about keeping the isolate alive until the runs settle; each
     * run's own outcome is already recorded in its record and log.
     */
    drain(): Promise<void>;
}
