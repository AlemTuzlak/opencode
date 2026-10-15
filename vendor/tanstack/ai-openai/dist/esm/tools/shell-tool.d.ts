import { ProviderTool } from '@tanstack/ai';
import { ShellToolFactoryConfig } from '@tanstack/openai-base';
export { type ShellToolConfig, type ShellTool, type ShellToolFactoryConfig, convertShellToolToAdapterFormat, } from '@tanstack/openai-base';
export type OpenAIShellTool = ProviderTool<'openai', 'shell'>;
/**
 * Creates a standard Tool from ShellTool parameters, branded as an OpenAI
 * provider tool. Pass `environment` to attach a container + skills.
 */
export declare function shellTool(config?: ShellToolFactoryConfig): OpenAIShellTool;
