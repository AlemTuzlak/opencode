import { JournalPaths } from '../journal.js';
import { SandboxHandle } from '../contracts.js';
export interface JournalConformanceConfig {
    /** Provider name, used in the describe title. */
    name: string;
    /** Create a live sandbox plus its teardown. */
    createHandle: () => Promise<{
        handle: SandboxHandle;
        dispose: () => Promise<void>;
    }>;
    /**
     * Declare that this provider cannot journal, with the reason. Registers a
     * skipped case whose title carries the reason. Omit it and the suite runs.
     */
    unsupported?: {
        reason: string;
    };
    /**
     * Declare that this provider's reads take the POLL strategy rather than the
     * FOLLOW one — i.e. `journalReadStrategy` answers `'poll'` for its handles,
     * because it lacks `backgroundProcesses` or `killableProcesses`. The two follow
     * cases then register as NAMED skips carrying the reason.
     *
     * Declare this ONLY when the provider really cannot follow. It is checked
     * against a live handle in a case that always runs
     * ({@link expectDeclaredStrategy}), so a wrong declaration fails the suite in
     * either direction rather than quietly removing coverage.
     */
    followUnsupported?: {
        reason: string;
    };
}
/**
 * Block until the run's journal file exists in the sandbox.
 *
 * Through the shell (`journalExistsCommand`), never `handle.fs.exists` — see
 * rule 3 in `../journal.ts`: on local-process the two resolve `/tmp`
 * differently, so an `fs` probe would report the wrong file.
 *
 * Exported for `./reaper-conformance.ts`, which needs the same bounded,
 * shell-only wait before probing a still-producing run. Internal to the testkit;
 * not part of the `./testkit` public surface.
 */
export declare function waitForJournal(handle: SandboxHandle, paths: JournalPaths): Promise<void>;
/**
 * Assert `createHandle` satisfies the journal conformance contract. Each `it`
 * gets a fresh sandbox via `createHandle`/`dispose`, so implementations may
 * share process state across calls without cross-test bleed only if
 * `createHandle` returns an isolated sandbox.
 */
export declare function runJournalConformance(config: JournalConformanceConfig): void;
