import { getGeminiApiKeyFromEnv } from "../utils/client.js";
import "../utils/index.js";
import { GoogleGenAI } from "@google/genai";
//#region src/realtime/token.ts
/**
* Creates a Google Gemini realtime token adapter.
*
* This adapter generates ephemeral tokens for client-side WebSocket connections.
*
* @param options - Configuration options for the realtime session
* @returns A RealtimeTokenAdapter for use with realtimeToken()
*
* @example
* ```typescript
* import { realtimeToken } from '@tanstack/ai'
* import { geminiRealtimeToken } from '@tanstack/ai-gemini'
*
* const token = await realtimeToken({
*   adapter: geminiRealtimeToken({
*     // Optional: constraint model config by token
*     liveConnectConstraints: {
*       model: 'gemini-3.8-live',
*     },
*   }),
* })
* ```
*/
function geminiRealtimeToken(options = {}) {
	const apiKey = getGeminiApiKeyFromEnv();
	const client = new GoogleGenAI({ apiKey });
	return {
		provider: "gemini",
		async generateToken() {
			const expireTime = options.expiresAt ?? Date.now() + 18e5;
			const token = await client.authTokens.create({ config: {
				uses: options.uses ?? 1,
				expireTime: new Date(expireTime).toISOString(),
				liveConnectConstraints: options.liveConnectConstraints,
				httpOptions: { apiVersion: "v1alpha" }
			} });
			if (!token.name) throw new Error("Gemini realtime token creation failed");
			return {
				provider: "gemini",
				token: token.name,
				expiresAt: expireTime,
				config: { model: options.liveConnectConstraints?.model }
			};
		}
	};
}
//#endregion
export { geminiRealtimeToken };

//# sourceMappingURL=token.js.map