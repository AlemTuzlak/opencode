//#region src/prompts.ts
/**
* Convert an MCP GetPromptResult into an array of ModelMessages suitable for
* passing to `chat()` or any TanStack AI adapter.
*
* @param prompt - An object with a `messages` array as returned by the MCP
*   `prompts/get` endpoint.
* @returns An array of {@link ModelMessage} values.
*/
function mcpPromptToMessages(prompt) {
	return prompt.messages.map((m) => {
		return {
			role: m.role === "assistant" ? "assistant" : "user",
			content: m.content?.type === "text" && m.content.text !== void 0 ? m.content.text : JSON.stringify(m.content ?? null)
		};
	});
}
//#endregion
export { mcpPromptToMessages };

//# sourceMappingURL=prompts.js.map