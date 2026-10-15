import { GoogleSearch } from '@google/genai';
import { ProviderTool, Tool } from '@tanstack/ai';
export type GoogleSearchToolConfig = GoogleSearch;
/** @deprecated Renamed to `GoogleSearchToolConfig`. Will be removed in a future release. */
export type GoogleSearchTool = GoogleSearchToolConfig;
export type GeminiGoogleSearchTool = ProviderTool<'gemini', 'google_search'>;
export declare function convertGoogleSearchToolToAdapterFormat(tool: Tool): {
    googleSearch: GoogleSearch;
};
export declare function googleSearchTool(config?: GoogleSearchToolConfig): GeminiGoogleSearchTool;
