import { SandboxFileEvent, SandboxFileHookEvent } from '@tanstack/ai';
import { InternalLogger } from '@tanstack/ai/adapter-internals';
import { SandboxHandle } from './contracts.js';
/**
 * Wrap a raw {@link SandboxFileEvent} with lazy git-backed accessors bound to
 * the live handle. `baseSha` is the session baseline (`''` when the workspace
 * isn't a git repo). Never throws — every git/fs failure falls back to `''`
 * (or a synthesized add-patch), but is logged first via `logger` so a failure
 * is observable instead of silently becoming empty data.
 */
export declare function buildFileHookEvent(handle: SandboxHandle, root: string, baseSha: string, event: SandboxFileEvent, logger?: InternalLogger): SandboxFileHookEvent;
export interface ResolvedFileEvents {
    enabled: boolean;
    diff: boolean;
}
/** Normalize the `fileEvents` option (`boolean | { diff?: boolean }`). */
export declare function resolveFileEvents(opt: boolean | {
    diff?: boolean;
} | undefined): ResolvedFileEvents;
