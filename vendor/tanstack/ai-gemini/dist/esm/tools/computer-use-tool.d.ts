import { ComputerUse } from '@google/genai';
import { ProviderTool, Tool } from '@tanstack/ai';
export type ComputerUseToolConfig = ComputerUse;
/** @deprecated Renamed to `ComputerUseToolConfig`. Will be removed in a future release. */
export type ComputerUseTool = ComputerUseToolConfig;
export type GeminiComputerUseTool = ProviderTool<'gemini', 'computer_use'>;
export declare function convertComputerUseToolToAdapterFormat(tool: Tool): {
    computerUse: {
        excludedPredefinedFunctions?: string[] | undefined;
        environment?: import('@google/genai').Environment | undefined;
    };
};
export declare function computerUseTool(config: ComputerUseToolConfig): GeminiComputerUseTool;
