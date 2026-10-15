import { MidConversationChange, MidConversationChanges, ModelMessage } from '../types.js';
/**
 * FNV-1a 32-bit over the UTF-16 code units of `content`, as 8 lowercase hex
 * characters. A short, stable id for one system prompt.
 */
export declare function promptHash(content: string): string;
export interface MidConversationPlan {
    changes: MidConversationChanges;
    /** The record to save on the first assistant message of this call, if any. */
    record?: MidConversationChange;
}
/**
 * Fold the records in `messages`, compare them with the tools and prompts of
 * this call, and decide. A change is additive when every recorded tool is
 * still there, the prompts start with the recorded prompts, and the start
 * point has a tool or no tool was added. Anything else is a new start point.
 * Pure.
 */
export declare function planMidConversationChanges(input: {
    messages: ReadonlyArray<ModelMessage>;
    toolNames: ReadonlyArray<string>;
    /** The normalized content of each system prompt, in order. */
    systemPrompts: ReadonlyArray<string>;
}): MidConversationPlan;
export interface MidConversationRequest<TTool, TPrompt> {
    startTools: Array<TTool>;
    startSystemPrompts: Array<TPrompt>;
    /** Every added tool, in change order. */
    addedTools: Array<TTool>;
    /** The changes by message index (`before`). */
    at: Map<number, {
        tools: Array<TTool>;
        systemPrompts: Array<TPrompt>;
    }>;
}
/**
 * For adapters: resolve the names and counts of `changes` against the current
 * `tools` and `systemPrompts`. Returns `undefined` when a name is missing, a
 * name is used twice, or the counts do not add up. Then the adapter sends the
 * request it sends today.
 */
export declare function splitMidConversationChanges<TTool extends {
    name: string;
}, TPrompt>(input: {
    changes: MidConversationChanges;
    tools: ReadonlyArray<TTool>;
    systemPrompts: ReadonlyArray<TPrompt>;
}): MidConversationRequest<TTool, TPrompt> | undefined;
