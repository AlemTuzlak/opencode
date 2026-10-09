//#region src/internal/reasoning.ts
/**
* The OpenRouter `reasoning.effort` for a resolved `chat({ reasoning })`.
* `off` is always `none` on OpenRouter, whatever the model's own off value
* is (pi's rule). A model without effort values sends the level name.
*/
function openRouterEffort(resolved) {
	if (!resolved) return void 0;
	if (resolved.level === "off") return "none";
	return resolved.value ?? resolved.level;
}
//#endregion
export { openRouterEffort };

//# sourceMappingURL=reasoning.js.map