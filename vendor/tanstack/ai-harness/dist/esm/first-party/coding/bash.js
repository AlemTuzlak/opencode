import { isRecord } from "../../utils.js";
import { pathsOf, stringArg } from "./backend.js";
import { boundText } from "../bound-output.js";
import { toolDefinition } from "@tanstack/ai";
//#region src/first-party/coding/bash.ts
/** The longest timeout that one call can ask for: 10 minutes. */
var MAX_TIMEOUT_MS = 6e5;
/**
* How much output the model gets: the last lines. The limits are below the
* defaults of `boundToolOutput` (2000 lines, 50 KiB), so that plugin does
* not cut the result again and remove the exit code.
*/
var OUTPUT_LIMITS = {
	maxLines: 1e3,
	maxBytes: 20480,
	keep: "tail"
};
/** Added to the environment of every command, so tools can see an agent. */
var AGENT_ENV = { AGENT: "1" };
/** Shell syntax that can hide a command inside another command. */
var HIDDEN_COMMAND = /\$\(|`|<\(|>\(|<</;
/** The operators between simple commands. `||` comes before `|`. */
var OPERATORS = [
	"&&",
	"||",
	";",
	"|",
	"\n"
];
/**
* The simple commands in a shell command, so a permission rule can check
* each one. It splits on `&&`, `||`, `;`, `|`, and new lines that are not
* in quotes or after a backslash.
*
* It fails closed: for `$(`, a backtick, `<(`, `>(`, a heredoc (`<<`), an
* unquoted `(`, or a quote that does not close, the whole command comes
* back as one part. The permission rules never allow a part that still has
* shell syntax in it.
*
* @example
* ```ts
* splitCommand('ls && rm -rf x') // ['ls', 'rm -rf x']
* splitCommand('echo $(rm x)') // ['echo $(rm x)']
* ```
*/
function splitCommand(command) {
	if (HIDDEN_COMMAND.test(command)) return [command];
	const parts = [];
	let part = "";
	let quote;
	for (let i = 0; i < command.length; i++) {
		const char = command.charAt(i);
		if (quote === "'") {
			if (char === "'") quote = void 0;
			part += char;
			continue;
		}
		if (char === "\\") {
			part += command.slice(i, i + 2);
			i++;
			continue;
		}
		if (quote !== void 0) {
			if (char === (quote === "\"" ? "\"" : "'")) quote = void 0;
			part += char;
			continue;
		}
		const operator = OPERATORS.find((item) => command.startsWith(item, i));
		if (operator !== void 0) {
			parts.push(part);
			part = "";
			i += operator.length - 1;
			continue;
		}
		if (char === "(") return [command];
		if (command.startsWith("$'", i)) {
			quote = "$'";
			part += "$'";
			i++;
			continue;
		}
		if (char === "'" || char === "\"") quote = char;
		part += char;
	}
	if (quote !== void 0) return [command];
	parts.push(part);
	return parts.map((item) => item.replace(/^[ \t]+|[ \t]+$/g, "")).filter((item) => item !== "");
}
/**
* The command parts of a `bash` call, for `PermissionResources`. Throws when
* `command` is not a string, and that refuses the call.
*
* @example
* ```ts
* PermissionResources.item({ bash: { commands: bashResources } })
* ```
*/
function bashResources(input) {
	return splitCommand(stringArg(input, "command"));
}
/** The number of background jobs started, by the signal that stops them. */
var jobCounts = /* @__PURE__ */ new WeakMap();
/**
* `bash`: run a shell command in the workspace folder. Every command gets
* `AGENT=1` in its environment. The model gets the exit code and the last
* part of the output.
*
* With `background: true`, the call returns at once with a job id, and
* `note` tells the model when the job ends. Background jobs need
* `env.backend.spawn`. They are killed when `signal` aborts.
*
* A command that runs in the foreground supports `detach` of the tool
* context: the host can move it to the background while it runs.
*/
function bashTools(env, options = {}) {
	const { timeoutMs: defaultTimeoutMs = 12e4, note, spillDir, signal } = options;
	const jobs = /* @__PURE__ */ new Set();
	const count = signal && jobCounts.get(signal) || { started: 0 };
	if (signal) jobCounts.set(signal, count);
	signal?.addEventListener("abort", () => {
		for (const job of jobs) job.kill();
	});
	/** Save the full output in `dir`. Gives back the note for the model. */
	const spill = async (dir, output) => {
		const { join, resolve } = pathsOf(env.backend);
		const path = join(resolve(env.root, dir), `bash-${crypto.randomUUID()}.txt`);
		try {
			await env.backend.writeFile(path, output);
			return `[Full output saved to ${env.shown(path)}.]`;
		} catch (error) {
			return `[The full output was not saved: ${String(error)}]`;
		}
	};
	/** The exit code and the end of `output`, as the model gets them. */
	const report = async (exitCode, output) => {
		const bounded = boundText(output, OUTPUT_LIMITS);
		const lines = [`exit code: ${exitCode}`, bounded.text];
		if (bounded.truncated && spillDir !== void 0) lines.push(await spill(spillDir, output));
		return lines.join("\n");
	};
	/** Start `command` in the background. `note` tells the model when it ends. */
	const startJob = (command, cwd) => {
		if (!env.backend.spawn) throw new Error("This workspace cannot run commands in the background.");
		const job = env.backend.spawn(command, {
			cwd,
			env: AGENT_ENV
		});
		count.started += 1;
		const jobId = `bash-${count.started}`;
		jobs.add(job);
		options.jobs?.started(jobId);
		const tell = async () => {
			const { exitCode } = await job.wait();
			jobs.delete(job);
			if (note === void 0 || signal?.aborted) return;
			const result = await report(exitCode, job.output());
			await note(`Background job ${jobId} ended.\n${result}`);
			options.jobs?.ended(jobId);
		};
		tell().catch(() => void 0);
		return {
			jobId,
			status: "started"
		};
	};
	return [toolDefinition({
		name: "bash",
		description: "Run a shell command in the workspace folder. You get the exit code and the last 1000 lines (20 KiB) of the output. For a command that runs long, like a dev server, set background to true: the call returns at once, and you get a note when the command ends.",
		inputSchema: {
			type: "object",
			properties: {
				command: { type: "string" },
				timeoutMs: {
					type: "number",
					description: "Stop the command after this many milliseconds. At most 600000."
				},
				background: {
					type: "boolean",
					description: "Run the command in the background."
				}
			},
			required: ["command"]
		},
		replay: "never"
	}).server(async (args, context) => {
		const command = stringArg(args, "command");
		const cwd = await env.reach(".", "bash", "folder");
		if (isRecord(args) && args.background === true) return startJob(command, cwd);
		const requested = isRecord(args) ? args.timeoutMs : void 0;
		const isTimeout = typeof requested === "number" && requested > 0;
		const work = env.backend.exec(command, {
			cwd,
			env: AGENT_ENV,
			timeoutMs: isTimeout ? Math.min(requested, MAX_TIMEOUT_MS) : defaultTimeoutMs
		}).then(({ exitCode, stdout, stderr }) => report(exitCode, `${stdout}${stderr ? `\nstderr:\n${stderr}` : ""}`));
		const detach = context?.detach;
		return detach ? Promise.race([work, detach(work)]) : work;
	})];
}
//#endregion
export { bashResources, bashTools, splitCommand };

//# sourceMappingURL=bash.js.map