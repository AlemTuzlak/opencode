import { AIGatewayProviders } from '@cloudflare/workers-types';
import { CloudflareGatewayOptions } from './utils/config.js';
export interface CloudflareGatewayTarget extends Omit<CloudflareGatewayOptions, 'id'> {
    accountId: string;
    gatewayId: string;
    /** Cloudflare API token, needed when the gateway has authentication on. */
    cfApiKey?: string;
}
/**
 * Builds the `baseURL` and headers that point any provider adapter at that
 * provider's endpoint on your AI Gateway. Pass them through the adapter's
 * client options (`baseURL` + `defaultHeaders` for OpenAI-style SDKs).
 *
 * The headers carry the per-request `cf-aig-*` options plus
 * `cf-aig-authorization: Bearer <cfApiKey>` when `cfApiKey` is set. The
 * gateway id lives in the URL, so no `cf-aig-gateway-id` header is sent.
 *
 * @example
 * ```typescript
 * const gateway = cloudflareGateway('openai', { accountId, gatewayId: 'prod' })
 * const adapter = createOpenaiChat('gpt-5.5', process.env.OPENAI_API_KEY!, {
 *   baseURL: gateway.baseURL,
 *   defaultHeaders: gateway.headers,
 * })
 * ```
 */
export declare function cloudflareGateway(provider: AIGatewayProviders | 'compat' | (string & {}), target: CloudflareGatewayTarget): {
    baseURL: string;
    headers: Record<string, string>;
};
