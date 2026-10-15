import { Ai, GatewayOptions } from '@cloudflare/workers-types';
import { ModelReasoning } from '@tanstack/ai';
import { ClientOptions } from 'openai';
import { OpenAIBaseTextAdapterOptions } from '@tanstack/openai-base';
/**
 * AI Gateway routing options. `id` is the gateway id (use `"default"` for the
 * account's auto-created gateway). The remaining fields are per-request
 * gateway controls (cache, logging, retries) and map to `cf-aig-*` headers on
 * the REST path or to the `gateway` run option on the binding path.
 */
export type CloudflareGatewayOptions = GatewayOptions;
export type FetchLike = NonNullable<ClientOptions['fetch']>;
/**
 * Run through the Workers AI binding (`env.AI`) inside a Cloudflare Worker.
 * No API token is needed.
 */
export interface CloudflareBindingConfig {
    binding: Ai;
    gateway?: CloudflareGatewayOptions;
    accountId?: never;
    apiKey?: never;
}
/** Run through the Cloudflare REST API from any runtime. */
export interface CloudflareRestConfig {
    accountId: string;
    apiKey: string;
    gateway?: CloudflareGatewayOptions;
    /** Custom fetch for every request. */
    fetch?: FetchLike;
    binding?: never;
}
/**
 * REST config for the chat surface. Also accepts the OpenAI SDK client
 * options (`baseURL`, `defaultHeaders`, `timeout`, `maxRetries`, ...), which
 * only the text and summarize adapters read.
 */
export interface CloudflareTextRestConfig extends CloudflareRestConfig, Omit<ClientOptions, 'apiKey' | 'fetch'> {
}
export type CloudflareConfig = CloudflareBindingConfig | CloudflareRestConfig;
export type CloudflareTextConfig = (CloudflareBindingConfig | CloudflareTextRestConfig) & OpenAIBaseTextAdapterOptions & CloudflareTextReasoningConfig;
/** The `reasoning` field of the Cloudflare text configs. */
export interface CloudflareTextReasoningConfig {
    /**
     * The model's reasoning data, for example `modelReasoning(record)` from a
     * `@tanstack/ai-models` record. It wins over the adapter's own table, for
     * `reasoning_effort` and for the levels `chat({ reasoning })` takes.
     * `false`: the model does not reason, so no reasoning field goes out.
     */
    reasoning?: ModelReasoning;
}
/**
 * What the env-reading factories accept: a binding, or REST fields with any
 * missing ones read from `CLOUDFLARE_ACCOUNT_ID` and `CLOUDFLARE_API_TOKEN`.
 */
export type CloudflareConfigInput<TRest extends CloudflareRestConfig = CloudflareRestConfig> = CloudflareBindingConfig | Partial<TRest>;
export declare const CLOUDFLARE_API_BASE = "https://api.cloudflare.com/client/v4";
export declare function isBindingConfig(config: {
    binding?: Ai;
}): config is CloudflareBindingConfig;
/** Base URL for the OpenAI-compatible chat surface of an account. */
export declare function restChatBaseURL(config: CloudflareTextRestConfig): string;
/**
 * Translates gateway options into the `cf-aig-*` request headers the REST
 * API reads. Retries are not mapped: set them on the gateway itself.
 */
export declare function gatewayHeaders(gateway: CloudflareGatewayOptions | undefined): Record<string, string>;
/**
 * Resolves a config for the env-reading factories: a binding config passes
 * through, anything else is filled from `CLOUDFLARE_ACCOUNT_ID` and
 * `CLOUDFLARE_API_TOKEN`.
 */
export declare function resolveConfigFromEnv<TRest extends CloudflareRestConfig>(config: CloudflareConfigInput<TRest> | undefined): CloudflareBindingConfig | (Partial<TRest> & CloudflareRestConfig);
