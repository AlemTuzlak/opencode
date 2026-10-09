import { getApiKeyFromEnv } from "@tanstack/ai-utils";
//#region src/utils/client.ts
var COHERE_DEFAULT_BASE_URL = "https://api.cohere.com";
/** Resolve the effective base URL (no trailing slash) and headers. */
function resolveCohereTransport(config) {
	return {
		baseUrl: (config.baseURL ?? config.baseUrl ?? "https://api.cohere.com").replace(/\/+$/, ""),
		headers: config.defaultHeaders ?? config.headers ?? {}
	};
}
/**
* Gets Cohere API key from environment variables.
*
* Looks for `COHERE_API_KEY` in:
* - `process.env` (Node.js)
* - `window.env` (Browser with injected env)
*
* @throws Error if COHERE_API_KEY is not found
*/
function getCohereApiKeyFromEnv() {
	return getApiKeyFromEnv("COHERE_API_KEY");
}
//#endregion
export { COHERE_DEFAULT_BASE_URL, getCohereApiKeyFromEnv, resolveCohereTransport };

//# sourceMappingURL=client.js.map