import { BaseFilesAdapter, FileHandle, FileUploadInput } from '@tanstack/ai/adapters';
import { AnthropicClientConfig } from '../utils/client.js';
export interface AnthropicFilesConfig extends AnthropicClientConfig {
}
/**
 * Anthropic Files adapter — uploads media to the Anthropic Files API (beta) and
 * references it by `file_id`. Pair with `anthropicText()`: reference the
 * returned handle in an image/document message via `fileSourceFromHandle`.
 */
export declare class AnthropicFilesAdapter extends BaseFilesAdapter<'anthropic'> {
    readonly name: "anthropic";
    private readonly client;
    constructor(config: AnthropicFilesConfig);
    upload(input: FileUploadInput): Promise<FileHandle<'anthropic'>>;
    get(id: string): Promise<FileHandle<'anthropic'>>;
    delete(id: string): Promise<void>;
}
/**
 * Create an Anthropic Files adapter with an explicit API key.
 */
export declare function createAnthropicFiles(apiKey: string, config?: Omit<AnthropicFilesConfig, 'apiKey'>): AnthropicFilesAdapter;
/**
 * Create an Anthropic Files adapter, reading the API key from `ANTHROPIC_API_KEY`.
 */
export declare function anthropicFiles(config?: AnthropicFilesConfig): AnthropicFilesAdapter;
