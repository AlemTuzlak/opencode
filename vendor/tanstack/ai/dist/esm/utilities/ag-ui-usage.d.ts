import { TokenUsage as SpecTokenUsage } from '@ag-ui/core';
import { TokenUsage } from '../types.js';
/** AG-UI spec `usage[]` item (provider/model labels + token counts only). */
export type { TokenUsage as SpecTokenUsage } from '@ag-ui/core';
export interface ToSpecTokenUsageOptions {
    provider?: string;
    model?: string;
}
/** TokenUsage fields that have no AG-UI `usage[]` equivalent. */
export type TokenUsageLeftover = Omit<TokenUsage, 'promptTokens' | 'completionTokens' | 'totalTokens'>;
export declare function isTanstackUsage(usage: unknown): usage is TokenUsage;
export declare function toSpecTokenUsage(usage: TokenUsage, options?: ToSpecTokenUsageOptions): {
    usage: Array<SpecTokenUsage>;
    leftover?: TokenUsageLeftover;
};
/**
 * Add two usage totals, as for a parent run and its children. Numbers add
 * up. `billed` adds up only in the same unit. `providerUsageDetails` is
 * opaque, so the latest one stays. `@tanstack/ai-persistence` sums per-run
 * usage with the same rules.
 */
export declare function addTokenUsage(current: TokenUsage, next: TokenUsage): TokenUsage;
export declare function rebuildTokenUsage(usage: unknown, leftover?: TokenUsageLeftover): TokenUsage | undefined;
export declare function fromSpecTokenUsage(usage: ReadonlyArray<SpecTokenUsage> | undefined, leftover?: TokenUsageLeftover): TokenUsage | undefined;
