/**
 * Resolve a Perplexity API key from environment variables.
 *
 * Honors `PERPLEXITY_API_KEY` first, then falls back to `PPLX_API_KEY`.
 * Throws if neither is set.
 */
export declare function getPerplexityApiKeyFromEnv(): string;
