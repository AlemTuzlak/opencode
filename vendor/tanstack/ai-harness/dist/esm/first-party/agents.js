import { definePlugin } from "../plugins.js";
import { defineCommand } from "../commands.js";
import { configOption } from "../config.js";
import { globToRegExp } from "./glob.js";
import { PermissionRules } from "./permissions.js";
import { readMarkdownFiles } from "./files.js";
import { defineAgent, maxIterations } from "@tanstack/ai";
//#region src/first-party/agents.ts
/** The tools that only read: files, search, the web, and questions. */
var READ_TOOLS = [
	"read_file",
	"list_files",
	"grep",
	"webfetch",
	"websearch",
	"question"
];
/** The built-in agents: `build`, `plan`, `general`, and `explore`. */
var builtInAgents = [
	{
		name: "build",
		description: "Does the work: reads code, changes files, and runs commands.",
		mode: "primary",
		system: "You are the build agent. Do the task the user gives you. Read the code you need, change files, and run commands. Check your work before you say it is done."
	},
	{
		name: "plan",
		description: "Reads the code and makes a plan. Does not change files.",
		mode: "primary",
		tools: [...READ_TOOLS, "todo_write"],
		system: "You are the plan agent. You can only read and search. Do not change files or run commands. Study the code, then give the user a clear plan in numbered steps."
	},
	{
		name: "general",
		description: "Does a research or work task in many steps and reports back. Give it the full task.",
		mode: "subagent",
		system: "You are a general agent. Do the task you get in as many steps as it needs. Use your tools to search, read, and act. At the end, reply with a short report of what you found or did."
	},
	{
		name: "explore",
		description: "Searches the code fast and reports what it finds. Read-only. Give it a question.",
		mode: "subagent",
		tools: READ_TOOLS,
		system: "You are a fast search agent. Find the files and code that answer the question you get. Only read and search. Reply with the paths and a short note for each."
	}
];
var MODES = [
	"primary",
	"subagent",
	"all"
];
var MAX_STEPS_PROMPT = "You reached the step limit. Do not call more tools. Answer now with what you have, and say what is left to do.";
var MAX_STEPS_RESULT = "Step limit reached. Answer without calling tools.";
/** The tools whose name matches one of `patterns`. Without patterns, all of them. */
function allowedTools(tools, patterns) {
	if (patterns === void 0) return [...tools];
	const matchers = patterns.map((pattern) => globToRegExp(pattern));
	return tools.filter((tool) => matchers.some((matcher) => matcher.test(tool.name)));
}
/**
* Apply a profile to each model call of a chat run: keep only its tools,
* and at its step limit, make one last call with no tool calls.
*/
function profileMiddleware(current) {
	const isLastStep = (iteration) => {
		const { steps } = current();
		return steps !== void 0 && iteration >= steps;
	};
	return {
		name: "tanstack/agents",
		onConfig: (run, config) => {
			if (run.phase !== "init" && run.phase !== "beforeModel") return;
			const { tools } = current();
			const update = {};
			if (tools !== void 0) update.tools = allowedTools(config.tools, tools);
			if (run.phase === "beforeModel" && isLastStep(run.iteration)) {
				update.toolChoice = "none";
				update.systemPrompts = [...config.systemPrompts, MAX_STEPS_PROMPT];
			}
			return update;
		},
		onBeforeToolCall: (run) => isLastStep(run.iteration) ? {
			type: "skip",
			result: { error: MAX_STEPS_RESULT }
		} : void 0,
		onShouldContinue: (_run, state) => {
			const { steps } = current();
			return steps === void 0 || state.iterationCount <= steps;
		}
	};
}
/** A profile from a Markdown file. The body is its system prompt. */
function profileOfFile(file) {
	const text = (key) => {
		const value = file.fields[key];
		return typeof value === "string" && value !== "" ? value : void 0;
	};
	const fail = (key) => {
		throw new Error(`Agent file ${file.name}.md: "${key}" is not valid.`);
	};
	const modeText = text("mode");
	const mode = modeText === void 0 ? "all" : MODES.find((candidate) => candidate === modeText) ?? fail("mode");
	const stepsText = text("steps");
	const steps = stepsText === void 0 ? void 0 : Number(stepsText);
	if (steps !== void 0 && !(Number.isInteger(steps) && steps >= 0)) fail("steps");
	const model = text("model");
	const { tools } = file.fields;
	const system = file.body.trim();
	return {
		name: file.name,
		description: text("description") ?? `The ${file.name} agent`,
		mode,
		...model !== void 0 && { model },
		...system !== "" && { system },
		...tools !== void 0 && { tools: typeof tools === "string" ? [tools] : tools },
		...steps !== void 0 && { steps },
		...text("hidden") === "true" && { hidden: true }
	};
}
/**
* Named agents, each with its own system prompt, tools, model, permission
* rules, and step limit.
*
* - A primary agent answers the user's turns. Switch it with
*   `/agent <name>` or the `agent` setting. It applies at the next turn.
* - A subagent is a child that the main model starts with the `subagent`
*   tool. For one `subagent` tool, give the harness
*   `subagents: { agents: [], tool: 'single' }`.
*
* The built-in agents are `build` (primary, the default, every tool),
* `plan` (primary, read-only tools), `general` (subagent, every tool), and
* `explore` (subagent, read-only tools). See {@link builtInAgents}.
*
* @param options.adapter - Turns a model id into an adapter: the `model` of
*   a profile, or for a subagent without one, the model id of the main turn.
*   A `keyedAdapter(...)` is built with the user's key.
* @param options.agents - More profiles. A profile replaces an earlier one
*   with the same name: built-ins first, then `dirs`, then `agents`.
* @param options.dirs - Folders of `*.md` agent files. The file name is the
*   agent name and the body is its system prompt. The frontmatter sets
*   `description`, `mode` (default `all`), `model`, `tools` (a list),
*   `steps`, and `hidden`.
* @param options.builtIns - `false` drops the built-in agents.
* @param options.default - The primary agent of a new session. Default: the
*   first primary agent, `build` with the built-ins.
*
* @example
* ```ts
* const models: Record<string, AnyTextAdapter> = {
*   'claude-sonnet-4-5': anthropicText('claude-sonnet-4-5'),
* }
* agents({
*   adapter: (model) => models[model] ?? openaiText('gpt-5.5'),
*   dirs: ['.agents/agents'],
* })
* ```
*/
function agents(options) {
	return definePlugin({
		name: "tanstack/agents",
		setup: async (ctx) => {
			const dirs = options.dirs ?? [];
			const files = (await Promise.all(dirs.map(readMarkdownFiles))).flat();
			const all = [
				...options.builtIns === false ? [] : builtInAgents,
				...files.map(profileOfFile),
				...options.agents ?? []
			];
			const profiles = [...new Map(all.map((profile) => [profile.name, profile])).values()];
			const visible = profiles.filter((profile) => profile.mode !== "subagent" && !profile.hidden);
			const names = visible.map((profile) => profile.name);
			const first = visible.find((profile) => profile.name === (options.default ?? names[0]));
			if (!first) throw new Error("agents(): `default` must name a primary agent that is not hidden.");
			const active = () => {
				const name = ctx.config.get("agent");
				return visible.find((profile) => profile.name === name) ?? first;
			};
			let lead;
			const subagentOf = (profile) => defineAgent({
				name: profile.name,
				description: profile.description,
				run: async (child) => {
					const model = profile.model ?? lead?.model;
					if (model === void 0) throw new Error(`Agent ${profile.name} has no model. Give it a model, or start it from a turn.`);
					return child.chat({
						adapter: await child.keys.adapter(options.adapter(model)),
						tools: allowedTools(lead?.tools ?? [], profile.tools),
						systemPrompts: profile.system === void 0 ? [] : [profile.system],
						middleware: [profileMiddleware(() => profile)],
						agentLoopStrategy: maxIterations(50)
					});
				}
			});
			const rules = profiles.flatMap((profile) => (profile.permissions ?? []).map((rule) => PermissionRules.item({
				...rule,
				get tool() {
					return active().name === profile.name ? rule.tool : "";
				}
			})));
			return {
				config: { agent: configOption.select({
					options: names,
					default: first.name,
					description: "The primary agent"
				}) },
				commands: { agent: defineCommand({
					description: `Show or switch the primary agent (${names.join(", ")})`,
					run: async (input) => {
						const name = typeof input === "string" ? input.trim() : "";
						const list = `Agents: ${names.join(", ")}.`;
						if (name === "") return `Agent: ${active().name}. ${list}`;
						return (await ctx.session.setConfig("agent", name)).status === "rejected" ? `Unknown agent "${name}". ${list}` : `Agent: ${name}. It applies at the next turn.`;
					}
				}) },
				prompts: [{
					id: "tanstack/agents:system",
					text: () => active().system ?? ""
				}],
				adapter: () => {
					const { model } = active();
					return model === void 0 ? void 0 : options.adapter(model);
				},
				prepareTools: ({ tools, model }) => {
					lead = {
						tools,
						model
					};
					return tools;
				},
				middleware: [profileMiddleware(active)],
				subagents: profiles.filter((profile) => profile.mode !== "primary").map(subagentOf),
				contribute: rules
			};
		}
	});
}
//#endregion
export { agents, builtInAgents };

//# sourceMappingURL=agents.js.map