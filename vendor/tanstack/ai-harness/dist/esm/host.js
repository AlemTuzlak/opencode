import { isRecord } from "./utils.js";
import { SharedLog, loadLogState } from "./log.js";
import { LEASE } from "./resume.js";
import { HARNESS_EVENTS } from "./types.js";
import { HarnessSession } from "./session.js";
import { EventType } from "@tanstack/ai";
import { memoryPersistence } from "@tanstack/ai-persistence";
//#region src/host.ts
var warned = false;
/**
* Writes to the session index. `upsert` replaces the whole entry, so a
* change reads the entry, changes a copy, and writes it back. The changes of
* one thread run one at a time, so no change loses the fields of another.
* `onChange` gets each write and each removal.
*/
function sessionIndex(store, onChange) {
	const tails = /* @__PURE__ */ new Map();
	const serial = (threadId, task) => {
		const run = (tails.get(threadId) ?? Promise.resolve()).then(task);
		const tail = run.then(() => {}, () => {});
		tails.set(threadId, tail);
		tail.then(() => {
			if (tails.get(threadId) === tail) tails.delete(threadId);
		});
		return run;
	};
	return {
		get: async (threadId) => store?.get(threadId),
		/**
		* Write `change(entry)` for the thread. `change` gets `undefined` when
		* the thread has no entry, and returns `undefined` to write nothing.
		*/
		update: (threadId, change) => serial(threadId, async () => {
			if (!store) return void 0;
			const next = change(await store.get(threadId));
			if (next) {
				await store.upsert(next);
				onChange({
					type: "session",
					threadId,
					entry: next
				});
			}
			return next;
		}),
		remove: (threadId) => serial(threadId, async () => {
			if (!store) return;
			const entry = await store.get(threadId);
			await store.delete(threadId);
			if (entry) onChange({
				type: "session-deleted",
				threadId,
				entry
			});
		})
	};
}
/**
* The status rule: the status of `session` after `event`, or `undefined`
* when the event changes nothing. An operation that starts runs, and a
* question waits. When an operation ends or a question gets its answer, the
* session waits while a question or an interrupt still waits, runs while
* another operation runs, and else is idle.
*/
function statusAfter(session, event) {
	if (event.type !== EventType.CUSTOM) return void 0;
	switch (event.name) {
		case HARNESS_EVENTS.operationStarted: return "running";
		case HARNESS_EVENTS.question: return "waiting";
		case HARNESS_EVENTS.operationFinished:
		case HARNESS_EVENTS.questionAnswered: {
			const { pendingQuestions, pendingInterrupts, activeOperations } = session.snapshot();
			if (isRecord(event.value) && event.value.status === "interrupted" || pendingQuestions.length > 0 || pendingInterrupts.length > 0) return "waiting";
			return activeOperations.length > 0 ? "running" : "idle";
		}
		default: return;
	}
}
/** How each host finds the open session of a chat turn. Not public API. */
var turnFinders = /* @__PURE__ */ new WeakMap();
/**
* @internal The open session of `harness` in `host` that has the chat turn
* `operationId`, running or ended. A turn's events live in the host that runs
* it, so the handler joins a run through this.
*/
function sessionOfTurn(host, harness, operationId) {
	return turnFinders.get(host)?.(harness.name, operationId) ?? Promise.resolve(void 0);
}
/** Throw a clear error for a durable store set that cannot work. */
function checkDurableStores(persistence) {
	const { stores } = persistence;
	if (stores.log === void 0) return;
	if (stores.runs === void 0 && stores.leases === void 0) throw new Error("A durable host (stores.log) needs stores.runs or stores.leases: a lease finds a crashed host.");
	if (stores.messages !== void 0 || stores.inbox !== void 0) throw new Error("A durable host (stores.log) keeps the transcript and the inputs in the log. Remove stores.messages and stores.inbox. A reader outside a session can use logMessageStore({ store }).");
}
/**
* Create a host for harness sessions.
*
* @example
* ```ts
* const host = createHarnessHost({ persistence })
* const session = await host.open(studio, { threadId: 'thread-1' })
* const turn = await session.prompt('Write a haiku about the sea.')
* ```
*/
function createHarnessHost(options = {}) {
	if (!options.persistence && !warned) {
		warned = true;
		console.warn("[@tanstack/ai-harness] No persistence given: sessions live in memory and are lost on restart.");
	}
	const persistence = options.persistence ?? memoryPersistence();
	checkDurableStores(persistence);
	const memory = memoryPersistence().stores;
	const inbox = persistence.stores.inbox ?? memory.inbox;
	const credentials = persistence.stores.credentials ?? memory.credentials;
	const media = { stores: {
		artifacts: persistence.stores.artifacts ?? memory.artifacts,
		blobs: persistence.stores.blobs ?? memory.blobs,
		generationRuns: persistence.stores.generationRuns ?? memory.generationRuns
	} };
	const logStore = persistence.stores.log;
	const { metadata, sessions: sessionStore } = persistence.stores;
	/** One per running `host.events()` read. */
	const listeners = /* @__PURE__ */ new Set();
	const emit = (event) => {
		for (const listener of listeners) listener(event);
	};
	/** The latest status of each open session, by session key. */
	const statuses = /* @__PURE__ */ new Map();
	const setStatus = (key, threadId, status) => {
		if (statuses.get(key)?.status === status) return;
		const event = {
			type: "status",
			threadId,
			status,
			at: Date.now()
		};
		statuses.set(key, event);
		emit(event);
	};
	const index = sessionIndex(sessionStore, emit);
	const coalesceMs = options.coalesceMs ?? 100;
	/** The shared log of each log id with an open session, by log id. */
	const logs = /* @__PURE__ */ new Map();
	/** The resolved shared logs, for `logState`. */
	const resolved = /* @__PURE__ */ new Map();
	const sharedLog = (store, logId) => {
		const open = logs.get(logId);
		if (open) return open;
		const loaded = loadLogState({
			store,
			logId,
			...metadata ? { metadata } : {},
			...options.project ? { project: options.project } : {},
			...options.reduce ? { reduce: options.reduce } : {}
		}).then((state) => {
			const log = new SharedLog({
				store,
				logId,
				state,
				coalesceMs,
				...options.project ? { project: options.project } : {},
				...options.reduce ? { reduce: options.reduce } : {},
				...metadata ? { metadata } : {},
				onIdle: () => {
					if (logs.get(logId) === loaded) logs.delete(logId);
					if (resolved.get(logId) === log) resolved.delete(logId);
				}
			});
			resolved.set(logId, log);
			return log;
		});
		loaded.catch(() => logs.delete(logId));
		logs.set(logId, loaded);
		return loaded;
	};
	const sessions = /* @__PURE__ */ new Map();
	/**
	* The keys of sessions that only a `resumePending` sweep opened. With
	* `close: 'whenIdle'`, the sweep closes only these. An open by the app
	* takes a key out.
	*/
	const sweptOnly = /* @__PURE__ */ new Set();
	/** The closes of swept sessions that left the cache, by key. */
	const closing = /* @__PURE__ */ new Map();
	const hostId = `host-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 9)}`;
	const host = {
		open(harness, { threadId, principal, logId: openLogId, promptCache }) {
			const key = `${harness.name}\u0000${threadId}`;
			let session = sessions.get(key);
			if (session) sweptOnly.delete(key);
			if (!session) {
				const logId = openLogId ?? threadId;
				const created = new HarnessSession({
					harness,
					threadId,
					logId,
					persistence,
					inbox,
					credentials,
					media,
					hostId,
					index,
					...logStore ? { log: {
						store: logStore,
						...options.project ? { project: options.project } : {},
						open: async (sessionThread, onFailure) => {
							let log = await sharedLog(logStore, logId);
							while (!log.isOpen) log = await sharedLog(logStore, logId);
							return log.view(sessionThread, onFailure);
						}
					} } : {},
					...options.lease ? { lease: options.lease } : {},
					...principal ? { principal } : {},
					...promptCache ? { promptCache } : {},
					onEvent: (event) => {
						const status = statusAfter(created, event);
						if (status) setStatus(key, threadId, status);
					},
					onClose: () => {
						if (sessions.get(key) === session) sessions.delete(key);
						statuses.delete(key);
					}
				});
				session = (closing.get(key) ?? Promise.resolve()).then(() => created.open()).then(() => {
					if (!statuses.has(key)) setStatus(key, threadId, "idle");
					return created;
				}, (error) => {
					sessions.delete(key);
					statuses.delete(key);
					throw error;
				});
				sessions.set(key, session);
			}
			return session;
		},
		async fork(harness, { threadId, newThreadId, at, principal }) {
			if (newThreadId === threadId) throw new Error("A fork needs a new thread: newThreadId is threadId.");
			const source = await host.open(harness, { threadId });
			const transcript = await source.transcript();
			const end = at === void 0 ? transcript.length : at === null ? 0 : transcript.findIndex((message) => message.id === at) + 1;
			if (typeof at === "string" && end === 0) throw new Error(`Thread ${JSON.stringify(threadId)} has no message ${JSON.stringify(at)}.`);
			if (logStore ? (await logStore.read(newThreadId, { limit: 1 })).length > 0 : ((await persistence.stores.messages?.loadThread(newThreadId))?.length ?? 0) > 0) throw new Error(`Thread ${JSON.stringify(newThreadId)} is not empty. Fork into a new thread.`);
			const fork = await host.open(harness, {
				threadId: newThreadId,
				...principal ? { principal } : {}
			});
			await fork.adoptFork(source, transcript.slice(0, end));
			return fork;
		},
		async resumePending({ harnesses, close = "whenIdle", limit = 100 }) {
			const claims = persistence.stores.workClaims;
			if (!claims) throw new Error("resumePending needs stores.workClaims.");
			const ttlMs = options.lease?.ttlMs ?? LEASE.ttlMs;
			const byName = new Map(harnesses.map((harness) => [harness.name, harness]));
			const expired = await claims.listExpired({
				now: Date.now(),
				limit
			});
			const opened = [];
			for (const { threadId, harness: name } of expired) {
				const harness = byName.get(name);
				if (!harness) continue;
				if (!await claims.claim({
					threadId,
					harness: name,
					ownerId: hostId,
					until: Date.now() + ttlMs
				})) continue;
				const key = `${name}\u0000${threadId}`;
				const isOwn = close === "whenIdle" && !sessions.has(key);
				if (isOwn) sweptOnly.add(key);
				const session = await host.open(harness, { threadId });
				if (isOwn) {
					const stop = session.onIdle(() => {
						stop();
						if (!sweptOnly.delete(key)) return;
						sessions.delete(key);
						const closed = session.close().catch(() => {});
						closing.set(key, closed);
						closed.then(() => {
							if (closing.get(key) === closed) closing.delete(key);
						});
					});
				}
				opened.push({
					threadId,
					harness: name
				});
			}
			return opened;
		},
		async recover(threadId) {
			const live = await Promise.allSettled(sessions.values());
			await Promise.all(live.flatMap((entry) => entry.status === "fulfilled" && (threadId === void 0 || entry.value.threadId === threadId) ? [entry.value.recover()] : []));
		},
		async reload(harness) {
			const prefix = `${harness.name}\u0000`;
			const live = await Promise.allSettled([...sessions].flatMap(([key, session]) => key.startsWith(prefix) ? [session] : []));
			const results = await Promise.allSettled(live.flatMap((entry) => entry.status === "fulfilled" ? [entry.value.reload()] : []));
			for (const result of results) if (result.status === "rejected") throw result.reason;
		},
		async close(closeOptions) {
			await Promise.allSettled(closing.values());
			const live = await Promise.allSettled(sessions.values());
			await Promise.all(live.filter((entry) => entry.status === "fulfilled").map((entry) => entry.value.close(closeOptions)));
		},
		logState: (logId) => resolved.get(logId)?.state.reduced,
		sessions: {
			list: async (listOptions) => await sessionStore?.list({
				parentThreadId: null,
				...listOptions
			}) ?? { entries: [] },
			get: (threadId) => index.get(threadId),
			rename: (threadId, title) => index.update(threadId, (entry) => entry && {
				...entry,
				title,
				updatedAt: Date.now()
			}),
			delete: (threadId) => index.remove(threadId),
			async fork(harness, threadId, at) {
				const source = await index.get(threadId);
				if (source?.harness !== void 0 && source.harness !== harness.name) throw new Error(`Thread ${JSON.stringify(threadId)} belongs to harness ${JSON.stringify(source.harness)}, not ${JSON.stringify(harness.name)}.`);
				let last = "through" in at ? at.through : null;
				if ("before" in at) {
					const transcript = await (await host.open(harness, { threadId })).transcript();
					const position = transcript.findIndex(({ id }) => id === at.before);
					if (position === -1) throw new Error(`The transcript has no message with id ${at.before}.`);
					if (position > 0) {
						const previous = transcript[position - 1]?.id;
						if (!previous) throw new Error(`The message before ${at.before} has no id.`);
						last = previous;
					}
				}
				const forked = await host.fork(harness, {
					threadId,
					newThreadId: `thread-${crypto.randomUUID()}`,
					at: last,
					...source?.principal ? { principal: source.principal } : {}
				});
				const now = Date.now();
				const entry = {
					threadId: forked.threadId,
					createdAt: now,
					updatedAt: now,
					harness: harness.name,
					...source?.title ? { title: `${source.title} (fork)` } : {},
					...source?.principal ? { principal: source.principal } : {}
				};
				await index.update(entry.threadId, () => entry);
				return entry;
			}
		},
		async *events({ signal } = {}) {
			const queue = [...statuses.values()];
			let wake = () => {};
			const listener = (event) => {
				queue.push(event);
				wake();
			};
			const onAbort = () => wake();
			listeners.add(listener);
			signal?.addEventListener("abort", onAbort);
			try {
				while (!signal?.aborted) {
					const next = queue.shift();
					if (next) {
						yield next;
						continue;
					}
					await new Promise((resolve) => {
						wake = resolve;
					});
				}
			} finally {
				listeners.delete(listener);
				signal?.removeEventListener("abort", onAbort);
			}
		}
	};
	turnFinders.set(host, async (name, operationId) => {
		for (const [key, opening] of sessions) {
			if (!key.startsWith(`${name}\u0000`)) continue;
			const session = await opening.catch(() => void 0);
			if (session?.operation(operationId)?.kind === "chat") return session;
		}
	});
	return host;
}
//#endregion
export { createHarnessHost, sessionOfTurn };

//# sourceMappingURL=host.js.map