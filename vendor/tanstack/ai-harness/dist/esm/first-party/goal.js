import { definePlugin } from "../plugins.js";
import { createPluginEvent } from "../extensions.js";
import { defineCommand } from "../commands.js";
import { textOf, transcriptText } from "./session-tools.js";
import { EventType, chat } from "@tanstack/ai";
//#region src/first-party/goal.ts
/** Sent when the judge says that the goal is met. */
var GoalMet = createPluginEvent("tanstack/goal:met");
var JUDGE_PROMPT = "You check the work of an agent. Read the goal and the last part of the conversation. Set met to true only when the conversation shows that the goal is done. Give a short reason.";
var USER_MESSAGE = "You sent a message, so the goal paused. Run /goal resume to continue.";
var TURN_FAILED = "The last turn failed. Run /goal resume to try again.";
var WAITS_FOR_APPROVAL = "The last turn waits for approval. Answer it, then run /goal resume.";
function isVerdict(value) {
	return typeof value === "object" && value !== null && "met" in value && typeof value.met === "boolean" && "reason" in value && typeof value.reason === "string";
}
function isGoal(value) {
	return typeof value === "object" && value !== null && "text" in value && typeof value.text === "string" && "status" in value && typeof value.status === "string" && "round" in value && typeof value.round === "number";
}
/** The goal of the session a view shows, or `null` when there is none. */
function selectGoal(state) {
	const saved = state.plugins["tanstack/goal"];
	return isGoal(saved) ? saved : null;
}
function keepWorking(text, reason) {
	return `Keep working on the goal: ${text}. Last check: ${reason}`;
}
function describe(saved, maxRounds) {
	if (!saved) return "No goal. Start one with /goal <what done looks like>.";
	return [
		`Goal: ${saved.text}`,
		`Status: ${saved.status}, round ${saved.round} of ${maxRounds}.`,
		saved.note,
		saved.reason === "" ? "" : `Last check: ${saved.reason}`
	].filter((line) => line !== "").join("\n");
}
/**
* Keep the harness working until a goal is met. `/goal <text>` starts the
* goal. After each turn, `judge` reads the goal and the end of the transcript
* and decides if the goal is met. If it is not, the plugin starts the next
* turn, up to `maxRounds` turns (default 20).
*
* The loop stops when the goal is met, at the round limit, when a turn waits
* for approval or fails, and when the user sends a message. `/goal` shows the
* goal, `/goal stop` ends it, and `/goal resume` continues it. A
* `keyedAdapter(...)` judge is built with the user's key for each check.
*
* @example
* ```ts
* plugins: () => [goal({ judge: openaiText('gpt-5.6-luna') })]
* ```
*/
function goal(options) {
	const maxRounds = options.maxRounds ?? 20;
	return definePlugin({
		name: "tanstack/goal",
		setup: async (ctx) => {
			const state = ctx.state(null);
			let current = await state.get();
			let ownRun;
			let queuedTurn;
			const queue = (message) => {
				queuedTurn = ctx.session.prompt(message);
			};
			/** Cancel the queued turn if it has not started. */
			const dropQueued = async () => {
				const turn = queuedTurn;
				queuedTurn = void 0;
				if (turn?.status() === "accepted") await turn.cancel();
			};
			/** Change the goal, but only while `text` is still the active goal. */
			const change = async (text, next) => {
				let applied = false;
				current = await state.update((saved) => {
					const isActive = saved !== null && saved.status === "active" && saved.text === text;
					applied = isActive;
					return isActive ? {
						...saved,
						...next
					} : saved;
				});
				return applied;
			};
			/** Make `text` the active goal with a new round count, and start a turn. */
			const begin = async (text, reason) => {
				const message = reason === "" ? `Work toward this goal: ${text}` : keepWorking(text, reason);
				ownRun = void 0;
				await dropQueued();
				current = await state.update(() => ({
					text,
					status: "active",
					round: 0,
					reason,
					note: "",
					queued: message
				}));
				queue(message);
			};
			/** Pause the goal when the plugin's own turn ends early. */
			const pauseOwnTurn = async (runId, note) => {
				if (runId !== ownRun || !current) return;
				ownRun = void 0;
				await change(current.text, {
					status: "paused",
					note
				});
			};
			const judge = async (text) => {
				const transcript = transcriptText((await ctx.session.transcript()).slice(-10)).slice(-8e3);
				const verdict = await chat({
					adapter: await ctx.keys.adapter(options.judge),
					messages: [{
						role: "user",
						content: `${JUDGE_PROMPT}\n\nGoal: ${text}\n\nThe last part of the conversation:\n${transcript}`
					}],
					outputSchema: {
						type: "object",
						properties: {
							met: { type: "boolean" },
							reason: { type: "string" }
						},
						required: ["met", "reason"]
					}
				});
				if (!isVerdict(verdict)) throw new Error("The judge did not answer with met and reason.");
				return verdict;
			};
			return {
				prompts: [{
					id: "tanstack/goal:active",
					text: () => current?.status === "active" ? `You work toward this goal: ${current.text}. Keep going until it is done.` : ""
				}],
				commands: { goal: defineCommand({
					description: "Work until a goal is met: /goal <goal>. Also /goal, /goal stop, /goal resume",
					run: async (input) => {
						const arg = typeof input === "string" ? input.trim() : "";
						switch (arg) {
							case "": return describe(current, maxRounds);
							case "stop":
								if (!(current?.status === "active" || current?.status === "paused")) return "No goal is running.";
								await dropQueued();
								current = await state.update((saved) => saved && {
									...saved,
									status: "stopped",
									note: "You stopped the goal."
								});
								return describe(current, maxRounds);
							case "resume": {
								const canResume = current?.status === "paused" || current?.status === "stopped";
								if (!current || !canResume) return describe(current, maxRounds);
								await begin(current.text, current.reason);
								return describe(current, maxRounds);
							}
							default:
								await begin(arg, "");
								return describe(current, maxRounds);
						}
					}
				}) },
				middleware: [{
					name: "tanstack/goal",
					onConfig: async (run, config) => {
						const saved = current;
						const last = config.messages.at(-1);
						if (!(run.phase === "init" && last !== void 0 && last.role === "user") || saved?.status !== "active") return;
						if (textOf(last) !== saved.queued) {
							await dropQueued();
							await change(saved.text, {
								status: "paused",
								note: USER_MESSAGE
							});
							return;
						}
						queuedTurn = void 0;
						ownRun = run.runId;
						await change(saved.text, {
							round: saved.round + 1,
							queued: ""
						});
					},
					onChunk: async (run, chunk) => {
						if (chunk.type === EventType.RUN_FINISHED && chunk.outcome?.type === "interrupt") await pauseOwnTurn(run.runId, WAITS_FOR_APPROVAL);
						if (chunk.type === EventType.RUN_ERROR) await pauseOwnTurn(run.runId, TURN_FAILED);
					},
					onError: (run) => pauseOwnTurn(run.runId, TURN_FAILED),
					onAbort: (run) => pauseOwnTurn(run.runId, "The last turn was cancelled. Run /goal resume to continue."),
					onFinish: async (run) => {
						const saved = current;
						if (run.runId !== ownRun || saved?.status !== "active") return;
						ownRun = void 0;
						const { text, round } = saved;
						const verdict = await judge(text).catch((error) => error instanceof Error ? error.message : String(error));
						if (typeof verdict === "string") {
							await change(text, {
								status: "paused",
								note: `The judge failed: ${verdict}`
							});
							return;
						}
						const { reason } = verdict;
						if (verdict.met) {
							if (await change(text, {
								status: "met",
								reason
							})) ctx.emit(GoalMet, {
								goal: text,
								reason
							});
							return;
						}
						if (round >= maxRounds) {
							await change(text, {
								status: "stopped",
								reason,
								note: `The round limit (${maxRounds}) is reached. Run /goal resume for more rounds.`
							});
							return;
						}
						if (ctx.session.snapshot().queuedTurns > 0) {
							await change(text, {
								status: "paused",
								reason,
								note: USER_MESSAGE
							});
							return;
						}
						const message = keepWorking(text, reason);
						if (await change(text, {
							reason,
							queued: message
						})) queue(message);
					}
				}]
			};
		}
	});
}
//#endregion
export { GoalMet, goal, selectGoal };

//# sourceMappingURL=goal.js.map