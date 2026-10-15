import { exitSentinelLine, journalExistsCommand, journalPaths, journalReadCommand, journaledCommand } from "../journal.js";
import { journalReadStrategy, readJournal } from "../journal-reader.js";
import { randomUUID } from "node:crypto";
import { describe, expect, it } from "vitest";
//#region src/testkit/journal-conformance.ts
/**
* Provider conformance for the agent output journal.
*
* The journal design rests on two provider-level claims: a command string is
* framed through a POSIX shell (so `>>` redirection works), and `tail -c +N -f`
* is available. Both are asserted here against a real sandbox rather than
* assumed from the audit.
*
* A provider that cannot satisfy them MUST declare `unsupported.reason`. There
* is deliberately no silent-skip path: a conformance case that quietly returns
* prints as a pass, which is how an unimplemented capability ships green. The
* three FOLLOW cases obey the same rule through a second declaration,
* {@link JournalConformanceConfig.followUnsupported} — see {@link itFollows} for
* why the strategy has to be declared rather than detected at registration time,
* and {@link expectDeclaredStrategy} for what keeps the declaration honest.
*
* THE THIRD FOLLOW CASE TESTS THE OTHER SIDE OF THE BOUNDARY, and it is here
* because the first two do not. `killableProcesses` is what selects `'follow'`
* over `'poll'`, and a wrong `true` means `tail -f` is spawned on the assumption
* it can be reclaimed — leaking one follower per run when it cannot. The two
* follow cases only ever asserted that the READER stops, which
* `journal-reader.ts`'s `untilAborted` guarantees on its own by abandoning the
* pipe the moment the signal fires. So both of them pass a provider whose
* `kill()` is `() => Promise.resolve()`, and three of the four `true`
* declarations in this repo were in fact false: Docker's `stream.destroy()` only
* detached the client, local-process's `sh -c` forks so signalling the shell left
* the command alive, and Vercel's `kill()` never called the SDK's real
* `Command.kill` at all. Every one of them shipped green through this suite.
* "kills the sandbox-side process, not just the host's view of it" is the case
* that fails them — see its own comment for how it probes.
*
* Vitest is an OPTIONAL peer dependency: this module is imported only from test
* files, which already run under Vitest.
*/
/**
* Per-case timeout. Every case here spawns a real sandbox and a real agent.
*
* 180s, not the 60s this used to be, and it matches the ceiling
* `takeover-conformance.ts` already gives its heaviest cases. It is the one
* wall-clock number left in the file and it is deliberately far outside the range
* any healthy run needs: a case here makes half a dozen provider round-trips, and
* ONE `docker exec` on a loaded daemon has been measured at 9.6s (see
* `takeover-conformance.ts`'s `countingExec`) and at 20–45s on a saturated one, so
* a 60s budget put the timeout itself in the same load-sensitive class as the
* assertions that were removed from these cases — measured going red on cases that
* pass in 7–13s each on a quiet machine.
*
* This bound exists only so a genuine hang FAILS instead of parking CI; it is not
* an assertion about speed, and nothing here should be tuned to sit near it.
*/
var CASE_TIMEOUT_MS = 18e4;
/**
* Register a case that only means anything on a provider whose reads FOLLOW.
*
* `journalReadStrategy` needs a live handle and a live handle needs the async
* `createHandle`, so the strategy is not knowable when the cases are registered.
* It is therefore DECLARED, and the declaration selects `it` or `it.skip` here.
*
* This exists because the alternative — checking the strategy inside the case and
* returning early — is the silent-skip the module doc forbids. Such a case prints
* `✓` with a duration and a title claiming a property was verified while every
* real assertion in it (including the incremental-delivery handshake, which is
* the entire reason the follow path exists) was skipped. A named `it.skip` prints
* `↓` with the reason instead.
*/
function itFollows(config, title, fn) {
	const unsupported = config.followUnsupported;
	if (unsupported === void 0) {
		it(title, fn, CASE_TIMEOUT_MS);
		return;
	}
	it.skip(`${title} — follow strategy unsupported: ${unsupported.reason}`, fn, CASE_TIMEOUT_MS);
}
/**
* Assert the live handle's read strategy is the one the config DECLARED.
*
* BOTH directions are defects, and neither is a skip. A provider that declared
* `followUnsupported` but whose handles do follow silently loses the two cases it
* could pass. One that declared nothing but polls would reach the follow
* assertions and fail them for a reason unrelated to journaling — which is what
* the previous `expect(handle.capabilities.killableProcesses).toBe(false)` branch
* did to a provider with `backgroundProcesses: false, killableProcesses: true`.
* Either way the config does not describe the provider, and that is worth
* failing.
*/
function expectDeclaredStrategy(handle, config) {
	expect(journalReadStrategy(handle)).toBe(config.followUnsupported === void 0 ? "follow" : "poll");
}
/** Decode the base64 frame a journal read command produces into raw text. */
function decodeJournalRead(stdout) {
	return Buffer.from(stdout.replace(/\s+/g, ""), "base64").toString("utf8");
}
/**
* Block until the run's journal file exists in the sandbox.
*
* Through the shell (`journalExistsCommand`), never `handle.fs.exists` — see
* rule 3 in `../journal.ts`: on local-process the two resolve `/tmp`
* differently, so an `fs` probe would report the wrong file.
*
* Exported for `./reaper-conformance.ts`, which needs the same bounded,
* shell-only wait before probing a still-producing run. Internal to the testkit;
* not part of the `./testkit` public surface.
*/
async function waitForJournal(handle, paths) {
	const deadline = Date.now() + 15e3;
	for (;;) {
		if ((await handle.process.exec(journalExistsCommand(paths))).exitCode === 0) return;
		if (Date.now() > deadline) throw new Error(`journal conformance: ${paths.journal} never appeared`);
		await sleep(100);
	}
}
function sleep(ms) {
	return new Promise((resolve) => setTimeout(resolve, ms));
}
/**
* An absolute path inside the sandbox that no other case, suite, or machine will
* touch.
*
* Every character is in `[A-Za-z0-9./-]`, so these interpolate into the shell
* commands below as a single word without quoting. `/tmp` and not the workspace:
* on local-process a shell redirect reaches the host's real `/tmp` while
* `handle.fs` resolves under the sandbox root (see rule 3 in `../journal.ts`),
* and everything here is written AND read through the shell so the two never have
* to agree.
*/
function noncePath(label) {
	return `/tmp/tanstack-journal-conformance-${label}-${randomUUID()}`;
}
/** Iteration cap on the kill probe's loop, so nothing can outlive the suite. */
var PROBE_MAX_TICKS = 600;
/**
* Bound on a journal read, so a reader that delivers nothing FAILS instead of
* parking CI.
*
* Never an assertion, and deliberately far above anything a healthy read needs
* (measured: 10–18s for the follow cases on both providers). Each case that uses
* it proves its property some other way — a causal handshake, or
* `backstop.aborted` — so this number can be raised freely and must never be the
* thing a case is tuned against.
*/
var READ_BACKSTOP_MS = 9e4;
/**
* How long to let an asynchronous kill land before the quiet window opens.
*
* A kill is asynchronous on every provider here — Docker signals through a
* second `exec`, local-process signals a process group and lets the OS reap — so
* one more heartbeat tick immediately after `kill()` resolves is not a survivor.
*/
var KILL_SETTLE_MS = 5e3;
/**
* The quiet window: how long the heartbeat must stay frozen.
*
* This is NOT a load-sensitive bound, and the asymmetry is the point. A dead
* process can never write again, so a slow or busy machine can only make this
* window MORE reliable, never less — unlike a "must happen within Nms" ceiling,
* which fails on load. Only a live survivor can end this window, and a live
* survivor writes once a second.
*/
var HEARTBEAT_QUIET_MS = 6e3;
/**
* Byte count of `path`, according to the SANDBOX'S OWN shell, or `null` when it
* cannot be read.
*
* `wc -c` through the shell, never `handle.fs`: on local-process the two resolve
* `/tmp` differently (rule 3), so an `fs` probe would answer about a file the
* sandbox never wrote and the growth below would look frozen from the first
* sample — a vacuous pass. Parsed strictly rather than coerced, so a shell
* diagnostic cannot become `NaN` and compare unequal to itself.
*/
async function fileSize(handle, path) {
	const text = (await handle.process.exec(`wc -c < ${path} 2>/dev/null`)).stdout.trim();
	return /^\d+$/.test(text) ? Number(text) : null;
}
/**
* Wait until `path` has grown to at least `bytes`, i.e. the probe process is
* provably DOING WORK inside the sandbox, and answer whether it got there.
*
* Returning the observation rather than throwing keeps the verdict inside the
* case's own `expect`: this is the "before" half of the assertion, and it is what
* makes the "after" half a live detector instead of a formality.
*/
async function waitForTicks(handle, path, bytes) {
	const deadline = Date.now() + 3e4;
	for (;;) {
		const size = await fileSize(handle, path);
		if (size !== null && size >= bytes) return true;
		if (Date.now() > deadline) return false;
		await sleep(1e3);
	}
}
/**
* Assert `createHandle` satisfies the journal conformance contract. Each `it`
* gets a fresh sandbox via `createHandle`/`dispose`, so implementations may
* share process state across calls without cross-test bleed only if
* `createHandle` returns an isolated sandbox.
*/
function runJournalConformance(config) {
	describe(`journal conformance — ${config.name}`, () => {
		if (config.unsupported) {
			it.skip(`unsupported: ${config.unsupported.reason}`, () => {
				expect(true).toBe(true);
			});
			return;
		}
		it("redirects a command's stdout into the journal and appends the exit sentinel", async () => {
			const { handle, dispose } = await config.createHandle();
			try {
				expectDeclaredStrategy(handle, config);
				const paths = journalPaths(`conf-${Date.now()}`);
				const command = journaledCommand(`printf '{"a":1}\\n{"b":2}\\n'`, paths);
				const proc = await handle.process.spawn(command);
				expect(await proc.wait()).toBe(0);
				const text = decodeJournalRead((await handle.process.exec(journalReadCommand(paths, 0))).stdout);
				expect(text).toBe(`{"a":1}\n{"b":2}\n${exitSentinelLine(paths, 0)}\n`);
			} finally {
				await dispose();
			}
		}, CASE_TIMEOUT_MS);
		it("records the agent's non-zero exit in the sentinel", async () => {
			const { handle, dispose } = await config.createHandle();
			try {
				const paths = journalPaths(`conf-exit-${Date.now()}`);
				await (await handle.process.spawn(journaledCommand("exit 7", paths))).wait();
				const text = decodeJournalRead((await handle.process.exec(journalReadCommand(paths, 0))).stdout);
				expect(text).toBe(`${exitSentinelLine(paths, 7)}\n`);
			} finally {
				await dispose();
			}
		}, CASE_TIMEOUT_MS);
		it("keeps the agent's stderr out of the journal", async () => {
			const { handle, dispose } = await config.createHandle();
			try {
				const paths = journalPaths(`conf-err-${Date.now()}`);
				await (await handle.process.spawn(journaledCommand(`printf '{"a":1}\\n'; printf 'a warning\\n' 1>&2`, paths))).wait();
				const text = decodeJournalRead((await handle.process.exec(journalReadCommand(paths, 0))).stdout);
				expect(text).toBe(`{"a":1}\n${exitSentinelLine(paths, 0)}\n`);
				expect(text).not.toContain("a warning");
			} finally {
				await dispose();
			}
		}, CASE_TIMEOUT_MS);
		it("reads incrementally from a byte offset with absolute positions", async () => {
			const { handle, dispose } = await config.createHandle();
			try {
				const paths = journalPaths(`conf-seek-${Date.now()}`);
				await (await handle.process.spawn(journaledCommand(`printf '{"a":1}\\n{"b":2}\\n'`, paths))).wait();
				const all = [];
				for await (const line of readJournal(handle, {
					paths,
					fromByte: 0,
					strategy: "poll",
					pollIntervalMs: 0,
					signal: AbortSignal.timeout(READ_BACKSTOP_MS)
				})) {
					all.push(line);
					if (all.length === 3) break;
				}
				expect(all.map((l) => l.line)).toEqual([
					"{\"a\":1}",
					"{\"b\":2}",
					exitSentinelLine(paths, 0)
				]);
				const resumed = [];
				for await (const line of readJournal(handle, {
					paths,
					fromByte: all[0]?.endPosition ?? 0,
					strategy: "poll",
					pollIntervalMs: 0,
					signal: AbortSignal.timeout(READ_BACKSTOP_MS)
				})) {
					resumed.push(line);
					if (resumed.length === 2) break;
				}
				expect(resumed.map((l) => l.line)).toEqual(["{\"b\":2}", exitSentinelLine(paths, 0)]);
				expect(resumed[0]?.endPosition).toBe(all[1]?.endPosition);
			} finally {
				await dispose();
			}
		}, CASE_TIMEOUT_MS);
		itFollows(config, "follows a journal that is still being written, delivering each line before the next is produced", async () => {
			expect.hasAssertions();
			const { handle, dispose } = await config.createHandle();
			const gate = noncePath("follow-gate");
			try {
				expectDeclaredStrategy(handle, config);
				const paths = journalPaths(`conf-follow-${Date.now()}`);
				const agentCommand = `printf '{"a":1}\\n'; i=0; while [ ! -f ${gate} ]; do i=$((i+1)); if [ $i -gt 30 ]; then printf '{"gate":"never"}\\n'; break; fi; sleep 1; done; printf '{"b":2}\\n'`;
				handle.process.spawn(journaledCommand(agentCommand, paths));
				await waitForJournal(handle, paths);
				expect((await handle.process.exec(`test -e ${gate}`)).exitCode).not.toBe(0);
				const seen = [];
				for await (const line of readJournal(handle, {
					paths,
					fromByte: 0,
					signal: AbortSignal.timeout(READ_BACKSTOP_MS)
				})) {
					seen.push(line.line);
					if (seen.length === 1) await handle.process.exec(`: >> ${gate}`);
					if (seen.length === 3) break;
				}
				expect(seen).toEqual([
					"{\"a\":1}",
					"{\"b\":2}",
					exitSentinelLine(paths, 0)
				]);
			} finally {
				await handle.process.exec(`: >> ${gate}`).catch(() => void 0);
				await dispose();
			}
		});
		itFollows(config, "stops a follow read when its signal aborts, without a consumer break", async () => {
			expect.hasAssertions();
			const { handle, dispose } = await config.createHandle();
			try {
				expectDeclaredStrategy(handle, config);
				const paths = journalPaths(`conf-abort-${Date.now()}`);
				const agent = await handle.process.spawn(journaledCommand(`printf '{"a":1}\\n'; sleep 30`, paths));
				try {
					await waitForJournal(handle, paths);
					const seen = [];
					const stop = new AbortController();
					const backstop = AbortSignal.timeout(READ_BACKSTOP_MS);
					for await (const line of readJournal(handle, {
						paths,
						fromByte: 0,
						signal: AbortSignal.any([stop.signal, backstop])
					})) {
						seen.push(line.line);
						stop.abort();
					}
					expect({
						seen,
						backstopped: backstop.aborted
					}).toEqual({
						seen: ["{\"a\":1}"],
						backstopped: false
					});
				} finally {
					await agent.kill();
				}
			} finally {
				await dispose();
			}
		});
		itFollows(config, "kills the sandbox-side process, not just the host's view of it", async () => {
			expect.hasAssertions();
			const { handle, dispose } = await config.createHandle();
			const heartbeat = noncePath("killprobe-hb");
			const stop = noncePath("killprobe-stop");
			try {
				expectDeclaredStrategy(handle, config);
				const probe = await handle.process.spawn(`( i=0; while [ ! -f ${stop} ] && [ $i -lt ${PROBE_MAX_TICKS} ]; do printf '.' >> ${heartbeat}; i=$((i+1)); sleep 1; done ) & wait`);
				const tickedBeforeKill = await waitForTicks(handle, heartbeat, 2);
				await probe.kill();
				await sleep(KILL_SETTLE_MS);
				const atSettle = await fileSize(handle, heartbeat);
				await sleep(HEARTBEAT_QUIET_MS);
				const afterQuietWindow = await fileSize(handle, heartbeat);
				expect({
					tickedBeforeKill,
					tickedAfterKill: atSettle === null || afterQuietWindow === null || atSettle !== afterQuietWindow
				}).toEqual({
					tickedBeforeKill: true,
					tickedAfterKill: false
				});
			} finally {
				await handle.process.exec(`: >> ${stop}; rm -f ${heartbeat}`).catch(() => void 0);
				await dispose();
			}
		});
	});
}
//#endregion
export { runJournalConformance, waitForJournal };

//# sourceMappingURL=journal-conformance.js.map