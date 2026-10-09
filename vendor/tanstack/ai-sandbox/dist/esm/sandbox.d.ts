import { LockStore } from '@tanstack/ai/locks';
import { SandboxFileHookEvent } from '@tanstack/ai';
import { SandboxInstanceStore } from './instance-store.js';
import { SandboxHandle, SandboxProvider } from './contracts.js';
import { SandboxPolicy } from './policy.js';
import { WorkspaceDefinition } from './workspace.js';
/**
 * Sandbox-scoped hooks declared on `defineSandbox`. File hooks fire for every
 * create/change/delete during a chat run; lifecycle hooks fire server-side.
 */
export interface SandboxHooks {
    onFile?: (e: SandboxFileHookEvent) => void | Promise<void>;
    onFileCreate?: (e: SandboxFileHookEvent) => void | Promise<void>;
    onFileChange?: (e: SandboxFileHookEvent) => void | Promise<void>;
    onFileDelete?: (e: SandboxFileHookEvent) => void | Promise<void>;
    onReady?: (handle: SandboxHandle) => void | Promise<void>;
    onError?: (err: unknown) => void | Promise<void>;
    onDestroy?: () => void | Promise<void>;
}
export type ReuseStrategy = 'thread' | 'none';
export type SnapshotStrategy = 'after-setup' | 'after-run' | 'none';
export interface SandboxLifecycle {
    /** `'thread'` resumes one sandbox per thread; `'none'` is fresh per run. */
    reuse?: ReuseStrategy;
    /** When to snapshot (provider-permitting). */
    snapshot?: SnapshotStrategy;
    /** Hint for how long a provider should keep the sandbox warm between runs. */
    keepAlive?: string;
    /** Destroy the sandbox after the run completes. */
    destroyOnComplete?: boolean;
    /**
     * Maximum age of a sandbox record before it is discarded and re-created
     * instead of resumed. Accepts `'<n>h'` (hours) or `'<n>m'` (minutes),
     * e.g. `'2h'` or `'30m'`.
     */
    snapshotMaxAge?: string;
}
export interface SandboxConfig {
    id: string;
    provider: SandboxProvider;
    workspace?: WorkspaceDefinition;
    policy?: SandboxPolicy;
    lifecycle?: SandboxLifecycle;
    /** Sandbox-scoped file/lifecycle hooks. */
    hooks?: SandboxHooks;
    /** Watch the workspace for file events (default true). `false` disables the
     *  watcher; `{ diff: true }` also emits a per-file `sandbox.file.diff` event. */
    fileEvents?: boolean | {
        diff?: boolean;
    };
}
/** Context passed to `ensure()` by `withSandbox` (or advanced callers). */
export interface SandboxEnsureContext {
    threadId: string;
    runId: string;
    /** Persistence seam; falls back to an in-memory store when absent. */
    store?: SandboxInstanceStore;
    /** Lock seam; falls back to an in-memory lock when absent. */
    locks?: LockStore;
    tenant?: {
        userId?: string;
        orgId?: string;
    };
    signal?: AbortSignal;
    /** Harness adapter name (`grok-build`, `claude-code`, `codex`, `opencode`). Optional. */
    adapterName?: string;
}
export interface SandboxDefinition {
    readonly id: string;
    readonly provider: SandboxProvider;
    readonly workspace?: WorkspaceDefinition;
    readonly policy?: SandboxPolicy;
    readonly lifecycle?: SandboxLifecycle;
    /** Sandbox-scoped file/lifecycle hooks. */
    readonly hooks?: SandboxHooks;
    /** Watch the workspace for file events (default true). `false` disables the
     *  watcher; `{ diff: true }` also emits a per-file `sandbox.file.diff` event. */
    readonly fileEvents?: boolean | {
        diff?: boolean;
    };
    /** Compound instance key for a given run context. */
    key: (ctx: SandboxEnsureContext) => string;
    /** Resume-or-create the sandbox for this thread/run. */
    ensure: (ctx: SandboxEnsureContext) => Promise<SandboxHandle>;
    /** Resume an existing sandbox only. Never creates or restores a sandbox. */
    ensureExisting: (ctx: SandboxEnsureContext) => Promise<SandboxHandle | null>;
    /** Tear down the sandbox recorded for this key. */
    destroy: (ctx: SandboxEnsureContext) => Promise<void>;
}
export type SandboxEnsureOutcome = {
    handle: SandboxHandle;
    outcome: 'resumed' | 'native-restored' | 'created';
};
interface SandboxEnsureExistingStage {
    key: string;
    workspace: WorkspaceDefinition | undefined;
    resolvedSecrets: Readonly<Record<string, string>> | undefined;
    snapshotMaxAge: string | undefined;
    resume: SandboxProvider['resume'];
}
export declare function stageEnsureExistingSandbox(definition: SandboxDefinition): (ctx: SandboxEnsureContext, stage: SandboxEnsureExistingStage) => Promise<SandboxHandle | null>;
export declare function ensureSandboxWithOutcome(definition: SandboxDefinition, ctx: SandboxEnsureContext): Promise<SandboxEnsureOutcome>;
export declare function defineSandbox(config: SandboxConfig): SandboxDefinition;
export {};
