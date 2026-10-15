import { globToRegExp } from "../glob.js";
import { clip, hostBackend, optionalString, pathsOf, readText, stringArg } from "./backend.js";
import { toolDefinition } from "@tanstack/ai";
//#region src/first-party/coding/search.ts
/** Folders that no search looks in. */
var SKIP = /* @__PURE__ */ new Set([".git", "node_modules"]);
/** The time limit of each search command. */
var TIMEOUT_MS = 3e4;
var MAX_FILES = 1e3;
var MAX_MATCHES = 200;
/** A matching line is cut after this many characters. */
var MAX_LINE = 2e3;
/** grep skips bigger files, the same as `rg --max-filesize 1M`. */
var MAX_SIZE = 1048576;
var MAX_WALK = 5e3;
var FILES_NOTE = "[Not all files are shown. Use a pattern or a folder to see fewer.]";
var MATCHES_NOTE = "[Not all matches are shown. Use a narrower pattern, glob, or folder.]";
/** `git` applies the `.gitignore` files. `-z` ends each path with NUL. */
var GIT_FILES = "git ls-files -z --cached --others --exclude-standard";
/** rg flags for grep. One match more than shown tells that there are more. */
var RG_GREP = `--line-number --no-heading --color never --max-columns ${MAX_LINE} --max-columns-preview --max-filesize 1M --max-count 201`;
/** Characters that `cmd.exe` reads as special. */
var CMD_SPECIAL = /[()\][%!^"`<>&|;, *?]/g;
/**
* `value` as one argument of a shell command. The shell gives the value to
* the program as it is. `platform` is the platform of the shell.
*
* - POSIX `sh`: the value goes in single quotes. No character is special
*   in them. A single quote in the value becomes `'\''`.
* - Windows `cmd.exe`: first the value is quoted for the program: a `"`
*   gets a backslash, and the backslashes before a `"` are doubled. Then a
*   `^` goes before each character that `cmd.exe` reads as special, the
*   quotes too. So `cmd.exe` expands no `%VAR%` and runs no `&` or `|`.
*   This needs delayed expansion off, which is the default. A line break
*   cannot be passed safely, so it throws.
*
* @example
* ```ts
* quoteArg(`it's`, 'linux') // 'it'\''s'
* quoteArg('a & b', 'win32') // ^"a^ ^&^ b^"
* ```
*/
function quoteArg(value, platform) {
	if (platform !== "win32") return `'${value.replaceAll("'", `'\\''`)}'`;
	if (/[\r\n]/.test(value)) throw new Error("cmd.exe cannot take an argument with a line break.");
	return `"${value.replace(/(\\*)"/g, "$1$1\\\"").replace(/(\\*)$/, "$1$1")}"`.replace(CMD_SPECIAL, "^$&");
}
/**
* The platform of the shell that `backend.exec` uses, for {@link quoteArg}.
* A backend without `shell` has a POSIX `sh`, like a Linux sandbox.
*/
function shellPlatform(backend) {
	return backend.shell === "cmd" ? "win32" : "linux";
}
/** The rg binary of `@vscode/ripgrep`, when that optional peer is there. */
async function bundledRg() {
	try {
		const { rgPath } = await import("@vscode/ripgrep");
		return (await hostBackend.stat(rgPath))?.type === "file" ? rgPath : void 0;
	} catch {
		return;
	}
}
/** The command that starts rg on `backend`, or `undefined` without rg. */
async function findRg(backend) {
	if (backend === hostBackend) {
		const bundled = await bundledRg();
		if (bundled !== void 0) return quoteArg(bundled, process.platform);
	}
	return (await backend.exec("rg --version", { timeoutMs: TIMEOUT_MS })).exitCode === 0 ? "rg" : void 0;
}
/** Run an rg command in `cwd`, and give its output. */
async function runRg(backend, command, cwd) {
	const { exitCode, stdout, stderr } = await backend.exec(command, {
		cwd,
		timeoutMs: TIMEOUT_MS
	});
	if (exitCode === 0 || exitCode === 1 || exitCode === 2 && stdout !== "") return stdout;
	const reason = exitCode === 124 ? `it took longer than ${TIMEOUT_MS / 1e3} seconds, or gave too much output` : stderr.trim() || `exit code ${exitCode}`;
	throw new Error(`The search failed: ${reason}`);
}
/** `path` without the `./` that rg puts first. */
var fromDot = (path) => path.replace(/^\.\//, "");
/** Is `path` in a folder that no search looks in? */
var isSkipped = (path) => path.split("/").some((part) => SKIP.has(part));
/** The paths without empty ones, skipped ones, or repeats, sorted. */
function tidy(paths) {
	const kept = paths.map(fromDot).filter((path) => path !== "" && !isSkipped(path));
	return [...new Set(kept)].sort();
}
/** Sort by path only, so the lines of one file stay in order. */
var byPath = (a, b) => Number(a.path > b.path) - Number(a.path < b.path);
/** A test for the paths that match `glob`. Without a glob, all match. */
function globMatcher(glob) {
	const regex = glob ? globToRegExp(glob) : void 0;
	return (path) => !regex || regex.test(path);
}
/** The hits in rg output. Each line is the path, NUL, `line:text`. */
function rgHits(out) {
	const rows = out.split("\n");
	const hits = [];
	for (const row of rows) {
		const nul = row.indexOf("\0");
		const colon = row.indexOf(":", nul);
		if (nul === -1 || colon === -1) continue;
		hits.push({
			path: fromDot(row.slice(0, nul)),
			line: Number(row.slice(nul + 1, colon)),
			text: row.slice(colon + 1)
		});
	}
	return hits;
}
/**
* Add the files under `dir` to `out`, as paths that start with `prefix`.
* Stops after MAX_WALK files. It skips links, so it never leaves `dir`.
*/
async function walk(backend, dir, prefix, out) {
	const entries = await backend.readdir(dir);
	for (const entry of entries) {
		if (out.length > MAX_WALK) return;
		if (SKIP.has(entry.name) || entry.type === "link") continue;
		const path = prefix + entry.name;
		if (entry.type === "dir") await walk(backend, pathsOf(backend).join(dir, entry.name), `${path}/`, out);
		else out.push(path);
	}
}
/**
* `files`, paths from `base` with `/`, without the links and the files in a
* linked folder. git lists links, and git for Windows lists the files in a
* junction. Each folder is read once. A name is compared without letter
* case, so a case-insensitive file system cannot hide a link.
*/
async function withoutLinks(backend, base, files) {
	const linksIn = /* @__PURE__ */ new Map();
	/** The links in `folder`, from `base`. `undefined` when it cannot be read. */
	const linksOf = (folder) => {
		let links = linksIn.get(folder);
		if (links === void 0) {
			links = backend.readdir(pathsOf(backend).resolve(base, folder)).then((entries) => new Set(entries.filter((entry) => entry.type === "link").map((entry) => entry.name.toLowerCase())), () => void 0);
			linksIn.set(folder, links);
		}
		return links;
	};
	const kept = [];
	for (const file of files) {
		const parts = file.split("/");
		let folder = ".";
		let isLinked = false;
		for (const part of parts) {
			const links = await linksOf(folder);
			if (links === void 0 || links.has(part.toLowerCase())) {
				isLinked = true;
				break;
			}
			folder = `${folder}/${part}`;
		}
		if (!isLinked) kept.push(file);
	}
	return kept;
}
/** grep in JS: read each file through the backend and test each line. */
async function grepFiles(backend, base, files, regex) {
	const hits = [];
	for (const path of files) {
		const full = pathsOf(backend).resolve(base, path);
		const info = await backend.stat(full);
		if (info?.type !== "file" || info.size > MAX_SIZE) continue;
		const text = await readText(backend, full);
		if (text.includes("\0")) continue;
		const lines = text.split("\n");
		for (const [index, line] of lines.entries()) {
			if (!regex.test(line)) continue;
			hits.push({
				path,
				line: index + 1,
				text: line
			});
			if (hits.length > MAX_MATCHES) return hits;
		}
	}
	return hits;
}
/**
* `list_files` and `grep`. Both use the first engine that works:
*
* 1. The rg binary of `@vscode/ripgrep`, only with `hostBackend`.
* 2. `rg` on the PATH of the backend.
* 3. `git ls-files`, when the folder is in a git work tree.
* 4. A walk through `backend.readdir`.
*
* rg and git skip the files that `.gitignore` names. No engine looks in
* `.git` or `node_modules`, or gives links: rg does not follow them, and
* the git list and the walk leave them out. The results have the same
* shape whichever engine ran.
*
* With `permissions()`, grep skips the files that the rules protect (see
* `ToolEnv.protectedIn`), and a note says how many. `list_files` shows
* them: a name is not the contents.
*/
function searchTools(env) {
	const { backend } = env;
	const { resolve } = pathsOf(backend);
	const platform = shellPlatform(backend);
	const rgCommon = ["--no-config --hidden --null --path-separator /", ...[...SKIP].map((dir) => `--glob ${quoteArg(`!${dir}`, platform)}`)].join(" ");
	let rg;
	/** The rg command. The first search finds it, and the tools keep it. */
	const findRgOnce = () => rg ??= findRg(backend);
	/** Every file under `base`, sorted, as paths from `base` with `/`. */
	async function filesUnder(base) {
		const command = await findRgOnce();
		if (command !== void 0) return {
			files: tidy((await runRg(backend, `${command} --files ${rgCommon} .`, base)).split("\0")),
			partial: false
		};
		const git = await backend.exec(GIT_FILES, {
			cwd: base,
			timeoutMs: TIMEOUT_MS
		});
		if (git.exitCode === 0) {
			const listed = tidy(git.stdout.split("\0"));
			return {
				files: await withoutLinks(backend, base, listed),
				partial: false
			};
		}
		const walked = [];
		await walk(backend, base, "", walked);
		return {
			files: tidy(walked),
			partial: walked.length > MAX_WALK
		};
	}
	/**
	* The hits for `pattern` under `base`, in the files that `isWanted` keeps.
	* `listed` is the result of `filesUnder(base)`, when the caller has it.
	*/
	async function grepUnder(base, pattern, isWanted, listed) {
		const regex = new RegExp(pattern);
		const command = await findRgOnce();
		if (command === void 0) {
			const { files, partial } = listed ?? await filesUnder(base);
			return {
				hits: await grepFiles(backend, base, files.filter(isWanted), regex),
				partial
			};
		}
		return {
			hits: rgHits(await runRg(backend, `${command} ${RG_GREP} ${rgCommon} -e ${quoteArg(pattern, platform)} .`, base)).filter((hit) => isWanted(hit.path)).sort(byPath),
			partial: false
		};
	}
	return [toolDefinition({
		name: "list_files",
		description: "List files in a folder (default: the workspace), optionally matching a glob like `src/**/*.ts`. The glob is from that folder. Files that .gitignore names are left out.",
		inputSchema: {
			type: "object",
			properties: {
				pattern: { type: "string" },
				path: {
					type: "string",
					description: "The folder. Default: the workspace"
				}
			}
		},
		replay: "safe"
	}).server(async (args) => {
		const base = await env.reach(optionalString(args, "path") ?? ".", "list_files", "folder");
		const isWanted = globMatcher(optionalString(args, "pattern"));
		const { files, partial } = await filesUnder(base);
		const listed = files.filter(isWanted);
		const text = listed.slice(0, MAX_FILES).map((file) => env.shown(resolve(base, file))).join("\n") || "No files.";
		const isCut = partial || listed.length > MAX_FILES;
		return clip(isCut ? `${text}\n${FILES_NOTE}` : text);
	}), toolDefinition({
		name: "grep",
		description: "Search file contents in a folder (default: the workspace) with a regular expression. Returns `file:line: text`. Files that .gitignore names are left out.",
		inputSchema: {
			type: "object",
			properties: {
				pattern: { type: "string" },
				glob: { type: "string" },
				path: {
					type: "string",
					description: "The folder. Default: the workspace"
				}
			},
			required: ["pattern"]
		},
		replay: "safe"
	}).server(async (args) => {
		const pattern = stringArg(args, "pattern");
		if (/[\r\n]/.test(pattern)) throw new Error("The pattern must be one line. grep tests each line.");
		const base = await env.reach(optionalString(args, "path") ?? ".", "grep", "folder");
		const inGlob = globMatcher(optionalString(args, "glob"));
		const isProtected = await env.protectedIn?.(base);
		const listed = isProtected ? await filesUnder(base) : void 0;
		const skipped = listed?.files.filter((path) => inGlob(path) && isProtected?.(path)).length ?? 0;
		const isWanted = (path) => inGlob(path) && !(isProtected?.(path) ?? false);
		const { hits, partial } = await grepUnder(base, pattern, isWanted, listed);
		const lines = [hits.slice(0, MAX_MATCHES).map((hit) => {
			const text = hit.text.slice(0, MAX_LINE).trim();
			return `${env.shown(resolve(base, hit.path))}:${hit.line}: ${text}`;
		}).join("\n") || "No matches."];
		if (partial || hits.length > MAX_MATCHES) lines.push(MATCHES_NOTE);
		if (skipped > 0) {
			const files = skipped === 1 ? "1 file" : `${skipped} files`;
			lines.push(`[Skipped ${files} that the permission rules protect.]`);
		}
		return clip(lines.join("\n"));
	})];
}
//#endregion
export { quoteArg, searchTools, shellPlatform };

//# sourceMappingURL=search.js.map