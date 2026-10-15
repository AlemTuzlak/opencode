import { brandGeminiProviderTool, getGeminiProviderToolMetadata } from "./gemini-provider-tool.js";
//#region src/tools/computer-use-tool.ts
function convertComputerUseToolToAdapterFormat(tool) {
	const metadata = getGeminiProviderToolMetadata(tool);
	return { computerUse: {
		...metadata.environment !== void 0 && { environment: metadata.environment },
		...metadata.excludedPredefinedFunctions !== void 0 && { excludedPredefinedFunctions: metadata.excludedPredefinedFunctions }
	} };
}
function computerUseTool(config) {
	return brandGeminiProviderTool({
		name: "computer_use",
		description: "",
		metadata: {
			...config.environment !== void 0 && { environment: config.environment },
			...config.excludedPredefinedFunctions !== void 0 && { excludedPredefinedFunctions: config.excludedPredefinedFunctions }
		}
	}, "computer_use");
}
//#endregion
export { computerUseTool, convertComputerUseToolToAdapterFormat };

//# sourceMappingURL=computer-use-tool.js.map