import { BaseFilesAdapter, FileHandle, FileUploadInput } from '@tanstack/ai/adapters';
import { GeminiClientConfig } from '../utils/client.js';
export interface GeminiFilesConfig extends GeminiClientConfig {
}
/**
 * Gemini Files adapter — uploads media to the Gemini Files API and references
 * it by its file URI. Pair with `geminiText()` / `geminiImage()`: reference the
 * returned handle via `fileSourceFromHandle(handle)`, which uses the handle URI
 * (Gemini fetches it server-side as `fileData.fileUri`).
 */
export declare class GeminiFilesAdapter extends BaseFilesAdapter<'gemini'> {
    readonly name: "gemini";
    private readonly client;
    constructor(config: GeminiFilesConfig);
    upload(input: FileUploadInput): Promise<FileHandle<'gemini'>>;
    get(id: string): Promise<FileHandle<'gemini'>>;
    delete(id: string): Promise<void>;
}
/**
 * Create a Gemini Files adapter with an explicit API key.
 */
export declare function createGeminiFiles(apiKey: string, config?: Omit<GeminiFilesConfig, 'apiKey'>): GeminiFilesAdapter;
/**
 * Create a Gemini Files adapter, reading the API key from `GOOGLE_API_KEY` /
 * `GEMINI_API_KEY`.
 */
export declare function geminiFiles(config?: Omit<GeminiFilesConfig, 'apiKey'>): GeminiFilesAdapter;
