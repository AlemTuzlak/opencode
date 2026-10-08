//#region src/utilities/provider-executed.ts
/**
* Narrow a tool call's opaque `metadata` to the provider-executed convention.
* Returns the typed metadata when the call is provider-executed, else `null`.
*
* @see ProviderExecutedToolMetadata
*/
function getProviderExecutedMetadata(toolCall) {
	const metadata = toolCall?.metadata;
	if (typeof metadata === "object" && metadata !== null && metadata.providerExecuted === true) return metadata;
	return null;
}
/**
* True when a tool call was executed by the provider (e.g. Anthropic
* `web_search` / `web_fetch` server tools) rather than the agent loop. Such
* calls must not be routed to client-side execution and are already "complete".
*/
function isProviderExecutedToolCall(toolCall) {
	return getProviderExecutedMetadata(toolCall) !== null;
}
/**
* True when `id` is a `${parentId}-segment-${n}` message. The wire and the
* run loop split one provider turn into segments at thinking that follows a
* provider-executed tool call, to keep signed thinking order. Readers fold a
* segment back into its parent so the UI still shows one message.
*/
function isAssistantSegmentOf(id, parentId) {
	return id?.startsWith(`${parentId}-segment-`) === true;
}
//#endregion
export { getProviderExecutedMetadata, isAssistantSegmentOf, isProviderExecutedToolCall };

//# sourceMappingURL=provider-executed.js.map