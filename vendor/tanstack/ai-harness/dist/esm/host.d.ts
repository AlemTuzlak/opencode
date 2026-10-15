import { HarnessSession } from './session.js';
import { PromptCacheOptions, RunStore } from '@tanstack/ai';
import { AIPersistence, ArtifactStore, BlobStore, ChatTranscriptStores, CredentialStore, GenerationRunStore, InboxStore, InterruptStore, LeaseStore, LogStore, MetadataStore, WorkClaimStore, SessionIndexEntry, SessionIndexListOptions, SessionIndexPage, SessionIndexStore } from '@tanstack/ai-persistence';
import { AnyHarness } from './define.js';
import { ProjectOptions, ReduceOptions } from './log.js';
import { LeaseOptions } from './resume.js';
import { ForkPoint, Principal } from './types.js';
type SharedStores = {
    credentials?: CredentialStore;
    artifacts?: ArtifactStore;
    blobs?: BlobStore;
    generationRuns?: GenerationRunStore;
    /** Claims on busy threads, for `resumePending`. */
    workClaims?: WorkClaimStore;
    /** The session index that `host.sessions` reads. */
    sessions?: SessionIndexStore;
};
/** A durable host needs run leases, host leases, or both. */
type DurableLeases = {
    runs: RunStore;
    leases?: LeaseStore;
} | {
    runs?: RunStore;
    leases: LeaseStore;
};
/**
 * The stores a host needs. Two shapes:
 *
 * - A message store, plus any of runs, interrupts, metadata, and inbox.
 *   Without an inbox, inputs are kept in memory and a restart loses the ones
 *   not yet applied.
 * - Durable mode: a `log`, and `runs` or `leases`. The log holds the events,
 *   transcript, inputs, and tool steps of each thread, so this shape has no
 *   `messages` and no `inbox`.
 *
 * Without `artifacts`, `blobs`, and `generationRuns`, media is kept in memory.
 * With `sessions`, the host keeps one index entry per thread (see
 * `host.sessions`).
 */
export type HarnessPersistence = AIPersistence<ChatTranscriptStores & {
    inbox?: InboxStore;
    log?: never;
    leases?: never;
} & SharedStores> | AIPersistence<{
    log: LogStore;
    interrupts?: InterruptStore;
    metadata?: MetadataStore;
    messages?: never;
    inbox?: never;
} & DurableLeases & SharedStores>;
export interface HarnessHostOptions<TLogState = undefined> {
    /** Where sessions keep their state. Default: in memory, lost on restart. */
    persistence?: HarnessPersistence;
    /**
     * How a durable host folds your own log records into the model context.
     * Only a host with `stores.log` reads it.
     */
    project?: ProjectOptions;
    /**
     * A fold of every host record of a log, across all its sessions, in log
     * order. Read it with `host.logState(logId)`. Only a host with
     * `stores.log` reads it.
     */
    reduce?: ReduceOptions<TLogState>;
    /**
     * How long a durable host merges streamed text before it appends it to the
     * log, in milliseconds. Boundaries (a message start or end, a tool call, a
     * run event) append at once. Default 100.
     */
    coalesceMs?: number;
    /** How long a run lease lasts, and how often the host renews it. */
    lease?: LeaseOptions;
}
export interface OpenSessionOptions {
    /** The conversation id. Opening the same id again returns the live session. */
    threadId: string;
    /** Who opened the session. Stored on inputs and run records. */
    principal?: Principal;
    /**
     * The log of the session, on a durable host. Sessions with the same log id
     * share one log and one writer: one append can hold records for several of
     * them. Default: `threadId`.
     */
    logId?: string;
    /**
     * Prompt caching for this session. It overrides the harness `promptCache`,
     * for example with a stable affinity key. Opening the same `threadId` again
     * returns the live session, which keeps the value of the first open.
     */
    promptCache?: PromptCacheOptions;
}
/**
 * The session index of a host: one entry per thread, for a list of
 * sessions. The host writes the entry when a session opens and after each
 * turn. Without `stores.sessions`, `list` is empty, `get` is `undefined`,
 * and `rename` and `delete` write nothing.
 */
export interface HostSessions {
    /**
     * Entries, newest `updatedAt` first. Default: only top-level sessions
     * (`parentThreadId: null`). Pass a thread id to get its child sessions.
     * Pass `principal` to get only the sessions of that user.
     */
    list: (options?: SessionIndexListOptions) => Promise<SessionIndexPage>;
    /** The entry of a thread, or `undefined`. */
    get: (threadId: string) => Promise<SessionIndexEntry | undefined>;
    /**
     * Set the title of a thread. Resolves to the changed entry, or to
     * `undefined` for a thread that has no entry.
     */
    rename: (threadId: string, title: string) => Promise<SessionIndexEntry | undefined>;
    /**
     * Remove the index entry of a thread. Only the entry: the transcript, the
     * log, and the other data of the thread stay in their stores.
     */
    delete: (threadId: string) => Promise<void>;
    /**
     * Fork a thread into a new thread with `host.fork`, so the fork gets the
     * settings, plugin config, and media too. `{ through: id }` copies the
     * messages up to and including `id`. `{ before: id }` copies the messages
     * before `id`, so a fork before the first message has no messages. The new
     * thread gets its own entry, with the title of the old one plus ` (fork)`,
     * the harness, and the owner of the old one. Resolves to the new entry.
     * Throws when the message id is not in the transcript, or when the entry
     * of the thread names another harness.
     *
     * @example
     * ```ts
     * const entry = await host.sessions.fork(assistant, 't-1', { before: messageId })
     * const fork = await host.open(assistant, { threadId: entry.threadId })
     * ```
     */
    fork: (harness: AnyHarness, threadId: string, at: ForkPoint) => Promise<SessionIndexEntry>;
}
/**
 * An open session of the host changed its status. `running`: an operation
 * runs. `waiting`: a question or an interrupt waits for an answer. `idle`:
 * nothing runs or waits. `at` is the time of the change, in epoch ms.
 */
export interface HostStatusEvent {
    type: 'status';
    threadId: string;
    status: 'idle' | 'running' | 'waiting';
    at: number;
}
/**
 * The host wrote the index entry of a thread: a new session, the end of a
 * turn, a rename, or a fork. `entry` is the new entry.
 */
export interface HostSessionEvent {
    type: 'session';
    threadId: string;
    entry: SessionIndexEntry;
}
/** The host removed the index entry of a thread. `entry` is the removed entry. */
export interface HostSessionDeletedEvent {
    type: 'session-deleted';
    threadId: string;
    entry: SessionIndexEntry;
}
/** What `host.events()` yields. */
export type HostEvent = HostStatusEvent | HostSessionEvent | HostSessionDeletedEvent;
export interface ForkSessionOptions {
    /** The thread to copy. */
    threadId: string;
    /** The new thread. It must have no messages yet. */
    newThreadId: string;
    /**
     * The id of the last message to copy. `null` copies no messages, but still
     * copies the settings and plugin config. Default: the whole transcript. An
     * id the thread does not have throws.
     */
    at?: string | null;
    /** Who opens the new thread, as in `open`. */
    principal?: Principal;
}
export interface ResumePendingOptions {
    /** The harnesses whose threads this sweep may open, matched by name. */
    harnesses: ReadonlyArray<AnyHarness>;
    /**
     * What happens to a session that the sweep opened. `'whenIdle'`
     * (default): it closes when its pending work ends, unless the app opened
     * the thread too. `'never'`: it stays open, like any opened session.
     */
    close?: 'whenIdle' | 'never';
    /** How many expired claims one call reads. Default 100. */
    limit?: number;
}
/** Runs sessions for one or more harnesses in this process. */
export interface HarnessHost<TLogState = unknown> {
    /**
     * Open a session, or return the live one for this harness and thread.
     * Session plugins are set up here, so a plugin error rejects the promise.
     */
    open: <THarness extends AnyHarness>(harness: THarness, options: OpenSessionOptions) => Promise<HarnessSession<THarness>>;
    /**
     * Start a new thread as a copy of another one, and return its open
     * session. It copies the transcript up to and including the message `at`,
     * the media that those messages use, the stored settings, and the plugin
     * config. It does not copy plugin state, pending interrupts, queued
     * inputs, or running work. A `newThreadId` with messages is refused.
     *
     * @example
     * ```ts
     * const fork = await host.fork(assistant, { threadId: 't-1', newThreadId: 't-2', at: messageId })
     * ```
     */
    fork: <THarness extends AnyHarness>(harness: THarness, options: ForkSessionOptions) => Promise<HarnessSession<THarness>>;
    /**
     * Continue the work of hosts that stopped. Needs `stores.workClaims`. It
     * opens each thread whose claim expired, for a harness in `harnesses`, and
     * the session recovers its pending work. Two hosts can call it at once:
     * each thread goes to one of them. Call it at boot, and from a cron job or
     * a Durable Object alarm. Resolves with the threads it opened.
     *
     * Known limit: a thread that this host has open already is claimed, but
     * its session does not recover again. Call `host.recover(threadId)` for it.
     *
     * @example
     * ```ts
     * await host.resumePending({ harnesses: [assistant] })
     * ```
     */
    resumePending: (options: ResumePendingOptions) => Promise<Array<{
        threadId: string;
        harness: string;
    }>>;
    /**
     * Run `session.recover()` on the open sessions of `threadId`, or on every
     * open session without it. A turn that another host ran when its session
     * opened runs here once that host's lease expires.
     *
     * @example
     * ```ts
     * await host.recover('thread-1')
     * ```
     */
    recover: (threadId?: string) => Promise<void>;
    /**
     * Run `session.reload()` on every open session of `harness`. Rejects when
     * one of them fails. The other sessions still reload.
     *
     * @example
     * ```ts
     * await host.reload(assistant)
     * ```
     */
    reload: (harness: AnyHarness) => Promise<void>;
    /**
     * Close every live session. With `recoverable`, their running work stops
     * with no settlement, and the next host that opens a thread runs it again.
     * See `session.close`.
     *
     * @example
     * ```ts
     * await host.close({ recoverable: true })
     * ```
     */
    close: (options?: {
        recoverable?: boolean;
    }) => Promise<void>;
    /**
     * The `reduce` fold of a log that has an open session in this host, or
     * `undefined`.
     */
    logState: (logId: string) => TLogState | undefined;
    /** The session index: list, rename, delete, and fork sessions. */
    sessions: HostSessions;
    /**
     * The status changes and the session index changes of this host, for a
     * list of sessions that stays current. First the current status of each
     * open session, then each change as it occurs. Each call reads on its own.
     * The read stops when `signal` aborts or the loop ends.
     *
     * @example
     * ```ts
     * for await (const event of host.events({ signal })) {
     *   if (event.type === 'status') console.log(event.threadId, event.status)
     * }
     * ```
     */
    events: (options?: {
        signal?: AbortSignal;
    }) => AsyncIterable<HostEvent>;
}
/**
 * Writes to the session index. `upsert` replaces the whole entry, so a
 * change reads the entry, changes a copy, and writes it back. The changes of
 * one thread run one at a time, so no change loses the fields of another.
 * `onChange` gets each write and each removal.
 */
declare function sessionIndex(store: SessionIndexStore | undefined, onChange: (event: HostSessionEvent | HostSessionDeletedEvent) => void): {
    get: (threadId: string) => Promise<SessionIndexEntry | undefined>;
    /**
     * Write `change(entry)` for the thread. `change` gets `undefined` when
     * the thread has no entry, and returns `undefined` to write nothing.
     */
    update: (threadId: string, change: (entry: SessionIndexEntry | undefined) => SessionIndexEntry | undefined) => Promise<SessionIndexEntry | undefined>;
    remove: (threadId: string) => Promise<void>;
};
/** @internal How a session writes its index entry. */
export type SessionIndexWriter = ReturnType<typeof sessionIndex>;
/**
 * @internal The open session of `harness` in `host` that has the chat turn
 * `operationId`, running or ended. A turn's events live in the host that runs
 * it, so the handler joins a run through this.
 */
export declare function sessionOfTurn(host: HarnessHost, harness: AnyHarness, operationId: string): Promise<HarnessSession | undefined>;
/**
 * Create a host for harness sessions.
 *
 * @example
 * ```ts
 * const host = createHarnessHost({ persistence })
 * const session = await host.open(studio, { threadId: 'thread-1' })
 * const turn = await session.prompt('Write a haiku about the sea.')
 * ```
 */
export declare function createHarnessHost<TLogState = undefined>(options?: HarnessHostOptions<TLogState>): HarnessHost<TLogState>;
export {};
