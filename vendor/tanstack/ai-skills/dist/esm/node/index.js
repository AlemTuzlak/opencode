import { parseSkill, stripFrontmatter } from "../parse.js";
import { walkSkillDirs } from "../walk.js";
import { assertSafeResourcePath, stableHash } from "../util.js";
import { basename, join, relative, sep } from "node:path";
import { readFile, readdir, realpath, stat } from "node:fs/promises";
//#region src/node/index.ts
/**
* `skillDirectory` — a filesystem-backed {@link SkillSource}. Lives behind the
* `/node` subpath because it imports `node:fs`; the root export stays edge-safe
* (Workers, browsers), mirroring `@tanstack/ai-code-mode-snippets/storage`.
*/
var RESOURCE_DIRS = ["references", "assets"];
var SCRIPT_DIR = "scripts";
var nodeLister = async (dir) => {
	return (await readdir(dir, { withFileTypes: true })).map((e) => ({
		name: e.name,
		path: join(dir, e.name),
		type: e.isDirectory() ? "dir" : "file"
	}));
};
/** Recursively collect file paths under `dir`, relative to `root`. */
async function collectFiles(dir, root) {
	let ents;
	try {
		ents = await readdir(dir, { withFileTypes: true });
	} catch {
		return [];
	}
	const out = [];
	for (const e of ents) {
		const full = join(dir, e.name);
		if (e.isDirectory()) out.push(...await collectFiles(full, root));
		else out.push(relative(root, full).replace(/\\/g, "/"));
	}
	return out;
}
function posixRel(path) {
	return path.replace(/\\/g, "/");
}
function hasPrefix(rel, prefixes) {
	const n = posixRel(rel);
	return prefixes.some((p) => n === p || n.startsWith(`${p}/`));
}
async function resolveInside(dir, rel) {
	const full = join(dir, rel);
	const rootReal = await realpath(dir);
	const fullReal = await realpath(full);
	const prefix = rootReal.endsWith(sep) ? rootReal : rootReal + sep;
	if (fullReal !== rootReal && !fullReal.startsWith(prefix)) throw new Error(`unsafe resource path: "${rel}"`);
	return fullReal;
}
function skillDirectory(root, options = {}) {
	const roots = Array.isArray(root) ? root : [root];
	const { maxDepth, strict = true } = options;
	/** Fresh scan of every root → parsed skill name → skill directory. First wins. */
	const scan = async () => {
		const map = /* @__PURE__ */ new Map();
		for (const r of roots) {
			const dirs = await walkSkillDirs(nodeLister, r, { maxDepth });
			for (const d of dirs) {
				const raw = await readFile(join(d.dir, "SKILL.md"), "utf8").catch(() => void 0);
				if (raw === void 0) continue;
				try {
					const parsed = parseSkill(raw, {
						dirName: basename(d.dir),
						strict
					});
					if (!map.has(parsed.metadata.name)) map.set(parsed.metadata.name, d.dir);
				} catch {}
			}
		}
		return map;
	};
	const dirOf = async (name) => {
		const dir = (await scan()).get(name);
		if (!dir) throw new Error(`no skill named "${name}" under ${roots.join(", ")}`);
		return dir;
	};
	return {
		revision: async () => {
			const map = await scan();
			const parts = [];
			for (const [name, dir] of [...map].sort()) {
				const s = await stat(join(dir, "SKILL.md")).catch(() => void 0);
				parts.push(`${name}:${s?.mtimeMs ?? 0}:${s?.size ?? 0}`);
			}
			return stableHash(parts.join("|"));
		},
		list: async () => {
			const map = await scan();
			const out = [];
			for (const [, dir] of map) {
				const raw = await readFile(join(dir, "SKILL.md"), "utf8").catch(() => void 0);
				if (raw === void 0) continue;
				try {
					out.push(parseSkill(raw, {
						dirName: basename(dir),
						strict
					}).metadata);
				} catch {}
			}
			return out;
		},
		load: async (name) => readFile(join(await dirOf(name), "SKILL.md"), "utf8"),
		listResources: async (name) => {
			const dir = await dirOf(name);
			const files = [];
			for (const sub of RESOURCE_DIRS) files.push(...await collectFiles(join(dir, sub), dir));
			return files;
		},
		readResource: async (name, path) => {
			assertSafeResourcePath(path);
			if (!hasPrefix(path, RESOURCE_DIRS)) throw new Error(`resource path must be under references/ or assets/: "${path}"`);
			const fullReal = await resolveInside(await dirOf(name), path);
			if (hasPrefix(path, ["references"])) return readFile(fullReal, "utf8");
			return readFile(fullReal);
		},
		listScripts: async (name) => {
			const dir = await dirOf(name);
			return (await collectFiles(join(dir, SCRIPT_DIR), dir)).map((p) => ({
				path: p,
				executable: false,
				reason: "no-runtime"
			}));
		},
		readScript: async (name, path) => {
			assertSafeResourcePath(path);
			if (!hasPrefix(path, [SCRIPT_DIR])) throw new Error(`script path must be under scripts/: "${path}"`);
			const fullReal = await resolveInside(await dirOf(name), path);
			const bytes = await readFile(fullReal);
			return new Uint8Array(bytes);
		}
	};
}
/**
* Read a skill directory tree into a plain {@link GeneratedCatalog} — the shape
* `staticSkills` consumes. Used by the Vite plugin and directly available for
* custom build scripts.
*/
async function generateCatalog(root, options = {}) {
	const roots = Array.isArray(root) ? root : [root];
	const skills = [];
	const seen = /* @__PURE__ */ new Set();
	for (const r of roots) for (const { dir } of await walkSkillDirs(nodeLister, r, { maxDepth: options.maxDepth })) {
		const raw = await readFile(join(dir, "SKILL.md"), "utf8").catch(() => void 0);
		if (raw === void 0) continue;
		let meta;
		try {
			meta = parseSkill(raw, {
				dirName: basename(dir),
				strict: options.strict ?? true
			}).metadata;
		} catch {
			continue;
		}
		if (seen.has(meta.name)) continue;
		seen.add(meta.name);
		const resources = {};
		for (const sub of RESOURCE_DIRS) for (const rel of await collectFiles(join(dir, sub), dir)) resources[rel] = await readFile(join(dir, rel), "utf8").catch(() => "");
		skills.push({
			name: meta.name,
			description: meta.description,
			body: stripFrontmatter(raw),
			...meta.compatibility && { compatibility: meta.compatibility },
			...Object.keys(resources).length && { resources }
		});
	}
	skills.sort((a, b) => a.name < b.name ? -1 : a.name > b.name ? 1 : 0);
	return {
		revision: stableHash(skills.map((s) => `${s.name}:${stableHash(s.body)}`).join("|")),
		skills
	};
}
/**
* Vite plugin that globs `SKILL.md` under `dir` at build time and serves a
* virtual module (default id `virtual:tanstack-skills`) exporting the catalog
* `as const`. Consumers then wrap it with `staticSkills` for a literal-union of
* skill names. The catalog is embedded as JSON, so the bundle hash tracks it.
*/
function skillsCatalogPlugin(options = {}) {
	const virtualId = options.virtualId ?? "virtual:tanstack-skills";
	const resolved = `\0${virtualId}`;
	const dir = options.dir ?? "skills";
	return {
		name: "tanstack-skills-catalog",
		resolveId: (id) => id === virtualId ? resolved : void 0,
		async load(id) {
			if (id !== resolved) return void 0;
			const catalog = await generateCatalog(dir, { maxDepth: options.maxDepth });
			if (typeof this.addWatchFile === "function") for (const r of Array.isArray(dir) ? dir : [dir]) for (const d of await walkSkillDirs(nodeLister, r, { maxDepth: options.maxDepth })) this.addWatchFile(join(d.dir, "SKILL.md"));
			return `export const catalog = ${JSON.stringify(catalog)} as const\n`;
		}
	};
}
//#endregion
export { generateCatalog, skillDirectory, skillsCatalogPlugin };

//# sourceMappingURL=index.js.map