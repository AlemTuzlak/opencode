import { ModelMessage, Modality, SystemPrompt } from '@tanstack/ai';
import { Message, SystemContentBlock } from '@aws-sdk/client-bedrock-runtime';
interface ConverseReplayContext {
    model: string;
    provider?: string;
    inputModalities: ReadonlyArray<Modality>;
}
/**
 * Convert TanStack AI messages + system prompts into the Converse API format.
 *
 * - System prompts are lifted into `SystemContentBlock[]`; a prompt whose
 *   `metadata.cachePoint` is set is followed by a `cachePoint` block.
 * - `tool` role messages are remapped to `user` role `toolResult` blocks.
 * - Consecutive messages with the same Converse role are merged (Converse
 *   requires strict user/assistant alternation).
 */
export declare function toConverseMessages(messages: Array<ModelMessage>, systemPrompts?: Array<SystemPrompt>, context?: ConverseReplayContext): {
    system: Array<SystemContentBlock>;
    messages: Array<Message>;
};
/**
 * Write the `toolUse` and `toolResult` blocks as text blocks. Bedrock rejects
 * these blocks in a request with no `toolConfig`, so a request with no tools
 * sends its tool history this way. An image of a tool result stays an image
 * block: the result is in a user message, and a user message takes images.
 * The function returns new messages and does not change `messages`.
 */
export declare function toolBlocksToText(messages: Array<Message>): Array<Message>;
export {};
