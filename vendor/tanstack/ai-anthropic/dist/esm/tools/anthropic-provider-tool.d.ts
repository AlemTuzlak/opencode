import { ProviderTool, Tool } from '@tanstack/ai';
declare const ANTHROPIC_PROVIDER_TOOL_KINDS: {
    readonly bash: "anthropic.bash";
    readonly code_execution: "anthropic.code_execution";
    readonly computer_use: "anthropic.computer_use";
    readonly memory: "anthropic.memory";
    readonly text_editor: "anthropic.text_editor";
    readonly web_fetch: "anthropic.web_fetch";
    readonly web_search: "anthropic.web_search";
};
type AnthropicProviderToolKind = keyof typeof ANTHROPIC_PROVIDER_TOOL_KINDS;
/**
 * Adds a stable runtime discriminator to an Anthropic-native tool.
 *
 * The core ProviderTool brand is intentionally type-only. Anthropic also needs
 * a runtime discriminator because custom functions may use the same public
 * names as native tools. Adapter metadata is the repository-wide extension
 * point for this plain-data marker; converters remove it from the wire shape.
 */
export declare function brandAnthropicProviderTool<T extends ProviderTool<'anthropic', AnthropicProviderToolKind>>(tool: Omit<T, '~provider' | '~toolKind'>, toolKind: T['~toolKind']): T;
export declare function getAnthropicProviderToolKind(tool: Tool): AnthropicProviderToolKind | undefined;
/** Returns adapter metadata without the internal runtime discriminator. */
export declare function getAnthropicProviderToolMetadata(tool: Tool): Tool['metadata'];
export {};
