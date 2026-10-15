import { journalExitProbeCommand, journalPaths, parseJournalExit } from "./journal.js";
import { decodeBase64Stream } from "./journal-bytes.js";
import { RunClaimLostError, RunClaimNotAcquiredError, awaitLogQuiescence, fenceDurability, fenceRunStore, withRunClaim } from "./claim.js";
import { pipeToRunLog } from "./run.js";
import { isTerminalRunStatus, requestRunCancel } from "@tanstack/ai";
//#region src/reap.ts
/**
* The sweep `RunStore.listReclaimable` was always missing a consumer for: take a
* detached run whose viewer never came back, save its transcript, terminalize its
* record, and tear its sandbox down.
*
* THE ONE RULE THAT SHAPES EVERYTHING HERE: **never drive a run to find out
* whether it finished.**
*
* The obvious design — hand the run to `pipeToRunLog` under a short
* `runBudgetMs` and see whether it terminalizes — was measured and is broken.
* `pipeToRunLog` is total by construction: it ALWAYS writes a terminal status and
* ALWAYS calls `durability.close()`. Against a run that has not finished, all
* three producer shapes are destructive:
*
* | producer's reaction to the budget signal | stored status | `close()` |
* | ---------------------------------------- | ------------- | --------- |
* | ignores it and keeps producing           | `aborted`     | called    |
* | returns on abort (the realistic `drive`)  | `aborted`     | called    |
* | throws an AbortError                     | `failed`      | called    |
*
* The middle row USED to read `completed`, which was the fatal one: a signal-aware
* producer exits its loop NORMALLY, and `pipeToRunLog` only checked its signal
* per chunk, so a healthy mid-flight run was recorded as `'completed'` with a
* `finishedAt` — a false transcript. That gap is fixed (`run.ts` re-checks the
* signal after the loop), so the status is now honest on all three rows. The rule
* above is UNCHANGED, because the status was never the whole harm: every row
* writes a terminal record and closes a log that commit `5a1f821c9` deliberately
* leaves OPEN for takeover (ending every attached client's stream), and a terminal
* record drops out of `listReclaimable` forever, so TTL expiry can never reclaim
* that run's sandbox. A cost leak with no recovery path. There is therefore no
* "still running" outcome in {@link ReapRunOutcome}: it is unreachable by
* construction, not merely unlikely.
*
* So sentinel-reached is detected OUT OF BAND, through the in-sandbox journal
* ({@link probeRunExit}), and `pipeToRunLog` is entered only for a run already
* KNOWN to have finished, or for one whose TTL has expired (terminal either way).
* On the FINALIZATION path `runBudgetMs` therefore degrades from a load-bearing
* mechanism into a safety net whose expiry is a genuine anomaly — see
* `'budget-exceeded'`. On the EXPIRY path it stays load-bearing: nothing polls the
* cancel this module records, so the budget is what ends the drive of an expired
* run whose agent is still producing, and its expiry there is the designed path.
*
* WHY THE PROBE IS INJECTED (`ReapOptions.hasFinished`) rather than resolved
* here, exactly like `ReapOptions.reclaim`:
*
* - It cannot read `durability.snapshot()`. After a detach nothing appends to the
*   delivery log — the host that would have appended is the host that left — so
*   the log is frozen at the last delivered chunk while the JOURNAL keeps
*   growing. The log can only ever say "no news".
* - It cannot resolve a `SandboxHandle` either. `SandboxInstanceStore` is
*   `get`/`upsert`/`delete` with no `list` (see `reclaim.ts` for why that is
*   deliberate), and only the application maps a `sandboxKey` to a live handle.
*
* NEVER REJECTS. This runs from a cron, an `alarm()`, or a `waitUntil` with
* nobody to catch it, so every per-run failure is logged and folded into
* {@link ReapResult} rather than escaping.
*
* NEVER CLEARS `detachedSince`. That field is what the reaper SELECTS on, and
* `packages/ai/src/stream-to-response.ts`'s `startRunDriver` clears it because a
* real viewer stopping the TTL clock is the opposite job. Its comment there names
* borrowing that path "the single most likely bug in this phase"; clearing the
* marker would reset the TTL on every sweep and a detached run would never
* expire.
*/
/**
* Safety net for a single run's drive. Not the mechanism that decides whether a
* run finished — see the module doc for why that design was rejected — so this is
* generous rather than tight: it only has to stop a drive that has genuinely
* wedged on a run the journal already said was over.
*
* On the expiry path it is not merely a net: it is what stops a still-producing
* agent, since nothing polls the cancel recorded before that drive. A caller that
* expires live agents may want a tighter value there than a finalization replay
* needs.
*/
var DEFAULT_RUN_BUDGET_MS = 3e4;
/**
* Runs one sweep will touch. A cron invocation is bounded (a Worker's CPU
* budget, a Lambda timeout), and an unbounded sweep over a backlog of thousands
* would be killed mid-run rather than finishing 25 and returning; the next tick
* takes the next batch.
*/
var DEFAULT_MAX_RUNS = 25;
/** Journal tail bytes {@link probeRunExit} reads. The sentinel is the last line. */
var DEFAULT_EXIT_PROBE_BYTES = 4096;
async function* singleValue(value) {
	yield value;
}
/** Decode the base64 frame `journalExitProbeCommand` emits. */
async function decodeFrame(stdout) {
	const decoder = new TextDecoder();
	let text = "";
	for await (const bytes of decodeBase64Stream(singleValue(stdout))) text += decoder.decode(bytes, { stream: true });
	return text + decoder.decode();
}
/**
* Read the END of a run's journal and answer whether the agent reached its
* `{"__exit":N}` sentinel. Read-only: no append, no record write, no `close()`.
*
* This is the whole reason the reaper is safe. It is the ONLY way to learn that a
* detached run is over without driving it, because the delivery log stops growing
* the moment the viewer leaves while the journal does not.
*
* ANY failure answers `'unknown'`, never `'finished'`: the caller drives a run it
* is told finished, so a provider `exec` that rejected, a sandbox that is gone, or
* a frame the provider truncated must never be read as "the agent exited".
*
* An EMPTY tail answers `'producing'` — the fail-safe direction. A journal that
* does not exist yet is indistinguishable here from one with no sentinel, and both
* mean "do not touch this run".
*/
async function probeRunExit(input) {
	try {
		const paths = journalPaths(input.runId, input.dir);
		const result = await input.handle.process.exec(journalExitProbeCommand(paths, input.maxBytes ?? 4096));
		const exitCode = parseJournalExit(await decodeFrame(result.stdout), paths);
		return exitCode === null ? { state: "producing" } : {
			state: "finished",
			exitCode
		};
	} catch (error) {
		return {
			state: "unknown",
			error
		};
	}
}
/** Every outcome key present at zero, so a consumer can read any of them. */
function emptyOutcomes() {
	return {
		finalized: 0,
		expired: 0,
		producing: 0,
		unknown: 0,
		"budget-exceeded": 0,
		"not-claimed": 0,
		"reclaim-failed": 0,
		failed: 0
	};
}
/**
* Report through a consumer-supplied logger without letting it break the sweep.
* Mirrors `run.ts`'s `safeLog`: this module's totality must not be defeated by a
* sink that cannot serialize a thrown value.
*/
function safeLog(logger, level, message, context) {
	try {
		if (level === "errors") logger?.errors(message, context);
		else logger?.sandbox(message, context);
	} catch {}
}
/** Whether a thrown value means "we do not own this run", which is normal. */
function isClaimRefusal(error) {
	return error instanceof RunClaimNotAcquiredError || error instanceof RunClaimLostError;
}
/**
* Sweep ONE run. Never rejects: the caller folds the returned entry into the
* summary and moves on.
*
* The ORDER of the steps below is the contract, not an implementation detail:
*
* 1. **Classify expiry first**, because an expired run needs no probe — its
*    outcome is terminal whether or not the agent finished, so a probe would only
*    add a provider round-trip and a way to fail.
* 2. **Otherwise probe BEFORE touching anything.** `'producing'` and `'unknown'`
*    return here, having made no claim, no append, no record write, and no
*    `close()`. Driving past this point is the whole defect described in the
*    module doc.
* 3. Claim, so two hosts never drive one run.
* 4. **Re-derive expiry from a record read INSIDE the lock**, and only then
*    record the cancel. The listed record is stale by the time the claim is
*    held, and the cancel is sticky.
* 5. Quiesce, so a predecessor still writing is observed rather than raced.
* 6. **Arm the run budget**, so it bounds the drive rather than the queue the
*    two steps above stood in.
* 7. Pipe with BOTH authoritative seams fenced, mirroring `driver.ts`.
* 8. Reclaim, and ONLY once the record actually reached terminal.
*/
async function reapOne(record, ctx, counters) {
	const { runs, locks, logger } = ctx.options;
	const { runId, threadId } = record;
	try {
		const expired = record.detachedSince !== void 0 && record.detachedSince <= ctx.cutoff;
		let exitCode;
		if (!expired) {
			counters.probed += 1;
			const probe = await ctx.options.hasFinished(record);
			if (probe.state !== "finished") {
				safeLog(logger, "sandbox", `reap: leaving run ${runId} alone`, {
					runId,
					state: probe.state,
					...probe.state === "unknown" && probe.error !== void 0 ? { error: probe.error } : {}
				});
				return {
					runId,
					outcome: probe.state,
					...probe.state === "unknown" && probe.error !== void 0 ? { error: probe.error } : {}
				};
			}
			exitCode = probe.exitCode;
		}
		let budget;
		const final = await withRunClaim({
			runs,
			locks,
			runId,
			fenceQuietMs: ctx.fenceQuietMs,
			...logger === void 0 ? {} : { logger }
		}, async (claim) => {
			if (expired) {
				const current = await runs.get(runId);
				if (current === null) throw new RunClaimNotAcquiredError(runId, "unknown");
				if (current.detachedSince === void 0 || current.detachedSince > ctx.cutoff) throw new RunClaimNotAcquiredError(runId, "superseded");
				await requestRunCancel(runs, runId);
			}
			await awaitLogQuiescence(ctx.options.durability(runId), ctx.fenceQuietMs);
			budget = AbortSignal.timeout(ctx.runBudgetMs);
			const signal = AbortSignal.any([claim.signal, budget]);
			return pipeToRunLog(ctx.options.drive({
				runId,
				threadId,
				signal
			}), {
				runs: fenceRunStore(runs, claim, { ...logger === void 0 ? {} : { logger } }),
				durability: (id) => fenceDurability(ctx.options.durability(id), claim, { runs }),
				runId,
				threadId,
				signal,
				...logger === void 0 ? {} : { logger }
			});
		});
		const terminal = isTerminalRunStatus(final.status);
		let outcome;
		if ((budget?.aborted ?? false) && !expired) outcome = "budget-exceeded";
		else if (!terminal) outcome = "not-claimed";
		else outcome = expired ? "expired" : "finalized";
		const budgetAnomaly = outcome === "budget-exceeded";
		let reclaimError;
		if (terminal && ctx.options.reclaim !== void 0) try {
			await ctx.options.reclaim(record);
		} catch (error) {
			reclaimError = error;
			outcome = "reclaim-failed";
			safeLog(logger, "errors", `reap: reclaiming run ${runId} failed`, {
				runId,
				status: final.status,
				error
			});
		}
		return {
			runId,
			outcome,
			status: final.status,
			...exitCode === void 0 ? {} : { exitCode },
			...budgetAnomaly ? { terminalizedAnyway: terminal } : {},
			...reclaimError === void 0 ? {} : { error: reclaimError }
		};
	} catch (error) {
		if (isClaimRefusal(error)) {
			safeLog(logger, "sandbox", `reap: not driving run ${runId}`, {
				runId,
				error
			});
			return {
				runId,
				outcome: "not-claimed",
				error
			};
		}
		safeLog(logger, "errors", `reap: sweeping run ${runId} failed`, {
			runId,
			error
		});
		return {
			runId,
			outcome: "failed",
			error
		};
	}
}
/**
* Sweep the detached runs a `RunStore` surfaces, saving each finished run's
* transcript and reclaiming its sandbox.
*
* A plain async function with no timer and no daemon: call it from a cron, a
* queue consumer, a Durable Object `alarm()`, or a `waitUntil`. It NEVER rejects
* — every failure is logged and counted in the returned {@link ReapResult}.
*
* ONE `listReclaimable({ now, ttlMs: 0 })` call, deliberately: `ttlMs: 0` is
* every detached run, which is the candidate set for FINALIZATION (a run that hit
* its sentinel one second after the viewer left has an unsaved transcript and
* must not wait out the TTL), and expiry is then classified in-process against
* the same inclusive cutoff. Listing twice with two TTLs would cost a second
* store round-trip to compute a subset.
*
* `listReclaimable` is OPTIONAL on `RunStore`. A backend without it cannot be
* reaped, which answers `{ considered: 0 }` plus one log line rather than
* throwing — the same graceful degrade every other optional-method call site in
* the repo does (`store.findActiveRun?.(threadId)`).
*/
async function reapDetachedRuns(options) {
	const logger = options.logger;
	const outcomes = emptyOutcomes();
	const entries = [];
	const empty = () => ({
		considered: 0,
		probed: 0,
		outcomes,
		runs: entries
	});
	const list = options.runs.listReclaimable?.bind(options.runs);
	if (list === void 0) {
		safeLog(logger, "sandbox", "reap: the run store does not implement listReclaimable; nothing to sweep", {});
		return empty();
	}
	let candidates;
	try {
		candidates = await list({
			now: options.now,
			ttlMs: 0
		});
	} catch (error) {
		safeLog(logger, "errors", "reap: listing reclaimable runs failed", { error });
		return empty();
	}
	const maxRuns = Math.max(0, Math.trunc(options.maxRuns ?? 25));
	const batch = candidates.slice(0, maxRuns);
	const ctx = {
		options,
		runBudgetMs: options.runBudgetMs ?? 3e4,
		fenceQuietMs: options.fenceQuietMs ?? 5e3,
		cutoff: options.now - options.detachedRunTtlMs
	};
	const counters = { probed: 0 };
	for (const record of batch) {
		const entry = await reapOne(record, ctx, counters);
		outcomes[entry.outcome] += 1;
		entries.push(entry);
	}
	return {
		considered: batch.length,
		probed: counters.probed,
		outcomes,
		runs: entries
	};
}
//#endregion
export { DEFAULT_EXIT_PROBE_BYTES, DEFAULT_MAX_RUNS, DEFAULT_RUN_BUDGET_MS, probeRunExit, reapDetachedRuns };

//# sourceMappingURL=reap.js.map