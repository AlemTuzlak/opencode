import { journalCleanupCommand, journalPaths, journalStderrReadCommand, journaledCommand, parseExitSentinel } from "./journal.js";
import { awaitAttachableJournal } from "./attach-preflight.js";
import { decodeBase64Stream } from "./journal-bytes.js";
import { readJournal } from "./journal-reader.js";
//#region src/runner.ts
/**
* The reusable "run an agent CLI inside a sandbox and stream its events out"
* primitive. Harness adapters (claude-code, codex, …) spawn their CLI via the
* uniform {@link SandboxHandle} and consume newline-delimited JSON from stdout,
* which they then translate into AG-UI StreamChunks.
*
* This is intentionally transport-minimal: a stdout NDJSON pipe. Multi-client
* reconnect / replay belongs to the persistence/EventLog layer, not here.
*
* The `journal` option adds a second, opt-in transport: instead of holding the
* agent's stdout pipe directly, the host redirects it into an append-only file
* inside the sandbox and tails that file. See `journal.ts` for why (host death
* cannot SIGPIPE the agent, and a later host can resume the same file from byte
* 0). `spawnNdjson`'s signature and unjournaled behavior are unchanged; every
* existing caller keeps working exactly as before.
*/
function isJournaled(options) {
	return options.journal !== void 0;
}
function resolvePaths(options) {
	return journalPaths(options.journal.runId, options.journal.dir);
}
/**
* Strip the runner-only options, leaving what `handle.process.spawn` accepts.
*
* `signal` is deliberately KEPT: on the UNJOURNALED path the host holds the
* agent's stdout pipe, so a client disconnect should take the process down with
* it. The journaled path must not forward it — see
* {@link toJournaledSpawnOptions}.
*/
function toProcessOptions(options) {
	const { onNonJsonLine, input, journal, ...rest } = options;
	return rest;
}
/**
* The journaled agent's spawn options: {@link toProcessOptions} MINUS `signal`.
*
* The request's signal must never reach the agent process on this path. Providers
* DO act on it at spawn time — local-process registers it to `killTree` the
* process group, and daytona and docker honor it too — so forwarding it means a
* client disconnect kills the journaled agent. The agent then writes no exit
* sentinel, and a successor host takes over a run that is already dead: the exact
* opposite of the guarantee documented on {@link startJournaledAgent}, and of the
* reason the journal is a file rather than a pipe.
*
* The signal is still honored for the READ. `readJournalNdjson` forwards it to
* `readJournal` and `awaitAttachableJournal` on its own, so a disconnecting
* client stops tailing immediately. Only the agent spawn outlives the request.
*/
function toJournaledSpawnOptions(options) {
	const { signal, ...rest } = toProcessOptions(options);
	return rest;
}
/** Split a stream of arbitrary string chunks into complete lines. */
async function* toLines(chunks) {
	let buffer = "";
	for await (const chunk of chunks) {
		buffer += chunk;
		let newlineIndex = buffer.indexOf("\n");
		while (newlineIndex !== -1) {
			const line = buffer.slice(0, newlineIndex);
			buffer = buffer.slice(newlineIndex + 1);
			yield line;
			newlineIndex = buffer.indexOf("\n");
		}
	}
	if (buffer.length > 0) yield buffer;
}
/**
* Start the agent with its stdout (and the `{"__exit":N}` sentinel) redirected
* into the journal, then return.
*
* Deliberately does NOT wait for the process and does NOT read its stdout: the
* whole point of journaling is that the host holds no handle on the agent's
* output, so a host that dies mid-run cannot take the agent down with it (no
* pipe to SIGPIPE). The spawned process is left running in the sandbox; the
* sentinel line the wrapper appends on exit is how anyone — this host or a
* successor — learns it finished. Stdin is still written directly to the
* spawned process, exactly as the unjournaled path does, since that transport
* is unaffected by where stdout goes.
*/
async function startJournaledAgent(handle, command, options) {
	const paths = resolvePaths(options);
	const proc = await handle.process.spawn(journaledCommand(command, paths), toJournaledSpawnOptions(options));
	if (options.input !== void 0) {
		await proc.stdin.write(options.input);
		await proc.stdin.end();
	}
}
/** Chars of stderr attached to a non-zero-exit error, on both paths. */
var STDERR_ERROR_CHARS = 1e3;
async function* singleValue(value) {
	yield value;
}
/**
* Read the tail of a run's stderr sidecar, for the error message only.
*
* Returns `''` on ANY failure — a provider whose `exec` rejects, a sidecar that
* no longer exists, a base64 frame the provider truncated. The caller is on its
* way to throwing the real failure (the agent's non-zero exit), and losing a
* diagnostic suffix must never replace that error with a cleanup error. Decoding
* is deliberately lossy: `journalStderrReadCommand` reads the LAST N bytes, so
* byte 0 of the frame can sit mid-character.
*/
async function readStderrTail(handle, paths) {
	try {
		const result = await handle.process.exec(journalStderrReadCommand(paths));
		const decoder = new TextDecoder();
		let text = "";
		for await (const bytes of decodeBase64Stream(singleValue(result.stdout))) text += decoder.decode(bytes, { stream: true });
		text += decoder.decode();
		return text.trim();
	} catch {
		return "";
	}
}
/**
* Delete a terminal run's journal. Best effort by construction: see
* {@link journalCleanupCommand} for why a failure here cannot be allowed to fail
* a run that has already finished.
*/
async function cleanupJournal(handle, paths) {
	try {
		await handle.process.exec(journalCleanupCommand(paths));
	} catch {}
}
/**
* Read a run's journal and yield each line parsed as JSON.
*
* Always reads from byte 0 — the alignment step (a later phase), not this
* reader, decides what a client has already seen. Stops at the `{"__exit":N}`
* sentinel, and throws for a non-zero N so the calling adapter's existing
* `catch` turns it into a `RUN_ERROR`, the same observable outcome the
* unjournaled path produces from a non-zero `wait()`. There is nothing to
* `wait()` on here: the host holds a `tail`, not the agent process, so the
* sentinel line IS the exit code.
*
* The sentinel is also what bounds journal growth: reaching it means the run is
* terminal, and a terminal run's record is the event log, so both journal files
* are deleted before this iterable finishes. The ordering below is load-bearing
* and is asserted, not merely commented:
*
* - The sentinel is captured and the loop is `break`-ed, so the source's
*   `finally` kills the `tail` BEFORE the `rm` runs — the reader is stopped, then
*   its input is deleted, never the other way round.
* - `exitCode` stays `undefined` if the journal stream ends without a sentinel.
*   NOTHING is deleted on that path either way — the run may be mid-flight and a
*   successor host may still need every byte — but the two causes are then
*   separated by `options.signal.aborted`: an aborted consumer returns quietly,
*   while a stream that died on its own (killed `tail`, destroyed sandbox, torn
*   pipe) THROWS. Returning for both is how a truncated read used to reach the
*   client as a normally-completing run.
* - A non-zero sentinel deletes too. The run is terminal either way.
* - The stderr sidecar is read BEFORE the deletion that destroys it, so a
*   non-zero exit carries up to {@link STDERR_ERROR_CHARS} chars of the agent's
*   own diagnostics, exactly as the unjournaled path below does. That closes the
*   "Known regression" this function used to document; the read is bounded and
*   failure-swallowing (see {@link readStderrTail}), so it cannot turn a run
*   failure into a cleanup failure.
*
* On an ATTACH (`journal.attach === true`) the read is preceded by
* {@link awaitAttachableJournal}, which fails fast for a runId the store does not
* know or has already terminalized and otherwise waits a BOUNDED time for a live
* run's journal to appear. Without it, an attach to a runId with no journal
* created an empty one (`journalFollowCommand` does that deliberately) and tailed
* it forever — no sentinel, no error, no timeout.
*
* One case this does NOT bound: a run that reaches its sentinel while DETACHED
* has no host reading it, so nothing observes the sentinel and nothing here
* runs. Sweeping those is `pruneJournals`' job (`journal-sweep.ts`): it consults
* the run store's status for each journal it finds and deletes only the terminal
* ones, from a cron the application schedules rather than from a run.
*/
async function* readJournalNdjson(handle, options) {
	const paths = resolvePaths(options);
	if (options.journal.attach === true) await awaitAttachableJournal(handle, {
		paths,
		runId: options.journal.runId,
		...options.journal.runs === void 0 ? {} : { runs: options.journal.runs },
		...options.journal.attachWaitMs === void 0 ? {} : { waitMs: options.journal.attachWaitMs },
		...options.signal === void 0 ? {} : { signal: options.signal }
	});
	let exitCode;
	for await (const { line } of readJournal(handle, {
		paths,
		fromByte: 0,
		runId: options.journal.runId,
		...options.signal === void 0 ? {} : { signal: options.signal },
		...options.journal.pollIntervalMs === void 0 ? {} : { pollIntervalMs: options.journal.pollIntervalMs },
		...options.journal.attachWaitMs === void 0 ? {} : { firstByteTimeoutMs: options.journal.attachWaitMs }
	})) {
		const trimmed = line.trim();
		if (trimmed === "") continue;
		const sentinel = parseExitSentinel(trimmed, paths);
		if (sentinel !== null) {
			exitCode = sentinel;
			break;
		}
		let parsed;
		try {
			parsed = JSON.parse(trimmed);
		} catch {
			options.onNonJsonLine?.(trimmed);
			continue;
		}
		yield parsed;
	}
	if (exitCode === void 0) {
		if (options.signal?.aborted === true) return;
		throw new Error(`Agent journal stream for run ${options.journal.runId} ended without an exit sentinel (${paths.journal}). The run was NOT observed to finish: the tail was torn down, the sandbox went away, or the agent's shell died before writing its sentinel. Both journal files are left in place for a successor host.`);
	}
	const stderr = exitCode === 0 ? "" : await readStderrTail(handle, paths);
	await cleanupJournal(handle, paths);
	if (exitCode !== 0) throw new Error(`Agent process exited with code ${exitCode}` + (stderr ? `: ${stderr.slice(0, STDERR_ERROR_CHARS)}` : ""));
}
/**
* Spawn `command` in the sandbox and yield each stdout line parsed as JSON.
*
* Without `options.journal`, behavior is byte-identical to before: resolves
* the spawn handle's exit via `wait()` after stdout closes; a non-zero exit
* with no events surfaced is the adapter's concern to detect.
*
* With `options.journal`, the agent's stdout is redirected into an in-sandbox
* journal (unless `journal.attach` is set, meaning a run already in flight)
* and then read back from byte 0 — one code path for a fresh run and an
* attach, both going through {@link readJournalNdjson}.
*/
async function* spawnNdjson(handle, command, options = {}) {
	if (isJournaled(options)) {
		if (options.journal.attach !== true) await startJournaledAgent(handle, command, options);
		yield* readJournalNdjson(handle, options);
		return;
	}
	const { onNonJsonLine, input, ...processOptions } = options;
	const proc = await handle.process.spawn(command, processOptions);
	if (input !== void 0) {
		await proc.stdin.write(input);
		await proc.stdin.end();
	}
	const stderrChunks = [];
	const stderrDrained = (async () => {
		try {
			for await (const chunk of proc.stderr) stderrChunks.push(chunk);
		} catch {}
	})();
	for await (const line of toLines(proc.stdout)) {
		const trimmed = line.trim();
		if (trimmed === "") continue;
		let parsed;
		try {
			parsed = JSON.parse(trimmed);
		} catch {
			onNonJsonLine?.(trimmed);
			continue;
		}
		yield parsed;
	}
	const exitCode = await proc.wait();
	await stderrDrained;
	if (exitCode !== 0) {
		const stderr = stderrChunks.join("").trim();
		throw new Error(`Agent process exited with code ${exitCode}` + (stderr ? `: ${stderr.slice(0, STDERR_ERROR_CHARS)}` : ""));
	}
}
//#endregion
export { readJournalNdjson, spawnNdjson, startJournaledAgent, toLines };

//# sourceMappingURL=runner.js.map