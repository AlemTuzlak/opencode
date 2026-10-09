/**
 * Read, save, and remove one value by string id.
 * `get` returns the value, or `null` when the id is absent.
 */
interface KeyedStore<Value> {
    /** Returns the value for `id`, or `null` when `id` is absent. */
    get: (id: string) => Promise<Value | null>;
    /** Saves `value` for `id`. A later save for the same `id` replaces it. */
    set: (id: string, value: Value) => Promise<void>;
    /** Removes `id`. An absent `id` stays absent. */
    delete: (id: string) => Promise<void>;
}
/**
 * Keeps one JSON value for each task id.
 * `inMemoryTaskStore` keeps those values in one process.
 * When the server runs on more than one instance, pass a store that you own.
 */
export type TaskStore<Value = unknown> = KeyedStore<Value>;
/**
 * Creates a {@link TaskStore} that keeps values in memory.
 * Each call has its own map. The map lives in this process only.
 * A saved task stays in the map until `delete`, or until the process exits.
 * A long-lived server passes its own store.
 *
 * ```ts
 * const tasks = inMemoryTaskStore()
 * await tasks.set('task-1', { status: 'working' })
 * await tasks.get('task-1')
 * ```
 */
export declare function inMemoryTaskStore(): {
    get(id: string): Promise<unknown>;
    set(id: string, value: unknown): Promise<void>;
    delete(id: string): Promise<void>;
};
export {};
