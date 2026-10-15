import { PerplexitySearchClient } from "./client.js";
import { toolDefinition } from "@tanstack/ai";
import { z } from "zod";
//#region src/search/tool.ts
var searchRecency = z.enum([
	"hour",
	"day",
	"week",
	"month",
	"year"
]);
var inputSchema = z.object({
	query: z.string().min(1).describe("The search query string."),
	max_results: z.number().int().min(1).max(20).optional().describe("Maximum number of results to return. Defaults to defaultMaxResults when configured, otherwise the API default (10)."),
	search_domain_filter: z.array(z.string()).max(20).optional().describe("Restrict results by domain (max 20). Use bare hostnames to allowlist (e.g. [\"nytimes.com\"]) or \"-domain.com\" to denylist. Allow and deny entries must NOT be mixed."),
	search_recency_filter: searchRecency.optional().describe("Only include results from the given recency window."),
	search_after_date_filter: z.string().optional().describe("Only include results published on or after this date (m/d/yyyy)."),
	search_before_date_filter: z.string().optional().describe("Only include results published on or before this date (m/d/yyyy).")
});
var outputSchema = z.object({ results: z.array(z.object({
	title: z.string(),
	url: z.string(),
	snippet: z.string(),
	date: z.string().optional(),
	last_updated: z.string().optional()
})) });
/**
* Build a TanStack AI tool that performs real-time web search via Perplexity.
*
* Returns `{ results: Array<{ title, url, snippet, date?, last_updated? }> }`
* for citation/grounding in an LLM agent loop.
*
* @example
* ```ts
* import { chat } from '@tanstack/ai'
* import { openaiText } from '@tanstack/ai-openai'
* import { perplexitySearchTool } from '@tanstack/ai-perplexity'
*
* const search = perplexitySearchTool({ defaultMaxResults: 5 })
* chat({ adapter: openaiText('gpt-5.2'), tools: [search], messages })
* ```
*/
function perplexitySearchTool(config = {}) {
	const { name, description, defaultMaxResults, ...clientConfig } = config;
	if (defaultMaxResults !== void 0 && (!Number.isInteger(defaultMaxResults) || defaultMaxResults < 1 || defaultMaxResults > 20)) throw new Error("defaultMaxResults must be an integer between 1 and 20.");
	let client = null;
	const getClient = () => {
		if (!client) client = new PerplexitySearchClient(clientConfig);
		return client;
	};
	return toolDefinition({
		name: name ?? "perplexity_search",
		description: description ?? "Search the web for up-to-date information using the Perplexity Search API. Returns a ranked list of web results with titles, URLs, snippets, and optional publication dates.",
		inputSchema,
		outputSchema
	}).server(async (args, ctx) => {
		return { results: (await getClient().search({
			query: args.query,
			max_results: args.max_results ?? defaultMaxResults,
			search_domain_filter: args.search_domain_filter,
			search_recency_filter: args.search_recency_filter,
			search_after_date_filter: args.search_after_date_filter,
			search_before_date_filter: args.search_before_date_filter
		}, { signal: ctx?.abortSignal })).results.map((result) => ({
			title: result.title,
			url: result.url,
			snippet: result.snippet,
			...result.date ? { date: result.date } : {},
			...result.last_updated ? { last_updated: result.last_updated } : {}
		})) };
	});
}
//#endregion
export { perplexitySearchTool };

//# sourceMappingURL=tool.js.map