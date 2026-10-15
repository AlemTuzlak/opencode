import { getOpenAIProviderToolMetadata, openAIProviderTool } from "./openai-provider-tool.js";
//#region src/tools/mcp-tool.ts
function validateMCPtool(tool) {
	if (!tool.server_url && !tool.connector_id) throw new Error("Either server_url or connector_id must be provided.");
	if (tool.connector_id && tool.server_url) throw new Error("Only one of server_url or connector_id can be provided.");
}
/**
* Converts a standard Tool to OpenAI MCPTool format
*/
function convertMCPToolToAdapterFormat(tool) {
	const convertedTool = {
		...getOpenAIProviderToolMetadata(tool),
		type: "mcp"
	};
	validateMCPtool(convertedTool);
	return convertedTool;
}
/**
* Creates a standard Tool from MCPTool parameters.
*
* Base (non-branded) factory. Providers that need branded return types should
* re-wrap this in their own package.
*/
function mcpTool(toolData) {
	validateMCPtool({
		...toolData,
		type: "mcp"
	});
	return openAIProviderTool({
		name: "mcp",
		description: toolData.server_description || "",
		metadata: toolData
	}, "mcp");
}
//#endregion
export { convertMCPToolToAdapterFormat, mcpTool, validateMCPtool };

//# sourceMappingURL=mcp-tool.js.map