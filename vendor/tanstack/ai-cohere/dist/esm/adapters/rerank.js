import { getCohereApiKeyFromEnv, resolveCohereTransport } from "../utils/client.js";
import { BaseRerankAdapter } from "@tanstack/ai/adapters";
//#region src/adapters/rerank.ts
function isCohereRerankResponse(value) {
	if (typeof value !== "object" || value === null) return false;
	const results = value.results;
	return Array.isArray(results) && results.every((r) => typeof r === "object" && r !== null && typeof r.index === "number" && typeof r.relevance_score === "number");
}
/**
* Cohere rerank adapter.
*
* Talks to Cohere's `/v2/rerank` endpoint over raw `fetch` — no SDK. Returns
* scored indices into the submitted documents; the `rerank()` activity maps
* those back to the caller's original documents.
*/
var CohereRerankAdapter = class extends BaseRerankAdapter {
	name = "cohere";
	apiKey;
	baseUrl;
	headers;
	constructor(config, model) {
		super({}, model);
		this.apiKey = config.apiKey;
		const transport = resolveCohereTransport(config);
		this.baseUrl = transport.baseUrl;
		this.headers = transport.headers;
	}
	async rerank(options) {
		const { model, query, documents, topN, modelOptions, abortSignal, logger } = options;
		const body = {
			model,
			query,
			documents
		};
		if (topN !== void 0) body["top_n"] = topN;
		if (modelOptions?.maxTokensPerDoc !== void 0) body["max_tokens_per_doc"] = modelOptions.maxTokensPerDoc;
		logger.request(`activity=rerank provider=${this.name} model=${model} documents=${documents.length}`, {
			provider: this.name,
			model
		});
		let response;
		try {
			response = await fetch(`${this.baseUrl}/v2/rerank`, {
				method: "POST",
				headers: {
					Authorization: `Bearer ${this.apiKey}`,
					"Content-Type": "application/json",
					...this.headers
				},
				body: JSON.stringify(body),
				...abortSignal ? { signal: abortSignal } : {}
			});
		} catch (error) {
			logger.errors(`${this.name}.rerank fatal`, {
				error,
				source: `${this.name}.rerank`
			});
			throw error;
		}
		if (!response.ok) {
			const detail = await response.text().catch(() => "");
			const error = /* @__PURE__ */ new Error(`Cohere rerank request failed: ${response.status} ${response.statusText}${detail ? ` — ${detail}` : ""}`);
			logger.errors(`${this.name}.rerank fatal`, {
				error,
				source: `${this.name}.rerank`
			});
			throw error;
		}
		const json = await response.json();
		if (!isCohereRerankResponse(json)) throw new Error("Cohere rerank response had an unexpected shape");
		const searchUnits = json.meta?.billed_units?.search_units;
		const usage = {
			promptTokens: 0,
			completionTokens: 0,
			totalTokens: 0,
			...searchUnits !== void 0 ? {
				billed: {
					quantity: searchUnits,
					unit: "units"
				},
				unitsBilled: searchUnits
			} : {}
		};
		return {
			id: json.id ?? this.generateId(),
			ranking: json.results.map((r) => ({
				index: r.index,
				score: r.relevance_score
			})),
			usage
		};
	}
};
/**
* Creates a Cohere rerank adapter with an explicit API key. Type resolution
* (per-model provider options) happens here at the call site.
*
* @example
* ```typescript
* const adapter = createCohereRerank('rerank-v3.5', 'co-...')
* ```
*/
function createCohereRerank(model, apiKey, config) {
	return new CohereRerankAdapter({
		apiKey,
		...config
	}, model);
}
/**
* Creates a Cohere rerank adapter, reading `COHERE_API_KEY` from the
* environment.
*
* @throws Error if `COHERE_API_KEY` is not found.
*
* @example
* ```typescript
* import { rerank } from '@tanstack/ai'
* import { cohereRerank } from '@tanstack/ai-cohere'
*
* const { rerankedDocuments } = await rerank({
*   adapter: cohereRerank('rerank-v3.5'),
*   query: 'talk about rain',
*   documents: ['sunny day', 'rainy afternoon'],
* })
* ```
*/
function cohereRerank(model, config) {
	return createCohereRerank(model, getCohereApiKeyFromEnv(), config);
}
//#endregion
export { CohereRerankAdapter, cohereRerank, createCohereRerank };

//# sourceMappingURL=rerank.js.map