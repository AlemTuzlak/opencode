//#region src/utilities/ag-ui-usage.ts
function definedDetails(value) {
	return Object.keys(value).length > 0 ? value : void 0;
}
function withoutKey(value, key) {
	const next = { ...value };
	delete next[key];
	return next;
}
function isTanstackUsage(usage) {
	return typeof usage === "object" && usage != null && !Array.isArray(usage) && "promptTokens" in usage;
}
function toSpecTokenUsage(usage, options) {
	const { promptTokens, completionTokens, totalTokens, promptTokensDetails, completionTokensDetails, ...rest } = usage;
	const spec = {
		...options?.provider !== void 0 ? { provider: options.provider } : {},
		...options?.model !== void 0 ? { model: options.model } : {},
		inputTokens: promptTokens,
		outputTokens: completionTokens,
		totalTokens
	};
	const cachedInputTokens = promptTokensDetails?.cachedTokens;
	if (cachedInputTokens !== void 0) spec.cachedInputTokens = cachedInputTokens;
	if (promptTokensDetails?.cacheWriteTokens !== void 0) spec.cacheWriteInputTokens = promptTokensDetails.cacheWriteTokens;
	const reasoningTokens = completionTokensDetails?.reasoningTokens;
	if (reasoningTokens !== void 0) spec.reasoningTokens = reasoningTokens;
	const leftoverPrompt = promptTokensDetails ? definedDetails(withoutKey(promptTokensDetails, "cachedTokens")) : void 0;
	const leftoverCompletion = completionTokensDetails ? definedDetails(withoutKey(completionTokensDetails, "reasoningTokens")) : void 0;
	return {
		usage: [spec],
		leftover: definedDetails({
			...rest,
			...leftoverPrompt !== void 0 ? { promptTokensDetails: leftoverPrompt } : {},
			...leftoverCompletion !== void 0 ? { completionTokensDetails: leftoverCompletion } : {}
		})
	};
}
function sumNumbers(current, next) {
	if (!current) return next;
	if (!next) return current;
	const result = { ...current };
	for (const key of Object.keys(next)) {
		const value = next[key];
		if (typeof value !== "number") continue;
		const previous = current[key];
		result[key] = (typeof previous === "number" ? previous : 0) + value;
	}
	return result;
}
function sumOptional(current, next) {
	if (current === void 0) return next;
	if (next === void 0) return current;
	return current + next;
}
/**
* Add two usage totals, as for a parent run and its children. Numbers add
* up. `billed` adds up only in the same unit. `providerUsageDetails` is
* opaque, so the latest one stays. `@tanstack/ai-persistence` sums per-run
* usage with the same rules.
*/
function addTokenUsage(current, next) {
	const promptTokensDetails = sumNumbers(current.promptTokensDetails, next.promptTokensDetails);
	const completionTokensDetails = sumNumbers(current.completionTokensDetails, next.completionTokensDetails);
	const costDetails = sumNumbers(current.costDetails, next.costDetails);
	const cost = sumOptional(current.cost, next.cost);
	const durationSeconds = sumOptional(current.durationSeconds, next.durationSeconds);
	const unitsBilled = sumOptional(current.unitsBilled, next.unitsBilled);
	const billed = current.billed && next.billed && current.billed.unit === next.billed.unit ? {
		quantity: current.billed.quantity + next.billed.quantity,
		unit: current.billed.unit
	} : next.billed ?? current.billed;
	const providerUsageDetails = next.providerUsageDetails ?? current.providerUsageDetails;
	return {
		...current,
		...next,
		promptTokens: current.promptTokens + next.promptTokens,
		completionTokens: current.completionTokens + next.completionTokens,
		totalTokens: current.totalTokens + next.totalTokens,
		...promptTokensDetails && { promptTokensDetails },
		...completionTokensDetails && { completionTokensDetails },
		...cost !== void 0 && { cost },
		...costDetails && { costDetails },
		...durationSeconds !== void 0 && { durationSeconds },
		...unitsBilled !== void 0 && { unitsBilled },
		...billed && { billed },
		...providerUsageDetails && { providerUsageDetails }
	};
}
function rebuildTokenUsage(usage, leftover) {
	if (isTanstackUsage(usage)) return usage;
	if (Array.isArray(usage)) return fromSpecTokenUsage(usage, leftover);
	return fromSpecTokenUsage(void 0, leftover);
}
function fromSpecTokenUsage(usage, leftover) {
	const spec = usage?.reduce((total, entry) => {
		for (const key of [
			"inputTokens",
			"outputTokens",
			"totalTokens",
			"cachedInputTokens",
			"cacheWriteInputTokens",
			"reasoningTokens"
		]) if (entry[key] !== void 0) total[key] = (total[key] ?? 0) + entry[key];
		return total;
	}, {});
	if ((usage === void 0 || usage.length === 0) && leftover == null) return;
	const { promptTokensDetails: leftoverPromptDetails, completionTokensDetails: leftoverCompletionDetails, ...leftoverRest } = leftover ?? {};
	const promptTokensDetails = definedDetails({
		...spec?.cachedInputTokens !== void 0 ? { cachedTokens: spec.cachedInputTokens } : {},
		...spec?.cacheWriteInputTokens !== void 0 ? { cacheWriteTokens: spec.cacheWriteInputTokens } : {},
		...leftoverPromptDetails
	});
	const completionTokensDetails = definedDetails({
		...spec?.reasoningTokens !== void 0 ? { reasoningTokens: spec.reasoningTokens } : {},
		...leftoverCompletionDetails
	});
	return {
		promptTokens: spec?.inputTokens ?? 0,
		completionTokens: spec?.outputTokens ?? 0,
		totalTokens: spec?.totalTokens ?? 0,
		...leftoverRest,
		...promptTokensDetails !== void 0 ? { promptTokensDetails } : {},
		...completionTokensDetails !== void 0 ? { completionTokensDetails } : {}
	};
}
//#endregion
export { addTokenUsage, fromSpecTokenUsage, isTanstackUsage, rebuildTokenUsage, toSpecTokenUsage };

//# sourceMappingURL=ag-ui-usage.js.map