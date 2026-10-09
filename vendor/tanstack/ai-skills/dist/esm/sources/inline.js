import { stableHash } from "../util.js";
import { validateSkill } from "../validate.js";
//#region src/sources/inline.ts
/**
* `inlineSkill` — an edge-safe {@link SkillSource} for a single skill defined
* next to app code, in a DB row, or per-session/per-tenant. Resource values may
* be thunks, evaluated at read time.
*/
function inlineSkill(config) {
	const metadata = {
		name: config.name,
		description: config.description,
		...config.compatibility && { compatibility: config.compatibility }
	};
	const lint = validateSkill(metadata);
	if (!lint.ok) throw new Error(`inlineSkill "${config.name}": ${lint.issues.map((i) => i.message).join("; ")}`);
	const resourcePaths = Object.keys(config.resources ?? {});
	const revision = stableHash(JSON.stringify({
		metadata,
		instructions: config.instructions,
		resources: resourcePaths
	}));
	const assertName = (name) => {
		if (name !== config.name) throw new Error(`inlineSkill has no skill named "${name}"`);
	};
	return {
		revision: () => Promise.resolve(revision),
		list: () => Promise.resolve([metadata]),
		load: async (name) => {
			assertName(name);
			return config.instructions;
		},
		listResources: async (name) => {
			assertName(name);
			return resourcePaths;
		},
		readResource: async (name, path) => {
			assertName(name);
			const value = config.resources?.[path];
			if (value === void 0) throw new Error(`skill "${name}" has no resource "${path}"`);
			return typeof value === "function" ? await value() : value;
		}
	};
}
//#endregion
export { inlineSkill };

//# sourceMappingURL=inline.js.map