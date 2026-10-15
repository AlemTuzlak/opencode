import { brandAnthropicProviderTool, getAnthropicProviderToolMetadata } from "./anthropic-provider-tool.js";
//#region src/tools/web-search-tool.ts
var validateDomains = (tool) => {
	if (tool.allowed_domains && tool.blocked_domains) throw new Error("allowed_domains and blocked_domains cannot be used together.");
};
var validateUserLocation = (tool) => {
	const userLocation = tool.user_location;
	if (userLocation) {
		if (userLocation.city && (userLocation.city.length < 1 || userLocation.city.length > 255)) throw new Error("user_location.city must be between 1 and 255 characters.");
		if (userLocation.country && userLocation.country.length !== 2) throw new Error("user_location.country must be exactly 2 characters.");
		if (userLocation.region && (userLocation.region.length < 1 || userLocation.region.length > 255)) throw new Error("user_location.region must be between 1 and 255 characters.");
		if (userLocation.timezone && (userLocation.timezone.length < 1 || userLocation.timezone.length > 255)) throw new Error("user_location.timezone must be between 1 and 255 characters.");
	}
};
function convertWebSearchToolToAdapterFormat(tool) {
	const metadata = getAnthropicProviderToolMetadata(tool);
	return {
		name: "web_search",
		type: "web_search_20250305",
		...metadata?.allowed_domains !== void 0 && { allowed_domains: metadata.allowed_domains },
		...metadata?.blocked_domains !== void 0 && { blocked_domains: metadata.blocked_domains },
		...metadata?.max_uses !== void 0 && { max_uses: metadata.max_uses },
		...metadata?.user_location !== void 0 && { user_location: metadata.user_location },
		...metadata?.cache_control !== void 0 && { cache_control: metadata.cache_control }
	};
}
function webSearchTool(config) {
	validateDomains(config);
	validateUserLocation(config);
	return brandAnthropicProviderTool({
		name: "web_search",
		description: "",
		metadata: config
	}, "web_search");
}
//#endregion
export { convertWebSearchToolToAdapterFormat, webSearchTool };

//# sourceMappingURL=web-search-tool.js.map