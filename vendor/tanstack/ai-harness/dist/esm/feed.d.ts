import { StreamChunk } from '@tanstack/ai';
import { Cursor, SessionEvent } from './types.js';
/**
 * The ordered event stream of one session. Every operation publishes here. A
 * host without a log uses {@link SessionFeed}. A durable host uses a feed
 * that keeps the events in the session log.
 */
export interface EventFeed {
    publish: (operationId: string, event: StreamChunk) => void;
    /** The cursor of the newest event, or `'0'` for an empty feed. */
    head: () => Cursor;
    /**
     * Events after `from` (exclusive), then live events until `signal` aborts
     * or the feed closes. Pass a `filter` to read one operation's events.
     */
    read: (options: {
        from?: Cursor;
        signal?: AbortSignal;
        filter?: (entry: SessionEvent) => boolean;
        /** Stop after `until()` returns true and no buffered event is left. */
        until?: () => boolean;
    }) => AsyncIterable<SessionEvent>;
    close: () => void;
}
/**
 * The in-memory {@link EventFeed}. Cursors are opaque to callers and increase
 * with each event.
 */
export declare class SessionFeed implements EventFeed {
    private readonly entries;
    private sequence;
    private readonly waiters;
    private closed;
    publish(operationId: string, event: StreamChunk): void;
    head(): Cursor;
    read(options: {
        from?: Cursor;
        signal?: AbortSignal;
        filter?: (entry: SessionEvent) => boolean;
        /** Stop after `until()` returns true and no buffered event is left. */
        until?: () => boolean;
    }): AsyncIterable<SessionEvent>;
    close(): void;
    private wake;
    private waitForNext;
}
