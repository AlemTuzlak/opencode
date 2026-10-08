import { brandProviderTool } from "@tanstack/ai";
//#region src/tools/gemini-provider-tool.ts
var GEMINI_PROVIDER_TOOL_KINDS = {
	code_execution: "gemini.code_execution",
	computer_use: "gemini.computer_use",
	file_search: "gemini.file_search",
	google_maps: "gemini.google_maps",
	google_search: "gemini.google_search",
	google_search_retrieval: "gemini.google_search_retrieval",
	url_context: "gemini.url_context"
};
function brandGeminiProviderTool(tool, toolKind) {
	return brandProviderTool({
		...tool,
		metadata: {
			...tool.metadata,
			__kind: GEMINI_PROVIDER_TOOL_KINDS[toolKind]
		}
	});
}
function getGeminiProviderToolKind(tool) {
	switch (tool.metadata?.["__kind"]) {
		case "gemini.code_execution": return "code_execution";
		case "gemini.computer_use": return "computer_use";
		case "gemini.file_search": return "file_search";
		case "gemini.google_maps": return "google_maps";
		case "gemini.google_search": return "google_search";
		case "gemini.google_search_retrieval": return "google_search_retrieval";
		case "gemini.url_context": return "url_context";
		default: return;
	}
}
/** Returns adapter metadata without the internal runtime discriminator. */
function getGeminiProviderToolMetadata(tool) {
	if (!tool.metadata) return;
	const { __kind: _kind, ...metadata } = tool.metadata;
	return metadata;
}
//#endregion
export { brandGeminiProviderTool, getGeminiProviderToolKind, getGeminiProviderToolMetadata };

//# sourceMappingURL=gemini-provider-tool.js.map