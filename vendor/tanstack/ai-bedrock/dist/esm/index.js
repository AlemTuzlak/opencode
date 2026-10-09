import { resolveBedrockAuth } from "./utils/auth.js";
import { withBedrockDefaults } from "./utils/client.js";
import { BedrockTextAdapter, createBedrockChat } from "./adapters/text.js";
import { BedrockResponsesTextAdapter, createBedrockResponsesText } from "./adapters/responses-text.js";
import { BedrockConverseTextAdapter, createBedrockConverse } from "./adapters/converse-text.js";
import { BEDROCK_CHAT_MODELS, BEDROCK_CONVERSE_MODELS, BEDROCK_EMBEDDING_MODELS, BEDROCK_RESPONSES_MODELS } from "./model-meta.js";
import { BedrockEmbeddingAdapter, bedrockEmbedding, createBedrockEmbedding } from "./adapters/embedding.js";
//#region src/index.ts
/**
* @module @tanstack/ai-bedrock
*
* Amazon Bedrock adapter for TanStack AI via Bedrock's OpenAI-compatible APIs
* and the native Converse API.  The public `bedrockText` / `createBedrockText`
* factory branches between the Converse adapter (DEFAULT), the Chat Completions
* adapter (`api: 'chat'`), and the Responses adapter (`api: 'responses'`).
*/
/** Cast-free runtime guard: is this model in the Responses-capable subset? */
function isResponsesModel(model) {
	return BEDROCK_RESPONSES_MODELS.some((m) => m === model);
}
/** Cast-free runtime guard: is this model in the Chat-capable subset? */
function isChatModel(model) {
	return BEDROCK_CHAT_MODELS.some((m) => m === model);
}
/** Cast-free runtime guard: is this model in the Converse-capable subset? */
function isConverseModel(model) {
	return BEDROCK_CONVERSE_MODELS.some((m) => m === model);
}
/** Strip the `api` discriminator from a config without an unused-var lint error. */
function stripApi(config) {
	const { api, ...rest } = config;
	return rest;
}
/**
* Shared branching used by both public factories. Constructs the adapter
* classes directly so their constructors run the full auth cascade lazily
* (config.apiKey → BEDROCK_API_KEY → AWS_BEARER_TOKEN_BEDROCK → SigV4). No
* eager env-key fetch here, so `auth: 'sigv4'` never throws for a missing key.
*
* Default path → Converse adapter; opt-in via `api: 'chat'` or `api: 'responses'`.
*/
function build(model, config) {
	if (config?.api === "responses") {
		const rest = stripApi(config);
		if (!isResponsesModel(model)) throw new Error(`Model "${model}" is not available on the Bedrock Responses API. Responses-capable models: ${BEDROCK_RESPONSES_MODELS.join(", ")}.`);
		return new BedrockResponsesTextAdapter(rest, model);
	}
	if (config?.api === "chat") {
		if (!isChatModel(model)) throw new Error(`Model "${model}" is not available on the Bedrock Chat Completions API. Chat-capable models: ${BEDROCK_CHAT_MODELS.join(", ")}.`);
		return new BedrockTextAdapter(stripApi(config), model);
	}
	if (!isConverseModel(model)) throw new Error(`Model "${model}" is not available on the Bedrock Converse API. Converse-capable models: ${BEDROCK_CONVERSE_MODELS.join(", ")}.`);
	return new BedrockConverseTextAdapter(config ? stripApi(config) : {}, model);
}
function createBedrockText(model, apiKey, config) {
	return build(model, {
		...config,
		apiKey
	});
}
function bedrockText(model, config) {
	return build(model, config);
}
//#endregion
export { BEDROCK_CHAT_MODELS, BEDROCK_CONVERSE_MODELS, BEDROCK_EMBEDDING_MODELS, BEDROCK_RESPONSES_MODELS, BedrockConverseTextAdapter, BedrockEmbeddingAdapter, BedrockResponsesTextAdapter, BedrockTextAdapter, bedrockEmbedding, bedrockText, createBedrockChat, createBedrockConverse, createBedrockEmbedding, createBedrockResponsesText, createBedrockText, resolveBedrockAuth, withBedrockDefaults };

//# sourceMappingURL=index.js.map