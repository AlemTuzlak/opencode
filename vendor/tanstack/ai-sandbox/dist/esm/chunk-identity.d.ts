import { StreamChunk } from '@tanstack/ai';
/**
 * A deterministic id generator scoped to one run.
 *
 * Passed as the harness translators' `genId`, so translating the same journal
 * prefix twice mints the same message ids. The counter is per-generator, so a
 * replay must create a fresh one and start from the journal's first byte —
 * which is exactly what the alignment step (a later task) assumes.
 *
 * No clock, no `Math.random`, no crypto: `next` is the only state, and it is
 * seeded fresh for every call to this factory.
 */
export declare function createRunScopedIdGen(runId: string): () => string;
export declare function chunkFingerprint(chunk: StreamChunk): string;
/**
 * {@link chunkFingerprint} with the chunk's own `threadId` also excluded.
 *
 * NOT an alternative identity — never use it to decide that two chunks are the
 * same. Its single purpose is DIAGNOSIS: when a replay diverges from the stored
 * log, comparing both fingerprints answers "did the agent behave differently, or
 * did only the conversation id move?". Two chunks that match here but not under
 * {@link chunkFingerprint} differ in `threadId` and nothing else, which is a
 * misconfigured attach route rather than a determinism regression (see
 * `JournalReplayThreadIdMismatchError` in `align.ts`).
 */
export declare function chunkFingerprintIgnoringThreadId(chunk: StreamChunk): string;
/**
 * A chunk's own `threadId`, or `undefined` when it carries none.
 *
 * Reads the field structurally rather than narrowing on `chunk.type`: nearly
 * every member of the `StreamChunk` union declares `threadId?: string`, and an
 * exhaustive switch would have to be revisited for each new member while adding
 * nothing — a chunk with no `threadId` is exactly the `undefined` case.
 */
export declare function chunkThreadId(chunk: StreamChunk): string | undefined;
