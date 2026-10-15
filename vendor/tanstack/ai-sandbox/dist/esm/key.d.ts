import { WorkspaceDefinition } from './workspace.js';
/** Inputs that, together, identify one resumable sandbox instance. */
export interface SandboxKeyInput {
    threadId: string;
    sandboxId: string;
    providerName: string;
    workspace?: WorkspaceDefinition;
    /** Optional tenant scoping pulled from runtimeContext. */
    tenant?: {
        userId?: string;
        orgId?: string;
    };
}
/**
 * Hash of the parts of a workspace that change what the agent sees. Secrets are
 * intentionally excluded (rotating a token must not orphan the sandbox).
 */
export declare function computeWorkspaceHash(workspace: WorkspaceDefinition | undefined): string;
/** Compute the compound sandbox instance key. */
export declare function computeSandboxKey(input: SandboxKeyInput): string;
