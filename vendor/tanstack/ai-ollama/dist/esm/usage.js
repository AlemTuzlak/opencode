import { buildBaseUsage } from "@tanstack/ai";
//#region src/usage.ts
/**
* Build normalized TokenUsage from Ollama's ChatResponse.
* Handles duration metrics as provider-specific details.
*/
function buildOllamaUsage(response) {
	const promptTokens = response.prompt_eval_count || 0;
	const completionTokens = response.eval_count || 0;
	const hasTokenCounts = promptTokens > 0 || completionTokens > 0;
	const result = buildBaseUsage({
		promptTokens,
		completionTokens,
		totalTokens: promptTokens + completionTokens
	});
	const providerDetails = {
		...response.load_duration ? { loadDuration: response.load_duration } : {},
		...response.prompt_eval_duration ? { promptEvalDuration: response.prompt_eval_duration } : {},
		...response.eval_duration ? { evalDuration: response.eval_duration } : {},
		...response.total_duration ? { totalDuration: response.total_duration } : {}
	};
	const hasProviderDetails = Object.keys(providerDetails).length > 0;
	if (hasProviderDetails) result.providerUsageDetails = providerDetails;
	if (!hasTokenCounts && !hasProviderDetails) return;
	return result;
}
//#endregion
export { buildOllamaUsage };

//# sourceMappingURL=usage.js.map