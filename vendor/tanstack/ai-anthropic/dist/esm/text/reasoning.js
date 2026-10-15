import { reasoningBudget, resolveReasoning } from "@tanstack/ai/adapter-internals";
//#region src/text/reasoning.ts
var EFFORTS = [
	"low",
	"medium",
	"high",
	"xhigh",
	"max"
];
var isAnthropicEffort = (value) => typeof value === "string" && EFFORTS.includes(value);
/**
* Claude 4.6 takes the effort as the top-level `effort` field. Claude 4.7 and
* later take `output_config.effort`.
*/
var TOP_LEVEL_EFFORT = /* @__PURE__ */ new Set(["claude-opus-4-6", "claude-sonnet-4-6"]);
/**
* The Claude models with adaptive thinking: 4.6 and later (pi's list). An
* older model with effort levels, such as Opus 4.5, still thinks with a
* token budget.
*/
var ADAPTIVE_THINKING = /opus-4-[6-9]|sonnet-4-[6-9]|opus-5|sonnet-5|fable-5/;
/** pi's `mapThinkingLevelToEffort` for a level the map does not name. */
var defaultEffort = (level) => level === "minimal" || level === "low" ? "low" : level === "medium" ? "medium" : "high";
/**
* The thinking fields for `chat({ reasoning })`:
* - mid-conversation effort (`reasoning.midConversationEffort`, pi's
*   managed effort): always adaptive thinking with `block_binding` and a
*   fixed `output_config.effort: 'high'`. The level's effort is
*   `messageEffort` (`high` without a level).
* - `off`: thinking disabled. A model that cannot stop thinking never gets
*   here, because the clamp moves `off` to its lowest level.
* - budget thinking (`thinking.type: 'enabled'`, pi's table when the
*   request sets no `budgetTokens`) when `reasoning.adaptive` is `false`, or
*   for a budget model that sets `budgetTokens`. Without `adaptive`, also
*   for a budget model without a map or outside `ADAPTIVE_THINKING`.
* - otherwise adaptive thinking with the model's effort for the level, or
*   pi's default effort when the map has none. `summary` picks whether the
*   thinking text streams back.
*/
function anthropicThinking(model, request, reasoning) {
	const resolved = resolveReasoning(request, reasoning);
	if (reasoning && reasoning.midConversationEffort) return {
		thinking: {
			type: "adaptive",
			display: resolved?.summary === false ? "omitted" : "summarized",
			block_binding: { prefix_mismatch_behavior: "drop_block" }
		},
		output_config: { effort: "high" },
		messageEffort: resolved ? effortOf(resolved) : "high"
	};
	if (!resolved || !reasoning) return {};
	if (resolved.level === "off") return { thinking: { type: "disabled" } };
	if (!(reasoning.adaptive ?? (!reasoning.budget || reasoning.map !== void 0 && ADAPTIVE_THINKING.test(model))) || reasoning.budget && resolved.budgetTokens !== void 0) return { thinking: {
		type: "enabled",
		budget_tokens: reasoningBudget({
			level: resolved.level,
			summary: resolved.summary,
			...resolved.budgetTokens !== void 0 ? { budgetTokens: resolved.budgetTokens } : {}
		})
	} };
	const thinking = {
		type: "adaptive",
		display: resolved.summary ? "summarized" : "omitted"
	};
	const effort = effortOf(resolved);
	return TOP_LEVEL_EFFORT.has(model) ? {
		thinking,
		effort
	} : {
		thinking,
		output_config: { effort }
	};
}
/** The map's effort for the level, else pi's default effort. */
function effortOf(resolved) {
	return isAnthropicEffort(resolved.value) ? resolved.value : defaultEffort(resolved.level);
}
//#endregion
export { anthropicThinking, isAnthropicEffort };

//# sourceMappingURL=reasoning.js.map