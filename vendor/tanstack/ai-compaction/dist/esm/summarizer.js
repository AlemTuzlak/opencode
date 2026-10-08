import { sumUsage } from "./usage-count.js";
import { chat } from "@tanstack/ai";
//#region src/summarizer.ts
var SUMMARY_OPEN = "<untrusted-conversation-summary>";
var SUMMARY_CLOSE = "</untrusted-conversation-summary>";
var DETAILS_OPEN = "<compaction-details>";
var DETAILS_CLOSE = "</compaction-details>";
/** The content of a summary message. */
var summaryContent = (summary) => `${SUMMARY_OPEN}\n${summary}\n${SUMMARY_CLOSE}`;
/** A summary text with its details in a `<compaction-details>` tag after it. */
var summaryBody = (summary, details) => [summary, details ? `${DETAILS_OPEN}\n${details}\n${DETAILS_CLOSE}` : ""].filter((part) => part !== "").join("\n\n");
/** The summary text and the details text of a summary body. */
function splitDetails(body) {
	const start = body.indexOf(DETAILS_OPEN);
	const end = body.indexOf(DETAILS_CLOSE, start);
	if (start < 0 || end < 0) return { summary: body };
	return {
		summary: `${body.slice(0, start)}${body.slice(end + 21)}`.trim(),
		details: body.slice(start + 20, end).trim()
	};
}
/**
* The summary text and the details text of an earlier summary message.
* `undefined` when `message` is not a summary message.
*/
function readSummary(message) {
	const content = message?.content;
	if (typeof content !== "string" || !content.startsWith(SUMMARY_OPEN)) return;
	const close = content.lastIndexOf(SUMMARY_CLOSE);
	return splitDetails(content.slice(32, close < 0 ? void 0 : close).trim());
}
var SECTIONS = `## Goal
What the user wants to get done. Keep the user's exact words for each requirement.

## Constraints
The rules, limits, and preferences that the user or the work set.

## Progress
What is done, what is in progress, and what failed. Give the file paths, the commands, and the results.

## Key decisions
Each decision, and the reason for it.

## Next steps
The next actions, in order.

## Critical context
The facts that the assistant must not lose: names, values, error messages, and open questions.`;
var CHECKPOINT_PROMPT = `You write a checkpoint summary of a conversation between a user and an AI assistant. The assistant continues the work from this summary. It does not see the old messages again.

Write these sections, in this order. Write "None." in a section that has nothing.

${SECTIONS}

Be short and exact. Use only facts from the conversation. Do not answer the user. Write only the summary.`;
var UPDATE_PROMPT = `You update a checkpoint summary of a conversation between a user and an AI assistant. The earlier summary is in <previous-summary>. The messages that came after it are in <conversation>. The assistant continues the work from your summary. It does not see the old messages again.

Merge the new messages into the earlier summary. Keep each fact of the earlier summary that is still true. Change each fact that the new messages changed. Move the finished items from "Next steps" to "Progress".

Write these sections, in this order. Write "None." in a section that has nothing.

${SECTIONS}

Be short and exact. Use only facts from the earlier summary and the conversation. Do not answer the user. Write only the summary.`;
var TURN_PREFIX_PROMPT = `You summarize the first part of the current turn of a conversation between a user and an AI assistant. The last part of the turn stays in the context. The assistant needs your summary to finish the turn.

Write a short summary of:
- what the user asked in this turn,
- what the assistant did in this turn so far: the tool calls and their results,
- the facts that the rest of the turn needs.

Be short and exact. Use only facts from the conversation. Write only the summary.`;
function contentText(content) {
	if (typeof content === "string") return content;
	return (content ?? []).map((part) => part.type === "text" ? part.content : `[${part.type}]`).join("\n");
}
/** The messages as plain text. Each tool result is cut to `maxToolResultChars`. */
function messagesText(messages, maxToolResultChars) {
	return messages.map((message) => {
		const text = contentText(message.content);
		if (message.role === "tool") {
			const extra = text.length - maxToolResultChars;
			return `[Tool result]: ${extra > 0 ? `${text.slice(0, maxToolResultChars)} [${extra} more characters cut]` : text}`;
		}
		const calls = (message.toolCalls ?? []).map((call) => `[Tool call ${call.function.name}]: ${call.function.arguments}`);
		return [`[${message.role === "user" ? "User" : "Assistant"}]: ${text}`, ...calls].join("\n");
	}).join("\n\n");
}
/**
* A {@link Summarizer} that asks a text model for a checkpoint summary with
* these sections: goal, constraints, progress, key decisions, next steps, and
* critical context. With an earlier summary it merges the new messages into
* it. It returns the usage of its model call.
*
* @example
* ```ts
* summarizeOldest({ summarize: conversationSummarizer({ adapter }) })
* ```
*/
function conversationSummarizer(options) {
	const maxChars = options.maxToolResultChars ?? 2e3;
	return async (messages, input) => {
		const isUpdate = input.previousSummary !== void 0 && !input.turnPrefix;
		const fresh = isUpdate && readSummary(messages[0]) ? messages.slice(1) : messages;
		const conversation = `<conversation>\n${messagesText(fresh, maxChars)}\n</conversation>`;
		const prompt = input.turnPrefix ? TURN_PREFIX_PROMPT : isUpdate ? UPDATE_PROMPT : CHECKPOINT_PROMPT;
		const spent = {};
		const countUsage = {
			name: "compaction:summary-usage",
			onUsage: (_ctx, usage) => {
				spent.usage = sumUsage(spent.usage, usage);
			}
		};
		const throwIfAborted = () => {
			if (!input.signal?.aborted) return;
			const reason = input.signal.reason;
			throw reason instanceof Error ? reason : /* @__PURE__ */ new Error("The summary was aborted.");
		};
		throwIfAborted();
		const controller = new AbortController();
		const stop = () => controller.abort(input.signal?.reason);
		input.signal?.addEventListener("abort", stop, { once: true });
		let text;
		try {
			text = (await chat({
				adapter: options.adapter,
				messages: [{
					role: "user",
					content: isUpdate ? `<previous-summary>\n${input.previousSummary}\n</previous-summary>\n\n${conversation}` : conversation
				}],
				systemPrompts: [prompt],
				modelOptions: options.modelOptions,
				middleware: [countUsage],
				abortController: controller,
				stream: false
			})).text;
		} finally {
			input.signal?.removeEventListener("abort", stop);
		}
		throwIfAborted();
		const covered = input.turnPrefix ? input.turnPrefixMessages : [...fresh, ...input.turnPrefixMessages ?? []];
		const details = covered && options.details?.({
			messages: covered,
			...input.previousDetails !== void 0 ? { previousDetails: input.previousDetails } : {}
		});
		const summary = summaryBody(text.trim(), details);
		return spent.usage ? {
			summary,
			usage: spent.usage
		} : { summary };
	};
}
//#endregion
export { conversationSummarizer, readSummary, splitDetails, summaryBody, summaryContent };

//# sourceMappingURL=summarizer.js.map