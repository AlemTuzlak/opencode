import { isRecord } from "../../utils.js";
import { RevertFiles, RevertStanding, definePlugin } from "../../plugins.js";
import { defineCommand } from "../../commands.js";
import { hostBackend } from "./backend.js";
import { quoteArg, shellPlatform } from "./search.js";
import { LogRecordsCapability, getLogRecords } from "@tanstack/ai";
import { createHash } from "node:crypto";
//#region src/first-party/coding/snapshots.ts
var isStep = (value) => isRecord(value) && typeof value.from === "string" && typeof value.to === "string" && Array.isArray(value.files) && Array.isArray(value.toolCallIds);
/**
* What `unrevert` needs: the tree when the revert started, and the files
* that the revert put back.
*/
var isReverted = (value) => isRecord(value) && typeof value.now === "string" && Array.isArray(value.files) && value.files.every((file) => typeof file === "string");
/** The log record type of a {@link SnapshotStep}. */
var STEP_RECORD = "tanstack/snapshots:step";
var TIMEOUT_MS = 6e4;
var BUSY = "Wait until the turn ends, then try again.";
var REVERTED = "A revert stands. Run unrevert, or send a prompt, first.";
/**
* A shadow git repository for `options.root`. Git commands of one
* repository run one at a time, so sessions on one workspace do not clash
* on its index.
*/
function shadowRepo(options) {
	const backend = options.backend ?? hostBackend;
	const platform = shellPlatform(backend);
	const quote = (value) => quoteArg(value, platform);
	const hash = createHash("sha1").update(options.root).digest("hex");
	const gitDir = `${options.dataDir}/${hash}`;
	const env = {
		GIT_DIR: gitDir,
		GIT_INDEX_FILE: `${gitDir}/index`
	};
	const git = `git -c core.autocrlf=false --git-dir ${quote(gitDir)} --work-tree ${quote(options.root)}`;
	/** Run a command in the workspace. Throws with git's message when it fails. */
	const exec = async (command) => {
		const result = await backend.exec(command, {
			cwd: options.root,
			env,
			timeoutMs: TIMEOUT_MS
		});
		if (result.exitCode !== 0) throw new Error(`${command} failed: ${result.stderr.trim()}`);
		return result.stdout;
	};
	const run = (args) => exec(`${git} ${args}`);
	/**
	* Save the workspace files, and give the id of their tree. One shell runs
	* both git commands: each shell start is slow on Windows.
	*/
	const track = async () => (await exec(`${git} add -A && ${git} write-tree`)).trim();
	const changed = async (from, to) => {
		return (await run(`diff --name-only -z --no-renames ${quote(from)} ${quote(to)}`)).split("\0").filter((name) => name !== "");
	};
	let queue = Promise.resolve();
	const serial = (fn) => {
		const result = queue.then(fn);
		queue = result.then(() => void 0, () => void 0);
		return result;
	};
	return {
		/** Create the repository. `false` when the backend has no git. */
		init: () => serial(async () => {
			if ((await backend.exec("git --version", { timeoutMs: TIMEOUT_MS })).exitCode !== 0) return false;
			await exec(`git init --bare -q ${quote(gitDir)}`);
			await backend.writeFile(`${gitDir}/info/attributes`, "* -text -ident -filter\n");
			return true;
		}),
		track: () => serial(track),
		changed: (from, to) => serial(() => changed(from, to)),
		diff: (from, to) => serial(async () => {
			const target = to ?? await track();
			const patch = await run(`diff --no-color --no-ext-diff --no-renames ${quote(from)} ${quote(target)}`);
			return {
				files: await changed(from, target),
				patch
			};
		}),
		/**
		* Make the files that differ between `from` and `tree` match `tree`, and
		* give their count. Of these files, the ones that are not in `tree` are
		* removed. With `only`, only the files in it change. All other files stay
		* as they are.
		*/
		restore: (tree, from, only) => serial(async () => {
			const status = (await run(`diff --name-status -z --no-renames ${quote(from)} ${quote(tree)}`)).split("\0");
			const removed = [];
			const restored = [];
			for (let i = 1; i < status.length; i += 2) {
				const path = status[i];
				if (!path || only && !only.has(path)) continue;
				if (status[i - 1] === "D") removed.push(path);
				else restored.push(path);
			}
			const paths = async (name, list) => {
				const file = `${gitDir}/${name}`;
				await backend.writeFile(file, list.join("\0"));
				return `--pathspec-from-file ${quote(file)} --pathspec-file-nul`;
			};
			const commands = [];
			if (removed.length > 0) commands.push(`${git} add -A`, `${git} --literal-pathspecs rm -q -f --ignore-unmatch ${await paths("restore-removed", removed)}`);
			if (restored.length > 0) commands.push(`${git} --literal-pathspecs checkout ${quote(tree)} ${await paths("restore-restored", restored)}`);
			if (commands.length > 0) await exec(commands.join(" && "));
			return removed.length + restored.length;
		})
	};
}
var messageOf = (error) => error instanceof Error ? error.message : String(error);
/**
* Snapshots of the workspace files at the start and the end of each model
* step, in a shadow git repository in `dataDir`. Adds two commands:
*
* - `/undo`: put the files that the last turn changed back as they were
*   before it, and remove that turn from the transcript. Other files stay
*   as they are.
* - `/redo`: bring back what the last `/undo` removed. A new turn clears it.
*
* `session.revert(messageId)` also puts back the files that the tool calls
* after that message changed, and `session.unrevert()` brings them back.
*
* The changed files of each step go to the session log as a
* `tanstack/snapshots:step` record on a durable host, else to the plugin
* state. `diff(from, to?)` gives the changed files and a unified diff
* between two tree ids. Without `to`, it compares with the files now.
*
* Needs the git CLI on the backend. Without git, the plugin does nothing.
*
* @example
* ```ts
* const root = process.cwd()
* const history = snapshots({ root, dataDir: '/var/lib/agent/snapshots' })
* defineHarness({ adapter, plugins: () => [workspaceTools({ root }), history] })
* // `step` is a `tanstack/snapshots:step` record.
* const { files, patch } = await history.diff(step.from, step.to)
* ```
*/
function snapshots(options) {
	const repo = shadowRepo(options);
	let ready;
	const isReady = () => ready ??= repo.init().then((hasGit) => {
		if (!hasGit) console.warn("snapshots: git was not found. Snapshots are off.");
		return hasGit;
	}, (error) => {
		console.warn(`snapshots: ${messageOf(error)}. Snapshots are off.`);
		return false;
	});
	return definePlugin({
		name: "tanstack/snapshots",
		diff: async (from, to) => {
			if (!await isReady()) throw new Error("snapshots: git is not available.");
			return repo.diff(from, to);
		},
		provides: [RevertFiles],
		setup: async (ctx) => {
			if (!await isReady()) {
				ctx.provide(RevertFiles, {
					revert: async () => void 0,
					unrevert: async () => {}
				});
				return;
			}
			const reverted = ctx.getOptional(RevertStanding);
			const steps = ctx.state([]);
			ctx.provide(RevertFiles, {
				revert: async (hidden, records) => {
					const calls = new Set(hidden.flatMap((message) => (message.toolCalls ?? []).map((call) => call.id)));
					const later = [...await steps.get(), ...await records(STEP_RECORD)].filter(isStep).filter((step) => step.toolCallIds.some((id) => calls.has(id)));
					const first = later[0];
					if (!first) return void 0;
					const files = [...new Set(later.flatMap((step) => step.files))];
					const now = await repo.track();
					await repo.restore(first.from, now, new Set(files));
					return {
						now,
						files
					};
				},
				unrevert: async (saved) => {
					if (!isReverted(saved)) return;
					await repo.restore(saved.now, await repo.track(), new Set(saved.files));
				}
			});
			/** The tree at the start of the step that runs. */
			let stepStart;
			/** The tree at the start of the last turn: what `/undo` restores. */
			let turnStart;
			/** What the last `/undo` removed: the trees of the turn, and its messages. */
			let redo;
			const guard = async (fn) => {
				try {
					return await fn();
				} catch (error) {
					console.warn(`snapshots: ${messageOf(error)}`);
					return;
				}
			};
			return {
				middleware: [{
					name: "tanstack/snapshots",
					optionalRequires: [LogRecordsCapability],
					onIteration: async (_ctx, { iteration }) => {
						if (iteration > 0 && stepStart !== void 0) return;
						stepStart = await guard(repo.track);
						if (iteration > 0) return;
						turnStart = stepStart;
						redo = void 0;
					},
					onToolPhaseComplete: async (ctx, { toolCalls }) => {
						const from = stepStart;
						if (from === void 0) return;
						const step = await guard(async () => {
							const to = await repo.track();
							const files = to === from ? [] : await repo.changed(from, to);
							const toolCallIds = toolCalls.map((call) => call.id);
							return {
								from,
								to,
								files,
								toolCallIds
							};
						});
						stepStart = step?.to;
						if (!step || step.files.length === 0) return;
						const log = getLogRecords(ctx, { optional: true });
						if (log) await log.append([{
							type: STEP_RECORD,
							...step
						}]);
						else await steps.update((saved) => [...saved, step]);
					}
				}],
				commands: {
					undo: defineCommand({
						description: "Undo the last turn: restore the files and remove it from the transcript",
						run: async (_input, { session }) => {
							if (session.snapshot().status !== "idle") return BUSY;
							if (reverted?.()) return REVERTED;
							const messages = await session.transcript();
							const start = messages.findLastIndex((message) => message.role === "user");
							const turnEnd = stepStart;
							if (turnStart === void 0 || turnEnd === void 0 || start === -1) return "Nothing to undo.";
							const count = await repo.restore(turnStart, turnEnd);
							redo = {
								start: turnStart,
								end: turnEnd,
								messages: messages.slice(start)
							};
							turnStart = void 0;
							await session.replaceTranscript(messages.slice(0, start));
							return `Undid the last turn. Files restored: ${count}.`;
						}
					}),
					redo: defineCommand({
						description: "Bring back the files and the turn of the last /undo",
						run: async (_input, { session }) => {
							if (session.snapshot().status !== "idle") return BUSY;
							if (reverted?.()) return REVERTED;
							if (!redo) return "Nothing to redo.";
							const { start, end, messages } = redo;
							await repo.restore(end, start);
							turnStart = start;
							redo = void 0;
							const transcript = await session.transcript();
							await session.replaceTranscript([...transcript, ...messages]);
							return "Redid the last turn.";
						}
					})
				}
			};
		}
	});
}
//#endregion
export { snapshots };

//# sourceMappingURL=snapshots.js.map