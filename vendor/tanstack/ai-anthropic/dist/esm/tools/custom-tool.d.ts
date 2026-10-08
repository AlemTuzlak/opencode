import { SchemaInput, Tool } from '@tanstack/ai';
import { CacheControl } from '../text/text-provider-options.js';
export interface CustomToolConfig {
    /**
     * The name of the tool.
     */
    name: string;
    type: 'custom';
    /**
     * A brief description of what the tool does. Tool descriptions should be as detailed as possible. The more information that the model has about what the tool is and how to use it, the better it will perform. You can use natural language descriptions to reinforce important aspects of the tool input JSON schema.
     */
    description: string;
    /**
     * This defines the shape of the input that your tool accepts and that the model will produce.
     */
    input_schema: {
        type: 'object';
        properties: Record<string, any> | null;
        required?: Array<string> | null;
    };
    cache_control?: CacheControl | null;
}
/** @deprecated Renamed to `CustomToolConfig`. Will be removed in a future release. */
export type CustomTool = CustomToolConfig;
export declare function convertCustomToolToAdapterFormat(tool: Tool): CustomToolConfig;
export declare function customTool(name: string, description: string, inputSchema: SchemaInput, cacheControl?: CacheControl | null): Tool;
