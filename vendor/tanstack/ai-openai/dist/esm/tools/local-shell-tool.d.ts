import { ProviderTool } from '@tanstack/ai';
export { type LocalShellToolConfig, type LocalShellTool, convertLocalShellToolToAdapterFormat, } from '@tanstack/openai-base';
export type OpenAILocalShellTool = ProviderTool<'openai', 'local_shell'>;
/**
 * Creates a standard Tool from LocalShellTool parameters, branded as an
 * OpenAI provider tool.
 */
export declare function localShellTool(): OpenAILocalShellTool;
