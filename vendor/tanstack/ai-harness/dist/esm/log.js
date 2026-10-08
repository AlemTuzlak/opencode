import { addUsage, emptyUsage, isSessionUsage } from "./usage.js";
import { isRecord } from "./utils.js";
import { EventType } from "@tanstack/ai";
import { LogConflictError } from "@tanstack/ai-persistence";
//#region src/log.ts
/** The {@link RevertState} in `value`, or `undefined` when it is not one. */
function revertOf(value) {
	if (!isRecord(value) || typeof value.messageId !== "string") return void 0;
	return {
		messageId: value.messageId,
		...value.files !== void 0 ? { files: value.files } : {}
	};
}
var HARNESS_RECORD_TYPES = /* @__PURE__ */ new Set([
	"harness.event",
	"harness.transcript",
	"harness.input",
	"harness.input.applied",
	"harness.input.joined",
	"harness.input.rejected",
	"harness.input.abort",
	"harness.turn.retry",
	"harness.input.delivery",
	"harness.input.settled",
	"harness.tool.result",
	"harness.tool.started",
	"harness.tool.step",
	"harness.usage",
	"harness.revert",
	"harness.job",
	"harness.note"
]);
function isHarnessRecord(record) {
	return HARNESS_RECORD_TYPES.has(record.type);
}
function emptyLogState() {
	return {
		seq: 0,
		messages: [],
		transcriptSeq: 0,
		inputs: /* @__PURE__ */ new Map(),
		toolResults: /* @__PURE__ */ new Map(),
		started: /* @__PURE__ */ new Map(),
		steps: /* @__PURE__ */ new Map(),
		usage: emptyUsage(),
		jobs: /* @__PURE__ */ new Set(),
		notes: /* @__PURE__ */ new Map()
	};
}
var stepKey = (toolCallId, name) => `${toolCallId}\u0000${name}`;
/** A JSON copy: what a store gives back for `record`. */
var normalize = (value) => JSON.parse(JSON.stringify(value));
var sameJson = (left, right) => JSON.stringify(left) === JSON.stringify(right);
/** A message out of the log gets its `createdAt` back as a `Date`. */
function revive(message) {
	const createdAt = message.createdAt;
	return typeof createdAt === "string" ? {
		...message,
		createdAt: new Date(createdAt)
	} : message;
}
/** How many messages at the start of `a` and `b` are the same. */
function commonPrefix(a, b) {
	const length = Math.min(a.length, b.length);
	let index = 0;
	while (index < length && sameJson(a[index], b[index])) index += 1;
	return index;
}
/** The transcript record that turns `current` into `next`, or none. */
function transcriptRecord(current, next) {
	const keep = commonPrefix(current, next);
	if (keep === current.length && keep === next.length) return [];
	return [{
		type: "harness.transcript",
		keep,
		add: normalize(next.slice(keep))
	}];
}
function updateInput(state, inputId, change) {
	const input = state.inputs.get(inputId);
	if (input) state.inputs.set(inputId, change(input));
}
/** Fold one entry into `state`. */
function foldEntry(state, entry, project) {
	state.seq = entry.seq;
	const { record } = entry;
	if (!record.type.startsWith("harness.")) {
		const next = project?.({
			messages: state.messages,
			record
		});
		if (next) state.messages = next;
		return;
	}
	if (!isHarnessRecord(record)) return;
	switch (record.type) {
		case "harness.event": return;
		case "harness.transcript":
			state.messages = [...state.messages.slice(0, record.keep), ...record.add.map(revive)];
			state.transcriptSeq = entry.seq;
			for (const message of record.add) if (message.id) state.notes.delete(message.id);
			return;
		case "harness.input":
			if (state.inputs.has(record.inputId)) return;
			state.inputs.set(record.inputId, {
				inputId: record.inputId,
				input: record.input,
				...record.principal ? { principal: record.principal } : {},
				at: record.at,
				status: "pending",
				attempt: 0,
				abortRequested: false
			});
			return;
		case "harness.input.applied": {
			const appliedAt = state.messages.length;
			updateInput(state, record.inputId, (input) => ({
				...input,
				status: "applied",
				operationId: record.operationId,
				attempt: record.attempt,
				appliedAt,
				...record.timeoutAt !== void 0 ? { timeoutAt: record.timeoutAt } : {}
			}));
			return;
		}
		case "harness.input.joined":
			updateInput(state, record.inputId, (input) => ({
				...input,
				status: "joined",
				into: record.into
			}));
			return;
		case "harness.input.rejected":
			updateInput(state, record.inputId, (input) => ({
				...input,
				status: "rejected",
				reason: record.reason
			}));
			return;
		case "harness.input.abort":
			updateInput(state, record.inputId, (input) => ({
				...input,
				abortRequested: true
			}));
			return;
		case "harness.turn.retry":
			updateInput(state, record.inputId, (input) => ({
				...input,
				retries: record.retries
			}));
			return;
		case "harness.input.delivery":
			updateInput(state, record.inputId, (input) => ({
				...input,
				delivery: record.delivery
			}));
			return;
		case "harness.input.settled":
			updateInput(state, record.inputId, (input) => ({
				...input,
				status: "settled",
				settlement: {
					inputId: record.inputId,
					outcome: record.outcome,
					...record.operationId ? { operationId: record.operationId } : {},
					...record.error ? { error: record.error } : {}
				}
			}));
			return;
		case "harness.tool.result":
			state.toolResults.set(record.toolCallId, record.message);
			return;
		case "harness.tool.started":
			state.started.set(record.toolCallId, {
				name: record.name,
				replay: record.replay
			});
			return;
		case "harness.tool.step":
			state.steps.set(stepKey(record.toolCallId, record.name), record.value);
			return;
		case "harness.usage":
			addUsage(state.usage, record);
			return;
		case "harness.revert":
			if (record.revert) state.revert = record.revert;
			else delete state.revert;
			return;
		case "harness.job":
			if (record.ended) state.jobs.delete(record.jobId);
			else state.jobs.add(record.jobId);
			return;
		case "harness.note":
			state.notes.set(record.noteId, record.note);
			return;
	}
}
function emptySharedLogState(reduce) {
	return {
		seq: 0,
		sessions: /* @__PURE__ */ new Map(),
		reduced: reduce ? normalize(reduce.initial) : void 0
	};
}
/** The fold of session `thread`. A session with no records yet gets an empty one. */
function sessionOf(state, thread) {
	let session = state.sessions.get(thread);
	if (!session) {
		session = emptyLogState();
		state.sessions.set(thread, session);
	}
	return session;
}
/** The session of a record: its `thread`, or the session whose thread id is the log id. */
var threadOf = (record, logId) => typeof record.thread === "string" ? record.thread : logId;
/** Fold one entry of a shared log. */
function foldLogEntry(state, entry, options) {
	state.seq = entry.seq;
	const { record } = entry;
	const { reduce } = options;
	if (reduce && !record.type.startsWith("harness.")) state.reduced = reduce.record({
		state: state.reduced ?? reduce.initial,
		record
	});
	foldEntry(sessionOf(state, threadOf(record, options.logId)), entry, options.project);
}
var CHECKPOINT_NAMESPACE = "harness:log-checkpoint";
var CHECKPOINT_EVERY = 50;
var READ_PAGE = 500;
var MAX_TAIL = 1e4;
function serialize(state, versions) {
	return {
		v: 2,
		seq: state.seq,
		...versions,
		sessions: [...state.sessions].map(([thread, session]) => [thread, {
			messages: session.messages,
			transcriptSeq: session.transcriptSeq,
			inputs: [...session.inputs.values()],
			toolResults: [...session.toolResults.entries()],
			started: [...session.started.entries()],
			steps: [...session.steps.entries()],
			usage: session.usage,
			revert: session.revert ?? null,
			jobs: [...session.jobs],
			notes: [...session.notes.entries()]
		}]),
		reduced: state.reduced ?? null
	};
}
/** One session of a checkpoint at `seq`, or `undefined` when it is not shaped. */
function parseSession(value, seq) {
	if (!isRecord(value)) return void 0;
	const { messages, inputs, toolResults, steps } = value;
	if (!(Array.isArray(messages) && Array.isArray(inputs) && Array.isArray(toolResults) && Array.isArray(steps))) return void 0;
	const revert = revertOf(value.revert);
	return {
		seq,
		messages: messages.map(revive),
		...typeof value.transcriptSeq === "number" ? { transcriptSeq: value.transcriptSeq } : {},
		inputs: new Map(inputs.map((input) => [input.inputId, input])),
		toolResults: new Map(toolResults),
		started: new Map(Array.isArray(value.started) ? value.started : []),
		steps: new Map(steps),
		usage: isSessionUsage(value.usage) ? value.usage : emptyUsage(),
		...revert ? { revert } : {},
		jobs: new Set(Array.isArray(value.jobs) ? value.jobs : []),
		notes: new Map(Array.isArray(value.notes) ? value.notes : [])
	};
}
/** A checkpoint that the harness wrote with `versions`, or `undefined`. */
function parseCheckpoint(value, versions) {
	if (!isRecord(value) || value.v !== 2 || typeof value.seq !== "number") return;
	if (value.version !== versions.version || value.reduceVersion !== versions.reduceVersion || !Array.isArray(value.sessions)) return;
	const sessions = /* @__PURE__ */ new Map();
	for (const item of value.sessions) {
		if (!Array.isArray(item) || typeof item[0] !== "string") return void 0;
		const session = parseSession(item[1], value.seq);
		if (!session) return void 0;
		sessions.set(item[0], session);
	}
	return {
		seq: value.seq,
		sessions,
		reduced: value.reduced ?? void 0
	};
}
var versionsOf = (project, reduce) => ({
	...project ? { version: project.version ?? "" } : {},
	...reduce ? { reduceVersion: reduce.version ?? "" } : {}
});
/**
* Fold the log `logId`. With `metadata`, start from the newest fold
* checkpoint when it is valid for this log and these versions.
*/
async function loadLogState(options) {
	const { store, logId, metadata, project, reduce } = options;
	let state = parseCheckpoint(metadata ? await metadata.get(CHECKPOINT_NAMESPACE, logId).catch(() => null) : null, versionsOf(project, reduce)) ?? emptySharedLogState(reduce);
	if (state.seq > 0) {
		const [atCheckpoint] = await store.read(logId, {
			after: state.seq - 1,
			limit: 1
		});
		if (!atCheckpoint) state = emptySharedLogState(reduce);
	}
	const fold = {
		logId,
		...project ? { project: project.record } : {},
		...reduce ? { reduce } : {}
	};
	for (;;) {
		const page = await store.read(logId, {
			after: state.seq,
			limit: READ_PAGE
		});
		for (const entry of page) foldLogEntry(state, entry, fold);
		if (page.length < READ_PAGE) return state;
	}
}
var DELTA_TYPES = /* @__PURE__ */ new Set([
	EventType.TEXT_MESSAGE_CONTENT,
	EventType.REASONING_MESSAGE_CONTENT,
	EventType.TOOL_CALL_ARGS
]);
/** The fields of a delta event that must match for a merge. */
function deltaKey(thread, operationId, event) {
	if (!DELTA_TYPES.has(event.type) || !("delta" in event)) return void 0;
	const { delta: _delta, timestamp: _timestamp, ...rest } = event;
	return JSON.stringify([
		thread,
		operationId,
		rest
	]);
}
/**
* Writes one log for every session that shares it, and keeps its fold.
* All writes run one after another. Each batch goes at the next position.
* When a write fails (another writer took the position, or the store failed
* twice), every session of the log gets `onFailure`, and every later write
* rejects.
*/
var SharedLog = class {
	logId;
	state;
	store;
	fold;
	versions;
	metadata;
	coalesceMs;
	onIdle;
	failureListeners = /* @__PURE__ */ new Set();
	/** Events and host records that wait for the next append. */
	pending = [];
	/** The merge key of the last pending record, when it is a delta event. */
	pendingKey;
	/** Host records that wait for the next transcript commit, by thread. */
	staged = /* @__PURE__ */ new Map();
	timer;
	scheduled = false;
	chain = Promise.resolve();
	failure;
	tail = [];
	/** Every event after this position is in `tail`. */
	tailFrom;
	waiters = /* @__PURE__ */ new Set();
	/** The threads with an open view. */
	threads = /* @__PURE__ */ new Set();
	idle = false;
	writing = false;
	hasWritten = false;
	writesSinceCheckpoint = 0;
	unsubscribe;
	constructor(options) {
		this.store = options.store;
		this.logId = options.logId;
		this.state = options.state;
		this.metadata = options.metadata;
		this.coalesceMs = options.coalesceMs;
		this.onIdle = options.onIdle ?? (() => {});
		this.fold = {
			logId: options.logId,
			...options.project ? { project: options.project.record } : {},
			...options.reduce ? { reduce: options.reduce } : {}
		};
		this.versions = versionsOf(options.project, options.reduce);
		this.tailFrom = options.state.seq;
		this.unsubscribe = options.store.subscribe(options.logId, () => {
			if (!this.writing) this.enqueue(() => this.catchUp());
		});
	}
	/**
	* False after the last view closed or a write failed. The host then opens
	* a new log.
	*/
	get isOpen() {
		return !this.idle;
	}
	/** The view of session `threadId`. Close it when the session closes. */
	view(threadId, onFailure) {
		if (this.idle) throw new Error(`The log ${JSON.stringify(this.logId)} is closed.`);
		if (this.threads.has(threadId)) throw new Error(`The thread ${JSON.stringify(threadId)} already has an open session on this log. Two harnesses cannot open one thread on a durable host.`);
		this.threads.add(threadId);
		const listener = (error) => onFailure(error);
		this.failureListeners.add(listener);
		const shared = this.state;
		let closed = false;
		const isDropped = () => closed && this.failure === void 0;
		return {
			threadId,
			logId: this.logId,
			get state() {
				return sessionOf(shared, threadId);
			},
			publish: (operationId, event) => {
				if (!isDropped()) this.publish(threadId, operationId, event);
			},
			append: (records) => isDropped() ? Promise.resolve() : this.append(threadId, records),
			stage: (records) => {
				if (!isDropped()) this.stage(threadId, records);
			},
			commit: (options) => isDropped() ? Promise.resolve() : this.commit(threadId, options),
			flush: () => this.flush(),
			catchUp: () => this.enqueue(() => this.catchUp()),
			head: () => this.head(),
			read: (options) => this.read(threadId, {
				...options,
				isClosed: () => closed
			}),
			close: () => {
				if (closed) return;
				closed = true;
				this.release(threadId, listener);
			}
		};
	}
	release(threadId, listener) {
		this.failureListeners.delete(listener);
		this.threads.delete(threadId);
		this.staged.delete(threadId);
		this.flush().catch(() => {});
		this.wake();
		if (this.threads.size > 0) return;
		this.idle = true;
		this.unsubscribe();
		this.onIdle();
	}
	/** Stamp a record with its session, unless it names one or the session is the log's own. */
	stamp(record, thread) {
		if (typeof record.thread === "string" || thread === this.logId) return record;
		return {
			...record,
			thread
		};
	}
	publish(thread, operationId, event) {
		const normalized = normalize(event);
		const key = deltaKey(thread, operationId, normalized);
		const last = this.pending.at(-1);
		if (key !== void 0 && key === this.pendingKey && last !== void 0 && isHarnessRecord(last) && last.type === "harness.event") last.event = mergeDelta(last.event, normalized);
		else this.pending.push(this.stamp({
			type: "harness.event",
			operationId,
			event: normalized
		}, thread));
		this.pendingKey = key;
		if (key === void 0) {
			this.flush().catch(() => {});
			return;
		}
		this.schedule();
	}
	append(thread, records) {
		this.pending.push(...records.map((record) => normalize(this.stamp(record, thread))));
		this.pendingKey = void 0;
		return this.flush();
	}
	stage(thread, records) {
		const staged = this.staged.get(thread) ?? [];
		staged.push(...records.map((record) => normalize(this.stamp(record, thread))));
		this.staged.set(thread, staged);
	}
	commit(thread, options) {
		const events = this.takePending();
		const staged = this.staged.get(thread)?.splice(0) ?? [];
		const records = (options.records ?? []).map((record) => normalize(this.stamp(record, thread)));
		return this.enqueue(() => this.write([
			...events,
			...transcriptRecord(sessionOf(this.state, thread).messages, options.messages).map((record) => this.stamp(record, thread)),
			...staged,
			...records
		]));
	}
	/** Append the pending events now. */
	flush() {
		const batch = this.takePending();
		return this.enqueue(() => this.write(batch));
	}
	takePending() {
		if (this.timer !== void 0) clearTimeout(this.timer);
		this.timer = void 0;
		this.scheduled = false;
		this.pendingKey = void 0;
		return this.pending.splice(0);
	}
	schedule() {
		if (this.scheduled) return;
		this.scheduled = true;
		if (this.coalesceMs <= 0) {
			queueMicrotask(() => void this.flush().catch(() => {}));
			return;
		}
		this.timer = setTimeout(() => void this.flush().catch(() => {}), this.coalesceMs);
		if (typeof this.timer === "object" && "unref" in this.timer) this.timer.unref();
	}
	enqueue(task) {
		const run = this.chain.then(task);
		this.chain = run.catch(() => {});
		return run;
	}
	async write(batch) {
		if (this.failure !== void 0) throw this.failure;
		if (batch.length === 0) return;
		const seq = this.state.seq + 1;
		this.writing = true;
		try {
			await this.appendOnce(seq, batch);
		} catch (error) {
			this.fail(error);
			throw error;
		} finally {
			this.writing = false;
		}
		batch.forEach((record, index) => this.apply({
			seq: seq + index,
			record
		}));
		this.hasWritten = true;
		this.writesSinceCheckpoint += 1;
		if (this.writesSinceCheckpoint >= CHECKPOINT_EVERY) {
			this.writesSinceCheckpoint = 0;
			this.metadata?.set(CHECKPOINT_NAMESPACE, this.logId, normalize(serialize(this.state, this.versions))).catch(() => {});
		}
		this.wake();
	}
	/** Stop every session of the log. The host drops it, so the next open folds again. */
	fail(error) {
		this.failure = error;
		this.idle = true;
		for (const listener of [...this.failureListeners]) listener(error);
		this.onIdle();
	}
	/**
	* Append once. After an error, read back: the batch may have landed before
	* the error. When it did not land, a conflict fails at once, and another
	* error gets one more try.
	*/
	async appendOnce(seq, batch) {
		try {
			await this.store.append(this.logId, seq, batch);
			return;
		} catch (error) {
			if (await this.landed(seq, batch)) return;
			if (error instanceof LogConflictError) throw error;
		}
		try {
			await this.store.append(this.logId, seq, batch);
		} catch (error) {
			if (await this.landed(seq, batch)) return;
			throw error;
		}
	}
	async landed(seq, batch) {
		try {
			const entries = await this.store.read(this.logId, {
				after: seq - 1,
				limit: batch.length
			});
			return entries.length === batch.length && entries.every((entry, index) => sameJson(entry.record, batch[index]));
		} catch {
			return false;
		}
	}
	/**
	* Fold records that another writer appended. A host that only reads
	* follows the log. A writer that already wrote has lost the thread to
	* another host, so it stops, as after a conflict.
	*/
	async catchUp() {
		if (this.failure !== void 0) return;
		const entries = await this.store.read(this.logId, { after: this.state.seq });
		const [first] = entries;
		if (first && this.hasWritten) {
			this.fail(new LogConflictError(this.logId, first.seq));
			return;
		}
		for (const entry of entries) this.apply(entry);
		if (entries.length > 0) this.wake();
	}
	apply(entry) {
		foldLogEntry(this.state, entry, this.fold);
		const event = sessionEventOf(entry);
		if (!event) return;
		this.tail.push({
			thread: threadOf(entry.record, this.logId),
			entry: event
		});
		if (this.tail.length > MAX_TAIL) {
			const dropped = this.tail.shift();
			if (dropped) this.tailFrom = Number(dropped.entry.cursor);
		}
	}
	head() {
		return String(this.state.seq);
	}
	/** The events of session `thread`. A cursor is a position in the log. */
	async *read(thread, options) {
		const { signal, filter, until, isClosed } = options;
		const accepts = (entry) => filter ? filter(entry) : true;
		/** The events of this session in the tail after `after`. */
		const ownAfter = (after) => this.tail.filter((item) => item.thread === thread).map((item) => item.entry).filter((entry) => Number(entry.cursor) > after && accepts(entry));
		let after = Number(options.from ?? "0");
		if (!Number.isFinite(after)) after = 0;
		for (;;) {
			if (signal?.aborted) return;
			if (after < this.tailFrom) {
				const upTo = this.tailFrom;
				const page = await this.store.read(this.logId, {
					after,
					limit: READ_PAGE
				});
				for (const entry of page) {
					if (entry.seq > upTo || signal?.aborted) break;
					after = entry.seq;
					const event = sessionEventOf(entry);
					const isOwn = threadOf(entry.record, this.logId) === thread;
					if (event && isOwn && accepts(event)) yield event;
				}
				if (page.length === 0) after = upTo;
				continue;
			}
			const next = ownAfter(after);
			for (const entry of next) {
				if (signal?.aborted) return;
				after = Number(entry.cursor);
				yield entry;
			}
			if (next.length === 0) after = Math.max(after, this.state.seq);
			if (isClosed() || until?.()) {
				yield* ownAfter(after);
				return;
			}
			if (next.length > 0) continue;
			await this.waitForNext(signal);
		}
	}
	wake() {
		const waiters = [...this.waiters];
		this.waiters.clear();
		for (const wake of waiters) wake();
	}
	waitForNext(signal) {
		return new Promise((resolve) => {
			if (signal?.aborted) return resolve();
			const done = () => {
				signal?.removeEventListener("abort", done);
				this.waiters.delete(done);
				resolve();
			};
			this.waiters.add(done);
			signal?.addEventListener("abort", done, { once: true });
		});
	}
};
/** Join two adjacent deltas of one message or tool call. */
function mergeDelta(first, second) {
	const rest = "delta" in second && typeof second.delta === "string" ? second.delta : void 0;
	if (rest === void 0) return second;
	if (first.type === EventType.TEXT_MESSAGE_CONTENT || first.type === EventType.REASONING_MESSAGE_CONTENT || first.type === EventType.TOOL_CALL_ARGS) return {
		...first,
		delta: first.delta + rest,
		timestamp: second.timestamp
	};
	return second;
}
function sessionEventOf(entry) {
	const { record } = entry;
	if (!isHarnessRecord(record) || record.type !== "harness.event") return;
	return {
		cursor: String(entry.seq),
		operationId: record.operationId,
		event: record.event
	};
}
/**
* The `MessageStore` a durable session gives `withPersistence`. Its own
* thread goes through the session's writer. Another thread (a subagent
* transcript) reads and appends that thread's log directly.
*/
function sessionMessageStore(options) {
	const { writer } = options;
	const other = logMessageStore({
		store: options.store,
		...options.project ? { project: options.project } : {}
	});
	return {
		loadThread: async (threadId) => threadId === writer.threadId ? [...writer.state.messages] : other.loadThread(threadId),
		saveThread: (threadId, list) => threadId === writer.threadId ? writer.commit({ messages: list }) : other.saveThread(threadId, list)
	};
}
/**
* The `MessageStore` the chat engine of a durable session saves through
* (`withPersistence` and the checkpoints). It remembers the list the engine
* holds. A host record can change the fold while the engine runs, and the
* engine does not see that until its next model call. So a save that only
* adds messages to what the engine holds puts them on top of the current
* fold, and a projected message is not lost. `beforeModel` commits the
* engine's list and gives the model the fold, so the two are the same at
* every model call.
*/
function engineMessageStore(options) {
	const { writer } = options;
	const shared = sessionMessageStore(options);
	const fold = () => [...writer.state.messages];
	let held = fold();
	/**
	* What to write for an engine save of `list`, when the engine held `base`:
	*
	* - The fold only added host messages after `base`: the engine's new
	*   messages go first, then the host messages. So a signal never lands
	*   between a tool call and its result.
	* - A host record rewrote the fold (a compaction): the engine's new
	*   messages go after the rewritten fold.
	* - The engine changed older messages itself (a compaction middleware, or
	*   the run tags of `withPersistence` at the end of a turn): `list` wins,
	*   and host messages that the fold added after `base` stay after it.
	*/
	const rebase = (base, list) => {
		const current = writer.state.messages;
		const isFoldExtension = commonPrefix(base, current) === base.length;
		const hostAdded = isFoldExtension ? current.slice(base.length) : [];
		if (!(commonPrefix(base, list) === base.length)) return [...list, ...hostAdded];
		const added = list.slice(base.length);
		return isFoldExtension ? [
			...base,
			...added,
			...hostAdded
		] : [...current, ...added];
	};
	return {
		loadThread: async (threadId) => {
			if (threadId !== writer.threadId) return shared.loadThread(threadId);
			held = fold();
			return [...held];
		},
		saveThread: (threadId, list) => {
			if (threadId !== writer.threadId) return shared.saveThread(threadId, list);
			const target = rebase(held, list);
			held = [...list];
			return writer.commit({ messages: target });
		},
		/**
		* Before each model call: commit the engine's `list` (it has the tool
		* results of the last phase) on top of the fold, with `records` in the
		* same append. Returns the list the model gets when a host record
		* changed it, else `undefined`.
		*/
		beforeModel: async (list, records = []) => {
			const target = rebase(held, [...list]);
			held = [...target];
			await writer.commit({
				messages: target,
				records
			});
			return target.length === list.length && commonPrefix(target, list) === list.length ? void 0 : [...target];
		},
		/**
		* Host records from a middleware of the running turn. The messages that
		* the engine added since its last save (the tool results of the last
		* phase) go first in the same append, as a save puts them. So a record
		* that counts them lands on a fold that has them. A `list` that changed
		* older messages is not written: the last save keeps them (for example
		* the run id that `withPersistence` puts on a reply). A `list` with no
		* new messages appends only the records, so the staged records of a
		* running tool batch stay staged.
		*/
		appendRecords: (list, records) => {
			if (commonPrefix(held, list) < held.length || list.length === held.length) return writer.append(records);
			const target = rebase(held, [...list]);
			held = [...list];
			return writer.commit({
				messages: target,
				records
			});
		}
	};
}
/**
* A `MessageStore` view of a session log, for a reader outside a session
* (for example `reconstructChat`). `loadThread` folds the log. `saveThread`
* appends the change as one transcript record.
*
* @example
* ```ts
* reconstructChat({ persistence: { stores: { messages: logMessageStore({ store: log }) } }, ... })
* ```
*/
function logMessageStore(options) {
	const { store, project } = options;
	const logOf = (threadId) => options.logId ?? threadId;
	const load = (threadId) => loadLogState({
		store,
		logId: logOf(threadId),
		...project ? { project } : {}
	});
	return {
		loadThread: async (threadId) => sessionOf(await load(threadId), threadId).messages,
		saveThread: async (threadId, list) => {
			for (let attempt = 1;; attempt += 1) {
				const state = await load(threadId);
				const records = transcriptRecord(sessionOf(state, threadId).messages, list).map((record) => logOf(threadId) === threadId ? record : {
					...record,
					thread: threadId
				});
				if (records.length === 0) return;
				try {
					await store.append(logOf(threadId), state.seq + 1, records);
					return;
				} catch (error) {
					if (!(error instanceof LogConflictError) || attempt === 2) throw error;
				}
			}
		}
	};
}
//#endregion
export { SharedLog, commonPrefix, emptyLogState, emptySharedLogState, engineMessageStore, foldEntry, foldLogEntry, loadLogState, logMessageStore, revertOf, sessionMessageStore, sessionOf, stepKey, threadOf };

//# sourceMappingURL=log.js.map