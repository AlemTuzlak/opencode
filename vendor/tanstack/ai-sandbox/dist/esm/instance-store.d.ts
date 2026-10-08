/** One persisted sandbox instance, keyed by the compound sandbox instance key. */
export interface SandboxInstanceRecord {
    /** Compound key (see `computeSandboxKey`). */
    key: string;
    /** Provider name that owns `providerSandboxId`. */
    provider: string;
    /** Provider-assigned sandbox id used to resume. */
    providerSandboxId: string;
    /** Most recent snapshot id, when the provider supports snapshots. */
    latestSnapshotId?: string;
    threadId: string;
    latestRunId?: string;
    /**
     * Epoch ms of last write (for keepAlive / GC by the host app).
     */
    updatedAt: number;
}
/**
 * Maps a compound key to the provider sandbox that should be resumed.
 *
 * Implement against your own database (BYO). Prove the contract with
 * `runSandboxInstanceStoreConformance` from `@tanstack/ai-sandbox/testkit`.
 */
export interface SandboxInstanceStore {
    /**
     * Return the record for `key`, or `null` if none exists.
     *
     * INVARIANT: missing keys return `null` (never throw).
     */
    get: (key: string) => Promise<SandboxInstanceRecord | null>;
    /**
     * Insert or fully replace the record for `record.key`.
     *
     * INVARIANT (full replace): omitted optional fields (`latestSnapshotId`,
     * `latestRunId`) MUST clear any previously stored values. Do not merge with
     * the prior row — a create-without-snapshot path must not leave a stale
     * snapshot id.
     */
    upsert: (record: SandboxInstanceRecord) => Promise<void>;
    /**
     * Remove the record for `key`.
     *
     * INVARIANT: deleting a missing key is a **no-op** (must not throw).
     */
    delete: (key: string) => Promise<void>;
}
/**
 * Type a {@link SandboxInstanceStore} implementation inline: pass the object and
 * get autocomplete + contract checking, with no separate
 * `: SandboxInstanceStore` annotation. Hand the result to
 * `withSandbox(sandbox, { instances })`. Matches `defineLock` /
 * `defineMessageStore` style helpers elsewhere in the monorepo.
 */
export declare function defineSandboxInstanceStore(store: SandboxInstanceStore): SandboxInstanceStore;
/**
 * Capability for the instance map — the ambient alternative to
 * `withSandbox(sandbox, { instances })`. Provide it from any middleware with
 * {@link provideSandboxInstanceStore}; `withSandbox` reads it when no explicit
 * option was passed.
 */
export declare const SandboxInstanceStoreCapability: import('@tanstack/ai').Capability<SandboxInstanceStore, "sandbox-instance-store">;
/** Destructured accessors: `getSandboxInstanceStore` / `provideSandboxInstanceStore`. */
export declare const getSandboxInstanceStore: import('@tanstack/ai').CapabilityGetter<SandboxInstanceStore>, provideSandboxInstanceStore: import('@tanstack/ai').CapabilityProvider<SandboxInstanceStore>;
/** In-memory {@link SandboxInstanceStore}. Resume works only within one process. */
export declare class InMemorySandboxInstanceStore implements SandboxInstanceStore {
    private readonly map;
    get(key: string): Promise<SandboxInstanceRecord | null>;
    upsert(record: SandboxInstanceRecord): Promise<void>;
    delete(key: string): Promise<void>;
}
/**
 * Wiring note: hand the store straight to the consumer —
 * `withSandbox(sandbox, { instances: store })`. That cannot be mis-ordered,
 * unlike a separate provider middleware composed after `withSandbox` (which
 * silently degrades to the in-memory fallback).
 *
 * ```ts
 * middleware: [
 *   withLocks(locks), // from @tanstack/ai/locks — multi-replica
 *   withSandbox(sandbox, { instances: instanceStore }),
 * ]
 * ```
 *
 * For ambient/platform wiring (a hosting layer injecting infra without touching
 * the call site), any middleware may still
 * `provideSandboxInstanceStore(ctx, store)` on the capability bus; an explicit
 * option takes precedence over it.
 */
