import { z } from 'zod';
import { PerplexitySearchClientConfig } from './client.js';
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
export declare function perplexitySearchTool(config?: PerplexitySearchClientConfig & {
    /** Override the tool name (defaults to `perplexity_search`). */
    name?: string;
    /** Override the tool description shown to the model. */
    description?: string;
    /** Default max_results applied when the model does not provide one. */
    defaultMaxResults?: number;
}): import('@tanstack/ai').ServerTool<z.ZodObject<{
    query: z.ZodString;
    max_results: z.ZodOptional<z.ZodNumber>;
    search_domain_filter: z.ZodOptional<z.ZodArray<z.ZodString>>;
    search_recency_filter: z.ZodOptional<z.ZodEnum<{
        hour: "hour";
        day: "day";
        week: "week";
        month: "month";
        year: "year";
    }>>;
    search_after_date_filter: z.ZodOptional<z.ZodString>;
    search_before_date_filter: z.ZodOptional<z.ZodString>;
}, z.core.$strip>, z.ZodObject<{
    results: z.ZodArray<z.ZodObject<{
        title: z.ZodString;
        url: z.ZodString;
        snippet: z.ZodString;
        date: z.ZodOptional<z.ZodString>;
        last_updated: z.ZodOptional<z.ZodString>;
    }, z.core.$strip>>;
}, z.core.$strip>, string, unknown, false, undefined> & {
    inputSchema: z.ZodObject<{
        query: z.ZodString;
        max_results: z.ZodOptional<z.ZodNumber>;
        search_domain_filter: z.ZodOptional<z.ZodArray<z.ZodString>>;
        search_recency_filter: z.ZodOptional<z.ZodEnum<{
            hour: "hour";
            day: "day";
            week: "week";
            month: "month";
            year: "year";
        }>>;
        search_after_date_filter: z.ZodOptional<z.ZodString>;
        search_before_date_filter: z.ZodOptional<z.ZodString>;
    }, z.core.$strip>;
    outputSchema: z.ZodObject<{
        results: z.ZodArray<z.ZodObject<{
            title: z.ZodString;
            url: z.ZodString;
            snippet: z.ZodString;
            date: z.ZodOptional<z.ZodString>;
            last_updated: z.ZodOptional<z.ZodString>;
        }, z.core.$strip>>;
    }, z.core.$strip>;
    approvalSchema: undefined;
};
