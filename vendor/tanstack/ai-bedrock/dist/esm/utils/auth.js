//#region src/utils/auth.ts
/** SigV4 service name differs per endpoint. */
function sigv4Service(endpoint) {
	return endpoint === "mantle" ? "bedrock-mantle" : "bedrock";
}
var DEFAULT_REGION = "us-east-1";
function readApiKeyFromEnv() {
	const env = typeof process !== "undefined" ? process.env : void 0;
	for (const value of [env?.BEDROCK_API_KEY, env?.AWS_BEARER_TOKEN_BEDROCK]) if (value && value.trim() !== "") return value;
}
/** apiKey -> BEDROCK_API_KEY -> AWS_BEARER_TOKEN_BEDROCK -> SigV4 (credential chain). */
function resolveBedrockAuth(config, endpoint) {
	const mode = config.auth ?? "auto";
	const region = config.region ?? DEFAULT_REGION;
	if (mode !== "sigv4") {
		const token = config.apiKey ?? readApiKeyFromEnv();
		if (token) return {
			kind: "bearer",
			token
		};
		if (mode === "apikey") throw new Error("No Bedrock API key found. Set BEDROCK_API_KEY (or AWS_BEARER_TOKEN_BEDROCK), pass `apiKey`, or use auth: \"sigv4\".");
	}
	return {
		kind: "sigv4",
		region,
		service: sigv4Service(endpoint),
		credentials: async (...args) => {
			const { fromNodeProviderChain } = await import(
				/* @vite-ignore */
				"@aws-sdk/credential-providers"
);
			return fromNodeProviderChain()(...args);
		}
	};
}
//#endregion
export { resolveBedrockAuth, sigv4Service };

//# sourceMappingURL=auth.js.map