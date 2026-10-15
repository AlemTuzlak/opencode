import { ToolConfiguration } from '@aws-sdk/client-bedrock-runtime';
import { BedrockCachePoint } from '../message-types.js';
export interface ConverseToolInput {
    name: string;
    description?: string;
    inputSchema: unknown;
    /** Emit a `cachePoint` entry right after this tool. */
    cachePoint?: BedrockCachePoint;
}
export type ToolChoiceInput = 'auto' | 'required' | 'none' | {
    type: 'tool';
    name: string;
};
export declare function toToolConfig(tools: Array<ConverseToolInput>, choice: ToolChoiceInput | undefined): ToolConfiguration | undefined;
