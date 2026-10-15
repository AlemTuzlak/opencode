import { brandGeminiProviderTool, getGeminiProviderToolMetadata } from "./gemini-provider-tool.js";
//#region src/tools/google-search-tool.ts
function convertGoogleSearchToolToAdapterFormat(tool) {
	return { googleSearch: getGeminiProviderToolMetadata(tool) };
}
function googleSearchTool(config) {
	return brandGeminiProviderTool({
		name: "google_search",
		description: "",
		metadata: config
	}, "google_search");
}
//#endregion
export { convertGoogleSearchToolToAdapterFormat, googleSearchTool };

//# sourceMappingURL=google-search-tool.js.map