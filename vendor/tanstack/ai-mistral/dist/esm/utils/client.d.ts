import { Mistral } from '@mistralai/mistralai';
export interface MistralClientConfig {
    /** Mistral API key. */
    apiKey: string;
    /**
     * Base URL for every request. Same option name as the other adapters, so a
     * gateway config can be spread into any of them. Wins over `serverURL` when
     * both are set.
     */
    baseURL?: string;
    /** Alias of `baseURL`. */
    serverURL?: string;
    /** Optional request timeout (ms). */
    timeoutMs?: number;
    /** Optional default headers to include with every request. */
    defaultHeaders?: Record<string, string>;
    /**
     * Optional Google / Vertex access token. When set, it replaces
     * `apiKey` on the Authorization header.
     */
    getAccessToken?: () => Promise<string>;
    /**
     * Optional chat completions URL. Vertex uses this for
     * `:rawPredict` and `:streamRawPredict`.
     */
    resolveRequestUrl?: (stream: boolean) => string;
    /** Optional model id sent on the wire. Vertex uses publisher model ids. */
    requestModel?: string;
}
/**
 * Creates a Mistral SDK client instance. A `fetcher` replaces the SDK's fetch.
 */
export declare function createMistralClient(config: MistralClientConfig, fetcher?: typeof fetch): Mistral;
/**
 * Gets Mistral API key from environment variables.
 * @throws Error if MISTRAL_API_KEY is not found
 */
export declare function getMistralApiKeyFromEnv(): string;
/**
 * Generates a unique ID with a prefix.
 */
export declare function generateId(prefix: string): string;
