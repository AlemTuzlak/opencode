export interface PerplexitySearchClientConfig {
    /** Perplexity API key. Falls back to `PERPLEXITY_API_KEY` / `PPLX_API_KEY` env vars. */
    apiKey?: string;
    /** Override the API base URL (defaults to https://api.perplexity.ai). */
    baseURL?: string;
    /** Optional `fetch` implementation; defaults to globalThis.fetch. */
    fetch?: typeof fetch;
}
export interface PerplexitySearchRequest {
    /** The search query, or up to 5 queries. */
    query: string | ReadonlyArray<string>;
    /** Maximum number of results to return (1–20). Defaults to the API default (10). */
    max_results?: number;
    /** Maximum tokens of content to return per page. */
    max_tokens_per_page?: number;
    /**
     * Restrict (or exclude) results by domain (max 20 entries).
     *
     * Hostnames, optional paths, or TLDs. Use bare entries to allowlist
     * (`["nytimes.com"]`) or `-` prefixed entries to denylist
     * (`["-pinterest.com"]`). Allow and deny entries must NOT be mixed.
     */
    search_domain_filter?: Array<string>;
    /** Restrict results by recency: `hour | day | week | month | year`. */
    search_recency_filter?: 'hour' | 'day' | 'week' | 'month' | 'year';
    /** Only include results published on or after this date (m/d/yyyy). */
    search_after_date_filter?: string;
    /** Only include results published on or before this date (m/d/yyyy). */
    search_before_date_filter?: string;
}
export interface PerplexitySearchResult {
    title: string;
    url: string;
    snippet: string;
    date?: string;
    last_updated?: string;
}
export interface PerplexitySearchResponse {
    id?: string;
    results: Array<PerplexitySearchResult>;
}
/**
 * Low-level HTTP client for the Perplexity Search API.
 *
 * Calls `POST {baseURL}/search` with bearer auth.
 */
export declare class PerplexitySearchClient {
    private readonly apiKey;
    private readonly baseURL;
    private readonly fetchImpl;
    constructor(config?: PerplexitySearchClientConfig);
    search(request: PerplexitySearchRequest, init?: {
        signal?: AbortSignal;
    }): Promise<PerplexitySearchResponse>;
}
