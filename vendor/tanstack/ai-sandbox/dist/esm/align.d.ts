import { InternalLogger } from '@tanstack/ai/adapter-internals';
import { StreamChunk, StreamDurability } from '@tanstack/ai';
/**
 * Default bound on consecutive stored chunks alignment will skip as out-of-band.
 *
 * A bound is what keeps this a tolerance rather than a search. Unbounded, a
 * genuine determinism regression would make alignment scan forward through the
 * whole log looking for a fingerprint that happens to match, suppress
 * everything it passed, and deliver a stream whose prefix and suffix disagree —
 * the exact failure {@link JournalReplayDivergedError} exists to prevent. 64 is
 * well above any realistic burst of bridged console events between two
 * translated chunks and well below a log length where a false match becomes
 * plausible.
 */
export declare const DEFAULT_MAX_OUT_OF_BAND_SKIP = 64;
/**
 * The out-of-band predicate for the harness adapters.
 *
 * `ai-codex` and `ai-claude-code` splice `createBridgeEventChannel`'s stream
 * into their translated output with `mergeChunkStreams`. That channel is the
 * only producer on the path and it emits exclusively `EventType.CUSTOM` chunks
 * (`bridge-events.ts:53-63`), fired by LIVE bridged-tool execution. A replay
 * runs no tools, so those chunks exist in the log and not in the replay.
 *
 * Structural rather than a list of event names on purpose: a new bridged tool
 * inventing a new `name` must not silently reintroduce the divergence.
 */
export declare function isBridgeCustomChunk(chunk: StreamChunk): boolean;
/**
 * The replay produced a different chunk than the log already holds at that
 * index. Means translation stopped being deterministic — a `genId` that is not
 * run-scoped, a translator that consults the clock, or a journal that was
 * rewritten. Fail loud: suppressing the mismatch would deliver a stream whose
 * prefix and suffix disagree about message identity.
 */
export declare class JournalReplayDivergedError extends Error {
    readonly index: number;
    readonly stored: string;
    readonly replayed: string;
    constructor(index: number, stored: string, replayed: string);
}
/**
 * The replay reproduced the stored chunk EXACTLY except for its `threadId`.
 *
 * A distinct diagnosis because the cause and the fix are entirely different from
 * a real divergence. The adapters resolve `threadId` as
 * `options.threadId ?? this.generateId()`, and that id lands in every emitted
 * chunk — so an attach route that drives a run without passing the run record's
 * `threadId` mints a fresh one, and the very first chunk (`RUN_STARTED`) fails
 * alignment. The agent behaved identically; only the id moved. Reported as a
 * generic divergence, that sends the reader hunting for non-determinism in the
 * translator, which is the wrong place entirely.
 *
 * A SUBCLASS of {@link JournalReplayDivergedError}, deliberately: this is still a
 * divergence and still fatal, so a consumer already branching on the general
 * class keeps working. The two are not collapsed — a genuine content divergence
 * throws the base class, so `instanceof JournalReplayThreadIdMismatchError`
 * separates a config mistake from a determinism bug in exactly one check.
 */
export declare class JournalReplayThreadIdMismatchError extends JournalReplayDivergedError {
    readonly storedThreadId: string | undefined;
    readonly replayedThreadId: string | undefined;
    constructor(index: number, stored: string, replayed: string, storedThreadId: string | undefined, replayedThreadId: string | undefined);
}
export interface AlignToStoredLogOptions<TOffset extends string = string> {
    /**
     * The run's event log. Read from the beginning; never written here.
     *
     * Generic in the offset type, defaulted to `string`, for the same reason
     * {@link RunDeps} is: a branded-cursor backend's `StreamDurability<TOffset>`
     * is not assignable to `StreamDurability<string>`.
     *
     * Narrowed to `snapshot` — the only member this transform touches, as the
     * function docs below spell out — so the capability-bus view of a log
     * (`SandboxDurabilityLog`, which omits the offset-invariant `read`) can be
     * passed straight through by `alignedIfAttaching`. A full `StreamDurability`
     * still satisfies it, so no existing caller changes.
     */
    durability: Pick<StreamDurability<TOffset>, 'snapshot'>;
    /** Optional sink for the alignment summary. */
    logger?: InternalLogger;
    /**
     * Recognizes a stored chunk that the replay CANNOT reproduce, so alignment
     * skips it instead of throwing.
     *
     * Absent by default, which keeps strict positional comparison: any stored
     * chunk the replay does not produce is a determinism bug and fails loudly.
     * Pass {@link isBridgeCustomChunk} on the harness attach path, where the
     * previous host spliced live bridged-tool events into the log.
     *
     * The predicate is applied to the STORED chunk, never to the replayed one. A
     * skipped entry is suppressed, not re-appended, so the client's view is
     * unchanged: it already received that chunk under its own offset.
     */
    isOutOfBand?: (chunk: StreamChunk) => boolean;
    /**
     * Maximum CONSECUTIVE stored chunks that may be skipped as out-of-band before
     * alignment gives up. Reset by every match. Defaults to
     * {@link DEFAULT_MAX_OUT_OF_BAND_SKIP}. Ignored when `isOutOfBand` is absent.
     */
    maxOutOfBandSkip?: number;
}
/**
 * Suppress the chunks already present in the event log and yield the rest.
 *
 * The stored prefix is read exactly once, eagerly, before the first replay
 * chunk is pulled. Both halves of that matter:
 *
 * - **Exactly once**, because a second read mid-stream would race the appends
 *   the caller is making downstream of this transform and could classify a
 *   chunk this very run just appended as an already-stored one, dropping it.
 * - **Via `snapshot()`, never `read()`**. `read` *tails*: it returns only when
 *   the log is terminalized with `close()` or the caller aborts. A takeover's
 *   log is open by definition — the host that would have closed it is the host
 *   that died — so `for await (… of read('-1'))` would never finish, and on an
 *   empty log `memoryStream` rejects a from-start join outright once its
 *   first-chunk deadline elapses. `snapshot()` is the bounded read: it resolves
 *   with what is stored right now, including while the log is still open, and
 *   resolves to `[]` for a run with nothing stored.
 */
export declare function alignToStoredLog<TOffset extends string = string>(chunks: AsyncIterable<StreamChunk>, options: AlignToStoredLogOptions<TOffset>): AsyncIterable<StreamChunk>;
