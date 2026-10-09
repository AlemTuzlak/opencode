import { SandboxPolicy } from './policy.js';
import { StreamChunk } from '@tanstack/ai';
/** CUSTOM event name emitted when a harness action needs client approval. */
export declare const APPROVAL_REQUESTED_EVENT = "approval-requested";
/** A stable, opaque approval id for a harness action. */
export declare function approvalId(input: {
    provider: string;
    kind: 'command' | 'fileWrite' | 'network' | 'tool';
    target: string;
}): string;
export interface ResolveApprovalInput {
    policy: SandboxPolicy | undefined;
    /** Client approval decisions, keyed by `approvalId`. */
    approvals: ReadonlyMap<string, boolean> | undefined;
    /** Precomputed approval id for this action. */
    id: string;
    /** A shell command to match against `policy.commands`. */
    command?: string;
    /** Named workspace scripts for policy alias resolution. */
    scripts?: Record<string, string>;
    /** A coarse capability to match against `policy.capabilities`. */
    capability?: 'fileWrite' | 'network';
}
export interface ApprovalOutcome {
    decision: 'allow' | 'deny';
    /** True when policy said `ask` and the client hasn't decided yet. */
    needsApproval: boolean;
}
/** Resolve a harness permission request against policy + client approvals. */
export declare function resolveApproval(input: ResolveApprovalInput): ApprovalOutcome;
/** Build the AG-UI `approval-requested` CUSTOM event for a harness action. */
export declare function buildApprovalRequestedEvent(input: {
    approvalId: string;
    title: string;
    threadId: string;
    runId: string;
    detail?: Record<string, unknown>;
}): StreamChunk;
