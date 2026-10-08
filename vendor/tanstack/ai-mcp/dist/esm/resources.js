//#region src/resources.ts
/**
* Converts a single MCP resource content block to a TanStack `ContentPart`.
*
* - `text` field present → `{ type: 'text', content: text }`
* - `blob` field present → `{ type: 'text', content: '[binary resource <uri>]' }`
* - otherwise          → `{ type: 'text', content: JSON.stringify(content) }`
*/
function mcpResourceToContentPart(content) {
	if (typeof content.text === "string") return {
		type: "text",
		content: content.text
	};
	if (typeof content.blob === "string") return {
		type: "text",
		content: `[binary resource ${content.uri ?? ""}]`
	};
	return {
		type: "text",
		content: JSON.stringify(content)
	};
}
//#endregion
export { mcpResourceToContentPart };

//# sourceMappingURL=resources.js.map