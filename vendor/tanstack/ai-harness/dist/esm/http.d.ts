import { WebSocketLike } from '@tanstack/ai';
import { AnyHarness } from './define.js';
import { HarnessHost } from './host.js';
import { Principal } from './types.js';
/**
 * Decide who sends a request. Return `null` to refuse it with 401. Every
 * endpoint calls it, except a signed media URL: the handler signs one only
 * for a principal that `authorize` and `canAccess` let in.
 */
export type Authorize = (request: Request) => Principal | null | Promise<Principal | null>;
export interface HarnessHandlerOptions {
    host: HarnessHost;
    harness: AnyHarness;
    authorize: Authorize;
    /**
     * May this principal use this thread? Default: yes. Use it to keep users
     * out of each other's threads.
     */
    canAccess?: (principal: Principal, threadId: string) => boolean | Promise<boolean>;
    /**
     * The secret that signs media URLs (HMAC SHA-256). Default: a random key
     * per handler, so signed URLs stop working after a restart. Set it to keep
     * them working, and use the same value on every server behind one URL.
     */
    mediaSecret?: string;
}
/**
 * A fetch handler for a harness. Mount it on a route that ends with any of
 * these paths:
 *
 * - `GET  .../capabilities`: the AG-UI capabilities document.
 * - `POST .../run`: standard AG-UI. One request is one prompt (or one
 *   `resume`), streamed as SSE. The turn runs as the request's `runId`, and a
 *   retry with the same `runId` runs once. The prompt keeps every content
 *   part of the last user message, and its `forwardedProps` are the input's
 *   `context`.
 * - `GET  .../run?threadId=`: the transcript, the running turn, and the
 *   waiting interrupts, as the `ChatHydrationResult` that a `ChatClient` with
 *   `persistence` reads.
 * - `GET  .../run?runId=` (or `X-Run-Id`): the chat turn with that run id, as
 *   SSE from its start, so a reloaded `ChatClient` joins it. Each event id is
 *   a cursor, so `Last-Event-ID` resumes it. 404 for a turn this host does
 *   not run.
 * - `GET  .../events?threadId=&from=`: the session stream as SSE. Each event id
 *   is a cursor, so `Last-Event-ID` resumes it.
 * - `POST .../control`: `{ threadId, input }`. Returns the receipt.
 * - `GET  .../snapshot?threadId=`: the session snapshot.
 * - `GET  .../transcript?threadId=`: the saved messages of the thread.
 * - `GET  .../describe?threadId=`: the commands, settings, and tools. Only
 *   the commands in `expose.commands` and the config keys in `expose.config`.
 * - `POST .../media?threadId=&name=`: store the raw body as a media file of
 *   the thread, with `Content-Type` as its type. Returns the `MediaRecord`.
 *   413 when it is over `media.maxBytes`, 415 for a type the harness does not
 *   take.
 * - `GET  .../media-url?threadId=&id=`: `{ path, expiresAt }`, a signed path
 *   to the file, relative to the handler. It works for 1 hour.
 * - `GET  .../media?threadId=&id=[&exp=&sig=]`: the bytes, with `Range`
 *   support. A signed request needs no `authorize`, and a bad or expired
 *   signature is 403.
 * - `GET  .../sessions?limit=&cursor=&parentThreadId=`: one page of the
 *   session index, newest first. Only the sessions of this principal that
 *   `canAccess` lets in. Default: top-level sessions only.
 * - `POST .../sessions`: change a session of this principal. The body is
 *   `{ op: 'rename', threadId, title }`, `{ op: 'delete', threadId }` (it
 *   removes the index entry only), or `{ op: 'fork', threadId, before }` or
 *   `{ op: 'fork', threadId, through }` with a message id. Rename and fork
 *   answer with the entry, delete with 204. 403 when `canAccess` refuses
 *   the thread, 404 for a thread this principal does not own, and 409
 *   (`other_harness`) for a fork of a thread that another harness runs.
 * - `GET  .../host-events`: the `host.events()` of this principal as SSE:
 *   status changes and session index changes. First the current status of
 *   each open session. Only the threads that `canAccess` lets in and that
 *   this principal owns in the session index, so it needs `stores.sessions`.
 *
 * Each chat input runs as the principal that `authorize` returned for its
 * request, not as the one that opened the session first.
 */
export declare function createHarnessHandler(options: HarnessHandlerOptions): (request: Request) => Promise<Response>;
export interface HarnessSocketOptions {
    host: HarnessHost;
    harness: AnyHarness;
    socket: WebSocketLike;
    /** The principal your upgrade handler authorized. */
    principal: Principal;
    canAccess?: (principal: Principal, threadId: string) => boolean | Promise<boolean>;
}
/**
 * Serve the session tier over one WebSocket. The first frame must be
 * `harness.subscribe`. Authorize the upgrade request before you call this.
 */
export declare function handleHarnessSocket(options: HarnessSocketOptions): void;
