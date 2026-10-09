import { SubagentInfo as AGUISubagentInfo } from '@ag-ui/core';
import { SubagentHandleData } from '../types.js';
/**
 * Card data that travels on each child wire message, in
 * `metadata.tanstack.subagent`. The messages carry the AG-UI `subagentRunId`.
 */
export interface SubagentWireInfo extends AGUISubagentInfo, Pick<SubagentHandleData, 'status' | 'error' | 'interruptIds' | 'parentSubagentRunId' | 'parentToolCallId' | 'metadata'> {
    /** The child has no messages yet. This wire message only holds the card. */
    placeholder?: true;
}
export interface SubagentWireGroup<T> {
    id: string;
    info: SubagentWireInfo;
    /** The child's messages without its own tag. Nested children keep theirs. */
    messages: Array<T>;
    /** Index in `top` of the last message before this child, or -1. */
    hostIndex: number;
}
export declare function wireSubagentRunId(message: unknown): string | undefined;
export declare function wireSubagentInfo(message: unknown): SubagentWireInfo | undefined;
/**
 * Split wire messages into the parent's own messages and one group per direct
 * child. A nested child's messages stay inside its parent's group.
 */
export declare function splitSubagentWire<T>(messages: ReadonlyArray<T>): {
    top: Array<T>;
    groups: Array<SubagentWireGroup<T>>;
};
/** Text a child wrote, for the parent model and for a later child. */
export declare function subagentWireText(messages: ReadonlyArray<unknown>): string;
/**
 * The id of the parent assistant message that hosts a routed turn's cards.
 * The persistence recorder writes that message, and a handoff run passes the
 * same id so the stored thread keeps one copy.
 */
export declare function subagentHostMessageId(runId: string): string;
