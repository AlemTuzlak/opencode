import { ConverseCommandInput } from '@aws-sdk/client-bedrock-runtime';
import { ResolvedPromptCache } from '@tanstack/ai';
/**
 * Add the automatic Bedrock cache points for `chat({ promptCache })` (pi's
 * rule). Only Claude models get them. When the request already has a manual
 * cache point (system, message, or tool), the caller owns caching and the
 * request does not change. Otherwise:
 * - one cache point goes at the end of `system`, when there is a system prompt.
 * - one cache point goes at the end of the last message, when its role is
 *   `user`.
 *
 * `'long'` asks for the 1-hour TTL. Bedrock has no cache key, so `key` is not
 * used. The function returns a new input and does not change the arrays of
 * `input`.
 */
export declare function addPromptCachePoints(model: string, input: ConverseCommandInput, promptCache: ResolvedPromptCache | undefined): ConverseCommandInput;
