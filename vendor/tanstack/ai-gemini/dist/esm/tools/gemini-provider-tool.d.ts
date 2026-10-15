import { ProviderTool, Tool } from '@tanstack/ai';
declare const GEMINI_PROVIDER_TOOL_KINDS: {
    readonly code_execution: "gemini.code_execution";
    readonly computer_use: "gemini.computer_use";
    readonly file_search: "gemini.file_search";
    readonly google_maps: "gemini.google_maps";
    readonly google_search: "gemini.google_search";
    readonly google_search_retrieval: "gemini.google_search_retrieval";
    readonly url_context: "gemini.url_context";
};
type GeminiProviderToolKind = keyof typeof GEMINI_PROVIDER_TOOL_KINDS;
export declare function brandGeminiProviderTool<T extends ProviderTool<'gemini', GeminiProviderToolKind>>(tool: Omit<T, '~provider' | '~toolKind'>, toolKind: T['~toolKind']): T;
export declare function getGeminiProviderToolKind(tool: Tool): GeminiProviderToolKind | undefined;
/** Returns adapter metadata without the internal runtime discriminator. */
export declare function getGeminiProviderToolMetadata(tool: Tool): Tool['metadata'];
export {};
