import { default as Anthropic_SDK, ClientOptions } from '@anthropic-ai/sdk';
export interface AnthropicClientConfig extends ClientOptions {
    apiKey?: string | null;
}
/** Resolve explicit credentials before the environment credentials. */
export declare function resolveAnthropicCredentials(config: AnthropicClientConfig, oauthOverride?: boolean): {
    apiKey: string | null | undefined;
    authToken: string | null | undefined;
    oauth: boolean;
};
type AnyAnthropicMessagesCreate = (params: never, ...args: Array<never>) => unknown;
/**
 * The minimal Anthropic client surface used by the text adapter.
 *
 * The callable is intentionally type-erased because alternative Anthropic
 * clients can depend on a different 0.x release of the Anthropic SDK. Their
 * request and response declarations may drift even when the runtime Messages
 * protocol remains compatible.
 */
export interface AnthropicMessagesClient {
    readonly beta: {
        readonly messages: {
            readonly create: AnyAnthropicMessagesCreate;
        };
    };
}
/**
 * Creates an Anthropic SDK client instance
 */
export declare function createAnthropicClient(config: AnthropicClientConfig, oauthOverride?: boolean): Anthropic_SDK;
/**
 * Gets Anthropic API key from environment variables
 * @throws Error if ANTHROPIC_API_KEY is not found
 */
export declare function getAnthropicApiKeyFromEnv(): string;
/**
 * Generates a unique ID with a prefix
 */
export declare function generateId(prefix: string): string;
export {};
