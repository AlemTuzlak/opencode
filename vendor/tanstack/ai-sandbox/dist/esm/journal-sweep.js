import { decodeJournalRunId, journalCleanupCommand, journalListCommand, journalMtimeListCommand, journalPaths, parseJournalMtimeListing } from "./journal.js";
import { isTerminalRunStatus } from "@tanstack/ai";
//#region src/journal-sweep.ts
/**
* Bound the journal directory: delete the journals nobody will ever read again,
* and — far more importantly — refuse to delete anything else.
*
* `journalCleanupCommand` already deletes ONE run's journal at the moment its
* `{"__exit":N}` sentinel is observed. That covers every run a host watched to
* completion and covers nothing else: a run that reaches its sentinel while
* DETACHED has no host reading its journal, so nothing observes the sentinel and
* nothing calls the cleanup. Those journals accumulate in
* {@link DEFAULT_JOURNAL_DIR} until the sandbox dies, which on a `keepAlive`
* sandbox may be never. This module is the sweep that bounds them, driven from a
* cron or a reaper rather than from a run.
*
* **Why deleting is dangerous, and therefore why almost every branch keeps.**
* The journal is the ONLY copy of the bytes a successor host needs to replay a
* run a dead host abandoned mid-flight. Delete a live run's journal and that run
* becomes unresumable — silently, because the reader will simply deliver nothing.
* There is no undo and no second copy. So the decision procedure here is not
* "delete unless I have a reason to keep"; it is the opposite, and every arm that
* is not a PROVEN-safe deletion keeps:
*
* | the store says…                    | action | why |
* | ---------------------------------- | ------ | --- |
* | terminal (`isTerminalRunStatus`)   | DELETE | the delivery log, not the journal, is the record |
* | non-terminal, INCLUDING `'interrupted'` | KEEP | an interrupt-resume continues from it |
* | nothing (unknown runId)            | KEEP until `orphanTtlMs` | the reader creates the journal BEFORE the record exists |
* | the lookup threw                   | KEEP | never delete on an unanswered question |
* | (the name did not decode)          | KEEP | a truncated name decodes to a plausible WRONG runId |
* | (no mtime listing)                 | KEEP every age-gated entry | cannot age-gate ⇒ cannot expire |
*
* Deleting a TERMINAL run's journal is safe because a late takeover of a terminal
* run aligns against the delivery LOG, not the journal: `align.ts`'s
* `alignToStoredLog` takes a `StreamDurability` plus an
* `AsyncIterable<StreamChunk>`, has no `SandboxHandle` and no `JournalPaths` in
* its signature, and reads the already-delivered prefix with
* `durability.snapshot()`. It *cannot* read a journal, so removing one cannot
* break it. A non-zero exit is terminal too — `{"__exit":7}` is as final as
* `{"__exit":0}`.
*
* The unknown-runId arm is the subtle one, and it is why an age gate exists at
* all. `journalFollowCommand` opens the journal with `: >> file`, which CREATES
* it; the reader and the run record are written by two independent code paths and
* nothing orders them. So "a journal exists whose runId the store has never heard
* of" is the NORMAL state of a run that started moments ago, not an anomaly.
* Treating unknown as deletable would race every single run start. The journal is
* therefore kept until it has been untouched for `orphanTtlMs`, which is the only
* evidence available that no one is writing to it.
*
* **The fail-closed trap this module exists to not fall into.** BusyBox `find`
* prints its "unrecognized option" diagnostic to *stderr* and exits **1 with
* empty stdout**. A capability probe that ignores the exit code reads that as "no
* files matched", i.e. "no file is newer than the cutoff" — and code that then
* concludes "therefore every file is old" **deletes the entire directory**, live
* runs included. {@link parseJournalMtimeListing} is built to make that
* impossible: it passes the directory as `stat`'s own first operand as a
* self-witness and returns `{ kind: 'unavailable' }` when that witness line is
* absent, never `[]`. This module's whole obligation on that front is to honor
* `unavailable` as "I cannot age-gate, so I keep" rather than as an empty
* listing. See the `age-gate-unavailable` reason.
*
* **Shell only, never `handle.fs.*`.** On local-process, `fs.*` resolves `/tmp`
* under the sandbox root while a shell redirect hits the real host `/tmp`, so an
* `fs.remove` would delete a DIFFERENT path than the one `journaledCommand`
* wrote — silently doing nothing while reporting success. Every filesystem touch
* here goes through `handle.process.exec` with a command composed in
* `journal.ts`.
*/
/**
* How long a journal whose runId the store does not know must go untouched
* before the sweep will delete it.
*
* One hour, chosen against what the window actually protects: the gap between a
* reader creating the journal with `: >> file` and the run record appearing in
* the store. That gap is milliseconds in the normal case and seconds in the worst
* case (a slow store, a retried write). An hour is three orders of magnitude of
* headroom on the race, while still bounding a leaked journal to something a
* sandbox's disk survives. Erring long is the cheap direction: the cost of too
* long is bytes, the cost of too short is a destroyed live run.
*/
var DEFAULT_ORPHAN_TTL_MS = 36e5;
/**
* Ceiling on deletions per sweep. A cron-driven sweep runs unattended, so a
* mistake — a store that answers `terminal` for everything, a misconfigured
* directory — is bounded by this rather than by how many journals happen to
* exist. The remainder is reported as kept with reason `max-deletes` and picked
* up by the next sweep.
*/
var DEFAULT_MAX_DELETES = 200;
function errorMessage(error) {
	return error instanceof Error ? error.message : String(error);
}
/**
* Group listed filenames by the runId they decode to, so a journal and its
* `.err` sidecar are ONE decision and ONE `rm`, not two.
*
* De-duplication is not a tidiness measure: `journalCleanupCommand` deletes both
* paths for a runId at once, so iterating raw names would ask the store twice per
* run and then issue a second `rm` for files the first one already removed —
* doubling the store load and reporting one run as two deletions.
*/
function groupByRunId(names) {
	const byRunId = /* @__PURE__ */ new Map();
	const undecodable = [];
	for (const name of names) {
		const decoded = decodeJournalRunId(name);
		if (decoded.kind !== "runId") {
			undecodable.push(name);
			continue;
		}
		const existing = byRunId.get(decoded.runId);
		if (existing === void 0) byRunId.set(decoded.runId, [name]);
		else existing.push(name);
	}
	return {
		byRunId,
		undecodable
	};
}
/**
* Sweep the journal directory, deleting only journals whose runs the store
* reports terminal (plus orphans that have been untouched past `orphanTtlMs`).
*
* **Never rejects.** This runs unattended from a cron, where a rejected promise
* is an unhandled rejection and, worse, hides which journals were and were not
* swept. Every failure — a listing that errored, a store that threw, an `rm` that
* exited non-zero — is folded into
* {@link PruneJournalsResult.failures} and the sweep continues with the entries
* it can still decide about.
*/
async function pruneJournals(options) {
	const dir = options.dir ?? "/tmp/tanstack-runs";
	const now = options.now ?? Date.now();
	const orphanTtlMs = options.orphanTtlMs ?? 36e5;
	const maxDeletes = options.maxDeletes ?? 200;
	const logger = options.logger;
	const deleted = [];
	const kept = [];
	const failures = [];
	let names = [];
	try {
		names = (await options.handle.process.exec(journalListCommand(dir))).stdout.split("\n").map((line) => line.trim()).filter((line) => line !== "");
	} catch (error) {
		failures.push({
			stage: "list",
			message: errorMessage(error)
		});
		logger?.warn("journal sweep: listing the journal directory failed", {
			dir,
			error
		});
		return {
			listed: 0,
			runIds: 0,
			deleted,
			kept,
			ageGate: "unavailable",
			failures
		};
	}
	let ageGate = "unavailable";
	const mtimes = /* @__PURE__ */ new Map();
	try {
		const probe = await options.handle.process.exec(journalMtimeListCommand(dir));
		const parsed = parseJournalMtimeListing(probe.stdout, dir);
		if (parsed.kind === "listed") {
			ageGate = "listed";
			for (const entry of parsed.entries) mtimes.set(entry.name, entry.mtimeMs);
		} else logger?.warn("journal sweep: mtime listing unavailable; keeping every orphan", { dir });
	} catch (error) {
		failures.push({
			stage: "mtime-list",
			message: errorMessage(error)
		});
		logger?.warn("journal sweep: mtime listing failed; keeping every orphan", {
			dir,
			error
		});
	}
	const { byRunId, undecodable } = groupByRunId(names);
	for (const name of undecodable) kept.push({
		names: [name],
		reason: "undecodable-name"
	});
	const orphanCutoff = now - orphanTtlMs;
	for (const [runId, runNames] of byRunId) {
		if (deleted.length >= maxDeletes) {
			kept.push({
				runId,
				names: runNames,
				reason: "max-deletes"
			});
			continue;
		}
		let record;
		try {
			record = await options.runs.get(runId);
		} catch (error) {
			failures.push({
				stage: "store",
				runId,
				message: errorMessage(error)
			});
			logger?.warn("journal sweep: run lookup failed; keeping the journal", {
				runId,
				error
			});
			kept.push({
				runId,
				names: runNames,
				reason: "store-error"
			});
			continue;
		}
		if (record === null) {
			if (ageGate === "unavailable") {
				kept.push({
					runId,
					names: runNames,
					reason: "age-gate-unavailable"
				});
				continue;
			}
			const observed = runNames.map((name) => mtimes.get(name));
			if (observed.some((mtimeMs) => mtimeMs === void 0)) {
				kept.push({
					runId,
					names: runNames,
					reason: "age-gate-missing-entry"
				});
				continue;
			}
			if (Math.max(...observed.filter(isDefined)) > orphanCutoff) {
				kept.push({
					runId,
					names: runNames,
					reason: "orphan-too-recent"
				});
				continue;
			}
		} else if (!isTerminalRunStatus(record.status)) {
			kept.push({
				runId,
				names: runNames,
				reason: "non-terminal"
			});
			continue;
		}
		const command = journalCleanupCommand(journalPaths(runId, dir));
		try {
			const result = await options.handle.process.exec(command);
			if (result.exitCode !== 0) {
				failures.push({
					stage: "delete",
					runId,
					message: `rm exited ${result.exitCode}`
				});
				kept.push({
					runId,
					names: runNames,
					reason: "delete-failed"
				});
				continue;
			}
		} catch (error) {
			failures.push({
				stage: "delete",
				runId,
				message: errorMessage(error)
			});
			logger?.warn("journal sweep: deleting a journal failed", {
				runId,
				error
			});
			kept.push({
				runId,
				names: runNames,
				reason: "delete-failed"
			});
			continue;
		}
		deleted.push(runId);
	}
	logger?.sandbox("journal sweep complete", {
		dir,
		listed: names.length,
		runIds: byRunId.size,
		deleted: deleted.length,
		kept: kept.length,
		ageGate
	});
	return {
		listed: names.length,
		runIds: byRunId.size,
		deleted,
		kept,
		ageGate,
		failures
	};
}
/** Narrowing predicate: `Array<number | undefined>` → `Array<number>`. */
function isDefined(value) {
	return value !== void 0;
}
//#endregion
export { DEFAULT_MAX_DELETES, DEFAULT_ORPHAN_TTL_MS, pruneJournals };

//# sourceMappingURL=journal-sweep.js.map