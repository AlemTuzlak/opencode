import { StreamChunk } from '@tanstack/ai';
import { EventFeed } from './feed.js';
import { Cursor, Operation, OperationKind, OperationStatus, Receipt, SessionEvent } from './types.js';
/** A new operation id. It is also the AG-UI `runId` of the operation. */
export declare function createOperationId(kind: OperationKind): string;
/** The session-side implementation of {@link Operation}. */
export declare class OperationImpl<TResult> implements Operation<TResult> {
    readonly kind: OperationKind;
    private readonly feed;
    private readonly onCancel;
    readonly agent?: string | undefined;
    readonly id: string;
    /** The feed head when the operation was made. Its events come after it. */
    readonly startedCursor: Cursor;
    readonly abortController: AbortController;
    readonly receipt: Promise<Receipt>;
    private current;
    private readonly settled;
    private resolveResult;
    private rejectResult;
    private settleReceipt;
    constructor(kind: OperationKind, feed: EventFeed, onCancel: (operation: OperationImpl<TResult>) => Promise<Receipt>, agent?: string | undefined, 
    /** A stored operation id, when a restart rebuilds this operation. */
    id?: string);
    then<TResult1 = TResult, TResult2 = never>(onfulfilled?: ((value: TResult) => TResult1 | PromiseLike<TResult1>) | null, onrejected?: ((reason: unknown) => TResult2 | PromiseLike<TResult2>) | null): PromiseLike<TResult1 | TResult2>;
    status(): OperationStatus;
    isSettled(): boolean;
    setStatus(status: OperationStatus): void;
    publish(event: StreamChunk): void;
    /** Answer `receipt`. The first answer wins. */
    resolveReceipt(receipt: Receipt): void;
    finish(status: 'completed' | 'interrupted', result: TResult): void;
    fail(status: 'failed' | 'cancelled', error: unknown): void;
    events(options?: {
        from?: Cursor;
        signal?: AbortSignal;
    }): AsyncIterable<SessionEvent>;
    stream(options?: {
        signal?: AbortSignal;
    }): AsyncIterable<StreamChunk>;
    cancel(_reason?: string): Promise<Receipt>;
}
