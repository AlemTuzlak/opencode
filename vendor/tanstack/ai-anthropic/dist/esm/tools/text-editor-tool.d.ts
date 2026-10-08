import { ToolTextEditor20250124, ToolTextEditor20250429, ToolTextEditor20250728 } from '@anthropic-ai/sdk/resources/messages';
import { ProviderTool, Tool } from '@tanstack/ai';
export type TextEditorToolConfig = ToolTextEditor20250124 | ToolTextEditor20250429 | ToolTextEditor20250728;
/** @deprecated Renamed to `TextEditorToolConfig`. Will be removed in a future release. */
export type TextEditorTool = TextEditorToolConfig;
export type AnthropicTextEditorTool = ProviderTool<'anthropic', 'text_editor'>;
export declare function convertTextEditorToolToAdapterFormat(tool: Tool): TextEditorToolConfig;
export declare function textEditorTool<T extends TextEditorToolConfig>(config: T): AnthropicTextEditorTool;
