import { brandGeminiProviderTool, getGeminiProviderToolMetadata } from "./gemini-provider-tool.js";
//#region src/tools/google-maps-tool.ts
function convertGoogleMapsToolToAdapterFormat(tool) {
	return { googleMaps: getGeminiProviderToolMetadata(tool) };
}
function googleMapsTool(config) {
	return brandGeminiProviderTool({
		name: "google_maps",
		description: "",
		metadata: config
	}, "google_maps");
}
//#endregion
export { convertGoogleMapsToolToAdapterFormat, googleMapsTool };

//# sourceMappingURL=google-maps-tool.js.map