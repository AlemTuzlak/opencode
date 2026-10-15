/**
 * Byte-exact framing for journal reads.
 *
 * Both read paths end in {@link toJournalLines}, which counts absolute file
 * offsets over BYTES, because a position is only useful if `tail -c +N` can
 * resume from it. The two paths differ only in how they get bytes:
 *
 * - The **bounded** read is base64-framed (see `journal.ts` rule 2) and arrives
 *   as one complete `ExecResult.stdout` string, so {@link decodeBase64Stream}
 *   recovers the file's exact bytes regardless of how the provider decoded its
 *   stdout.
 * - The **follow** read cannot be base64-framed — the encoder's stdio buffer
 *   would swallow the stream — so it arrives as provider-decoded text chunks
 *   and {@link encodeUtf8Stream} turns them back into bytes.
 *
 * `atob`, not `Buffer`: this module runs on the host, and the host can itself be
 * a Cloudflare Worker (`ai-sandbox-cloudflare` drives its sandbox over Workers
 * RPC from Worker code), where `Buffer` is not a global unless the `nodejs_compat`
 * flag is on. `atob` is a Web/DOM API available in every host runtime this
 * package targets, so it is the portable choice here.
 */
/**
 * Decode a streaming base64 frame into raw bytes.
 *
 * Whitespace is stripped because `base64(1)` wraps at 76 columns by default and
 * busybox's build does not accept `-w 0`, so the wrapping cannot be turned off
 * portably. Only complete 4-character quanta are decoded; a remainder is held
 * for the next chunk. Padding (`=`) appears only in the final quantum, so an
 * intermediate group always decodes to exactly 3 bytes.
 */
export declare function decodeBase64Stream(chunks: AsyncIterable<string>): AsyncIterable<Uint8Array>;
/**
 * Re-encode provider-decoded text chunks as UTF-8 bytes.
 *
 * This is the follow path's replacement for {@link decodeBase64Stream}: the
 * follow command emits the journal's raw bytes, the provider hands them over as
 * `AsyncIterable<string>`, and `TextEncoder` round-trips that text back to the
 * bytes it was decoded from. Chunk boundaries do not need to fall on character
 * boundaries here — {@link toJournalLines} buffers bytes until a newline, so a
 * multi-byte character split across two chunks is reassembled there, exactly as
 * it is on the base64 path.
 *
 * Empty chunks are dropped rather than forwarded: a zero-length `Uint8Array`
 * carries no bytes and would only make the downstream loop spin.
 */
export declare function encodeUtf8Stream(chunks: AsyncIterable<string>): AsyncIterable<Uint8Array>;
/** One complete journal line plus the absolute byte position just past its newline. */
export interface JournalLine {
    /** The line's text, newline excluded. */
    line: string;
    /**
     * Absolute byte offset immediately AFTER this line's newline — i.e. the count
     * of journal bytes fully consumed once this line has been handled, and
     * therefore the exact value to resume a `tail -c +N` from.
     */
    endPosition: number;
}
/**
 * Split a byte stream into newline-terminated lines, tracking absolute
 * positions from `startPosition`.
 *
 * Deliberately unlike `toLines` in `runner.ts`, which yields a trailing
 * unterminated line: here a trailing partial line is a line the agent is still
 * writing. Yielding it would hand a truncated JSON string downstream AND
 * advance the position past bytes the next read must re-see.
 */
export declare function toJournalLines(byteChunks: AsyncIterable<Uint8Array>, startPosition: number): AsyncIterable<JournalLine>;
