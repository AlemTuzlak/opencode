import { Tool } from '@tanstack/ai';
declare const OPENAI_PROVIDER_TOOL_KINDS: {
    readonly apply_patch: "openai.apply_patch";
    readonly code_interpreter: "openai.code_interpreter";
    readonly computer_use: "openai.computer_use";
    readonly custom: "openai.custom";
    readonly file_search: "openai.file_search";
    readonly image_generation: "openai.image_generation";
    readonly local_shell: "openai.local_shell";
    readonly mcp: "openai.mcp";
    readonly shell: "openai.shell";
    readonly web_search: "openai.web_search";
    readonly web_search_preview: "openai.web_search_preview";
};
export type OpenAIProviderToolKind = keyof typeof OPENAI_PROVIDER_TOOL_KINDS;
export declare function openAIProviderTool(tool: Tool, toolKind: OpenAIProviderToolKind): Tool;
export declare function getOpenAIProviderToolKind(tool: Tool): OpenAIProviderToolKind | undefined;
/** Returns adapter metadata without the internal runtime discriminator. */
export declare function getOpenAIProviderToolMetadata(tool: Tool): Tool['metadata'];
export {};
