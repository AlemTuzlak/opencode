import { ChatMiddleware, GenerationMiddleware, PersistedArtifactActivity, PersistedArtifactRef, PersistedArtifactRole, TokenUsage } from '@tanstack/ai';
import { AIPersistence, AIPersistenceStores, BlobBody, ChatTranscriptStores, RunStore } from './types.js';
/**
 * How generated media is turned into durable artifacts: which pieces of a
 * result become artifacts, what they are named, where their bytes land, and how
 * the bytes are fetched when the provider returns a URL rather than inline data.
 *
 * Consumed by {@link withGenerationPersistence} through
 * {@link WithGenerationPersistenceOptions}. Chat persistence has no artifacts —
 * its options are {@link WithPersistenceOptions}.
 */
export interface ArtifactPersistenceOptions {
    extractArtifacts?: (input: GenerationArtifactExtractionInput) => Array<GenerationArtifactDescriptor | PersistedArtifactRef> | Promise<Array<GenerationArtifactDescriptor | PersistedArtifactRef>>;
    nameArtifact?: (input: GenerationArtifactNameInput) => string;
    /**
     * Map a freshly-persisted artifact ref to the durable app-origin URL that
     * serves its bytes (your `GET` route around `retrieveArtifact` /
     * `retrieveBlob`). The returned URL is stamped onto `ref.url` and written into
     * the result's media field, so both the live and the restored result render
     * durable media from your own origin instead of the provider's expiring link.
     * Return `undefined` to leave a ref without a durable URL.
     */
    artifactUrl?: (ref: PersistedArtifactRef) => string | undefined;
    /**
     * Choose the blob-store key each artifact's bytes are written under, so
     * generated media can land in your own folder structure rather than the
     * default `artifacts/<runId>/<artifactId>`.
     *
     * ```ts
     * storageKey: ({ runId, artifactId, mimeType }) =>
     *   `video/${videoId}/frames/${runId}-${artifactId}.png`
     * ```
     *
     * Server-side only, and deliberately so: a key supplied by the browser would
     * be a path-traversal and cross-tenant-write vector.
     *
     * The resolved key is recorded on `ArtifactRecord.blobKey`, because once the
     * path is arbitrary a reader can no longer recompute it. Returning a
     * non-unique key overwrites — include `artifactId` (or something equally
     * unique) unless you intend that.
     */
    storageKey?: (input: {
        artifactId: string;
        runId: string;
        threadId: string;
        role: PersistedArtifactRole;
        activity: PersistedArtifactActivity;
        path: string;
        mimeType: string;
        name: string;
    }) => string;
    /**
     * Opt in to fetching prompt media referenced by URL (`role: 'input'`).
     *
     * Off by default, and deliberately expressed as a predicate rather than a
     * boolean: input URLs come from the caller, so fetching them server-side
     * turns your server into a proxy for whatever the caller names — cloud
     * metadata endpoints, `localhost` admin services, anything your network can
     * reach. The bytes are also redundant in the common case, since the client
     * already had the media it referenced.
     *
     * Enable this only when you genuinely need a durable copy of caller-supplied
     * media (a "paste an image URL" input box, say), and validate the target:
     *
     * ```ts
     * allowInputUrl: ({ url }) => url.hostname.endsWith('.cdn.example.com')
     * ```
     *
     * Requests are additionally forced through the same baseline checks every
     * artifact fetch gets (http/https only, timeout, size cap), plus — because
     * the target is untrusted — a loopback/private/link-local host block and
     * `redirect: 'manual'` so a 302 cannot hop to an internal address. Those are
     * a backstop, not a substitute for a narrow predicate: a hostname that
     * resolves to a private address still passes a literal-IP check.
     */
    allowInputUrl?: (input: {
        url: URL;
        descriptor: GenerationArtifactDescriptor;
    }) => boolean | Promise<boolean>;
    /** Abort an artifact fetch after this many ms. Default 30_000. */
    artifactFetchTimeoutMs?: number;
    /**
     * Refuse an artifact body larger than this many bytes. Default 1 GiB.
     *
     * This is a bound on TRANSFER, not on memory: the URL path streams into the
     * blob store and never buffers, so a 1 GiB artifact costs a streaming store
     * (R2, S3, filesystem) flat memory. What the cap buys is a ceiling on what a
     * broken or hostile origin can make you pull and store — `content-length` is
     * advisory, so without it an artifact fetch is an unbounded transfer billed
     * to you.
     *
     * Pass `false` to remove the ceiling entirely. That also removes the
     * cap-enforcing `TransformStream` wrapper, so the fetched body reaches your
     * store exactly as `fetch` produced it — on workerd that means it keeps its
     * native declared length and `R2Bucket.put` can single-shot it with no hint,
     * no multipart, and nothing buffered. Do that when you trust the origins you
     * fetch from (your provider's CDN); keep the cap when `allowInputUrl` lets
     * callers name the URL.
     */
    maxArtifactBytes?: number | false;
    /**
     * `fetch` used to download artifact bytes. Defaults to the global. Inject to
     * route downloads through a proxy or an egress-restricted agent — the most
     * robust SSRF control available here, since it can resolve and check the
     * address actually connected to.
     */
    artifactFetch?: typeof globalThis.fetch;
}
/**
 * Options for {@link withGenerationPersistence}: everything in
 * {@link ArtifactPersistenceOptions}, plus an optional scope override.
 */
export interface WithGenerationPersistenceOptions extends ArtifactPersistenceOptions {
    /**
     * Override the scope runs are filed under. Defaults to the `threadId` you
     * passed the activity, which is normally what you want, so leave this unset
     * unless the record belongs somewhere other than the activity's own scope.
     */
    threadId?: string;
}
export interface GenerationArtifactDescriptor {
    role: PersistedArtifactRole;
    path: string;
    mediaType?: PersistedArtifactRef['source']['mediaType'];
    mimeType?: string;
    bytes?: BlobBody;
    url?: string;
    json?: unknown;
    name?: string;
    jobId?: string;
    expiresAt?: string | Date;
}
export interface GenerationArtifactExtractionInput {
    activity: PersistedArtifactActivity;
    provider: string;
    model: string;
    threadId: string;
    runId: string;
    inputs: unknown;
    result: unknown;
}
export interface GenerationArtifactNameInput {
    descriptor: GenerationArtifactDescriptor;
    activity: PersistedArtifactActivity;
    provider: string;
    model: string;
    threadId: string;
    runId: string;
    index: number;
}
type StoreIsDefinitelyPresent<TStores extends AIPersistenceStores, TKey extends keyof AIPersistenceStores> = TKey extends keyof TStores ? object extends Pick<TStores, TKey> ? false : [Exclude<TStores[TKey], undefined>] extends [never] ? false : true : false;
type StoreIsDefinitelyAbsent<TStores extends AIPersistenceStores, TKey extends keyof AIPersistenceStores> = TKey extends keyof TStores ? [Exclude<TStores[TKey], undefined>] extends [never] ? true : false : true;
/**
 * Chat entrypoint invalid when:
 * - `messages` is known-absent, or
 * - `interrupts` is known-present without `runs`.
 *
 * Fully optional bags (`AIPersistence` with all `?` keys) stay assignable and
 * are checked at runtime by {@link validateChatPersistenceStores}.
 */
type InvalidChatPersistence<TStores extends AIPersistenceStores> = StoreIsDefinitelyAbsent<TStores, 'messages'> extends true ? true : StoreIsDefinitelyPresent<TStores, 'interrupts'> extends true ? StoreIsDefinitelyAbsent<TStores, 'runs'> : false;
/**
 * Generation entrypoint invalid when `generationRuns` is known-absent, or when
 * exactly one of `artifacts` / `blobs` is present (artifact persistence needs
 * both).
 */
type InvalidGenerationPersistence<TStores extends AIPersistenceStores> = StoreIsDefinitelyAbsent<TStores, 'generationRuns'> extends true ? true : StoreIsDefinitelyPresent<TStores, 'artifacts'> extends true ? StoreIsDefinitelyAbsent<TStores, 'blobs'> : StoreIsDefinitelyPresent<TStores, 'blobs'> extends true ? StoreIsDefinitelyAbsent<TStores, 'artifacts'> : false;
type ValidChatPersistence<TStores extends AIPersistenceStores> = InvalidChatPersistence<TStores> extends true ? never : unknown;
type ValidGenerationPersistence<TStores extends AIPersistenceStores> = InvalidGenerationPersistence<TStores> extends true ? never : unknown;
/**
 * Record a human-in-the-loop PAUSE.
 *
 * Deliberately writes NO `finishedAt`: `'interrupted'` is not a terminal status
 * (`isTerminalRunStatus('interrupted')` is `false`), and stamping a terminal
 * timestamp on it told every reader the run was over while it was in fact
 * waiting for a human. Only `abortRun`/`completeRun`/`failRun` finish a run.
 */
export declare function interruptRun(runs: RunStore | undefined, runId: string, usage?: TokenUsage): Promise<void>;
/**
 * Record that the run has ended for good — an explicit cancel, or a disconnect
 * on a run that has nothing to reattach to. Terminal, so it carries
 * `finishedAt`.
 */
export declare function abortRun(runs: RunStore | undefined, runId: string, usage?: TokenUsage): Promise<void>;
export interface WithPersistenceOptions {
    /**
     * Also persist a throttled snapshot of the in-progress assistant reply while
     * it streams. Off by default — the transcript is otherwise persisted at the
     * pending turn (`onStart`), interrupt boundaries, and completion (`onFinish`).
     * Enable it to recover partial output if the process dies mid-generation, at
     * the cost of extra writes. Snapshots are throttled to at most one per
     * {@link WithPersistenceOptions.snapshotIntervalMs}.
     */
    snapshotStreaming?: boolean;
    /**
     * Minimum milliseconds between streaming snapshots when `snapshotStreaming`
     * is on. Defaults to 1000. A streaming subagent child always uses the same
     * interval for its transcript writes, with or without `snapshotStreaming`.
     */
    snapshotIntervalMs?: number;
}
/**
 * Chat-only **state** persistence middleware. Provides durable transcript,
 * run records, and interrupts for `chat()`. Does **not** provide locks —
 * use `withLocks` from `@tanstack/ai` for multi-instance coordination.
 *
 * This middleware never mutates the chunk stream; delivery durability
 * (replaying a disconnected/reloaded stream) is a separate transport-layer
 * concern (see the resumable-streams docs).
 *
 * Requires `stores.messages`. When `stores.interrupts` is present,
 * `stores.runs` is also required.
 *
 * Incoming `messages` merge into the stored thread by id. An empty list loads
 * the stored thread. The last incoming id that already exists in stored is a
 * cutoff; stored messages after it are dropped (reload). If no incoming id is
 * in stored, every stored message stays. Same id: incoming wins. New ids and
 * messages with no id are appended. `saveThread` still replaces the thread
 * with that merged list.
 *
 * @param persistence - Must satisfy {@link ChatTranscriptStores} (messages
 *   required). Known-absent `messages` or `interrupts` without `runs` fail at
 *   compile time; fully dynamic bags are checked at runtime.
 */
export declare function withPersistence<TStores extends ChatTranscriptStores>(persistence: AIPersistence<TStores> & ValidChatPersistence<TStores>, options?: WithPersistenceOptions): ChatMiddleware;
/**
 * Generation-only persistence middleware. Tracks generation run status (run
 * records keyed by `runId`) and, when `stores.artifacts` + `stores.blobs` are
 * both provided, persists the generated media for image, audio, TTS, video, and
 * transcription activities.
 *
 * Requires `stores.generationRuns`. A generation activity has no conversation,
 * so the run is keyed on its own `runId` (`ctx.runId ?? ctx.requestId`), which
 * is never faked from anything else.
 *
 * A `threadId` is REQUIRED alongside it — not as a link to a chat, but as the
 * stable app-chosen slot successive runs of the same thing fill
 * (`product-123-hero`, `video-9-start-frame`). It is what
 * `stores.generationRuns.findLatestForThread` keys on, and therefore the only
 * way a run is ever hydrated again. It comes from the `threadId` passed to the
 * activity, or from {@link WithGenerationPersistenceOptions.threadId} when that
 * overrides it; supplying neither throws at `onStart` rather than filing a run
 * nothing can find.
 *
 * On success the terminal result metadata (ids, urls — never media bytes) and,
 * when artifact persistence is on, the persisted artifact refs are captured onto
 * the run record so a server-authoritative client can hydrate the last
 * generation for a thread via {@link reconstructGeneration}.
 */
export declare function withGenerationPersistence<TStores extends AIPersistenceStores>(persistence: AIPersistence<TStores> & ValidGenerationPersistence<TStores>, opts?: WithGenerationPersistenceOptions): GenerationMiddleware;
export {};
