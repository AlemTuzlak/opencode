import "../model-meta.js";
import { getGrokApiKeyFromEnv } from "../utils/client.js";
import "../utils/index.js";
import { resolveDebugOption } from "@tanstack/ai/adapter-internals";
//#region src/realtime/token.ts
var GROK_REALTIME_CLIENT_SECRETS_URL = "https://api.x.ai/v1/realtime/client_secrets";
var DEFAULT_TOKEN_FETCH_TIMEOUT_MS = 15e3;
/**
* Creates a Grok realtime token adapter.
*
* Generates ephemeral client secrets for browser-side WebRTC connections to
* the xAI Voice Agent API.
*
* @param options - Configuration options for the realtime session.
* @returns A RealtimeTokenAdapter for use with `realtimeToken()`.
*
* @example
* ```typescript
* import { realtimeToken } from '@tanstack/ai'
* import { grokRealtimeToken } from '@tanstack/ai-grok'
*
* const token = await realtimeToken({
*   adapter: grokRealtimeToken({ model: 'grok-voice-think-fast-2.0' }),
* })
* ```
*/
function grokRealtimeToken(options = {}) {
	const apiKey = getGrokApiKeyFromEnv();
	const logger = resolveDebugOption(options.debug);
	return {
		provider: "grok",
		async generateToken() {
			const model = options.model ?? "grok-voice-think-fast-2.0";
			logger.request(`activity=realtimeToken provider=grok model=${model}`, {
				provider: "grok",
				model
			});
			const requestBody = { session: { model } };
			const controller = new AbortController();
			const timeout = setTimeout(() => controller.abort(/* @__PURE__ */ new Error("Grok realtime token request timed out")), DEFAULT_TOKEN_FETCH_TIMEOUT_MS);
			try {
				const response = await fetch(GROK_REALTIME_CLIENT_SECRETS_URL, {
					method: "POST",
					headers: {
						Authorization: `Bearer ${apiKey}`,
						"Content-Type": "application/json"
					},
					body: JSON.stringify(requestBody),
					signal: controller.signal
				});
				if (!response.ok) {
					const errorText = await response.text();
					throw new Error(`Grok realtime session creation failed: ${response.status} ${errorText}`);
				}
				const sessionData = await response.json();
				const clientSecret = sessionData?.client_secret;
				if (!clientSecret || typeof clientSecret.value !== "string" || typeof clientSecret.expires_at !== "number" || !Number.isFinite(clientSecret.expires_at)) throw new Error("Grok realtime session response missing or malformed `client_secret`");
				const sessionModel = sessionData.model ?? model;
				const raw = clientSecret.expires_at;
				const expiresAt = raw > 0xe8d4a51000 ? raw : raw * 1e3;
				return {
					provider: "grok",
					token: clientSecret.value,
					expiresAt,
					config: { model: sessionModel }
				};
			} catch (error) {
				logger.errors("grok.realtimeToken fatal", {
					error,
					source: "grok.realtimeToken"
				});
				throw error;
			} finally {
				clearTimeout(timeout);
			}
		}
	};
}
//#endregion
export { grokRealtimeToken };

//# sourceMappingURL=token.js.map