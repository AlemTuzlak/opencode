import { ModelMessage } from '@tanstack/ai';
/** How many stored messages the merge keeps. Less than `stored.length` on a reload. */
export declare function storedCutoff(stored: ReadonlyArray<ModelMessage>, incoming: ReadonlyArray<ModelMessage>): number;
export declare function mergeStoredMessages(stored: ReadonlyArray<ModelMessage>, incoming: ReadonlyArray<ModelMessage>): ModelMessage<string | import('@tanstack/ai').ContentPart<unknown, unknown, unknown, unknown, unknown>[] | null>[];
