import { AnyTranscriptionAdapter, ChatMiddleware, GenerationMiddleware, Modality } from '@tanstack/ai';
import { AIPersistence, ArtifactStore, BlobBody, BlobRange, BlobStore, GenerationRunStore } from '@tanstack/ai-persistence';
import { MediaKind, MediaRecord } from './types.js';
/** The `media` option of a harness: limits, and what the model reads. */
export interface MediaOptions {
    /** Refuse a file bigger than this many bytes. Default 100 MB. */
    maxBytes?: number;
    /** The kinds a user can send. Default: all four. */
    kinds?: ReadonlyArray<MediaKind>;
    /** The kinds the model reads. Narrows what the adapter says it reads. */
    accepts?: ReadonlyArray<MediaKind>;
    /** Turns audio into text first when the model cannot read audio. */
    transcribe?: AnyTranscriptionAdapter;
}
/**
 * A media request that failed. `status` is the HTTP status a route answers:
 * 404 (not found, or another thread's), 413 (too big), 415 (type not allowed).
 */
export declare class MediaError extends Error {
    readonly status: 404 | 413 | 415;
    constructor(status: 404 | 413 | 415, message: string);
}
/** The stores media lives in. */
export type MediaPersistence = AIPersistence<{
    artifacts: ArtifactStore;
    blobs: BlobStore;
}>;
/** The media store of one thread. */
export type MediaStore = ReturnType<typeof createMediaStore>;
/**
 * Base64 of `bytes`. It uses `btoa`, not the Node `Buffer`, so it runs on
 * workerd too.
 */
export declare function toBase64(bytes: Uint8Array): string;
/**
 * The media store of one thread, on the persistence `artifacts` and `blobs`
 * stores. It sees only the media of `threadId`: an id of another thread reads
 * as not found.
 *
 * `put` throws a `MediaError` with 413 (over `maxBytes`) or 415 (a MIME type
 * with no media kind, or a kind not in `kinds`). `load` throws a `MediaError`
 * with 404 when the record or its bytes are missing.
 *
 * @example
 * const media = createMediaStore({ persistence, threadId })
 * const record = await media.put(bytes, { mimeType: 'image/png', name: 'cat.png' })
 * const url = await media.dataUrl(record.id)
 */
export declare function createMediaStore({ persistence, threadId, options, }: {
    persistence: MediaPersistence;
    threadId: string;
    options?: MediaOptions;
}): {
    /** Store a user file. Returns its record. */
    put(body: BlobBody, info: {
        mimeType: string;
        name: string;
    }): Promise<MediaRecord>;
    /** The record of `id`, or `null` when it is missing or another thread's. */
    get: (id: string) => Promise<MediaRecord | null>;
    /** The bytes of `id`, or one `range` of them. */
    load: (id: string, range?: BlobRange) => Promise<Uint8Array<ArrayBuffer>>;
    /** A data URL for a file up to 1 MB. `undefined` above that. */
    dataUrl(id: string): Promise<string | undefined>;
};
/**
 * Generation middleware that keeps the media an agent makes and publishes a
 * record for each new file. It is `withGenerationPersistence` plus a result
 * transform that runs after it.
 *
 * A failed save or a failed `publish` does not fail the generation: the agent
 * gets its result, and `onError` gets the error, so the caller can warn.
 *
 * @example
 * const middleware = mediaCapture({
 *   persistence,
 *   threadId,
 *   publish: (record) => console.log(`saved ${record.name}`),
 *   onError: (error) => console.warn('media not kept', error),
 * })
 * await generateImage({ adapter, prompt, threadId, middleware })
 */
export declare function mediaCapture({ persistence, threadId, options, publish, onError, }: {
    persistence: AIPersistence<{
        artifacts: ArtifactStore;
        blobs: BlobStore;
        generationRuns: GenerationRunStore;
    }>;
    threadId: string;
    options?: MediaOptions;
    publish: (record: MediaRecord) => void | Promise<void>;
    onError?: (error: unknown) => void;
}): GenerationMiddleware<unknown>[];
/**
 * Chat middleware that gives the model the bytes of `harness-media:` parts.
 * It changes only what the adapter gets (`providerMessages`), so the saved
 * transcript keeps the small `harness-media:` URLs.
 *
 * - A part of a kind in `accepted` becomes a base64 data source. With
 *   `accepted` undefined, every kind is sent.
 * - Audio not in `accepted` becomes a transcript when `transcribe` is set.
 * - Any other kind not in `accepted` stops the run with a clear error before
 *   the model call.
 * - A part whose file is gone becomes a short text note.
 *
 * List it after `withPersistence` and after any middleware that returns
 * `messages`: a later `messages` result resets the provider messages.
 *
 * @example
 * chat({
 *   adapter,
 *   messages,
 *   middleware: [withPersistence(persistence), mediaMiddleware({ store })],
 * })
 */
export declare function mediaMiddleware({ store, accepted, transcribe, }: {
    store: MediaStore;
    accepted?: ReadonlyArray<Modality>;
    transcribe?: AnyTranscriptionAdapter;
}): ChatMiddleware<unknown, never>;
