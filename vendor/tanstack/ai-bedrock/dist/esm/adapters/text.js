import { GENERATED_BEDROCK_MODELS } from "../model-catalog.generated.js";
import { withBedrockDefaults } from "../utils/client.js";
import { BEDROCK_MODEL_REASONING } from "../model-reasoning.js";
import OpenAI from "openai";
import { OpenAIBaseChatCompletionsTextAdapter } from "@tanstack/openai-base";
//#region src/adapters/text.ts
/**
* Bedrock Chat Completions adapter. Drives Bedrock's OpenAI-compatible
* `/chat/completions` endpoint via the OpenAI SDK with a baseURL override
* (same pattern as ai-groq). Tool conversion, streaming, structured output,
* and the agent loop come from the base.
*/
var BedrockTextAdapter = class extends OpenAIBaseChatCompletionsTextAdapter {
	kind = "text";
	name = "bedrock";
	provider;
	inputModalities = GENERATED_BEDROCK_MODELS.find((entry) => entry.id === this.model)?.input ?? ["text"];
	constructor(config, model) {
		const options = withBedrockDefaults(config, void 0, model);
		super(model, "bedrock", new OpenAI(options), {
			...config,
			fetch: options.fetch
		});
		this.provider = "amazon-bedrock";
	}
	modelReasoning(model) {
		return BEDROCK_MODEL_REASONING[model];
	}
	/**
	* Surface reasoning deltas (gpt-oss / Claude reasoning) the OpenAI-compatible
	* way. Base types the chunk as `unknown`; narrow with runtime guards — no
	* `as` casts, no `any`.
	*/
	extractReasoning(chunk) {
		return readDeltaReasoning(chunk);
	}
};
/** Cast-free narrowing of a Chat Completions chunk's reasoning delta. */
function readDeltaReasoning(chunk) {
	if (typeof chunk !== "object" || chunk === null || !("choices" in chunk)) return void 0;
	if (!Array.isArray(chunk.choices)) return void 0;
	const choice = chunk.choices[0];
	if (typeof choice !== "object" || choice === null || !("delta" in choice)) return void 0;
	const delta = choice.delta;
	if (typeof delta !== "object" || delta === null) return void 0;
	const raw = "reasoning" in delta && typeof delta.reasoning === "string" ? delta.reasoning : "reasoning_content" in delta && typeof delta.reasoning_content === "string" ? delta.reasoning_content : void 0;
	return raw && raw.length > 0 ? { text: raw } : void 0;
}
/** Chat adapter with an explicit API key (low-level; the public branching factory delegates here). */
function createBedrockChat(model, apiKey, config) {
	return new BedrockTextAdapter({
		...config,
		apiKey
	}, model);
}
//#endregion
export { BedrockTextAdapter, createBedrockChat };

//# sourceMappingURL=text.js.map