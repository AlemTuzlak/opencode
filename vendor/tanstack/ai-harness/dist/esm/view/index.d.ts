import { ModelMessage, RunAgentResumeItem } from '@tanstack/ai';
import { ReadonlyStore } from '@tanstack/store';
import { PluginEvent } from '../extensions.js';
import { SessionDescription, SessionSnapshot } from '../session.js';
import { Cursor, MediaRecord, Receipt, SessionEvent, UserInput } from '../types.js';
import { Approval, ClientToolCall, SessionViewState, SignIn, ViewQuestion } from './types.js';
export { MEDIA_URL_PREFIX, kindOf, mediaIdOf, mediaOfMessage, mediaPart, } from '../media-ref.js';
export type { MediaKind, MediaRecord, WaitingInput } from '../types.js';
export type { AgentPart, Approval, ClientToolCall, MediaPart, NoticeKind, SessionViewState, SignIn, ToolCallPart, ToolCallStatus, ViewAgent, ViewCommand, ViewConfigEntry, ViewMessage, ViewPart, ViewQuestion, } from './types.js';
/** A local `HarnessSession` and a remote `HarnessClient` both fit this. */
export interface SessionViewSource {
    prompt: (message: UserInput) => unknown;
    steer: (message: UserInput) => Promise<Receipt>;
    resolve: (resume: Array<RunAgentResumeItem>) => Promise<Receipt>;
    cancel: (operationId?: string) => Promise<Receipt>;
    answer: (questionId: string, value: unknown) => Promise<Receipt>;
    command: (name: string, input?: unknown) => unknown;
    setConfig: (key: string, value: unknown) => Promise<Receipt>;
    /** Send a message to an agent run. Without it, an agent's `send` rejects. */
    sendToAgent?: (operationId: string, message: UserInput, options?: {
        mode?: 'steer' | 'followUp';
    }) => Promise<Receipt>;
    events: (options: {
        from?: Cursor;
        signal?: AbortSignal;
        onConnection?: (state: 'open' | 'reconnecting') => void;
    }) => AsyncIterable<SessionEvent>;
    snapshot: () => SessionSnapshot | Promise<SessionSnapshot>;
    transcript: () => Promise<Array<ModelMessage>>;
    describe: () => SessionDescription | Promise<SessionDescription>;
    /** A URL for a media file. Without it, media parts have no `url`. */
    mediaUrl?: (id: string) => Promise<{
        url?: string;
        expiresAt?: number;
    }>;
    /** The bytes of a media file. Without it, `load()` rejects. */
    loadMedia?: (id: string) => Promise<Uint8Array>;
}
/** What `view.on(name, handler)` sends. */
export interface SessionViewEvents {
    approval: Approval;
    clientTool: ClientToolCall;
    question: ViewQuestion;
    signIn: SignIn;
    toolCall: {
        id: string;
        name: string;
    };
    agent: {
        id: string;
        name: string;
        status: 'running' | 'done' | 'failed';
    };
    error: string;
    turnEnd: {
        operationId: string;
    };
}
/** A name from `SessionViewEvents`, or a plugin event from `createPluginEvent`. */
type ViewEventKey = keyof SessionViewEvents | PluginEvent<unknown>;
/** The value that `view.on(key, handler)` gives to `handler`. */
type ViewEventValue<K> = K extends keyof SessionViewEvents ? SessionViewEvents[K] : K extends PluginEvent<infer T> ? T : never;
export interface SessionView {
    /** The live state. Read it with `get()`, `subscribe()`, or `useSelector()`. */
    store: ReadonlyStore<SessionViewState>;
    /** Resolves when history, the first snapshot, and the description are in. */
    ready: Promise<void>;
    /**
     * A `/command`, a prompt, or a steer while a turn runs. `attachments` are
     * stored media files (from `upload` or `putMedia`) that go with the text.
     * A `/command` ignores them. Empty text with no attachments does nothing.
     */
    send: (text: string, attachments?: ReadonlyArray<MediaRecord>) => Promise<void>;
    command: (name: string, input?: unknown) => Promise<void>;
    setConfig: (key: string, value: unknown) => Promise<void>;
    cancel: () => Promise<void>;
    approve: (id: string) => void;
    reject: (id: string) => void;
    approveAll: () => void;
    rejectAll: () => void;
    /** Add a line of your own to the messages. */
    notice: (text: string) => void;
    /**
     * Listen for a view event (`'approval'`, `'turnEnd'`, ...) or a plugin event.
     * Returns a function that stops listening.
     */
    on: <K extends ViewEventKey>(key: K, handler: (value: ViewEventValue<K>) => void) => () => void;
    /** Stop reading events and getting new media URLs. Later actions throw. */
    dispose: () => void;
}
/**
 * A live view of a harness session for any UI. It reads the events, keeps one
 * state in a TanStack Store, and gives actions and typed events.
 *
 * @param source A local `HarnessSession` (from `host.open`) or a remote
 * `HarnessClient` (from `createHarnessClient`).
 *
 * @example
 * ```ts
 * const view = createSessionView(session)
 * view.store.subscribe((state) => draw(state))
 * view.on('approval', (approval) => approval.approve())
 * await view.send('fix the failing test')
 * ```
 */
export declare function createSessionView(source: SessionViewSource): SessionView;
