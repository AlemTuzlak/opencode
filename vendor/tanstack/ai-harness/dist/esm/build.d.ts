import { HARNESS_PROTOCOL_VERSION } from './protocol.js';
import { AnyTextAdapter } from '@tanstack/ai';
/** What a built harness says about itself. Fields are claims; deploy policy decides. */
export interface HarnessManifestV1 {
    format: 'tanstack-ai-harness';
    version: 1;
    name: string;
    /** sha256 of the bundle. */
    digest: string;
    /** The bundle file, relative to the manifest. */
    entry: string;
    runtime: {
        kind: 'node';
        major: number;
    };
    protocol: typeof HARNESS_PROTOCOL_VERSION;
    agents: Array<{
        name: string;
        produces?: string;
    }>;
    plugins: Array<{
        name: string;
    }>;
    requires: {
        filesystem: boolean;
        processExecution: boolean;
        network: 'model-only' | 'declared';
    };
}
export interface BuildHarnessOptions {
    /** The module that exports the harness. */
    entry: string;
    /** The export name. Default `'default'`. */
    export?: string;
    outDir: string;
    /**
     * Also build a single executable of `compile.entry` (for example a file
     * that calls `runCli`) with Bun.
     */
    compile?: {
        entry: string;
        outfile: string;
        target?: string;
    };
    /** The Bun executable. Default `'bun'`. */
    bun?: string;
}
/**
 * Bundle a harness into a worker artifact: `harness.js` (starts a worker on
 * stdin and stdout) and `harness.manifest.json`. With `compile`, also build a
 * single executable.
 *
 * The build imports `entry` in a child process to read the harness name,
 * agents, and plugin names. Importing a module runs its code.
 */
export declare function buildHarness(options: BuildHarnessOptions): Promise<{
    manifest: HarnessManifestV1;
    bundle: string;
    executable?: string;
}>;
/** Read and check the manifest of a built harness. */
export declare function readManifest(dir: string): Promise<HarnessManifestV1>;
/**
 * Use a built harness as the model of a `chat()` call. Each outer thread gets
 * its own worker process (`node harness.js`). Call `dispose()` to stop them.
 */
export declare function artifactText(dir: string, options?: {
    node?: string;
}): Promise<AnyTextAdapter & {
    dispose: () => void;
}>;
