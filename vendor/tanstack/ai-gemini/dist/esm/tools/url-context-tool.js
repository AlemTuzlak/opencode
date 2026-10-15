import { brandGeminiProviderTool } from "./gemini-provider-tool.js";
//#region src/tools/url-context-tool.ts
function convertUrlContextToolToAdapterFormat(_tool) {
	return { urlContext: {} };
}
function urlContextTool() {
	return brandGeminiProviderTool({
		name: "url_context",
		description: "",
		metadata: {}
	}, "url_context");
}
//#endregion
export { convertUrlContextToolToAdapterFormat, urlContextTool };

//# sourceMappingURL=url-context-tool.js.map