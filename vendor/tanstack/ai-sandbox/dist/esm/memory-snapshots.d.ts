import { MemorySnapshotPersistence } from './memory-snapshot-types.js';
import { ForkCapableSandboxCheckpointStore } from './checkpoint-store.js';
import { CreateSandboxSnapshotsInput, SandboxSnapshots } from './snapshot-operations.js';
export type MemorySandboxSnapshots = SandboxSnapshots<MemorySnapshotPersistence, ForkCapableSandboxCheckpointStore>;
export type MemorySandboxSnapshotsOptions = Omit<CreateSandboxSnapshotsInput<MemorySnapshotPersistence, ForkCapableSandboxCheckpointStore>, 'persistence' | 'checkpoints'>;
export declare function memorySandboxSnapshots(options?: MemorySandboxSnapshotsOptions): Promise<MemorySandboxSnapshots>;
