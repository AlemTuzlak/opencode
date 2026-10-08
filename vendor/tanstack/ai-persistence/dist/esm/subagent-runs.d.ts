import { Interrupt, ModelMessage, RunAgentResumeItem, RunStore, StreamChunk, SubagentWireInfo, UIMessage } from '@tanstack/ai';
import { InterruptStore, MessageStore, SessionIndexStore } from './types.js';
export declare function subagentHostRunId(metadata: unknown): string | undefined;
export declare function selectSubagentHost<T extends {
    id?: string;
    role: string;
    metadata?: unknown;
}>(messages: ReadonlyArray<T>, runId: string, text: (message: T) => string, summaries: ReadonlyArray<string>): number;
/**
 * Card data for a stored child transcript. It rides on the first message, in
 * `metadata.tanstack.subagent`, the same shape the wire uses.
 */
export declare function storedSubagentInfo(messages: ReadonlyArray<ModelMessage>): SubagentWireInfo | undefined;
export declare function createSubagentRunRecorder(stores: {
    messages: MessageStore;
    runs?: RunStore;
    interrupts?: InterruptStore;
    /** When present, each child gets a session index entry. */
    sessions?: SessionIndexStore;
    /** Minimum milliseconds between writes while a child streams. */
    intervalMs?: number;
}): {
    loadChild: (subagentRunId: string, caller: {
        threadId: string;
        subagentRunId?: string;
    }) => Promise<{
        agent?: string | undefined;
        messages: ModelMessage<string | import('@tanstack/ai').ContentPart<unknown, unknown, unknown, unknown, unknown>[] | null>[];
    } | undefined>;
    start(input: {
        threadId: string;
        runId: string;
        messages: ReadonlyArray<UIMessage | ModelMessage>;
        resume?: ReadonlyArray<RunAgentResumeItem>;
    }): Promise<void>;
    chunk(input: {
        threadId: string;
        runId: string;
        /** Set when the chat that streams this chunk is a child itself. */
        subagentRunId?: string;
        chunk: StreamChunk;
    }): Promise<void>;
    suspend(input: {
        threadId: string;
        runId: string;
        interrupts: ReadonlyArray<Interrupt>;
    }): Promise<void>;
    finish(input: {
        threadId: string;
        runId: string;
    }): Promise<void>;
    abort(input: {
        threadId: string;
        runId: string;
        error?: unknown;
    }): Promise<void>;
};
