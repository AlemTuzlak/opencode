import { HTTPClient, OpenRouter } from "@openrouter/sdk";
//#region src/internal/wrap-fetch.ts
/**
* Give the client for one call. With `wrapFetch`, it is a new client whose
* requests go through the wrapper. The base fetch is the config's own HTTP
* client, so its hooks and its fetcher still run.
*/
function clientForCall(client, options, wrapFetch) {
	if (!wrapFetch) return client;
	const base = options.httpClient ?? new HTTPClient();
	const wrapped = wrapFetch((input, init) => base.request(new Request(input, init)));
	return new OpenRouter({
		...options,
		httpClient: new HTTPClient({ fetcher: async (input) => {
			const request = new Request(input);
			return wrapped(request.url, {
				method: request.method,
				headers: request.headers,
				body: request.body && await request.arrayBuffer(),
				signal: request.signal
			});
		} })
	});
}
//#endregion
export { clientForCall };

//# sourceMappingURL=wrap-fetch.js.map