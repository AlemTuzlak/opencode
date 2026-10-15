import { AdapterYieldChunk } from '@tanstack/ai';
import { ConverseStreamOutput } from '@aws-sdk/client-bedrock-runtime';
/**
 * Converse delivers server-side failures — throttling, request validation,
 * mid-stream model faults, and service-unavailable — as in-band stream events
 * rather than thrown exceptions. If they were ignored the iterator would simply
 * end and the run would look like a clean, truncated success. Throw the
 * underlying exception (these SDK members extend `Error`) so the adapter's
 * `chatStream` / `structuredOutputStream` catch converts it into a `RUN_ERROR`.
 */
export declare function throwIfConverseStreamError(ev: ConverseStreamOutput): void;
/** Map Converse blocks to run, text, reasoning, and tool events.
 * Keep signatures and encrypted bytes separate for each contentBlockIndex.
 * Finish after trailing usage events. The adapter handles thrown errors.
 */
export declare function processConverseStream(stream: AsyncIterable<ConverseStreamOutput>, newMessageId: () => string, lifecycle?: {
    threadId?: string;
    parentRunId?: string;
    model?: string;
}): AsyncIterable<AdapterYieldChunk>;
