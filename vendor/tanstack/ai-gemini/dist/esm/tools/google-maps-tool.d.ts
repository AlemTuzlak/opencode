import { GoogleMaps } from '@google/genai';
import { ProviderTool, Tool } from '@tanstack/ai';
export type GoogleMapsToolConfig = GoogleMaps;
/** @deprecated Renamed to `GoogleMapsToolConfig`. Will be removed in a future release. */
export type GoogleMapsTool = GoogleMapsToolConfig;
export type GeminiGoogleMapsTool = ProviderTool<'gemini', 'google_maps'>;
export declare function convertGoogleMapsToolToAdapterFormat(tool: Tool): {
    googleMaps: GoogleMaps;
};
export declare function googleMapsTool(config?: GoogleMapsToolConfig): GeminiGoogleMapsTool;
