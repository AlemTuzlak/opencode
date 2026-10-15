import { Task } from '@modelcontextprotocol/server';
import { TaskStore } from './stores.js';
/**
 * One task in the store.
 * It is the spec 2025-11-25 `Task` that `tasks/get` returns, plus the
 * fields that never leave the server: the owner and the tool result.
 */
type StoredTask = Task & {
    status: 'working' | 'completed' | 'failed';
    /** The auth subject that started the task. Absent without auth. */
    owner?: string;
    /** The tool output. Present when `status` is `completed`. */
    result?: unknown;
};
type StartTaskOptions = {
    /** Task store. Use `inMemoryTaskStore()` or another {@link TaskStore}. */
    store: TaskStore;
    /**
     * Keeps the process alive until the tool run settles.
     * The promise resolves after the store saves the tool result,
     * or the tool error.
     */
    waitUntil?: (promise: Promise<unknown>) => void;
    /** The auth subject that starts the task. Only this subject can read it. */
    owner?: string;
};
/**
 * Starts a tool run and returns a task id before the run finishes.
 *
 * `run` is the tool function. This function calls `run` in this process.
 * The caller passes `inMemoryTaskStore()` or another TaskStore
 * on `options.store`.
 * When you pass `options.waitUntil`, this function calls it
 * with the in-flight promise.
 * That promise settles after the store saves the tool result or the tool error.
 * If the store rejects the first save, this function rejects.
 * A tool error does not reject this function.
 * The store records the error on the task as `statusMessage`.
 *
 * @param run - Tool function. It returns the tool result.
 * @param options - `store` is required. `waitUntil` is optional.
 *
 * @example
 * ```ts
 * const store = inMemoryTaskStore()
 * const handle = await startTask(() => Promise.resolve({ text: 'done' }), {
 *   store,
 * })
 * ```
 */
export declare function startTask(run: () => Promise<unknown>, options: StartTaskOptions): Promise<{
    taskId: `${string}-${string}-${string}-${string}-${string}`;
}>;
/**
 * Returns the task record for a poll, or `null` when the id is absent.
 * The result is also `null` when `owner` is not the caller that
 * started the task.
 *
 * `task` is the spec 2025-11-25 `Task` that `tasks/get` returns.
 * `record` also has the tool result and the owner.
 *
 * @param taskId - Id from `startTask`.
 * @param store - Same store that `startTask` received.
 * @param owner - The auth subject of the caller. Absent without auth.
 *
 * @example
 * ```ts
 * const polled = await getTask(handle.taskId, store)
 * ```
 */
export declare function getTask(taskId: string, store: TaskStore, owner?: string): Promise<{
    record: StoredTask;
    task: {
        statusMessage?: string | undefined;
        taskId: string;
        status: "working" | "completed" | "failed";
        ttl: number | null;
        createdAt: string;
        lastUpdatedAt: string;
    };
} | null>;
/**
 * Turns a tool output into an MCP `CallToolResult`.
 * A string becomes one text block. Any other value becomes a JSON text block.
 * An object also becomes `structuredContent`. With `structured`, every
 * value does, so the result matches an advertised output schema.
 */
export declare function toCallToolResult(output: unknown, structured?: boolean): {
    [x: string]: unknown;
    content: ({
        type: "text";
        text: string;
        annotations?: {
            audience?: ("user" | "assistant")[] | undefined;
            priority?: number | undefined;
            lastModified?: string | undefined;
        } | undefined;
        _meta?: {
            [x: string]: unknown;
        } | undefined;
    } | {
        type: "image";
        data: string;
        mimeType: string;
        annotations?: {
            audience?: ("user" | "assistant")[] | undefined;
            priority?: number | undefined;
            lastModified?: string | undefined;
        } | undefined;
        _meta?: {
            [x: string]: unknown;
        } | undefined;
    } | {
        type: "audio";
        data: string;
        mimeType: string;
        annotations?: {
            audience?: ("user" | "assistant")[] | undefined;
            priority?: number | undefined;
            lastModified?: string | undefined;
        } | undefined;
        _meta?: {
            [x: string]: unknown;
        } | undefined;
    } | {
        uri: string;
        name: string;
        type: "resource_link";
        description?: string | undefined;
        mimeType?: string | undefined;
        size?: number | undefined;
        annotations?: {
            audience?: ("user" | "assistant")[] | undefined;
            priority?: number | undefined;
            lastModified?: string | undefined;
        } | undefined;
        _meta?: {
            [x: string]: unknown;
        } | undefined;
        icons?: {
            src: string;
            mimeType?: string | undefined;
            sizes?: string[] | undefined;
            theme?: "light" | "dark" | undefined;
        }[] | undefined;
        title?: string | undefined;
    } | {
        type: "resource";
        resource: {
            uri: string;
            text: string;
            mimeType?: string | undefined;
            _meta?: {
                [x: string]: unknown;
            } | undefined;
        } | {
            uri: string;
            blob: string;
            mimeType?: string | undefined;
            _meta?: {
                [x: string]: unknown;
            } | undefined;
        };
        annotations?: {
            audience?: ("user" | "assistant")[] | undefined;
            priority?: number | undefined;
            lastModified?: string | undefined;
        } | undefined;
        _meta?: {
            [x: string]: unknown;
        } | undefined;
    })[];
    _meta?: {
        [x: string]: unknown;
        "io.modelcontextprotocol/serverInfo"?: {
            version: string;
            name: string;
            websiteUrl?: string | undefined;
            description?: string | undefined;
            icons?: {
                src: string;
                mimeType?: string | undefined;
                sizes?: string[] | undefined;
                theme?: "light" | "dark" | undefined;
            }[] | undefined;
            title?: string | undefined;
        } | undefined;
    } | undefined;
    structuredContent?: unknown;
    isError?: boolean | undefined;
} | {
    content: {
        type: "text";
        text: string;
    }[];
    structuredContent: unknown;
} | {
    content: {
        type: "text";
        text: string;
    }[];
    structuredContent?: undefined;
};
export {};
