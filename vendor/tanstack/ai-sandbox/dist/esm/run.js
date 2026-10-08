import { EventType } from "@tanstack/ai";
import { toRunErrorPayload } from "@tanstack/ai/adapter-internals";
//#region src/run.ts
/**
* The "run driver" for the inverted/serverless sandbox model: pump a `chat()`
* stream into core's two durable seams — a {@link RunStore} for the run's
* lifecycle record and a {@link StreamDurability} for its event log — so a
* trigger can return immediately while a durable orchestrator drives the run
* and clients tail from an opaque offset.
*
* The key inversion vs. a classic request/response handler: there is no caller
* holding the stream open, so nothing to throw an error *back to*. The event log
* is the only channel — every chunk (including a terminal
* {@link EventType.RUN_ERROR}) is appended and assigned a resumable offset, and
* a thrown stream error is recorded as a synthesized `RUN_ERROR` event plus the
* record's `error` field. Tailing clients therefore always observe failures;
* {@link pipeToRunLog} never rejects.
*
* "Never rejects" is load-bearing rather than aspirational: {@link RunController}
* consumes the returned promise fire-and-forget, so a rejection would be an
* unhandled rejection (process-fatal on modern Node, instance-fatal inside a
* Durable Object) with nobody to report it to. Every store/log call is therefore
* individually guarded, and because absorbing a failure silently in the one
* module whose premise is that nobody is listening would make the failure
* invisible, each guard reports through the optional {@link RunDeps.logger}.
*/
/** Whether a chunk is the terminal error event the chat engine emits. */
function isRunErrorChunk(chunk) {
	return chunk.type === EventType.RUN_ERROR;
}
/**
* Narrow a thrown value (or a `RUN_ERROR` chunk's payload) to the record's
* structured error, keeping the provider's `code` when it supplies one: a bare
* message is prose that changes between model versions, while `code` is what a
* consumer branches on to retry, escalate, or show specific UI.
*/
function toRunError(error) {
	const payload = toRunErrorPayload(error);
	return {
		message: payload.message,
		...payload.code === void 0 ? {} : { code: payload.code }
	};
}
/**
* Fold a secondary failure into the primary error, mirroring `combineFailures`
* in `packages/ai/src/stream-to-response.ts`: the primary cause stays first and
* keeps its `code`, and the phase that produced the secondary failure is named.
* The secondary must never *replace* the primary: the provider's error is what
* an operator needs, and a failure while recording it is the lesser fact.
*/
function withSecondaryFailure(primary, secondary, phase) {
	return {
		...primary,
		message: `${primary.message}; ${phase}: ${toRunError(secondary).message}`
	};
}
/** Build the synthetic RUN_ERROR chunk appended when the stream throws. */
function syntheticRunError(error) {
	return {
		type: EventType.RUN_ERROR,
		message: error.message,
		...error.code === void 0 ? {} : { code: error.code }
	};
}
/**
* Report through a consumer-supplied logger without letting it break the
* caller. Every logger call in this module sits inside a `catch` body, so an
* throwing sink would escape that body and defeat the totality the guards
* exist to provide. Swallowing here is deliberate: there is no second channel
* left to report a reporting failure on.
*/
function safeLog(logger, message, context) {
	try {
		logger?.errors(message, context);
	} catch {}
}
/**
* Record the terminal status, terminalize the event log, and answer with the
* run's final record.
*
* TOTAL BY CONSTRUCTION: every step is individually guarded, so this never
* throws and never rejects. Two consequences the guards buy:
*
* - `durability.close()` runs on EVERY exit path, including a failed `update`.
*   Skipping it would wedge the record at `running` *and* park every live
*   tailer forever, because a durability `read` only ends once the log closes.
* - The re-read of the record is best effort. An eventually-consistent or
*   read-replica store may answer `null` for a run that was just driven, which
*   must not turn a successful run into a rejection; the locally rebuilt record
*   is returned instead. It is also preferred outright when `update` failed,
*   since the store then still holds the stale `running` row.
*
* THE TERMINAL WRITE IS NOT GUARANTEED TO LAND, and this function deliberately
* does not check whether it did. Under `sandboxRunDriver` the `runs` handed in is
* `fenceRunStore`d (`src/claim.ts`), which SUPPRESSES a terminal write — resolving
* without writing — when the driver has lost its claim, because a host that no
* longer owns the run must not declare it over while the successor is streaming
* it. From here that is indistinguishable from a successful write, on purpose:
* the epoch belongs to the claim module, not to this generic driver, and the
* re-read below then answers with the successor's live record, which is the
* truthful thing to resolve with. A driver wired without a claim (a plain
* `pipeToRunLog` call) is unfenced and always writes.
*/
async function finish(ctx, status, error) {
	const { runs, durability, runId, logger } = ctx;
	const patch = {
		status,
		finishedAt: Date.now(),
		...error === void 0 ? {} : { error }
	};
	const local = {
		runId,
		threadId: ctx.threadId,
		startedAt: ctx.startedAt,
		...patch
	};
	let recorded = true;
	try {
		await runs.update(runId, patch);
	} catch (updateError) {
		recorded = false;
		safeLog(logger, "run: recording the terminal run record failed", {
			runId,
			status,
			error: updateError
		});
	}
	try {
		await durability.close();
	} catch (closeError) {
		safeLog(logger, "run: closing the run event log failed", {
			runId,
			status,
			error: closeError
		});
	}
	if (!recorded) return local;
	try {
		const latest = await runs.get(runId);
		if (latest !== null) return latest;
		safeLog(logger, "run: record vanished before the terminal re-read", {
			runId,
			status
		});
	} catch (getError) {
		safeLog(logger, "run: re-reading the terminal run record failed", {
			runId,
			status,
			error: getError
		});
	}
	return local;
}
/**
* Open the run, append every chunk from `stream`, and finish with the right
* terminal status. Resolves with the final {@link RunRecord} and never rejects:
* a thrown stream error is surfaced as a `RUN_ERROR` event plus the record's
* `error`, which is what tailing clients see. A store or event-log failure
* along the way is logged through {@link RunDeps.logger} and still terminalizes
* the run rather than escaping to a caller that does not exist.
*
* - normal completion → `completed`
* - a `RUN_ERROR` chunk → append it, then `failed`
* - the stream throws → append a synthesized `RUN_ERROR`, then `failed`
* - `signal` aborts at ANY point before the stream ends → `aborted`, whether the
*   producer keeps yielding, ends its stream, or is never asked for another
*   chunk. An abort outranks a clean exit: the run did not complete.
*/
async function pipeToRunLog(stream, opts) {
	const { runs, runId, threadId, signal, logger } = opts;
	const durability = opts.durability(runId);
	const ctx = {
		runs,
		durability,
		runId,
		threadId,
		startedAt: Date.now(),
		...logger === void 0 ? {} : { logger }
	};
	try {
		await runs.createOrResume({
			runId,
			threadId,
			startedAt: ctx.startedAt
		});
		if (signal?.aborted) return finish(ctx, "aborted");
		for await (const chunk of stream) {
			if (signal?.aborted) return finish(ctx, "aborted");
			await durability.append([chunk]);
			if (isRunErrorChunk(chunk)) return finish(ctx, "failed", toRunError({
				message: chunk.message,
				code: chunk.code
			}));
		}
	} catch (streamError) {
		let recorded = toRunError(streamError);
		safeLog(logger, "run: the run failed before completing", {
			runId,
			error: streamError
		});
		try {
			await durability.append([syntheticRunError(recorded)]);
		} catch (appendError) {
			const phase = "appending the synthesized RUN_ERROR failed";
			safeLog(logger, `run: ${phase}`, {
				runId,
				error: appendError
			});
			recorded = withSecondaryFailure(recorded, appendError, phase);
		}
		return finish(ctx, "failed", recorded);
	}
	if (signal?.aborted) return finish(ctx, "aborted");
	return finish(ctx, "completed");
}
/**
* Thin orchestration helper over {@link RunDeps}: fire-and-track a run via
* {@link pipeToRunLog}, tail one run by id, and `drain()` all in-flight runs
* (e.g. inside a `ctx.waitUntil`). Holds no run state of its own beyond the set
* of currently in-flight `done` promises.
*
* Safe for concurrent runs. {@link RunDeps.durability} is a per-run factory, so
* each run appends to its own log and no run's `close()` terminalizes another's.
* The identity trap this class used to document — `start({ runId })` writing the
* lifecycle record under one id and the events under another, silently and at
* concurrency 1 — is unrepresentable now that the log is resolved FROM the
* `runId`. Every method is keyed by run accordingly: `attach(runId, …)` and
* `status(runId)` no longer disagree about whether the surface is per-run.
*/
var RunController = class {
	deps;
	inFlight = /* @__PURE__ */ new Set();
	constructor(deps) {
		this.deps = deps;
	}
	/**
	* Kick off `pipeToRunLog` without awaiting it and return the `runId`
	* immediately plus a `done` promise the orchestrator may await or detach.
	*/
	start(input) {
		const done = pipeToRunLog(input.stream, {
			...this.deps,
			runId: input.runId,
			threadId: input.threadId,
			...input.signal !== void 0 ? { signal: input.signal } : {}
		});
		this.inFlight.add(done);
		const forget = () => void this.inFlight.delete(done);
		done.then(forget, forget);
		return {
			runId: input.runId,
			done
		};
	}
	/**
	* Resumable client tail for ONE run — replay from `fromOffset`, then
	* live-tail. Takes `runId` because the log it reads is per-run; the old
	* `attach(fromOffset)` signature advertised a multi-run surface the type could
	* not deliver.
	*/
	attach(runId, fromOffset, signal) {
		return this.deps.durability(runId).read(fromOffset, signal);
	}
	/** Current run record, or null when the run is unknown. */
	status(runId) {
		return this.deps.runs.get(runId);
	}
	/**
	* Await every currently in-flight run's `done` promise.
	*
	* Uses `allSettled` rather than `all` because this is typically awaited
	* inside a `ctx.waitUntil`: `all` would reject on the first failure, abandon
	* the wait on every other run, and surface that rejection to the platform.
	* Draining is about keeping the isolate alive until the runs settle; each
	* run's own outcome is already recorded in its record and log.
	*/
	async drain() {
		await Promise.allSettled([...this.inFlight]);
	}
};
//#endregion
export { RunController, pipeToRunLog };

//# sourceMappingURL=run.js.map