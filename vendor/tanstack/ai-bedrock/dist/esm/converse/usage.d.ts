import { TokenUsage as ConverseTokenUsage } from '@aws-sdk/client-bedrock-runtime';
/**
 * Build normalized `TokenUsage` from a Converse `usage` object.
 *
 * `promptTokens` is the total input. Converse `inputTokens` is only the
 * uncached part, so the cache reads and cache writes are added to it. The two
 * cache parts also go on `promptTokensDetails`, with `cacheWrite1hTokens` for
 * the writes with a 1-hour TTL in `cacheDetails`. Zero is kept, unlike the
 * Anthropic and OpenAI builders. Bedrock leaves the fields out when no
 * checkpoint applied and sends 0 when one did (a served checkpoint writes 0),
 * so absent and zero are different results.
 */
export declare function buildConverseUsage(usage: ConverseTokenUsage): import('@tanstack/ai-event-client').TokenUsage<import('@tanstack/ai-event-client').ProviderUsageDetails>;
