import { ProviderTool, Tool } from '@tanstack/ai';
export interface CodeExecutionToolConfig {
}
/** @deprecated Renamed to `CodeExecutionToolConfig`. Will be removed in a future release. */
export type CodeExecutionTool = CodeExecutionToolConfig;
export type GeminiCodeExecutionTool = ProviderTool<'gemini', 'code_execution'>;
export declare function convertCodeExecutionToolToAdapterFormat(_tool: Tool): {
    codeExecution: {};
};
export declare function codeExecutionTool(): GeminiCodeExecutionTool;
