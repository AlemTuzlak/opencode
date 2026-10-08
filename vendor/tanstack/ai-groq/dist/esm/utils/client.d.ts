import { ClientOptions } from 'openai';
export interface GroqClientConfig extends Omit<ClientOptions, 'apiKey'> {
    apiKey: string;
}
/**
 * Gets Groq API key from environment variables
 * @throws Error if GROQ_API_KEY is not found
 */
export declare function getGroqApiKeyFromEnv(): string;
/**
 * Returns a Groq client config with Groq's OpenAI-compatible base URL
 * applied when not already set. The Groq endpoint accepts the OpenAI SDK
 * verbatim, so the adapter drives it via the OpenAI SDK with this baseURL.
 */
export declare function withGroqDefaults(config: GroqClientConfig): GroqClientConfig;
