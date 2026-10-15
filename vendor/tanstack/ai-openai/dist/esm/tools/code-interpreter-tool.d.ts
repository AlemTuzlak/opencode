import { ProviderTool } from '@tanstack/ai';
import { CodeInterpreterToolConfig } from '@tanstack/openai-base';
export { type CodeInterpreterToolConfig, type CodeInterpreterTool, convertCodeInterpreterToolToAdapterFormat, } from '@tanstack/openai-base';
export type OpenAICodeInterpreterTool = ProviderTool<'openai', 'code_interpreter'>;
/**
 * Creates a standard Tool from CodeInterpreterTool parameters, branded as an
 * OpenAI provider tool. Delegates construction to the base factory and brands
 * the result via a phantom-typed `ProviderTool` cast.
 */
export declare function codeInterpreterTool(container: CodeInterpreterToolConfig): OpenAICodeInterpreterTool;
