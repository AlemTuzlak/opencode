import { MISTRAL_VERTEX_CHAT_MODELS } from "../model-meta.js";
import { MistralTextAdapter } from "../adapters/text.js";
import { MistralVertexAuthError, resolveMistralVertexAccessToken, resolveMistralVertexLocation, resolveMistralVertexModelUrl, resolveMistralVertexProject } from "./auth.js";
//#region src/vertex/index.ts
/**
* Creates a Mistral chat adapter that talks to Mistral on Vertex AI.
*
* Install `google-auth-library` next to `@tanstack/ai-mistral` for
* Application Default Credentials. Or pass `authClient` or `getAccessToken`.
*/
function mistralVertexText(model, config = {}) {
	const resolveRequestUrl = config.resolveRequestUrl ?? ((stream) => {
		return `${resolveMistralVertexModelUrl(model, config)}:${stream ? "streamRawPredict" : "rawPredict"}`;
	});
	return new MistralTextAdapter({
		apiKey: "vertex",
		getAccessToken: () => resolveMistralVertexAccessToken(config),
		resolveRequestUrl,
		requestModel: model,
		defaultHeaders: config.defaultHeaders
	}, model);
}
//#endregion
export { MISTRAL_VERTEX_CHAT_MODELS, MistralVertexAuthError, mistralVertexText, resolveMistralVertexAccessToken, resolveMistralVertexLocation, resolveMistralVertexModelUrl, resolveMistralVertexProject };

//# sourceMappingURL=index.js.map