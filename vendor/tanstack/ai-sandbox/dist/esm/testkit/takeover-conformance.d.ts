import { SandboxHandle } from '../contracts.js';
export interface TakeoverConformanceConfig {
    /** Provider name, used in the describe title. */
    name: string;
    /** Create a live sandbox plus its teardown. */
    createHandle: () => Promise<{
        handle: SandboxHandle;
        dispose: () => Promise<void>;
    }>;
    /**
     * Declare that this provider cannot support takeover, with the reason.
     * Registers a skipped case whose title carries the reason — a NAMED skip,
     * visible in the reporter. Omit it and the suite runs.
     */
    unsupported?: {
        reason: string;
    };
}
/**
 * Assert `createHandle` satisfies the takeover conformance contract. Each `it`
 * gets a fresh sandbox via `createHandle`/`dispose`, and a unique `runId`, so no
 * case can observe another's journal.
 */
export declare function runTakeoverConformance(config: TakeoverConformanceConfig): void;
