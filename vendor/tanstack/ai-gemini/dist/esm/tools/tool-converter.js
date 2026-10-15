import { getGeminiProviderToolKind } from "./gemini-provider-tool.js";
import { convertCodeExecutionToolToAdapterFormat } from "./code-execution-tool.js";
import { convertComputerUseToolToAdapterFormat } from "./computer-use-tool.js";
import { convertFileSearchToolToAdapterFormat } from "./file-search-tool.js";
import { convertGoogleMapsToolToAdapterFormat } from "./google-maps-tool.js";
import { convertGoogleSearchRetrievalToolToAdapterFormat } from "./google-search-retriveal-tool.js";
import { convertGoogleSearchToolToAdapterFormat } from "./google-search-tool.js";
import { convertUrlContextToolToAdapterFormat } from "./url-context-tool.js";
import { assertUniqueToolNames } from "@tanstack/ai/adapter-internals";
//#region src/tools/tool-converter.ts
/**
* Converts standard Tool format to Gemini-specific tool format
*
* @param tools - Array of standard Tool objects
* @returns Array of Gemini-specific tool definitions
*
* @example
* ```typescript
* const tools: Tool[] = [{
*   name: "get_weather",
*   description: "Get weather for a location",
*   inputSchema: z.object({
*     location: z.string()
*   })
* }];
*
* const geminiTools = convertToolsToProviderFormat(tools);
* ```
*/
function convertToolsToProviderFormat(tools) {
	if (!tools || tools.length === 0) return [];
	assertUniqueToolNames(tools);
	const result = [];
	const functionDeclarations = [];
	for (const tool of tools) switch (getGeminiProviderToolKind(tool)) {
		case "code_execution":
			result.push(convertCodeExecutionToolToAdapterFormat(tool));
			break;
		case "computer_use":
			result.push(convertComputerUseToolToAdapterFormat(tool));
			break;
		case "file_search":
			result.push(convertFileSearchToolToAdapterFormat(tool));
			break;
		case "google_maps":
			result.push(convertGoogleMapsToolToAdapterFormat(tool));
			break;
		case "google_search_retrieval":
			result.push(convertGoogleSearchRetrievalToolToAdapterFormat(tool));
			break;
		case "google_search":
			result.push(convertGoogleSearchToolToAdapterFormat(tool));
			break;
		case "url_context":
			result.push(convertUrlContextToolToAdapterFormat(tool));
			break;
		case void 0:
			if (!tool.description) throw new Error(`Tool ${tool.name} requires a description for Gemini adapter`);
			functionDeclarations.push({
				name: tool.name,
				description: tool.description,
				parametersJsonSchema: tool.inputSchema ?? {
					type: "object",
					properties: {},
					required: []
				}
			});
	}
	if (functionDeclarations.length > 0) result.push({ functionDeclarations });
	return result;
}
//#endregion
export { convertToolsToProviderFormat };

//# sourceMappingURL=tool-converter.js.map