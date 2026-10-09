import { definePlugin } from "../plugins.js";
import { defineCommand } from "../commands.js";
import { hostBackend } from "./coding/backend.js";
import { WorkspaceHooks } from "./workspace-hooks.js";
import { existsSync, readFileSync, statSync } from "node:fs";
import { readFile, readdir } from "node:fs/promises";
import { homedir } from "node:os";
import { basename, dirname, extname, isAbsolute, join, relative, resolve, sep } from "node:path";
//#region src/first-party/files.ts
/** Prompt slots kept free for instruction files that change. */
var SPARE_SLOTS = 8;
/** The mtime of the file at `path`, or `undefined` when there is none. */
function mtimeOf(path) {
	try {
		return statSync(path).mtimeMs;
	} catch {
		return;
	}
}
/** The trimmed text of the file at `path`, or `''` when there is none. */
function textOf(path) {
	try {
		return readFileSync(path, "utf8").trim();
	} catch {
		return "";
	}
}
/**
* The folders from the repo root (the nearest folder with `.git`) down to
* `root`, outermost first. Only `root` when no folder has `.git`.
*/
function repoFolders(root) {
	const folders = [root];
	let dir = root;
	while (!existsSync(join(dir, ".git"))) {
		const parent = dirname(dir);
		if (parent === dir) return {
			folders: [root],
			isRepo: false
		};
		dir = parent;
		folders.unshift(dir);
	}
	return {
		folders,
		isRepo: true
	};
}
/** The date, platform, working folder, and git facts, as a prompt. */
async function environment(root, isRepo) {
	const now = /* @__PURE__ */ new Date();
	const lines = [
		`Date: ${(/* @__PURE__ */ new Date(now.getTime() - now.getTimezoneOffset() * 6e4)).toISOString().slice(0, 10)}`,
		`Platform: ${process.platform}`,
		`Working folder: ${root}`,
		`Git repository: ${isRepo ? "yes" : "no"}`
	];
	if (isRepo) {
		const git = await hostBackend.exec("git rev-parse --abbrev-ref HEAD", {
			cwd: root,
			timeoutMs: 5e3
		});
		if (git.exitCode === 0) lines.push(`Git branch: ${git.stdout.trim()}`);
	}
	return `Environment:\n${lines.map((line) => `- ${line}`).join("\n")}`;
}
/** The note for an instruction file whose text changed from `before`. */
function changeNote(title, before, text) {
	if (text === "") return `${title} were removed.`;
	if (before === "") return `${title}:\n${text}`;
	return `${title} changed. Follow this text instead:\n${text}`;
}
/**
* Add instruction files (AGENTS.md, CLAUDE.md) and an environment block to
* the system prompt.
*
* - `global`: files that come first, for example `~/.config/AGENTS.md`. `~`
*   is the home folder.
* - Then `files` from each folder between the repo root (the folder with
*   `.git`) and `root`, outermost first. With no repo root, only `root`.
* - `env` (default `true`): the date, platform, working folder, and git
*   repository and branch, read when the session opens.
*
* At the start of each turn, the plugin checks the mtime of each file. A note
* with the new text of a changed file goes after this plugin's other prompts.
* Put this plugin last: when no prompt comes after its prompts, an adapter
* with mid-conversation changes adds the note to the conversation, and the
* prompt cache holds. Else the change is not additive, and the prompt cache
* starts again.
*
* When `read_file` reads a file below `root`, the instruction files in the
* folders between `root` and that file are added to the result, once per
* file in the session.
*
* @example
* ```ts
* projectInstructions({ root: process.cwd(), global: ['~/.config/AGENTS.md'] })
* ```
*/
function projectInstructions(options) {
	const { files: names = ["AGENTS.md", "CLAUDE.md"], env = true } = options;
	return definePlugin({
		name: "tanstack/project-instructions",
		setup: async () => {
			const root = resolve(options.root);
			const { folders, isRepo } = repoFolders(root);
			const shownPath = (path) => relative(root, path).split(sep).join("/");
			const globals = (options.global ?? []).map((path) => ({
				path: resolve(path.replace(/^~(?=$|[\\/])/, homedir())),
				title: `Global instructions from ${path}`
			}));
			const projects = folders.flatMap((dir) => names.map((name) => ({
				path: join(dir, name),
				title: `Project instructions from ${shownPath(join(dir, name))}`
			})));
			const files = [...globals, ...projects].map((file) => ({
				...file,
				mtimeMs: mtimeOf(file.path),
				text: textOf(file.path)
			}));
			const envBlock = env ? [await environment(root, isRepo)] : [];
			/** The prompt with each file as it is now. */
			const current = () => [...files.filter((file) => file.text !== "").map((file) => `${file.title}:\n${file.text}`), ...envBlock];
			const sections = current();
			const slots = files.length + envBlock.length + SPARE_SLOTS;
			/** Add a note for each file that changed since the last check. */
			const refresh = () => {
				const notes = [];
				for (const file of files) {
					const mtimeMs = mtimeOf(file.path);
					if (mtimeMs === file.mtimeMs) continue;
					const before = file.text;
					file.mtimeMs = mtimeMs;
					file.text = textOf(file.path);
					if (file.text !== before) notes.push(changeNote(file.title, before, file.text));
				}
				if (sections.length + notes.length > slots) sections.splice(0, sections.length, ...current());
				else sections.push(...notes);
			};
			/** Nested instruction files the model already got. */
			const given = /* @__PURE__ */ new Set();
			const afterRead = async (path) => {
				const inside = relative(root, path);
				if (!(inside !== "" && !inside.startsWith("..") && !isAbsolute(inside))) return void 0;
				const notes = [];
				const parts = inside.split(sep).slice(0, -1);
				let dir = root;
				for (const part of parts) {
					dir = join(dir, part);
					for (const name of names) {
						const file = join(dir, name);
						if (given.has(file)) continue;
						const text = textOf(file);
						if (text === "") continue;
						given.add(file);
						if (file !== path) notes.push(`Instructions from ${shownPath(file)}:\n${text}`);
					}
				}
				return notes.length > 0 ? notes.join("\n\n") : void 0;
			};
			return {
				prompts: Array.from({ length: slots }, (_, index) => () => {
					if (index === 0) refresh();
					return sections[index] ?? "";
				}),
				contribute: [WorkspaceHooks.item({ afterRead })]
			};
		}
	});
}
/** The text without the quotes around it: `"a"` and `'a'` become `a`. */
function unquote(value) {
	return value.trim().replace(/^(["'])(.*)\1$/, "$2");
}
/**
* Split `---` frontmatter from a Markdown file. It reads `key: value`
* lines and lists: `key: [a, b]`, or `key:` with `- a` lines under it.
* Nested values are not read.
*/
function splitFrontmatter(text) {
	const fields = {};
	const match = /^---\r?\n([\s\S]*?)\r?\n---\r?\n?/.exec(text);
	if (!match) return {
		fields,
		body: text
	};
	let list;
	const lines = (match[1] ?? "").split(/\r?\n/);
	for (const line of lines) {
		const item = /^\s*-\s+(.*)$/.exec(line);
		if (item && list) {
			list.push(unquote(item[1] ?? ""));
			continue;
		}
		list = void 0;
		const pair = /^([\w-]+):(.*)$/.exec(line);
		if (!pair) continue;
		const key = pair[1] ?? "";
		const value = (pair[2] ?? "").trim();
		const inline = /^\[(.*)\]$/.exec(value);
		if (value === "") {
			list = [];
			fields[key] = list;
		} else if (inline) fields[key] = (inline[1] ?? "").split(",").map(unquote).filter((entry) => entry !== "");
		else fields[key] = unquote(value);
	}
	return {
		fields,
		body: text.slice(match[0].length)
	};
}
/**
* The Markdown files in `dir`: the name without `.md`, the frontmatter
* fields, and the body. A folder that cannot be read has no files.
*/
async function readMarkdownFiles(dir) {
	let files = [];
	try {
		files = (await readdir(dir)).filter((file) => extname(file) === ".md");
	} catch {
		return [];
	}
	return Promise.all(files.map(async (file) => ({
		name: basename(file, ".md"),
		...splitFrontmatter(await readFile(resolve(dir, file), "utf8"))
	})));
}
/**
* One command per Markdown file in `dir` (like `.claude/commands/*.md`).
* Running `/name args` sends the file as a prompt, with `$ARGUMENTS`
* replaced by the args.
*/
function fileCommands(options) {
	return definePlugin({
		name: "tanstack/file-commands",
		setup: async (ctx) => {
			const files = await readMarkdownFiles(options.dir);
			const commands = {};
			for (const { name, fields, body } of files) {
				const { description } = fields;
				commands[name] = defineCommand({
					description: typeof description === "string" && description !== "" ? description : `Run ${name}.md`,
					run: (input) => {
						const args = typeof input === "string" ? input : input === void 0 ? "" : JSON.stringify(input);
						ctx.session.prompt(body.split("$ARGUMENTS").join(args).trim());
						return `Sent /${name}.`;
					}
				});
			}
			return { commands };
		}
	});
}
//#endregion
export { fileCommands, projectInstructions, readMarkdownFiles, splitFrontmatter };

//# sourceMappingURL=files.js.map