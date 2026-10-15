import { BackgroundJobs, SessionSignal, definePlugin } from "../../plugins.js";
import { PERMISSION_MODES, PermissionDecisionCapability, PermissionResources, PermissionRules, isYes } from "../permissions.js";
import { hostBackend, optionalString, pathsOf, stringArg } from "./backend.js";
import { WorkspaceHooks } from "../workspace-hooks.js";
import { bashResources, bashTools } from "./bash.js";
import { editTools } from "./edit.js";
import { patchPaths, patchTools } from "./patch.js";
import { readTools } from "./read.js";
import { searchTools } from "./search.js";
import { webTools } from "./web.js";
//#region src/first-party/coding/workspace.ts
/** Is `full` the folder `dir`, or a path in it? `sep` is the separator. */
function within(dir, full, sep) {
	return full === dir || full.startsWith(dir.endsWith(sep) ? dir : dir + sep);
}
/** A lock per path: work on one path runs one at a time, in order. */
function createLock() {
	const queues = /* @__PURE__ */ new Map();
	return (path, fn) => {
		const result = (queues.get(path) ?? Promise.resolve()).then(fn);
		const settled = result.then(() => void 0, () => void 0);
		queues.set(path, settled);
		settled.then(() => {
			if (queues.get(path) === settled) queues.delete(path);
		});
		return result;
	};
}
/**
* Does `editStyle: 'auto'` give `model` the `patch` tool? GPT models do:
* `gpt-` ids and the `o` series, like `o3`.
*/
function prefersPatch(model) {
	const id = model.slice(model.lastIndexOf("/") + 1);
	return /^(gpt-|o\d)/i.test(id);
}
/**
* The tools of {@link workspaceTools} for one session, and what each call
* touches for `PermissionResources`. `access` asks the user about a path
* outside the workspace when `options.outside` is `'ask'`. `hooks` are the
* hooks that plugins added. `note` tells the model that a background `bash`
* job ended, and `signal` kills the jobs that still run.
*/
function createWorkspaceTools(options, session = {}) {
	const backend = options.backend ?? hostBackend;
	const paths = pathsOf(backend);
	const root = paths.resolve(options.root);
	const { access } = session;
	const allowed = [];
	const asking = /* @__PURE__ */ new Map();
	/** The working folder: `root`, or the thread's `cwd` in it. */
	const here = () => {
		const cwd = access?.cwd?.();
		return cwd ? paths.resolve(root, cwd) : root;
	};
	/** Ask once about `folder`. A yes allows it for the session. */
	const allow = (folder, message) => {
		let answer = asking.get(folder);
		if (!answer) {
			answer = Promise.resolve(access?.ask(message)).then((reply) => {
				asking.delete(folder);
				if (isYes(reply)) allowed.push(folder);
				return isYes(reply);
			});
			asking.set(folder, answer);
		}
		return answer;
	};
	/**
	* The real path of `full`, with every link resolved. For a path that is
	* not there yet: the real path of the nearest parent that is there, plus
	* the rest. A link to a missing target throws.
	*/
	const realPath = async (full) => {
		const rest = [];
		let head = full;
		for (;;) {
			const real = backend.realpath ? await backend.realpath(head) : head;
			if (real !== void 0) return paths.join(real, ...rest);
			const parent = paths.dirname(head);
			if (parent === head) return full;
			rest.unshift(paths.basename(head));
			head = parent;
		}
	};
	/**
	* The real path of `full`, as the permission rules see it. In the real
	* root, it is a path in `root`, so a root that is a link (like `/tmp` on
	* macOS) does not move every path outside.
	*/
	const realForRules = async (full) => {
		const [real, realRoot] = await Promise.all([realPath(full), realPath(root)]);
		return within(realRoot, real, paths.sep) ? paths.join(root, paths.relative(realRoot, real)) : real;
	};
	const shown = (full) => (within(root, full, paths.sep) ? paths.relative(root, full) || "." : full).split(paths.sep).join("/");
	const file = (input) => [paths.resolve(here(), stringArg(input, "path"))];
	const folder = (input) => [paths.resolve(here(), optionalString(input, "path") ?? ".")];
	const resources = {
		read_file: { paths: file },
		write_file: { paths: file },
		edit_file: { paths: file },
		list_files: { paths: folder },
		grep: { paths: folder },
		patch: { paths: (input) => patchPaths(stringArg(input, "patch")).map((each) => paths.resolve(here(), each)) },
		bash: { commands: bashResources }
	};
	/**
	* The rules see the path that the call names. A link can lead to a path
	* with a stricter rule, like `notes` to `.env`. So the rules check the
	* real path too, and the strictest decision wins.
	*/
	const checkRealPath = async (path, tool, full) => {
		const decide = access?.rules?.();
		if (!access || !decide || !resources[tool]?.paths) return;
		const real = await realForRules(full);
		if (paths.relative(full, real) === "") return;
		const decision = decide(tool, [full, real]);
		if (decision === decide(tool, [full])) return;
		if (decision === "deny") throw new Error(`The permission rules do not allow ${tool} on ${shown(real)}, the real path of ${path}.`);
		const reply = await access.ask(`${path} is a link to ${shown(real)}. The permission rules ask before ${tool} uses ${shown(real)}. Allow it? (y/n)`);
		if (!isYes(reply)) throw new Error(`The user did not allow ${tool} on ${shown(real)}, the real path of ${path}.`);
	};
	/** Throws when the user or the options do not allow `real`, outside. */
	const allowOutside = async (path, tool, kind, full, real) => {
		if (options.outside !== "ask" || !access) throw new Error(`Path "${path}" is outside the workspace.`);
		if (access.mode() === "bypass") return;
		const dir = kind === "folder" ? real : paths.dirname(real);
		if (!await allow(dir, `${tool} wants ${real}, outside the workspace (${root}). Allow ${dir} for this session? (y/n)`)) throw new Error(`The user did not allow ${full}. It is outside the workspace.`);
	};
	const reach = async (path, tool, kind) => {
		const full = paths.resolve(here(), path);
		const real = await realPath(full);
		if (![await realPath(root), ...allowed].some((dir) => within(dir, real, paths.sep))) await allowOutside(path, tool, kind, full, real);
		await checkRealPath(path, tool, full);
		return full;
	};
	const env = {
		backend,
		root,
		hooks: session.hooks ?? (() => []),
		lock: createLock(),
		reach,
		shown,
		protectedIn: async (dir) => {
			const decide = access?.rules?.();
			if (!decide) return void 0;
			const real = await realForRules(dir);
			return (path) => decide("read_file", [paths.resolve(dir, path), paths.resolve(real, path)]) !== "allow";
		}
	};
	return {
		tools: [
			...readTools(env),
			...editTools(env),
			...patchTools(env),
			...searchTools(env),
			...bashTools(env, {
				timeoutMs: options.bashTimeoutMs,
				note: session.note,
				spillDir: options.spillDir,
				signal: session.signal,
				jobs: session.jobs
			}),
			...options.web === false ? [] : webTools(options.web)
		],
		prompt: options.outside === "ask" ? `Your workspace is ${root}. Paths are relative to it. A path outside it asks the user first.` : `Your workspace is ${root}. Paths are relative to it.`,
		resources
	};
}
/**
* `tools` with the edit tools of `editStyle` for `model`: without
* `edit_file` for the patch style, else without `patch`.
*/
function withEditStyle(tools, editStyle, model) {
	const hidden = editStyle === "patch" || editStyle === "auto" && prefersPatch(model) ? "edit_file" : "patch";
	return tools.filter((tool) => tool.name !== hidden);
}
/**
* File, shell, and web tools for a coding agent, in `root`: `read_file`,
* `write_file`, `edit_file` or `patch` (see `editStyle`), `list_files`,
* `grep`, `bash`, `webfetch`, and `websearch` with a search provider. Edits,
* `bash`, and `webfetch` ask for approval through `permissions()`, and each
* call tells the permission rules which paths or commands it touches. A
* path outside `root` is refused, or with `outside: 'ask'` the user is
* asked first. A link that leads out of `root` counts as outside. Other
* plugins add {@link WorkspaceHooks} to run code after a read or a write.
*
* The tools use `backend` for files and commands. The default,
* `hostBackend`, runs on this machine with the host's authority. Use a
* sandbox backend for code you do not trust.
*
* @example
* ```ts
* workspaceTools({ root: process.cwd(), outside: 'ask' })
* ```
*/
function workspaceTools(options) {
	return definePlugin({
		name: "tanstack/workspace-tools",
		optionalRequires: [PermissionDecisionCapability],
		setup: (ctx) => {
			const hooks = ctx.collect(WorkspaceHooks);
			const cwd = () => ctx.session.settings().cwd;
			const { tools, prompt, resources } = createWorkspaceTools(options, {
				access: {
					ask: (message) => ctx.session.ask({ message }),
					mode: () => ctx.config.get("mode"),
					cwd,
					rules: () => {
						const decide = ctx.getOptional(PermissionDecisionCapability);
						if (!decide) return void 0;
						const value = ctx.config.get("mode");
						const mode = PERMISSION_MODES.find((each) => each === value) ?? "default";
						return (tool, paths) => decide(tool, mode, { paths });
					}
				},
				hooks: () => hooks,
				note: (text) => ctx.session.note(text, { wake: true }),
				signal: ctx.getOptional(SessionSignal) ?? ctx.resources.signal,
				jobs: ctx.getOptional(BackgroundJobs)
			});
			const paths = pathsOf(options.backend ?? hostBackend);
			const folder = () => {
				const dir = cwd();
				return dir ? ` The working folder of this thread is ${paths.resolve(options.root, dir)}. Relative paths start there.` : "";
			};
			return {
				tools,
				prompts: [() => prompt + folder()],
				prepareTools: (turn) => withEditStyle(turn.tools, options.editStyle ?? "auto", turn.model),
				contribute: [
					PermissionRules.item({
						tool: "read_file",
						decision: "allow",
						kind: "read"
					}),
					PermissionRules.item({
						tool: "list_files",
						decision: "allow",
						kind: "read"
					}),
					PermissionRules.item({
						tool: "grep",
						decision: "allow",
						kind: "read"
					}),
					PermissionRules.item({
						tool: "write_file",
						decision: "ask",
						kind: "edit"
					}),
					PermissionRules.item({
						tool: "edit_file",
						decision: "ask",
						kind: "edit"
					}),
					PermissionRules.item({
						tool: "patch",
						decision: "ask",
						kind: "edit"
					}),
					PermissionRules.item({
						tool: "bash",
						decision: "ask",
						kind: "execute"
					}),
					...options.web === false ? [] : [PermissionRules.item({
						tool: "webfetch",
						decision: "ask"
					})],
					PermissionResources.item(resources)
				]
			};
		}
	});
}
//#endregion
export { createWorkspaceTools, workspaceTools };

//# sourceMappingURL=workspace.js.map