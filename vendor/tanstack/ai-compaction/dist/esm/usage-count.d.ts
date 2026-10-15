import { MetadataStore, ModelMessage, TokenUsage } from '@tanstack/ai';
/** The MetadataStore namespace of the saved usage. The key is the thread id. */
export declare const USAGE_NAMESPACE = "@tanstack/ai-compaction:usage";
/** The usage of the last model call of a thread, and the list it got. */
export interface UsageCount {
    schemaVersion: 1;
    /** `promptTokens + completionTokens` of the call. */
    tokens: number;
    /** How many messages the call got. Its reply comes after them. */
    coveredCount: number;
    /** The hash of the last message the call got. */
    lastCoveredHash: string;
    /** True when the call got a compacted view, not the canonical list. */
    compacted: boolean;
}
export declare function hashMessages(messages: ReadonlyArray<ModelMessage>): Promise<string>;
/** The saved usage of a call that got `covered`. `undefined` for an empty list. */
export declare function toUsageCount(covered: ReadonlyArray<ModelMessage>, usage: TokenUsage, compacted: boolean): Promise<UsageCount | undefined>;
/**
 * The token count of `messages` from a saved usage: the usage, plus the
 * estimate of each message after the reply. `undefined` when the usage does
 * not fit: none is saved, the list is shorter, the last covered message
 * changed (a compaction or an edit), or the usage is of a compacted view and
 * this call does not reuse the checkpoint of that view.
 */
export declare function countFromUsage(saved: unknown, messages: ReadonlyArray<ModelMessage>, estimate: (message: ModelMessage) => number, reusedCheckpoint: boolean): Promise<number | undefined>;
/** A MetadataStore in memory, for a run that has none. The key is the thread. */
export declare function memoryMetadata(): MetadataStore;
/**
 * Add two usages. ponytail: only the token counts and `cost` add up. The
 * details of a first usage are dropped when a second one comes.
 */
export declare function sumUsage(total: TokenUsage | undefined, next: TokenUsage): TokenUsage;
