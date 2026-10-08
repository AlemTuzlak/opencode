import { validateReconstructGenerationStores } from "./types.js";
//#region src/reconstruct-generation.ts
/**
* Map the persisted run status to the client-facing resume-snapshot status.
* An `interrupted` or `aborted` run surfaces as `error` — the client has no live
* run to resume, and neither produced a usable result. (A generation abort is
* always terminal: there is no journal to reattach to, so `withGenerationPersistence`
* writes `'aborted'` rather than parking the run.)
*/
function snapshotStatus(status) {
	switch (status) {
		case "running": return "running";
		case "completed": return "complete";
		case "failed":
		case "interrupted":
		case "aborted": return "error";
	}
}
function runToSnapshot(run) {
	const status = snapshotStatus(run.status);
	return {
		schemaVersion: 1,
		resumeState: status === "running" ? {
			runId: run.runId,
			threadId: run.threadId
		} : null,
		status,
		...run.result !== void 0 ? { result: run.result } : {},
		...run.error !== void 0 ? { error: run.error } : {},
		...run.activity !== void 0 ? { activity: run.activity } : {}
	};
}
function jsonResponse(body) {
	return new Response(JSON.stringify(body), { headers: {
		"content-type": "application/json",
		"cache-control": "no-store"
	} });
}
/**
* The request-free core of {@link reconstructGeneration}: read the last
* generation run for a thread (or a specific run) straight from the
* `generationRuns` store and return the plain `{ resumeSnapshot, activeRun }`
* hydration payload a server-authoritative client adopts on mount.
*
* Use this from a TanStack Start server function (or any direct call) to back
* a client's `hydrateGeneration` handler without fabricating a `Request`:
*
* ```ts
* async function loadImageHydration({ data: threadId }: { data: string }) {
*   // Do your own auth here — this helper does not enforce tenancy.
*   return await getGenerationHydration(persistence, threadId)
* }
* ```
*
* Wire that body up as the server function's handler — build it with
* `createServerFn({ method: 'GET' })`, add an `inputValidator` that returns
* the thread id, then hand it the function above. (The chained call is shown
* split apart on purpose: Start's server-fn plugin decides which modules to
* transform by scanning source text for that call, and a package whose shipped
* comments contain it gets pulled into the transform.)
*
* ⚠️ Unlike {@link reconstructGeneration} this helper takes **no** `authorize`
* option — there is no `Request` to authorize against. Server-function callers
* must gate the call themselves (session → owned thread/run) before resolving
* the id, or any caller who guesses an id receives the run's status and result
* metadata.
*
* Returns `{ resumeSnapshot: null, activeRun: null }` when `id` is empty or no
* matching run exists, so the caller never has to special-case a first load.
*/
async function getGenerationHydration(persistence, id, options) {
	validateReconstructGenerationStores(persistence);
	const runStore = persistence.stores.generationRuns;
	if (!runStore) throw new Error("getGenerationHydration requires stores.generationRuns.");
	if (!id) return {
		resumeSnapshot: null,
		activeRun: null
	};
	const run = options?.by === "runId" ? await runStore.get(id) : await runStore.findLatestForThread(id);
	if (!run) return {
		resumeSnapshot: null,
		activeRun: null
	};
	return {
		resumeSnapshot: runToSnapshot(run),
		activeRun: run.status === "running" ? { runId: run.runId } : null
	};
}
/**
* Build the JSON `Response` a server-authoritative client hydrates a generation
* from on load. Reads a `?runId=` (preferred) or `?threadId=` from the request
* query and returns `{ resumeSnapshot, activeRun }`
* ({@link ReconstructedGeneration}):
*
* - Resolves the run by `runId` via `stores.generationRuns.get`, else the
*   latest run filed under `threadId` via the required
*   `stores.generationRuns.findLatestForThread`.
* - `resumeSnapshot` — the run mapped to a client snapshot (status, result,
*   error, activity, and a `resumeState` cursor while still running), or `null`.
* - `activeRun` — `{ runId }` when the run is still generating, else `null`.
*
* Requires `stores.generationRuns`. Returns
* `{ resumeSnapshot: null, activeRun: null }` when no id is supplied or no
* matching run exists, so the caller never has to special-case a first load.
*
* This helper does **not** enforce tenancy by itself. Pass
* {@link ReconstructGenerationOptions.authorize} (or wrap the call in your own
* session gate) before exposing it on a public route.
*
* ```ts
* export async function GET(request: Request) {
*   return reconstructGeneration(persistence, request, {
*     authorize: async (id, req) => {
*       const userId = await getSessionUserId(req)
*       return userId != null && (await userOwnsThread(userId, id))
*     },
*   })
* }
* ```
*/
async function reconstructGeneration(persistence, request, options) {
	const params = new URL(request.url).searchParams;
	const runParam = options?.runParam ?? "runId";
	const threadParam = options?.param ?? "threadId";
	const runId = params.get(runParam) ?? "";
	const threadId = params.get(threadParam) ?? "";
	const id = runId || threadId;
	if (!id) return jsonResponse({
		resumeSnapshot: null,
		activeRun: null
	});
	if (options?.authorize) {
		const decision = await options.authorize(id, request);
		if (decision instanceof Response) return decision;
		if (!decision) return new Response(JSON.stringify({ error: "Forbidden" }), {
			status: 403,
			headers: {
				"content-type": "application/json",
				"cache-control": "no-store"
			}
		});
	}
	return jsonResponse(await getGenerationHydration(persistence, id, { by: runId ? "runId" : "threadId" }));
}
//#endregion
export { getGenerationHydration, reconstructGeneration };

//# sourceMappingURL=reconstruct-generation.js.map