import { Ollama } from 'ollama';
export interface OllamaClientConfig {
    /**
     * Base URL for every request. Same option name as the other adapters, so a
     * gateway config can be spread into any of them. Wins over `host` when both
     * are set.
     */
    baseURL?: string;
    /** Alias of `baseURL`. */
    host?: string;
    /**
     * Headers sent with every request. Same option name as the other adapters.
     * Wins over `headers` when both are set.
     */
    defaultHeaders?: Record<string, string>;
    /** Alias of `defaultHeaders`. */
    headers?: Record<string, string> | undefined;
}
/**
 * Creates an Ollama client instance. A `fetch` replaces the client's fetch.
 */
export declare function createOllamaClient(config?: OllamaClientConfig, fetch?: typeof globalThis.fetch): Ollama;
/**
 * Gets Ollama host from environment variables
 * Falls back to default localhost
 */
export declare function getOllamaHostFromEnv(): string;
/**
 * Generates a unique ID with a prefix
 */
export declare function generateId(prefix?: string): string;
/**
 * Estimates token count for text (rough approximation)
 */
export declare function estimateTokens(text: string): number;
