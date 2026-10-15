import { convertFunctionToolToResponsesFormat, ResponsesFunctionTool } from '@tanstack/openai-base';
import { ProviderTool, Tool } from '@tanstack/ai';
import { GrokProviderToolKind } from '../model-meta.js';
export type FunctionTool = ResponsesFunctionTool;
export { convertFunctionToolToResponsesFormat as convertFunctionToolToAdapterFormat };
export type GrokProviderTool<TKind extends GrokProviderToolKind> = ProviderTool<'grok', TKind>;
export interface GrokWebSearchToolConfig {
    type: 'web_search';
    filters?: {
        allowed_domains?: Array<string>;
        excluded_domains?: Array<string>;
    };
    enable_image_understanding?: boolean;
    enable_image_search?: boolean;
}
export interface GrokXSearchToolConfig {
    type: 'x_search';
    allowed_x_handles?: Array<string>;
    excluded_x_handles?: Array<string>;
    from_date?: string;
    to_date?: string;
    enable_image_understanding?: boolean;
    enable_video_understanding?: boolean;
}
export interface GrokFileSearchToolConfig {
    type: 'file_search';
    vector_store_ids: Array<string>;
    max_num_results?: number;
}
export interface GrokMCPToolConfig {
    type: 'mcp';
    server_label: string;
    server_url: string;
    allowed_tools?: Array<string>;
    server_description?: string;
    authorization?: string;
    headers?: Record<string, string>;
}
export type GrokServerTool = GrokWebSearchToolConfig | GrokXSearchToolConfig | GrokFileSearchToolConfig | GrokMCPToolConfig;
export type GrokResponsesTool = GrokServerTool | ResponsesFunctionTool;
export declare function grokWebSearchTool(config?: Omit<GrokWebSearchToolConfig, 'type'>): GrokProviderTool<'web_search'>;
export declare function grokXSearchTool(config?: Omit<GrokXSearchToolConfig, 'type'>): GrokProviderTool<'x_search'>;
export declare function grokFileSearchTool(config: Omit<GrokFileSearchToolConfig, 'type'>): GrokProviderTool<'file_search'>;
export declare function grokMCPTool(config: Omit<GrokMCPToolConfig, 'type'>): GrokProviderTool<'mcp'>;
export declare function convertToolsToProviderFormat(tools: Array<Tool>): Array<GrokResponsesTool>;
