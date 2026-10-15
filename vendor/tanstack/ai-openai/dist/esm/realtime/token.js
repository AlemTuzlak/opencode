import { getOpenAIApiKeyFromEnv } from "../utils/client.js";
//#region src/realtime/token.ts
var OPENAI_REALTIME_CLIENT_SECRETS_URL = "https://api.openai.com/v1/realtime/client_secrets";
/**
* Builds the GA `/v1/realtime/client_secrets` request body.
*
* The session config (including its required `type`) is nested under the
* `session` key. The model is bound to the resulting ephemeral key, so the
* client never sends it during the WebRTC SDP exchange.
*/
function buildClientSecretRequest(model) {
	return { session: {
		type: "realtime",
		model
	} };
}
/**
* Parses the GA client secret response into a {@link RealtimeToken}.
*
* GA returns the ephemeral key at the top level (`value` / `expires_at`),
* not nested under `client_secret` like the retired Beta
* `/v1/realtime/sessions` response did.
*/
function parseClientSecretResponse(data, fallbackModel) {
	if (!data || typeof data.value !== "string" || typeof data.expires_at !== "number" || !Number.isFinite(data.expires_at)) throw new Error("OpenAI realtime client secret response missing or malformed `value`/`expires_at`");
	return {
		provider: "openai",
		token: data.value,
		expiresAt: data.expires_at * 1e3,
		config: { model: data.session?.model ?? fallbackModel }
	};
}
/**
* Creates an OpenAI realtime token adapter.
*
* This adapter generates ephemeral keys for client-side WebRTC connections
* via the GA `/v1/realtime/client_secrets` endpoint. The key is valid for
* 10 minutes by default.
*
* @param options - Configuration options for the realtime session
* @returns A RealtimeTokenAdapter for use with realtimeToken()
*
* @example
* ```typescript
* import { realtimeToken } from '@tanstack/ai'
* import { openaiRealtimeToken } from '@tanstack/ai-openai'
*
* const token = await realtimeToken({
*   adapter: openaiRealtimeToken({ model: 'gpt-realtime-2.1' }),
* })
* ```
*/
function openaiRealtimeToken(options = {}) {
	const apiKey = getOpenAIApiKeyFromEnv();
	return {
		provider: "openai",
		async generateToken() {
			const model = options.model ?? "gpt-realtime-2.1";
			const response = await fetch(OPENAI_REALTIME_CLIENT_SECRETS_URL, {
				method: "POST",
				headers: {
					Authorization: `Bearer ${apiKey}`,
					"Content-Type": "application/json"
				},
				body: JSON.stringify(buildClientSecretRequest(model))
			});
			if (!response.ok) {
				const errorText = await response.text();
				throw new Error(`OpenAI realtime client secret creation failed: ${response.status} ${errorText}`);
			}
			return parseClientSecretResponse(await response.json(), model);
		}
	};
}
//#endregion
export { buildClientSecretRequest, openaiRealtimeToken, parseClientSecretResponse };

//# sourceMappingURL=token.js.map