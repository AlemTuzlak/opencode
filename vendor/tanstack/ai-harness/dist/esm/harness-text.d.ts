import { AnyTextAdapter, Modality } from '@tanstack/ai';
import { AnyHarness } from './define.js';
import { HarnessHost } from './host.js';
export interface HarnessTextOptions {
    /** The host that runs the inner sessions. Default: a memory host. */
    host?: HarnessHost;
    /**
     * The kinds the inner model reads. Default: the list of the harness
     * `adapter`. Set it for a harness whose plugin picks the model, or that
     * has a `keyedAdapter`: neither list is known until a turn runs.
     * `media.accepts` narrows it.
     */
    inputModalities?: ReadonlyArray<Modality>;
}
/** A harness served by `createHarnessHandler` (or `runCli --serve`) on another machine. */
export interface RemoteHarness {
    /** The handler base URL, for example `http://127.0.0.1:8787`. */
    url: string;
    /** The bearer token. */
    token?: string;
    fetch?: typeof fetch;
}
/**
 * Use a harness as the model of a `chat()` call, the way you would call a
 * coding agent. Each outer thread gets its own inner session, which keeps
 * its own transcript, tools, plugins, and agents. The inner turn gets the
 * last user message with its content parts (images, audio, video,
 * documents). The outer chat sees the inner turn's text and reasoning.
 *
 * `inputModalities` is what the harness reads: the `inputModalities`
 * option, else its adapter's list, narrowed by `media.accepts`. It is
 * `undefined` for a remote harness.
 *
 * @example
 * ```ts
 * const stream = chat({ adapter: harnessText(studio), messages, threadId })
 * ```
 */
export declare function harnessText(harness: AnyHarness, options?: HarnessTextOptions): AnyTextAdapter;
export declare function harnessText(remote: RemoteHarness): AnyTextAdapter;
