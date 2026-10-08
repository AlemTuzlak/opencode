import { BaseFilesAdapter, FileHandle, FileUploadInput } from '@tanstack/ai/adapters';
import { GrokClientConfig } from '../utils/client.js';
export interface GrokFilesConfig extends GrokClientConfig {
    /**
     * Lifetime of the generated public URL, in seconds. xAI accepts 3600
     * (one hour) to 2592000 (thirty days). Omit for a URL that does not expire.
     */
    expiresAfter?: number;
}
/**
 * Grok (xAI) Files adapter.
 *
 * Uploads to the xAI Files API, then mints a **public URL** for the stored
 * object and uses that URL as the handle's wire reference. xAI's own
 * `file_id` form is only accepted on `input_file` (documents) and only by
 * agentic-capable models, while its image path takes a URL. A public URL
 * works for both, so one handle covers every modality and every chat model.
 *
 * Pair with `grokText()`: reference the returned handle via
 * `fileSourceFromHandle(handle)`.
 *
 * Limits xAI enforces: 50 MiB per file, and PNG, JPEG, MP4, or PDF only.
 */
export declare class GrokFilesAdapter extends BaseFilesAdapter<'grok'> {
    readonly name: "grok";
    private readonly client;
    private readonly expiresAfter?;
    constructor(config: GrokFilesConfig);
    upload(input: FileUploadInput): Promise<FileHandle<'grok'>>;
    /**
     * Fetch a stored file and its public URL.
     *
     * This mints the public URL (a POST), because `retrieve` does not report
     * it. After {@link revokePublicUrl}, a `get()` gives the file a public URL
     * again. Do not call it for a file whose URL you revoked.
     */
    get(id: string): Promise<FileHandle<'grok'>>;
    delete(id: string): Promise<void>;
    /**
     * Revoke a file's public URL without deleting the file. The handle's `uri`
     * stops resolving; the stored object and its `id` survive. A later
     * {@link get} mints a public URL again.
     */
    revokePublicUrl(id: string): Promise<void>;
}
/**
 * Create a Grok Files adapter with an explicit API key.
 */
export declare function createGrokFiles(apiKey: string, config?: Omit<GrokFilesConfig, 'apiKey'>): GrokFilesAdapter;
/**
 * Create a Grok Files adapter, reading the API key from `XAI_API_KEY`.
 */
export declare function grokFiles(config?: Omit<GrokFilesConfig, 'apiKey'>): GrokFilesAdapter;
