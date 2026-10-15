import { Message as AGUIMessage } from '@ag-ui/core';
import { ContentPart, ModelMessage, SubagentPart, UIMessage, UIResourcePart } from '../../types.js';
export declare function safeJsonStringify(value: unknown): string;
/** Child text for a later turn. The name stays so the next agent can tell the notes apart. */
export declare function subagentHistoryText(part: SubagentPart): string;
/**
 * Convert UIMessages or ModelMessages to ModelMessages
 */
export declare function convertMessagesToModelMessages(messages: Array<UIMessage | ModelMessage>): Array<ModelMessage>;
export declare function restoreToolResultOwnership<T extends object>(message: T): T;
/**
 * Rebuild a `Date` from a live `Date` or from an ISO string.
 * `JSON.stringify` turns `Date` into a string, so persistence reload
 * and AG-UI wire both land here as strings.
 */
export declare function coerceCreatedAt(value: unknown): Date | undefined;
/**
 * Build a UIResourcePart from the value of a CUSTOM `ui-resource` chunk
 * emitted via `ctx.emitCustomEvent('ui-resource', ...)` (MCP Apps). The
 * emission-side value carries `resource`/`serverId`/`toolName` plus the
 * `toolCallId` stamped by the tool-call context wrapper — the `type`
 * discriminator is added here. Returns undefined when the value does not
 * match the ui-resource shape.
 */
export declare function uiResourcePartFromCustomValue(value: unknown): UIResourcePart | undefined;
/**
 * Store an emitted ui-resource part on the assistant ModelMessage that owns
 * its `toolCallId` (the tool-call anchor), so it survives later
 * MESSAGES_SNAPSHOT chunks — e.g. the interrupt snapshot emitted when the
 * run pauses on a client tool (#1397). Mirrors how `toolCallMetadata` is
 * preserved on the anchor (#867).
 *
 * Returns the SAME array reference when no anchor owns the tool call or the
 * resource is already stored (idempotent).
 */
export declare function appendUiResourceToModelMessages(messages: Array<ModelMessage>, part: UIResourcePart): Array<ModelMessage>;
/**
 * Convert a UIMessage to ModelMessage(s)
 *
 * Walks the parts array IN ORDER to preserve the interleaving of text,
 * tool calls, and tool results. This is critical for multi-round tool
 * flows where the model generates text, calls a tool, gets the result,
 * then generates more text and calls another tool.
 *
 * The output preserves the sequential structure:
 *   text1 → toolCall1 → toolResult1 → text2 → toolCall2 → toolResult2
 * becomes:
 *   assistant: {content: "text1", toolCalls: [toolCall1]}
 *   tool: toolResult1
 *   assistant: {content: "text2", toolCalls: [toolCall2]}
 *   tool: toolResult2
 *
 * @param uiMessage - The UIMessage to convert
 * @returns An array of ModelMessages preserving part ordering
 */
export declare function uiMessageToModelMessages(uiMessage: UIMessage): Array<ModelMessage>;
/**
 * Convert a ModelMessage to UIMessage
 *
 * This conversion creates a parts-based structure:
 * - content field → TextPart
 * - toolCalls array → ToolCallPart[]
 * - role="tool" messages should be converted separately and merged
 *
 * @param modelMessage - The ModelMessage to convert
 * @param id - Optional ID for the UIMessage (generated if not provided)
 * @returns A UIMessage with parts
 */
export declare function modelMessageToUIMessage(modelMessage: ModelMessage, id?: string): UIMessage;
/**
 * Normalize a single AG-UI `MESSAGES_SNAPSHOT` message into a `UIMessage`.
 *
 * AG-UI snapshot messages use the wire shape `{ id, role, content }` and have
 * no `parts` array. Casting them directly to `UIMessage` is unsafe: any code
 * that later reads `message.parts` (e.g. the devtools `onToolCallStateChange`
 * handler) crashes with "Cannot read properties of undefined (reading 'find')".
 *
 * Each role is mapped to the canonical `UIMessage` shape, reusing
 * `modelMessageToUIMessage` for the roles that share `ModelMessage`'s structure.
 * The original AG-UI `id` is preserved so later `TEXT_MESSAGE_CONTENT` /
 * `TOOL_CALL_*` events still route by `messageId` (falling back to a generated
 * id only when the snapshot omits one). Messages that already carry `parts`
 * (e.g. a TanStack server echoing `UIMessage`s back over the wire) pass through
 * unchanged apart from ensuring an id.
 */
export declare function aguiSnapshotMessageToUIMessage(message: AGUIMessage | UIMessage): UIMessage;
/** Convert wire content parts. Data, url, and file sources pass through. */
export declare function aguiContentToContentParts(content: Extract<AGUIMessage, {
    role: 'user';
}>['content']): string | Array<ContentPart>;
/**
 * Convert an array of ModelMessages to UIMessages
 *
 * This handles merging tool result messages with their corresponding assistant
 * messages, and assistant segments that share the same stable message ID.
 *
 * @param modelMessages - Array of ModelMessages to convert
 * @returns Array of UIMessages
 */
export declare function modelMessagesToUIMessages(modelMessages: Array<ModelMessage>): Array<UIMessage>;
/**
 * Normalize a message (UIMessage or ModelMessage) to a UIMessage
 * Ensures the message has an ID and createdAt timestamp
 *
 * @param message - Either a UIMessage or ModelMessage
 * @param generateId - Function to generate a message ID if needed
 * @returns A UIMessage with guaranteed id and createdAt
 */
export declare function normalizeToUIMessage(message: UIMessage | ModelMessage, generateId: () => string): UIMessage;
/**
 * Generate a unique message ID
 */
export declare function generateMessageId(): string;
