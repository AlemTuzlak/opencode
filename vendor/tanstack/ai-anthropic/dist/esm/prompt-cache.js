//#region src/prompt-cache.ts
/**
* The block types that can take the automatic cache marker when they are
* the last block of the last user message, or of a mid-conversation
* `system` message at the end.
*/
var ANTHROPIC_CACHEABLE_BLOCK_TYPES = /* @__PURE__ */ new Set([
	"text",
	"image",
	"document",
	"tool_result",
	"tool_addition",
	"tool_removal"
]);
/**
* The name of the deferred placeholder tool of mid-conversation tool mode.
* The text adapter puts it on the placeholder, and the cache markers find
* the placeholder by it.
*/
var ANTHROPIC_DEFERRED_TOOL_PLACEHOLDER_NAME = "__tanstack_deferred_placeholder__";
var MAX_CACHE_MARKERS = 4;
function hasCacheControl(item) {
	return "cache_control" in item && item.cache_control != null;
}
function blockHasCacheControl(block) {
	const isMarkedToolResult = block.type === "tool_result" && Array.isArray(block.content) && block.content.some(hasCacheControl);
	return hasCacheControl(block) || isMarkedToolResult;
}
function hasManualCacheControl(request) {
	const systemBlocks = Array.isArray(request.system) ? request.system : [];
	const tools = request.tools ?? [];
	const hasMessageMarker = request.messages.some((message) => Array.isArray(message.content) && message.content.some(blockHasCacheControl));
	return request.cache_control != null || systemBlocks.some(hasCacheControl) || tools.some(hasCacheControl) || hasMessageMarker;
}
function withCacheControl(item, cacheControl) {
	return {
		...item,
		cache_control: cacheControl
	};
}
/**
* The messages with a marker on the last block of the last message. Returns
* `null` when that message is not from the user or a mid-conversation
* `system` message, or when its last block cannot take a marker. A
* mid-conversation effort message at the end has no blocks, so the marker
* goes on the message before it (pi 0.87.1 marks before it adds them).
*/
function markLastUserMessage(messages, cacheControl) {
	const tail = messages.at(-1);
	const end = tail !== void 0 && "output_config" in tail ? messages.length - 1 : messages.length;
	const last = messages[end - 1];
	const role = last?.role;
	if (last === void 0 || role !== "user" && role !== "system") return null;
	const blocks = typeof last.content !== "string" ? last.content : last.content ? [{
		type: "text",
		text: last.content
	}] : [];
	const lastBlock = blocks.at(-1);
	if (lastBlock === void 0 || !ANTHROPIC_CACHEABLE_BLOCK_TYPES.has(lastBlock.type)) return null;
	return [
		...messages.slice(0, end - 1),
		{
			...last,
			content: [...blocks.slice(0, -1), withCacheControl(lastBlock, cacheControl)]
		},
		...messages.slice(end)
	];
}
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
function applyAnthropicPromptCache(request, promptCache) {
	const retention = promptCache?.retention ?? "none";
	if (retention === "none" || hasManualCacheControl(request)) return request;
	const cacheControl = retention === "long" ? {
		type: "ephemeral",
		ttl: "1h"
	} : { type: "ephemeral" };
	const placeholder = request.tools?.findIndex((tool) => tool.name === "__tanstack_deferred_placeholder__") ?? -1;
	const tools = request.tools?.map((tool, index, all) => index === (placeholder > 0 ? placeholder - 1 : all.length - 1) ? withCacheControl(tool, cacheControl) : tool);
	const messages = markLastUserMessage(request.messages, cacheControl);
	const usedMarkers = (tools?.length ? 1 : 0) + (messages ? 1 : 0);
	const systemBlocks = typeof request.system !== "string" ? request.system ?? [] : request.system ? [{
		type: "text",
		text: request.system
	}] : [];
	const firstMarkedSystem = systemBlocks.length - (MAX_CACHE_MARKERS - usedMarkers);
	const system = systemBlocks.map((block, index) => index >= firstMarkedSystem ? withCacheControl(block, cacheControl) : block);
	return {
		...request,
		...tools && { tools },
		...system.length > 0 && { system },
		...messages && { messages }
	};
}
//#endregion
export { ANTHROPIC_CACHEABLE_BLOCK_TYPES, ANTHROPIC_DEFERRED_TOOL_PLACEHOLDER_NAME, applyAnthropicPromptCache };

//# sourceMappingURL=prompt-cache.js.map