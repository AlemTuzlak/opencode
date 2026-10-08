import { ResolvedPromptCache } from '@tanstack/ai';
import { InternalTextProviderOptions } from './text/text-provider-options.js';
/**
 * The block types that can take the automatic cache marker when they are
 * the last block of the last user message, or of a mid-conversation
 * `system` message at the end.
 */
export declare const ANTHROPIC_CACHEABLE_BLOCK_TYPES: ReadonlySet<string>;
/**
 * The name of the deferred placeholder tool of mid-conversation tool mode.
 * The text adapter puts it on the placeholder, and the cache markers find
 * the placeholder by it.
 */
export declare const ANTHROPIC_DEFERRED_TOOL_PLACEHOLDER_NAME = "__tanstack_deferred_placeholder__";
/**
 * Adds Anthropic cache markers to a Messages request, so a later request
 * with the same start reads it from the cache.
 *
 * It adds nothing when `promptCache` is absent or `'none'`, or when the
 * request already has a marker of the caller's (on a system block, a message
 * block, a tool, or the top-level `cache_control`). Otherwise it marks, with
 * at most 4 markers:
 * 1. the last tool. In mid-conversation tool mode (the tools hold the
 *    placeholder), the last start tool, right before the placeholder,
 * 2. the last block of the last message, when it is a user message or a
 *    mid-conversation `system` message and the block type is in
 *    {@link ANTHROPIC_CACHEABLE_BLOCK_TYPES},
 * 3. the system blocks from the end, with the markers that are left.
 *
 * It does not change the request it gets. It returns a new request, or the
 * same request when it adds nothing.
 *
 * @param request - The finished Messages request.
 * @param promptCache - The `promptCache` that `chat()` resolved.
 *
 * @example
 * const body = applyAnthropicPromptCache(request, { retention: 'short' })
 */
export declare function applyAnthropicPromptCache(request: InternalTextProviderOptions, promptCache: ResolvedPromptCache | undefined): InternalTextProviderOptions;
