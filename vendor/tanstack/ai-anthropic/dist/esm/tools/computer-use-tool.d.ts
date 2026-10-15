import { BetaToolComputerUse20241022, BetaToolComputerUse20250124 } from '@anthropic-ai/sdk/resources/beta';
import { ProviderTool, Tool } from '@tanstack/ai';
export type ComputerUseToolConfig = BetaToolComputerUse20241022 | BetaToolComputerUse20250124;
/** @deprecated Renamed to `ComputerUseToolConfig`. Will be removed in a future release. */
export type ComputerUseTool = ComputerUseToolConfig;
export type AnthropicComputerUseTool = ProviderTool<'anthropic', 'computer_use'>;
export declare function convertComputerUseToolToAdapterFormat(tool: Tool): ComputerUseToolConfig;
export declare function computerUseTool(config: ComputerUseToolConfig): AnthropicComputerUseTool;
