import { ContentPart, ModelMessage } from '@tanstack/ai';
import { MediaRecord } from './types.js';
/** The URL scheme of a content part that points to a harness media file. */
export declare const MEDIA_URL_PREFIX = "harness-media:";
/**
 * True for a value with the shape of a `MediaRecord`, for example the answer
 * of an upload or the value of a `harness.media` event.
 *
 * @example
 * const value: unknown = await response.json()
 * if (isMediaRecord(value)) console.log(value.name)
 */
export declare function isMediaRecord(value: unknown): value is MediaRecord;
/**
 * The media kind of a MIME type, or `undefined` when the harness does not
 * store that type. `image/*`, `audio/*`, and `video/*` map to their kind.
 * `application/pdf` and `text/*` are documents.
 *
 * @example
 * kindOf('image/png') // 'image'
 * kindOf('application/zip') // undefined
 */
export declare function kindOf(mimeType: string): "image" | "video" | "audio" | "document" | undefined;
/**
 * The MIME type of a file name, a path, or a URL path, by its extension.
 * Returns `undefined` for no extension or an extension it does not know.
 * It knows the common image, audio, video, PDF, and text types.
 *
 * @example
 * mimeTypeOf('cat.PNG') // 'image/png'
 * mimeTypeOf('notes') // undefined
 */
export declare function mimeTypeOf(fileName: string): string | undefined;
/**
 * The content part that sends a stored media file to a turn. Its source is
 * the URL `harness-media:<id>`. The harness swaps it for the bytes only when
 * it calls the model, so the transcript stays small.
 *
 * @example
 * session.prompt([{ type: 'text', content: 'What is this?' }, mediaPart(record)])
 */
export declare function mediaPart(record: MediaRecord): ContentPart;
/**
 * The media id of a part made by `mediaPart`, or `undefined` for any other
 * value (text, a data source, a normal URL).
 *
 * @example
 * const ids = parts.map(mediaIdOf).filter((id) => id !== undefined)
 */
export declare function mediaIdOf(part: unknown): string | undefined;
/**
 * The media records saved on a message in `metadata.harness.media`: the
 * media a turn made, kept on its last assistant message. Entries with a bad
 * shape are skipped. Returns `[]` when there are none.
 *
 * @example
 * for (const media of mediaOfMessage(message)) console.log(media.name)
 */
export declare function mediaOfMessage(message: ModelMessage): MediaRecord[];
