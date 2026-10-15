import { getOpenAIApiKeyFromEnv } from "../utils/client.js";
import OpenAI$1 from "openai";
import { BaseEvaluateAdapter } from "@tanstack/ai/adapters";
import { buildBaseUsage } from "@tanstack/ai";
import { toRunErrorPayload } from "@tanstack/ai/adapter-internals";
//#region src/adapters/evaluate.ts
/** Models served by the OpenAI Decisions API. */
var OPENAI_EVALUATE_MODELS = ["gpt-6-luna"];
function toText(value) {
	return typeof value === "string" ? value : JSON.stringify(value);
}
function toDecisionQuestion(name, question) {
	const instructions = toText(question.instructions);
	switch (question.type) {
		case "choice": return {
			type: "choice",
			name,
			instructions,
			choices: Object.entries(question.criteria).map(([value, description]) => ({
				value,
				...description !== null && { description }
			}))
		};
		case "score": return {
			type: "score",
			name,
			instructions,
			levels: question.criteria.map((label) => ({ label }))
		};
		case "noul": return {
			type: "predicate",
			name,
			instructions: [instructions, ...[question.criteria?.true && `True means: ${question.criteria.true}`, question.criteria?.false && `False means: ${question.criteria.false}`].filter(Boolean)].join("\n")
		};
	}
}
function toWireAnswer(answer, name) {
	switch (answer.type) {
		case "predicate": return {
			type: "noul",
			noul: answer.probability
		};
		case "choice": return {
			type: "choice",
			choice: String(answer.choice),
			probabilities: Object.fromEntries(answer.probabilities.map((p) => [String(p.value), p.probability])),
			confidence: answer.confidence
		};
		case "score": return {
			type: "score",
			score: answer.score,
			legend: Object.fromEntries(answer.probabilities.map((p) => [String(p.value), p.label])),
			probabilities: Object.fromEntries(answer.probabilities.map((p) => [String(p.value), p.probability])),
			confidence: answer.confidence
		};
		case "refusal": throw new Error(`OpenAI declined to answer question "${name}"`);
	}
}
/**
* OpenAI evaluate adapter.
*
* Asks typed questions about a shared `state` through the OpenAI Decisions
* API (`/v1/decisions`). Returns TypeSafe wire answers; `decide()` maps those
* to the public shape.
*/
var OpenAIEvaluateAdapter = class extends BaseEvaluateAdapter {
	name = "openai";
	client;
	constructor(config, model) {
		super({}, model);
		this.client = new OpenAI$1(config);
	}
	async evaluate(options) {
		const { model, state, questions, abortSignal, logger } = options;
		const questionKeys = Object.keys(questions);
		logger.request(`activity=evaluate provider=${this.name} model=${model} questions=${questionKeys.length}`, {
			provider: this.name,
			model
		});
		try {
			const decision = await this.client.decisions.create({
				model,
				input: toText(state),
				questions: Object.entries(questions).map(([name, question]) => toDecisionQuestion(name, question))
			}, abortSignal ? { signal: abortSignal } : void 0);
			const answers = Object.fromEntries(decision.answers.map((answer, index) => {
				const name = answer.name ?? questionKeys[index] ?? String(index);
				return [name, toWireAnswer(answer, name)];
			}));
			return {
				model: decision.model,
				answers,
				usage: buildBaseUsage({
					promptTokens: decision.usage.input_tokens,
					completionTokens: decision.usage.output_tokens,
					totalTokens: decision.usage.total_tokens
				})
			};
		} catch (error) {
			logger.errors(`${this.name}.evaluate fatal`, {
				error: toRunErrorPayload(error, `${this.name}.evaluate failed`),
				source: `${this.name}.evaluate`
			});
			throw error;
		}
	}
};
/**
* Creates an OpenAI evaluate adapter with an explicit API key.
*
* @param model Decisions model, for example `'gpt-6-luna'`.
* @param apiKey OpenAI API key.
* @param config Optional OpenAI client options.
*
* @example
* ```typescript
* const adapter = createOpenaiDecider('gpt-6-luna', 'sk-...')
* ```
*/
function createOpenaiDecider(model, apiKey, config) {
	return new OpenAIEvaluateAdapter({
		apiKey,
		...config
	}, model);
}
/**
* Creates an OpenAI evaluate adapter, reading `OPENAI_API_KEY` from the
* environment.
*
* @param model Decisions model, for example `'gpt-6-luna'`.
* @param config Optional OpenAI client options.
*
* @example
* ```typescript
* import { decide, choice } from '@tanstack/ai'
* import { openaiDecider } from '@tanstack/ai-openai'
*
* const result = await decide({
*   adapter: openaiDecider('gpt-6-luna'),
*   state: ticket,
*   questions: {
*     queue: choice({
*       instructions: 'Which team should handle this ticket?',
*       options: {
*         billing: 'Payments, invoices, refunds',
*         tech: 'Bugs, outages, integrations',
*       },
*     }),
*   },
* })
* ```
*/
function openaiDecider(model, config) {
	return createOpenaiDecider(model, getOpenAIApiKeyFromEnv(), config);
}
//#endregion
export { OPENAI_EVALUATE_MODELS, OpenAIEvaluateAdapter, createOpenaiDecider, openaiDecider };

//# sourceMappingURL=evaluate.js.map