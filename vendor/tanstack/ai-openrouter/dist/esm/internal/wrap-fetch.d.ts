import { OpenRouter, SDKOptions } from '@openrouter/sdk';
import { FetchWrapper } from '@tanstack/ai';
/**
 * Give the client for one call. With `wrapFetch`, it is a new client whose
 * requests go through the wrapper. The base fetch is the config's own HTTP
 * client, so its hooks and its fetcher still run.
 */
export declare function clientForCall(client: OpenRouter, options: SDKOptions, wrapFetch: FetchWrapper | undefined): OpenRouter;
