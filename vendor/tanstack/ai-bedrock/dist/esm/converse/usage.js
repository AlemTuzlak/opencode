import { buildBaseUsage } from "@tanstack/ai";
//#region src/converse/usage.ts
/**
* Build normalized `TokenUsage` from a Converse `usage` object.
*
* `promptTokens` is the total input. Converse `inputTokens` is only the
* uncached part, so the cache reads and cache writes are added to it. The two
* cache parts also go on `promptTokensDetails`, with `cacheWrite1hTokens` for
* the writes with a 1-hour TTL in `cacheDetails`. Zero is kept, unlike the
* Anthropic and OpenAI builders. Bedrock leaves the fields out when no
* checkpoint applied and sends 0 when one did (a served checkpoint writes 0),
* so absent and zero are different results.
*/
function buildConverseUsage(usage) {
	const cachedTokens = usage.cacheReadInputTokens;
	const cacheWriteTokens = usage.cacheWriteInputTokens;
	const cacheWrite1hTokens = usage.cacheDetails?.filter((detail) => detail.ttl === "1h").reduce((total, detail) => total + (detail.inputTokens ?? 0), 0);
	const promptTokens = (usage.inputTokens ?? 0) + (cachedTokens ?? 0) + (cacheWriteTokens ?? 0);
	const completionTokens = usage.outputTokens ?? 0;
	const result = buildBaseUsage({
		promptTokens,
		completionTokens,
		totalTokens: Math.max(usage.totalTokens ?? 0, promptTokens + completionTokens)
	});
	const promptTokensDetails = {
		...cachedTokens !== void 0 ? { cachedTokens } : {},
		...cacheWriteTokens !== void 0 ? { cacheWriteTokens } : {},
		...cacheWrite1hTokens ? { cacheWrite1hTokens } : {}
	};
	if (Object.keys(promptTokensDetails).length > 0) result.promptTokensDetails = promptTokensDetails;
	return result;
}
//#endregion
export { buildConverseUsage };

//# sourceMappingURL=usage.js.map