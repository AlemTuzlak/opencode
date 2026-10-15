import { CustomEvent, StreamChunk } from '../types.js';
/** Mark a CUSTOM chunk so the durability producer keeps it in the batch. */
export declare function withDurabilityBatchHint(chunk: CustomEvent): CustomEvent;
export declare function isDurabilityBatchedCustom(chunk: StreamChunk): boolean;
/**
 * Drop the in-process batch hint so it does not sit in the log or on the wire.
 */
export declare function stripDurabilityBatchHint(chunk: StreamChunk): StreamChunk;
