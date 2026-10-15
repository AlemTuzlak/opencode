import { ModelMessage, StreamChunk } from '@tanstack/ai';
import { LogEntry, LogRecord, LogStore, MessageStore, MetadataStore } from '@tanstack/ai-persistence';
import { EventFeed } from './feed.js';
import { Cursor, HarnessInput, InputSettlement, WaitingInput } from './types.js';
import { SessionUsage, UsageCall } from './usage.js';
/** The records the harness writes to a session log. */
export type HarnessRecord = {
    type: 'harness.event';
    operationId: string;
    event: StreamChunk;
} | {
    type: 'harness.transcript';
    keep: number;
    add: Array<ModelMessage>;
} | {
    type: 'harness.input';
    inputId: string;
    input: HarnessInput;
    principal?: {
        id: string;
        tenantId?: string;
    };
    at: number;
} | {
    type: 'harness.input.applied';
    inputId: string;
    operationId: string;
    attempt: number;
    timeoutAt?: number;
} | {
    type: 'harness.input.joined';
    inputId: string;
    into: string;
} | {
    type: 'harness.input.rejected';
    inputId: string;
    reason: string;
} | {
    type: 'harness.input.abort';
    inputId: string;
} | {
    type: 'harness.turn.retry';
    inputId: string;
    operationId: string;
    retries: number;
} | {
    type: 'harness.input.delivery';
    inputId: string;
    delivery: WaitingInput['delivery'];
} | {
    type: 'harness.input.settled';
    inputId: string;
    outcome: InputSettlement['outcome'];
    operationId?: string;
    error?: InputSettlement['error'];
} | {
    type: 'harness.tool.result';
    toolCallId: string;
    message: ModelMessage;
} | {
    type: 'harness.tool.started';
    toolCallId: string;
    name: string;
    replay: 'safe' | 'never';
} | {
    type: 'harness.tool.step';
    toolCallId: string;
    name: string;
    value: unknown;
} | ({
    type: 'harness.usage';
} & UsageCall)
/** A revert that stands, or `null` when it ended. */
 | {
    type: 'harness.revert';
    revert: RevertState | null;
}
/** A background job started, or it ended. */
 | {
    type: 'harness.job';
    jobId: string;
    ended: boolean;
}
/** A note for the transcript. `noteId` is the id of its message. */
 | {
    type: 'harness.note';
    noteId: string;
    note: string;
};
/**
 * A revert that stands: the transcript hides the messages after
 * `messageId`. `files` is what the snapshots plugin needs to put the files
 * back, when it changed files.
 */
export interface RevertState {
    messageId: string;
    files?: unknown;
}
/** The {@link RevertState} in `value`, or `undefined` when it is not one. */
export declare function revertOf(value: unknown): RevertState | undefined;
/**
 * Fold one host record into the model context. Return the new message list,
 * or `undefined` for no change. It must be pure: the same log always folds to
 * the same context, live and after a restart.
 */
export type ProjectRecord = (args: {
    messages: ReadonlyArray<ModelMessage>;
    record: LogRecord;
}) => Array<ModelMessage> | undefined;
/** How a host folds its own records into the model context. */
export interface ProjectOptions {
    record: ProjectRecord;
    /**
     * The version of `record`. A fold checkpoint with another version is
     * ignored, so a change to `record` never reads an old fold.
     */
    version?: string;
}
/** What the log knows about one input. */
export interface InputState {
    inputId: string;
    input: HarnessInput;
    principal?: {
        id: string;
        tenantId?: string;
    };
    at: number;
    status: 'pending' | 'applied' | 'joined' | 'rejected' | 'settled';
    operationId?: string;
    attempt: number;
    timeoutAt?: number;
    /** The host input that this input joined. */
    into?: string;
    abortRequested: boolean;
    /** Model retries since the last finished tool phase. Recovery starts from it. */
    retries?: number;
    /** The delivery that a `setDelivery` input set. Recovery honors it. */
    delivery?: WaitingInput['delivery'];
    /** Transcript length when the input was last applied. */
    appliedAt?: number;
    settlement?: InputSettlement;
    reason?: string;
}
/** The fold of a session log. */
export interface LogState {
    /** The position of the last folded record. */
    seq: number;
    messages: Array<ModelMessage>;
    /**
     * The position of the last transcript record. The events after it are not
     * in the transcript. Unknown after a fold checkpoint from before this field.
     */
    transcriptSeq?: number;
    /** In admission order. */
    inputs: Map<string, InputState>;
    toolResults: Map<string, ModelMessage>;
    /** Tool calls that started, by toolCallId. Batch repair reads them. */
    started: Map<string, {
        name: string;
        replay: 'safe' | 'never';
    }>;
    /** By {@link stepKey}. */
    steps: Map<string, unknown>;
    /** The usage of every model call of the thread. */
    usage: SessionUsage;
    /** The revert that stands, if any. */
    revert?: RevertState;
    /** Background jobs that started and did not end. */
    jobs: Set<string>;
    /** Notes that are not in the transcript yet, by message id. */
    notes: Map<string, string>;
}
export declare function emptyLogState(): LogState;
export declare const stepKey: (toolCallId: string, name: string) => string;
/** How many messages at the start of `a` and `b` are the same. */
export declare function commonPrefix(a: ReadonlyArray<ModelMessage>, b: ReadonlyArray<ModelMessage>): number;
/** Fold one entry into `state`. */
export declare function foldEntry(state: LogState, entry: LogEntry, project?: ProjectRecord): void;
/** A fold of every host record of a log, across its sessions, in log order. */
export interface ReduceOptions<TState> {
    /** The state of an empty log. JSON. */
    initial: TState;
    /** Pure. Return the next state, or the same state for no change. */
    record: (args: {
        state: TState;
        record: LogRecord;
    }) => TState;
    /** A fold checkpoint with another version is ignored. */
    version?: string;
}
/** The fold of a whole log: one state per session, and the reduce state. */
export interface SharedLogState<TState = unknown> {
    /** The position of the last folded record. */
    seq: number;
    /** By thread id. */
    sessions: Map<string, LogState>;
    reduced: TState | undefined;
}
export declare function emptySharedLogState<TState = unknown>(reduce?: ReduceOptions<TState>): SharedLogState<TState>;
/** The fold of session `thread`. A session with no records yet gets an empty one. */
export declare function sessionOf(state: SharedLogState<unknown>, thread: string): LogState;
/** The session of a record: its `thread`, or the session whose thread id is the log id. */
export declare const threadOf: (record: LogRecord, logId: string) => string;
interface FoldOptions<TState> {
    logId: string;
    project?: ProjectRecord;
    reduce?: ReduceOptions<TState>;
}
/** Fold one entry of a shared log. */
export declare function foldLogEntry<TState>(state: SharedLogState<TState>, entry: LogEntry, options: FoldOptions<TState>): void;
/**
 * Fold the log `logId`. With `metadata`, start from the newest fold
 * checkpoint when it is valid for this log and these versions.
 */
export declare function loadLogState<TState = unknown>(options: {
    store: LogStore;
    logId: string;
    metadata?: MetadataStore;
    project?: ProjectOptions;
    reduce?: ReduceOptions<TState>;
}): Promise<SharedLogState<TState>>;
/** A session's view of its log. It is also the session's {@link EventFeed}. */
export interface LogWriter extends EventFeed {
    readonly threadId: string;
    readonly logId: string;
    /**
     * The fold of this session. In a shared log, `seq` is this session's last
     * folded record. `head()` is the log position.
     */
    readonly state: LogState;
    /** Append `records` after the pending events, in one batch. */
    append: (records: ReadonlyArray<LogRecord>) => Promise<void>;
    /** Hold `records` until the next transcript commit of this session. */
    stage: (records: ReadonlyArray<LogRecord>) => void;
    /**
     * One batch: the pending events, the transcript change to `messages` (if
     * any), the staged records of this session, then `records`.
     */
    commit: (options: {
        messages: ReadonlyArray<ModelMessage>;
        records?: ReadonlyArray<LogRecord>;
    }) => Promise<void>;
    /** Append the pending events now. */
    flush: () => Promise<void>;
    /** Fold the records that another writer appended, after the queued writes. */
    catchUp: () => Promise<void>;
}
/**
 * Writes one log for every session that shares it, and keeps its fold.
 * All writes run one after another. Each batch goes at the next position.
 * When a write fails (another writer took the position, or the store failed
 * twice), every session of the log gets `onFailure`, and every later write
 * rejects.
 */
export declare class SharedLog<TState = unknown> {
    readonly logId: string;
    readonly state: SharedLogState<TState>;
    private readonly store;
    private readonly fold;
    private readonly versions;
    private readonly metadata;
    private readonly coalesceMs;
    private readonly onIdle;
    private readonly failureListeners;
    /** Events and host records that wait for the next append. */
    private readonly pending;
    /** The merge key of the last pending record, when it is a delta event. */
    private pendingKey;
    /** Host records that wait for the next transcript commit, by thread. */
    private readonly staged;
    private timer;
    private scheduled;
    private chain;
    private failure;
    private readonly tail;
    /** Every event after this position is in `tail`. */
    private tailFrom;
    private readonly waiters;
    /** The threads with an open view. */
    private readonly threads;
    private idle;
    private writing;
    private hasWritten;
    private writesSinceCheckpoint;
    private readonly unsubscribe;
    constructor(options: {
        store: LogStore;
        logId: string;
        state: SharedLogState<TState>;
        coalesceMs: number;
        project?: ProjectOptions;
        reduce?: ReduceOptions<TState>;
        metadata?: MetadataStore;
        /** Called when the last session closes, or when a write fails. */
        onIdle?: () => void;
    });
    /**
     * False after the last view closed or a write failed. The host then opens
     * a new log.
     */
    get isOpen(): boolean;
    /** The view of session `threadId`. Close it when the session closes. */
    view(threadId: string, onFailure: (error: unknown) => void): LogWriter;
    private release;
    /** Stamp a record with its session, unless it names one or the session is the log's own. */
    private stamp;
    private publish;
    private append;
    private stage;
    private commit;
    /** Append the pending events now. */
    flush(): Promise<void>;
    private takePending;
    private schedule;
    private enqueue;
    private write;
    /** Stop every session of the log. The host drops it, so the next open folds again. */
    private fail;
    /**
     * Append once. After an error, read back: the batch may have landed before
     * the error. When it did not land, a conflict fails at once, and another
     * error gets one more try.
     */
    private appendOnce;
    private landed;
    /**
     * Fold records that another writer appended. A host that only reads
     * follows the log. A writer that already wrote has lost the thread to
     * another host, so it stops, as after a conflict.
     */
    private catchUp;
    private apply;
    head(): Cursor;
    /** The events of session `thread`. A cursor is a position in the log. */
    private read;
    private wake;
    private waitForNext;
}
/**
 * The `MessageStore` a durable session gives `withPersistence`. Its own
 * thread goes through the session's writer. Another thread (a subagent
 * transcript) reads and appends that thread's log directly.
 */
export declare function sessionMessageStore(options: {
    writer: LogWriter;
    store: LogStore;
    project?: ProjectOptions;
}): MessageStore;
/**
 * The `MessageStore` the chat engine of a durable session saves through
 * (`withPersistence` and the checkpoints). It remembers the list the engine
 * holds. A host record can change the fold while the engine runs, and the
 * engine does not see that until its next model call. So a save that only
 * adds messages to what the engine holds puts them on top of the current
 * fold, and a projected message is not lost. `beforeModel` commits the
 * engine's list and gives the model the fold, so the two are the same at
 * every model call.
 */
export declare function engineMessageStore(options: {
    writer: LogWriter;
    store: LogStore;
    project?: ProjectOptions;
}): {
    loadThread: (threadId: string) => Promise<ModelMessage<string | import('@tanstack/ai').ContentPart<unknown, unknown, unknown, unknown, unknown>[] | null>[]>;
    saveThread: (threadId: string, list: Array<ModelMessage>) => Promise<void>;
    /**
     * Before each model call: commit the engine's `list` (it has the tool
     * results of the last phase) on top of the fold, with `records` in the
     * same append. Returns the list the model gets when a host record
     * changed it, else `undefined`.
     */
    beforeModel: (list: ReadonlyArray<ModelMessage>, records?: ReadonlyArray<LogRecord>) => Promise<ModelMessage<string | import('@tanstack/ai').ContentPart<unknown, unknown, unknown, unknown, unknown>[] | null>[] | undefined>;
    /**
     * Host records from a middleware of the running turn. The messages that
     * the engine added since its last save (the tool results of the last
     * phase) go first in the same append, as a save puts them. So a record
     * that counts them lands on a fold that has them. A `list` that changed
     * older messages is not written: the last save keeps them (for example
     * the run id that `withPersistence` puts on a reply). A `list` with no
     * new messages appends only the records, so the staged records of a
     * running tool batch stay staged.
     */
    appendRecords: (list: ReadonlyArray<ModelMessage>, records: ReadonlyArray<LogRecord>) => Promise<void>;
};
/**
 * A `MessageStore` view of a session log, for a reader outside a session
 * (for example `reconstructChat`). `loadThread` folds the log. `saveThread`
 * appends the change as one transcript record.
 *
 * @example
 * ```ts
 * reconstructChat({ persistence: { stores: { messages: logMessageStore({ store: log }) } }, ... })
 * ```
 */
export declare function logMessageStore(options: {
    store: LogStore;
    project?: ProjectOptions;
    /** Read the threads of this log. Default: each thread is its own log. */
    logId?: string;
}): MessageStore;
export {};
