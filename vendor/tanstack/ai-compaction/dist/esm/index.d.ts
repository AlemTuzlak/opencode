import { AnyTextAdapter, ChatMiddleware, ModelMessage, TokenUsage } from '@tanstack/ai';
import { Summarizer } from './summarizer.js';
export { COMPACTION_RECORD_TYPE, projectCompaction } from './record.js';
export type { CompactionRecord } from './record.js';
export { conversationSummarizer } from './summarizer.js';
export type { SummarizeInput, Summarizer } from './summarizer.js';
/** CUSTOM stream event: compaction is about to run. */
export declare const COMPACTION_STARTED_EVENT = "compaction:started";
/** CUSTOM stream event: compaction result (counts and previews). */
export declare const COMPACTION_STATE_EVENT = "compaction:state";
/** CUSTOM stream event: compaction finished. */
export declare const COMPACTION_ENDED_EVENT = "compaction:ended";
export type CompactionStreamEventName = typeof COMPACTION_STARTED_EVENT | typeof COMPACTION_STATE_EVENT | typeof COMPACTION_ENDED_EVENT;
/** One message in a `compaction:state` preview list. */
export interface CompactionMessagePreview {
    role: string;
    tokens: number;
    text: string;
}
/** Why a compaction ran. */
export type CompactionReason = 'threshold' | 'forced' | 'after-turn' | 'background';
/** Payload of {@link COMPACTION_STARTED_EVENT}. */
export interface CompactionStartedEventValue {
    before: number;
    messagesBefore: number;
    reusedCheckpoint: boolean;
    maxTokens: number;
    strategyKey?: string;
    reason: CompactionReason;
}
/** Payload of {@link COMPACTION_STATE_EVENT}. */
export interface CompactionStateEventValue {
    before: number;
    after: number;
    messagesBefore: number;
    messagesAfter: number;
    reusedCheckpoint: boolean;
    maxTokens: number;
    strategyKey?: string;
    /** Messages removed or rewritten. */
    dropped?: Array<CompactionMessagePreview>;
    /** Messages the model will see after compaction. */
    result?: Array<CompactionMessagePreview>;
}
/** Payload of {@link COMPACTION_ENDED_EVENT}. */
export interface CompactionEndedEventValue {
    after: number;
    messagesAfter: number;
    reusedCheckpoint: boolean;
    maxTokens: number;
    durationMs: number;
    strategyKey?: string;
    reason: CompactionReason;
    /** The sum of the strategy's `addUsage` calls, for example its summary call. */
    usage?: TokenUsage;
    /**
     * Set when the strategy threw, or when the adapter's `compact` failed and
     * the strategy ran in its place.
     */
    error?: {
        message: string;
    };
    /** `true`: a ready background summary no longer fit the messages, and was dropped. */
    stale?: boolean;
}
/** Rough token estimate for one message. Default: characters / 4. */
export declare function estimateMessageTokens(message: ModelMessage): number;
/** What a {@link CompactionStrategy} receives alongside the messages. */
export interface CompactionContext {
    /** The `maxTokens` budget from `withCompaction`. */
    maxTokens: number;
    /** The shared token estimator (default {@link estimateMessageTokens}). */
    estimate: (message: ModelMessage) => number;
    /** Report the usage of a model call the strategy made, for example a summary. */
    addUsage: (usage: TokenUsage) => void;
    /** Aborted when the run is cancelled. Pass it to a model call. */
    signal?: AbortSignal;
}
/**
 * Shrinks a message list. Called when the count is over `maxTokens`, or when
 * `compactNext` forces it.
 * Return the rewritten messages, or `null` to leave them unchanged.
 */
export type CompactionStrategy = (messages: ReadonlyArray<ModelMessage>, ctx: CompactionContext) => Array<ModelMessage> | null | Promise<Array<ModelMessage> | null>;
/** Reported to `onCompact` after each compaction event. */
export interface CompactionInfo {
    /** Estimated tokens before compaction. */
    before: number;
    /** Estimated tokens after compaction. */
    after: number;
    /** Message count before compaction. */
    messagesBefore: number;
    /** Message count after compaction (unchanged for {@link clearToolResults}). */
    messagesAfter: number;
    /** Why the compaction ran. */
    reason: CompactionReason;
    /** The usage the strategy reported with `addUsage`. */
    usage?: TokenUsage;
    /**
     * Set when the after-turn check failed (the strategy, the store, or
     * `onCompact` threw), or when a background summary failed. The run goes
     * on. When the strategy failed, a later check tries again. Also set when
     * the adapter's `compact` failed and the strategy ran in its place.
     */
    error?: {
        message: string;
    };
    /** `true`: a ready background summary no longer fit the messages, and was dropped. */
    stale?: boolean;
}
export interface CompactionOptions {
    /** Compact when the token count of `messages` passes this (see `countTokens` and `auto`). */
    maxTokens: number;
    /** How to shrink the messages. Default: {@link evictOldest}. */
    strategy?: CompactionStrategy;
    /** Per-message token estimator. Default: {@link estimateMessageTokens}. */
    estimateTokens?: (message: ModelMessage) => number;
    /**
     * Stable identity for persisted checkpoints. Set this for custom strategies
     * or estimators, and change it when their output can change.
     */
    strategyKey?: string;
    /** Observe each compaction (logging, metrics). */
    onCompact?: (info: CompactionInfo) => void;
    /**
     * How to count the tokens of the list. `'usage'`: the usage the provider
     * reported for the last model call, plus the estimate of each message after
     * its reply. The estimate counts when no saved usage fits the list. The
     * strategies still use the estimate to choose the cut. Default
     * `'estimate'`.
     */
    countTokens?: 'estimate' | 'usage';
    /**
     * `false`: do not compact when the count passes `maxTokens`.
     * `compactNext` and the after-turn overflow check still compact. Default
     * `true`.
     */
    auto?: boolean;
    /**
     * The model's context window in tokens. With `countTokens: 'usage'` and
     * `durable: true` on a host with a log, the check after the last model call
     * of a run compacts when the usage is over it, even with `auto: false`. A
     * failed after-turn compaction never fails the run: `onCompact` gets
     * `error`. Only a failed log append fails it.
     */
    contextWindow?: number;
    /**
     * Write each compaction as a log record when the host provides
     * `LogRecordsCapability` (a durable harness session). Fold the record with
     * {@link projectCompaction}. Without the capability, the checkpoint is
     * used, and there is no after-turn check. When an earlier middleware set
     * `providerMessages`, the result stays provider-only. Default `false`.
     */
    durable?: boolean;
    /**
     * `true`: when the strategy throws in the check before a model call, report
     * the error in `compaction:ended` and send the list without compaction.
     * Default `false`: the run fails. The after-turn check never fails the run.
     */
    continueOnError?: boolean;
    /**
     * Prepare the summary before the list is over `maxTokens`. When the count
     * at a model call is over `atTokens` and not over `maxTokens`, the strategy
     * runs on a copy of the messages, and the call does not wait for it. The
     * result applies at the first model call of the next run. A call over
     * `maxTokens` while it runs waits for it. A ready result waits in the
     * metadata store, or in memory without one. `atTokens` must be below
     * `maxTokens`. Default: off.
     */
    background?: {
        atTokens: number;
    };
    /**
     * Compact with the provider's own endpoint. Pass the adapter of the
     * `chat()` call. When the adapter has `compact`, it runs in place of
     * `strategy`. Else, or when `compact` fails, `strategy` runs. A failure
     * sets `error` in `onCompact` and `compaction:ended`. Then that adapter
     * and model use `strategy` for the rest of the process. Default: off.
     */
    native?: Pick<AnyTextAdapter, 'compact'>;
}
/** What {@link withCompaction} returns: a chat middleware with `compactNext`. */
export interface CompactionMiddleware extends ChatMiddleware {
    /**
     * Compact at the next model call on `threadId`, even when the count is
     * under `maxTokens` or `auto` is `false`. That call clears the flag.
     */
    compactNext: (threadId: string) => void;
}
/**
 * Drop the oldest messages and replace them with a short marker. Cheapest
 * strategy — no extra model call. This is the default.
 */
export declare function evictOldest(options?: {
    /** Tokens of recent messages to keep verbatim. Default `floor(maxTokens/2)`. */
    keepRecentTokens?: number;
    /** Build the marker that replaces the dropped head. */
    marker?: (droppedCount: number) => string;
}): CompactionStrategy;
/**
 * Drop the oldest messages and replace them with an LLM summary. Keeps the gist
 * of old turns at the cost of one summarization call. Wire `summarize` to
 * {@link conversationSummarizer}, `summarize()`, or any model call.
 *
 * When the messages start with an earlier summary, `summarize` gets its text
 * as `previousSummary`, so it can merge the new messages into it.
 */
export declare function summarizeOldest(options: {
    /** Returns the summary text, or the text and the usage of its model call. */
    summarize: Summarizer;
    /** Tokens of recent messages to keep verbatim. Default `floor(maxTokens/2)`. */
    keepRecentTokens?: number;
    /** Role of the injected summary message. Default `'assistant'`. */
    summaryRole?: 'user' | 'assistant';
    /**
     * `'turn'`: when the kept tail starts inside a turn, summarize the history
     * before the turn and the first part of the turn, in two parallel calls.
     * When the user message of the turn comes right after an earlier summary,
     * only the second call runs. When no user message comes after an earlier
     * summary, the turn started before it: one update call runs, as with
     * `'message'`. Default `'message'`.
     */
    cut?: 'message' | 'turn';
}): CompactionStrategy;
/**
 * Replace the content of old tool-result messages with a stub, keeping every
 * message and its tool-call pairing in place. Best for agent loops where tool
 * output (file reads, command output) dominates the token count — it clears the
 * bulk without disturbing the conversation shape. No extra model call.
 */
export declare function clearToolResults(options?: {
    /** Number of most-recent tool results to keep verbatim. Default `3`. */
    keepRecentToolResults?: number;
    /** Text that replaces a cleared tool result. */
    stub?: string;
}): CompactionStrategy;
/**
 * Run several strategies in order, escalating: stop as soon as the running
 * estimate is back under `maxTokens`. Put the cheap, targeted strategy first
 * (for example {@link clearToolResults}) and a broad fallback last (for example
 * {@link evictOldest}) — the fallback only runs when clearing was not enough.
 * A strategy that returns `null` (no change) is skipped and the next one runs.
 *
 * @example
 * ```ts
 * withCompaction({
 *   maxTokens: 100_000,
 *   strategy: composeStrategies(clearToolResults(), evictOldest()),
 * })
 * ```
 */
export declare function composeStrategies(...strategies: Array<CompactionStrategy>): CompactionStrategy;
/**
 * Context-compaction middleware. Add to `chat({ middleware: [...] })`.
 *
 * @example
 * ```ts
 * chat({
 *   adapter,
 *   messages,
 *   middleware: [withCompaction({ maxTokens: 100_000 })], // evictOldest by default
 * })
 * ```
 */
export declare function withCompaction(options: CompactionOptions): CompactionMiddleware;
