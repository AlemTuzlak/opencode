import { getOpenAIProviderToolKind } from "./openai-provider-tool.js";
import { convertApplyPatchToolToAdapterFormat } from "./apply-patch-tool.js";
import { convertCodeInterpreterToolToAdapterFormat } from "./code-interpreter-tool.js";
import { convertComputerUseToolToAdapterFormat } from "./computer-use-tool.js";
import { convertCustomToolToAdapterFormat } from "./custom-tool.js";
import { convertFileSearchToolToAdapterFormat } from "./file-search-tool.js";
import { convertFunctionToolToAdapterFormat } from "./function-tool.js";
import { convertImageGenerationToolToAdapterFormat } from "./image-generation-tool.js";
import { convertLocalShellToolToAdapterFormat } from "./local-shell-tool.js";
import { convertMCPToolToAdapterFormat } from "./mcp-tool.js";
import { convertShellToolToAdapterFormat } from "./shell-tool.js";
import { convertWebSearchPreviewToolToAdapterFormat } from "./web-search-preview-tool.js";
import { convertWebSearchToolToAdapterFormat } from "./web-search-tool.js";
import { assertUniqueToolNames } from "@tanstack/ai/adapter-internals";
//#region src/tools/tool-converter.ts
/**
* Converts an array of standard Tools to OpenAI-specific format
*/
function convertToolsToProviderFormat(tools) {
	assertUniqueToolNames(tools);
	return tools.map((tool) => {
		switch (getOpenAIProviderToolKind(tool)) {
			case "apply_patch": return convertApplyPatchToolToAdapterFormat(tool);
			case "code_interpreter": return convertCodeInterpreterToolToAdapterFormat(tool);
			case "computer_use": return convertComputerUseToolToAdapterFormat(tool);
			case "custom": return convertCustomToolToAdapterFormat(tool);
			case "file_search": return convertFileSearchToolToAdapterFormat(tool);
			case "image_generation": return convertImageGenerationToolToAdapterFormat(tool);
			case "local_shell": return convertLocalShellToolToAdapterFormat(tool);
			case "mcp": return convertMCPToolToAdapterFormat(tool);
			case "shell": return convertShellToolToAdapterFormat(tool);
			case "web_search_preview": return convertWebSearchPreviewToolToAdapterFormat(tool);
			case "web_search": return convertWebSearchToolToAdapterFormat(tool);
			case void 0: return convertFunctionToolToAdapterFormat(tool);
		}
	});
}
//#endregion
export { convertToolsToProviderFormat };

//# sourceMappingURL=tool-converter.js.map