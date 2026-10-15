import { ClientOptions } from 'openai';
export interface GrokClientConfig extends Omit<ClientOptions, 'apiKey'> {
    apiKey: string;
}
/**
 * Gets Grok API key from environment variables
 * @throws Error if XAI_API_KEY is not found
 */
export declare function getGrokApiKeyFromEnv(): string;
/**
 * Returns a Grok client config with the default xAI base URL applied
 * when not already set.
 */
export declare function withGrokDefaults(config: GrokClientConfig): GrokClientConfig;
