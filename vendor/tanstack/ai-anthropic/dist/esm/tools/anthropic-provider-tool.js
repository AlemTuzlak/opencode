import { brandProviderTool } from "@tanstack/ai";
//#region src/tools/anthropic-provider-tool.ts
var ANTHROPIC_PROVIDER_TOOL_KINDS = {
	bash: "anthropic.bash",
	code_execution: "anthropic.code_execution",
	computer_use: "anthropic.computer_use",
	memory: "anthropic.memory",
	text_editor: "anthropic.text_editor",
	web_fetch: "anthropic.web_fetch",
	web_search: "anthropic.web_search"
};
/**
* Adds a stable runtime discriminator to an Anthropic-native tool.
*
* The core ProviderTool brand is intentionally type-only. Anthropic also needs
* a runtime discriminator because custom functions may use the same public
* names as native tools. Adapter metadata is the repository-wide extension
* point for this plain-data marker; converters remove it from the wire shape.
*/
function brandAnthropicProviderTool(tool, toolKind) {
	return brandProviderTool({
		...tool,
		metadata: {
			...tool.metadata,
			__kind: ANTHROPIC_PROVIDER_TOOL_KINDS[toolKind]
		}
	});
}
function getAnthropicProviderToolKind(tool) {
	switch (tool.metadata?.["__kind"]) {
		case "anthropic.bash": return "bash";
		case "anthropic.code_execution": return "code_execution";
		case "anthropic.computer_use": return "computer_use";
		case "anthropic.memory": return "memory";
		case "anthropic.text_editor": return "text_editor";
		case "anthropic.web_fetch": return "web_fetch";
		case "anthropic.web_search": return "web_search";
		default: return;
	}
}
/** Returns adapter metadata without the internal runtime discriminator. */
function getAnthropicProviderToolMetadata(tool) {
	if (!tool.metadata) return;
	const { __kind: _kind, ...metadata } = tool.metadata;
	return metadata;
}
//#endregion
export { brandAnthropicProviderTool, getAnthropicProviderToolKind, getAnthropicProviderToolMetadata };

//# sourceMappingURL=anthropic-provider-tool.js.map