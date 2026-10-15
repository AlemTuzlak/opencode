import { default as OpenAI, ClientOptions } from 'openai';
import { TextOptions } from '@tanstack/ai';
/** The fetch type of the OpenAI SDK. */
export type Fetch = NonNullable<ClientOptions['fetch']>;
/**
 * Extract `headers` and `signal` from a `Request | RequestInit` for the OpenAI
 * SDK's per-call `RequestOptions`. `Request` exposes `headers` as a `Headers`
 * instance (HeadersInit-compatible) while `RequestInit` exposes `HeadersInit`
 * directly — this helper accepts either shape so callers don't need to cast.
 *
 * Always returns an object (possibly empty) rather than `undefined` so test
 * assertions that match the second argument shape via `expect.anything()` /
 * `expect.objectContaining()` keep working when no request override was set.
 */
export declare function extractRequestOptions(request: Request | RequestInit | undefined): {
    headers?: HeadersInit;
    signal?: AbortSignal | null;
};
/**
 * The client of one call. With `wrapFetch`, it is a copy of the client whose
 * fetch goes through the wrapper. Without it, it is the same client.
 * `baseFetch` is the fetch that the adapter gave the client.
 */
export declare function clientFor(client: OpenAI, options: Pick<TextOptions, 'wrapFetch'>, baseFetch: Fetch | undefined, withFetch?: (fetch: Fetch) => OpenAI): OpenAI;
