import { ClientOptions } from 'openai';
export interface LLMGatewayClientConfig extends Omit<ClientOptions, 'apiKey'> {
    apiKey: string;
}
/**
 * Gets the LLM Gateway API key from environment variables
 * @throws Error if LLM_GATEWAY_API_KEY is not found
 */
export declare function getLLMGatewayApiKeyFromEnv(): string;
/**
 * Returns an LLM Gateway client config with the gateway's OpenAI-compatible
 * base URL applied when not already set. LLM Gateway accepts the OpenAI SDK
 * verbatim, so the adapter drives it via the OpenAI SDK with this baseURL.
 * Point `baseURL` at your own deployment when self-hosting.
 */
export declare function withLLMGatewayDefaults(config: LLMGatewayClientConfig): LLMGatewayClientConfig;
