import { ModelMessage } from '@tanstack/ai';
import { ForkCapableSandboxCheckpointStore } from '../checkpoint-store.js';
/** Combined stores required to exercise an atomic checkpoint fork. */
export interface SandboxCheckpointForkConformanceInput {
    persistence: {
        stores: {
            messages: {
                loadThread: (threadId: string) => Promise<Array<ModelMessage>>;
                saveThread: (threadId: string, messages: Array<ModelMessage>) => Promise<void>;
            };
        };
    };
    checkpoints: ForkCapableSandboxCheckpointStore;
}
export interface SandboxCheckpointForkConformanceFactory {
    (): SandboxCheckpointForkConformanceInput | Promise<SandboxCheckpointForkConformanceInput>;
}
export declare function runSandboxCheckpointForkConformance(name: string, makeSnapshots: SandboxCheckpointForkConformanceFactory): void;
