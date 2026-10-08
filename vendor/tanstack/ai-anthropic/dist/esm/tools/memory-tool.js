import { brandAnthropicProviderTool, getAnthropicProviderToolMetadata } from "./anthropic-provider-tool.js";
//#region src/tools/memory-tool.ts
function convertMemoryToolToAdapterFormat(tool) {
	return {
		type: "memory_20250818",
		...getAnthropicProviderToolMetadata(tool)
	};
}
function memoryTool(config) {
	return brandAnthropicProviderTool({
		name: "memory",
		description: "",
		metadata: config
	}, "memory");
}
//#endregion
export { convertMemoryToolToAdapterFormat, memoryTool };

//# sourceMappingURL=memory-tool.js.map