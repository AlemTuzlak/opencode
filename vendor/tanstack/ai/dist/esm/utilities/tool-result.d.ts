import { ContentPart, ToolResultOutcome } from '../types.js';
export declare function isToolResultOutcome(value: unknown): value is ToolResultOutcome;
/**
 * Structural check for a single `ContentPart`. A text part must carry a string
 * `content`. Every other part carries a source with a string `value`; a file
 * source's `value` is a non-empty opaque handle, and its optional `provider`
 * is a string.
 */
export declare function isContentPart(value: unknown): value is ContentPart;
/**
 * True iff `value` is a NON-EMPTY array whose every element is a valid
 * `ContentPart`. Empty arrays and mixed arrays return false so they continue
 * to be treated as ordinary (stringified) data — this keeps the auto-detection
 * footgun narrow.
 */
export declare function isContentPartArray(value: unknown): value is Array<ContentPart>;
/**
 * Error text for a failed tool result: `output.error` when it is a string,
 * else the output itself when it is a string, else a generic message.
 * `StreamProcessor` and `chat()` history share it, so a reload shows the
 * same text as the live stream.
 */
export declare function toolResultErrorText(output: unknown): string;
/** Parse tool result content as JSON. Plain text stays a string. */
export declare function parseToolOutput(content: string): unknown;
/**
 * Normalize a tool's return value for transport:
 * - string            → unchanged
 * - ContentPart array → unchanged (multimodal, passed through to the adapter)
 * - anything else     → `JSON.stringify`
 */
export declare function normalizeToolResult(result: unknown): string | Array<ContentPart>;
