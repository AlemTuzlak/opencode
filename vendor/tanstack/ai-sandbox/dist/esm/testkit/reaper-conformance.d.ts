import { SandboxHandle } from '../contracts.js';
export interface ReaperConformanceConfig {
    /** Provider name, used in the describe title. */
    name: string;
    /** Create a live sandbox plus its teardown. */
    createHandle: () => Promise<{
        handle: SandboxHandle;
        dispose: () => Promise<void>;
    }>;
    /**
     * Declare that this provider cannot support the sweeps, with the reason.
     * Registers a skipped case whose title carries the reason — a NAMED skip,
     * visible in the reporter. Omit it and the suite runs.
     */
    unsupported?: {
        reason: string;
    };
    /**
     * Declare that this provider's reads take the POLL strategy rather than the
     * FOLLOW one — i.e. `journalReadStrategy` answers `'poll'` for its handles.
     *
     * Only the FOLLOW half of the shell-hostile-runId case depends on it, so this
     * does not skip a case; it names itself in that case's title and the follow
     * read is omitted. The declaration is checked against the live handle there, in
     * both directions, so it cannot quietly remove coverage from a provider that
     * can in fact follow.
     */
    followUnsupported?: {
        reason: string;
    };
    /**
     * Declare that this provider cannot run GNU `stat -c '%Y %n'`. The three
     * age-gate cases skip with this reason. Docker alpine is the authority on
     * the witness line; local-process on Darwin is BSD `stat`.
     */
    mtimeListUnsupported?: {
        reason: string;
    };
}
/**
 * Assert `createHandle` satisfies the sweep conformance contract. Each `it` gets
 * a fresh sandbox via `createHandle`/`dispose`, a fresh journal directory, and
 * unique runIds, so no case can observe another's files.
 */
export declare function runReaperConformance(config: ReaperConformanceConfig): void;
