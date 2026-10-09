import { ClientOptions } from 'openai';
import { BedrockEndpoint } from './auth.js';
export type { BedrockEndpoint } from './auth.js';
export { resolveBedrockAuth } from './auth.js';
export type { ResolvedBedrockAuth } from './auth.js';
export interface BedrockClientConfig extends Omit<ClientOptions, 'apiKey' | 'baseURL'> {
    /** Bedrock API key (bearer). Optional — falls back to env, then SigV4. */
    apiKey?: string;
    /** Full AWS region (e.g. 'us-east-1'). Default 'us-east-1'. */
    region?: string;
    /** Chat adapter only; the responses adapter forces 'mantle'. Default 'runtime'. */
    endpoint?: BedrockEndpoint;
    /** Auth strategy. Default 'auto' (apiKey → env → SigV4). */
    auth?: 'apikey' | 'sigv4' | 'auto';
    /** Explicit override; wins over the computed endpoint URL (used by E2E → aimock). */
    baseURL?: string;
}
/** Builds OpenAI ClientOptions for the requested endpoint. `forced` pins the endpoint (responses → 'mantle'). */
export declare function withBedrockDefaults(config: BedrockClientConfig, forced?: BedrockEndpoint, model?: string): ClientOptions;
