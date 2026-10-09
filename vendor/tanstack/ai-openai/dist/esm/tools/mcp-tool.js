import { convertMCPToolToAdapterFormat, mcpTool, validateMCPtool } from "@tanstack/openai-base";
//#region src/tools/mcp-tool.ts
/**
* Creates a standard Tool from MCPTool parameters, branded as an OpenAI provider tool.
*/
function mcpTool$1(toolData) {
	return mcpTool(toolData);
}
//#endregion
export { convertMCPToolToAdapterFormat, mcpTool$1 as mcpTool, validateMCPtool };

//# sourceMappingURL=mcp-tool.js.map