import { GoogleGenAI, GoogleGenAIOptions } from '@google/genai';
export interface GeminiClientConfig extends GoogleGenAIOptions {
    /**
     * Base URL for every request. Maps onto `httpOptions.baseUrl` and wins
     * over it when both are set. Same option name as the other adapters, so a
     * gateway config can be spread into any of them.
     */
    baseURL?: string;
    /**
     * Headers sent with every request. Maps onto `httpOptions.headers` and wins
     * over it when both are set. Same option name as the other adapters.
     */
    defaultHeaders?: Record<string, string>;
}
/**
 * Creates a Google Generative AI client instance.
 *
 * AI Studio mode needs `apiKey`. Vertex / Enterprise mode (`vertexai` or
 * `enterprise`) uses project, location, and Google Cloud credentials instead.
 */
export declare function createGeminiClient(config: GeminiClientConfig): GoogleGenAI;
/**
 * Gets Google API key from environment variables
 * @throws Error if GOOGLE_API_KEY or GEMINI_API_KEY is not found
 */
export declare function getGeminiApiKeyFromEnv(): string;
/**
 * Generates a unique ID with a prefix
 */
export declare function generateId(prefix: string): string;
