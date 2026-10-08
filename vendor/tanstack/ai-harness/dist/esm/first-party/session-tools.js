import { emptyUsage } from "../usage.js";
import { definePlugin } from "../plugins.js";
import { defineCommand } from "../commands.js";
import { chat } from "@tanstack/ai";
//#region src/first-party/session-tools.ts
var SUMMARY_PROMPT = "Summarize the conversation so far for yourself. Keep decisions, open tasks, file names, and facts you still need. Leave out small talk.";
function textOf(message) {
	if (typeof message.content === "string") return message.content;
	if (Array.isArray(message.content)) return message.content.map((part) => part.type === "text" ? part.content : "").join("");
	return "";
}
/** One `role: text` line per message. Messages with no text are left out. */
function transcriptText(messages) {
	return messages.map((message) => `${message.role}: ${textOf(message)}`).filter((line) => !line.endsWith(": ")).join("\n");
}
/**
* `/compact`: replace a long transcript with a summary, so later turns send
* fewer tokens. The summary is written by `adapter`. A `keyedAdapter(...)`
* is built with the user's key when `/compact` runs.
*/
function compact(options) {
	return definePlugin({
		name: "tanstack/compact",
		setup: (ctx) => ({ commands: { compact: defineCommand({
			description: "Summarize the conversation to save tokens",
			run: async () => {
				const messages = await ctx.session.transcript();
				const keep = options.keepLast ?? 0;
				if (messages.length <= keep + 2) return "The conversation is already short.";
				const older = messages.slice(0, messages.length - keep);
				const transcript = transcriptText(older);
				const { text: summary } = await chat({
					adapter: await ctx.keys.adapter(options.adapter),
					messages: [{
						role: "user",
						content: `${SUMMARY_PROMPT}\n\n${transcript}`
					}],
					stream: false
				});
				await ctx.session.replaceTranscript([
					{
						role: "user",
						content: `Summary of our conversation so far:\n${summary}`
					},
					{
						role: "assistant",
						content: "Understood. I will continue from this summary."
					},
					...messages.slice(messages.length - keep)
				]);
				return `Compacted ${older.length} messages into a summary.`;
			}
		}) } })
	});
}
/** The usage of an index entry before the host writes the tokens of a turn. */
var NO_TOKENS = {
	turns: 0,
	promptTokens: 0,
	completionTokens: 0,
	totalTokens: 0,
	cachedTokens: 0,
	cacheWriteTokens: 0
};
/**
* The cost in USD of some model calls of one model.
* ponytail: the formula of `modelCost` in `@tanstack/ai-models`, copied, so
* ai-harness does not depend on ai-models.
*/
function priceOf(prices, counts) {
	const { cachedTokens, cacheWriteTokens } = counts;
	const uncached = counts.promptTokens - cachedTokens - cacheWriteTokens;
	const part = (price, tokens) => (price ?? 0) / 1e6 * tokens;
	return part(prices.input, uncached) + part(prices.output, counts.completionTokens) + part(prices.cacheRead, cachedTokens) + part(prices.cacheWrite, cacheWriteTokens);
}
/** One `/usage` line: the calls and tokens of `counts`. */
function usageLine(counts) {
	const cache = counts.cachedTokens > 0 || counts.cacheWriteTokens > 0 ? ` (${counts.cachedTokens} cache read, ${counts.cacheWriteTokens} cache write)` : "";
	return `${counts.calls} model calls, ${counts.promptTokens} input tokens${cache}, ${counts.completionTokens} output tokens, ${counts.totalTokens} total.`;
}
/**
* Show the token usage of the session (`session.usage()`): the lead turn and
* every agent run (subagents, background agents, and their children).
* `/usage` shows the totals, with the input tokens read from and written to
* the prompt cache, and a line for each model when there is more than one.
* The plugin state, for a UI, has a copy of `session.usage().total` and
* `contextTokens`, the size of the lead model's context at its latest call.
*
* A model call that has a cost from its provider keeps that cost. With
* `model`, the plugin also prices the calls that have no provider cost.
* `model` gets the model id and returns its prices in USD per 1M tokens, or
* `undefined` when it does not know the model. `/usage` shows the cost when
* a call has one, and says how many calls it could not price. When a call
* has a cost, the plugin writes the cost to `usage.cost` of the session
* index entry.
*
* @example
* ```ts
* import { getModel } from '@tanstack/ai-models'
*
* plugins: () => [usage({ model: (id) => getModel('anthropic', id) })]
* ```
*/
function usage(options = {}) {
	return definePlugin({
		name: "tanstack/usage",
		setup: (ctx) => {
			/**
			* A copy of the session totals, and `contextTokens`: the input tokens
			* of the latest model call of the lead turn, so how much of the
			* model's context the conversation fills now.
			*/
			const state = ctx.state({
				...emptyUsage().total,
				contextTokens: 0
			});
			const costOf = (model, counts) => {
				if (counts.cost !== void 0) return counts.cost;
				const prices = options.model?.(model.slice(model.indexOf("/") + 1));
				return prices && priceOf(prices.cost, counts);
			};
			/**
			* The cost of the session, and how many calls have no cost. `cost` is
			* `undefined` when no call has one.
			* ponytail: core sums by model. When a model has a provider cost, its
			* calls with no provider cost add nothing. Upgrade: core keeps, by
			* model, the counts of the calls with no provider cost.
			*/
			const sessionCost = (totals) => {
				let cost;
				let unpriced = 0;
				for (const [model, counts] of Object.entries(totals.byModel)) {
					const modelCost = costOf(model, counts);
					if (modelCost === void 0) unpriced += counts.calls;
					else cost = (cost ?? 0) + modelCost;
				}
				return {
					cost,
					unpriced
				};
			};
			const show = () => {
				const totals = ctx.session.snapshot().usage;
				const { cost, unpriced } = sessionCost(totals);
				const note = unpriced > 0 ? ` (cost unknown for ${unpriced} ${unpriced === 1 ? "call" : "calls"})` : "";
				const priced = options.model !== void 0 || cost !== void 0 ? ` Cost: $${(cost ?? 0).toFixed(4)}${note}.` : "";
				const lines = [`${usageLine(totals.total)}${priced}`];
				const models = Object.entries(totals.byModel);
				if (models.length > 1) for (const [model, counts] of models) lines.push(`${model}: ${usageLine(counts)}`);
				return lines.join("\n");
			};
			const saveCost = async () => {
				const { cost } = sessionCost(ctx.session.snapshot().usage);
				if (cost === void 0) return;
				const entry = await ctx.session.entry();
				if (!entry) return;
				const tokens = entry.usage ?? NO_TOKENS;
				await ctx.session.updateEntry({ usage: {
					...tokens,
					cost
				} });
			};
			const mirror = (contextTokens) => state.update((current) => ({
				...ctx.session.snapshot().usage.total,
				contextTokens: contextTokens ?? current.contextTokens
			}));
			const save = async () => {
				await Promise.all([mirror(), saveCost()]).catch(() => {});
			};
			const atRunEnd = {
				name: "tanstack/usage",
				onFinish: save,
				onAbort: save,
				onError: save
			};
			return {
				middleware: [{
					...atRunEnd,
					onUsage: async (_run, info) => {
						await mirror(info.promptTokens);
					}
				}],
				agentMiddleware: [atRunEnd],
				commands: { usage: defineCommand({
					description: "Show token usage for this session",
					run: show
				}) }
			};
		}
	});
}
//#endregion
export { compact, textOf, transcriptText, usage };

//# sourceMappingURL=session-tools.js.map