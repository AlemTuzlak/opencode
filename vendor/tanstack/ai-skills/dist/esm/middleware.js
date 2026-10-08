import { modelFamilyOf } from "./types.js";
import { combineSources } from "./combinators.js";
import { renderCatalog } from "./catalog.js";
import { createLoadSkillTool } from "./tools/load-skill.js";
import { READ_RESOURCE_TOOL_NAME } from "./tools/read-resource.js";
import { SkillLimitError, createCapability, defineChatMiddleware } from "@tanstack/ai";
//#region src/middleware.ts
/**
* `withSkills` — portable Agent Skills as a chat middleware.
*
* All source resolution and catalog rendering happen once in `setup`; `onConfig`
* (which fires every agent iteration) only returns memoized values. Otherwise an
* S3-backed source would hit the network per loop turn and catalog reordering
* would break Anthropic's cache prefix mid-run.
*/
/** CUSTOM stream-event name carrying the catalog to the browser DevTools. */
var SKILLS_STATE_EVENT = "skills:state";
var SkillsCapability = createCapability()("skills");
/** ~4 chars/token — good enough to guard a runaway catalog. */
var estimateTokens = (s) => Math.ceil(s.length / 4);
function fillTemplate(template, catalog) {
	const OPEN = "\0OPEN\0";
	const CLOSE = "\0CLOSE\0";
	return template.split("{{").join(OPEN).split("}}").join(CLOSE).split("{skills}").join(catalog).split(OPEN).join("{").split(CLOSE).join("}");
}
/** True when a code_execution/shell tool in `tools` carries hosted skills. */
function findNativeSkillTool(tools) {
	for (const tool of tools) {
		const meta = tool.metadata;
		if (tool.name === "code_execution" && (meta?.skills?.length ?? 0) > 0) return "code_execution";
		if (tool.name === "shell" && (meta?.environment?.skills?.length ?? 0) > 0) return "shell";
	}
}
function activationInstructions(catalog, hasResourceTool) {
	return [
		"You have access to a library of skills. When a task matches one, call the `load_skill` tool with its name to load its full instructions before proceeding.",
		catalog,
		hasResourceTool ? "To read a skill’s bundled resource files, call `read_skill_resource` with the skill name and the resource path." : "Some skills may list resource files; they are not loadable in this configuration."
	].join("\n\n");
}
function withSkills(sources, options = {}) {
	if (options.instructionTemplate && options.renderCatalog) throw new Error("`instructionTemplate` and `renderCatalog` are mutually exclusive");
	if (options.instructionTemplate && !options.instructionTemplate.includes("{skills}")) throw new Error("`instructionTemplate` must contain a `{skills}` placeholder");
	return defineChatMiddleware({
		name: "skills",
		provides: [SkillsCapability],
		async setup(ctx) {
			const source = combineSources(sources);
			let skills = await source.list();
			const family = modelFamilyOf(ctx.provider);
			const limit = options.maxCatalogTokens ?? 4e3;
			const render = options.renderCatalog ?? renderCatalog;
			let catalog = render(skills, family);
			if (estimateTokens(catalog) > limit) {
				if (options.onLimitExceeded && options.onLimitExceeded !== "error") {
					skills = options.onLimitExceeded(skills, limit);
					catalog = render(skills, family);
				}
				if (estimateTokens(catalog) > limit) throw new SkillLimitError({
					provider: family,
					path: "portable",
					limit: `maxCatalogTokens (${limit})`,
					allowed: limit,
					actual: estimateTokens(catalog),
					offending: skills.map((s) => s.name)
				});
			}
			ctx.provide(SkillsCapability, {
				skills,
				activated: /* @__PURE__ */ new Set(),
				source,
				family,
				catalog,
				options
			});
		},
		onConfig(ctx, config) {
			const rt = ctx.get(SkillsCapability);
			if (rt.skills.length === 0) return;
			const native = findNativeSkillTool(config.tools);
			if (native) throw new Error(`withSkills (portable skills) cannot be combined with a "${native}" tool that carries hosted/native skills. Use one delivery mode: remove the hosted skills, or drop withSkills.`);
			if (!rt.memo) {
				const hasResourceTool = config.tools.some((t) => t.name === READ_RESOURCE_TOOL_NAME);
				const body = options.instructionTemplate !== void 0 ? fillTemplate(options.instructionTemplate, rt.catalog) : activationInstructions(rt.catalog, hasResourceTool);
				const loadTool = createLoadSkillTool({
					source: rt.source,
					skills: rt.skills,
					activated: rt.activated,
					requireApproval: options.requireApproval
				});
				if ((options.catalogPlacement ?? "system") === "tool-description") {
					loadTool.description = `${loadTool.description}\n\n${body}`;
					rt.memo = {
						prompt: void 0,
						tools: [loadTool]
					};
				} else rt.memo = {
					prompt: { content: body },
					tools: [loadTool]
				};
			}
			const prompt = rt.memo.prompt;
			const promptPresent = !prompt || config.systemPrompts.some((p) => typeof p === "string" ? p === prompt.content : p.content === prompt.content);
			const existingNames = new Set(config.tools.map((t) => t.name));
			const toolsToAdd = rt.memo.tools.filter((t) => !existingNames.has(t.name));
			return {
				systemPrompts: prompt && !promptPresent ? [...config.systemPrompts, prompt] : config.systemPrompts,
				tools: toolsToAdd.length > 0 ? [...config.tools, ...toolsToAdd] : config.tools
			};
		},
		onChunk(ctx, chunk) {
			const rt = ctx.getOptional(SkillsCapability);
			if (!rt || rt.stateChunkEmitted) return;
			rt.stateChunkEmitted = true;
			return [chunk, {
				type: "CUSTOM",
				name: SKILLS_STATE_EVENT,
				value: {
					catalog: rt.skills.map((s) => ({
						name: s.name,
						description: s.description
					})),
					activated: [...rt.activated]
				},
				timestamp: Date.now()
			}];
		}
	});
}
//#endregion
export { SKILLS_STATE_EVENT, estimateTokens, withSkills };

//# sourceMappingURL=middleware.js.map