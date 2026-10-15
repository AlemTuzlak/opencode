import { AnyTextAdapter, ModelMessage, TokenUsage } from '@tanstack/ai';
/** What a summary callback gets with the messages. */
export interface SummarizeInput {
    /** The text of an earlier compaction summary at the start of `messages`. */
    previousSummary?: string;
    /** The details text of that summary, from its `<compaction-details>` tag. */
    previousDetails?: string;
    /** `true`: `messages` is the first part of a turn that is too large to keep. */
    turnPrefix?: boolean;
    /**
     * The first part of the current turn. Only the call that writes the details
     * gets it, so `details` can see each dropped message. In a history call, a
     * separate call summarizes these messages. In a turn-prefix call, they are
     * the same as `messages`, and no history call runs.
     */
    turnPrefixMessages?: Array<ModelMessage>;
    /** Aborted when the run is cancelled. */
    signal?: AbortSignal;
}
/**
 * Turns messages into summary text. Return the text, or the text and the
 * usage of the model call, so the compaction can report the cost.
 */
export type Summarizer = (messages: Array<ModelMessage>, input: SummarizeInput) => Promise<string | {
    summary: string;
    usage?: TokenUsage;
}>;
/** The content of a summary message. */
export declare const summaryContent: (summary: string) => string;
/** A summary text with its details in a `<compaction-details>` tag after it. */
export declare const summaryBody: (summary: string, details?: string) => string;
/** The summary text and the details text of a summary body. */
export declare function splitDetails(body: string): {
    summary: string;
    details?: string;
};
/**
 * The summary text and the details text of an earlier summary message.
 * `undefined` when `message` is not a summary message.
 */
export declare function readSummary(message: ModelMessage | undefined): {
    summary: string;
    details?: string;
} | undefined;
/**
 * A {@link Summarizer} that asks a text model for a checkpoint summary with
 * these sections: goal, constraints, progress, key decisions, next steps, and
 * critical context. With an earlier summary it merges the new messages into
 * it. It returns the usage of its model call.
 *
 * @example
 * ```ts
 * summarizeOldest({ summarize: conversationSummarizer({ adapter }) })
 * ```
 */
export declare function conversationSummarizer(options: {
    adapter: AnyTextAdapter;
    modelOptions?: Record<string, unknown>;
    /** Each tool result is cut to this many characters in the text to summarize. Default 2000. */
    maxToolResultChars?: number;
    /**
     * Text added after the summary, and passed to the next compaction as
     * previousDetails. It gets each dropped message, also the first part of a
     * split turn.
     */
    details?: (input: {
        messages: Array<ModelMessage>;
        previousDetails?: string;
    }) => string | undefined;
}): Summarizer;
