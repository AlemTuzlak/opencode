import { awaitLogQuiescence, fenceDurability, fenceRunStore, withRunClaim } from "./claim.js";
import { pipeToRunLog } from "./run.js";
//#region src/driver.ts
/**
* The convenience that turns core's *injected* takeover seams into this
* package's real ones.
*
* `@tanstack/ai`'s `RunDriverOptions` deliberately takes `claim` and `pipe` as
* functions instead of importing them: {@link withRunClaim} and
* {@link pipeToRunLog} live here, and core must not depend on this package to
* serve a plain chat run. {@link sandboxRunDriver} fills both in so an
* application writes four fields instead of six, and — more importantly — so
* the *fencing* is wired correctly by construction rather than by every caller
* remembering to.
*
* WHAT IS EASY TO GET WRONG HERE, and therefore what this module exists to
* make impossible:
*
* 1. **Carrying the real epoch into `pipe`.** Core's `pipe` receives only
*    `{ runId, threadId, signal }` — no epoch — because core has no concept of
*    one. But {@link fenceDurability} needs the epoch this driver actually
*    acquired: a hardcoded epoch (say `0`) is not a weaker fence, it is a
*    permanently *tripped* one, since `withRunClaim` bumps `driverEpoch` to at
*    least `1` before `fn` ever runs, so `observed > claim.epoch` holds on the
*    very first append and EVERY takeover fails. The claim is therefore
*    captured in a closure by the `claim` wrapper and read back by `pipe`.
* 2. **Fencing `close()`.** {@link fenceDurability} wraps only `append` for the
*    reason spelled out in `claim.ts`: `close()` runs on every teardown path,
*    including the teardown caused by losing the claim, and a fenced `close`
*    would wedge the record at `'running'` with every live tailer parked
*    forever. This module must not add a second fence around it.
* 2b. **Fencing only ONE of the two authoritative seams.** A run's facts live in
*    its log *and* in its record, and `pipeToRunLog` reacts to a refused append
*    by writing a terminal record — so wrapping the log alone just moves the harm
*    from "a dead host poisons the successor's stream" to "a dead host marks the
*    successor's live run failed". {@link fenceRunStore} must be wired here too,
*    over the SAME claim, which is what makes the two fences share one latch.
* 3. **Skipping quiescence.** The successor's first append must come after the
*    stored log has stopped growing, so a predecessor still writing is observed
*    rather than raced. The gate belongs inside `pipe`, before `pipeToRunLog`
*    takes its first `snapshot`.
*/
/**
* `pipe` ran without a held claim. Not a recoverable condition: it means the
* returned options object was taken apart and `pipe` called outside `claim`, so
* there is no epoch to fence with and no lease guaranteeing exclusivity. Any
* append made in that state is exactly the duplicate-write bug the claim exists
* to prevent, so this fails loudly rather than appending unfenced.
*/
var RunDriverPipeOutsideClaimError = class extends Error {
	runId;
	constructor(runId) {
		super(`run ${runId}: sandboxRunDriver.pipe was called outside its claim, so the driver epoch is unknown; call it from within the claim callback`);
		this.runId = runId;
		this.name = "RunDriverPipeOutsideClaimError";
	}
};
/**
* Fill in a core `driver` block with this package's claim and run log.
*
* `drive` receives an `AbortSignal` — the driver owns the abort, so it hands
* out a signal rather than a controller — but `chat()` takes an
* `AbortController`. Mirror one onto the other, exactly as
* {@link https://tanstack.com/ai/latest/docs/sandbox/takeover | Takeover & Detached Runs}'s
* `controllerFor` does, so a lost claim actually stops the drive.
*
* @example
* ```typescript
* function controllerFor(signal: AbortSignal): AbortController {
*   const controller = new AbortController()
*   const abort = (): void => controller.abort(signal.reason)
*   if (signal.aborted) abort()
*   else signal.addEventListener('abort', abort, { once: true })
*   return controller
* }
*
* export async function GET(request: Request) {
*   return resumeServerSentEventsResponse({
*     adapter: memoryStream(request),
*     driver: sandboxRunDriver({
*       request,
*       runs,
*       locks,
*       durability: (runId) => logFor(runId),
*       drive: ({ runId, threadId, signal }) =>
*         chat({
*           ...config,
*           runId,
*           threadId,
*           abortController: controllerFor(signal),
*         }),
*     }),
*   })
* }
* ```
*/
function sandboxRunDriver(input) {
	const fenceQuietMs = input.fenceQuietMs ?? 5e3;
	let current;
	return {
		request: input.request,
		runs: input.runs,
		locks: input.locks,
		drive: input.drive,
		claim: (claimInput, fn) => withRunClaim({
			...claimInput,
			fenceQuietMs,
			...input.logger === void 0 ? {} : { logger: input.logger }
		}, async (claim) => {
			const previous = current;
			current = claim;
			try {
				return await fn(claim);
			} finally {
				current = previous;
			}
		}),
		pipe: async (stream, i) => {
			const claim = current;
			if (claim === void 0) throw new RunDriverPipeOutsideClaimError(i.runId);
			await awaitLogQuiescence(input.durability(i.runId), fenceQuietMs);
			return pipeToRunLog(stream, {
				runs: fenceRunStore(input.runs, claim, { ...input.logger === void 0 ? {} : { logger: input.logger } }),
				durability: (runId) => fenceDurability(input.durability(runId), claim, { runs: input.runs }),
				runId: i.runId,
				threadId: i.threadId,
				signal: i.signal,
				...input.logger === void 0 ? {} : { logger: input.logger }
			});
		},
		...input.waitUntil === void 0 ? {} : { waitUntil: input.waitUntil },
		...input.logger === void 0 ? {} : { logger: input.logger }
	};
}
//#endregion
export { RunDriverPipeOutsideClaimError, sandboxRunDriver };

//# sourceMappingURL=driver.js.map