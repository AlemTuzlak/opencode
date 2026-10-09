import { getApiKeyFromEnv } from "@tanstack/ai-utils";
//#region src/utils/config.ts
var CLOUDFLARE_API_BASE = "https://api.cloudflare.com/client/v4";
function isBindingConfig(config) {
	return config.binding !== void 0;
}
/** Base URL for the OpenAI-compatible chat surface of an account. */
function restChatBaseURL(config) {
	return config.baseURL || `https://api.cloudflare.com/client/v4/accounts/${config.accountId}/ai/v1`;
}
/**
* Translates gateway options into the `cf-aig-*` request headers the REST
* API reads. Retries are not mapped: set them on the gateway itself.
*/
function gatewayHeaders(gateway) {
	if (!gateway) return {};
	const headers = { "cf-aig-gateway-id": gateway.id };
	if (gateway.skipCache !== void 0) headers["cf-aig-skip-cache"] = String(gateway.skipCache);
	if (gateway.cacheTtl !== void 0) headers["cf-aig-cache-ttl"] = String(gateway.cacheTtl);
	if (gateway.cacheKey !== void 0) headers["cf-aig-cache-key"] = gateway.cacheKey;
	if (gateway.collectLog !== void 0) headers["cf-aig-collect-log"] = String(gateway.collectLog);
	if (gateway.eventId !== void 0) headers["cf-aig-event-id"] = gateway.eventId;
	if (gateway.requestTimeoutMs !== void 0) headers["cf-aig-request-timeout"] = String(gateway.requestTimeoutMs);
	if (gateway.metadata !== void 0) headers["cf-aig-metadata"] = JSON.stringify(gateway.metadata);
	return headers;
}
/**
* Resolves a config for the env-reading factories: a binding config passes
* through, anything else is filled from `CLOUDFLARE_ACCOUNT_ID` and
* `CLOUDFLARE_API_TOKEN`.
*/
function resolveConfigFromEnv(config) {
	if (config && isBindingConfig(config)) return config;
	const rest = config ?? {};
	try {
		return {
			...rest,
			accountId: rest.accountId ?? getApiKeyFromEnv("CLOUDFLARE_ACCOUNT_ID"),
			apiKey: rest.apiKey ?? getApiKeyFromEnv("CLOUDFLARE_API_TOKEN")
		};
	} catch (cause) {
		throw new Error("CLOUDFLARE_ACCOUNT_ID and CLOUDFLARE_API_TOKEN are required. Set them in your environment, pass { accountId, apiKey }, or pass { binding: env.AI } inside a Worker.", { cause });
	}
}
//#endregion
export { CLOUDFLARE_API_BASE, gatewayHeaders, isBindingConfig, resolveConfigFromEnv, restChatBaseURL };

//# sourceMappingURL=config.js.map