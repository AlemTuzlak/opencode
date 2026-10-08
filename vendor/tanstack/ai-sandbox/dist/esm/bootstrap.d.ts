import { SandboxHandle } from './contracts.js';
import { PackageManager, WorkspaceDefinition } from './workspace.js';
export declare const DEFAULT_WORKSPACE_ROOT = "/workspace";
/** Resolve the package manager, detecting from a lockfile when `'auto'`. */
export declare function detectPackageManager(handle: SandboxHandle, workspace: WorkspaceDefinition, root: string): Promise<Exclude<PackageManager, 'auto'> | undefined>;
export interface BootstrapResult {
    packageManager?: Exclude<PackageManager, 'auto'>;
    ranSetup: Array<string>;
}
/**
 * Bootstrap a freshly created sandbox's workspace. Idempotent enough to be safe
 * on restore: a git clone into a populated dir is skipped by checking for the
 * target dir first.
 */
export declare function bootstrapWorkspace(handle: SandboxHandle, workspace: WorkspaceDefinition, options?: {
    signal?: AbortSignal;
}): Promise<BootstrapResult>;
