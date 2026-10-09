/**
 * Coerce the various audio input shapes accepted by `TranscriptionOptions.audio`
 * into a `File` suitable for `multipart/form-data` uploads.
 *
 * For base64 string inputs we require an explicit MIME type — either via a
 * `data:<mime>;base64,<payload>` URI prefix, or via the caller-provided
 * `audioFormat` parameter. Bare base64 without either is rejected, because
 * silently defaulting to `audio/mpeg` misreports non-mp3 audio to the server.
 *
 * The same rule applies to raw `ArrayBuffer` inputs: the caller must supply
 * an `audioFormat` so we know what MIME type and extension to use.
 */
export declare function toAudioFile(audio: string | File | Blob | ArrayBuffer, audioFormat?: string): File;
/**
 * Cross-runtime ArrayBuffer → base64 conversion.
 *
 * Uses Node's `Buffer` when available (fastest path on server) and falls
 * back to `btoa` + chunked `String.fromCharCode` everywhere else (browser,
 * Cloudflare Workers, Bun, Deno). Chunking is required because a very
 * large audio buffer spread into `String.fromCharCode(...bytes)` in one
 * call can hit `Maximum call stack size exceeded`.
 */
export declare function arrayBufferToBase64(buffer: ArrayBuffer): string;
