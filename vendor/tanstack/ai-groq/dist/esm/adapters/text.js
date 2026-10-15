import { GROQ_MODEL_INPUT_MODALITIES } from "../model-meta.js";
import { GROQ_MODEL_REASONING } from "../model-reasoning.js";
import { getGroqApiKeyFromEnv, withGroqDefaults } from "../utils/client.js";
import { makeGroqStructuredOutputCompatibleWithMap } from "../utils/schema-converter.js";
import OpenAI from "openai";
import { OpenAIBaseChatCompletionsTextAdapter } from "@tanstack/openai-base";
//#region src/adapters/text.ts
/**
* Groq Text (Chat) Adapter
*
* Tree-shakeable adapter for Groq chat/text completion. Groq exposes an
* OpenAI-compatible Chat Completions endpoint at `/openai/v1`, so we drive
* it with the OpenAI SDK via a `baseURL` override (the same pattern as
* `ai-grok`).
*
* Quirk: when usage is present on a stream, Groq historically delivered it
* under `chunk.x_groq.usage` rather than `chunk.usage`. The override below
* promotes it to the standard location so the base's RUN_FINISHED usage
* accounting works unchanged.
*/
var GroqTextAdapter = class extends OpenAIBaseChatCompletionsTextAdapter {
	kind = "text";
	name = "groq";
	inputModalities = GROQ_MODEL_INPUT_MODALITIES[this.model];
	constructor(config, model) {
		super(model, "groq", new OpenAI(withGroqDefaults(config)), config);
	}
	modelReasoning(model) {
		return GROQ_MODEL_REASONING[model];
	}
	extractRejectedToolCall(rawEvent, fallbackMessage) {
		if (!isRecord(rawEvent) || rawEvent.code !== "tool_use_failed" || typeof rawEvent.failed_generation !== "string") return;
		let failedGeneration;
		try {
			failedGeneration = JSON.parse(rawEvent.failed_generation);
		} catch {
			return;
		}
		if (!isRecord(failedGeneration) || typeof failedGeneration.name !== "string" || failedGeneration.name.trim().length === 0) return;
		const rawArguments = failedGeneration.arguments;
		let argumentsJson;
		let input;
		if (typeof rawArguments === "string") {
			argumentsJson = rawArguments;
			try {
				const parsed = JSON.parse(rawArguments);
				if (isRecord(parsed)) input = parsed;
			} catch {}
		} else if (isRecord(rawArguments)) {
			argumentsJson = JSON.stringify(rawArguments);
			input = rawArguments;
		} else return;
		return {
			toolName: failedGeneration.name,
			arguments: argumentsJson,
			...input !== void 0 && { input },
			error: typeof rawEvent.message === "string" && rawEvent.message.length > 0 ? rawEvent.message : fallbackMessage
		};
	}
	makeStructuredOutputCompatibleWithMap(schema, originalRequired) {
		return makeGroqStructuredOutputCompatibleWithMap(schema, originalRequired);
	}
	async *processStreamChunks(stream, options, aguiState) {
		yield* super.processStreamChunks(promoteGroqUsage(stream), options, aguiState);
	}
	/**
	* Surfaces Groq's reasoning deltas during streaming structured output.
	* Groq emits `delta.reasoning` (or legacy `delta.reasoning_content`) on
	* reasoning models when the caller sets `reasoning_format: 'parsed'` in
	* modelOptions. The base's chatStream and structuredOutputStream both
	* route reasoning through this hook.
	*/
	extractReasoning(chunk) {
		const delta = chunk.choices[0]?.delta;
		const raw = delta?.reasoning ?? delta?.reasoning_content;
		if (typeof raw === "string" && raw.length > 0) return { text: raw };
	}
	/**
	* Groq's API rejects `response_format: json_schema` together with `tools`
	* + `stream` (returns 400 — see Groq Structured Outputs docs:
	* "Streaming and tool use are not currently supported with Structured
	* Outputs."). Force the engine onto the legacy finalization path even
	* though the OpenAI Chat Completions base would otherwise opt in.
	*/
	supportsCombinedToolsAndSchema() {
		return false;
	}
};
function isRecord(value) {
	return typeof value === "object" && value !== null && !Array.isArray(value);
}
/**
* Promotes Groq's non-standard `x_groq.usage` to the standard `chunk.usage`
* slot the base reads. Pass-through for chunks that already carry usage at
* the documented location.
*/
async function* promoteGroqUsage(stream) {
	for await (const chunk of stream) {
		const groqChunk = chunk;
		if (!chunk.usage && groqChunk.x_groq?.usage) yield {
			...chunk,
			usage: groqChunk.x_groq.usage
		};
		else yield chunk;
	}
}
/**
* Creates a Groq text adapter with explicit API key.
*
* @example
* ```typescript
* const adapter = createGroqText('llama-3.3-70b-versatile', "gsk_...");
* ```
*/
function createGroqText(model, apiKey, config) {
	return new GroqTextAdapter({
		apiKey,
		...config
	}, model);
}
/**
* Creates a Groq text adapter with API key from `GROQ_API_KEY`.
*
* @example
* ```typescript
* const adapter = groqText('llama-3.3-70b-versatile');
* ```
*/
function groqText(model, config) {
	return createGroqText(model, getGroqApiKeyFromEnv(), config);
}
//#endregion
export { GroqTextAdapter, createGroqText, groqText };

//# sourceMappingURL=text.js.map