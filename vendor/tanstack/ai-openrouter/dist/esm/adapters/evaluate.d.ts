import { BaseEvaluateAdapter, EvaluateOptions, WireAnswer } from '@tanstack/ai/adapters';
import { OpenRouterClientConfig } from '../utils/client.js';
import { OpenRouterEvaluateModel, OpenRouterEvaluateProviderOptions } from '../evaluate/evaluate-provider-options.js';
export interface OpenRouterEvaluateConfig extends OpenRouterClientConfig {
}
/**
 * OpenRouter evaluate adapter.
 *
 * Asks typed questions about a shared `state` through OpenRouter's
 * `/api/alpha/decisions` endpoint. Jev is not a chat model. Returns TypeSafe
 * wire answers; `decide()` maps those to the public shape.
 */
export declare class OpenRouterEvaluateAdapter<TModel extends OpenRouterEvaluateModel> extends BaseEvaluateAdapter<TModel, OpenRouterEvaluateProviderOptions> {
    readonly name: "openrouter";
    private readonly clientConfig;
    constructor(config: OpenRouterEvaluateConfig, model: TModel);
    evaluate(options: EvaluateOptions<OpenRouterEvaluateProviderOptions>): Promise<{
        provider?: string | undefined;
        id?: string | undefined;
        model: string;
        answers: Record<string, WireAnswer>;
        usage: import('@tanstack/ai-event-client').TokenUsage<import('@tanstack/ai-event-client').ProviderUsageDetails>;
    }>;
}
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
export declare function createOpenRouterDecider<TModel extends OpenRouterEvaluateModel>(model: TModel, apiKey: string, config?: Omit<OpenRouterEvaluateConfig, 'apiKey'>): OpenRouterEvaluateAdapter<TModel>;
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
export declare function openRouterDecider<TModel extends OpenRouterEvaluateModel>(model: TModel, config?: Omit<OpenRouterEvaluateConfig, 'apiKey'>): OpenRouterEvaluateAdapter<TModel>;
