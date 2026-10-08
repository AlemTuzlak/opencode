import { Interrupt, Modality, ModelMessage, PromptCacheOptions, RunAgentResumeItem, StreamChunk } from '@tanstack/ai';
import { AIPersistence, ArtifactStore, BlobBody, BlobRange, BlobStore, CredentialStore, GenerationRunStore, InboxStore, LogRecord, LogStore } from '@tanstack/ai-persistence';
import { LogWriter, ProjectOptions } from './log.js';
import { LeaseOptions } from './resume.js';
import { ConfigOption } from './config.js';
import { SessionUsage } from './usage.js';
import { AgentInputOf, AgentRegistryView, AgentResultOf } from './agents.js';
import { AnyHarness, HarnessAgentsOf } from './define.js';
import { HarnessPersistence, SessionIndexWriter } from './host.js';
import { MountedPlugins } from './plugins.js';
import { AgentRun, BusyPolicy, ChatTurnResult, Cursor, InputSettlement, MediaKind, MediaRecord, Operation, Principal, Receipt, SessionEvent, ThreadSettings, ThreadSettingsChange, TurnOverrides, UserInput, WaitingInput } from './types.js';
/** Options for running an agent from code. */
export interface AgentRunOptions {
    /**
     * How the main model learns about the result or the error on its next
     * turn: `'reference'` (default) adds a short note to the transcript,
     * `'none'` adds nothing.
     */
    attach?: 'reference' | 'none';
}
/** Options for starting an agent in the background. */
export interface AgentStartOptions extends AgentRunOptions {
    /**
     * When the agent finishes or fails, start a new chat turn with its result
     * or its error. On a durable host, this also occurs when the host stopped
     * during the run.
     */
    wake?: boolean;
    /**
     * On a durable host, when the host stops during the run, the host that
     * takes over runs the agent again with the same input, instead of failing
     * it. The agent code runs again from its start: put each side effect in
     * `ctx.step.do(name, fn)`, so a finished step returns its stored value.
     * Its `ctx.chat` calls continue from their saved transcript. After
     * `durability.maxAttempts` runs (default 10), the run fails with
     * `attempts_exhausted`. A host without `stores.log` throws at start.
     */
    resume?: boolean;
}
type RunArgs<TAgent, TOptions> = AgentInputOf<TAgent> extends undefined ? [input?: undefined, options?: TOptions] : [input: AgentInputOf<TAgent>, options?: TOptions];
/** Run one agent of a session, typed from its definition. */
export interface AgentHandle<TAgent> {
    run: (...args: RunArgs<TAgent, AgentRunOptions>) => Operation<AgentResultOf<TAgent>>;
    start: (...args: RunArgs<TAgent, AgentStartOptions>) => AgentRun<AgentResultOf<TAgent>>;
}
/** A handle for an agent picked by name at runtime. */
export interface DynamicAgentHandle {
    run: (input?: unknown, options?: AgentRunOptions) => Operation<unknown>;
    start: (input?: unknown, options?: AgentStartOptions) => AgentRun<unknown>;
}
/** `session.agents`: one typed handle per registered agent name. */
export type AgentHandles<THarness> = {
    [TAgent in HarnessAgentsOf<THarness> as TAgent['name']]: AgentHandle<TAgent>;
};
/** One agent run, as `session.agentRuns()` lists it. */
export interface AgentRunInfo {
    operationId: string;
    agent: string;
    /** `queued`: a follow-up that waits for the run before it. */
    status: 'running' | 'queued' | 'completed' | 'failed' | 'cancelled';
    /** The run whose agent code started this run. */
    parentRunId?: string;
    /** Who the run runs for. */
    principal?: Principal;
}
/** What a session looks like right now. */
export interface SessionSnapshot {
    threadId: string;
    /**
     * `running`: a chat turn runs. `requires_action`: the last turn stopped for
     * outside input. `idle`: ready for a prompt (agents may still run).
     */
    status: 'idle' | 'running' | 'requires_action';
    activeOperations: Array<{
        id: string;
        kind: string;
        agent?: string;
        /**
         * Every event of this operation comes after this cursor. Pass it as
         * `from` to `events()` to read the operation from its first event.
         */
        startedCursor?: Cursor;
    }>;
    queuedTurns: number;
    /**
     * The inputs that wait, in the order they run: `session.inputs()`. A
     * session always sets it. A snapshot built by hand (a test fixture) can
     * leave it out.
     */
    waitingInputs?: Array<WaitingInput>;
    pendingInterrupts: Array<Interrupt>;
    /** Questions a command or a plugin asked, waiting for `session.answer`. */
    pendingQuestions: Array<{
        questionId: string;
        message: string;
        schema?: unknown;
        /** The answer is a secret (a key or a password). Hide it as the user types. */
        secret?: boolean;
        /** A page the user must open before they answer. Show the link. */
        url?: string;
    }>;
    /** The state of each plugin that uses `ctx.state`, by plugin name. */
    plugins: Record<string, unknown>;
    /** The token usage of the thread, the same as `session.usage()`. */
    usage: SessionUsage;
    /** The cursor of the newest event. */
    cursor: Cursor;
}
/** The resolved plugin plan of a session, for debugging and tooling. */
export interface SessionInspection {
    plugins: MountedPlugins['owners']['plugins'];
    tools: MountedPlugins['owners']['tools'];
    prompts: MountedPlugins['owners']['prompts'];
    commands: Array<{
        name: string;
        owner: string;
    }>;
    config: Array<{
        key: string;
        owner: string;
    }>;
    extensionPoints: Record<string, Array<string>>;
    agents: Array<string>;
}
/** What a UI can show and run in a session: commands, settings, and tools. */
export interface SessionDescription {
    commands: Array<{
        name: string;
        description: string;
        owner: string;
        /** The command input as JSON Schema, when it has one. */
        input?: unknown;
    }>;
    config: Array<{
        key: string;
        owner: string;
        value: unknown;
        option: ConfigOption;
    }>;
    tools: SessionInspection['tools'];
    /** The stored settings of the thread (`session.configure`). */
    settings?: ThreadSettings;
    /** The names of `defineHarness({ models })`, for a model menu. */
    models?: Array<string>;
}
/** What the host hands a new session. */
export interface SessionDependencies {
    harness: AnyHarness;
    threadId: string;
    persistence: HarnessPersistence;
    inbox: InboxStore;
    credentials: CredentialStore;
    /** Where media lives: file records, bytes, and generation runs. */
    media: AIPersistence<{
        artifacts: ArtifactStore;
        blobs: BlobStore;
        generationRuns: GenerationRunStore;
    }>;
    principal?: Principal;
    /** Identifies this host on run leases. */
    hostId: string;
    /** Writes the session index entry of the thread. */
    index: SessionIndexWriter;
    /** The session log of a durable host. */
    log?: {
        store: LogStore;
        project?: ProjectOptions;
        /** The view of this session in its shared log. */
        open: (threadId: string, onFailure: (error: unknown) => void) => Promise<LogWriter>;
    };
    /** The log of the session. Default: the thread id. */
    logId: string;
    lease?: LeaseOptions;
    /** The `promptCache` of `host.open()`. It overrides the harness value. */
    promptCache?: PromptCacheOptions;
    /** Gets each event the session publishes, after the feed has it. */
    onEvent: (event: StreamChunk) => void;
    onClose: () => void;
}
/** Limits for a harness's children when `subagents.limits` is not set. */
export declare const DEFAULT_SUBAGENT_LIMITS: {
    maxDepth: number;
    maxConcurrent: number;
    maxCalls: number;
};
/**
 * The kinds a model reads: the adapter's input list, narrowed by
 * `media.accepts`. Either one alone when only one is known, and `undefined`
 * (send every kind) when neither is.
 */
export declare function acceptedKinds(modalities: ReadonlyArray<Modality> | undefined, accepts: ReadonlyArray<MediaKind> | undefined): readonly ("text" | "image" | "video" | "audio" | "document")[] | undefined;
/**
 * A live harness session: one conversation (`threadId`) with its plugins,
 * operations, inbox, and event stream. Open one with `host.open()`.
 */
export declare class HarnessSession<THarness extends AnyHarness = AnyHarness> {
    readonly threadId: string;
    /** The log of this session. Sessions with the same log id share one log. */
    readonly logId: string;
    readonly agents: AgentHandles<THarness>;
    /** The agents this session can run, for discovery. */
    readonly registry: AgentRegistryView;
    private readonly harness;
    private readonly persistence;
    private readonly inbox;
    private readonly principal;
    /** The session log writer of a durable host. It is also the feed. */
    private writer;
    private feed;
    private readonly onEvent;
    /** The transcript: `stores.messages`, or a view of the log. */
    private messages;
    /**
     * What `withPersistence` gets: the chat stores, with `messages`. With
     * `sessions`, each child the model starts gets an index entry.
     */
    private chatPersistence;
    /** The message store the chat engine saves through, on a durable host. */
    private engine;
    /** Why the session log stopped taking writes. */
    private logFailure;
    private readonly log;
    /**
     * Inputs this session stored or recovered, by id, as JSON: the duplicate
     * check. `recover()` skips them.
     */
    private readonly admitted;
    /** The receipt of each chat input this session answered, by input id. */
    private readonly receipts;
    /** The turn operation of each chat input, by input id. */
    private readonly turnOperations;
    /** The input of each turn operation, by operation id. */
    private readonly operationInputs;
    /** The inputs that joined each turn, by operation id. */
    private readonly turnJoins;
    /** How the chat inputs of this session ended, for `settled()`. */
    private readonly settlements;
    private readonly agentRegistry;
    private readonly operations;
    /** The agent chains of this session, by the input id of the first run. */
    private readonly agentChains;
    /** The chain of each agent run operation, by operation id. */
    private readonly chainOf;
    private readonly queue;
    private readonly steerQueue;
    /**
     * Waiting steers with an abort request. An id lands here before the abort
     * append, so a join that runs during that append skips the steer.
     */
    private readonly abortedSteers;
    /** The ids of the waiting steers that a join took. A cancel of one is refused. */
    private readonly joining;
    /** Notes that wait for the transcript. A durable host logged each one. */
    private readonly pendingNotes;
    /** Background jobs that run on this host. Recovery skips them. */
    private readonly jobs;
    /** Running tool calls that support `detach`: id to the move. */
    private readonly detachable;
    private activeTurn;
    /** Renews this host's claim on the thread while the thread has work. */
    private claimTimer;
    /** The claim write of the last `markBusy`. An input waits for it. */
    private claimWrite;
    /** Called each time the thread goes idle. See `onIdle`. */
    private readonly idleListeners;
    /** Work inputs that are being stored and are not queued yet. */
    private inputsInFlight;
    /** Who sent the input of the running turn. */
    private turnPrincipal;
    /**
     * The last turn stopped for these interrupts. `routed`: a routed turn
     * stopped. The resolve continues its saved plan. `stores.metadata` keeps a
     * copy, so a resolve after a restart continues the turn too.
     */
    private interrupted;
    /** The usage totals of a host without a log. A durable host folds the log. */
    private usageTotals;
    /** Saves of `usageTotals` to `stores.metadata`, one after the other. */
    private usageSaved;
    private activeResume;
    private plugins;
    private sessionPlugins;
    /** The last `reload()`. The calls run one at a time. */
    private reloads;
    /**
     * The reloads and reverts that run. No new turn starts while one runs: a
     * reload waits for the running turn, and a revert changes the files.
     */
    private holdTurns;
    /** Called when the running turn ends. A reload waits for it. */
    private readonly turnEnds;
    private closing;
    /** Aborts on close, not on a reload. See {@link SessionSignal}. */
    private readonly lifetime;
    /** The last `recover()`. The calls run one at a time. */
    private recovery;
    private readonly onClose;
    private checkpoint;
    /** Gives each durable tool call its steps in the log. One per session. */
    private bindTool;
    private readonly hostId;
    private readonly index;
    private readonly lease;
    private readonly listeners;
    private readonly configValues;
    /** The stored settings of this thread: `session.configure`. */
    private threadSettings;
    private readonly questions;
    private readonly stateDoc;
    /** Reads each plugin's saved state, so the first snapshot has it. */
    private readonly stateLoaders;
    private readonly localState;
    /** The revert that stands. See `revert`. */
    private reverted;
    /** The credentials of the running turn's sender, else of the session's principal. */
    private readonly credentialAccess;
    /**
     * The connectors whose sign-in the user cancelled. Their `require` with
     * `wait` fails the tool, as without `wait`, until the next new turn.
     */
    private readonly declinedSignIns;
    /**
     * Model provider keys of the same principal as `credentialAccess`: saved
     * with `/connect <provider>`, else the env var.
     */
    private readonly keys;
    /**
     * The credentials of one principal: the user who runs a command, or an
     * agent that outlives a turn. A save there can answer that user's sign-ins.
     */
    private readonly credentialsOf;
    /** The provider keys of one principal, for an agent that outlives a turn. */
    private readonly keysOf;
    private readonly services;
    private readonly media;
    private readonly mediaStore;
    /** The prompt cache of every chat turn of this session. */
    private readonly promptCache;
    constructor(deps: SessionDependencies);
    /**
     * The agent named `name`, for names known only at runtime (a slash
     * command, a protocol input). `undefined` when no such agent exists.
     */
    agent(name: string): DynamicAgentHandle | undefined;
    /** An operation of this session by id, running or settled. */
    operation(id: string): Operation<unknown> | undefined;
    /**
     * Add a message to the agent run `operationId`, as `AgentRun.send` does.
     * `principal` is who sent it. A follow-up runs for its sender. An unknown
     * run gets `not_running`.
     */
    sendToAgent(operationId: string, message: UserInput, options?: {
        mode?: 'steer' | 'followUp';
        inputId?: string;
        principal?: Principal;
    }): Promise<Receipt>;
    /**
     * The agent run `operationId`: a run of this session, or on a durable
     * host a run in the log that ended, so a follow-up continues it after a
     * restart. `undefined` for an unknown run, and for one that another host
     * runs.
     */
    agentRun(operationId: string): AgentRun<unknown> | undefined;
    /**
     * The agent runs of this session, oldest first. On a durable host it also
     * lists the runs in the log, so it works after a restart.
     */
    agentRuns(): Array<AgentRunInfo>;
    /** The agent runs in the log: each input that a run applied. */
    private loggedRuns;
    /**
     * The chain of a run in the log, with every run it had, so a follow-up
     * continues its thread after a restart. `undefined` for an unknown run,
     * and while a run of the chain has not ended: another host runs it.
     */
    private loggedChain;
    /** The stores that first-party plugins read as capabilities. */
    private storeCapabilities;
    /** @internal Mount session plugins and replay inputs left in the inbox. */
    open(): Promise<void>;
    /** Read `harness.plugins()` and set up its session plugins. */
    private mountSessionPlugins;
    /**
     * Tear the plugins down and set them up again, with the list that
     * `harness.plugins()` gives now. It waits for the running turn, and no new
     * turn starts until it ends. The transcript, the log, the thread settings,
     * and the inbox stay. Clients get a `harness.reloaded` event.
     *
     * When the new setup throws, the session keeps working with no plugins,
     * and the promise rejects with the error. Call `reload()` again after a
     * fix.
     *
     * @example
     * ```ts
     * await session.reload()
     * ```
     */
    reload(): Promise<void>;
    private runReload;
    /**
     * Recover the work in the log again, as `open()` does. `open()` skips a
     * turn while another host holds its lease. Call this after that lease
     * expires, and the turn runs here. The work that this session runs or
     * queues stays as it is. A session without `stores.log` does nothing.
     *
     * @example
     * ```ts
     * await session.recover()
     * ```
     */
    recover(): Promise<void>;
    /**
     * Write the index entry of this thread on open: a new entry the first
     * time, else a new `updatedAt`. The owner is who opened the thread first,
     * so an open by another user does not change it.
     */
    private openEntry;
    /**
     * A durable host gives the session its view of the log, and the session
     * writes through it: the log is the event feed and the transcript. Then
     * both modes build the stores that `withPersistence` and the checkpoints
     * get.
     */
    private openLog;
    /**
     * The `step` and `append` a durable tool call gets. A step value is in the
     * log before `step.do` resolves. Staged records land with the next
     * transcript commit, when the tool phase completes, so a batch that a
     * crash cuts leaves none of them.
     */
    private durableBinding;
    /**
     * The log refused a write: another host wrote to this log, or the store
     * failed. The state of this session is not known any more, so it stops.
     * The next `host.open` folds the log again.
     */
    private stopOnLogFailure;
    /**
     * Append host records to the session log, in one batch after the events
     * that wait. Only a durable host (with `stores.log`) has a log. A `type`
     * that starts with `harness.` is refused: the harness owns those.
     * A record can name another session of the same log with `thread`. The
     * append is all or nothing.
     *
     * With `project` on the host, a record can change the model context. The
     * running turn sees the change at its next model call.
     *
     * @example
     * ```ts
     * await session.append([{ type: 'app.signal', text: 'The build failed.' }])
     * ```
     */
    append(records: ReadonlyArray<LogRecord>): Promise<void>;
    /**
     * Start a chat turn, or queue it while one runs (see `busy`).
     *
     * `inputId` is an id you choose. A second prompt with the same id and the
     * same message returns the first input's operation and does not run again.
     * The same id with another message is rejected with `'conflict'`.
     * `await operation.receipt` resolves when the input is stored.
     *
     * `overrides` changes the adapter, reasoning, prompt cache, or tools of
     * this turn only (see `TurnOverrides`). A steer that joins the running
     * turn uses the overrides of that turn, and its own are ignored.
     *
     * `principal` is who sent the message. Default: the principal that opened
     * the session. The log keeps it, and the turn runs with its credentials
     * and provider keys. A steer that joins the running turn runs with the
     * credentials of that turn's sender.
     *
     * `context` is JSON data from the client, stored with the input. Tools
     * get it in their context (see `HarnessConfig.context`). Do not trust it.
     *
     * `ephemeral` are messages that each model call of this turn gets, after
     * the transcript and the new user message, before the messages that the
     * turn adds (answers, tool results, steers). No store keeps them: not the
     * transcript, and not the log. Like `overrides`, they are not part of the
     * input: the `inputId` duplicate check does not read them, so a retry with
     * other ephemeral messages gets the first input's operation and its own
     * are dropped. A turn that recovery runs again has none. A steer that joins
     * the running turn ignores them.
     */
    prompt(message: UserInput, options?: {
        busy?: BusyPolicy;
        inputId?: string;
        overrides?: TurnOverrides;
        principal?: Principal;
        context?: unknown;
        ephemeral?: ReadonlyArray<ModelMessage>;
        /** @internal The AG-UI `runId` of a `POST run` request. The turn runs as it. */
        runId?: string;
    }): Operation<ChatTurnResult>;
    /**
     * Add a message to the running turn at its next model call. `principal`
     * and `context` mean the same as in `prompt`.
     */
    steer(message: UserInput, options?: {
        inputId?: string;
        principal?: Principal;
        context?: unknown;
    }): Promise<Receipt>;
    /**
     * Run a turn after the current work settles. `overrides` changes the
     * adapter, reasoning, prompt cache, or tools of this turn only.
     * `principal` and `context` mean the same as in `prompt`.
     */
    followUp(message: UserInput, options?: {
        inputId?: string;
        overrides?: TurnOverrides;
        principal?: Principal;
        context?: unknown;
    }): Promise<Receipt>;
    /**
     * Start a chat turn from the stored transcript, with no new message. While
     * a turn runs, it queues. When it starts, the transcript must end with a
     * user or a tool message. Else the input is rejected with
     * `'nothing_to_continue'`. `inputId`, `overrides`, `principal`,
     * `context`, and `ephemeral` mean the same as in `prompt`. Each model call
     * gets the `ephemeral` messages after the transcript.
     *
     * @example
     * ```ts
     * await session.append([{ type: 'app.signal', text: 'The build failed.' }])
     * await session.continue({ inputId: 'after-signal' })
     * ```
     */
    continue(options?: {
        inputId?: string;
        overrides?: TurnOverrides;
        principal?: Principal;
        context?: unknown;
        ephemeral?: ReadonlyArray<ModelMessage>;
    }): Operation<ChatTurnResult>;
    /**
     * Start a fresh model context. From the next turn, the model sees only
     * `note` (when you give one) and what comes after the reset.
     * `transcript()` keeps every message: the reset adds a user message with
     * `metadata.harness.reset`, whose content is the note.
     *
     * While a turn runs, the reset waits and applies when that turn ends,
     * before the next queued turn. A thread that waits for interrupts is
     * refused with `'pending_interrupts'`: resolve them first. `principal` and
     * `inputId` mean the same as in `prompt`.
     */
    reset(note?: string, options?: {
        principal?: Principal;
        inputId?: string;
    }): Promise<Receipt>;
    /**
     * Answer the interrupts of the last turn. One resume must answer every open
     * interrupt of that turn (the AG-UI rule). `principal` means the same as in
     * `prompt`: the turn that continues runs with its credentials.
     */
    resolve(resume: Array<RunAgentResumeItem>, options?: {
        inputId?: string;
        principal?: Principal;
        /** @internal The AG-UI `runId` of a `POST run` request. The turn runs as it. */
        runId?: string;
    }): Promise<Receipt>;
    /**
     * Cancel one operation, or the running chat turn. On a durable host the
     * abort request is stored first, so a turn that a crash stops later settles
     * `aborted` and does not run again.
     */
    /**
     * Move a running tool call to the background: the call returns at once,
     * and the job keeps running. When it ends, a note tells the model and
     * wakes an idle session. Without `toolCallId`, it moves every running
     * call that supports it, such as `bash` and the single `subagent` tool.
     * With no such call, the receipt is rejected with `not_running`.
     *
     * @example
     * ```ts
     * await session.background()
     * ```
     */
    background(toolCallId?: string): Promise<Receipt>;
    cancel(operationId?: string): Promise<Receipt>;
    /**
     * The inputs that wait, in the order they run: first the steers for the
     * running turn, then the queued turns. Change one with `cancelInput` or
     * `setDelivery`.
     *
     * @example
     * ```ts
     * for (const input of session.inputs()) {
     *   if (input.delivery === 'queue') await session.cancelInput(input.inputId)
     * }
     * ```
     */
    inputs(): WaitingInput[];
    /**
     * Cancel an input that waits, so it never runs, also after a restart. It
     * settles `aborted`. An input that started, or that joins the running
     * turn now, is refused with `not_waiting`: stop it with
     * `cancel(operationId)`.
     *
     * @example
     * ```ts
     * await session.followUp('Then write the tests.', { inputId: 'tests' })
     * await session.cancelInput('tests')
     * ```
     */
    cancelInput(target: string): Promise<Receipt>;
    /**
     * Move an input that waits. `'steer'` joins it to the running turn at the
     * next model call. `'queue'` runs it as its own turn, after the queued
     * turns. An input that started, or that joins the running turn now, is
     * refused with `not_waiting`. On a durable host the log keeps the
     * delivery, and a restart honors it. Without a log, it is kept in memory.
     *
     * @example
     * ```ts
     * await session.followUp('Use tabs, not spaces.', { inputId: 'style' })
     * await session.setDelivery('style', 'steer')
     * ```
     */
    setDelivery(target: string, delivery: WaitingInput['delivery']): Promise<Receipt>;
    /**
     * How a chat input ended: `completed`, `failed`, `aborted`, or
     * `interrupted` (the turn waits for human input). It waits until the input
     * ends. On a durable host it reads the log, so it also works after a
     * restart and from another host that opens the thread. There it also
     * takes the input id of an agent run from the log.
     *
     * Rejects with `InputRejectedError` when the session refused the input,
     * and with an error for an id this session does not know.
     *
     * @example
     * ```ts
     * const turn = session.prompt('Summarize the report.', { inputId: 'req-42' })
     * const { outcome } = await session.settled('req-42')
     * ```
     */
    settled(inputId: string): Promise<InputSettlement>;
    /** The ordered events of every operation, from `from` (exclusive). */
    events(options?: {
        from?: Cursor;
        signal?: AbortSignal;
    }): AsyncIterable<SessionEvent>;
    /**
     * The token usage of this thread: every model call of its turns, their
     * subagents, and its agent runs, in total, by `provider/model`, and by
     * sender. `cost` is the sum of what the providers reported. A durable host
     * keeps the totals in the log, a host with `stores.metadata` keeps them
     * there, and other hosts keep them in memory.
     *
     * @example
     * ```ts
     * const { total, bySender } = session.usage()
     * console.log(total.totalTokens, bySender['user-1']?.cost)
     * ```
     */
    usage(): SessionUsage;
    snapshot(): SessionSnapshot;
    /**
     * Store a file in the media store of this thread. Send it to a turn with
     * `mediaPart(record)`. Throws a `MediaError`: 413 when the file is bigger
     * than `media.maxBytes`, 415 for a type or kind the harness does not take.
     *
     * @example
     * const record = await session.putMedia(bytes, { mimeType: 'image/png', name: 'cat.png' })
     * session.prompt([{ type: 'text', content: 'What is this?' }, mediaPart(record)])
     */
    putMedia(body: BlobBody, info: {
        mimeType: string;
        name: string;
    }): Promise<MediaRecord>;
    /** The record of a media file of this thread, or `null` when it is not found. */
    getMedia(id: string): Promise<MediaRecord | null>;
    /**
     * The bytes of a media file, or of one `range` of them. Throws a
     * `MediaError` with 404 when it is not found.
     */
    loadMedia(id: string, range?: BlobRange): Promise<Uint8Array<ArrayBuffer>>;
    /**
     * A URL for a media file, for `<img>`, `<audio>`, or `<video>`. A session
     * has no server, so this is a data URL for a file up to 1 MB, and `{}` for
     * a bigger file (use `loadMedia`).
     */
    mediaUrl(id: string): Promise<{
        url?: string;
        expiresAt?: number;
    }>;
    /**
     * @internal Start this new thread as a fork of `source`, before its first
     * turn: `messages` with their media copied to this thread, and the stored
     * settings and plugin config of `source`. `host.fork` calls it.
     */
    adoptFork(source: HarnessSession, messages: ReadonlyArray<ModelMessage>): Promise<void>;
    /** Every session setting, with its option and current value. */
    config(): Record<string, {
        option: ConfigOption;
        value: unknown;
        owner: string;
    }>;
    /** Change a session setting. It applies at the next turn. */
    setConfig(key: string, value: unknown): Promise<Receipt>;
    /** The stored settings of this thread. See `configure`. */
    settings(): ThreadSettings;
    /**
     * Change the stored settings of this thread: the model by name (from
     * `defineHarness({ models })`), `reasoning`, `instructions`, `tools`,
     * `plugins`, and the working folder `cwd`. A field set to `null` is
     * cleared, and a missing field stays. They apply from the next turn, and
     * the turn's `overrides` win over them. `stores.metadata` keeps them.
     *
     * It is an input, so the log keeps who changed what (`principal`). An
     * unknown field, model, or plugin, or a bad value, is rejected.
     *
     * @example
     * ```ts
     * await session.configure({ model: 'strong', instructions: 'Answer in French.' })
     * ```
     */
    configure(settings: ThreadSettingsChange, options?: {
        principal?: Principal;
        inputId?: string;
    }): Promise<Receipt>;
    /** The model and plugin names that a setting can use. */
    private settingNames;
    /** The commands of this session, for hosts to list. */
    commands(): Array<{
        name: string;
        description: string;
        owner: string;
        input?: unknown;
    }>;
    /**
     * The saved messages of this thread, oldest first. While a revert stands,
     * the messages after its message are hidden.
     */
    transcript(): Promise<ModelMessage<string | import('@tanstack/ai').ContentPart<unknown, unknown, unknown, unknown, unknown>[] | null>[]>;
    /** The index of the revert message in `messages`, or -1. */
    private revertedAt;
    /**
     * Go back to the message `messageId`. The transcript hides the messages
     * after it. With the snapshots plugin, the files that their tool calls
     * changed go back too. `unrevert()` undoes it. The next turn drops the
     * hidden messages for good. The revert state is saved, so it survives a
     * restart. Refused while the session is not idle (`'busy'`), and for a
     * message that is not in the transcript (`'unknown_message'`).
     */
    revert(messageId: string): Promise<Receipt>;
    /** End the revert that stands: its files and messages come back. */
    unrevert(): Promise<Receipt>;
    /** Bring back the files of the revert that stands, and end it. */
    private endRevert;
    /** Run `fn` while no new turn starts. A held turn starts after it. */
    private holding;
    /** Drop the messages that a standing revert hides, and end the revert. */
    private commitRevert;
    /** Keep the revert state in the log, else in the metadata store. */
    private saveRevert;
    /** The host records of `type` of this thread, from the log, oldest first. */
    private hostRecords;
    /** The commands, settings, and tools of this session, for a UI. */
    describe(): {
        commands: {
            name: string;
            description: string;
            owner: string;
            input?: unknown;
        }[];
        config: {
            option: ConfigOption;
            value: unknown;
            owner: string;
            key: string;
        }[];
        tools: {
            name: string;
            owner: string;
        }[];
        settings: ThreadSettings;
        models: string[];
    };
    /**
     * Run a plugin command. Its input is checked against the command's schema.
     * `principal` is who runs it. Default: the principal that opened the
     * session. The log keeps it, and the command gets that user's credentials.
     */
    command(name: string, input?: unknown, options?: {
        principal?: Principal;
    }): Operation<unknown>;
    /** Answer a question from `ctx.session.ask`. */
    answer(questionId: string, value: unknown): Promise<Receipt>;
    /** The resolved plugin plan: order, owners, and extension contributors. */
    inspect(): SessionInspection;
    private configValue;
    private loadConfig;
    /** Read the stored settings of this thread. */
    private loadSettings;
    /** Restore the usage totals that `stores.metadata` keeps for this thread. */
    private loadUsage;
    /** Restore the interrupted turn that `stores.metadata` keeps for this thread. */
    private loadInterrupted;
    /** Keep the snapshot in line with the committed interrupt records. */
    private refreshInterrupted;
    /**
     * True when a logged tool result means its tool ran: it is not cancelled,
     * and an error result does not come from a stopped run.
     */
    private isRunResult;
    /**
     * Mark the interrupts of `resume` answered in the interrupt store, the same
     * way `withPersistence` commits them at a success boundary. Records that are
     * no longer pending are left as they are.
     */
    private consumeResume;
    /** Refresh even when a turn failed before its main try block. */
    private refreshTurnInterrupts;
    /**
     * Make `stopped` the interrupted turn. `stores.metadata` gets it first, so a
     * restart can resolve it too, and a resolve cannot delete the copy before
     * it is written. A failed write is a warning.
     */
    private keepInterrupted;
    /**
     * A saved credential can answer the sign-ins the last turn waits for. When
     * every open interrupt is a sign-in and each of their connectors has a
     * credential of the turn's sender now, the turn goes on as that sender and
     * its tools run again. The input id comes from the interrupts, so a second
     * save does not resolve them twice.
     */
    private resumeSignIns;
    /** Put each plugin's saved state in the snapshot before the first read. */
    private loadPluginState;
    private ask;
    /**
     * Who sent the input of the running turn, else the principal that opened
     * the session. Turns run one at a time, so one value is enough.
     */
    private sender;
    /**
     * The session API of plugins. With `principal` (a command), it acts for
     * that user. Without it, it follows the sender of the running turn.
     */
    private pluginApi;
    private emitPluginEvent;
    private pluginState;
    private executeCommand;
    /**
     * The thread has work: claim it in `stores.workClaims` for this host, and
     * renew the claim while the work runs, so a sweep finds the thread after a
     * crash. A claim that another host holds is left alone: the log still keeps
     * one writer. A closing session claims nothing.
     */
    private markBusy;
    private stopClaimTimer;
    /** Give the thread's claim back. A failed write is a warning. */
    private releaseClaim;
    /**
     * A claim write failed. Without a claim, a sweep cannot find this work
     * after a crash, so clients get a warning. The work goes on.
     */
    private warnClaim;
    /**
     * No input being stored, no queued or running turn, no waiting steer, and
     * no running agent.
     */
    private isIdle;
    /**
     * Run `work`, a public entry that stores a work input and queues its work.
     * The thread is busy until `work` ends, so it is not idle while the input
     * is stored.
     */
    private admitting;
    /**
     * When the thread is idle, give its claim back and tell the idle
     * listeners. A thread that waits for a human (an approval, a sign-in) is
     * idle.
     */
    private checkIdle;
    /**
     * @internal Call `listener` each time the thread goes idle, and once soon
     * when it is idle now. Returns a function that stops the calls. The host
     * uses it to close a session that `resumePending` opened.
     */
    onIdle(listener: () => void): () => void;
    /**
     * Stop every running operation, wait for them, then dispose session plugins.
     * Safe to call twice.
     *
     * With `recoverable`, the running turns and agent runs stop as on a host
     * crash: the log gets none of their later writes, they do not settle, and
     * the run store gets no aborted state. They give their leases back, so the
     * next host that opens the thread runs them again at once. Use it when a
     * durable host shuts down, for example for a deploy.
     *
     * @example
     * ```ts
     * await session.close({ recoverable: true })
     * ```
     */
    close(options?: {
        recoverable?: boolean;
    }): Promise<void>;
    private createTurnOperation;
    private enqueueTurn;
    /**
     * Where a turn that runs next goes: after a resolve that answers the turn
     * that just ended, and after the resets that wait, in their order.
     */
    private frontOfQueue;
    private drain;
    /**
     * Ask each plugin for the tools it found since the last turn. A plugin
     * that fails (for example an MCP server that is down) is skipped, and
     * clients get a `harness.plugin.warning` event.
     */
    private discoverTools;
    /**
     * Let each plugin change the tool list of this turn, in plugin order. A
     * plugin that fails leaves the list as it was, with a warning event.
     */
    private prepareTools;
    private warn;
    /**
     * Middleware that binds the durable tools of each model call: a
     * middleware can return new tools from `onConfig`, and the engine runs the
     * tools of that list.
     */
    private durableTools;
    /**
     * Middleware that gives each tool call of a turn `detach` in its context,
     * so `background()` can move the call to the background. A tool that
     * calls `detach` supports it.
     */
    private detachTools;
    /**
     * On a durable host, each turn's chat run gets `LogRecordsCapability`. A
     * middleware, for example a durable compaction, appends host records with
     * it. They land in the log at once and fold, with the checks of
     * `session.append`. The engine's new messages go in the same append, so a
     * record that counts the tool results of the last phase lands after them.
     * Agent runs do not get it: a child writes to its own thread.
     */
    private logRecords;
    /**
     * Middleware that counts the usage of each model call of `operation` for
     * `principal`. The count does not hold back the stream: chat() waits for it
     * after the run.
     */
    private usageCounter;
    /**
     * Add one model call to the totals, and send a `harness.usage` event. A
     * durable host writes a `harness.usage` record, and the log fold adds it.
     */
    private countUsage;
    private isAbortRequested;
    /**
     * Take the waiting steers that join now: the prefix up to the first one
     * that has an abort request, or that `turn.canJoin` refuses. Without
     * `canJoin`, only a steer of the running turn's sender joins, so nobody's
     * message runs with another person's credentials. A steer that a join
     * took already stays in, with no new check. Returns how many.
     */
    private claimJoins;
    /**
     * Middleware that runs before each model call. Queued steers join the
     * running turn in admission order, as far as `claimJoins` lets them.
     * `turn.onJoin` adds its messages after theirs. On a durable host, one
     * append commits the engine's messages, the steer messages, the join
     * records, and the `onJoin` records, so a crash never splits a join. The
     * model gets the folded log when a host record changed the context. The
     * `onJoin` ephemeral messages go to `ephemeral`, for this model call. It
     * runs before the harness middleware, so they get the steer messages too.
     */
    private steering;
    /**
     * Middleware after the harness middleware, before each model call. A
     * middleware can append host records (a compaction) after `steering`
     * committed. Commit the engine's messages again, and give the model the
     * fold when a record changed it. An earlier middleware can change what this
     * model call gets (`providerMessages`). Keep that change, and add the new
     * messages after it. When the fold rewrote older messages, the fold wins.
     */
    private syncFold;
    /**
     * Middleware of one agent run. Before each model call of the run's own
     * chat, the steers that wait join as user messages, in order. The chain's
     * thread keeps them before a durable host records the join, so a crash
     * does not lose one, and each message id is its input id, so a run again
     * does not add a steer twice. Nested children share the binding: their
     * thread is not the chain's, so they skip it.
     */
    private agentSteering;
    /**
     * `steer` joined the running turn `operationId`: it settles with that
     * turn, and a prompt that joined gets the turn's result.
     */
    private join;
    /** The inputs that joined the turn of `hostInput` (or operation). */
    private joinedInputs;
    /**
     * A tree budget for a child started from code. The child counts as the
     * first call, and its own children count against the same limits.
     */
    private codeBudget;
    /**
     * What every agent run of `operation` gets: the middleware of session
     * plugins, then of run plugins, then the session's media middleware. It
     * keeps the media the agents make, publishes a `harness.media` event for
     * each file, and pushes its record to `captured`. The agents read the
     * session's provider keys as `ctx.keys`. Their model calls count in the
     * usage of `principal`. With `agents` (the subagents of a turn), the
     * `subagent` tool can start one of them in the background.
     */
    private binding;
    /**
     * The user message of a turn. It keeps the records of its media files in
     * `metadata.harness.media`, so a UI can show their names and sizes later.
     * An id this thread does not know is skipped.
     */
    private userMessage;
    /** Add the media a turn made to the last assistant message of the thread. */
    private saveTurnMedia;
    /**
     * Abort `operation` when its input passes `timeoutAt` (a durable host with
     * `durability.timeoutMs`). Returns the function that stops the timer.
     */
    private startTimeout;
    /**
     * Hold the lease of a turn or agent attempt in `stores.leases` while it
     * runs. Returns the function that releases it. Without a lease store (or
     * without a log), it returns nothing: the run lease decides.
     */
    private holdLease;
    /**
     * End work that `close({ recoverable: true })` stopped, with no settlement.
     * Its leases end now, so the next host that opens the thread runs it again
     * at once. Call it after the run lease renewal stopped.
     */
    private giveBack;
    /**
     * Apply a `reset()`: add its marker to the transcript. A thread that waits
     * for interrupts gets no marker, and the reset fails.
     */
    private runReset;
    /** The model can answer the context: it ends with a user or a tool message. */
    private canContinue;
    private runTurn;
    /**
     * Steers a turn never reached run next, before other queued turns (after
     * a resolve of that turn). A steer with an abort request settles `aborted`
     * instead.
     */
    private requeueWaitingSteers;
    /** A waiting steer as its own turn, with its own operation. */
    private steerTurn;
    /**
     * Take a waiting input out of the steers or the queue, so it does not run
     * from there. `undefined` when it does not wait: it started, a join holds
     * it, it has an abort request, or the id is not known.
     */
    private takeWaiting;
    /**
     * Mark a `cancelInput` or `setDelivery` input applied. On a durable host,
     * `change` lands in the same append, so a crash never keeps one without
     * the other.
     */
    private applyControl;
    /**
     * Keep the retry count of a turn in the log, so a recovered attempt starts
     * from it. It lands with the next transcript commit of the turn. A failed
     * model call appends its count at once, before `turn.onModelError` runs.
     */
    private stageRetries;
    /**
     * Add hook messages and host records to the transcript, in one append.
     * Returns true when the transcript changed.
     */
    private addToTurn;
    /**
     * Ask `turn.beforeFinish` whether the turn goes on. True when it added to
     * the transcript or to `ephemeral`, so the turn runs the model again.
     */
    private continueBeforeFinish;
    /** The limits for children of this session, with the harness defaults. */
    private limits;
    private runAgent;
    /**
     * `ctx.agents` in the runs of `chain`: start a child in the background.
     * The child counts against the chain's tree budget, and over it `start`
     * throws. The child records the run that started it, and runs for that
     * run's sender.
     */
    private agentStarter;
    /** A new agent run operation. `id`: a stored one, after a restart. */
    private agentOperation;
    /** A new chain, with `first` as its first run. */
    private createChain;
    /**
     * Run again an agent run with `resume: true` whose host stopped: a first
     * run, or a follow-up run of the chain of `first`. The new run applies the
     * same input, so its attempt counts up, and it continues the chain's saved
     * transcript.
     */
    private resumeAgent;
    /**
     * What a resumable agent run adds on a durable host: checkpoints of its
     * `ctx.chat` tool phases, and `ctx.step` values in the session log, under
     * the key of the input the run applies.
     */
    private resumable;
    /**
     * The saved transcript of a resumable agent run whose host stopped. The
     * chat runs that host left running end `failed`, and the last tool batch
     * gets the same repair as in a turn: the results that finished, and an
     * error for a cut call that must not run twice.
     */
    private continueAgentThread;
    /** Run a group of agents. Every child settles before the group returns. */
    private agentGroup;
    /**
     * One run of `chain`. Then the steers it never took run as follow-ups,
     * before the follow-ups that wait, and the next follow-up starts.
     */
    private executeAgent;
    /**
     * Give `sent` to `chain`. A steer waits for the running run's next model
     * call. A follow-up, or a steer to a run that ended, runs after the
     * current run. Returns the receipt fields.
     */
    private deliver;
    /** `sent` as a follow-up of `chain`, with the operation of its run. */
    private followUpOf;
    /** Start the next follow-up of `chain` once its current run ended. */
    private nextFollowUp;
    /**
     * One run of `chain`. A new first run stores its `agent` input first.
     * Every run keeps its messages in the chain's thread, so a run again
     * after a host stop continues them.
     */
    private runAgentOnce;
    /**
     * The index entry of an agent run: thread `subagent:<subagentRunId>`, with
     * this thread as its parent and the harness of this thread. `upsert`
     * replaces the whole entry, so the fields of other writers stay. A failed
     * write does not fail the run.
     */
    private indexAgent;
    /**
     * Tell the main model how an agent ended: a transcript note (unless
     * `attach: 'none'`), and a new chat turn when `wake` is set. The wake turn
     * runs as `principal`, the user who started the agent.
     */
    private noteAgentEnd;
    /**
     * Fail an agent run whose host stopped. Its events end the operation for
     * views, and the main model gets a note.
     */
    private failStoppedAgent;
    /**
     * Add an assistant note to the transcript: at once when no turn runs, else
     * before the next turn starts.
     */
    private addNote;
    /** Write queued notes to the transcript while no turn is writing it. */
    private flushNotes;
    /**
     * Track a background job of this host. A durable host also logs its start
     * and end, so recovery can note a job that a crash stopped.
     */
    private logJob;
    /**
     * After a crash: queue the logged notes that are not in the transcript,
     * and note each logged job that no host runs now.
     */
    private recoverBackground;
    /**
     * Store an input, unless its id is known. The check before the first
     * `await` is synchronous, so a second call with the same id in the same
     * tick is a duplicate too. `principal` is who sent it.
     */
    private accept;
    /**
     * Does `stores.runs` have a run with this id, on any thread? A client run
     * id must not reuse it. A store that fails counts as yes, so nothing runs.
     */
    private isRunTaken;
    /** Record that `operationId` runs the input. A durable host counts attempts. */
    private markApplied;
    private applied;
    /** Refuse an input. Returns its rejected receipt. */
    private reject;
    /**
     * Record how inputs ended, all in one append: a turn and the inputs that
     * joined it settle together. Clients get a `harness.input.settled` event.
     */
    private settle;
    /** How a chat input ended, when it did. Throws for a refused input. */
    private knownSettlement;
    private isChatInput;
    /** Link a turn operation and its input. */
    private bindTurn;
    /** Keep a chat input's receipt, for a duplicate of the input. */
    private keep;
    /** Resolve a turn's receipt, and keep it for a duplicate. */
    private answerTurn;
    private refuse;
    /** What a duplicate or a conflicting chat input gets back. */
    private duplicateReceipt;
    /**
     * The operation for a prompt whose id is known: the live one, one that
     * settles from the log, or a refused one for another payload.
     */
    private knownTurn;
    /** Settle `operation` like the earlier input with the same id. */
    private answerDuplicate;
    /** End `operation` with a stored settlement. */
    private settleOperation;
    private publishStarted;
    private publishFinished;
    /**
     * Continue the newest chat turn that a crashed host left running. Older
     * crashed turns are marked failed, and so are crashed agent runs.
     */
    private recoverCrashedTurn;
    /**
     * Queue a reset: at the front for a new one (it applies when the running
     * turn ends), at the end for one from before a restart (in its admission
     * order). Its operation is a command, so clients do not see a chat turn.
     */
    private queueReset;
    /** Re-run turns that were accepted but never applied before a restart. */
    private recoverInbox;
    /** The recovery decision for `input`: the hook's, or `decision`. */
    private recoverDecision;
    /**
     * The part of a cut answer that the log has: the answer text and the
     * signed thinking blocks that operation `operationId` streamed after the
     * last transcript record. A thinking block with no signature, tool call
     * arguments, and agent events are not in it.
     */
    private cutOffAnswer;
    /**
     * A `cancelInput` or `setDelivery` whose own record is in the log, but not
     * its change: a crash cut it. Apply it now, before any input runs. When
     * its input does not wait any more, reject it with `not_waiting`. Other
     * ops are not changed.
     */
    private recoverControl;
    /**
     * Recover a durable session from its log, input by input, in admission
     * order. A chat turn whose host stopped (its run lease expired) settles
     * `completed` when the log already has its final answer. Else it settles
     * `aborted` when an abort was asked, settles `failed` when no attempt or no
     * time is left, and else runs again as the next attempt. An agent run (a
     * first run or a follow-up run) whose host stopped runs again with
     * `resume: true`, else settles `failed` with the steers that joined it. A
     * message that waited for such a run goes to the run again, else settles
     * `aborted`. An input that never ran runs now. One that a `setDelivery`
     * sent to `steer` joins the turn that runs, when one does. A `cancelInput`
     * or `setDelivery` that a crash cut before it was applied applies first.
     * Other inputs are rejected with `expired_on_restart`. An input that this
     * session stored or took already is skipped, so `recover()` can run this
     * again.
     */
    private recoverFromLog;
}
export {};
