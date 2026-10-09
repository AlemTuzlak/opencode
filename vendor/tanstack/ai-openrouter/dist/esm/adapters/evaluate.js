import { buildHeaders, getOpenRouterApiKeyFromEnv } from "../utils/client.js";
import "../utils/index.js";
import { extractUsageCost } from "./cost.js";
import { buildBaseUsage } from "@tanstack/ai";
import { BaseEvaluateAdapter } from "@tanstack/ai/adapters";
import { toRunErrorPayload } from "@tanstack/ai/adapter-internals";
//#region src/adapters/evaluate.ts
/** OpenRouter Decisions API. Jev is not chat completions. */
var OPENROUTER_DECISIONS_URL = "https://openrouter.ai/api/alpha/decisions";
function isRecord(value) {
	return typeof value === "object" && value !== null && !Array.isArray(value);
}
function isNumberRecord(value) {
	if (!isRecord(value)) return false;
	const values = Object.values(value);
	for (const item of values) if (typeof item !== "number") return false;
	return true;
}
function isStringRecord(value) {
	if (!isRecord(value)) return false;
	const values = Object.values(value);
	for (const item of values) if (typeof item !== "string") return false;
	return true;
}
function isWireAnswer(value) {
	if (!isRecord(value)) return false;
	switch (value.type) {
		case "choice": return typeof value.choice === "string" && typeof value.confidence === "number" && isNumberRecord(value.probabilities);
		case "score": return typeof value.score === "number" && typeof value.confidence === "number" && isStringRecord(value.legend) && isNumberRecord(value.probabilities);
		case "noul": return typeof value.noul === "number";
		default: return false;
	}
}
function isAnswers(value) {
	if (!isRecord(value)) return false;
	const answers = Object.values(value);
	for (const answer of answers) if (!isWireAnswer(answer)) return false;
	return true;
}
function isDecisionsResponse(value) {
	if (!isRecord(value)) return false;
	if (!isAnswers(value.answers)) return false;
	if (value.model !== void 0 && typeof value.model !== "string") return false;
	return true;
}
function readNumber(record, keys) {
	for (const key of keys) {
		const value = record[key];
		if (typeof value === "number") return value;
	}
}
function mapUsage(usage) {
	if (!isRecord(usage)) return buildBaseUsage({
		promptTokens: 0,
		completionTokens: 0,
		totalTokens: 0
	});
	const promptTokens = readNumber(usage, ["input_tokens", "prompt_tokens"]) ?? 0;
	const completionTokens = readNumber(usage, ["output_tokens", "completion_tokens"]) ?? 0;
	const totalTokens = readNumber(usage, ["total_tokens"]) ?? promptTokens + completionTokens;
	return {
		...buildBaseUsage({
			promptTokens,
			completionTokens,
			totalTokens
		}),
		...extractUsageCost(usage)
	};
}
/**
* OpenRouter evaluate adapter.
*
* Asks typed questions about a shared `state` through OpenRouter's
* `/api/alpha/decisions` endpoint. Jev is not a chat model. Returns TypeSafe
* wire answers; `decide()` maps those to the public shape.
*/
var OpenRouterEvaluateAdapter = class extends BaseEvaluateAdapter {
	name = "openrouter";
	clientConfig;
	constructor(config, model) {
		super({}, model);
		this.clientConfig = config;
	}
	async evaluate(options) {
		const { model, state, questions, abortSignal, logger } = options;
		const questionKeys = Object.keys(questions);
		logger.request(`activity=evaluate provider=${this.name} model=${model} questions=${questionKeys.length}`, {
			provider: this.name,
			model
		});
		try {
			const response = await fetch(OPENROUTER_DECISIONS_URL, {
				method: "POST",
				headers: buildHeaders(this.clientConfig),
				body: JSON.stringify({
					model,
					state,
					questions
				}),
				...abortSignal ? { signal: abortSignal } : {}
			});
			if (!response.ok) {
				const detail = await response.text().catch(() => "");
				throw new Error(`OpenRouter evaluate request failed: ${response.status} ${response.statusText}${detail ? ` — ${detail}` : ""}`);
			}
			const json = await response.json();
			if (!isDecisionsResponse(json)) throw new Error("OpenRouter evaluate returned an unexpected response");
			return {
				model: json.model ?? model,
				answers: json.answers,
				usage: mapUsage(json.usage),
				...typeof json.id === "string" && { id: json.id },
				...typeof json.provider === "string" && { provider: json.provider }
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
* Creates an OpenRouter evaluate adapter with an explicit API key.
*
* Jev answers typed questions about `state`. It does not generate chat text.
*
* @param model OpenRouter Jev slug, for example `'~typesafe/jev-latest'`.
* @param apiKey OpenRouter API key.
* @param config Optional headers such as `httpReferer` and `xTitle`.
*
* @example
* ```typescript
* const adapter = createOpenRouterDecider('~typesafe/jev-latest', 'sk-or-...')
* ```
*/
function createOpenRouterDecider(model, apiKey, config) {
	return new OpenRouterEvaluateAdapter({
		apiKey,
		...config
	}, model);
}
/**
* Creates an OpenRouter evaluate adapter, reading `OPENROUTER_API_KEY` from
* the environment.
*
* @param model OpenRouter Jev slug, for example `'~typesafe/jev-latest'`.
* @param config Optional headers such as `httpReferer` and `xTitle`.
*
* @example
* ```typescript
* import { decide, choice } from '@tanstack/ai'
* import { openRouterDecider } from '@tanstack/ai-openrouter'
*
* const result = await decide({
*   adapter: openRouterDecider('~typesafe/jev-latest'),
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
function openRouterDecider(model, config) {
	return createOpenRouterDecider(model, getOpenRouterApiKeyFromEnv(), config);
}
//#endregion
export { OpenRouterEvaluateAdapter, createOpenRouterDecider, openRouterDecider };

//# sourceMappingURL=evaluate.js.map