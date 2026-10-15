import { ProviderTool } from '@tanstack/ai';
import { ComputerUseToolConfig } from '@tanstack/openai-base';
export { type ComputerUseToolConfig, type ComputerUseTool, convertComputerUseToolToAdapterFormat, } from '@tanstack/openai-base';
export type OpenAIComputerUseTool = ProviderTool<'openai', 'computer_use'>;
/**
 * Creates a standard Tool from ComputerUseTool parameters, branded as an
 * OpenAI provider tool.
 */
export declare function computerUseTool(toolData: ComputerUseToolConfig): OpenAIComputerUseTool;
