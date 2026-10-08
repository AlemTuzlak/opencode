import { brandProviderTool } from "@tanstack/ai";
import { convertFunctionToolToResponsesFormat } from "@tanstack/openai-base";
import { assertUniqueToolNames } from "@tanstack/ai/adapter-internals";
//#region src/tools/index.ts
function providerTool(kind, description, metadata) {
	return brandProviderTool({
		name: kind,
		description,
		metadata: {
			__kind: `grok.${kind}`,
			...metadata
		}
	});
}
function grokWebSearchTool(config = {}) {
	if (config.filters?.allowed_domains !== void 0 && config.filters.excluded_domains !== void 0) throw new Error("allowed_domains and excluded_domains cannot both be provided.");
	if (config.filters?.allowed_domains !== void 0 && config.filters.allowed_domains.length > 5) throw new Error("allowed_domains supports at most 5 domains.");
	if (config.filters?.excluded_domains !== void 0 && config.filters.excluded_domains.length > 5) throw new Error("excluded_domains supports at most 5 domains.");
	return providerTool("web_search", "Search the web", {
		type: "web_search",
		...config
	});
}
function grokXSearchTool(config = {}) {
	if (config.allowed_x_handles !== void 0 && config.excluded_x_handles !== void 0) throw new Error("allowed_x_handles and excluded_x_handles cannot both be provided.");
	if (config.allowed_x_handles !== void 0 && config.allowed_x_handles.length > 20) throw new Error("allowed_x_handles supports at most 20 handles.");
	if (config.excluded_x_handles !== void 0 && config.excluded_x_handles.length > 20) throw new Error("excluded_x_handles supports at most 20 handles.");
	return providerTool("x_search", "Search X posts", {
		type: "x_search",
		...config
	});
}
function grokFileSearchTool(config) {
	if (config.vector_store_ids.length === 0) throw new Error("vector_store_ids must contain at least one collection id.");
	if (config.max_num_results !== void 0) {
		if (config.max_num_results < 1 || config.max_num_results > 50) throw new Error("max_num_results must be between 1 and 50.");
	}
	return providerTool("file_search", "Search xAI file collections", {
		type: "file_search",
		...config
	});
}
function grokMCPTool(config) {
	if (!config.server_url) throw new Error("server_url must be provided.");
	return providerTool("mcp", config.server_description || "Remote MCP server", {
		type: "mcp",
		...config
	});
}
function getGrokProviderToolKind(tool) {
	switch (tool.metadata?.__kind) {
		case "grok.web_search": return "web_search";
		case "grok.x_search": return "x_search";
		case "grok.file_search": return "file_search";
		case "grok.mcp": return "mcp";
		default: return;
	}
}
function convertGrokProviderToolToAdapterFormat(tool, kind) {
	const metadata = tool.metadata;
	if (metadata.type !== kind) throw new Error(`convertGrokProviderToolToAdapterFormat: tool "${tool.name}" has mismatched Grok tool metadata.`);
	const { __kind: _kind, ...toolConfig } = metadata;
	return toolConfig;
}
function convertToolsToProviderFormat(tools) {
	assertUniqueToolNames(tools);
	return tools.map((tool) => {
		const grokProviderToolKind = getGrokProviderToolKind(tool);
		if (grokProviderToolKind) return convertGrokProviderToolToAdapterFormat(tool, grokProviderToolKind);
		return convertFunctionToolToResponsesFormat(tool);
	});
}
//#endregion
export { convertFunctionToolToResponsesFormat as convertFunctionToolToAdapterFormat, convertToolsToProviderFormat, grokFileSearchTool, grokMCPTool, grokWebSearchTool, grokXSearchTool };

//# sourceMappingURL=index.js.map