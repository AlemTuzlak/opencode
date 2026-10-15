import { ModelMessage, ModelMessageBlock, ToolCall } from '../types.js';
/** One block of an assistant answer, in the order the model produced it. */
export type BlockOrderEntry = {
    type: 'thinking';
} | {
    type: 'text';
    text: string;
} | {
    type: 'tool-call';
    id: string;
};
/**
 * The order map for these entries in produced order, or undefined when they
 * are in the default order (all thinking, then text, then tool calls).
 * Adjacent text entries merge into one, and empty text is left out. The n-th
 * thinking entry gets index n.
 */
export declare function buildBlockOrder(entries: ReadonlyArray<BlockOrderEntry>): Array<ModelMessageBlock> | undefined;
/** A block of an assistant message, resolved from its order map. */
export type OrderedAssistantBlock = {
    type: 'thinking';
    thinking: NonNullable<ModelMessage['thinking']>[number];
} | {
    type: 'text';
    text: string;
} | {
    type: 'tool-call';
    toolCall: ToolCall;
};
/**
 * The blocks of an assistant message in map order, or undefined when the
 * message has no map or the map does not match the message. A map matches
 * when it uses each `thinking` entry and each `toolCalls` entry exactly once,
 * and its text lengths add up to the length of the text content (`null`
 * content counts as no text). Readers use the default order when this
 * returns undefined.
 */
export declare function orderedAssistantBlocks(message: ModelMessage): Array<OrderedAssistantBlock> | undefined;
