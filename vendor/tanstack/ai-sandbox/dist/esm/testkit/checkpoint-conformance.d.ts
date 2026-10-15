import { SandboxCheckpointStore, SandboxCheckpointStoreOptions } from '../checkpoint-store.js';
export declare function runSandboxCheckpointStoreConformance(name: string, makeStore: (options?: SandboxCheckpointStoreOptions) => SandboxCheckpointStore | Promise<SandboxCheckpointStore>, options?: SandboxCheckpointStoreOptions): void;
