import { BaseEvaluateAdapter, EvaluateAdapterResult, EvaluateOptions } from '@tanstack/ai/adapters';
import { VercelGatewayClientConfig } from '../utils/client.js';
import { VercelGatewayRoutingOptions } from '../text/text-provider-options.js';
export interface VercelGatewayEvaluateConfig extends VercelGatewayClientConfig {
}
export type VercelGatewayEvaluateModel = 'typesafe-ai/jev';
export type VercelGatewayEvaluateProviderOptions = Record<string, unknown> & {
    gateway?: VercelGatewayRoutingOptions;
};
/**
 * Vercel AI Gateway evaluate adapter.
 *
 * Talks to `POST /v4/ai/evaluation-model` with `fetch`. Jev is not a chat
 * model; this adapter does not use `/v1/chat/completions`.
 */
export declare class VercelGatewayEvaluateAdapter<TModel extends VercelGatewayEvaluateModel> extends BaseEvaluateAdapter<TModel, VercelGatewayEvaluateProviderOptions> {
    readonly name: "vercel-gateway";
    private readonly apiKey;
    private readonly evaluateUrl;
    private readonly extraHeaders;
    constructor(config: VercelGatewayEvaluateConfig, model: TModel);
    evaluate(options: EvaluateOptions<VercelGatewayEvaluateProviderOptions>): Promise<EvaluateAdapterResult>;
}
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
export declare function createVercelGatewayDecider<TModel extends VercelGatewayEvaluateModel>(model: TModel, apiKey: string, config?: Omit<VercelGatewayEvaluateConfig, 'apiKey'>): VercelGatewayEvaluateAdapter<TModel>;
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
export declare function vercelGatewayDecider<TModel extends VercelGatewayEvaluateModel>(model: TModel, config?: Omit<VercelGatewayEvaluateConfig, 'apiKey'>): VercelGatewayEvaluateAdapter<TModel>;
