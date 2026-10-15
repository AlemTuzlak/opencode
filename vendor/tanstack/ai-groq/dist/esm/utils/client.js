import { getApiKeyFromEnv } from "@tanstack/ai-utils";
//#region src/utils/client.ts
/**
* Gets Groq API key from environment variables
* @throws Error if GROQ_API_KEY is not found
*/
function getGroqApiKeyFromEnv() {
	try {
		return getApiKeyFromEnv("GROQ_API_KEY");
	} catch {
		throw new Error("GROQ_API_KEY is required. Please set it in your environment variables or use the factory function with an explicit API key.");
	}
}
/**
* Returns a Groq client config with Groq's OpenAI-compatible base URL
* applied when not already set. The Groq endpoint accepts the OpenAI SDK
* verbatim, so the adapter drives it via the OpenAI SDK with this baseURL.
*/
function withGroqDefaults(config) {
	return {
		...config,
		baseURL: config.baseURL || "https://api.groq.com/openai/v1"
	};
}
//#endregion
export { getGroqApiKeyFromEnv, withGroqDefaults };

//# sourceMappingURL=client.js.map