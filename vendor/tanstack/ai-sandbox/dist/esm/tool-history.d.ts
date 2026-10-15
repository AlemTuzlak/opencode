import { ModelMessage, StreamChunk } from '@tanstack/ai';
/**
 * What the recorder writes into. `ChatMiddlewareContext.messages` is a
 * `ReadonlyArray`, so the transcript grows by REPLACING the array — the same way the
 * engine itself syncs `middlewareCtx.messages`.
 */
interface TranscriptTarget {
    messages: ReadonlyArray<ModelMessage>;
}
export interface ToolHistoryRecorder {
    /** Feed every chunk. Observes only — never transforms or drops. */
    observe: (chunk: StreamChunk, target: TranscriptTarget) => void;
    /**
     * Re-append anything missing from the transcript.
     *
     * The engine reassigns `middlewareCtx.messages` from its own array whenever it
     * syncs config (once per agent iteration), which discards writes made during the
     * previous iteration's stream. Reconciling at each iteration boundary and again at
     * finish makes the result independent of that, and independent of where this
     * middleware sits relative to persistence in the middleware array.
     */
    reconcile: (target: TranscriptTarget) => void;
}
/**
 * True when this tool call was executed by the HARNESS inside the sandbox, and
 * recorded into the transcript for display, rather than executed by the agent loop.
 *
 * Use it to decide what your own `MessageStore` keeps — these calls are display
 * history, so dropping or capping them is safe (they are already stripped from the
 * request to the model on the next turn). Also works on a `tool-call` UI part, whose
 * `metadata` is copied straight from the model message.
 *
 * `metadata` is `unknown` on both, so the key can only be read behind a typeof/`in`
 * check; this mirrors the core `isProviderExecutedToolCall` convention.
 *
 * ```ts
 * import { isSandboxToolCall } from '@tanstack/ai-sandbox'
 *
 * const kept = messages.filter(
 *   (message) => !message.toolCalls?.every(isSandboxToolCall),
 * )
 * ```
 */
export declare function isSandboxToolCall(toolCall: {
    metadata?: unknown;
} | null | undefined): boolean;
export declare function createToolHistoryRecorder(): ToolHistoryRecorder;
/**
 * Drop recorded harness tool calls from a list of messages bound for the model.
 *
 * A stored transcript becomes the history for the NEXT turn. These calls name tools
 * the provider was never given, and one triage-sized run is hundreds of kilobytes of
 * tool output — so replaying them is wasteful at best and rejected at worst. They stay
 * in `ctx.messages` (which is what gets stored and rendered); only the request to the
 * model loses them.
 *
 * An assistant message is dropped only when EVERY call on it is observed, so a mixed
 * message — one engine tool call plus one harness tool call — is left alone rather than
 * silently losing the engine's half.
 */
export declare function stripObservedToolCalls(messages: ReadonlyArray<ModelMessage>): Array<ModelMessage>;
export {};
