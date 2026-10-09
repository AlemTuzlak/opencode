import { ProviderExecutedToolMetadata } from '../types.js';
/**
 * Narrow a tool call's opaque `metadata` to the provider-executed convention.
 * Returns the typed metadata when the call is provider-executed, else `null`.
 *
 * @see ProviderExecutedToolMetadata
 */
export declare function getProviderExecutedMetadata(toolCall: {
    metadata?: unknown;
} | null | undefined): ProviderExecutedToolMetadata | null;
/**
 * True when a tool call was executed by the provider (e.g. Anthropic
 * `web_search` / `web_fetch` server tools) rather than the agent loop. Such
 * calls must not be routed to client-side execution and are already "complete".
 */
export declare function isProviderExecutedToolCall(toolCall: {
    metadata?: unknown;
} | null | undefined): boolean;
/**
 * True when `id` is a `${parentId}-segment-${n}` message. The wire and the
 * run loop split one provider turn into segments at thinking that follows a
 * provider-executed tool call, to keep signed thinking order. Readers fold a
 * segment back into its parent so the UI still shows one message.
 */
export declare function isAssistantSegmentOf(id: string | undefined, parentId: string): boolean;
