import { brandGeminiProviderTool, getGeminiProviderToolMetadata } from "./gemini-provider-tool.js";
//#region src/tools/google-search-retriveal-tool.ts
function convertGoogleSearchRetrievalToolToAdapterFormat(tool) {
	return { googleSearchRetrieval: getGeminiProviderToolMetadata(tool) };
}
function googleSearchRetrievalTool(config) {
	return brandGeminiProviderTool({
		name: "google_search_retrieval",
		description: "",
		metadata: config
	}, "google_search_retrieval");
}
//#endregion
export { convertGoogleSearchRetrievalToolToAdapterFormat, googleSearchRetrievalTool };

//# sourceMappingURL=google-search-retriveal-tool.js.map