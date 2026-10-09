import { EmitCustomEventOptions, StreamChunk } from '@tanstack/ai';
export interface BridgeEventChannel {
    /** Pass as the bridge's `emitCustomEvent`; buffers a CUSTOM chunk for the stream. */
    emitCustomEvent: (eventName: string, value: Record<string, unknown>, options?: EmitCustomEventOptions) => void;
    /** Live CUSTOM-chunk stream; ends after {@link close} once drained. */
    stream: AsyncIterable<StreamChunk>;
    /** Stop the stream (call when the run's main output is done). */
    close: () => void;
}
/** Create a channel whose emitted events become CUSTOM {@link StreamChunk}s. */
export declare function createBridgeEventChannel(meta: {
    model: string;
    threadId?: string;
    runId?: string;
}): BridgeEventChannel;
/**
 * Merge a `side` chunk stream into a `base` chunk stream, yielding from whichever
 * settles first. Terminates when `base` ends (the run is over), then releases the
 * side iterator — so a never-ending channel (until closed) doesn't hang the merge.
 */
export declare function mergeChunkStreams(base: AsyncIterable<StreamChunk>, side: AsyncIterable<StreamChunk>): AsyncIterable<StreamChunk>;
