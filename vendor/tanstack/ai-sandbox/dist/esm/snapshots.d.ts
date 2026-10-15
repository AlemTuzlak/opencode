import { SandboxHandle } from './contracts.js';
import { SandboxSnapshotArtifact, SandboxSnapshotEntry } from './checkpoint-store.js';
import { MemoryArtifactRecord as ArtifactRecord } from './memory-snapshot-types.js';
type SnapshotBlobStore = {
    get: (key: string) => Promise<{
        arrayBuffer: () => Promise<ArrayBuffer>;
    } | null>;
    head: (key: string) => Promise<unknown>;
    put: (key: string, body: Uint8Array) => Promise<unknown>;
};
export interface SandboxSnapshotPolicy {
    /** Exact workspace projection hash, when known. */
    workspaceHash?: string;
    include?: (path: string, kind: 'file' | 'dir') => boolean;
    exclude?: (path: string, kind: 'file' | 'dir') => boolean;
    redact?: (input: {
        path: string;
        bytes: Uint8Array;
        resolvedSecrets: Readonly<Record<string, string>>;
    }) => Uint8Array;
}
export interface SandboxSnapshotBundle {
    blobs: SnapshotBlobStore;
    /** Internal resolved workspace root. */
    workspaceRoot?: string;
    /** Internal persistence stores used to capture immutable artifact bytes. */
    artifacts?: {
        listForThread: (threadId: string) => Promise<ReadonlyArray<ArtifactRecord>>;
    };
    resolveArtifactBlobKey?: (record: ArtifactRecord) => string;
}
export type SandboxSnapshotErrorCode = 'SANDBOX_SNAPSHOT_INVALID_TOOL_INPUT' | 'SANDBOX_SNAPSHOT_MISSING_SANDBOX' | 'SANDBOX_SNAPSHOT_MISSING_INSTANCES' | 'SANDBOX_SNAPSHOT_MISSING_PERSISTENCE_STORES' | 'SANDBOX_SNAPSHOT_MISSING_REUSABLE_SANDBOX' | 'SANDBOX_SNAPSHOT_REUSE_NONE' | 'SANDBOX_SNAPSHOT_MISSING_CHECKPOINT' | 'SANDBOX_SNAPSHOT_MISSING_CHECKPOINT_ARTIFACT' | 'SANDBOX_SNAPSHOT_FOREIGN_CHECKPOINT_ARTIFACT' | 'SANDBOX_SNAPSHOT_INVALID_ARTIFACT_BYTES' | 'SANDBOX_SNAPSHOT_FORK_UNAVAILABLE' | 'SANDBOX_SNAPSHOT_INVALID_PATH' | 'SANDBOX_SNAPSHOT_INVALID_WORKSPACE' | 'SANDBOX_SNAPSHOT_LSTAT_REQUIRED' | 'SANDBOX_SNAPSHOT_UNSUPPORTED_ENTRY' | 'SANDBOX_SNAPSHOT_MISSING_BLOB' | 'SANDBOX_SNAPSHOT_INVALID_BLOB' | 'SANDBOX_SNAPSHOT_ARTIFACT_SUPPORT_REQUIRED' | 'SANDBOX_SNAPSHOT_MISSING_ARTIFACT_BLOB';
export declare class SandboxSnapshotError extends Error {
    readonly code: SandboxSnapshotErrorCode;
    constructor(code: SandboxSnapshotErrorCode, message: string);
}
export declare function defaultSandboxSnapshotPolicy(workspaceHash?: string): SandboxSnapshotPolicy;
/**
 * Keep default exclusions unless the caller passed `exclude`.
 * `include` or `redact` alone must not capture `.env`, `.git`, or
 * `node_modules`.
 */
export declare function resolveSandboxSnapshotPolicy(supplied: SandboxSnapshotPolicy | undefined, workspaceHash?: string): SandboxSnapshotPolicy;
export declare function captureSandboxFiles(handle: SandboxHandle, bundle: SandboxSnapshotBundle, suppliedPolicy?: SandboxSnapshotPolicy, resolvedSecrets?: Readonly<Record<string, string>>): Promise<{
    files: Array<SandboxSnapshotEntry>;
}>;
export declare function restoreSandboxFiles(handle: SandboxHandle, bundle: SandboxSnapshotBundle, snapshot: {
    files: ReadonlyArray<SandboxSnapshotEntry>;
}, suppliedPolicy?: SandboxSnapshotPolicy): Promise<void>;
export declare function captureSandboxArtifacts(bundle: SandboxSnapshotBundle, threadId: string, resolvedSecrets?: Readonly<Record<string, string>>): Promise<ReadonlyArray<SandboxSnapshotArtifact>>;
export {};
