//#region src/reasoning.ts
/** Every level, from least to most thinking. */
var REASONING_LEVELS = [
	"off",
	"minimal",
	"low",
	"medium",
	"high",
	"xhigh",
	"max"
];
/** A level or an object, as the user passed it, into the one shape adapters read. */
function normalizeReasoning(option) {
	if (option === void 0) return void 0;
	if (typeof option === "string") return {
		level: option,
		summary: true
	};
	return {
		level: option.level,
		summary: option.summary ?? true,
		...option.budgetTokens !== void 0 ? { budgetTokens: option.budgetTokens } : {}
	};
}
/**
* The levels a model supports, with pi's rules:
* - a model that does not reason supports only `off`
* - a level whose map value is `null` is not supported
* - `xhigh` and `max` are supported only when the map has a value for them
* - every other level is supported
*
* `undefined` (a model with no data) counts as a reasoning model with no map.
*/
function supportedReasoningLevels(reasoning) {
	if (reasoning === false) return ["off"];
	const map = reasoning?.map;
	return REASONING_LEVELS.filter((level) => {
		const mapped = map?.[level];
		if (mapped === null) return false;
		if (level === "xhigh" || level === "max") return mapped !== void 0;
		return true;
	});
}
/**
* A level the model supports: the level itself, else the nearest supported
* level above it, else the nearest below it, else `off`. The same rule as pi.
*/
function clampReasoningLevel(reasoning, level) {
	const supported = supportedReasoningLevels(reasoning);
	if (supported.includes(level)) return level;
	const index = REASONING_LEVELS.indexOf(level);
	const above = REASONING_LEVELS.slice(index + 1).find((candidate) => supported.includes(candidate));
	if (above) return above;
	return REASONING_LEVELS.slice(0, index).reverse().find((candidate) => supported.includes(candidate)) ?? supported[0] ?? "off";
}
/**
* The provider value for a supported `level`: the map value, else the level's
* own name. `null` means "send nothing" (only `off` can map to `null` here,
* because a `null` on any other level makes it unsupported).
*/
function reasoningValue(reasoning, level) {
	const mapped = reasoning === false ? void 0 : reasoning?.map?.[level];
	return mapped === void 0 ? level : mapped;
}
/**
* pi's thinking budgets for budget-based models. `xhigh` and `max` get the
* `high` budget: budget-based models have no higher level.
*/
var DEFAULT_REASONING_BUDGETS = {
	minimal: 1024,
	low: 2048,
	medium: 8192,
	high: 16384,
	xhigh: 16384,
	max: 16384
};
/** The thinking budget for a request: `budgetTokens`, else pi's table. `0` for `off`. */
function reasoningBudget(request) {
	if (request.budgetTokens !== void 0) return request.budgetTokens;
	return request.level === "off" ? 0 : DEFAULT_REASONING_BUDGETS[request.level];
}
/**
* Resolve `request` for a model: clamp the level to the model's levels, and
* look up its provider value. `undefined` when there is nothing to send: no
* request, or a model that does not reason or has no reasoning data.
*/
function resolveReasoning(request, reasoning) {
	if (!request || !reasoning) return void 0;
	const level = clampReasoningLevel(reasoning, request.level);
	return {
		level,
		value: reasoningValue(reasoning, level),
		summary: request.summary,
		...request.budgetTokens !== void 0 ? { budgetTokens: request.budgetTokens } : {}
	};
}
//#endregion
export { DEFAULT_REASONING_BUDGETS, REASONING_LEVELS, clampReasoningLevel, normalizeReasoning, reasoningBudget, reasoningValue, resolveReasoning, supportedReasoningLevels };

//# sourceMappingURL=reasoning.js.map