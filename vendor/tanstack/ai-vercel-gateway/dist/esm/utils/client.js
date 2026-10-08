import { getApiKeyFromEnv } from "@tanstack/ai-utils";
//#region src/utils/client.ts
function getVercelGatewayApiKeyFromEnv() {
	try {
		return getApiKeyFromEnv("AI_GATEWAY_API_KEY");
	} catch {
		try {
			return getApiKeyFromEnv("VERCEL_OIDC_TOKEN");
		} catch {
			throw new Error("AI_GATEWAY_API_KEY or VERCEL_OIDC_TOKEN is required. Set one in the environment or pass apiKey to the factory.");
		}
	}
}
function withVercelGatewayDefaults(config) {
	const { httpReferer, xTitle, defaultHeaders, ...rest } = config;
	return {
		...rest,
		baseURL: config.baseURL || "https://ai-gateway.vercel.sh/v1",
		defaultHeaders: {
			...httpReferer ? { "http-referer": httpReferer } : {},
			...xTitle ? { "x-title": xTitle } : {},
			...defaultHeaders
		}
	};
}
//#endregion
export { getVercelGatewayApiKeyFromEnv, withVercelGatewayDefaults };

//# sourceMappingURL=client.js.map