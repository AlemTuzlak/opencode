import { getAnthropicProviderToolKind } from "./anthropic-provider-tool.js";
import { convertBashToolToAdapterFormat } from "./bash-tool.js";
import { convertCodeExecutionToolToAdapterFormat } from "./code-execution-tool.js";
import { convertComputerUseToolToAdapterFormat } from "./computer-use-tool.js";
import { convertCustomToolToAdapterFormat } from "./custom-tool.js";
import { convertMemoryToolToAdapterFormat } from "./memory-tool.js";
import { convertTextEditorToolToAdapterFormat } from "./text-editor-tool.js";
import { convertWebFetchToolToAdapterFormat } from "./web-fetch-tool.js";
import { convertWebSearchToolToAdapterFormat } from "./web-search-tool.js";
import { assertUniqueToolNames } from "@tanstack/ai/adapter-internals";
//#region src/tools/tool-converter.ts
/**
* Converts standard Tool format to Anthropic-specific tool format
*
* @param tools - Array of standard Tool objects
* @returns Array of Anthropic-specific tool definitions
*
* @example
* ```typescript
* const tools: Tool[] = [{
*   type: "function",
*   function: {
*     name: "get_weather",
*     description: "Get weather for a location",
*     parameters: {
*       type: "object",
*       properties: { location: { type: "string" } },
*       required: ["location"]
*     }
*   }
* }];
*
* const anthropicTools = convertToolsToProviderFormat(tools);
* ```
*/
function convertToolsToProviderFormat(tools) {
	assertUniqueToolNames(tools);
	return tools.map((tool) => {
		switch (getAnthropicProviderToolKind(tool)) {
			case "bash": return convertBashToolToAdapterFormat(tool);
			case "code_execution": return convertCodeExecutionToolToAdapterFormat(tool);
			case "computer_use": return convertComputerUseToolToAdapterFormat(tool);
			case "memory": return convertMemoryToolToAdapterFormat(tool);
			case "text_editor": return convertTextEditorToolToAdapterFormat(tool);
			case "web_fetch": return convertWebFetchToolToAdapterFormat(tool);
			case "web_search": return convertWebSearchToolToAdapterFormat(tool);
			case void 0: return convertCustomToolToAdapterFormat(tool);
		}
	});
}
//#endregion
export { convertToolsToProviderFormat };

//# sourceMappingURL=tool-converter.js.map