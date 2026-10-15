import { ImagePart, MediaInputMetadata } from '@tanstack/ai';
/**
 * Convert a TanStack `ImagePart` into an OpenAI-compatible `File`.
 *
 * - `source.type === 'data'`: decode base64 → Buffer → File.
 * - `source.type === 'url'` with a `data:` URI: parse in-memory → File.
 * - `source.type === 'url'` with an HTTP(S) URL: fetch → File, but only when
 *   `allowUrlFetch` is set. OpenAI's `/images/edits` and Sora
 *   `input_reference` require real file bytes (no URL passthrough), so the
 *   image has to be downloaded and buffered in memory — which can OOM
 *   constrained runtimes. Off by default; the caller opts in.
 *
 * The mime type comes from the source when available, else inferred from the
 * URL extension, else `image/png`.
 */
export declare function imagePartToFile(part: ImagePart<MediaInputMetadata>, fallbackName: string, allowUrlFetch: boolean): Promise<File>;
