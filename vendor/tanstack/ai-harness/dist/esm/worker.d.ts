import { AnyHarness } from './define.js';
import { HarnessPersistence } from './host.js';
export interface HarnessWorkerOptions {
    input?: NodeJS.ReadableStream;
    output?: {
        write: (text: string) => unknown;
    };
    persistence?: HarnessPersistence;
}
/**
 * Run a harness as a worker: session-tier frames as NDJSON on stdin and
 * stdout. The first frame must be `harness.subscribe`. The worker exits when
 * stdin closes. `artifactText` starts workers like this.
 */
export declare function runHarnessWorker(harness: AnyHarness, options?: HarnessWorkerOptions): Promise<void>;
