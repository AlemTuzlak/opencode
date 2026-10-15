import { GoogleGenAI } from "@google/genai";
import { generateId, getApiKeyFromEnv } from "@tanstack/ai-utils";
//#region src/utils/client.ts
/**
* Creates a Google Generative AI client instance.
*
* AI Studio mode needs `apiKey`. Vertex / Enterprise mode (`vertexai` or
* `enterprise`) uses project, location, and Google Cloud credentials instead.
*/
function createGeminiClient(config) {
	if (!(config.vertexai === true || config.enterprise === true) && (config.apiKey === void 0 || config.apiKey.length === 0)) throw new Error("A Gemini API key is required when vertexai and enterprise are not set. Pass apiKey, or set GOOGLE_API_KEY or GEMINI_API_KEY.");
	const { baseURL, defaultHeaders, ...options } = config;
	if (baseURL !== void 0 || defaultHeaders !== void 0) options.httpOptions = {
		...options.httpOptions,
		...baseURL !== void 0 ? { baseUrl: baseURL } : {},
		...defaultHeaders !== void 0 ? { headers: defaultHeaders } : {}
	};
	return new GoogleGenAI(options);
}
/**
* Gets Google API key from environment variables
* @throws Error if GOOGLE_API_KEY or GEMINI_API_KEY is not found
*/
function getGeminiApiKeyFromEnv() {
	try {
		return getApiKeyFromEnv("GOOGLE_API_KEY");
	} catch {
		try {
			return getApiKeyFromEnv("GEMINI_API_KEY");
		} catch {
			throw new Error("GOOGLE_API_KEY or GEMINI_API_KEY is not set. Please set one of these environment variables or pass the API key directly.");
		}
	}
}
/**
* Generates a unique ID with a prefix
*/
function generateId$1(prefix) {
	return generateId(prefix);
}
//#endregion
export { createGeminiClient, generateId$1 as generateId, getGeminiApiKeyFromEnv };

//# sourceMappingURL=client.js.map