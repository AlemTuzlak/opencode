import { getPerplexityApiKeyFromEnv } from "../utils/api-key.js";
import { getPerplexityIntegrationHeaders } from "../utils/attribution.js";
//#region src/search/client.ts
var DEFAULT_BASE_URL = "https://api.perplexity.ai";
var MAX_QUERY_BATCH = 5;
var MAX_DOMAIN_FILTER = 20;
/**
* Low-level HTTP client for the Perplexity Search API.
*
* Calls `POST {baseURL}/search` with bearer auth.
*/
var PerplexitySearchClient = class {
	apiKey;
	baseURL;
	fetchImpl;
	constructor(config = {}) {
		const { apiKey } = config;
		const resolvedApiKey = typeof apiKey === "string" && apiKey.trim().length > 0 ? apiKey : getPerplexityApiKeyFromEnv();
		this.apiKey = resolvedApiKey;
		this.baseURL = (config.baseURL ?? DEFAULT_BASE_URL).replace(/\/$/, "");
		this.fetchImpl = config.fetch ?? globalThis.fetch;
	}
	async search(request, init = {}) {
		const query = normalizeQuery(request.query);
		validateDomainFilter(request.search_domain_filter);
		const body = { query };
		if (request.max_results !== void 0) body.max_results = requireMaxResults(request.max_results);
		if (request.max_tokens_per_page !== void 0) body.max_tokens_per_page = request.max_tokens_per_page;
		if (request.search_domain_filter) body.search_domain_filter = request.search_domain_filter;
		if (request.search_recency_filter) body.search_recency_filter = request.search_recency_filter;
		if (request.search_after_date_filter) body.search_after_date_filter = request.search_after_date_filter;
		if (request.search_before_date_filter) body.search_before_date_filter = request.search_before_date_filter;
		const response = await this.fetchImpl(`${this.baseURL}/search`, {
			method: "POST",
			headers: {
				Authorization: `Bearer ${this.apiKey}`,
				"Content-Type": "application/json",
				Accept: "application/json",
				...getPerplexityIntegrationHeaders()
			},
			body: JSON.stringify(body),
			signal: init.signal
		});
		if (!response.ok) {
			const text = await safeReadText(response);
			throw new Error(`Perplexity Search API request failed: ${response.status} ${response.statusText}${text ? ` — ${text}` : ""}`);
		}
		return parseSearchResponse(await response.json());
	}
};
function normalizeQuery(query) {
	if (typeof query === "string") {
		const trimmed = query.trim();
		if (trimmed.length === 0) throw new Error("PerplexitySearchClient.search requires a non-empty `query`.");
		return trimmed;
	}
	if (query.length === 0) throw new Error("PerplexitySearchClient.search requires a non-empty `query`.");
	if (query.length > MAX_QUERY_BATCH) throw new Error(`query array must contain at most ${MAX_QUERY_BATCH} entries.`);
	return query.map((entry) => {
		if (typeof entry !== "string" || entry.trim().length === 0) throw new Error("PerplexitySearchClient.search requires a non-empty `query`.");
		return entry.trim();
	});
}
function requireMaxResults(maxResults) {
	if (!Number.isInteger(maxResults) || maxResults < 1 || maxResults > 20) throw new Error("max_results must be an integer between 1 and 20.");
	return maxResults;
}
function validateDomainFilter(filter) {
	if (!filter || filter.length === 0) return;
	if (filter.length > MAX_DOMAIN_FILTER) throw new Error(`search_domain_filter must contain at most ${MAX_DOMAIN_FILTER} entries.`);
	let hasAllow = false;
	let hasDeny = false;
	for (const entry of filter) {
		if (typeof entry !== "string" || entry.length === 0) continue;
		if (entry.startsWith("-")) hasDeny = true;
		else hasAllow = true;
	}
	if (hasAllow && hasDeny) throw new Error("search_domain_filter cannot mix allowlist and denylist entries. Use only `-domain.com` for negation, or only bare domains for allowlist.");
}
function isSearchResult(value) {
	if (typeof value !== "object" || value === null) return false;
	const result = value;
	return typeof result.title === "string" && typeof result.url === "string" && typeof result.snippet === "string" && (result.date === void 0 || result.date === null || typeof result.date === "string") && (result.last_updated === void 0 || result.last_updated === null || typeof result.last_updated === "string");
}
function parseSearchResponse(value) {
	if (typeof value !== "object" || value === null) throw new Error("Perplexity Search API returned an invalid response.");
	const data = value;
	if (!Array.isArray(data.results) || !data.results.every(isSearchResult)) throw new Error("Perplexity Search API returned an invalid response.");
	return {
		...typeof data.id === "string" ? { id: data.id } : {},
		results: data.results.map((result) => ({
			title: result.title,
			url: result.url,
			snippet: result.snippet,
			...result.date ? { date: result.date } : {},
			...result.last_updated ? { last_updated: result.last_updated } : {}
		}))
	};
}
async function safeReadText(response) {
	try {
		return await response.text();
	} catch {
		return "";
	}
}
//#endregion
export { PerplexitySearchClient };

//# sourceMappingURL=client.js.map