import { buildBaseUsage } from "@tanstack/ai";
//#region src/usage.ts
/**
* Build normalized {@link TokenUsage} from an OpenAI-compatible Chat
* Completions `usage` object.
*
* Shared by every provider that routes through
* {@link OpenAIBaseChatCompletionsTextAdapter} (OpenAI Chat Completions, Grok,
* Groq). Surfaces cache read/write prompt tokens and reasoning/audio detail
* tokens when the provider reports them. Returns `undefined` when the provider reported no
* usage object, so callers omit the field rather than fabricating zeroed totals.
*/
function buildChatCompletionsUsage(usage) {
	if (!usage) return void 0;
	const result = buildBaseUsage({
		promptTokens: usage.prompt_tokens || 0,
		completionTokens: usage.completion_tokens || 0,
		totalTokens: usage.total_tokens || 0
	});
	const completionDetails = usage.completion_tokens_details;
	const completionTokensDetails = {
		...completionDetails?.reasoning_tokens ? { reasoningTokens: completionDetails.reasoning_tokens } : {},
		...completionDetails?.audio_tokens ? { audioTokens: completionDetails.audio_tokens } : {}
	};
	const promptDetails = usage.prompt_tokens_details;
	const cachedTokens = promptDetails?.cached_tokens || usage.cached_tokens;
	const promptTokensDetails = {
		...cachedTokens ? { cachedTokens } : {},
		...promptDetails?.cache_write_tokens ? { cacheWriteTokens: promptDetails.cache_write_tokens } : {},
		...promptDetails?.audio_tokens ? { audioTokens: promptDetails.audio_tokens } : {}
	};
	if (Object.keys(completionTokensDetails).length > 0) result.completionTokensDetails = completionTokensDetails;
	if (Object.keys(promptTokensDetails).length > 0) result.promptTokensDetails = promptTokensDetails;
	const providerUsageDetails = {
		...completionDetails?.accepted_prediction_tokens ? { acceptedPredictionTokens: completionDetails.accepted_prediction_tokens } : {},
		...completionDetails?.rejected_prediction_tokens ? { rejectedPredictionTokens: completionDetails.rejected_prediction_tokens } : {}
	};
	if (Object.keys(providerUsageDetails).length > 0) result.providerUsageDetails = providerUsageDetails;
	return result;
}
/**
* Build normalized {@link TokenUsage} from an OpenAI Responses API
* `ResponseUsage` object.
*
* Shared by every provider that routes through
* {@link OpenAIBaseResponsesTextAdapter}. Surfaces cached prompt tokens and
* reasoning detail tokens when present. Returns `undefined` when the provider
* reported no usage object, so callers omit the field rather than fabricating
* zeroed totals.
*/
function buildResponsesUsage(usage) {
	if (!usage) return void 0;
	const result = buildBaseUsage({
		promptTokens: usage.input_tokens || 0,
		completionTokens: usage.output_tokens || 0,
		totalTokens: usage.total_tokens || 0
	});
	const cachedTokens = usage.input_tokens_details?.cached_tokens;
	if (cachedTokens && cachedTokens > 0) result.promptTokensDetails = {
		...result.promptTokensDetails,
		cachedTokens
	};
	const reasoningTokens = usage.output_tokens_details?.reasoning_tokens;
	if (reasoningTokens && reasoningTokens > 0) result.completionTokensDetails = {
		...result.completionTokensDetails,
		reasoningTokens
	};
	return result;
}
/**
* Build normalized {@link TokenUsage} from an OpenAI Images API `usage` object.
*
* Shared by every provider that generates images through the OpenAI Images SDK
* (OpenAI, Grok). Token-billed image models (e.g. gpt-image-1) report an input
* breakdown of text vs image tokens, which is surfaced on `promptTokensDetails`.
* Models that don't return usage (e.g. DALL·E) yield `undefined` so callers can
* omit the field rather than emit zeroed totals.
*/
function buildImagesUsage(usage) {
	if (!usage) return void 0;
	const result = buildBaseUsage({
		promptTokens: usage.input_tokens || 0,
		completionTokens: usage.output_tokens || 0,
		totalTokens: usage.total_tokens || 0
	});
	const inputDetails = usage.input_tokens_details;
	const promptTokensDetails = {
		...inputDetails?.text_tokens ? { textTokens: inputDetails.text_tokens } : {},
		...inputDetails?.image_tokens ? { imageTokens: inputDetails.image_tokens } : {}
	};
	if (Object.keys(promptTokensDetails).length > 0) result.promptTokensDetails = promptTokensDetails;
	return result;
}
//#endregion
export { buildChatCompletionsUsage, buildImagesUsage, buildResponsesUsage };

//# sourceMappingURL=usage.js.map