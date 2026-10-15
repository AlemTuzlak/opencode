import { OpenAI } from 'openai';
import { BaseFilesAdapter, FileHandle, FileUploadInput } from '@tanstack/ai/adapters';
import { FilePurpose } from 'openai/resources/files';
import { OpenAIClientConfig } from '../utils/client.js';
export interface OpenAIFilesConfig extends OpenAIClientConfig {
    /**
     * Default `purpose` for uploads. Files uploaded for vision/document input to
     * the Responses API use `'user_data'` (the flexible default). Override per
     * upload need — e.g. `'vision'` — via this config.
     * @default 'user_data'
     */
    purpose?: FilePurpose;
}
/**
 * OpenAI Files adapter — uploads media to the OpenAI Files API and references
 * it by `file_id`. Pair with `openaiText()` (Responses API): reference the
 * returned handle in a message via `fileSourceFromHandle(handle)`.
 */
export declare class OpenAIFilesAdapter extends BaseFilesAdapter<'openai'> {
    readonly name: "openai";
    protected client: OpenAI;
    private readonly purpose;
    constructor(config: OpenAIFilesConfig);
    upload(input: FileUploadInput): Promise<FileHandle<'openai'>>;
    get(id: string): Promise<FileHandle<'openai'>>;
    delete(id: string): Promise<void>;
}
/**
 * Create an OpenAI Files adapter with an explicit API key.
 */
export declare function createOpenaiFiles(apiKey: string, config?: Omit<OpenAIFilesConfig, 'apiKey'>): OpenAIFilesAdapter;
/**
 * Create an OpenAI Files adapter, reading the API key from `OPENAI_API_KEY`.
 */
export declare function openaiFiles(config?: Omit<OpenAIFilesConfig, 'apiKey'>): OpenAIFilesAdapter;
