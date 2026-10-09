import { AnyChatMiddleware, ModelMessage, RunRecord, RunStore } from '@tanstack/ai';
import { MessageStore } from '@tanstack/ai-persistence';
import { HarnessDurability } from './define.js';
import { RecoverContext } from './turn.js';
/** How often a running host renews its lease, and when a lease expires. */
export declare const LEASE: {
    renewMs: number;
    ttlMs: number;
};
/** Lease timing for a host. A missing field uses {@link LEASE}. */
export interface LeaseOptions {
    /** How long a lease lasts after each renewal, in milliseconds. */
    ttlMs?: number;
    /** How often the running host renews its lease, in milliseconds. */
    renewMs?: number;
}
/** The tool result a crash leaves for a tool that must not run twice. */
export declare const INTERRUPTED_TOOL_RESULT: {
    interrupted: boolean;
    note: string;
};
/** The tool result of a call in an answer that stopped at the output limit. */
export declare const TRUNCATED_TOOL_RESULT = "The answer was cut off at the output limit before this tool call was complete. The call did not run.";
/** The user message after an answer that a crash cut. */
export declare const CUT_OFF_NOTE = "The previous answer was cut off. Continue exactly where it stopped, without repeating it.";
export type PendingTool = {
    toolCallId: string;
    name: string;
    replay: 'safe' | 'never';
};
/**
 * Hold the lease on run `runId` and renew it. Returns the function that stops
 * the renewal. A host that stops lets the lease expire, so recovery can tell
 * the run is dead.
 */
export declare function holdRunLease(runs: RunStore | undefined, runId: string, hostId: string, lease?: LeaseOptions): Promise<() => void>;
/**
 * Chat middleware that makes a turn resumable after a crash:
 *
 * - holds a lease on the run record and renews it while the turn runs;
 * - saves the transcript before and after each tool phase;
 * - records each tool call that started but has no result yet;
 * - gives `onToolResult` the tool message of each call that ends.
 */
export declare function checkpointMiddleware(options: {
    runs?: RunStore;
    messages: MessageStore;
    hostId: string;
    lease?: LeaseOptions;
    /** Called before each tool call runs, after its checkpoint is saved. */
    onToolStart?: (info: {
        toolCallId: string;
        name: string;
        replay: 'safe' | 'never';
    }) => void | Promise<void>;
    /** Called after each tool call ends, with the tool message the model gets. */
    onToolResult?: (info: {
        toolCallId: string;
        message: ModelMessage;
    }) => void | Promise<void>;
}): AnyChatMiddleware;
/** Chat and agent runs of this thread that a crashed host left `running`. */
export declare function findCrashedRuns(runs: RunStore | undefined, threadId: string, now?: number): Promise<Array<RunRecord>>;
/** A tool call that a repair closes with an error result, and why. */
export type ClosedToolCall = RecoverContext['interruptedTools'][number];
/**
 * What a repair of `history` adds for each tool call of the batch (the last
 * assistant message with tool calls), in order:
 *
 * - A call in `finished` gets its finished tool message. It does not run
 *   again.
 * - A call of an answer that stopped at the output limit (finish reason
 *   `length`) is closed as `truncated`. It never runs.
 * - A pending call with `replay: 'never'` is closed as `interrupted`.
 * - A pending call with `replay: 'safe'`, or a call that never started, gets
 *   nothing, so the engine runs it.
 */
export declare function repairSteps(history: ReadonlyArray<ModelMessage>, 
/** The tool calls that started and have no result. */
pending: ReadonlyArray<PendingTool>, 
/** Tool messages of calls that finished before the crash, by toolCallId. */
finished?: ReadonlyMap<string, ModelMessage>): Array<ModelMessage | ClosedToolCall>;
/**
 * Prepare the transcript of a crashed thread for a new run, with the
 * {@link repairSteps}. A `truncated` call gets `truncated`, else
 * {@link TRUNCATED_TOOL_RESULT}, as a tool error. An `interrupted` call gets
 * `interrupted`, else {@link INTERRUPTED_TOOL_RESULT}, as a tool error.
 */
export declare function repairTranscript(options: {
    messages: MessageStore;
    threadId: string;
    /** The tool calls that started and have no result. */
    pending: ReadonlyArray<PendingTool>;
    /** Tool messages of calls that finished before the crash, by toolCallId. */
    finished?: ReadonlyMap<string, ModelMessage>;
    /** The content and error of a cut `replay: 'never'` call. */
    interrupted?: string;
    /** The content and error of a call that the output limit cut. */
    truncated?: HarnessDurability['truncatedToolResult'];
}): Promise<void>;
