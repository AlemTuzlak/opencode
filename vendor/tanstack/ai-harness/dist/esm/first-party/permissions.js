import { isRecord } from "../utils.js";
import { SessionMetadata, definePlugin } from "../plugins.js";
import { createExtensionPoint } from "../extensions.js";
import { defineCommand } from "../commands.js";
import { configOption } from "../config.js";
import { globToRegExp } from "./glob.js";
import { createCapability, getMetadata } from "@tanstack/ai";
//#region src/first-party/permissions.ts
/**
* Tool plugins add their rules here. `permissions()` reads them, and adds its
* own `rules` too, so other readers like `codeMode()` see them.
*/
var PermissionRules = createExtensionPoint("tanstack/permission-rules");
/**
* Tool plugins say what each call touches, so rules with a `resource` can
* match it. Each item maps tool names to their resources, for example
* `PermissionResources.item({ read_file: { paths: (input) => [...] } })`.
*/
var PermissionResources = createExtensionPoint("tanstack/permission-resources");
var PERMISSION_MODES = [
	"default",
	"plan",
	"acceptEdits",
	"bypass"
];
/**
* What `permissions()` decides for a call of `tool` in `mode`. With
* `resources`, for a call that touches them. Without, for a call that
* declares no `PermissionResources`. It uses all rules in their order, the
* `default`, and the `root`. Other plugins, like `codeMode()` and
* `workspaceTools()`, ask it. Saved answers are not used: they only allow
* more, so an answer here is never looser than a call.
*/
var PermissionDecisionCapability = createCapability()("tanstack/permission-decision");
/**
* @internal Ask the rules of `permissions()` about `tool`, an action that is
* not a tool call, like `formatter:prettier`. It uses the saved answers. On
* `ask`, it asks the user with `message`, and saves an `always` answer.
* Resolves to `true` when the action can run. The package does not export it.
*/
var PermissionPrompt = createCapability()("tanstack/permission-prompt");
/** Is the user's answer a yes: `true`, `y`, or `yes`? */
function isYes(answer) {
	return answer === true || /^y(es)?$/i.test(String(answer).trim());
}
/**
* True when a command part still has shell syntax that can run or chain
* more commands (`$(`, a backtick, `;`, `&`, `|`, `<`, `>`, a new line), so
* no allow rule applies to it.
*/
function isUnsplittableCommand(part) {
	return /[`;&|<>\r\n]|\$\(/.test(part);
}
function matchesTool(rule, tool) {
	return rule.tool.endsWith("*") ? tool.startsWith(rule.tool.slice(0, -1)) : rule.tool === tool;
}
/** A path or a drive root in Windows form: `C:\x`, `C:/x`, or `\\server\share`. */
function isWindowsPath(path) {
	return /^([a-z]:[\\/]|[\\/]{2})/i.test(path);
}
/**
* Compare paths without letter case on macOS and Windows, whose file systems
* ignore case by default, and for any Windows-form path. Else `Secrets/key`
* would pass a deny rule for `secrets/**`.
*/
function foldsCase(path) {
	const platform = typeof process === "undefined" ? "" : process.platform;
	return platform === "darwin" || platform === "win32" || isWindowsPath(path);
}
/** `path` with `/` separators, and `.` and `..` resolved. */
function normalizePath(path) {
	const slashed = path.replaceAll("\\", "/");
	const prefix = /^[a-z]:\//i.exec(slashed)?.[0] ?? (slashed.startsWith("/") ? "/" : "");
	const segments = [];
	const parts = slashed.slice(prefix.length).split("/");
	for (const segment of parts) {
		if (segment === "" || segment === ".") continue;
		if (segment === ".." && segments.length > 0 && segments.at(-1) !== "..") segments.pop();
		else if (segment !== ".." || prefix === "") segments.push(segment);
	}
	return prefix + segments.join("/");
}
/** A `.env` file, or `.env.local` and the like. They often hold secrets. */
function isEnvFile(path) {
	const name = path.slice(path.lastIndexOf("/") + 1).toLowerCase();
	return /\.env(\.|$)/.test(name);
}
function pathResource(path, root) {
	const foldCase = foldsCase(root ?? path);
	const slashed = path.replaceAll("\\", "/");
	const cannotResolve = slashed.replace(/^[a-z]:\//i, "").includes(":") || slashed.split("/").some((part) => /[. ]$/.test(part) && part !== "." && part !== "..");
	const full = normalizePath(/^([a-z]:)?\//i.test(slashed) || root === void 0 ? slashed : `${root}/${slashed}`);
	const resource = {
		type: "path",
		match: full,
		risky: cannotResolve || isEnvFile(full),
		unsplittable: false,
		foldCase
	};
	if (root === void 0) return resource;
	const base = normalizePath(root);
	const folder = base.endsWith("/") ? base : `${base}/`;
	const fold = (value) => foldCase ? value.toLowerCase() : value;
	return fold(full) === fold(base) || fold(full).startsWith(fold(folder)) ? {
		...resource,
		match: full.slice(folder.length)
	} : {
		...resource,
		risky: true
	};
}
function commandResource(part) {
	return {
		type: "command",
		match: part.trim(),
		risky: false,
		unsplittable: isUnsplittableCommand(part),
		foldCase: false
	};
}
/** A command glob: `*` matches any text, `/` too. */
function commandPattern(glob) {
	const source = glob.split("*").map((part) => part.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")).join(".*");
	return new RegExp(`^${source}$`);
}
function matchesResource(glob, resource) {
	if (resource.type === "command") return commandPattern(glob).test(resource.match);
	const pattern = globToRegExp(glob.replaceAll("\\", "/"));
	return new RegExp(pattern.source, resource.foldCase ? "i" : "").test(resource.match);
}
function strictest(decisions) {
	if (decisions.includes("deny")) return "deny";
	if (decisions.includes("ask")) return "ask";
	return "allow";
}
/**
* The decision for a tool call in a mode. The last matching rule wins.
*
* - With `resources`, each path and command part is checked, and every one
*   must be allowed. A path outside `root`, a `.env` file, or a path that
*   cannot be resolved asks, unless a rule with a `resource` allows it. A
*   command part with shell syntax (see `isUnsplittableCommand`) never gets
*   an allow.
* - Without `resources`, the call could touch anything, so a later rule
*   with a `resource` that asks or denies counts too.
*
* Modes: `bypass` allows all. `plan` denies edits, commands, and every call
* that is not an allow. `acceptEdits` allows edits that would ask.
*/
function decidePermission(rules, tool, mode, options = {}) {
	if (mode === "bypass") return "allow";
	const kind = rules.findLast((rule) => matchesTool(rule, tool) && rule.kind !== void 0)?.kind;
	if (mode === "plan" && (kind === "edit" || kind === "execute")) return "deny";
	const decisionOf = (rule) => {
		const decision = rule?.decision ?? options.fallback ?? "allow";
		return mode === "acceptEdits" && kind === "edit" && decision === "ask" && rule?.resource === void 0 ? "allow" : decision;
	};
	const toolRules = rules.filter((rule) => matchesTool(rule, tool));
	const lastToolLevel = toolRules.findLastIndex((rule) => rule.resource === void 0);
	const toolLevel = lastToolLevel === -1 ? void 0 : toolRules[lastToolLevel];
	const decideOne = (resource) => {
		const rule = toolRules.findLast((candidate) => candidate.resource === void 0 || matchesResource(candidate.resource, resource));
		const decision = decisionOf(rule);
		if (decision !== "allow") return decision;
		return resource.unsplittable || resource.risky && rule?.resource === void 0 ? "ask" : "allow";
	};
	const resources = options.resources === void 0 ? void 0 : [...(options.resources.paths ?? []).map((path) => pathResource(path, options.root)), ...(options.resources.commands ?? []).map(commandResource)];
	const decision = strictest(resources === void 0 ? [decisionOf(toolLevel), ...toolRules.slice(lastToolLevel + 1).map((rule) => rule.decision)] : resources.length === 0 ? [decisionOf(toolLevel)] : resources.map(decideOne));
	if (mode === "plan" && decision !== "allow") return "deny";
	return decision;
}
/** Rules hide a tool when its last rule denies with no `resource`. */
function isHidden(rules, tool, mode) {
	if (mode === "bypass") return false;
	const last = rules.findLast((rule) => matchesTool(rule, tool));
	return last?.decision === "deny" && last.resource === void 0;
}
/** The answer to a permission question, for hosts that render a form. */
var ANSWER_SCHEMA = {
	type: "object",
	properties: {
		answer: {
			type: "string",
			enum: [
				"once",
				"always",
				"reject"
			],
			description: "once: allow this call. always: allow it from now on in this project. reject: refuse it."
		},
		message: {
			type: "string",
			description: "With reject: what the model should do instead."
		}
	},
	required: ["answer"]
};
/** The user's reply. Anything that is not `once` or `always` rejects. */
function readAnswer(value) {
	const raw = isRecord(value) ? value.answer : value;
	const choice = typeof raw === "string" ? raw.trim().toLowerCase() : "";
	const text = isRecord(value) && typeof value.message === "string" ? value.message.trim() : "";
	return {
		choice: choice === "once" || choice === "always" ? choice : "reject",
		message: text === "" ? void 0 : text
	};
}
function isSavedRule(value) {
	return isRecord(value) && typeof value.tool === "string" && value.decision === "allow" && (value.resource === void 0 || typeof value.resource === "string");
}
/** A refused call: the model gets a tool error with `error`. */
function refuse(error) {
	return {
		type: "skip",
		result: { error }
	};
}
var METADATA_NAMESPACE = "tanstack/permissions";
/** The root as one string for each folder: `C:\Repo` and `c:/repo/` are the same. */
function projectId(root) {
	const path = normalizePath(root);
	return foldsCase(root) ? path.toLowerCase() : path;
}
/** Where the metadata store keeps the saved rules of `project`. */
function savedKeyOf(project) {
	return project === void 0 ? "permissions:saved" : `permissions:saved:${projectId(project)}`;
}
async function readSaved(metadata, key) {
	const stored = await metadata.get(METADATA_NAMESPACE, key);
	return Array.isArray(stored) ? stored.filter(isSavedRule) : [];
}
function isSameRule(a, b) {
	return a.tool === b.tool && a.resource === b.resource && a.decision === b.decision && a.kind === b.kind;
}
/**
* The rules that `always` answers saved for `project`, in the saved order.
* `project` is the `root` of `permissions()`. `stores` is the persistence
* of the host, for example `persistence.stores`. Without a metadata store,
* it resolves to an empty list.
*/
async function listSavedPermissions(stores, project) {
	return stores.metadata ? readSaved(stores.metadata, savedKeyOf(project)) : [];
}
/**
* Delete one saved rule of `project`. The rule matches by its fields, as
* `listSavedPermissions` gives them. An unknown rule does nothing. New
* sessions stop using the rule. Open sessions can keep it until they open
* again.
*/
async function deleteSavedPermission(stores, project, rule) {
	const { metadata } = stores;
	if (!metadata) return;
	const key = savedKeyOf(project);
	const rules = await readSaved(metadata, key);
	const index = rules.findIndex((saved) => isSameRule(saved, rule));
	if (index === -1) return;
	rules.splice(index, 1);
	await metadata.set(METADATA_NAMESPACE, key, rules);
}
/** A saved rule as one line: the tool, then the resource. */
function describeRule(rule) {
	return rule.resource === void 0 ? rule.tool : `${rule.tool} ${rule.resource}`;
}
var PLAN_PROMPT = "You are in plan mode. Do not change files or run commands. Read what you need, then describe your plan.";
/**
* Check every tool call against permission rules, with a `mode` setting and a
* `/mode` command:
*
* - `default`: rules apply as written. `ask` asks the user.
* - `plan`: read-only. Edits and commands are denied.
* - `acceptEdits`: edits run without asking. Commands still ask.
* - `bypass`: everything runs.
*
* Rules apply in this order, and the last match wins: rules from tool
* plugins (`PermissionRules`), then `rules`, then saved answers. A saved
* answer never beats a deny. Tool plugins say what a call touches through
* `PermissionResources`. A path outside `root` or a `.env` file asks, unless
* a rule with a `resource` allows it. A tool whose last rule denies with no
* `resource` is removed from the model's tools.
*
* A question takes `once`, `always`, or `reject` with a `message` for the
* model. `always` saves an allow rule for each path or command part of the
* call, for the project (`root`), in the metadata store, else in memory for
* the session. `/permissions` lists the saved rules, and
* `/permissions forget <n>` deletes one.
*/
function permissions(options = {}) {
	return definePlugin({
		name: "tanstack/permissions",
		provides: [PermissionDecisionCapability, PermissionPrompt],
		setup: (ctx) => {
			const contributed = ctx.collect(PermissionRules);
			const declared = ctx.collect(PermissionResources);
			const configured = () => [...contributed, ...options.rules ?? []];
			ctx.provide(PermissionDecisionCapability, (tool, current, resources) => decidePermission(configured(), tool, current, {
				fallback: options.default,
				resources,
				root: options.root
			}));
			const mode = () => {
				const value = ctx.config.get("mode");
				return PERMISSION_MODES.find((candidate) => candidate === value) ?? "default";
			};
			const root = options.root;
			const savedKey = savedKeyOf(root);
			const memory = [];
			const loadSaved = async (metadata) => {
				return [...metadata ? await readSaved(metadata, savedKey) : [], ...memory];
			};
			const save = async (metadata, rules) => {
				memory.push(...rules);
				if (!metadata || rules.length === 0) return;
				const current = await readSaved(metadata, savedKey);
				await metadata.set(METADATA_NAMESPACE, savedKey, [...current, ...rules]);
			};
			const sessionMetadata = ctx.getOptional(SessionMetadata);
			const savedRules = async () => sessionMetadata ? readSaved(sessionMetadata, savedKey) : [...memory];
			const forget = async (arg) => {
				const rules = await savedRules();
				const rule = /^\d+$/.test(arg) ? rules[Number(arg) - 1] : void 0;
				if (!rule) return `No saved rule ${arg}. Run /permissions to see the list.`;
				await deleteSavedPermission({ metadata: sessionMetadata }, root, rule);
				const kept = memory.filter((saved) => !isSameRule(saved, rule));
				memory.splice(0, memory.length, ...kept);
				return `Forgot rule ${arg}: ${describeRule(rule)}.`;
			};
			const resourcesOf = (tool, input) => {
				const entry = declared.findLast((item) => Object.hasOwn(item, tool))?.[tool];
				if (!entry) return void 0;
				const resources = {
					paths: entry.paths?.(input) ?? [],
					commands: entry.commands?.(input) ?? []
				};
				if (![...resources.paths, ...resources.commands].every((value) => typeof value === "string")) throw new Error("A resource is not a string.");
				return resources;
			};
			/** The rules an `always` answer saves: one allow for each resource. */
			const rulesToSave = (tool, resources) => {
				if (resources === void 0) return [{
					tool,
					decision: "allow"
				}];
				return [...(resources.paths ?? []).map((path) => pathResource(path, root).match), ...(resources.commands ?? []).filter((part) => !isUnsplittableCommand(part)).map((part) => part.trim())].filter((value) => !/[*?]/.test(value)).map((resource) => ({
					tool,
					resource,
					decision: "allow"
				}));
			};
			const decide = async (tool, input, current, metadata) => {
				const resources = resourcesOf(tool, input);
				const settings = {
					fallback: options.default,
					resources,
					root
				};
				const rules = configured();
				if (decidePermission(rules, tool, current, settings) === "deny") return {
					decision: "deny",
					resources
				};
				rules.push(...await loadSaved(metadata));
				return {
					decision: decidePermission(rules, tool, current, settings),
					resources
				};
			};
			/** Ask the user. An `always` answer saves the rules for the call. */
			const askUser = async (message, tool, resources, metadata) => {
				const reply = readAnswer(await ctx.session.ask({
					message: `${message} Answer once, always, or reject.`,
					schema: ANSWER_SCHEMA
				}));
				if (reply.choice === "always") await save(metadata, rulesToSave(tool, resources));
				return reply;
			};
			ctx.provide(PermissionPrompt, async (tool, message) => {
				const { decision } = await decide(tool, void 0, mode(), sessionMetadata);
				if (decision !== "ask") return decision === "allow";
				return (await askUser(message, tool, void 0, sessionMetadata)).choice !== "reject";
			});
			const check = {
				name: "tanstack/permissions",
				onBeforeToolCall: async (run, hook) => {
					const current = mode();
					if (current === "bypass") return void 0;
					const metadata = getMetadata(run, { optional: true });
					const checked = await decide(hook.toolName, hook.args, current, metadata).catch((error) => error instanceof Error ? error : new Error(String(error)));
					if (checked instanceof Error) return refuse(`Cannot check the permissions of this call: ${checked.message}`);
					const { decision, resources } = checked;
					if (decision === "allow") return void 0;
					if (decision === "deny") return refuse(`This tool is not allowed in ${current} mode.`);
					const preview = JSON.stringify(hook.args ?? {}).slice(0, 300);
					const reply = await askUser(`Allow ${hook.toolName} ${preview}?`, hook.toolName, resources, metadata);
					if (reply.choice === "reject") return refuse(reply.message ?? "The user denied this tool call.");
				}
			};
			return {
				config: { mode: configOption.select({
					options: PERMISSION_MODES,
					default: "default",
					category: "mode",
					description: "How tool calls are approved"
				}) },
				prompts: [{
					id: "tanstack/permissions:plan",
					text: () => mode() === "plan" ? PLAN_PROMPT : ""
				}],
				commands: {
					mode: defineCommand({
						description: `Show or switch the mode (${PERMISSION_MODES.join(", ")})`,
						run: async (input) => {
							const next = typeof input === "string" ? input.trim() : "";
							if (!next) return `Mode: ${mode()}.`;
							return (await ctx.session.setConfig("mode", next)).status === "rejected" ? `Unknown mode "${next}". Modes: ${PERMISSION_MODES.join(", ")}.` : `Mode: ${next}.`;
						}
					}),
					permissions: defineCommand({
						description: "List the saved \"always\" rules: /permissions. Delete one: /permissions forget <n>",
						run: async (input) => {
							const arg = typeof input === "string" ? input.trim() : "";
							const forgetArg = /^forget\s+(.+)$/.exec(arg)?.[1];
							if (forgetArg !== void 0) return forget(forgetArg.trim());
							if (arg !== "") return "Use /permissions, or /permissions forget <n>.";
							const rules = await savedRules();
							if (rules.length === 0) return "No saved rules.";
							return ["Saved rules:", ...rules.map((rule, index) => `${index + 1}. ${describeRule(rule)}`)].join("\n");
						}
					})
				},
				prepareTools: ({ tools }) => {
					const rules = configured();
					const current = mode();
					return tools.filter((tool) => !isHidden(rules, tool.name, current));
				},
				contribute: (options.rules ?? []).map((rule) => PermissionRules.item(rule)),
				middleware: [check],
				agentMiddleware: [check]
			};
		}
	});
}
//#endregion
export { PERMISSION_MODES, PermissionDecisionCapability, PermissionPrompt, PermissionResources, PermissionRules, decidePermission, deleteSavedPermission, isUnsplittableCommand, isYes, listSavedPermissions, permissions };

//# sourceMappingURL=permissions.js.map