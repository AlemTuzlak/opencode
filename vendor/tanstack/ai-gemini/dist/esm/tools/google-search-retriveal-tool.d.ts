import { GoogleSearchRetrieval } from '@google/genai';
import { ProviderTool, Tool } from '@tanstack/ai';
export type GoogleSearchRetrievalToolConfig = GoogleSearchRetrieval;
/** @deprecated Renamed to `GoogleSearchRetrievalToolConfig`. Will be removed in a future release. */
export type GoogleSearchRetrievalTool = GoogleSearchRetrievalToolConfig;
export type GeminiGoogleSearchRetrievalTool = ProviderTool<'gemini', 'google_search_retrieval'>;
export declare function convertGoogleSearchRetrievalToolToAdapterFormat(tool: Tool): {
    googleSearchRetrieval: GoogleSearchRetrieval;
};
export declare function googleSearchRetrievalTool(config?: GoogleSearchRetrievalToolConfig): GeminiGoogleSearchRetrievalTool;
