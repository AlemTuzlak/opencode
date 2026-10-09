import { SandboxInstanceStore } from '../instance-store.js';
export { runJournalConformance } from './journal-conformance.js';
export type { JournalConformanceConfig } from './journal-conformance.js';
export { runTakeoverConformance } from './takeover-conformance.js';
export type { TakeoverConformanceConfig } from './takeover-conformance.js';
export { runReaperConformance } from './reaper-conformance.js';
export type { ReaperConformanceConfig } from './reaper-conformance.js';
export { runDurableRunFieldsConformance } from './durable-run-fields-conformance.js';
export type { MakeRunStore } from './durable-run-fields-conformance.js';
export { makeFakeShellSpawn } from './shell-spawn.js';
export { runSandboxCheckpointStoreConformance } from './checkpoint-conformance.js';
export type { SandboxCheckpointStoreOptions } from '../checkpoint-store.js';
export { runSandboxCheckpointForkConformance } from './checkpoint-fork-conformance.js';
export type { SandboxCheckpointForkConformanceInput, SandboxCheckpointForkConformanceFactory, } from './checkpoint-fork-conformance.js';
/**
 * Assert `makeStore()` produces a spec-compliant {@link SandboxInstanceStore}. Each
 * `it` gets a fresh store, so implementations may share process state across
 * calls without cross-test bleed only if `makeStore` returns an isolated store.
 */
export declare function runSandboxInstanceStoreConformance(name: string, makeStore: () => SandboxInstanceStore | Promise<SandboxInstanceStore>): void;
