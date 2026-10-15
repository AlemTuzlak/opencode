import Anthropic_SDK from "@anthropic-ai/sdk";
import { generateId, getApiKeyFromEnv } from "@tanstack/ai-utils";
//#region src/utils/client.ts
/** Resolve explicit credentials before the environment credentials. */
function resolveAnthropicCredentials(config, oauthOverride) {
	const env = typeof process === "undefined" ? {} : process.env;
	const explicit = Boolean(config.authToken || config.apiKey);
	const environmentToken = env.ANTHROPIC_AUTH_TOKEN || env.ANTHROPIC_OAUTH_TOKEN;
	const credential = explicit ? config.authToken || config.apiKey : environmentToken || env.ANTHROPIC_API_KEY;
	if (!credential) getAnthropicApiKeyFromEnv();
	const detectedOAuth = Boolean(credential?.includes("sk-ant-oat") || !explicit && !env.ANTHROPIC_AUTH_TOKEN && env.ANTHROPIC_OAUTH_TOKEN);
	const oauth = oauthOverride ?? detectedOAuth;
	const token = Boolean(config.authToken || !explicit && environmentToken || detectedOAuth || oauth);
	return {
		apiKey: token ? null : credential,
		authToken: token ? credential : null,
		oauth
	};
}
/**
* Creates an Anthropic SDK client instance
*/
function createAnthropicClient(config, oauthOverride) {
	const credentials = resolveAnthropicCredentials(config, oauthOverride);
	return new Anthropic_SDK({
		...config,
		apiKey: credentials.apiKey,
		authToken: credentials.authToken,
		...credentials.authToken && { defaultHeaders: {
			...config.defaultHeaders,
			"x-api-key": null
		} }
	});
}
/**
* Gets Anthropic API key from environment variables
* @throws Error if ANTHROPIC_API_KEY is not found
*/
function getAnthropicApiKeyFromEnv() {
	return getApiKeyFromEnv("ANTHROPIC_API_KEY");
}
/**
* Generates a unique ID with a prefix
*/
function generateId$1(prefix) {
	return generateId(prefix);
}
//#endregion
export { createAnthropicClient, generateId$1 as generateId, getAnthropicApiKeyFromEnv, resolveAnthropicCredentials };

//# sourceMappingURL=client.js.map