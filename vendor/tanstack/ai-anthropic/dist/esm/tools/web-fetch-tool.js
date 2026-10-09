import { brandAnthropicProviderTool, getAnthropicProviderToolMetadata } from "./anthropic-provider-tool.js";
//#region src/tools/web-fetch-tool.ts
function convertWebFetchToolToAdapterFormat(tool) {
	return {
		name: "web_fetch",
		type: "web_fetch_20250910",
		...getAnthropicProviderToolMetadata(tool)
	};
}
function webFetchTool(config) {
	return brandAnthropicProviderTool({
		name: "web_fetch",
		description: "",
		metadata: config
	}, "web_fetch");
}
//#endregion
export { convertWebFetchToolToAdapterFormat, webFetchTool };

//# sourceMappingURL=web-fetch-tool.js.map