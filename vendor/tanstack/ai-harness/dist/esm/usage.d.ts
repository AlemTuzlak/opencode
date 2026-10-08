import { TokenUsage } from '@tanstack/ai';
/** The token counts of some model calls, and their cost when known. */
export interface UsageCounts {
    /** How many model calls reported usage. */
    calls: number;
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
    /** Prompt tokens read from the cache of the provider. */
    cachedTokens: number;
    /** Prompt tokens written to the cache of the provider. */
    cacheWriteTokens: number;
    /**
     * The sum of the cost that the providers reported, in their currency (USD
     * for most). Set only when at least one call reported a cost.
     */
    cost?: number;
}
/**
 * The usage of a thread: every model call of its turns, their subagents, and
 * its agent runs. `bySender` has the calls of a known sender only, keyed by
 * the principal id, so its sum can be less than `total`.
 */
export interface SessionUsage {
    total: UsageCounts;
    /** By `provider/model`, for example `anthropic/claude-sonnet-5-5`. */
    byModel: Record<string, UsageCounts>;
    /** By principal id. */
    bySender: Record<string, UsageCounts>;
}
/** One model call, as the log keeps it. A type, so it is a log record field set. */
export type UsageCall = {
    model: string;
    principal?: {
        id: string;
        tenantId?: string;
    };
    usage: Omit<UsageCounts, 'calls'>;
};
export declare const emptyUsage: () => SessionUsage;
/** The counts that one call adds, from what the provider reported. */
export declare function callUsage(usage: TokenUsage): UsageCall['usage'];
/** Add one call to `totals`, in place. */
export declare function addUsage(totals: SessionUsage, call: UsageCall): void;
/** Is `value` usage totals that the harness wrote? */
export declare function isSessionUsage(value: unknown): value is SessionUsage;
