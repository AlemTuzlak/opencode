//#region src/walk.ts
var SKILL_FILE = "SKILL.md";
var MAX_SKILL_WALK_DEPTH = 6;
var SKIP_DIR_NAMES = /* @__PURE__ */ new Set([".git", "node_modules"]);
function basenameOf(path) {
	const segments = path.replace(/\\/g, "/").split("/").filter((segment) => segment !== "");
	return segments[segments.length - 1] ?? path;
}
/**
* Find every skill folder under `root`. A skill folder is a directory that
* directly contains `SKILL.md`; the walk stops descending once found. Skips
* dot-directories, `.git`, and `node_modules`. Bounded by `maxDepth`. Errors
* from `list` are swallowed (an unreadable directory yields nothing).
*
* Unlike `ai-sandbox`'s `discoverSkillDirs`, this returns `[]` when nothing is
* found — the "fall back to the clone dir" behavior is a harness-projection
* concern and stays at that call site (it is wrong for a catalog).
*/
async function walkSkillDirs(list, root, opts = {}) {
	const maxDepth = opts.maxDepth ?? 6;
	const found = [];
	await walk(list, root, found, 0, maxDepth);
	return found;
}
async function walk(list, dir, found, depth, maxDepth) {
	if (depth > maxDepth) return;
	let entries;
	try {
		entries = await list(dir);
	} catch {
		return;
	}
	if (entries.some((entry) => entry.type === "file" && entry.name.toLowerCase() === "SKILL.md".toLowerCase())) {
		found.push({
			name: basenameOf(dir),
			dir
		});
		return;
	}
	for (const entry of entries) {
		if (entry.type !== "dir") continue;
		if (entry.name.startsWith(".") || SKIP_DIR_NAMES.has(entry.name)) continue;
		await walk(list, entry.path, found, depth + 1, maxDepth);
	}
}
//#endregion
export { MAX_SKILL_WALK_DEPTH, SKILL_FILE, walkSkillDirs };

//# sourceMappingURL=walk.js.map