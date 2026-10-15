import { getVercelGatewayApiKeyFromEnv, withVercelGatewayDefaults } from "../utils/client.js";
import { mapGatewayModelOptions } from "../utils/map-gateway-options.js";
import { toRunErrorPayload } from "@tanstack/ai/adapter-internals";
import { BaseEvaluateAdapter } from "@tanstack/ai/adapters";
//#region src/adapters/evaluate.ts
/**
* Documented evaluate URL from Vercel AI SDK `GatewayEvaluationModel.getUrl()`:
* `${baseURL}/evaluation-model` with default baseURL
* `https://ai-gateway.vercel.sh/v4/ai`. Not `/v1/chat/completions`.
* https://github.com/vercel/ai/blob/main/packages/gateway/src/gateway-evaluation-model.ts
*/
var EVALUATE_PATH = "/v4/ai/evaluation-model";
var DEFAULT_EVALUATE_URL = `https://ai-gateway.vercel.sh${EVALUATE_PATH}`;
/** The gateway rejects the request with 400 when this header is absent. */
var GATEWAY_PROTOCOL_VERSION = "0.0.1";
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
function extraRequestHeaders(defaultHeaders) {
	if (defaultHeaders == null) return {};
	if (typeof Headers !== "undefined" && defaultHeaders instanceof Headers) {
		const headers = {};
		const entries = defaultHeaders.entries();
		for (const [key, value] of entries) headers[key] = value;
		return headers;
	}
	if (Array.isArray(defaultHeaders)) {
		const headers = {};
		for (const entry of defaultHeaders) {
			if (!Array.isArray(entry) || entry.length < 2) continue;
			const key = entry[0];
			const value = entry[1];
			if (typeof key === "string" && typeof value === "string") headers[key] = value;
		}
		return headers;
	}
	if (!isRecord(defaultHeaders)) return {};
	const headers = {};
	const keys = Object.keys(defaultHeaders);
	for (const key of keys) {
		const value = defaultHeaders[key];
		if (typeof value === "string") headers[key] = value;
	}
	return headers;
}
function resolveEvaluateUrl(baseURL) {
	if (!baseURL) return DEFAULT_EVALUATE_URL;
	try {
		return `${new URL(baseURL).origin}${EVALUATE_PATH}`;
	} catch {
		return DEFAULT_EVALUATE_URL;
	}
}
function toGatewayQuestion(question) {
	switch (question.type) {
		case "noul":
			if (question.criteria === void 0) return {
				type: "boolean",
				instructions: question.instructions
			};
			return {
				type: "boolean",
				instructions: question.instructions,
				criteria: question.criteria
			};
		case "choice":
		case "score": return question;
	}
}
function toGatewayQuestions(questions) {
	const mapped = {};
	const keys = Object.keys(questions);
	for (const key of keys) {
		const question = questions[key];
		if (question === void 0) continue;
		mapped[key] = toGatewayQuestion(question);
	}
	return mapped;
}
function readCount(candidates) {
	for (const candidate of candidates) if (typeof candidate === "number") return candidate;
	return 0;
}
function toTokenUsage(usage) {
	if (!isRecord(usage)) return {
		promptTokens: 0,
		completionTokens: 0,
		totalTokens: 0
	};
	const promptTokens = readCount([
		usage.inputTokens,
		usage.input_tokens,
		usage.promptTokens,
		usage.prompt_tokens
	]);
	const completionTokens = readCount([
		usage.outputTokens,
		usage.output_tokens,
		usage.completionTokens,
		usage.completion_tokens
	]);
	return {
		promptTokens,
		completionTokens,
		totalTokens: readCount([
			usage.totalTokens,
			usage.total_tokens,
			promptTokens + completionTokens
		])
	};
}
function confidenceMap(providerMetadata) {
	if (!isRecord(providerMetadata)) return {};
	const typesafe = providerMetadata.typesafe;
	if (!isRecord(typesafe)) return {};
	if (!isNumberRecord(typesafe.confidence)) return {};
	return typesafe.confidence;
}
function confidenceFor(key, answer, byKey) {
	if (typeof answer.confidence === "number") return answer.confidence;
	const fromMeta = byKey[key];
	if (typeof fromMeta === "number") return fromMeta;
	return 0;
}
function toWireAnswer(answer, confidence) {
	switch (answer.type) {
		case "boolean":
			if (typeof answer.probability !== "number") throw new Error("Vercel Gateway evaluate boolean answer was missing probability");
			return {
				type: "noul",
				noul: answer.probability
			};
		case "choice":
			if (typeof answer.choice !== "string") throw new Error("Vercel Gateway evaluate choice answer was missing choice");
			return {
				type: "choice",
				choice: answer.choice,
				probabilities: isNumberRecord(answer.probabilities) ? answer.probabilities : {},
				confidence
			};
		case "score":
			if (typeof answer.score !== "number") throw new Error("Vercel Gateway evaluate score answer was missing score");
			return {
				type: "score",
				score: answer.score,
				legend: isStringRecord(answer.legend) ? answer.legend : {},
				probabilities: isNumberRecord(answer.probabilities) ? answer.probabilities : {},
				confidence
			};
		default: throw new Error(`Vercel Gateway evaluate answer had an unexpected type: ${String(answer.type)}`);
	}
}
function toWireAnswers(answers, byKey) {
	if (!isRecord(answers)) throw new Error("Vercel Gateway evaluate response was missing answers");
	const mapped = {};
	const keys = Object.keys(answers);
	for (const key of keys) {
		const answer = answers[key];
		if (!isRecord(answer)) throw new Error(`Vercel Gateway evaluate answer "${key}" had an unexpected shape`);
		mapped[key] = toWireAnswer(answer, confidenceFor(key, answer, byKey));
	}
	return mapped;
}
/**
* Vercel AI Gateway evaluate adapter.
*
* Talks to `POST /v4/ai/evaluation-model` with `fetch`. Jev is not a chat
* model; this adapter does not use `/v1/chat/completions`.
*/
var VercelGatewayEvaluateAdapter = class extends BaseEvaluateAdapter {
	name = "vercel-gateway";
	apiKey;
	evaluateUrl;
	extraHeaders;
	constructor(config, model) {
		super({}, model);
		const defaults = withVercelGatewayDefaults(config);
		this.apiKey = config.apiKey;
		this.evaluateUrl = resolveEvaluateUrl(defaults.baseURL);
		this.extraHeaders = extraRequestHeaders(defaults.defaultHeaders);
	}
	async evaluate(options) {
		const { model, state, questions, modelOptions, abortSignal, logger } = options;
		const mapped = mapGatewayModelOptions(modelOptions);
		logger.request(`activity=evaluate provider=${this.name} model=${model}`, {
			provider: this.name,
			model
		});
		try {
			const response = await fetch(this.evaluateUrl, {
				method: "POST",
				headers: {
					...this.extraHeaders,
					Authorization: `Bearer ${this.apiKey}`,
					"Content-Type": "application/json",
					"ai-gateway-protocol-version": GATEWAY_PROTOCOL_VERSION,
					"ai-evaluation-model-specification-version": "4",
					"ai-model-id": model
				},
				body: JSON.stringify({
					...mapped,
					model,
					state,
					questions: toGatewayQuestions(questions)
				}),
				...abortSignal ? { signal: abortSignal } : {}
			});
			if (!response.ok) {
				const detail = await response.text().catch(() => "");
				throw new Error(`Vercel Gateway evaluate request failed: ${response.status} ${response.statusText}${detail ? ` — ${detail}` : ""}`);
			}
			const json = await response.json();
			if (!isRecord(json)) throw new Error("Vercel Gateway evaluate response had an unexpected shape");
			return {
				model: typeof json.model === "string" ? json.model : model,
				answers: toWireAnswers(json.answers, confidenceMap(json.providerMetadata)),
				usage: toTokenUsage(json.usage)
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
* Create a Vercel AI Gateway evaluate adapter with an explicit API key.
*
* @param model Evaluate model id. Use `typesafe-ai/jev`.
* @param apiKey Vercel AI Gateway API key.
* @param config Optional client config (`baseURL`, `httpReferer`, `xTitle`).
*
* @example
* ```ts
* const adapter = createVercelGatewayDecider('typesafe-ai/jev', 'vck_...')
* ```
*/
function createVercelGatewayDecider(model, apiKey, config) {
	return new VercelGatewayEvaluateAdapter({
		apiKey,
		...config
	}, model);
}
/**
* Create a Vercel AI Gateway evaluate adapter.
*
* Reads `AI_GATEWAY_API_KEY`, then `VERCEL_OIDC_TOKEN`.
*
* @param model Evaluate model id. Use `typesafe-ai/jev`.
* @param config Optional client config (`baseURL`, `httpReferer`, `xTitle`).
*
* @example
* ```ts
* import { decide, boolean } from '@tanstack/ai'
* import { vercelGatewayDecider } from '@tanstack/ai-vercel-gateway'
*
* const result = await decide({
*   adapter: vercelGatewayDecider('typesafe-ai/jev'),
*   state: ticket,
*   questions: {
*     refund: boolean({
*       instructions: 'Is the customer asking for a refund?',
*     }),
*   },
* })
* ```
*/
function vercelGatewayDecider(model, config) {
	return createVercelGatewayDecider(model, getVercelGatewayApiKeyFromEnv(), config);
}
//#endregion
export { VercelGatewayEvaluateAdapter, createVercelGatewayDecider, vercelGatewayDecider };

//# sourceMappingURL=evaluate.js.map