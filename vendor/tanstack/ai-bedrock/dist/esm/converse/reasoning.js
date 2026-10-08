import { reasoningBudget, resolveReasoning } from "@tanstack/ai/adapter-internals";
//#region src/converse/reasoning.ts
/** The answer room pi keeps next to a thinking budget. */
var MIN_ANSWER_TOKENS = 1024;
/**
* The Converse thinking fields for `chat({ reasoning })`. Only Claude takes
* them on Converse (pi's rule):
* - a budget model: enabled thinking with the budget (pi's table when the
*   request sets none), and the interleaved-thinking beta.
* - a model with effort levels: adaptive thinking with the effort.
* `off` sends nothing, because Claude does not think unless asked.
*/
function converseThinking(model, request, reasoning) {
	if (!model.includes("anthropic.claude")) return {};
	const resolved = resolveReasoning(request, reasoning);
	if (!resolved || !reasoning || resolved.level === "off") return {};
	if (reasoning.budget) {
		const budget = reasoningBudget({
			level: resolved.level,
			summary: resolved.summary,
			...resolved.budgetTokens !== void 0 ? { budgetTokens: resolved.budgetTokens } : {}
		});
		return {
			additionalModelRequestFields: {
				thinking: {
					type: "enabled",
					budget_tokens: budget
				},
				anthropic_beta: ["interleaved-thinking-2025-05-14"]
			},
			minMaxTokens: budget + MIN_ANSWER_TOKENS
		};
	}
	if (resolved.value === null) return {};
	return { additionalModelRequestFields: {
		thinking: { type: "adaptive" },
		output_config: { effort: resolved.value }
	} };
}
//#endregion
export { converseThinking };

//# sourceMappingURL=reasoning.js.map