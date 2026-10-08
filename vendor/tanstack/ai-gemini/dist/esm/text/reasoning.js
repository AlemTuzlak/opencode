import { resolveReasoning } from "@tanstack/ai/adapter-internals";
//#region src/text/reasoning.ts
/**
* pi's thinking budgets for the Gemini 2.5 models. `-1` asks Gemini for a
* dynamic budget.
*/
function budgetFor(model, level) {
	const high = model.includes("2.5-pro") ? 32768 : model.includes("2.5-flash") ? 24576 : void 0;
	if (high === void 0) return -1;
	return {
		minimal: model.includes("2.5-flash-lite") ? 512 : 128,
		low: 2048,
		medium: 8192,
		high
	}[level] ?? high;
}
/**
* The `thinkingConfig` for `chat({ reasoning })`:
* - `off`: a zero thinking budget. A model that cannot stop thinking never
*   gets here, because the clamp moves `off` to its lowest level.
* - a model with effort levels (Gemini 3): `thinkingLevel`.
* - a budget model (Gemini 2.5): `thinkingBudget`, from `budgetTokens` or
*   pi's table.
* `summary` turns `includeThoughts` on.
*/
function geminiThinkingConfig(model, request, reasoning) {
	const resolved = resolveReasoning(request, reasoning);
	if (!resolved || !reasoning) return void 0;
	if (resolved.level === "off") return { thinkingBudget: 0 };
	const includeThoughts = resolved.summary;
	if (!reasoning.budget && resolved.value !== null) return {
		includeThoughts,
		thinkingLevel: resolved.value.toUpperCase()
	};
	return {
		includeThoughts,
		thinkingBudget: resolved.budgetTokens ?? budgetFor(model, resolved.level)
	};
}
/** The Interactions API thinking fields for `chat({ reasoning })`. */
function interactionsThinking(request, reasoning) {
	const resolved = resolveReasoning(request, reasoning);
	if (!resolved || resolved.level === "off") return {};
	return {
		thinking_level: resolved.value ?? resolved.level,
		thinking_summaries: resolved.summary ? "auto" : "none"
	};
}
//#endregion
export { geminiThinkingConfig, interactionsThinking };

//# sourceMappingURL=reasoning.js.map