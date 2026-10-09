import { TerminalRunStatus, UIMessage } from '@tanstack/ai';
import { AIPersistence, ChatTranscriptStores } from './types.js';
/**
 * The JSON body `reconstructChat` returns and a server-authoritative client
 * hydrates from on mount.
 *
 * `messages` is the stored transcript as UI messages (ready to paint).
 * `activeRun` is a cursor to a run still generating for the thread, or `null` —
 * resolved from the STABLE thread id via `stores.runs.findActiveRun`, so the
 * client learns "there is a live run to tail" without ever handling a run id.
 * `interrupts` is the thread's pending human-in-the-loop interrupts (tool
 * approvals, client-tool/generic waits) and the run they paused, or `null` —
 * so a reload (or another device) re-prompts the approval from the SERVER, not
 * from client storage. Resolved via `stores.interrupts.listPending`.
 * `page` is set only when the GET included a valid `limit`. `truncated` is true
 * when older UI messages exist. `cursor` is the opaque `before` token for the
 * next older window.
 */
export interface ReconstructedChat {
    messages: Array<UIMessage>;
    activeRun: {
        runId: string;
    } | null;
    interrupts: {
        runId: string;
        pending: Array<Record<string, unknown>>;
    } | null;
    page?: {
        truncated: false;
    } | {
        truncated: true;
        cursor: string;
    };
    /**
     * The thread's finished runs, ascending by `startedAt`. Set only when
     * {@link ReconstructChatOptions.includeRuns} is `true` and the `runs` store
     * implements `listByThread`. Each assistant message of a listed run also
     * gets the timings on `message.metadata.tanstack.run`.
     */
    runs?: Array<{
        runId: string;
        status: TerminalRunStatus;
        startedAt: number;
        finishedAt?: number;
    }>;
}
export interface ReconstructChatOptions {
    /** Query parameter carrying the thread id. Defaults to `threadId`. */
    param?: string;
    /**
     * Add the thread's finished runs, with `startedAt` and `finishedAt`, to the
     * response as `runs`. Needs a `runs` store that implements `listByThread`.
     * Default: `false`.
     */
    includeRuns?: boolean;
    /**
     * Authorize access to the requested thread before loading history.
     *
     * ⚠️ Without this, any caller who knows or guesses `?threadId=` receives the
     * full transcript. Multi-user / multi-tenant deployments **must** supply
     * an authorization check (session → owned threads) or resolve a validated
     * thread id in the route and pass it via a custom `param` that only your
     * server sets.
     *
     * Return:
     * - `true` to allow the load
     * - `false` for a default `403` response
     * - a `Response` to return as-is (e.g. `401` with a body)
     */
    authorize?: (threadId: string, request: Request) => boolean | Response | Promise<boolean | Response>;
}
/**
 * Build the JSON `Response` a server-authoritative client hydrates from on load
 * (see the client-persistence guide). Reads the thread id from the request query
 * (`?threadId=` by default) and returns `{ messages, activeRun, interrupts }`
 * ({@link ReconstructedChat}):
 *
 * - `messages` — the stored transcript as UI messages.
 * - `activeRun` — `{ runId }` if a run is still generating for the thread (so the
 *   client tails it via the durability stream), else `null`. Resolved via the
 *   required `stores.runs.findActiveRun`; `null` when the `runs` store is absent.
 * - `interrupts` — `{ runId, pending }` if the thread has pending human-in-the-loop
 *   interrupts (a paused approval / wait) and the run they paused, else `null`, so
 *   a reload re-prompts the decision from the server. Resolved via the optional
 *   `stores.interrupts.listPending`; `null` when that store is absent.
 *
 * Paging is opt-in. A valid `?limit=` (positive integer, capped at 500) returns
 * the newest window of UI messages plus `page`. `?before=` walks to an older
 * window. Invalid `limit` (`0`, negative, NaN) is ignored and the full
 * transcript is returned. `activeRun` and `interrupts` are never paged.
 *
 * Requires `stores.messages`. Returns an empty transcript with no active run
 * and no interrupts when the thread id is missing or the thread is unknown, so
 * the caller never has to special-case a first load.
 *
 * This helper does **not** enforce tenancy by itself. Pass
 * {@link ReconstructChatOptions.authorize} (or wrap the call in your own
 * session gate) before exposing it on a public route.
 *
 * ```ts
 * export async function GET(request: Request) {
 *   return reconstructChat(persistence, request, {
 *     authorize: async (threadId, req) => {
 *       const userId = await getSessionUserId(req)
 *       return userId != null && (await userOwnsThread(userId, threadId))
 *     },
 *   })
 * }
 * ```
 */
export declare function reconstructChat(persistence: AIPersistence<ChatTranscriptStores>, request: Request, options?: ReconstructChatOptions): Promise<Response>;
