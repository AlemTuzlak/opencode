import { GROK_VERTEX_CHAT_MODELS } from "../model-meta.js";
import { GrokTextAdapter } from "../adapters/text.js";
import { GrokVertexAuthError, resolveGrokVertexAccessToken, resolveGrokVertexBaseURL, resolveGrokVertexLocation, resolveGrokVertexProject, toVertexGrokModelId } from "./auth.js";
import { ChatStreamSummarizeAdapter } from "@tanstack/ai/adapters";
//#region src/vertex/index.ts
var VERTEX_UNSUPPORTED_GROK_SERVER_TOOLS = /* @__PURE__ */ new Set([
	"web_search",
	"x_search",
	"file_search",
	"mcp"
]);
var GrokVertexTextAdapter = class extends GrokTextAdapter {
	mapOptionsToRequest(options) {
		const request = super.mapOptionsToRequest(options);
		const tools = request.tools;
		if (tools !== void 0) for (const tool of tools) {
			if (tool === null || typeof tool !== "object" || !("type" in tool)) continue;
			if (VERTEX_UNSUPPORTED_GROK_SERVER_TOOLS.has(String(tool.type))) throw new Error("Grok Vertex does not support xAI server tools (web_search, x_search, file_search, mcp). Use a function tool.");
		}
		return {
			...request,
			model: toVertexGrokModelId(this.model)
		};
	}
};
/**
* Creates a Grok chat adapter that talks to xAI Grok on Vertex AI.
*
* Install `google-auth-library` next to `@tanstack/ai-grok` for Application
* Default Credentials. Or pass `authClient` or `getAccessToken`.
*/
function grokVertexText(model, config = {}) {
	return new GrokVertexTextAdapter({
		apiKey: "vertex",
		baseURL: resolveGrokVertexBaseURL(config),
		defaultHeaders: config.defaultHeaders,
		fetch: async (input, init) => {
			const token = await resolveGrokVertexAccessToken(config);
			const headers = new Headers(init?.headers);
			headers.set("Authorization", `Bearer ${token}`);
			if (config.defaultHeaders) for (const [key, value] of Object.entries(config.defaultHeaders)) headers.set(key, value);
			return fetch(input, {
				...init,
				headers
			});
		}
	}, model);
}
/**
* Creates a Grok summarize adapter that talks to xAI Grok on Vertex AI.
*/
function grokVertexSummarize(model, config = {}) {
	return new ChatStreamSummarizeAdapter(grokVertexText(model, config), model, "grok");
}
//#endregion
export { GROK_VERTEX_CHAT_MODELS, GrokVertexAuthError, grokVertexSummarize, grokVertexText, resolveGrokVertexAccessToken, resolveGrokVertexBaseURL, resolveGrokVertexLocation, resolveGrokVertexProject, toVertexGrokModelId };

//# sourceMappingURL=index.js.map