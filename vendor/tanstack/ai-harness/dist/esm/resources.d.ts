/**
 * Resources one plugin owns for one lifetime (a session or a turn).
 *
 * - `acquire(open, close)` registers `close` only after `open` succeeds.
 * - If the scope closes while `open` is still running, the late resource is
 *   closed as soon as it arrives.
 * - `dispose()` closes resources newest first, runs every closer even when
 *   one throws, and returns the same promise to every caller.
 */
export declare class ResourceScope {
    private readonly controller;
    readonly signal: AbortSignal;
    private readonly closers;
    private readonly pending;
    private closing?;
    private closed;
    acquire<T>(open: () => T | Promise<T>, close: (resource: T) => unknown): Promise<T>;
    dispose(): Promise<void>;
}
/**
 * Dispose scopes newest first. Every scope is disposed even when one fails.
 * Throws an `AggregateError` with every failure, after all scopes ran.
 */
export declare function disposeAll(scopes: ReadonlyArray<ResourceScope>): Promise<void>;
