import "./bootstrap.js";
//#region src/watch.ts
/**
* Sandbox file-event hooks — observe create / change / delete of files inside a
* sandbox (e.g. as an in-sandbox agent edits the workspace).
*
* Provider-agnostic: coded against the {@link SandboxHandle} contract only.
* Two mechanisms, auto-selected:
*
* - **Native** — when a provider implements the optional `fs.watch` seam
*   (local-process does, via Node `fs.watch`), OS events drive the feed with low
*   latency.
* - **Exec-poll** — otherwise (Docker, Cloudflare, any exec-only provider), a
*   single `find … -printf` snapshot of `mtime\tsize\tpath` is taken every
*   `intervalMs` and diffed. Works on any Linux container with GNU findutils
*   (true for `node:*` / debian images) with no extra deps or image changes.
*
* The feed intentionally rides only the portable surface, so the same
* `watchWorkspace` call behaves identically across providers.
*/
var DEFAULT_INTERVAL_MS = 700;
var DEFAULT_IGNORE = [".git", "node_modules"];
/** POSIX single-quote escape for embedding values in a shell command. */
function q(value) {
	return `'${value.replace(/'/g, `'\\''`)}'`;
}
/**
* Diff two file snapshots (`Map<path, signature>`, signature = `mtime\tsize`).
* Pure — the heart of the exec-poll path, unit-tested in isolation.
*/
function diffSnapshots(prev, next, timestamp) {
	const events = [];
	for (const [path, sig] of next) {
		const before = prev.get(path);
		if (before === void 0) events.push({
			type: "create",
			path,
			timestamp
		});
		else if (before !== sig) events.push({
			type: "change",
			path,
			timestamp
		});
	}
	for (const path of prev.keys()) if (!next.has(path)) events.push({
		type: "delete",
		path,
		timestamp
	});
	return events;
}
/**
* Build the `find` command that prints `mtime\tsize\tpath` for every file.
* Searches `.` (relative to the exec `cwd`) rather than an absolute root: a
* provider's `exec` maps only `cwd` onto the real filesystem, not literal path
* arguments, so `find <virtual-root>` would look at a non-existent host path on
* mapped-root providers (e.g. local-process). Emitted `%p` values are
* root-normalized in {@link parseFindOutput}.
*/
function buildFindCommand(ignore) {
	return `find . -type f ${ignore.map((entry) => `-not -path ${q(`*/${entry}/*`)}`).join(" ")} -printf '%T@\\t%s\\t%p\\n'`;
}
/**
* Parse `find -printf` output into a `Map<path, signature>`. `find .` prints
* paths like `./sub/file`; map them back under `root` so event paths match the
* native-watch shape (`<root>/sub/file`).
*/
function parseFindOutput(stdout, root) {
	const base = root.replace(/\/+$/, "");
	const snapshot = /* @__PURE__ */ new Map();
	for (const line of stdout.split("\n")) {
		if (line === "") continue;
		const firstTab = line.indexOf("	");
		const secondTab = line.indexOf("	", firstTab + 1);
		if (firstTab === -1 || secondTab === -1) continue;
		const mtime = line.slice(0, firstTab);
		const size = line.slice(firstTab + 1, secondTab);
		const rel = line.slice(secondTab + 1).replace(/^\.\/?/, "");
		const path = rel === "" ? base : `${base}/${rel}`;
		snapshot.set(path, `${mtime}\t${size}`);
	}
	return snapshot;
}
/** Whether a path should be ignored (contains a `/<entry>/` fragment). */
function isIgnored(path, ignore) {
	return ignore.some((entry) => path.includes(`/${entry}/`));
}
/**
* Start watching a sandbox workspace for file events. Picks the native
* `fs.watch` fast-path when the provider advertises it, otherwise polls via
* `find`. Returns a handle whose `stop()` tears everything down.
*/
async function watchWorkspace(handle, options) {
	const root = options.root ?? "/workspace";
	const ignore = options.ignore ?? DEFAULT_IGNORE;
	const intervalMs = options.intervalMs ?? DEFAULT_INTERVAL_MS;
	if (options.signal?.aborted) return { stop: () => Promise.resolve() };
	if (handle.fs.watch) return startNativeWatch(handle, {
		...options,
		root,
		ignore
	});
	return startPollWatch(handle, {
		...options,
		root,
		ignore,
		intervalMs
	});
}
/** Native fs.watch path: OS events, disambiguated against a known-path set. */
async function startNativeWatch(handle, options) {
	const { onEvent, root, ignore, logger } = options;
	const watch = handle.fs.watch;
	if (!watch) throw new Error("native watch is unavailable on this provider");
	const seed = await collectPaths(handle, root, ignore, logger);
	const known = seed.files;
	let seeded = seed.rootOk;
	let reseeding = null;
	const ensureSeeded = () => {
		if (seeded) return Promise.resolve();
		if (!reseeding) reseeding = collectPaths(handle, root, ignore, logger).then((r) => {
			if (r.rootOk) {
				for (const p of r.files) known.add(p);
				seeded = true;
				logger?.sandbox("sandbox watch: re-seeded after failed initial seed", { root });
			}
			reseeding = null;
		});
		return reseeding;
	};
	const subscription = await watch(root, (raw) => {
		const path = raw.path;
		if (isIgnored(path, ignore)) return;
		(async () => {
			await ensureSeeded();
			const exists = await handle.fs.exists(path);
			const timestamp = Date.now();
			if (!exists) {
				if (known.delete(path)) onEvent({
					type: "delete",
					path,
					timestamp
				});
				return;
			}
			if (known.has(path)) onEvent({
				type: "change",
				path,
				timestamp
			});
			else {
				known.add(path);
				onEvent({
					type: "create",
					path,
					timestamp
				});
			}
		})().catch((error) => {
			logger?.warn("sandbox watch: native event classify failed", {
				path,
				error
			});
		});
	});
	const logStopFailure = (error) => logger?.warn("sandbox watch: native subscription.stop() failed", {
		root,
		error
	});
	const onAbort = () => void subscription.stop().catch(logStopFailure);
	options.signal?.addEventListener("abort", onAbort, { once: true });
	if (options.signal?.aborted) subscription.stop().catch(logStopFailure);
	return { stop: async () => {
		options.signal?.removeEventListener("abort", onAbort);
		await subscription.stop();
	} };
}
/** Exec-poll path: snapshot `find -printf` on an interval and diff. */
async function startPollWatch(handle, options) {
	const { onEvent, root, ignore, intervalMs, logger } = options;
	const command = buildFindCommand(ignore);
	const controller = new AbortController();
	const STEADY_STATE_THROW_WARN_AFTER = 3;
	let consecutiveThrows = 0;
	const snapshot = async (isInitial = false) => {
		let result;
		try {
			result = await handle.process.exec(command, {
				cwd: root,
				signal: controller.signal
			});
			consecutiveThrows = 0;
		} catch (error) {
			if (isInitial) logger?.warn("sandbox watch: initial `find` poll threw", {
				root,
				error
			});
			else if (controller.signal.aborted) logger?.sandbox("sandbox watch: `find` poll threw during teardown", {
				root,
				error
			});
			else {
				consecutiveThrows += 1;
				if (consecutiveThrows >= STEADY_STATE_THROW_WARN_AFTER) logger?.warn("sandbox watch: `find` poll threw repeatedly", {
					root,
					error,
					consecutiveThrows
				});
				else logger?.sandbox("sandbox watch: `find` poll threw", {
					root,
					error
				});
			}
			return null;
		}
		if (result.exitCode === 0) return {
			map: parseFindOutput(result.stdout, root),
			complete: true
		};
		if (result.stdout !== "") {
			logger?.sandbox("sandbox watch: `find` non-zero exit with partial output", {
				root,
				exitCode: result.exitCode,
				stderr: result.stderr
			});
			return {
				map: parseFindOutput(result.stdout, root),
				complete: false
			};
		}
		logger?.warn("sandbox watch: `find` poll exited non-zero with no output", {
			root,
			exitCode: result.exitCode,
			stderr: result.stderr
		});
		return null;
	};
	let previous = null;
	let seededFromComplete = false;
	{
		const poll = await snapshot(true);
		if (poll) {
			previous = poll.map;
			seededFromComplete = poll.complete;
		}
	}
	const state = { running: true };
	const tick = async () => {
		if (!state.running) return;
		try {
			const poll = await snapshot();
			if (poll === null) return;
			if (previous === null) {
				previous = poll.map;
				seededFromComplete = poll.complete;
				return;
			}
			if (!seededFromComplete && poll.complete) {
				logger?.sandbox("sandbox watch: re-baselined after provisional partial seed", { root });
				previous = poll.map;
				seededFromComplete = true;
				return;
			}
			const next = poll.complete ? poll.map : new Map([...previous, ...poll.map]);
			for (const event of diffSnapshots(previous, next, Date.now())) onEvent(event);
			previous = next;
		} catch (error) {
			logger?.sandbox("sandbox watch: tick failed", {
				root,
				error
			});
		}
	};
	const timer = setInterval(() => void tick(), intervalMs);
	if (typeof timer.unref === "function") timer.unref();
	const stop = () => {
		if (state.running) {
			state.running = false;
			clearInterval(timer);
			controller.abort();
			options.signal?.removeEventListener("abort", onAbort);
		}
		return Promise.resolve();
	};
	const onAbort = () => void stop();
	options.signal?.addEventListener("abort", onAbort, { once: true });
	if (options.signal?.aborted) stop();
	return { stop };
}
/**
* Recursively collect file paths under `root`, honoring `ignore`. `rootOk` is
* `false` when the ROOT `list` itself failed — the seed is then untrustworthy
* (empty/partial), which the native watcher uses to trigger a lazy re-seed. A
* failed *subdirectory* list is logged but doesn't flip `rootOk` (its files are
* simply absent, a smaller misclassification surface).
*/
async function collectPaths(handle, root, ignore, logger) {
	const files = /* @__PURE__ */ new Set();
	let rootOk = true;
	const walk = async (dir, isRoot) => {
		let entries;
		try {
			entries = await handle.fs.list(dir);
		} catch (error) {
			if (isRoot) rootOk = false;
			logger?.warn("sandbox watch: failed to list directory while seeding", {
				dir,
				error
			});
			return;
		}
		for (const entry of entries) {
			if (ignore.includes(entry.name)) continue;
			if (entry.type === "dir") await walk(entry.path, false);
			else files.add(entry.path);
		}
	};
	await walk(root, true);
	return {
		files,
		rootOk
	};
}
//#endregion
export { diffSnapshots, watchWorkspace };

//# sourceMappingURL=watch.js.map