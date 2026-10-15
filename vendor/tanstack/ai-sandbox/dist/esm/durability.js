import "./journal.js";
import { alignToStoredLog, isBridgeCustomChunk } from "./align.js";
import { createCapability } from "@tanstack/ai";
//#region src/durability.ts
/**
* The durability seam for a sandboxed run: the option shape `withSandbox` takes,
* the capability harness adapters read, and the two guards that keep a
* "durable" run actually recoverable.
*
* A run is durable only when BOTH a `RunStore` and a `StreamDurability` are
* wired, because either alone is useless: a record with no event log cannot be
* replayed, and a log with no record cannot be found, claimed, or reaped. So the
* capability exists or it does not — there is no half-configured state, and
* every existing app (which wires neither) keeps today's behavior untouched.
*/
/**
* Provided by `withSandbox` only when a run is genuinely durable (both stores
* wired). Harness adapters read it with `getOptional` and treat its absence as
* "no journaling contract to honour", which is exactly today's behavior.
*/
var SandboxDurabilityCapability = createCapability()("sandbox-durability");
/** Destructured accessors, matching `./capabilities`. */
var [getSandboxDurability, provideSandboxDurability] = SandboxDurabilityCapability;
/**
* A durable run was started without a caller-supplied `runId`.
*
* Thrown rather than defaulted because the failure is otherwise INVISIBLE: an
* adapter-generated id (`${name}-${Date.now()}-${Math.random()...}`) produces a
* journal path at `/tmp/tanstack-runs/<id>.ndjson` that no successor host can
* recompute, so the run streams normally, records normally, and is silently
* unrecoverable. A loud failure at the start of `chatStream` is strictly better
* than a run that only reveals itself as non-durable during an incident.
*/
var DurableRunIdRequiredError = class extends Error {
	adapter;
	constructor(adapter) {
		super(`${adapter}: a durable sandboxed run requires a caller-supplied \`runId\`. The journal path and the deterministic message-id generator are both derived from it, so a successor host can only resume a run whose \`runId\` it can recompute. Pass \`runId\` to chat({ ... }), or drop \`runs\`/\`durability\` from withSandbox(...) to run non-durably.`);
		this.adapter = adapter;
		this.name = "DurableRunIdRequiredError";
	}
};
/**
* Resolve the `runId` a harness adapter will journal under.
*
* Replaces the bare `options.runId ?? this.generateId()` in every harness
* adapter. The fallback is preserved for non-durable runs — several `chat()`
* paths pass `runId` as a conditional spread, so `undefined` is reachable and
* removing the fallback would break them for no benefit.
*
* The `durable` check runs BEFORE `fallback()`, and that ordering is load
* bearing: a generated id must never be minted for a durable run, not even one
* that is discarded, because the whole point is that no such id can exist.
*/
function resolveDurableRunId(runId, options) {
	if (runId !== void 0 && runId.length > 0) return runId;
	if (options.durable) throw new DurableRunIdRequiredError(options.adapter);
	return options.fallback();
}
/**
* An ATTACHING durable run was driven without the run record's `threadId`.
*
* The sibling of {@link DurableRunIdRequiredError}, for the other id an attach
* cannot mint for itself. `threadId` lands in EVERY chunk a harness adapter
* emits (see each package's `stream/translate.ts`), so a replay that generates a
* fresh one produces a stream that differs from the stored log in its very first
* chunk. `alignToStoredLog` then fails at index 0 with a
* `JournalReplayThreadIdMismatchError` — mid-stream, after the takeover has
* already claimed the run. Refusing up front is strictly better, and mirrors
* what `resolveDurableRunId` does for an id whose absence is equally fatal.
*
* Core already does its part: `startRunDriver` reads the record and hands
* `active.threadId` to `drive({ runId, threadId, signal })`. This error exists
* for the one gap it cannot close — application `drive` code that forgets to
* forward it into `chat()`.
*/
var DurableThreadIdRequiredError = class extends Error {
	adapter;
	constructor(adapter) {
		super(`${adapter}: an ATTACHING durable sandboxed run requires the run record's \`threadId\`. Every emitted chunk carries \`threadId\`, so an attach that generates a fresh one replays a stream whose first chunk already differs from the stored log, and alignment fails at index 0 (\`JournalReplayThreadIdMismatchError\`) even though the agent behaved identically. Forward the run record's \`threadId\` — the one \`sandboxRunDriver\` passes to \`drive({ runId, threadId, signal })\` — into \`chat({ ... })\` on the attach route. A durable FRESH run needs none: that run is what establishes the \`threadId\`.`);
		this.adapter = adapter;
		this.name = "DurableThreadIdRequiredError";
	}
};
/**
* Resolve the `threadId` a harness adapter will stamp on every chunk.
*
* Replaces the bare `options.threadId ?? this.generateId()` in the journaling
* harness adapters. Only the durable-AND-attaching quadrant throws; the other
* three keep the generated fallback and are byte-identical to before:
*
* | durable | attaching | behavior                                            |
* | ------- | --------- | --------------------------------------------------- |
* | no      | no        | fallback — a plain non-durable run                  |
* | no      | yes       | fallback — not reachable today, and harmless anyway |
* | yes     | no        | fallback — the FRESH run that ESTABLISHES the id    |
* | yes     | yes       | throw {@link DurableThreadIdRequiredError}          |
*
* The durable-fresh row is the load-bearing one. A fresh durable run legitimately
* mints its `threadId` (there is no record to reuse one from), so throwing on
* `durable` alone — the obvious over-simplification — would break every durable
* run that has ever worked. Only re-entering an existing run has an id it MUST
* reuse, which is exactly the condition `attach` already expresses.
*
* As in `resolveDurableRunId`, the guard runs BEFORE `fallback()`: a generated id
* must never be minted on this path, not even one that is then discarded.
*/
function resolveDurableThreadId(threadId, options) {
	if (threadId !== void 0 && threadId.length > 0) return threadId;
	if (options.durable && options.attaching) throw new DurableThreadIdRequiredError(options.adapter);
	return options.fallback();
}
/**
* An ATTACH was driven into a code path that can never replay a run.
*
* The third sibling of {@link DurableRunIdRequiredError} and
* {@link DurableThreadIdRequiredError}, and the one that is not about a missing
* id: here every id is present and the path itself is the problem.
*
* `sandboxRunDriver`'s `drive()` re-invokes `chat()` with `attach: true`. On a
* JOURNALING path that is genuinely a replay — `spawnNdjson` tails the journal
* the previous host wrote, `awaitAttachableJournal` refuses a hopeless attach up
* front, and `alignedIfAttaching` suppresses the prefix already delivered. A
* protocol path with none of those three has no journal to tail and nothing to
* align against, so `attach: true` does not resume anything: it starts the agent
* over from scratch against the workspace the first attempt already mutated, and
* appends its entire output to a log that still holds the first attempt's.
*
* Deliberately NOT a `JournalAttachUnavailableError`. That error means "a
* journal that should exist has not appeared yet" — retryable, scoped to a wait
* (`attachWaitMs`). This condition is categorically different: the path cannot
* attach AT ALL, so telling a caller to wait would point it at something that is
* never coming. A 5xx/501-shaped refusal, not a 504.
*
* `reason` names the missing capability in the adapter's own vocabulary (which
* protocol, which spawn path), because the fix is always to change how the run
* is spawned or routed, never to retry.
*/
var DurableAttachNotSupportedError = class extends Error {
	adapter;
	reason;
	constructor(adapter, reason) {
		super(`${adapter}: this code path cannot ATTACH to an existing durable run (${reason}). It does not journal, so there is no stored output to replay and no alignment to suppress what was already delivered. Proceeding would re-run the agent from scratch against the workspace the previous attempt already modified, and double-append its entire output to the run log. Route the attach through a journaling spawn path, or drop \`runs\`/\`durability\` from withSandbox(...) so the run is never resumed in the first place. This is not a transient condition — unlike \`JournalAttachUnavailableError\`, waiting and retrying can never make it succeed.`);
		this.adapter = adapter;
		this.reason = reason;
		this.name = "DurableAttachNotSupportedError";
	}
};
/**
* Resolve `withSandbox`'s two durability options into the capability payload, or
* `undefined` when the app has not opted in.
*
* BOTH `runs` and `durability` are required. A half-configured app gets
* `undefined` **silently** rather than a warning: it has not asked for
* durability, so there is nothing to warn about, and the resulting behavior
* (destroy on disconnect, no journal) is exactly today's.
*/
function resolveSandboxDurability(options) {
	const runs = options?.runs;
	const durability = options?.durability;
	if (runs === void 0 || durability === void 0) return void 0;
	return {
		runs,
		adapter: durability.adapter,
		journalDir: durability.journal ?? "/tmp/tanstack-runs",
		attach: durability.attach === true,
		detachOnDisconnect: durability.detachOnDisconnect !== false,
		...durability.pollIntervalMs === void 0 ? {} : { pollIntervalMs: durability.pollIntervalMs },
		...durability.attachWaitMs === void 0 ? {} : { attachWaitMs: durability.attachWaitMs }
	};
}
/**
* Build the `spawnNdjson` journal option for a run, or `undefined` when the run
* is not durable — in which case `spawnNdjson` takes its original, unjournaled
* path (`isJournaled` tests `options.journal !== undefined`, `runner.ts:70-72`)
* and behavior is byte-identical to a pre-durability run.
*
* `JournalOptions.dir` is optional, but this always supplies it: the resolved
* durability has already defaulted `journalDir`, and a successor host must
* recompute the same path rather than re-derive the default independently.
*
* `runs` and `attachWaitMs` are carried ONLY when attaching, and that is not a
* micro-optimization: they exist for `awaitAttachableJournal`, which the reader
* runs on the attach path alone. A fresh run has no journal yet BY DESIGN (its own
* `journaledCommand` spawn creates it moments later), so handing it a run store
* would only invite a future change to gate a path where absence proves nothing.
*/
function journalOptionsFor(durability, runId) {
	if (durability === void 0) return void 0;
	return {
		runId,
		dir: durability.journalDir,
		attach: durability.attach,
		...durability.pollIntervalMs === void 0 ? {} : { pollIntervalMs: durability.pollIntervalMs },
		...durability.attach ? {
			runs: durability.runs,
			...durability.attachWaitMs === void 0 ? {} : { attachWaitMs: durability.attachWaitMs }
		} : {}
	};
}
/**
* Align a harness stream against the run's stored log — but ONLY on an attach.
*
* The `attach` guard is not an optimization, it is a CORRECTNESS requirement.
* `alignToStoredLog` snapshots the log before the first chunk is pulled and
* treats everything in that snapshot as "already delivered". On a FRESH run that
* premise is false: if such a run were aligned against a log that already holds
* entries — a `runId` collision, a retried request — its own chunks would be
* matched against those entries and silently SUPPRESSED instead of delivered,
* which is silent data loss rather than a slow path. Aligning only when
* re-entering an existing run keeps the transform's premise ("this stream is a
* replay of what is already stored") actually true.
*
* `isBridgeCustomChunk` is passed because the stored log holds the previous
* host's MERGED output, including live bridged-tool CUSTOM events that a replay
* cannot reproduce; without it a bridged-tool run could not be taken over at
* all. Wrap the merge RESULT, never the pre-merge translator, or the comparison
* is against a stream the log never contained.
*/
function alignedIfAttaching(chunks, durability, logger) {
	if (durability === void 0 || !durability.attach) return chunks;
	return alignToStoredLog(chunks, {
		durability: durability.adapter,
		isOutOfBand: isBridgeCustomChunk,
		...logger === void 0 ? {} : { logger }
	});
}
//#endregion
export { DurableAttachNotSupportedError, DurableRunIdRequiredError, DurableThreadIdRequiredError, SandboxDurabilityCapability, alignedIfAttaching, getSandboxDurability, journalOptionsFor, provideSandboxDurability, resolveDurableRunId, resolveDurableThreadId, resolveSandboxDurability };

//# sourceMappingURL=durability.js.map