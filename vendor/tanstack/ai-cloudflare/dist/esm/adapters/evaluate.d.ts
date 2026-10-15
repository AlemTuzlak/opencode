import { BaseEvaluateAdapter, EvaluateOptions, WireAnswer } from '@tanstack/ai/adapters';
import { CloudflareConfig, CloudflareConfigInput } from '../utils/config.js';
import { CloudflareEvaluateModel } from '../utils/models.js';
/**
 * Cloudflare evaluate adapter. Runs TypeSafe Jev (`typesafe/jev`) through
 * Workers AI (`{ state, questions }` in, `{ model, answers, usage }` out)
 * through the binding or the REST API.
 */
export declare class CloudflareEvaluateAdapter<TModel extends CloudflareEvaluateModel> extends BaseEvaluateAdapter<TModel> {
    private readonly cfConfig;
    readonly name: "cloudflare";
    constructor(cfConfig: CloudflareConfig, model: TModel);
    evaluate(options: EvaluateOptions): Promise<{
        model: string;
        answers: Record<string, WireAnswer>;
        usage: import('@tanstack/ai-event-client').TokenUsage<import('@tanstack/ai-event-client').ProviderUsageDetails>;
    }>;
}
/**
 * Creates a Cloudflare evaluate adapter with explicit configuration.
 *
 * @example
 * ```typescript
 * // Inside a Worker
 * const adapter = createCloudflareDecider('typesafe/jev', { binding: env.AI })
 * // Anywhere, over REST
 * const adapter = createCloudflareDecider('typesafe/jev', { accountId, apiKey })
 * ```
 */
export declare function createCloudflareDecider<TModel extends CloudflareEvaluateModel>(model: TModel, config: CloudflareConfig): CloudflareEvaluateAdapter<TModel>;
/**
 * Creates a Cloudflare evaluate adapter, reading `CLOUDFLARE_ACCOUNT_ID` and
 * `CLOUDFLARE_API_TOKEN` from the environment unless a binding is passed.
 */
export declare function cloudflareDecider<TModel extends CloudflareEvaluateModel>(model: TModel, config?: CloudflareConfigInput): CloudflareEvaluateAdapter<TModel>;
