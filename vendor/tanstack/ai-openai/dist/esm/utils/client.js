import { getApiKeyFromEnv } from "@tanstack/ai-utils";
//#region src/utils/client.ts
/**
* Gets OpenAI API key from environment variables
* @throws Error if OPENAI_API_KEY is not found
*/
function getOpenAIApiKeyFromEnv() {
	return getApiKeyFromEnv("OPENAI_API_KEY");
}
//#endregion
export { getOpenAIApiKeyFromEnv };

//# sourceMappingURL=client.js.map