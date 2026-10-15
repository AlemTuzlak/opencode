import { ContentPartFileSource } from '../../types.js';
import { FileHandle, FileUploadInput, FilesAdapter } from './adapter.js';
/** The adapter kind this activity handles */
export declare const kind: "files";
/**
 * Upload a file to a provider's Files API and return its handle. The handle
 * carries the provider name as a literal type, so passing it to another
 * provider's lifecycle call is a compile error.
 *
 * @example
 * ```ts
 * const files = openaiFiles()
 * const handle = await uploadFile({ adapter: files, input: { data, mimeType: 'image/png' } })
 * ```
 */
export declare function uploadFile<TName extends string>(options: {
    adapter: FilesAdapter<TName> & {
        kind: typeof kind;
    };
    input: FileUploadInput;
}): Promise<FileHandle<TName>>;
/**
 * Fetch metadata for a previously uploaded file. Accepts the handle itself
 * (preferred — the provider-literal type rejects a foreign provider's handle
 * at compile time) or its raw lifecycle id.
 *
 * @throws if the provider's files adapter has no `get` (e.g. fal storage).
 */
export declare function getFile<TName extends string>(options: {
    adapter: FilesAdapter<TName> & {
        kind: typeof kind;
    };
    id: string | FileHandle<NoInfer<TName>>;
}): Promise<FileHandle<TName>>;
/**
 * Delete a previously uploaded file. Accepts the handle itself (preferred —
 * the provider-literal type rejects a foreign provider's handle at compile
 * time) or its raw lifecycle id.
 *
 * @throws if the provider's files adapter has no `delete` (e.g. fal storage).
 */
export declare function deleteFile<TName extends string>(options: {
    adapter: FilesAdapter<TName> & {
        kind: typeof kind;
    };
    id: string | FileHandle<NoInfer<TName>>;
}): Promise<void>;
/**
 * Build a `{ type: 'file' }` content source from an uploaded
 * {@link FileHandle}, for use in a chat message (image/audio/document part
 * `source`).
 *
 * The source's `value` is the handle's wire form: the handle URL when the
 * provider exposes one (Gemini, fal, Grok), otherwise the opaque id (OpenAI,
 * Anthropic). `provider` records the issuer, so an adapter for a different
 * provider rejects the source rather than sending a handle it cannot resolve.
 *
 * @example
 * ```ts
 * const handle = await uploadFile({ adapter: openaiFiles(), input })
 * messages.push({ role: 'user', content: [
 *   { type: 'image', source: fileSourceFromHandle(handle) },
 * ] })
 * ```
 */
export declare function fileSourceFromHandle<TProvider extends string>(handle: FileHandle<TProvider>): ContentPartFileSource<TProvider>;
