//#region src/define.ts
var HARNESS_KIND = "tanstack-ai-harness";
/** True for a value made with `defineHarness`. */
function isHarnessDefinition(value) {
	return typeof value === "object" && value !== null && value.kind === HARNESS_KIND && value.version === 1;
}
/**
* Define a harness: a reusable, typed agent configuration. Use the same option
* names as `chat()`, plus `agents`, `plugins`, `busy`, `expose`, and `media`.
*
* @example
* ```ts
* const studio = defineHarness({
*   name: 'acme/studio',
*   adapter: anthropicText('claude-sonnet-4-5'),
*   agents: [heroImage],
*   subagents: { agents: [researcher] },
* })
* ```
*/
function defineHarness(config) {
	if (config.name.trim() === "") throw new Error("defineHarness requires a non-empty name");
	const byName = /* @__PURE__ */ new Map();
	for (const agent of [...config.agents ?? [], ...config.subagents?.agents ?? []]) {
		const existing = byName.get(agent.name);
		if (existing && existing !== agent) throw new Error(`defineHarness "${config.name}": two different agents are named "${agent.name}".`);
		byName.set(agent.name, agent);
	}
	for (const name of config.expose?.agents ?? []) if (!byName.has(name)) throw new Error(`defineHarness "${config.name}": expose.agents names "${name}", which is not a registered agent.`);
	return Object.freeze({
		...config,
		kind: HARNESS_KIND,
		version: 1
	});
}
//#endregion
export { defineHarness, isHarnessDefinition };

//# sourceMappingURL=define.js.map