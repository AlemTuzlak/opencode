//#region src/usage.ts
var emptyCounts = () => ({
	calls: 0,
	promptTokens: 0,
	completionTokens: 0,
	totalTokens: 0,
	cachedTokens: 0,
	cacheWriteTokens: 0
});
var emptyUsage = () => ({
	total: emptyCounts(),
	byModel: {},
	bySender: {}
});
/** The counts that one call adds, from what the provider reported. */
function callUsage(usage) {
	return {
		promptTokens: usage.promptTokens,
		completionTokens: usage.completionTokens,
		totalTokens: usage.totalTokens,
		cachedTokens: usage.promptTokensDetails?.cachedTokens ?? 0,
		cacheWriteTokens: usage.promptTokensDetails?.cacheWriteTokens ?? 0,
		...typeof usage.cost === "number" ? { cost: usage.cost } : {}
	};
}
function add(counts, usage) {
	counts.calls += 1;
	counts.promptTokens += usage.promptTokens;
	counts.completionTokens += usage.completionTokens;
	counts.totalTokens += usage.totalTokens;
	counts.cachedTokens += usage.cachedTokens;
	counts.cacheWriteTokens += usage.cacheWriteTokens;
	if (usage.cost !== void 0) counts.cost = (counts.cost ?? 0) + usage.cost;
}
/** Add one call to `totals`, in place. */
function addUsage(totals, call) {
	add(totals.total, call.usage);
	add(totals.byModel[call.model] ??= emptyCounts(), call.usage);
	if (call.principal) add(totals.bySender[call.principal.id] ??= emptyCounts(), call.usage);
}
/** Is `value` usage totals that the harness wrote? */
function isSessionUsage(value) {
	return typeof value === "object" && value !== null && "total" in value && "byModel" in value && "bySender" in value;
}
//#endregion
export { addUsage, callUsage, emptyUsage, isSessionUsage };

//# sourceMappingURL=usage.js.map