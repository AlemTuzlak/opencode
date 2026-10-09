import { walkSkillDirs } from "@tanstack/ai-skills";
//#region src/agents-file.ts
/**
* Universal AGENTS.md writer with per-CLI symlink projection, plus the
* canonical helper for locating cloned gitSkill repositories inside a sandbox.
*
* The known-names set below lists the canonical instruction-file names for
* each AI coding assistant CLI. Keep the list in one place so it is easy to
* extend. The copy fallback ensures correctness on platforms without symlink
* support (e.g. Windows).
*
* External per-CLI convention: each assistant looks for its own instruction
* file by name (CLAUDE.md for Claude Code, GEMINI.md for Gemini CLI, …).
* We write a single authoritative AGENTS.md and point each name at it.
*/
/** CLI instruction-file names that should resolve to AGENTS.md. */
var SYMLINK_NAMES = ["CLAUDE.md", "GEMINI.md"];
/**
* Resolve the directory a `gitSkill` repo is cloned into when no explicit
* `into` override is provided. The convention is:
*
*   `<root>/.tanstack-skills/<basename>`
*
* where `basename` is derived from the `repo` field by taking the last
* path segment and stripping a trailing `.git` suffix.
*
* Per-harness projectors (e.g. the Claude Code adapter) import this helper
* so they can locate cloned skill repos consistently.
*
* @param root  - Workspace root inside the sandbox (e.g. `/workspace`).
* @param skill - A `WorkspaceSkill` of `kind === 'git'`.
*/
function resolveGitSkillDir(root, skill) {
	const rawBasename = skill.repo.split("/").pop() ?? skill.repo;
	return `${root}/.tanstack-skills/${rawBasename.endsWith(".git") ? rawBasename.slice(0, -4) : rawBasename}`;
}
function basenameOf(path) {
	const segments = path.split("/").filter((segment) => segment !== "");
	return segments[segments.length - 1] ?? path;
}
/**
* Find every skill folder under a cloned `gitSkill` repo.
*
* A skill folder is a directory that contains `SKILL.md`. Nested packs
* (`skills/foo/SKILL.md`) are returned as `{ name: 'foo', dir: '…/skills/foo' }`.
* A flat clone with `SKILL.md` at the root is returned as one entry named
* after the clone. If no `SKILL.md` is found, the clone itself is returned
* so existing basename projection still works.
*
* The tree walk itself is the shared `walkSkillDirs` from `@tanstack/ai-skills`
* (parameterized over an injected lister — here `handle.fs.list`). The
* empty→clone-dir fallback is kept here because it is correct for harness
* projection but wrong for a skills catalog, so it must not live in the shared
* helper.
*/
async function discoverSkillDirs(handle, cloneDir) {
	const found = await walkSkillDirs((dir) => handle.fs.list(dir), cloneDir);
	if (found.length === 0) return [{
		name: basenameOf(cloneDir),
		dir: cloneDir
	}];
	return found;
}
/** Format workspace scripts as a `## Workspace scripts` markdown section. */
function formatWorkspaceScriptsSection(scripts) {
	const names = Object.keys(scripts).sort();
	if (names.length === 0) return "";
	return `## Workspace scripts\n\n${names.map((name) => `- ${name} → ${scripts[name]}`).join("\n")}`;
}
/**
* Merge base AGENTS.md content with an optional workspace scripts section.
* Returns `undefined` when there is nothing to write.
*/
function mergeAgentsContent(base, scripts) {
	const scriptsSection = scripts !== void 0 ? formatWorkspaceScriptsSection(scripts) : "";
	if (base === void 0 && scriptsSection.length === 0) return void 0;
	if (base === void 0) return scriptsSection;
	if (scriptsSection.length === 0) return base;
	return `${base.trimEnd()}\n\n${scriptsSection}`;
}
/** Escape a string for safe use as a single-quoted shell argument. */
function sqEscape(value) {
	return value.replace(/'/g, `'\\''`);
}
/**
* Write `AGENTS.md` under `root` and create per-CLI symlinks (or copies as a
* fallback when `ln -s` is unavailable).
*
* @param handle - The sandbox handle providing `fs` and `process`.
* @param root   - Absolute path inside the sandbox under which to write.
* @param content - Markdown content for the instruction file.
*/
async function writeAgentsFile(handle, root, content) {
	const agentsPath = `${root}/AGENTS.md`;
	await handle.fs.write(agentsPath, content);
	for (const name of SYMLINK_NAMES) {
		const lnCmd = `ln -s '${sqEscape("AGENTS.md")}' '${sqEscape(name)}'`;
		if ((await handle.process.exec(lnCmd, { cwd: root })).exitCode !== 0) await handle.fs.write(`${root}/${name}`, content);
	}
}
//#endregion
export { discoverSkillDirs, formatWorkspaceScriptsSection, mergeAgentsContent, resolveGitSkillDir, writeAgentsFile };

//# sourceMappingURL=agents-file.js.map