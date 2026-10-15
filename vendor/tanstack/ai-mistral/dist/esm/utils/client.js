import { HTTPClient, Mistral } from "@mistralai/mistralai";
//#region src/utils/client.ts
/**
* Creates a Mistral SDK client instance. A `fetcher` replaces the SDK's fetch.
*/
function createMistralClient(config, fetcher) {
	const { apiKey, baseURL, timeoutMs, defaultHeaders, getAccessToken, resolveRequestUrl } = config;
	const serverURL = baseURL ?? config.serverURL;
	const needsHook = defaultHeaders !== void 0 && Object.keys(defaultHeaders).length > 0 || getAccessToken !== void 0 || resolveRequestUrl !== void 0;
	let httpClient;
	if (needsHook || fetcher) httpClient = new HTTPClient({ fetcher: fetcher && (async (input) => {
		const request = new Request(input);
		return fetcher(request.url, {
			method: request.method,
			headers: request.headers,
			body: request.body && await request.arrayBuffer(),
			signal: request.signal
		});
	}) });
	if (httpClient && needsHook) httpClient.addHook("beforeRequest", async (req) => {
		const nextUrl = resolveRequestUrl === void 0 ? req.url : resolveRequestUrl(false);
		const next = new Request(nextUrl, req);
		if (defaultHeaders) for (const [key, value] of Object.entries(defaultHeaders)) next.headers.set(key, value);
		if (getAccessToken !== void 0) next.headers.set("Authorization", `Bearer ${await getAccessToken()}`);
		return next;
	});
	return new Mistral({
		apiKey,
		...serverURL !== void 0 ? { serverURL } : {},
		...timeoutMs !== void 0 ? { timeoutMs } : {},
		...httpClient !== void 0 ? { httpClient } : {}
	});
}
/**
* Gets Mistral API key from environment variables.
* @throws Error if MISTRAL_API_KEY is not found
*/
function getMistralApiKeyFromEnv() {
	let key;
	if (typeof process !== "undefined" && typeof process.env !== "undefined") key = process.env.MISTRAL_API_KEY;
	else key = globalThis.window?.env?.MISTRAL_API_KEY;
	if (!key) throw new Error("MISTRAL_API_KEY is required. In Node.js set it as an environment variable; in browser environments inject it via window.env.MISTRAL_API_KEY or use the factory function with an explicit API key.");
	return key;
}
/**
* Generates a unique ID with a prefix.
*/
function generateId(prefix) {
	return `${prefix}-${crypto.randomUUID()}`;
}
//#endregion
export { createMistralClient, generateId, getMistralApiKeyFromEnv };

//# sourceMappingURL=client.js.map