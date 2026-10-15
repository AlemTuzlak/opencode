import { Ai } from '@cloudflare/workers-types';
import { CloudflareGatewayOptions, FetchLike } from './config.js';
/**
 * Workers AI streams end with a usage-only trailer (`{"response":"","usage":
 * {...}}`) that has no `choices` field. The OpenAI Chat Completions stream
 * reader indexes `chunk.choices[0]` on every event, so give such events an
 * empty `choices` array (OpenAI's own usage-only trailer shape) and keep the
 * usage totals they carry.
 */
export declare function normalizeSseResponse(response: Response): Response;
/**
 * Cloudflare error bodies look like `{ name, message, internalCode }` or
 * `{ errors: [{ code, message }] }`. The OpenAI SDK only reads
 * `body.error.message`, so rewrap them or every failure reads as
 * "status code (no body)".
 */
export declare function normalizeErrorResponse(response: Response): Promise<Response>;
/** Applies the error and SSE normalizations a raw Cloudflare response needs. */
export declare function normalizeResponse(response: Response): Promise<Response>;
/**
 * Makes `env.AI` look like an OpenAI-compatible HTTP endpoint to the OpenAI
 * SDK: the JSON request body becomes `binding.run(model, inputs)` and the
 * raw inference `Response` (OpenAI-format JSON or SSE) is handed back.
 */
export declare function createBindingFetch(binding: Ai, gateway?: CloudflareGatewayOptions): FetchLike;
/** Options of {@link cloudflareBindingFetch}. */
export interface CloudflareBindingFetchOptions {
    /** The Workers AI binding, `env.AI`. */
    binding: Ai;
    /**
     * The AI Gateway vendor of the model. `'anthropic'` carries Anthropic
     * Messages requests (`createAnthropicChat`), and `'openai'` carries OpenAI
     * Responses requests (`createOpenaiChat`).
     */
    vendor: 'anthropic' | 'openai';
    /** AI Gateway options, passed to `env.AI.run`. */
    gateway?: CloudflareGatewayOptions;
}
/**
 * A `fetch` that sends the requests of the Anthropic or OpenAI SDK through the
 * Workers AI binding, to the AI Gateway `anthropic/…` or `openai/…` models.
 * Pass it as `fetch` to `createAnthropicChat` or `createOpenaiChat`. The
 * binding authenticates, so the key argument can be any placeholder.
 *
 * The request body goes to `env.AI.run('<vendor>/<model>', body)`. Headers
 * such as `anthropic-beta` go along as `extraHeaders`.
 *
 * @example
 * ```ts
 * const adapter = createAnthropicChat('claude-opus-5-5', 'cloudflare-binding', {
 *   fetch: cloudflareBindingFetch({ binding: env.AI, vendor: 'anthropic' }),
 * })
 * ```
 */
export declare function cloudflareBindingFetch(options: CloudflareBindingFetchOptions): FetchLike;
/** Wraps a REST fetch so responses get the same error and trailer fixes. */
export declare function createRestFetch(baseFetch: FetchLike | undefined): FetchLike;
