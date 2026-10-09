import { ProviderTool, Tool } from '@tanstack/ai';
export interface UrlContextToolConfig {
}
/** @deprecated Renamed to `UrlContextToolConfig`. Will be removed in a future release. */
export type UrlContextTool = UrlContextToolConfig;
export type GeminiUrlContextTool = ProviderTool<'gemini', 'url_context'>;
export declare function convertUrlContextToolToAdapterFormat(_tool: Tool): {
    urlContext: {};
};
export declare function urlContextTool(): GeminiUrlContextTool;
