export declare const PERPLEXITY_INTEGRATION_HEADER = "X-Pplx-Integration";
export declare const PERPLEXITY_INTEGRATION_HEADER_VALUE: string;
/**
 * Attribution header Perplexity uses to identify TanStack AI traffic
 * (`X-Pplx-Integration: tanstack/<package-version>`).
 *
 * The Search client sends this automatically. Pass it as
 * `openaiCompatible({ defaultHeaders })` if you want the same header on
 * Sonar chat requests.
 */
export declare function getPerplexityIntegrationHeaders(): Record<string, string>;
