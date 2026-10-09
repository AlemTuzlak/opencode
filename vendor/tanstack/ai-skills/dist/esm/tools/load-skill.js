import { stripFrontmatter } from "../parse.js";
import { toolDefinition } from "@tanstack/ai";
import { z } from "zod";
//#region src/tools/load-skill.ts
/**
* `load_skill` — activates a skill by name and returns its (frontmatter-stripped)
* body plus a resource/script inventory. Result shape is frozen in phase 1;
* changing it later would churn every eval, snapshot, and devtools panel.
*/
var ALREADY_LOADED = "(already loaded earlier in this conversation — reuse the prior content)";
var scriptSchema = z.object({
	path: z.string(),
	executable: z.literal(false),
	reason: z.string().optional()
});
var resultSchema = z.object({
	skill: z.string(),
	content: z.string(),
	resources: z.array(z.string()),
	scripts: z.array(scriptSchema),
	compatibility: z.string().optional()
});
function createLoadSkillTool(deps) {
	const names = deps.skills.map((s) => s.name);
	const nameEnum = z.enum(names);
	const byName = new Map(deps.skills.map((s) => [s.name, s]));
	const handler = async ({ name }) => {
		if (deps.activated.has(name)) return {
			skill: name,
			content: ALREADY_LOADED,
			resources: [],
			scripts: []
		};
		const raw = await deps.source.load(name);
		const resources = await deps.source.listResources?.(name) ?? [];
		const scripts = await deps.source.listScripts?.(name) ?? [];
		deps.activated.add(name);
		const compatibility = byName.get(name)?.compatibility;
		return {
			skill: name,
			content: stripFrontmatter(raw),
			resources,
			scripts,
			...compatibility && { compatibility }
		};
	};
	const description = "Activate an available skill by name. Returns its full instructions plus a list of any bundled resources and scripts.";
	const inputSchema = z.object({ name: nameEnum });
	if (deps.requireApproval) return toolDefinition({
		name: "load_skill",
		description,
		inputSchema,
		outputSchema: resultSchema,
		needsApproval: true,
		approvalSchema: z.object({ approve: z.boolean() })
	}).server(handler);
	return toolDefinition({
		name: "load_skill",
		description,
		inputSchema,
		outputSchema: resultSchema
	}).server(handler);
}
//#endregion
export { ALREADY_LOADED, createLoadSkillTool };

//# sourceMappingURL=load-skill.js.map