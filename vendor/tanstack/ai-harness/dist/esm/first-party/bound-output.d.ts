import { AfterToolCallInfo } from '@tanstack/ai';
/**
 * Keep the part of `text` that fits in `maxLines` lines and `maxBytes` UTF-8
 * bytes: the first lines (`keep: 'head'`, the default) or the last lines
 * (`keep: 'tail'`). When something is cut, `truncated` is `true` and a note
 * tells how much is shown: after the text for `head`, before it for `tail`.
 * A cut never splits a character. Text inside both limits comes back
 * unchanged.
 *
 * @example
 * ```ts
 * const { text, truncated } = boundText(output, {
 *   maxLines: 2000,
 *   maxBytes: 50 * 1024,
 *   keep: 'tail',
 * })
 * ```
 */
export declare function boundText(text: string, limits: {
    maxLines: number;
    maxBytes: number;
    keep?: 'head' | 'tail';
}): {
    text: string;
    truncated: boolean;
};
/**
 * Keep every tool result small enough for the model. A result over
 * `maxLines` lines (default 2000) or `maxBytes` UTF-8 bytes (default 50 KiB)
 * is cut to its first lines, with a note.
 *
 * - A string result is cut as is. Any other value is cut as JSON text.
 * - A failed call has its error text cut. It stays an error.
 * - A subagent result has the child's answer cut. Its `subagentRunId` stays.
 * - Content parts (images, audio, and so on) are not changed.
 *
 * It runs for every tool, MCP tools too, in the lead turn and in every agent
 * run. With `dir`, the full output is saved to a file in `dir` and the note
 * gives its path. Saved files older than `retentionDays` (default 7) are
 * removed, at most once an hour. Node only.
 *
 * @example
 * ```ts
 * defineHarness({
 *   name: 'acme/coder',
 *   adapter,
 *   plugins: () => [boundToolOutput({ dir: '.agent/tool-output' })],
 * })
 * ```
 */
export declare function boundToolOutput(options?: {
    maxLines?: number;
    maxBytes?: number;
    dir?: string;
    retentionDays?: number;
}): import('..').HarnessPlugin<{
    readonly name: "tanstack/bound-tool-output";
    readonly setup: () => {
        middleware: {
            name: string;
            onAfterToolCall: (_ctx: import('@tanstack/ai').ChatMiddlewareContext<any>, info: AfterToolCallInfo) => Promise<{
                type: "replaceResult";
                result: string | {
                    error: string;
                } | {
                    result: string;
                };
            } | undefined>;
        }[];
        agentMiddleware: {
            name: string;
            onAfterToolCall: (_ctx: import('@tanstack/ai').ChatMiddlewareContext<any>, info: AfterToolCallInfo) => Promise<{
                type: "replaceResult";
                result: string | {
                    error: string;
                } | {
                    result: string;
                };
            } | undefined>;
        }[];
    };
}>;
