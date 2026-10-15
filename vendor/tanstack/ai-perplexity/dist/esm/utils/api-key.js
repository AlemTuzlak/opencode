//#region src/utils/api-key.ts
/**
* Resolve a Perplexity API key from environment variables.
*
* Honors `PERPLEXITY_API_KEY` first, then falls back to `PPLX_API_KEY`.
* Throws if neither is set.
*/
function getPerplexityApiKeyFromEnv() {
	const env = getEnvironment();
	const key = [env?.PERPLEXITY_API_KEY, env?.PPLX_API_KEY].find((value) => typeof value === "string" && value.trim().length > 0)?.trim();
	if (!key) throw new Error("PERPLEXITY_API_KEY (or PPLX_API_KEY) is required. Set it in your environment or pass an explicit apiKey.");
	return key;
}
function getEnvironment() {
	if (typeof globalThis !== "undefined") {
		const win = globalThis.window;
		if (win?.env) return win.env;
	}
	if (typeof process !== "undefined") return process.env;
}
//#endregion
export { getPerplexityApiKeyFromEnv };

//# sourceMappingURL=api-key.js.map