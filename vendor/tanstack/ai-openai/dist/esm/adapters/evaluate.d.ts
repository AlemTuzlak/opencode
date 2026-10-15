import { default as OpenAI } from 'openai';
import { BaseEvaluateAdapter, EvaluateOptions, WireAnswer } from '@tanstack/ai/adapters';
import { OpenAIClientConfig } from '../utils/client.js';
/** Models served by the OpenAI Decisions API. */
export declare const OPENAI_EVALUATE_MODELS: readonly ["gpt-6-luna"];
export type OpenAIEvaluateModel = (typeof OPENAI_EVALUATE_MODELS)[number] | (string & {});
/**
 * Configuration for OpenAI evaluate adapter
 */
export interface OpenAIEvaluateConfig extends OpenAIClientConfig {
}
/**
 * OpenAI evaluate adapter.
 *
 * Asks typed questions about a shared `state` through the OpenAI Decisions
 * API (`/v1/decisions`). Returns TypeSafe wire answers; `decide()` maps those
 * to the public shape.
 */
export declare class OpenAIEvaluateAdapter<TModel extends OpenAIEvaluateModel> extends BaseEvaluateAdapter<TModel> {
    readonly name: "openai";
    protected client: OpenAI;
    constructor(config: OpenAIEvaluateConfig, model: TModel);
    evaluate(options: EvaluateOptions): Promise<{
        model: string;
        answers: Record<string, WireAnswer>;
        usage: import('@tanstack/ai-event-client').TokenUsage<import('@tanstack/ai-event-client').ProviderUsageDetails>;
    }>;
}
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
export declare function createOpenaiDecider<TModel extends OpenAIEvaluateModel>(model: TModel, apiKey: string, config?: Omit<OpenAIEvaluateConfig, 'apiKey'>): OpenAIEvaluateAdapter<TModel>;
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
export declare function openaiDecider<TModel extends OpenAIEvaluateModel>(model: TModel, config?: Omit<OpenAIEvaluateConfig, 'apiKey'>): OpenAIEvaluateAdapter<TModel>;
