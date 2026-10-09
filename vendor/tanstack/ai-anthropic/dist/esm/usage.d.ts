import { TokenUsage } from '@tanstack/ai';
import { default as Anthropic_SDK } from '@anthropic-ai/sdk';
/**
 * Anthropic-specific provider usage details.
 * These fields are unique to Anthropic and placed in providerUsageDetails.
 */
export type AnthropicProviderUsageDetails = {
    /**
     * Server-side tool usage metrics.
     * Available when using Anthropic's built-in tools like web search.
     */
    serverToolUse?: {
        /** Number of web search requests made during the response */
        webSearchRequests?: number;
        /** Number of web fetch requests made during the response */
        webFetchRequests?: number;
    };
};
/**
 * Build normalized TokenUsage from Anthropic's usage object.
 *
 * `promptTokens` is the total input: uncached + cache read + cache write.
 * Anthropic's `input_tokens` counts only the uncached part, so this function
 * adds the cache parts. The cache parts are also in `promptTokensDetails`:
 * `cachedTokens` (read), `cacheWriteTokens` (write), and `cacheWrite1hTokens`
 * (the 1-hour part of the write). `totalTokens` is
 * `promptTokens + completionTokens`.
 *
 * Also handles server tool use metrics. Returns `undefined` when the provider
 * reported no usage object, so callers omit the field rather than fabricating
 * zeroed totals.
 */
export declare function buildAnthropicUsage(usage: Anthropic_SDK.Beta.BetaUsage | Anthropic_SDK.Beta.BetaMessageDeltaUsage | undefined | null, start?: Anthropic_SDK.Beta.BetaUsage): TokenUsage<AnthropicProviderUsageDetails> | undefined;
