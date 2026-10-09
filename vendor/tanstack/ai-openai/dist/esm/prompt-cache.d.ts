import { ResolvedPromptCache } from '@tanstack/ai';
/**
 * Cut a cache key to 64 characters, the most OpenAI accepts. It counts code
 * points, so an emoji or a CJK character is never cut in half.
 */
export declare function clampPromptCacheKey(key: string | undefined): string | undefined;
/**
 * The prompt cache fields of a Responses request.
 *
 * - `explicitMode`: the model takes `prompt_cache_options` in place of
 *   `prompt_cache_retention` (see `openAIModelUsesExplicitPromptCache`).
 * - `longRetention`: the endpoint keeps a cache for longer than a few minutes.
 */
export declare function responsesPromptCacheFields(promptCache: ResolvedPromptCache | undefined, flags: {
    explicitMode: boolean;
    longRetention: boolean;
}): Record<string, unknown>;
/**
 * The prompt cache fields of a Chat Completions request.
 *
 * A short retention sends the key only to `api.openai.com`, because another
 * server can reject a field it does not know. A long retention sends the key
 * and `24h` when `longRetention` is true.
 */
export declare function chatPromptCacheFields(promptCache: ResolvedPromptCache | undefined, flags: {
    baseURL: string;
    longRetention: boolean;
}): Record<string, unknown>;
