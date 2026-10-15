import { buildBaseUsage } from "@tanstack/ai";
//#region src/usage.ts
/**
* Build normalized TokenUsage from Anthropic's usage object.
*
* `promptTokens` is the total input: uncached + cache read + cache write.
* Anthropic's `input_tokens` counts only the uncached part, so this function
* adds the cache parts. The cache parts are also in `promptTokensDetails`:
* `cachedTokens` (read), `cacheWriteTokens` (write), and `cacheWrite1hTokens`
* (the 1-hour part of the write). `totalTokens` is
* `promptTokens + completionTokens`.
*
* Also handles server tool use metrics. Returns `undefined` when the provider
* reported no usage object, so callers omit the field rather than fabricating
* zeroed totals.
*/
function buildAnthropicUsage(usage, start) {
	if (!usage) return void 0;
	const inputTokens = usage.input_tokens ?? start?.input_tokens ?? 0;
	const outputTokens = usage.output_tokens || 0;
	const cacheWrite = usage.cache_creation_input_tokens ?? start?.cache_creation_input_tokens ?? 0;
	const cacheRead = usage.cache_read_input_tokens ?? start?.cache_read_input_tokens ?? 0;
	const cacheWrite1h = (("cache_creation" in usage ? usage.cache_creation : null) ?? start?.cache_creation)?.ephemeral_1h_input_tokens ?? 0;
	const promptTokens = inputTokens + cacheRead + cacheWrite;
	const result = buildBaseUsage({
		promptTokens,
		completionTokens: outputTokens,
		totalTokens: promptTokens + outputTokens
	});
	const promptTokensDetails = {
		...cacheWrite ? { cacheWriteTokens: cacheWrite } : {},
		...cacheWrite1h ? { cacheWrite1hTokens: cacheWrite1h } : {},
		...cacheRead ? { cachedTokens: cacheRead } : {}
	};
	if (Object.keys(promptTokensDetails).length > 0) result.promptTokensDetails = promptTokensDetails;
	const serverToolUse = usage.server_tool_use ?? start?.server_tool_use;
	const serverToolUseDetails = {
		...serverToolUse?.web_search_requests ? { webSearchRequests: serverToolUse.web_search_requests } : {},
		...serverToolUse?.web_fetch_requests ? { webFetchRequests: serverToolUse.web_fetch_requests } : {}
	};
	if (Object.keys(serverToolUseDetails).length > 0) result.providerUsageDetails = { serverToolUse: serverToolUseDetails };
	return result;
}
//#endregion
export { buildAnthropicUsage };

//# sourceMappingURL=usage.js.map