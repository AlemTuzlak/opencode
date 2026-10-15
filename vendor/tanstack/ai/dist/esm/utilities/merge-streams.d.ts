/**
 * Yield the items of several async streams as they arrive. If the reader
 * stops early, every stream that is still open is closed, so its `finally`
 * runs.
 */
export declare function mergeStreams<T>(streams: Array<AsyncIterable<T>>): AsyncGenerator<Awaited<T>, void, unknown>;
