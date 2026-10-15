import { isAbortShapedError } from "../error-payload.js";
import { resolveDebugOption } from "../../logger/resolve.js";
import { createGenerationContext, runGenerationAbort, runGenerationError, runGenerationFinish, runGenerationStart, runGenerationUsage } from "../middleware/run.js";
import "./adapter.js";
import { aiEventClient } from "@tanstack/ai-event-client";
//#region src/activities/evaluate/index.ts
/**
* Evaluate Activity
*
* Asks typed questions about a shared state and returns values your code can
* branch on. This is a self-contained module with implementation, types, and
* JSDoc.
*/
/** The adapter kind this activity handles */
var kind = "evaluate";
/** Question key reserved for `result.meta`. */
var RESERVED_QUESTION_KEY = "meta";
function createId(prefix) {
	return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}
function isAbortError(error, signal) {
	if (isAbortShapedError(error)) return true;
	return error instanceof Error ? false : signal?.aborted === true;
}
function questionKeys(questions) {
	return Object.keys(questions);
}
function assertQuestions(questions) {
	const keys = questionKeys(questions);
	if (keys.length === 0) throw new Error("decide() requires at least one question");
	if (Object.hasOwn(questions, RESERVED_QUESTION_KEY)) throw new Error("decide() reserves the question key \"meta\"");
	return keys;
}
function mapChoiceAnswer(wire, key) {
	const probability = wire.probabilities[wire.choice];
	if (typeof probability !== "number") throw new Error(`decide(): missing probability for choice "${wire.choice}" on "${key}"`);
	return {
		type: "choice",
		value: wire.choice,
		probability,
		confidence: wire.confidence,
		probabilities: wire.probabilities
	};
}
function mapScoreAnswer(question, wire, key) {
	const levels = question.criteria;
	if (levels.length < 2) throw new Error(`decide(): score question "${key}" needs at least two levels`);
	const lastIndex = levels.length - 1;
	const rounded = Math.round(wire.score);
	const nearestIndex = rounded < 0 ? 0 : rounded > lastIndex ? lastIndex : rounded;
	const value = levels[nearestIndex];
	if (value === void 0) throw new Error(`decide(): score question "${key}" has no level at index ${nearestIndex}`);
	const probability = wire.probabilities[String(nearestIndex)];
	if (typeof probability !== "number") throw new Error(`decide(): missing probability for score level ${nearestIndex} on "${key}"`);
	return {
		type: "score",
		value,
		probability,
		confidence: wire.confidence,
		score: wire.score,
		legend: wire.legend,
		probabilities: wire.probabilities
	};
}
function mapBooleanAnswer(wire) {
	return {
		type: "boolean",
		value: wire.noul >= .5,
		probability: wire.noul
	};
}
function mapWireAnswer(question, wire, key) {
	switch (question.type) {
		case "choice":
			if (wire.type !== "choice") throw new Error(`decide(): expected choice answer for "${key}", got ${wire.type}`);
			return mapChoiceAnswer(wire, key);
		case "score":
			if (wire.type !== "score") throw new Error(`decide(): expected score answer for "${key}", got ${wire.type}`);
			return mapScoreAnswer(question, wire, key);
		case "noul":
			if (wire.type !== "noul") throw new Error(`decide(): expected noul answer for "${key}", got ${wire.type}`);
			return mapBooleanAnswer(wire);
	}
}
function mapAnswers(questions, wireAnswers) {
	const answers = {};
	const keys = Object.keys(questions);
	for (const key of keys) {
		const question = questions[key];
		const wire = wireAnswers[String(key)];
		if (question === void 0) throw new Error(`decide(): missing question "${String(key)}"`);
		if (wire === void 0) throw new Error(`decide(): missing answer for question "${String(key)}"`);
		answers[key] = mapWireAnswer(question, wire, String(key));
	}
	return answers;
}
function withMeta(answers, meta) {
	return {
		...answers,
		meta
	};
}
/**
* Build a choice question. The model picks one key from `options`.
*
* Option keys become the union on `.value`. Use `null` when a key needs no
* extra description. On the wire, `options` is sent as TypeSafe `criteria`.
*
* @param options.instructions What the model should decide.
* @param options.options Map of option key to description, or `null`.
*
* @example
* ```ts
* const queue = choice({
*   instructions: 'Which team should handle this ticket?',
*   options: {
*     billing: 'Payments, invoices, refunds',
*     tech: 'Bugs, outages, integrations',
*     sales: 'Pricing, upgrades, new accounts',
*   },
* })
* ```
*/
function choice(options) {
	return {
		type: "choice",
		instructions: options.instructions,
		criteria: options.options
	};
}
/**
* Build a score question. The model rates `state` on ordered `levels`.
*
* You must pass at least two levels. `.value` is the nearest level label.
* The raw fraction stays on `.score`. On the wire, `levels` is sent as
* TypeSafe `criteria`.
*
* @param options.instructions What the model should rate.
* @param options.levels Ordered labels, lowest first. At least two.
*
* @example
* ```ts
* const urgency = score({
*   instructions: 'How urgent is this ticket?',
*   levels: ['low', 'medium', 'high'],
* })
* ```
*/
function score(options) {
	if (options.levels.length < 2) throw new Error("score() requires at least two levels");
	return {
		type: "score",
		instructions: options.instructions,
		criteria: options.levels
	};
}
/**
* Build a yes/no question.
*
* `.value` is `true` when P(true) is 0.5 or more. There is no `.confidence`.
* On the wire, the type is TypeSafe `noul`.
*
* @param options.instructions The yes/no question to judge.
* @param options.criteria Optional descriptions of yes and no.
*
* @example
* ```ts
* const refund = boolean({
*   instructions: 'Is the customer asking for a refund?',
* })
* ```
*/
function boolean(options) {
	if (options.criteria === void 0) return {
		type: "noul",
		instructions: options.instructions
	};
	return {
		type: "noul",
		instructions: options.instructions,
		criteria: options.criteria
	};
}
/**
* Ask typed questions about `state` and get answers your code can branch on.
*
* You have state (a ticket, a record, a log) and you need typed answers, not
* prose. Pass questions built with `choice`, `score`, and `boolean`. Then
* branch on `result.queue.value` in ordinary TypeScript.
*
* The question key `meta` is reserved. Throws if `questions` is empty or uses
* that key.
*
* @param options.adapter Evaluate adapter created with a model.
* @param options.state Shared state every question judges.
* @param options.questions Questions built with `choice`, `score`, `boolean`.
* @param options.modelOptions Provider-specific options.
* @param options.abortSignal Cancels the in-flight request.
* @param options.middleware Observe-only generation middleware.
* @param options.debug Debug logging option.
*
* @example Route a support ticket
* ```ts
* import { decide, choice, score, boolean } from '@tanstack/ai'
* import { typesafeDecider } from '@tanstack/ai-typesafe'
*
* const result = await decide({
*   adapter: typesafeDecider('jev-latest'),
*   state: ticket,
*   questions: {
*     queue: choice({
*       instructions: 'Which team should handle this ticket?',
*       options: {
*         billing: 'Payments, invoices, refunds',
*         tech: 'Bugs, outages, integrations',
*         sales: 'Pricing, upgrades, new accounts',
*       },
*     }),
*     urgency: score({
*       instructions: 'How urgent is this ticket?',
*       levels: ['low', 'medium', 'high'],
*     }),
*     refund: boolean({
*       instructions: 'Is the customer asking for a refund?',
*     }),
*   },
* })
*
* result.queue.value
* result.meta.model
* result.meta.usage
* ```
*/
async function decide(options) {
	const { adapter, state, questions, modelOptions, abortSignal, middleware, debug } = options;
	const model = adapter.model;
	const keys = assertQuestions(questions);
	const requestId = createId("evaluate");
	const startTime = Date.now();
	const logger = resolveDebugOption(debug);
	const mwCtx = createGenerationContext({
		requestId,
		activity: "evaluate",
		provider: adapter.name,
		model,
		modelOptions,
		createId
	});
	await runGenerationStart(middleware, mwCtx);
	aiEventClient.emit("evaluate:request:started", {
		requestId,
		provider: adapter.name,
		model,
		questionCount: keys.length,
		timestamp: startTime
	});
	logger.request(`activity=evaluate provider=${adapter.name}`, {
		provider: adapter.name,
		model,
		questionCount: keys.length
	});
	try {
		const result = await adapter.evaluate({
			model,
			state,
			questions,
			modelOptions,
			abortSignal,
			logger
		});
		const answers = mapAnswers(questions, result.answers);
		const duration = Date.now() - startTime;
		aiEventClient.emit("evaluate:request:completed", {
			requestId,
			provider: adapter.name,
			model: result.model,
			questionCount: keys.length,
			duration,
			timestamp: Date.now()
		});
		aiEventClient.emit("evaluate:usage", {
			requestId,
			model: result.model,
			usage: result.usage,
			timestamp: Date.now()
		});
		logger.output(`activity=evaluate answers=${keys.length}`, { answerCount: keys.length });
		await runGenerationUsage(middleware, mwCtx, result.usage);
		await runGenerationFinish(middleware, mwCtx, {
			duration,
			usage: result.usage
		});
		return withMeta(answers, {
			model: result.model,
			usage: result.usage,
			...result.id !== void 0 && { id: result.id },
			...result.provider !== void 0 && { provider: result.provider }
		});
	} catch (error) {
		const duration = Date.now() - startTime;
		if (isAbortError(error, abortSignal)) await runGenerationAbort(middleware, mwCtx, {
			reason: error instanceof Error ? error.message : void 0,
			duration
		});
		else await runGenerationError(middleware, mwCtx, {
			error,
			duration
		});
		logger.errors("evaluate activity failed", {
			error,
			source: "evaluate"
		});
		throw error;
	}
}
//#endregion
export { boolean, choice, decide, kind, score };

//# sourceMappingURL=index.js.map