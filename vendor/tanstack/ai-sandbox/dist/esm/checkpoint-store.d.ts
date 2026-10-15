import { ModelMessage } from '@tanstack/ai';
export interface SandboxSnapshotFileEntry {
    path: string;
    kind: 'file';
    blobKey: string;
    size: number;
}
export interface SandboxSnapshotDirectoryEntry {
    path: string;
    kind: 'dir';
}
export type SandboxSnapshotEntry = SandboxSnapshotFileEntry | SandboxSnapshotDirectoryEntry;
export interface SandboxSnapshotArtifact {
    artifactId: string;
    name: string;
    mimeType: string;
    size: number;
    blobKey: string;
    createdAt: number;
}
export interface SandboxCheckpoint {
    id: string;
    threadId: string;
    parentCheckpointId: string | null;
    createdAt: number;
    reason: 'automatic' | 'named' | 'fork-root';
    label?: string;
    sourceRunId?: string;
    files: ReadonlyArray<SandboxSnapshotEntry>;
    conversation: ReadonlyArray<ModelMessage>;
    artifacts: ReadonlyArray<SandboxSnapshotArtifact>;
}
export interface SandboxCheckpointStore {
    get: (id: string) => Promise<SandboxCheckpoint | null>;
    list: (threadId: string) => Promise<Array<SandboxCheckpoint>>;
    getHead: (threadId: string) => Promise<string | null>;
    append: (input: {
        checkpoint: SandboxCheckpoint;
        expectedHeadId: string | null;
        writer: SandboxCheckpointWriter;
    }) => Promise<{
        headId: string;
    }>;
    deleteHead: (input: {
        threadId: string;
        checkpointId: string;
        writer: SandboxCheckpointWriter;
    }) => Promise<void>;
    acquireWriter: (threadId: string) => Promise<SandboxCheckpointWriterLease>;
    listBlobReferences: () => Promise<Array<{
        key: string;
        references: number;
    }>>;
    /** Optional atomic fork capability. Stores without this method cannot fork. */
    forkFromCheckpoint?: SandboxCheckpointForkCapability['forkFromCheckpoint'];
}
export interface SandboxCheckpointForkInput {
    sourceThreadId: string;
    sourceCheckpointId: string;
    destinationThreadId: string;
    destinationCheckpointId: string;
    createdAt: number;
    writer: SandboxCheckpointWriter;
}
export interface SandboxCheckpointForkCapability {
    forkFromCheckpoint: (input: SandboxCheckpointForkInput) => Promise<{
        checkpoint: SandboxCheckpoint;
    }>;
}
export type ForkCapableSandboxCheckpointStore = SandboxCheckpointStore & SandboxCheckpointForkCapability;
export declare function isForkCapableSandboxCheckpointStore(store: SandboxCheckpointStore): store is ForkCapableSandboxCheckpointStore;
export interface SandboxCheckpointWriter {
    threadId: string;
    ownerToken: string;
    fence: number;
}
export interface SandboxCheckpointWriterLease extends SandboxCheckpointWriter {
    expiresAt: number;
    renewAfterMs: number;
    renew: () => Promise<{
        expiresAt: number;
    }>;
    release: () => Promise<void>;
}
export interface SandboxCheckpointStoreOptions {
    now?: () => number;
    leaseDurationMs?: number;
    renewAfterMs?: number;
}
export type SandboxCheckpointErrorCode = 'SANDBOX_SNAPSHOT_STALE_HEAD' | 'SANDBOX_SNAPSHOT_PARENT_MISMATCH' | 'SANDBOX_SNAPSHOT_DUPLICATE_ID' | 'SANDBOX_SNAPSHOT_NOT_HEAD' | 'SANDBOX_SNAPSHOT_WRITER_CONFLICT' | 'SANDBOX_SNAPSHOT_WRITER_LOST' | 'SANDBOX_SNAPSHOT_INVALID_ID' | 'SANDBOX_SNAPSHOT_INVALID_ENTRY' | 'SANDBOX_SNAPSHOT_CHECKPOINT_NOT_FOUND' | 'SANDBOX_SNAPSHOT_ATOMIC_FORK_REQUIRED' | 'SANDBOX_SNAPSHOT_FORK_SOURCE_NOT_FOUND' | 'SANDBOX_SNAPSHOT_FORK_SOURCE_THREAD_MISMATCH' | 'SANDBOX_SNAPSHOT_FORK_DESTINATION_NOT_EMPTY';
export declare class SandboxCheckpointError extends Error {
    readonly code: SandboxCheckpointErrorCode;
    constructor(code: SandboxCheckpointErrorCode, message: string);
}
export declare class SandboxCheckpointConflictError extends SandboxCheckpointError {
    constructor(message: string);
}
export declare class SandboxCheckpointDuplicateIdError extends SandboxCheckpointError {
    constructor(message: string);
}
export declare class SandboxCheckpointInvalidIdError extends SandboxCheckpointError {
    constructor(message: string);
}
export declare class SandboxCheckpointInvalidEntryError extends SandboxCheckpointError {
    constructor(message: string);
}
export declare class SandboxCheckpointParentMismatchError extends SandboxCheckpointError {
    constructor(message: string);
}
export declare class SandboxCheckpointNotHeadError extends SandboxCheckpointError {
    constructor(message: string);
}
export declare class SandboxCheckpointWriterConflictError extends SandboxCheckpointError {
    constructor(message: string);
}
export declare class SandboxCheckpointWriterLostError extends SandboxCheckpointError {
    constructor(message: string);
}
export declare function defineSandboxCheckpointStore(store: SandboxCheckpointStore): SandboxCheckpointStore;
export declare class InMemorySandboxCheckpointStore implements SandboxCheckpointStore {
    private readonly state;
    private readonly now;
    private readonly leaseDurationMs;
    private readonly renewAfterMs;
    constructor(options?: SandboxCheckpointStoreOptions);
    get(id: string): Promise<SandboxCheckpoint | null>;
    list(threadId: string): Promise<Array<SandboxCheckpoint>>;
    getHead(threadId: string): Promise<string | null>;
    append(input: {
        checkpoint: SandboxCheckpoint;
        expectedHeadId: string | null;
        writer: SandboxCheckpointWriter;
    }): Promise<{
        headId: string;
    }>;
    deleteHead(input: {
        threadId: string;
        checkpointId: string;
        writer: SandboxCheckpointWriter;
    }): Promise<void>;
    acquireWriter(threadId: string): Promise<SandboxCheckpointWriterLease>;
    private assertWriter;
    listBlobReferences(): Promise<Array<{
        key: string;
        references: number;
    }>>;
}
