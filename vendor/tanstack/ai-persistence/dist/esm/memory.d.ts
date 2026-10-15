import { ActivityStore, ArtifactStore, BlobStore, GenerationRunStore, CredentialStore, InboxStore, InterruptStore, LogStore, MessageStore, MetadataStore, RunStore, WorkClaimStore, SessionIndexStore } from './types.js';
/**
 * In-process reference {@link LogStore}, for tests and one-process hosts. The
 * log is lost when the process stops. Records are JSON-copied in and out.
 *
 * @example
 * ```ts
 * const host = createHarnessHost({
 *   persistence: { stores: { log: memoryLogStore(), runs } },
 * })
 * ```
 */
export declare function memoryLogStore(): LogStore;
interface MemoryPersistenceStores {
    messages: MessageStore;
    activities: ActivityStore;
    runs: RunStore;
    generationRuns: GenerationRunStore;
    interrupts: InterruptStore;
    metadata: MetadataStore;
    artifacts: ArtifactStore;
    blobs: BlobStore;
    inbox: InboxStore;
    credentials: CredentialStore;
    workClaims: WorkClaimStore;
    sessions: SessionIndexStore;
}
/**
 * In-process reference backend for the full state + generation store set.
 *
 * Returns messages + activities + runs + generationRuns + interrupts +
 * metadata + artifacts + blobs + inbox + credentials + sessions + workClaims.
 * Locks are not included. Use `InMemoryLockStore` + `withLocks` from
 * `@tanstack/ai` when a test or single-process app needs coordination.
 */
export declare function memoryPersistence(): import('./types.js').AIPersistence<MemoryPersistenceStores>;
export {};
