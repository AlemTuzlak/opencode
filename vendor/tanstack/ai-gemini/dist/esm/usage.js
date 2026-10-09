import { buildBaseUsage } from "@tanstack/ai";
//#region src/usage.ts
/**
* Flattens Gemini's ModalityTokenCount array into individual token fields.
* Extracts TEXT, IMAGE, AUDIO, VIDEO, DOCUMENT modality counts into a
* normalized structure.
*/
function flattenModalityTokenCounts(modalities) {
	if (!modalities || modalities.length === 0) return {};
	const result = {};
	for (const item of modalities) {
		if (!item.modality || item.tokenCount === void 0) continue;
		const modality = item.modality.toUpperCase();
		const count = item.tokenCount;
		switch (modality) {
			case "TEXT":
				result.textTokens = (result.textTokens ?? 0) + count;
				break;
			case "IMAGE":
				result.imageTokens = (result.imageTokens ?? 0) + count;
				break;
			case "AUDIO":
				result.audioTokens = (result.audioTokens ?? 0) + count;
				break;
			case "VIDEO":
				result.videoTokens = (result.videoTokens ?? 0) + count;
				break;
			case "DOCUMENT": result.documentTokens = (result.documentTokens ?? 0) + count;
		}
	}
	return result;
}
/**
* Checks if a FlattenedModalityTokens object has any values set.
*/
function hasModalityTokens(tokens) {
	return tokens.textTokens !== void 0 || tokens.imageTokens !== void 0 || tokens.audioTokens !== void 0 || tokens.videoTokens !== void 0 || tokens.documentTokens !== void 0;
}
/**
* Build normalized TokenUsage from Gemini's usageMetadata.
* Handles modality breakdowns and thinking tokens. Returns `undefined` when the
* provider reported no usage metadata, so callers omit the field rather than
* fabricating zeroed totals.
*/
function buildGeminiUsage(usageMetadata) {
	if (!usageMetadata) return void 0;
	const promptTokens = usageMetadata.promptTokenCount ?? 0;
	const completionTokens = usageMetadata.candidatesTokenCount ?? 0;
	const result = buildBaseUsage({
		promptTokens,
		completionTokens,
		totalTokens: usageMetadata.totalTokenCount ?? promptTokens + completionTokens
	});
	const promptModalities = flattenModalityTokenCounts(usageMetadata.promptTokensDetails);
	const cachedTokens = usageMetadata.cachedContentTokenCount;
	const promptTokensDetails = {
		...hasModalityTokens(promptModalities) ? promptModalities : {},
		...cachedTokens !== void 0 && cachedTokens > 0 ? { cachedTokens } : {}
	};
	const completionModalities = flattenModalityTokenCounts(usageMetadata.candidatesTokensDetails);
	const thoughtsTokens = usageMetadata.thoughtsTokenCount;
	const completionTokensDetails = {
		...hasModalityTokens(completionModalities) ? completionModalities : {},
		...thoughtsTokens !== void 0 && thoughtsTokens > 0 ? { reasoningTokens: thoughtsTokens } : {}
	};
	const providerDetails = {
		...usageMetadata.trafficType ? { trafficType: usageMetadata.trafficType } : {},
		...usageMetadata.toolUsePromptTokenCount !== void 0 && usageMetadata.toolUsePromptTokenCount > 0 ? { toolUsePromptTokenCount: usageMetadata.toolUsePromptTokenCount } : {},
		...usageMetadata.toolUsePromptTokensDetails && usageMetadata.toolUsePromptTokensDetails.length > 0 ? { toolUsePromptTokensDetails: usageMetadata.toolUsePromptTokensDetails.map((item) => ({
			modality: item.modality || "UNKNOWN",
			tokenCount: item.tokenCount ?? 0
		})) } : {},
		...usageMetadata.cacheTokensDetails && usageMetadata.cacheTokensDetails.length > 0 ? { cacheTokensDetails: usageMetadata.cacheTokensDetails.map((item) => ({
			modality: item.modality || "UNKNOWN",
			tokenCount: item.tokenCount ?? 0
		})) } : {}
	};
	if (Object.keys(promptTokensDetails).length > 0) result.promptTokensDetails = promptTokensDetails;
	if (Object.keys(providerDetails).length > 0) result.providerUsageDetails = providerDetails;
	if (Object.keys(completionTokensDetails).length > 0) result.completionTokensDetails = completionTokensDetails;
	return result;
}
//#endregion
export { buildGeminiUsage, flattenModalityTokenCounts, hasModalityTokens };

//# sourceMappingURL=usage.js.map