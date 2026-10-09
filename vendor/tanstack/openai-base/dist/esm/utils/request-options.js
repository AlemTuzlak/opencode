//#region src/utils/request-options.ts
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
function extractRequestOptions(request) {
	if (!request) return {};
	return {
		...request.headers !== void 0 && { headers: request.headers },
		...request.signal != null && { signal: request.signal }
	};
}
/**
* The client of one call. With `wrapFetch`, it is a copy of the client whose
* fetch goes through the wrapper. Without it, it is the same client.
* `baseFetch` is the fetch that the adapter gave the client.
*/
function clientFor(client, options, baseFetch, withFetch = (fetch) => client.withOptions({ fetch })) {
	const { wrapFetch } = options;
	if (!wrapFetch) return client;
	return withFetch(wrapFetch(baseFetch ?? globalThis.fetch));
}
//#endregion
export { clientFor, extractRequestOptions };

//# sourceMappingURL=request-options.js.map