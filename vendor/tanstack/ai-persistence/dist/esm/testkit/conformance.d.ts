import { AIPersistence, AIPersistenceStores } from '../types.js';
type MakePersistence = () => Promise<AIPersistence> | AIPersistence;
/**
 * Methods that are optional on the `RunStore` contract.
 *
 * `findActiveRun` is deliberately NOT here: it is REQUIRED, per the evolution
 * policy in `../types.ts`. It was optional for one release cycle and silently
 * disabled reconnect on every backend that had not caught up.
 */
type OptionalRunStoreMethod = 'listByThread' | 'listByParentRun' | 'listReclaimable';
/** Dotted `store.method` key a backend passes to declare an omitted method. */
export type PersistenceConformanceMethodKey = `runs.${OptionalRunStoreMethod}`;
/**
 * Checks added after the suite shipped. They are off by default, so a backend
 * that passed before still passes. Turn them on with `options.checks`.
 *
 * - `'messages.metadata'`: `saveThread` / `loadThread` keep message `metadata`,
 *   including `metadata.tanstack.run.id` (run timings on reload need it).
 * - `'runs.listByThread.state'`: `listByThread` returns each run's current
 *   `status` and `finishedAt` after `update` (`reconstructChat`'s
 *   `includeRuns` needs it).
 */
export type PersistenceConformanceCheck = 'messages.metadata' | 'runs.listByThread.state';
export interface PersistenceConformanceOptions {
    /**
     * Store keys this backend intentionally does not provide. Any store that is
     * absent from the persistence and NOT listed here fails the suite, so a
     * dropped/misconfigured store can never pass silently.
     */
    skip?: Array<keyof AIPersistenceStores>;
    /**
     * OPTIONAL store methods this backend intentionally does not implement, as
     * `'runs.listByThread'` and friends. A method that is absent and NOT listed
     * here fails the suite; a listed one is reported as a skipped case.
     * `listByParentRun` is the exception. Subagent support is opt-in, its cases
     * skip on their own, and a `'runs.listByParentRun'` entry is accepted but
     * has no effect.
     */
    skipMethods?: Array<PersistenceConformanceMethodKey>;
    /**
     * Opt-in checks, off by default so existing backends keep passing. A check
     * that is not listed is reported as a skipped case. See
     * {@link PersistenceConformanceCheck}.
     */
    checks?: Array<PersistenceConformanceCheck>;
}
/**
 * Register a Vitest suite that validates `makePersistence()` against the full
 * `AIPersistence` contract — every store it provides, and none it declares
 * skipped.
 */
export declare function runPersistenceConformance(name: string, makePersistence: MakePersistence, options?: PersistenceConformanceOptions): void;
export {};
