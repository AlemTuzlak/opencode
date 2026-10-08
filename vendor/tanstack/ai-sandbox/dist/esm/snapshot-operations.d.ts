import { ModelMessage } from '@tanstack/ai';
import { LockStore } from '@tanstack/ai/locks';
import { SandboxCheckpoint, SandboxCheckpointStore } from './checkpoint-store.js';
import { SandboxInstanceStore } from './instance-store.js';
import { SandboxDefinition } from './sandbox.js';
import { SandboxSnapshotBundle, SandboxSnapshotPolicy } from './snapshots.js';
export interface SnapshotPersistence {
    stores: {
        messages: {
            loadThread: (threadId: string) => Promise<ReadonlyArray<ModelMessage>>;
        };
        artifacts: NonNullable<SandboxSnapshotBundle['artifacts']>;
        blobs: SandboxSnapshotBundle['blobs'];
    };
}
export interface CreateSandboxSnapshotsInput<TPersistence extends SnapshotPersistence = SnapshotPersistence, TCheckpoints extends SandboxCheckpointStore = SandboxCheckpointStore> {
    persistence: TPersistence;
    checkpoints: TCheckpoints;
    policy?: SandboxSnapshotPolicy;
    sandbox?: SandboxDefinition;
    instances?: SandboxInstanceStore;
    tenant?: {
        userId?: string;
        orgId?: string;
    };
    locks?: LockStore;
}
export interface SaveSandboxSnapshotInput {
    threadId: string;
    runId: string;
    label: string;
    sandbox?: SandboxDefinition;
    instances?: SandboxInstanceStore;
    tenant?: {
        userId?: string;
        orgId?: string;
    };
    locks?: LockStore;
    signal?: AbortSignal;
    adapterName?: string;
}
export interface ForkSandboxSnapshotInput {
    threadId: string;
    checkpointId: string;
    destinationThreadId: string;
    destinationCheckpointId?: string;
    createdAt?: number;
}
export interface ReadSandboxSnapshotArtifactInput {
    threadId: string;
    checkpointId: string;
    artifactId: string;
}
export interface SandboxSnapshots<TPersistence extends SnapshotPersistence = SnapshotPersistence, TCheckpoints extends SandboxCheckpointStore = SandboxCheckpointStore> {
    persistence: TPersistence;
    checkpoints: TCheckpoints;
    policy?: SandboxSnapshotPolicy;
    save: (input: SaveSandboxSnapshotInput) => Promise<SandboxCheckpoint>;
    fork: (input: ForkSandboxSnapshotInput) => Promise<SandboxCheckpoint>;
    readArtifact: (input: ReadSandboxSnapshotArtifactInput) => Promise<{
        artifact: SandboxCheckpoint['artifacts'][number];
        bytes: Uint8Array;
    }>;
}
export declare function createSandboxSnapshots<TPersistence extends SnapshotPersistence, TCheckpoints extends SandboxCheckpointStore>(input: CreateSandboxSnapshotsInput<TPersistence, TCheckpoints>): SandboxSnapshots<TPersistence, TCheckpoints>;
