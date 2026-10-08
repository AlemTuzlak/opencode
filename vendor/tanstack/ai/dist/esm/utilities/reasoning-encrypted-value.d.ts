import { ReasoningEncryptedValueEvent } from '../types.js';
/** Spec event that carries a provider thinking / tool-call signature blob. */
export declare function reasoningEncryptedValue(opts: {
    subtype: 'message' | 'tool-call';
    entityId: string;
    encryptedValue: string;
    timestamp?: number;
}): ReasoningEncryptedValueEvent;
/**
 * Id prefix for the reasoning message of a redacted thinking block (Anthropic
 * `redacted_thinking`). AG-UI's `encryptedValue` does not say what kind of
 * bytes it holds (ag-ui-protocol/ag-ui#2884), so the id that `entityId` points
 * to says it. AG-UI clients keep message ids, but they drop event metadata.
 */
export declare const REDACTED_THINKING_ID_PREFIX = "redacted_thinking-";
export declare function isRedactedThinkingId(id: unknown): boolean;
