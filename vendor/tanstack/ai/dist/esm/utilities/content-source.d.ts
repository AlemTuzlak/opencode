import { ContentPartFileSource, ContentPartSource } from '../types.js';
/**
 * Narrow a {@link ContentPartSource} to the provider-file-reference arm.
 *
 * Issuer adapters use this to route a file source to their native wire field;
 * everyone else is protected by the core preflight (see
 * {@link assertMessagesFileSourceSupport}) plus a defensive throw at their own
 * mapping site.
 */
export declare function isFileSource(source: ContentPartSource): source is ContentPartFileSource;
/**
 * Resolve the handle `providerName` should send for a file source.
 *
 * A file source carries one opaque handle (`value`) and, optionally, the
 * provider that issued it. An adapter always knows which provider it talks
 * to, so a source that names no provider is taken as-is.
 *
 * @throws when the source names a different issuing provider. A handle only
 * resolves at the provider that minted it.
 */
export declare function fileReferenceFor(source: ContentPartFileSource, providerName: string): string;
/**
 * Build the standard error a non-issuer adapter throws when it encounters a
 * `{ type: 'file' }` source it can't consume — either because the provider has
 * no file-reference input surface, or because the endpoint requires raw bytes
 * (image edits, Veo) rather than a reference.
 *
 * @param detail Optional context appended to the message (e.g. a modality or
 * endpoint name, or a pointer to the adapter that does support references).
 * When provided it replaces the generic remediation tail, so a site-specific
 * hint ("pass inline bytes") is never contradicted by generic advice.
 */
export declare function unsupportedFileSourceError(providerName: string, detail?: string): Error;
/**
 * The slice of an adapter the file-source preflight reads. Adapters that can
 * consume `{ type: 'file' }` sources declare `supportsFileSources: true`;
 * everything else — including adapters written before this arm existed —
 * fails closed at the activity layer instead of falling through to a
 * URL/data branch and silently mis-mapping the reference.
 */
export interface FileSourceCapable {
    name: string;
    supportsFileSources?: boolean;
}
/**
 * Fail-closed preflight for media prompts and embedding inputs
 * (`generateImage` / `generateVideo` / `embed`): throws when the input
 * carries a `{ type: 'file' }` source and the adapter hasn't declared
 * `supportsFileSources`. Runs in the activity dispatcher — the same layer
 * that validates modality — so an adapter that predates the file arm can
 * never receive one. Walks a single part, an array of parts, and nested
 * arrays (fused embedding items).
 */
export declare function assertPromptFileSourceSupport(adapter: FileSourceCapable, prompt: unknown): void;
/**
 * Fail-closed preflight for chat messages: throws when any message content
 * part carries a `{ type: 'file' }` source and the adapter hasn't declared
 * `supportsFileSources`. See {@link assertPromptFileSourceSupport}.
 */
export declare function assertMessagesFileSourceSupport(adapter: FileSourceCapable, messages: ReadonlyArray<unknown>): void;
