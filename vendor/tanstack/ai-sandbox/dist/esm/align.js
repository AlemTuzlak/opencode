import { chunkFingerprint, chunkFingerprintIgnoringThreadId, chunkThreadId } from "./chunk-identity.js";
import { EventType } from "@tanstack/ai";
//#region src/align.ts
/**
* Replay-from-zero with log alignment: the mechanism that makes a resumed
* journal read idempotent.
*
* A host translates journal bytes 0..1000 and appends the resulting chunks, then
* dies. A successor re-reads the journal **from byte 0** and re-translates it,
* producing the same chunks again. This transform reads what is already in the
* event log, verifies that the replay reproduces it, suppresses that prefix, and
* passes only the remainder downstream to be appended.
*
* Why this shape rather than the offset-upsert the design sketched:
*
* - `StreamDurability.append` does not accept caller-supplied offsets, and
*   `UpsertableStreamDurability.upsert` is deliberately **not** used here:
*   `memoryStream.upsert` rejects any offset it did not mint itself, and
*   `durableStream` has no `upsert` at all (its offsets embed a
*   backend-assigned cursor). The journal path therefore only ever *appends*,
*   and this function's whole job is deciding where that append starts. Do not
*   "simplify" it into an `upsert` — the recommended production adapter cannot
*   accept one.
* - Even if it could, re-translation is only reproducible because
*   `createRunScopedIdGen` makes it so. The dedupe boundary therefore has to be
*   *derived from the log*, not tracked beside it — which also means there is no
*   window in which a checkpoint and the log can disagree, because the log is
*   the checkpoint.
* - The log stays append-only with strictly increasing offsets. That is what
*   `durableStream`'s backend enforces and what the client's offset de-dup
*   (`ai-client`'s `seen` set) relies on — the client is NOT tolerant of a
*   duplicated text or tool-argument delta.
*
* Divergence is a bug, not a condition to recover from, so it throws.
*/
/**
* Default bound on consecutive stored chunks alignment will skip as out-of-band.
*
* A bound is what keeps this a tolerance rather than a search. Unbounded, a
* genuine determinism regression would make alignment scan forward through the
* whole log looking for a fingerprint that happens to match, suppress
* everything it passed, and deliver a stream whose prefix and suffix disagree —
* the exact failure {@link JournalReplayDivergedError} exists to prevent. 64 is
* well above any realistic burst of bridged console events between two
* translated chunks and well below a log length where a false match becomes
* plausible.
*/
var DEFAULT_MAX_OUT_OF_BAND_SKIP = 64;
/**
* The out-of-band predicate for the harness adapters.
*
* `ai-codex` and `ai-claude-code` splice `createBridgeEventChannel`'s stream
* into their translated output with `mergeChunkStreams`. That channel is the
* only producer on the path and it emits exclusively `EventType.CUSTOM` chunks
* (`bridge-events.ts:53-63`), fired by LIVE bridged-tool execution. A replay
* runs no tools, so those chunks exist in the log and not in the replay.
*
* Structural rather than a list of event names on purpose: a new bridged tool
* inventing a new `name` must not silently reintroduce the divergence.
*/
function isBridgeCustomChunk(chunk) {
	return chunk.type === EventType.CUSTOM;
}
/**
* The replay produced a different chunk than the log already holds at that
* index. Means translation stopped being deterministic — a `genId` that is not
* run-scoped, a translator that consults the clock, or a journal that was
* rewritten. Fail loud: suppressing the mismatch would deliver a stream whose
* prefix and suffix disagree about message identity.
*/
var JournalReplayDivergedError = class extends Error {
	index;
	stored;
	replayed;
	constructor(index, stored, replayed) {
		super(`journal replay diverged at index ${index}: stored ${stored} but replayed ${replayed}`);
		this.index = index;
		this.stored = stored;
		this.replayed = replayed;
		this.name = "JournalReplayDivergedError";
	}
};
/**
* The replay reproduced the stored chunk EXACTLY except for its `threadId`.
*
* A distinct diagnosis because the cause and the fix are entirely different from
* a real divergence. The adapters resolve `threadId` as
* `options.threadId ?? this.generateId()`, and that id lands in every emitted
* chunk — so an attach route that drives a run without passing the run record's
* `threadId` mints a fresh one, and the very first chunk (`RUN_STARTED`) fails
* alignment. The agent behaved identically; only the id moved. Reported as a
* generic divergence, that sends the reader hunting for non-determinism in the
* translator, which is the wrong place entirely.
*
* A SUBCLASS of {@link JournalReplayDivergedError}, deliberately: this is still a
* divergence and still fatal, so a consumer already branching on the general
* class keeps working. The two are not collapsed — a genuine content divergence
* throws the base class, so `instanceof JournalReplayThreadIdMismatchError`
* separates a config mistake from a determinism bug in exactly one check.
*/
var JournalReplayThreadIdMismatchError = class extends JournalReplayDivergedError {
	storedThreadId;
	replayedThreadId;
	constructor(index, stored, replayed, storedThreadId, replayedThreadId) {
		super(index, stored, replayed);
		this.storedThreadId = storedThreadId;
		this.replayedThreadId = replayedThreadId;
		this.name = "JournalReplayThreadIdMismatchError";
		this.message = `journal replay diverged at index ${index} ONLY by threadId: stored ${JSON.stringify(storedThreadId)} but replayed ${JSON.stringify(replayedThreadId)}. Every other field of the chunk is identical, so the agent did NOT behave differently — the attaching run generated a new threadId instead of reusing the run record's. Pass the run record's threadId (RunRecord.threadId, which sandboxRunDriver hands to drive({ runId, threadId, signal })) into chat() on the attach route; without it the adapter falls back to generateId() and every chunk carries an id the stored log cannot match.`;
	}
};
/**
* Classify a mismatch before throwing.
*
* The `threadId`-only case is recognized by comparing the two chunks a SECOND
* time with `threadId` excluded: equal there and unequal under the real
* fingerprint means `threadId` is the only field that moved. Cheap, because it
* runs only on the failure path, and precise, because it is derived from the same
* fingerprint function rather than a hand-written field diff.
*/
function divergenceError(index, storedChunk, replayedChunk, stored, replayed) {
	const storedThreadId = chunkThreadId(storedChunk);
	const replayedThreadId = chunkThreadId(replayedChunk);
	if (storedThreadId !== replayedThreadId && chunkFingerprintIgnoringThreadId(storedChunk) === chunkFingerprintIgnoringThreadId(replayedChunk)) return new JournalReplayThreadIdMismatchError(index, stored, replayed, storedThreadId, replayedThreadId);
	return new JournalReplayDivergedError(index, stored, replayed);
}
/**
* Suppress the chunks already present in the event log and yield the rest.
*
* The stored prefix is read exactly once, eagerly, before the first replay
* chunk is pulled. Both halves of that matter:
*
* - **Exactly once**, because a second read mid-stream would race the appends
*   the caller is making downstream of this transform and could classify a
*   chunk this very run just appended as an already-stored one, dropping it.
* - **Via `snapshot()`, never `read()`**. `read` *tails*: it returns only when
*   the log is terminalized with `close()` or the caller aborts. A takeover's
*   log is open by definition — the host that would have closed it is the host
*   that died — so `for await (… of read('-1'))` would never finish, and on an
*   empty log `memoryStream` rejects a from-start join outright once its
*   first-chunk deadline elapses. `snapshot()` is the bounded read: it resolves
*   with what is stored right now, including while the log is still open, and
*   resolves to `[]` for a run with nothing stored.
*/
async function* alignToStoredLog(chunks, options) {
	const entries = await options.durability.snapshot();
	const stored = entries.map((entry) => chunkFingerprint(entry.chunk));
	const isOutOfBand = options.isOutOfBand;
	const maxSkip = options.maxOutOfBandSkip ?? 64;
	let cursor = 0;
	let suppressed = 0;
	let skipped = 0;
	let forwarded = 0;
	for await (const chunk of chunks) {
		if (cursor >= stored.length) {
			forwarded += 1;
			yield chunk;
			continue;
		}
		const actual = chunkFingerprint(chunk);
		let consecutiveSkips = 0;
		for (;;) {
			const entry = entries[cursor];
			const expected = stored[cursor];
			if (entry === void 0 || expected === void 0) {
				forwarded += 1;
				yield chunk;
				break;
			}
			if (expected === actual) {
				cursor += 1;
				suppressed += 1;
				break;
			}
			if (isOutOfBand === void 0 || !isOutOfBand(entry.chunk)) throw divergenceError(cursor, entry.chunk, chunk, expected, actual);
			if (consecutiveSkips >= maxSkip) throw divergenceError(cursor, entry.chunk, chunk, expected, actual);
			cursor += 1;
			consecutiveSkips += 1;
			skipped += 1;
		}
	}
	while (cursor < stored.length) {
		const entry = entries[cursor];
		if (entry === void 0 || isOutOfBand === void 0 || !isOutOfBand(entry.chunk)) throw new Error(`journal replay is shorter than the stored log: ${stored.length - cursor} stored chunk(s) from index ${cursor} were not reproduced`);
		cursor += 1;
		skipped += 1;
	}
	options.logger?.provider(`journal alignment: suppressed ${suppressed} stored chunk(s), skipped ${skipped} out-of-band, forwarded ${forwarded}`, {
		suppressed,
		skipped,
		forwarded
	});
}
//#endregion
export { DEFAULT_MAX_OUT_OF_BAND_SKIP, JournalReplayDivergedError, JournalReplayThreadIdMismatchError, alignToStoredLog, isBridgeCustomChunk };

//# sourceMappingURL=align.js.map