import { SandboxCapability } from './capabilities.js';
import { ProjectionCapability } from './projection.js';
import { SandboxSnapshotPolicy } from './snapshots.js';
import { SandboxCheckpointStore } from './checkpoint-store.js';
import { LockStore } from '@tanstack/ai/locks';
import { DefinedChatMiddleware, ModelMessage, RunStore } from '@tanstack/ai';
import { SandboxDurabilityOptions } from './durability.js';
import { SandboxInstanceStore } from './instance-store.js';
import { SandboxDefinition } from './sandbox.js';
/**
 * Durability seams for a sandboxed run. Both are optional; each independently
 * falls back to a process-lifetime in-memory default, which is correct for a
 * single process but NOT across replicas.
 */
export interface SandboxMiddlewareOptions<TOffset extends string = string> {
    snapshots?: {
        persistence: {
            stores: {
                messages: {
                    loadThread: (threadId: string) => Promise<ReadonlyArray<ModelMessage>>;
                };
                artifacts: {
                    listForThread: (threadId: string) => Promise<ReadonlyArray<{
                        artifactId: string;
                        runId: string;
                        threadId: string;
                        blobKey?: string;
                        name: string;
                        mimeType: string;
                        size: number;
                        createdAt: number;
                    }>>;
                };
                blobs: {
                    get: (key: string) => Promise<{
                        arrayBuffer: () => Promise<ArrayBuffer>;
                    } | null>;
                    head: (key: string) => Promise<unknown>;
                    put: (key: string, body: Uint8Array) => Promise<unknown>;
                };
            };
        };
        checkpoints: SandboxCheckpointStore;
        policy?: SandboxSnapshotPolicy;
    };
    /**
     * Durable instance map (which provider sandbox to resume for a key). Pass
     * your own store to make resume survive across processes/replicas.
     *
     * Takes precedence over a store provided on the capability bus (see
     * `provideSandboxInstanceStore`), so the call site wins over ambient wiring.
     */
    instances?: SandboxInstanceStore;
    /**
     * Distributed lock serializing resume-or-create for one key. Needed for
     * multi-replica correctness so two concurrent runs don't both create.
     *
     * Prefer `withLocks` from `@tanstack/ai/locks` when other middleware also
     * needs the lock; use this option to scope one to this sandbox. Takes
     * precedence over a bus-provided lock.
     */
    locks?: LockStore;
    /**
     * Run lifecycle records. Pair with `durability.adapter` to make a run
     * DETACHABLE: a client disconnect then leaves the agent running and records
     * `detachedSince` instead of destroying the sandbox.
     *
     * Pass the SAME store chat persistence uses (`persistence.stores.runs`) so
     * one record describes the run instead of two that can disagree.
     *
     * Defaults to `undefined`: an app that passes neither this nor `durability`
     * keeps today's destroy-on-disconnect behavior exactly.
     */
    runs?: RunStore;
    /**
     * Delivery durability for the run's event log, plus the journal and detach
     * knobs. Requires `runs`; either alone is not durable.
     *
     * `TOffset` is inferred from the adapter passed here, so a branded-cursor
     * backend (`durableStream`) wires without a cast and without the call site
     * ever naming the parameter.
     */
    durability?: SandboxDurabilityOptions<TOffset>;
}
export declare function withSandbox<TOffset extends string = string>(definition: SandboxDefinition, options?: SandboxMiddlewareOptions<TOffset>): DefinedChatMiddleware<unknown, readonly [], readonly [typeof SandboxCapability, typeof ProjectionCapability]>;
