//#region src/static/index.ts
function staticSkills(catalog) {
	const byName = new Map(catalog.skills.map((s) => [s.name, s]));
	const get = (name) => {
		const s = byName.get(name);
		if (!s) throw new Error(`static catalog has no skill named "${name}"`);
		return s;
	};
	return {
		names: catalog.skills.map((s) => s.name),
		revision: () => Promise.resolve(catalog.revision),
		list: () => Promise.resolve(catalog.skills.map((s) => ({
			name: s.name,
			description: s.description,
			...s.compatibility && { compatibility: s.compatibility }
		}))),
		load: async (name) => get(name).body,
		listResources: async (name) => Object.keys(get(name).resources ?? {}),
		readResource: async (name, path) => {
			const value = get(name).resources?.[path];
			if (value === void 0) throw new Error(`skill "${name}" has no resource "${path}"`);
			return value;
		}
	};
}
//#endregion
export { staticSkills };

//# sourceMappingURL=index.js.map