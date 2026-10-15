import { resolveBedrockAuth } from "./auth.js";
import { createSigV4Fetch } from "./openai-sigv4-fetch.js";
import { mantlePathForModel } from "../api-compatibility.js";
//#region src/utils/client.ts
var DEFAULT_REGION = "us-east-1";
/** OpenAI SDK requires a non-empty apiKey even when a signed fetch overrides Authorization. */
var SIGV4_PLACEHOLDER_KEY = "bedrock-sigv4";
function buildBaseURL(region, endpoint, model) {
	return endpoint === "mantle" ? `https://bedrock-mantle.${region}.api.aws${mantlePathForModel(model)}` : `https://bedrock-runtime.${region}.amazonaws.com/openai/v1`;
}
/** Builds OpenAI ClientOptions for the requested endpoint. `forced` pins the endpoint (responses → 'mantle'). */
function withBedrockDefaults(config, forced, model) {
	const { region, endpoint, auth, apiKey, baseURL, fetch, ...rest } = config;
	const resolvedRegion = region ?? DEFAULT_REGION;
	const resolvedEndpoint = forced ?? endpoint ?? "runtime";
	const resolved = resolveBedrockAuth({
		apiKey,
		region: resolvedRegion,
		auth
	}, resolvedEndpoint);
	const resolvedBaseURL = baseURL ?? buildBaseURL(resolvedRegion, resolvedEndpoint, model);
	if (resolved.kind === "bearer") return {
		...rest,
		baseURL: resolvedBaseURL,
		apiKey: resolved.token,
		...fetch ? { fetch } : {}
	};
	return {
		...rest,
		baseURL: resolvedBaseURL,
		apiKey: SIGV4_PLACEHOLDER_KEY,
		fetch: fetch ?? createSigV4Fetch(resolved)
	};
}
//#endregion
export { resolveBedrockAuth, withBedrockDefaults };

//# sourceMappingURL=client.js.map