import { brandAnthropicProviderTool, getAnthropicProviderToolMetadata } from "./anthropic-provider-tool.js";
//#region src/tools/text-editor-tool.ts
function convertTextEditorToolToAdapterFormat(tool) {
	return { ...getAnthropicProviderToolMetadata(tool) };
}
function textEditorTool(config) {
	return brandAnthropicProviderTool({
		name: "str_replace_editor",
		description: "",
		metadata: config
	}, "text_editor");
}
//#endregion
export { convertTextEditorToolToAdapterFormat, textEditorTool };

//# sourceMappingURL=text-editor-tool.js.map