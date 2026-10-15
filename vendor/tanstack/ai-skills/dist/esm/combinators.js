import { stableHash } from "./util.js";
//#region src/combinators.ts
/**
* Source combinators (spec §3.3). Sources compose in practice: org skills +
* project skills + tenant skills. `aggregate` concatenates, `dedupe` resolves
* collisions, `filter` hides, `cache` memoizes.
*/
/** Forward a source's optional `revision`, preserving `undefined` when absent. */
function forwardRevision(source) {
	const rev = source.revision;
	return rev ? () => rev() : void 0;
}
/** Route a delegating method to the first source that lists `name`. */
async function ownerOf(sources, name) {
	for (const source of sources) if ((await source.list()).some((s) => s.name === name)) return source;
	throw new Error(`no source provides a skill named "${name}"`);
}
async function combinedRevision(sources) {
	const revs = await Promise.all(sources.map((s) => s.revision?.() ?? Promise.resolve(void 0)));
	if (revs.some((r) => r === void 0)) return void 0;
	return stableHash(revs.join("|"));
}
/** Concatenate sources in registration order. No dedupe. */
function aggregate(sources) {
	return {
		...sources.every((s) => s.revision) && { revision: async () => await combinedRevision(sources) ?? "" },
		list: async () => {
			return (await Promise.all(sources.map((s) => s.list()))).flat();
		},
		load: async (name) => (await ownerOf(sources, name)).load(name),
		listResources: async (name) => {
			return (await ownerOf(sources, name)).listResources?.(name) ?? [];
		},
		readResource: async (name, path) => {
			const owner = await ownerOf(sources, name);
			if (!owner.readResource) throw new Error(`skill "${name}" does not support resources`);
			return owner.readResource(name, path);
		},
		listScripts: async (name) => {
			return (await ownerOf(sources, name)).listScripts?.(name) ?? [];
		},
		readScript: async (name, path) => {
			const owner = await ownerOf(sources, name);
			if (!owner.readScript) throw new Error(`skill "${name}" does not support scripts`);
			return owner.readScript(name, path);
		}
	};
}
/** First occurrence of a name wins; warns on collision. */
function dedupe(source, onCollision = (name) => console.warn(`[ai-skills] duplicate skill "${name}" — first one wins`)) {
	return {
		...source,
		revision: forwardRevision(source),
		list: async () => {
			const seen = /* @__PURE__ */ new Set();
			const out = [];
			for (const skill of await source.list()) {
				if (seen.has(skill.name)) {
					onCollision(skill.name);
					continue;
				}
				seen.add(skill.name);
				out.push(skill);
			}
			return out;
		}
	};
}
/** Hide skills the predicate rejects. Filtered skills never reach the catalog. */
function filter(source, predicate, ctx) {
	const list = async () => (await source.list()).filter((s) => predicate(s, ctx));
	const assertVisible = async (name) => {
		if (!(await list()).some((s) => s.name === name)) throw new Error(`no skill named "${name}"`);
	};
	return {
		...source,
		revision: forwardRevision(source),
		list,
		load: async (name) => {
			await assertVisible(name);
			return source.load(name);
		},
		listResources: source.listResources ? async (name) => {
			await assertVisible(name);
			return source.listResources?.(name) ?? [];
		} : void 0,
		readResource: source.readResource ? async (name, path) => {
			await assertVisible(name);
			const read = source.readResource;
			if (!read) throw new Error(`skill "${name}" does not support resources`);
			return read(name, path);
		} : void 0,
		listScripts: source.listScripts ? async (name) => {
			await assertVisible(name);
			return source.listScripts?.(name) ?? [];
		} : void 0,
		readScript: source.readScript ? async (name, path) => {
			await assertVisible(name);
			const read = source.readScript;
			if (!read) throw new Error(`skill "${name}" does not support scripts`);
			return read(name, path);
		} : void 0
	};
}
/**
* Memoize `list()`/`load()`. Concurrent `list()` calls share one underlying
* fetch. `refreshInterval` (ms) expires the memo; omit for forever.
*
* Never auto-applied by the middleware — caching a tenant-scoped source in a
* shared bucket would replay one tenant's skills for another. Opt in explicitly.
*/
function cache(source, opts = {}) {
	let listPromise;
	let listAt = 0;
	const loads = /* @__PURE__ */ new Map();
	const now = () => opts.refreshInterval ? Date.now() : 0;
	const fresh = () => opts.refreshInterval === void 0 || now() - listAt < opts.refreshInterval;
	return {
		...source,
		revision: forwardRevision(source),
		list: () => {
			if (!listPromise || !fresh()) {
				listAt = now();
				loads.clear();
				listPromise = source.list().catch((err) => {
					listPromise = void 0;
					throw err;
				});
			}
			return listPromise;
		},
		load: (name) => {
			let p = loads.get(name);
			if (!p) {
				p = source.load(name).catch((err) => {
					loads.delete(name);
					throw err;
				});
				loads.set(name, p);
			}
			return p;
		}
	};
}
/**
* Combine the sources handed to the middleware. An array is deduped and
* aggregated; a single bare source is used as-is (never auto-wrapped).
*/
function combineSources(sources) {
	if (!Array.isArray(sources)) return sources;
	const [first] = sources;
	if (sources.length === 1 && first) return first;
	return dedupe(aggregate(sources));
}
//#endregion
export { aggregate, cache, combineSources, dedupe, filter };

//# sourceMappingURL=combinators.js.map