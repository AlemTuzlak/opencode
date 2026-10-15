import { ModelMessage, RunAgentResumeItem } from '@tanstack/ai';
import { SessionIndexEntry, SessionIndexPage } from '@tanstack/ai-persistence';
import { AgentInputOf } from './agents.js';
import { AnyHarness, HarnessAgentsOf } from './define.js';
import { HostEvent } from './host.js';
import { SessionDescription, SessionSnapshot } from './session.js';
import { BusyPolicy, Cursor, ForkPoint, MediaRecord, Receipt, SessionEvent, ThreadSettingsChange, UserInput, WaitingInput } from './types.js';
export { MEDIA_URL_PREFIX, kindOf, mediaIdOf, mediaOfMessage, mediaPart, } from './media-ref.js';
export type { ForkPoint, MediaKind, MediaRecord } from './types.js';
export type { HostEvent, HostSessionDeletedEvent, HostSessionEvent, HostStatusEvent, } from './host.js';
export interface HarnessClientOptions {
    /** The base URL of `createHarnessHandler`, for example `/api/harness`. */
    url: string;
    threadId: string;
    /** Extra headers, for example `Authorization`. */
    headers?: Record<string, string> | (() => Record<string, string>);
    fetch?: typeof fetch;
    /** Wait before a reconnect of `events()`. Default 1000 ms. */
    reconnectDelayMs?: number;
}
type StartArgs<TAgent> = AgentInputOf<TAgent> extends undefined ? [input?: undefined, options?: {
    detached?: boolean;
}] : [input: AgentInputOf<TAgent>, options?: {
    detached?: boolean;
}];
/** `client.agents`: start an exposed agent, typed from the harness. */
export type ClientAgentHandles<THarness> = {
    [TAgent in HarnessAgentsOf<THarness> as TAgent['name']]: {
        start: (...args: StartArgs<TAgent>) => Promise<Receipt>;
    };
};
export interface HarnessClient<THarness extends AnyHarness> {
    /**
     * Send a prompt. `inputId` is an id you choose: a retry with the same id
     * and message gets the first receipt and does not run again. `ephemeral`
     * are messages for the model calls of this turn only. See
     * `session.prompt`.
     */
    prompt: (message: UserInput, options?: {
        busy?: BusyPolicy;
        inputId?: string;
        ephemeral?: ReadonlyArray<ModelMessage & {
            role: 'user';
        }>;
    }) => Promise<Receipt>;
    steer: (message: UserInput, options?: {
        inputId?: string;
    }) => Promise<Receipt>;
    followUp: (message: UserInput, options?: {
        inputId?: string;
    }) => Promise<Receipt>;
    /**
     * Start a turn from the stored transcript, with no new message. See
     * `session.continue`.
     */
    continue: (options?: {
        inputId?: string;
        ephemeral?: ReadonlyArray<ModelMessage & {
            role: 'user';
        }>;
    }) => Promise<Receipt>;
    resolve: (resume: Array<RunAgentResumeItem>) => Promise<Receipt>;
    cancel: (operationId?: string) => Promise<Receipt>;
    /**
     * Cancel an input that waits (see `snapshot().waitingInputs`). An input
     * that started is refused with `not_waiting`: use `cancel`.
     */
    cancelInput: (inputId: string) => Promise<Receipt>;
    /**
     * Move an input that waits: `'steer'` joins the running turn, `'queue'`
     * runs it as its own turn later.
     */
    setDelivery: (inputId: string, delivery: WaitingInput['delivery']) => Promise<Receipt>;
    agents: ClientAgentHandles<THarness>;
    /** Answer a question from a command or a plugin. */
    answer: (questionId: string, value: unknown) => Promise<Receipt>;
    /** Run a plugin command. Its result arrives as a `harness.command.result` event. */
    command: (name: string, input?: unknown) => Promise<Receipt>;
    /** Change a session setting. */
    setConfig: (key: string, value: unknown) => Promise<Receipt>;
    /** Change the stored settings of the thread. See `session.configure`. */
    configure: (settings: ThreadSettingsChange) => Promise<Receipt>;
    /**
     * Start a fresh model context from the next turn. The model sees `note`
     * first, when you give one. The transcript keeps every message.
     */
    reset: (note?: string, options?: {
        inputId?: string;
    }) => Promise<Receipt>;
    /**
     * Go back to the message `messageId`, as `session.revert` does. The
     * harness must list `'undo'` in `expose.commands`.
     */
    revert: (messageId: string) => Promise<Receipt>;
    /** End the revert that stands, as `session.unrevert` does. */
    unrevert: () => Promise<Receipt>;
    /**
     * Send a message to the agent run `operationId`, as `AgentRun.send`
     * does. The harness must list the run's agent in `expose.agents`.
     */
    sendToAgent: (operationId: string, message: UserInput, options?: {
        mode?: 'steer' | 'followUp';
        inputId?: string;
    }) => Promise<Receipt>;
    /**
     * The session events from `from` (exclusive). Reconnects after a network
     * error and resumes from the last cursor. Ends when `signal` aborts.
     * `onConnection` reports `'open'` for each connection and `'reconnecting'`
     * before each new try.
     */
    events: (options?: {
        from?: Cursor;
        signal?: AbortSignal;
        onConnection?: (state: 'open' | 'reconnecting') => void;
    }) => AsyncIterable<SessionEvent>;
    /**
     * The status changes and the session changes of all your sessions on the
     * server (`host.events()`). First the current status of each open session.
     * It ends when `signal` aborts or the server closes the stream. Call it
     * again to reconnect: the current statuses come first again.
     */
    hostEvents: (options?: {
        signal?: AbortSignal;
    }) => AsyncIterable<HostEvent>;
    snapshot: () => Promise<SessionSnapshot>;
    /** The saved messages of the thread. */
    transcript: () => Promise<Array<ModelMessage>>;
    /**
     * The commands, settings, and tools of the session. Only the commands in
     * `expose.commands` and the config keys in `expose.config`.
     */
    describe: () => Promise<SessionDescription>;
    /**
     * Store a file in the media store of the thread. Send the record in a
     * prompt with `mediaPart(record)`. Throws when the handler refuses the
     * file, for example `413` for a file over the size limit.
     */
    upload: (body: Blob | ArrayBuffer | Uint8Array, info: {
        name: string;
        mimeType: string;
    }) => Promise<MediaRecord>;
    /**
     * A signed URL for a media file, for `<img>`, `<audio>`, or `<video>`. It
     * stops working at `expiresAt` (epoch milliseconds). Ask again for a new one.
     */
    mediaUrl: (id: string) => Promise<{
        url?: string;
        expiresAt?: number;
    }>;
    /** The bytes of a media file. */
    loadMedia: (id: string) => Promise<Uint8Array>;
    /**
     * One page of your sessions, newest first. Default: top-level sessions.
     * Pass `parentThreadId` to get the child sessions of a thread, and the
     * `cursor` of a page to get the next page. `search` keeps the sessions
     * whose title contains the text, without case. `metadata` keeps the
     * sessions with each exact metadata value.
     */
    listSessions: (options?: {
        limit?: number;
        cursor?: string;
        parentThreadId?: string;
        search?: string;
        metadata?: Record<string, string>;
    }) => Promise<SessionIndexPage>;
    /** Set the title of one of your sessions. Resolves to the changed entry. */
    renameSession: (threadId: string, title: string) => Promise<SessionIndexEntry>;
    /**
     * Remove one of your sessions from the session index. The transcript and
     * the other data of the thread stay on the server.
     */
    deleteSession: (threadId: string) => Promise<void>;
    /**
     * Copy one of your sessions into a new session, up to a message id.
     * Resolves to the entry of the new session.
     */
    forkSession: (threadId: string, at: ForkPoint) => Promise<SessionIndexEntry>;
}
/**
 * A client for a harness session served by `createHarnessHandler`. Pass the
 * harness type for typed agents: `createHarnessClient<typeof studio>(...)`.
 * Import the harness with `import type`, so it stays out of the bundle.
 */
export declare function createHarnessClient<THarness extends AnyHarness>(options: HarnessClientOptions): HarnessClient<THarness>;
