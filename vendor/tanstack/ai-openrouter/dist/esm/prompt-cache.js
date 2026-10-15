//#region src/prompt-cache.ts
/** True when one of the items already has a cache marker. */
function hasMarker(items) {
	return items?.some((item) => "cacheControl" in item) ?? false;
}
/**
* Put the marker on the last text block that is not empty. A string becomes
* one text block. An empty string does not change.
*/
function markLastText(content, cacheControl) {
	if (typeof content === "string") return content === "" ? content : [{
		type: "text",
		text: content,
		cacheControl
	}];
	const index = content.findLastIndex((part) => part.type === "text" && "text" in part && part.text !== "");
	return content.map((part, i) => i === index ? {
		...part,
		cacheControl
	} : part);
}
/** Put the marker on the last text block of one message. */
function markMessage(message, cacheControl) {
	switch (message.role) {
		case "system": return {
			...message,
			content: markLastText(message.content, cacheControl)
		};
		case "user":
		case "tool": return {
			...message,
			content: markLastText(message.content, cacheControl)
		};
		case "assistant": return typeof message.content === "string" ? {
			...message,
			content: markLastText(message.content, cacheControl)
		} : message;
		case "developer": return message;
	}
}
/**
* Add the automatic prompt cache fields for `chat({ promptCache })` to an
* OpenRouter chat request.
*
* - The cache key becomes `sessionId` on every model, so OpenRouter sends the
*   requests of one session to the same provider. A `sessionId` from
*   `modelOptions` wins.
* - Only `anthropic/*` models get cache markers, and only when the request
*   has no manual marker (system prompt, tool, or content block). Then the
*   system message, the last function tool, and the last message each get a
*   marker on their last text block.
*
* `'none'` returns the request with no change. `'long'` asks for the 1-hour
* TTL. The function returns a new request and does not change `request`.
*/
function addPromptCacheMarkers(request, promptCache) {
	if (promptCache.retention === "none") return request;
	const key = promptCache.key && Array.from(promptCache.key).slice(0, 256).join("");
	const sessionId = request.sessionId ?? key;
	const withSession = {
		...request,
		...sessionId && { sessionId }
	};
	const isClaude = request.model?.startsWith("anthropic/") ?? false;
	const hasManualMarker = hasMarker(request.tools) || request.messages.some((message) => Array.isArray(message.content) && hasMarker(message.content));
	if (!isClaude || hasManualMarker) return withSession;
	const cacheControl = promptCache.retention === "long" ? {
		type: "ephemeral",
		ttl: "1h"
	} : { type: "ephemeral" };
	const lastMessage = request.messages.length - 1;
	const lastTool = request.tools?.findLastIndex((tool) => tool.type === "function") ?? -1;
	return {
		...withSession,
		messages: request.messages.map((message, i) => message.role === "system" || i === lastMessage ? markMessage(message, cacheControl) : message),
		...request.tools && { tools: request.tools.map((tool, i) => i === lastTool ? {
			...tool,
			cacheControl
		} : tool) }
	};
}
//#endregion
export { addPromptCacheMarkers };

//# sourceMappingURL=prompt-cache.js.map