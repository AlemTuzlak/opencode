import { isRecord } from "../../utils.js";
import { definePlugin } from "../../plugins.js";
import { createPluginEvent } from "../../extensions.js";
import { PermissionPrompt, PermissionRules } from "../permissions.js";
import { hostBackend, pathsOf, readText } from "./backend.js";
import { WorkspaceHooks } from "../workspace-hooks.js";
import { quoteArg, shellPlatform } from "./search.js";
//#region src/first-party/coding/formatter.ts
/** Sent when a formatter fails. The tool call does not fail. */
var FormatFailed = createPluginEvent("tanstack/formatter:failed");
var SCRIPT = [
	".js",
	".jsx",
	".mjs",
	".cjs",
	".ts",
	".tsx",
	".mts",
	".cts"
];
/** The file types that prettier and oxfmt format. */
var WEB = [
	...SCRIPT,
	...[
		".json",
		".jsonc",
		".css",
		".scss",
		".less",
		".html",
		".vue"
	],
	...[
		".md",
		".mdx",
		".yaml",
		".yml",
		".graphql"
	]
];
/** The field `key` of the project's `package.json`, or `undefined`. */
async function packageField(project, key) {
	try {
		const value = JSON.parse(await project.read("package.json"));
		return isRecord(value) ? value[key] : void 0;
	} catch {
		return;
	}
}
/** Does a name in the root folder start with one of the `prefixes`? */
var hasFile = (project, ...prefixes) => project.files.some((name) => prefixes.some((prefix) => name.startsWith(prefix)));
var BUILTINS = [
	{
		name: "prettier",
		extensions: WEB,
		command: (file) => `npx --no-install prettier --write ${file}`,
		when: async (project) => hasFile(project, ".prettierrc", "prettier.config.") || await packageField(project, "prettier") !== void 0
	},
	{
		name: "biome",
		extensions: [
			...SCRIPT,
			".json",
			".jsonc",
			".css",
			".graphql"
		],
		command: (file) => `npx --no-install biome format --write ${file}`,
		when: (project) => project.files.includes("biome.json") || project.files.includes("biome.jsonc")
	},
	{
		name: "oxfmt",
		extensions: WEB,
		command: (file) => `npx --no-install oxfmt ${file}`,
		when: async (project) => {
			const devDependencies = await packageField(project, "devDependencies");
			return hasFile(project, ".oxfmtrc") || isRecord(devDependencies) && "oxfmt" in devDependencies;
		}
	},
	{
		name: "ruff",
		extensions: [".py", ".pyi"],
		command: (file) => `ruff format ${file}`,
		when: async (project) => project.files.includes("ruff.toml") || project.files.includes(".ruff.toml") || (await project.read("pyproject.toml")).includes("[tool.ruff")
	},
	{
		name: "gofmt",
		extensions: [".go"],
		command: (file) => `gofmt -w ${file}`,
		when: (project) => project.files.includes("go.mod")
	},
	{
		name: "rustfmt",
		extensions: [".rs"],
		command: (file) => `rustfmt ${file}`,
		when: (project) => project.files.includes("Cargo.toml")
	}
];
var messageOf = (error) => error instanceof Error ? error.message : String(error);
/**
* The `afterWrite` hook of {@link formatter}. It runs the first formatter
* that the project uses for the file type. The project is checked at the
* first write, once. A failure goes to `onFailure` and never throws.
* `allow` says if the formatter `name` can run on `path`. When it says no,
* the hook resolves to a note for the tool result.
*/
function formatOnWrite(options, onFailure, allow) {
	const backend = options.backend ?? hostBackend;
	const { extname, join, resolve } = pathsOf(backend);
	const root = resolve(options.root);
	const timeoutMs = options.timeoutMs ?? 2e4;
	const platform = shellPlatform(backend);
	const candidates = [...options.formatters ?? [], ...options.builtins === false ? [] : BUILTINS];
	/** The formatters that the project uses, in order. */
	const detect = async () => {
		const project = {
			files: (await backend.readdir(root)).map((entry) => entry.name),
			read: (name) => readText(backend, join(root, name)).catch(() => "")
		};
		const used = await Promise.all(candidates.map(async (candidate) => await candidate.when?.(project) ?? true));
		return candidates.filter((_, index) => used[index]);
	};
	let detected;
	const format = async (path) => {
		const extension = extname(path).toLowerCase();
		const match = (await (detected ??= detect())).find((candidate) => candidate.extensions.includes(extension));
		if (!match) return;
		if (allow && !await allow(match.name, path)) return `The formatter ${match.name} did not run: it is not allowed.`;
		const command = match.command(quoteArg(path, platform));
		const result = await backend.exec(command, {
			cwd: root,
			timeoutMs
		});
		if (result.exitCode === 0) return void 0;
		const reason = result.exitCode === 124 ? `it took longer than ${timeoutMs / 1e3} seconds` : result.stderr.trim().split("\n")[0] || `exit code ${result.exitCode}`;
		throw new Error(`${match.name} failed: ${reason}`);
	};
	return (path) => format(path).catch((error) => onFailure({
		path,
		message: messageOf(error)
	}));
}
/**
* Format each file that `write_file`, `edit_file`, and `patch` write, with
* the formatter that the project uses for its file type. Use it with
* `workspaceTools`.
*
* At the first write in a session, the plugin checks the config files in
* `root`, and keeps the result:
*
* - prettier: `.prettierrc*`, `prettier.config.*`, or `prettier` in
*   `package.json`.
* - biome: `biome.json` or `biome.jsonc`.
* - oxfmt: `.oxfmtrc*`, or `oxfmt` in the `devDependencies`.
* - ruff (`.py`): `ruff.toml`, or `[tool.ruff]` in `pyproject.toml`.
* - gofmt (`.go`): `go.mod`. rustfmt (`.rs`): `Cargo.toml`.
*
* Your `formatters` come first. `builtins: false` turns the list above off.
* Each run is a command through `backend.exec` in `root`, with a time limit
* (`timeoutMs`, default 20 seconds). A formatter that fails, times out, or
* is not installed does not fail the tool call: the file stays as written,
* and the plugin sends a {@link FormatFailed} event.
*
* A formatter runs code from the project, like its config files. So with
* `permissions()`, each run is a command named `formatter:<name>`, for
* example `formatter:prettier`. It asks like `bash`, also in `acceptEdits`
* mode. A no skips the formatter, keeps the write, and the tool result says
* so. Without `permissions()`, the formatter runs without a question.
*
* @example
* ```ts
* plugins: () => [
*   workspaceTools({ root }),
*   formatter({
*     root,
*     formatters: [
*       { name: 'taplo', extensions: ['.toml'], command: (file) => `taplo fmt ${file}` },
*     ],
*   }),
* ]
* ```
*/
function formatter(options) {
	return definePlugin({
		name: "tanstack/formatter",
		optionalRequires: [PermissionPrompt],
		setup: (ctx) => ({ contribute: [WorkspaceHooks.item({ afterWrite: formatOnWrite(options, (failure) => ctx.emit(FormatFailed, failure), async (name, path) => {
			const ask = ctx.getOptional(PermissionPrompt);
			return ask ? ask(`formatter:${name}`, `Allow formatter:${name} on ${path}? It runs code from the project.`) : true;
		}) }), PermissionRules.item({
			tool: "formatter:*",
			decision: "ask",
			kind: "execute"
		})] })
	});
}
//#endregion
export { FormatFailed, formatOnWrite, formatter };

//# sourceMappingURL=formatter.js.map