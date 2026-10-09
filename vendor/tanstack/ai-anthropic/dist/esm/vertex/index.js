import { ANTHROPIC_VERTEX_CHAT_MODELS } from "../model-meta.js";
import { AnthropicTextAdapter } from "../adapters/text.js";
import { AnthropicVertexAuthError, resolveAnthropicVertexOptions } from "./auth.js";
import { AnthropicVertex } from "@anthropic-ai/vertex-sdk";
//#region src/vertex/index.ts
/**
* Creates an Anthropic chat adapter that talks to Claude on Vertex AI.
*
* Install `@anthropic-ai/vertex-sdk` next to `@tanstack/ai-anthropic`.
*/
function anthropicVertexText(model, config) {
	const client = new AnthropicVertex(resolveAnthropicVertexOptions(config));
	return new AnthropicTextAdapter({
		client,
		provider: "google-vertex",
		reasoning: config?.reasoning
	}, model);
}
//#endregion
export { ANTHROPIC_VERTEX_CHAT_MODELS, AnthropicVertexAuthError, anthropicVertexText, resolveAnthropicVertexOptions };

//# sourceMappingURL=index.js.map