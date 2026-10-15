import { isRecord } from "../utils.js";
import { definePlugin } from "../plugins.js";
import { toolDefinition } from "@tanstack/ai";
//#region src/first-party/question.ts
var NO_ANSWER = "The user did not answer.";
function isOption(value) {
	return isRecord(value) && typeof value.label === "string" && (value.description === void 0 || typeof value.description === "string");
}
function isToolQuestion(value) {
	return isRecord(value) && typeof value.question === "string" && (value.header === void 0 || typeof value.header === "string") && Array.isArray(value.options) && value.options.every(isOption) && (value.multiple === void 0 || typeof value.multiple === "boolean");
}
/** The text the user sees: the question, the numbered options, and how to answer. */
function messageOf(item) {
	const title = item.header ? `${item.header}: ${item.question}` : item.question;
	const options = item.options.map((option, index) => `${index + 1}. ${option.label}${option.description ? ` - ${option.description}` : ""}`);
	const how = item.multiple === true ? "Type one or more numbers or labels, split by commas, or your own answer." : "Type a number or a label, or your own answer.";
	return [
		title,
		...options,
		how
	].join("\n");
}
/**
* The answer shape, for hosts that render a form: one label, or a list of
* labels. Hosts that show a text box send the typed text, and the tool reads it.
*/
function answerSchema(item) {
	const choice = {
		type: "string",
		enum: item.options.map((option) => option.label)
	};
	return item.multiple === true ? {
		type: "array",
		items: choice,
		minItems: 1,
		uniqueItems: true
	} : choice;
}
/** The option `text` names, by its label (any letter case) or its number. */
function labelOf(text, options) {
	const lower = text.toLowerCase();
	const byLabel = options.find((option) => option.label.trim().toLowerCase() === lower);
	if (byLabel) return byLabel.label;
	return /^\d+$/.test(text) ? options[Number(text) - 1]?.label : void 0;
}
/**
* The answer line for the model: the picked labels, or the user's own
* words. `undefined` when the reply has no text.
*/
function readAnswer(reply, item) {
	const isSplit = item.multiple === true && typeof reply === "string";
	const texts = (Array.isArray(reply) ? reply : isSplit ? reply.split(",") : [reply]).map((part) => typeof part === "string" || typeof part === "number" ? String(part).trim() : "").filter((text) => text !== "");
	if (texts.length === 0) return void 0;
	const picked = texts.map((text) => labelOf(text, item.options)).filter((label) => label !== void 0);
	if (picked.length === texts.length && (item.multiple === true || picked.length === 1)) return `Answer: ${[...new Set(picked)].join(", ")}`;
	return `Own answer: ${typeof reply === "string" ? reply.trim() : texts.join(", ")}`;
}
/**
* Add a `question` tool: the model asks the user one to four questions,
* each with two to six options, and waits for the answers. Each question
* goes to the user through `ctx.session.ask`, one at a time. The user picks
* by number or label, or types their own answer. With no answer, or when
* the session closes, the model gets a tool error.
*
* @example
* ```ts
* plugins: () => [question()]
* ```
*/
function question() {
	return definePlugin({
		name: "tanstack/question",
		setup: (ctx) => ({ tools: [toolDefinition({
			name: "question",
			description: "Ask the user one or more questions, each with options, and wait for the answers. Use it when you need a decision or a preference from the user to continue. The user can also type their own answer.",
			inputSchema: {
				type: "object",
				properties: { questions: {
					type: "array",
					minItems: 1,
					maxItems: 4,
					items: {
						type: "object",
						properties: {
							question: {
								type: "string",
								description: "The full question."
							},
							header: {
								type: "string",
								description: "A short label for the question."
							},
							options: {
								type: "array",
								minItems: 2,
								maxItems: 6,
								items: {
									type: "object",
									properties: {
										label: { type: "string" },
										description: { type: "string" }
									},
									required: ["label"]
								}
							},
							multiple: {
								type: "boolean",
								description: "The user can pick more than one option."
							}
						},
						required: ["question", "options"]
					}
				} },
				required: ["questions"]
			},
			replay: "safe"
		}).server(async (args) => {
			const items = isRecord(args) && Array.isArray(args.questions) ? args.questions : [];
			if (!items.every(isToolQuestion)) throw new Error("Each question needs a question and options.");
			const answers = [];
			for (const item of items) {
				const answer = readAnswer(await ctx.session.ask({
					message: messageOf(item),
					schema: answerSchema(item)
				}).catch(() => void 0), item);
				if (answer === void 0) throw new Error(NO_ANSWER);
				answers.push(`${item.question}\n${answer}`);
			}
			return answers.join("\n\n");
		})] })
	});
}
//#endregion
export { question };

//# sourceMappingURL=question.js.map