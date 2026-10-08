import { GENERATED_BEDROCK_MODELS } from "../model-catalog.generated.js";
import { withBedrockDefaults } from "../utils/client.js";
import { BEDROCK_MODEL_REASONING } from "../model-reasoning.js";
import OpenAI from "openai";
import { OpenAIBaseResponsesTextAdapter } from "@tanstack/openai-base";
//#region src/adapters/responses-text.ts
/**
* Bedrock Responses adapter. Drives mantle's OpenAI-compatible `/responses`
* endpoint via the OpenAI SDK (`client.responses.create`) — the same base
* class ai-openai's `openaiText` uses. Responses is mantle-only, so the
* constructor forces the mantle baseURL.
*/
var BedrockResponsesTextAdapter = class extends OpenAIBaseResponsesTextAdapter {
	kind = "text";
	name = "bedrock-responses";
	provider;
	inputModalities = GENERATED_BEDROCK_MODELS.find((entry) => entry.id === this.model)?.input ?? ["text"];
	constructor(config, model) {
		const options = withBedrockDefaults(config, "mantle", model);
		super(model, "bedrock-responses", new OpenAI(options), {
			...config,
			fetch: options.fetch
		});
		this.provider = "amazon-bedrock";
	}
	modelReasoning(model) {
		return BEDROCK_MODEL_REASONING[model];
	}
};
/** Responses adapter with an explicit API key (low-level; the public branching factory delegates here). */
function createBedrockResponsesText(model, apiKey, config) {
	return new BedrockResponsesTextAdapter({
		...config,
		apiKey
	}, model);
}
//#endregion
export { BedrockResponsesTextAdapter, createBedrockResponsesText };

//# sourceMappingURL=responses-text.js.map