import { SandboxHandle } from './contracts.js';
import { SandboxFileEvent } from '@tanstack/ai';
import { InternalLogger } from '@tanstack/ai/adapter-internals';
export type { SandboxFileEvent } from '@tanstack/ai';
/** @deprecated alias retained for the low-level watch API. */
export type FileEvent = SandboxFileEvent;
export type FileEventType = SandboxFileEvent['type'];
export interface WatchOptions {
    /** Called for every observed file event. */
    onEvent: (event: SandboxFileEvent) => void;
    /** Workspace root to watch. Defaults to `/workspace`. */
    root?: string;
    /** Poll interval for the exec-poll fallback, in ms. Defaults to 700. */
    intervalMs?: number;
    /**
     * Directory-name fragments to ignore (a path containing `/<entry>/` is
     * skipped). Defaults to `['.git', 'node_modules']`.
     */
    ignore?: Array<string>;
    /** Stop watching when this signal aborts. */
    signal?: AbortSignal;
    /**
     * Optional logger. When present, a failed `find` poll (non-zero exit or a
     * thrown exec) is logged instead of silently degrading the snapshot — the
     * failure mode a plain exec-poll watcher hides.
     */
    logger?: InternalLogger;
}
export interface SandboxWatchHandle {
    /** Stop the watcher and release its resources. */
    stop: () => Promise<void>;
}
/**
 * Diff two file snapshots (`Map<path, signature>`, signature = `mtime\tsize`).
 * Pure — the heart of the exec-poll path, unit-tested in isolation.
 */
export declare function diffSnapshots(prev: Map<string, string>, next: Map<string, string>, timestamp: number): Array<SandboxFileEvent>;
/**
 * Start watching a sandbox workspace for file events. Picks the native
 * `fs.watch` fast-path when the provider advertises it, otherwise polls via
 * `find`. Returns a handle whose `stop()` tears everything down.
 */
export declare function watchWorkspace(handle: SandboxHandle, options: WatchOptions): Promise<SandboxWatchHandle>;
