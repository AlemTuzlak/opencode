import { LogConflictError, defineAIPersistence } from "./types.js";
import { resolveBlobRange } from "./blob-range.js";
//#region src/memory.ts
var compareUtf8Bytes = (left, right) => {
	const leftBytes = new TextEncoder().encode(left);
	const rightBytes = new TextEncoder().encode(right);
	const length = Math.min(leftBytes.length, rightBytes.length);
	for (let index = 0; index < length; index++) {
		const leftByte = leftBytes[index];
		const rightByte = rightBytes[index];
		if (leftByte !== rightByte) return (leftByte ?? 0) - (rightByte ?? 0);
	}
	return leftBytes.length - rightBytes.length;
};
var MemoryMessageStore = class {
	threads = /* @__PURE__ */ new Map();
	loadThread(threadId, _options) {
		return Promise.resolve(this.threads.get(threadId)?.slice() ?? []);
	}
	saveThread(threadId, messages) {
		this.threads.set(threadId, messages.slice());
		return Promise.resolve();
	}
};
var MemoryActivityStore = class {
	threads = /* @__PURE__ */ new Map();
	loadActivities(threadId) {
		return Promise.resolve(this.threads.get(threadId)?.slice() ?? []);
	}
	saveActivities(threadId, activities) {
		this.threads.set(threadId, activities.slice());
		return Promise.resolve();
	}
};
var MemoryRunStore = class {
	runs = /* @__PURE__ */ new Map();
	createOrResume(input) {
		const existing = this.runs.get(input.runId);
		if (existing) return Promise.resolve(existing);
		const record = {
			runId: input.runId,
			threadId: input.threadId,
			status: input.status ?? "running",
			startedAt: input.startedAt,
			...input.parentRunId !== void 0 ? { parentRunId: input.parentRunId } : {},
			...input.subagentRunId !== void 0 ? { subagentRunId: input.subagentRunId } : {},
			...input.name !== void 0 ? { name: input.name } : {},
			...input.kind !== void 0 ? { kind: input.kind } : {},
			...input.activity !== void 0 ? { activity: input.activity } : {},
			...input.agent !== void 0 ? { agent: input.agent } : {},
			...input.principal !== void 0 ? { principal: input.principal } : {}
		};
		this.runs.set(record.runId, record);
		return Promise.resolve(record);
	}
	update(runId, patch) {
		const existing = this.runs.get(runId);
		if (existing) this.runs.set(runId, {
			...existing,
			...patch
		});
		return Promise.resolve();
	}
	get(runId) {
		return Promise.resolve(this.runs.get(runId) ?? null);
	}
	findActiveRun(threadId) {
		const active = [...this.runs.values()].filter((run) => run.threadId === threadId && run.status === "running").sort((a, b) => b.startedAt - a.startedAt);
		return Promise.resolve(active[0] ?? null);
	}
	listByThread(threadId) {
		const matching = [...this.runs.values()].filter((run) => run.threadId === threadId).sort((a, b) => a.startedAt - b.startedAt);
		return Promise.resolve(matching);
	}
	listByParentRun(parentRunId) {
		const matching = [...this.runs.values()].filter((run) => run.parentRunId === parentRunId).sort((a, b) => a.startedAt - b.startedAt);
		return Promise.resolve(matching);
	}
	listReclaimable(opts) {
		const cutoff = opts.now - opts.ttlMs;
		const matching = [...this.runs.values()].filter((run) => run.status === "running" && run.detachedSince !== void 0 && run.detachedSince <= cutoff);
		return Promise.resolve(matching);
	}
};
var MemoryGenerationRunStore = class {
	generationRuns = /* @__PURE__ */ new Map();
	createOrResume(input) {
		const existing = this.generationRuns.get(input.runId);
		if (existing) return Promise.resolve(existing);
		const record = {
			runId: input.runId,
			threadId: input.threadId,
			activity: input.activity,
			provider: input.provider,
			model: input.model,
			status: input.status ?? "running",
			startedAt: input.startedAt
		};
		this.generationRuns.set(record.runId, record);
		return Promise.resolve(record);
	}
	update(runId, patch) {
		const existing = this.generationRuns.get(runId);
		if (existing) this.generationRuns.set(runId, {
			...existing,
			...patch
		});
		return Promise.resolve();
	}
	get(runId) {
		return Promise.resolve(this.generationRuns.get(runId) ?? null);
	}
	findLatestForThread(threadId) {
		const linked = [...this.generationRuns.values()].filter((run) => run.threadId === threadId).sort((a, b) => b.startedAt - a.startedAt);
		return Promise.resolve(linked[0] ?? null);
	}
};
function byRequestedAt(a, b) {
	return a.requestedAt - b.requestedAt;
}
var MemoryInterruptStore = class {
	interrupts = /* @__PURE__ */ new Map();
	create(record) {
		if (!this.interrupts.has(record.interruptId)) this.interrupts.set(record.interruptId, {
			...record,
			status: "pending"
		});
		return Promise.resolve();
	}
	resolve(interruptId, response) {
		const existing = this.interrupts.get(interruptId);
		if (existing) this.interrupts.set(interruptId, {
			...existing,
			status: "resolved",
			resolvedAt: Date.now(),
			response
		});
		return Promise.resolve();
	}
	cancel(interruptId) {
		const existing = this.interrupts.get(interruptId);
		if (existing) this.interrupts.set(interruptId, {
			...existing,
			status: "cancelled",
			resolvedAt: Date.now()
		});
		return Promise.resolve();
	}
	async commitBatch(entries) {
		const ids = /* @__PURE__ */ new Set();
		for (const entry of entries) {
			if (ids.has(entry.interruptId)) throw new Error(`Interrupt batch contains duplicate id: ${entry.interruptId}.`);
			ids.add(entry.interruptId);
			const existing = this.interrupts.get(entry.interruptId);
			if (!existing) throw new Error(`Interrupt batch references missing id: ${entry.interruptId}.`);
			if (existing.status !== "pending") throw new Error(`Interrupt batch references non-pending id: ${entry.interruptId}.`);
		}
		const resolvedAt = Date.now();
		for (const entry of entries) {
			const existing = this.interrupts.get(entry.interruptId);
			if (!existing) continue;
			if (entry.status === "resolved") this.interrupts.set(entry.interruptId, {
				...existing,
				status: "resolved",
				resolvedAt,
				response: entry.response
			});
			else this.interrupts.set(entry.interruptId, {
				...existing,
				status: "cancelled",
				resolvedAt
			});
		}
	}
	get(interruptId) {
		return Promise.resolve(this.interrupts.get(interruptId) ?? null);
	}
	list(threadId) {
		return Promise.resolve([...this.interrupts.values()].filter((interrupt) => interrupt.threadId === threadId).sort(byRequestedAt));
	}
	listPending(threadId) {
		return Promise.resolve([...this.interrupts.values()].filter((interrupt) => interrupt.threadId === threadId && interrupt.status === "pending").sort(byRequestedAt));
	}
	listByRun(runId) {
		return Promise.resolve([...this.interrupts.values()].filter((interrupt) => interrupt.runId === runId).sort(byRequestedAt));
	}
	listPendingByRun(runId) {
		return Promise.resolve([...this.interrupts.values()].filter((interrupt) => interrupt.runId === runId && interrupt.status === "pending").sort(byRequestedAt));
	}
};
var MemoryMetadataStore = class {
	values = /* @__PURE__ */ new Map();
	revisions = /* @__PURE__ */ new Map();
	revisionOf(namespace, key) {
		return this.revisions.get(namespace)?.get(key);
	}
	bump(namespace, key) {
		let bucket = this.revisions.get(namespace);
		if (!bucket) {
			bucket = /* @__PURE__ */ new Map();
			this.revisions.set(namespace, bucket);
		}
		const next = (bucket.get(key) ?? 0) + 1;
		bucket.set(key, next);
		return String(next);
	}
	getVersioned(namespace, key) {
		const bucket = this.values.get(namespace);
		if (!bucket || !bucket.has(key)) return Promise.resolve(null);
		return Promise.resolve({
			value: bucket.get(key),
			revision: String(this.revisionOf(namespace, key) ?? 0)
		});
	}
	async setIf(namespace, key, value, expectedRevision) {
		if ((this.values.get(namespace)?.has(key) ?? false ? String(this.revisionOf(namespace, key) ?? 0) : null) !== expectedRevision) return {
			ok: false,
			reason: "conflict"
		};
		await this.set(namespace, key, value);
		return {
			ok: true,
			revision: String(this.revisionOf(namespace, key))
		};
	}
	get(namespace, key) {
		const bucket = this.values.get(namespace);
		if (!bucket || !bucket.has(key)) return Promise.resolve(null);
		return Promise.resolve(bucket.get(key));
	}
	set(namespace, key, value) {
		let bucket = this.values.get(namespace);
		if (!bucket) {
			bucket = /* @__PURE__ */ new Map();
			this.values.set(namespace, bucket);
		}
		bucket.set(key, value);
		this.bump(namespace, key);
		return Promise.resolve();
	}
	delete(namespace, key) {
		const bucket = this.values.get(namespace);
		if (!bucket) return Promise.resolve();
		this.revisions.get(namespace)?.delete(key);
		bucket.delete(key);
		if (bucket.size === 0) this.values.delete(namespace);
		return Promise.resolve();
	}
};
var MemoryArtifactStore = class {
	artifacts = /* @__PURE__ */ new Map();
	save(record) {
		this.artifacts.set(record.artifactId, { ...record });
		return Promise.resolve();
	}
	get(artifactId) {
		return Promise.resolve(this.artifacts.get(artifactId) ?? null);
	}
	list(runId) {
		return Promise.resolve([...this.artifacts.values()].filter((a) => a.runId === runId).sort((a, b) => a.createdAt - b.createdAt || compareUtf8Bytes(a.artifactId, b.artifactId)));
	}
	listForThread(threadId) {
		return Promise.resolve([...this.artifacts.values()].filter((a) => a.threadId === threadId).sort((a, b) => a.createdAt - b.createdAt || compareUtf8Bytes(a.artifactId, b.artifactId)));
	}
	delete(artifactId) {
		this.artifacts.delete(artifactId);
		return Promise.resolve();
	}
	deleteForRun(runId) {
		for (const artifact of this.artifacts.values()) if (artifact.runId === runId) this.artifacts.delete(artifact.artifactId);
		return Promise.resolve();
	}
};
var textEncoder = new TextEncoder();
var textDecoder = new TextDecoder();
function copyBytes(bytes) {
	return new Uint8Array(bytes);
}
function bytesToArrayBuffer(bytes) {
	const buffer = new ArrayBuffer(bytes.byteLength);
	new Uint8Array(buffer).set(bytes);
	return buffer;
}
async function bytesFromStream(stream) {
	const reader = stream.getReader();
	const chunks = [];
	let total = 0;
	try {
		while (true) {
			const { done, value } = await reader.read();
			if (done) break;
			chunks.push(copyBytes(value));
			total += value.byteLength;
		}
	} finally {
		reader.releaseLock();
	}
	const bytes = new Uint8Array(total);
	let offset = 0;
	for (const chunk of chunks) {
		bytes.set(chunk, offset);
		offset += chunk.byteLength;
	}
	return bytes;
}
async function bytesFromBlobBody(body) {
	if (typeof body === "string") return textEncoder.encode(body);
	if (body instanceof ArrayBuffer) return new Uint8Array(body.slice(0));
	if (ArrayBuffer.isView(body)) return copyBytes(new Uint8Array(body.buffer, body.byteOffset, body.byteLength));
	if (typeof Blob !== "undefined" && body instanceof Blob) return new Uint8Array(await body.arrayBuffer());
	if (typeof ReadableStream !== "undefined" && body instanceof ReadableStream) return bytesFromStream(body);
	throw new TypeError("Unsupported blob body.");
}
function blobRecordSnapshot(record) {
	return {
		...record,
		...record.customMetadata ? { customMetadata: { ...record.customMetadata } } : {}
	};
}
function blobObject(record, bytes, range) {
	const served = range ? resolveBlobRange(bytes.byteLength, range) : {
		offset: 0,
		length: bytes.byteLength
	};
	const copied = copyBytes(bytes.subarray(served.offset, served.offset + served.length));
	return {
		...blobRecordSnapshot(record),
		...range ? { range: served } : {},
		body: new ReadableStream({ start(controller) {
			controller.enqueue(copyBytes(copied));
			controller.close();
		} }),
		arrayBuffer: () => Promise.resolve(bytesToArrayBuffer(copied)),
		text: () => Promise.resolve(textDecoder.decode(copied))
	};
}
var MemoryBlobStore = class {
	blobs = /* @__PURE__ */ new Map();
	nextEtag = 1;
	async put(key, body, options) {
		const bytes = await bytesFromBlobBody(body);
		const existing = this.blobs.get(key);
		const now = Date.now();
		const record = {
			key,
			size: bytes.byteLength,
			etag: String(this.nextEtag++),
			contentType: options?.contentType ?? (typeof Blob !== "undefined" && body instanceof Blob ? body.type || void 0 : void 0),
			customMetadata: options?.customMetadata ? { ...options.customMetadata } : void 0,
			createdAt: existing?.record.createdAt ?? now,
			updatedAt: now
		};
		this.blobs.set(key, {
			record,
			bytes: copyBytes(bytes)
		});
		return blobRecordSnapshot(record);
	}
	get(key, options) {
		const entry = this.blobs.get(key);
		return Promise.resolve(entry ? blobObject(entry.record, entry.bytes, options?.range) : null);
	}
	head(key) {
		const entry = this.blobs.get(key);
		return Promise.resolve(entry ? blobRecordSnapshot(entry.record) : null);
	}
	delete(key) {
		this.blobs.delete(key);
		return Promise.resolve();
	}
	list(options) {
		const limit = options?.limit;
		if (limit === 0) return Promise.resolve({
			objects: [],
			truncated: false
		});
		const keys = [...this.blobs.keys()].filter((key) => key.startsWith(options?.prefix ?? "")).filter((key) => options?.cursor === void 0 || key > options.cursor).sort();
		const pageKeys = limit === void 0 ? keys : keys.slice(0, limit);
		const objects = pageKeys.map((key) => {
			const blob = this.blobs.get(key);
			if (blob === void 0) throw new Error(`Missing blob for listed key: ${key}`);
			return blobRecordSnapshot(blob.record);
		});
		const truncated = limit !== void 0 && keys.length > limit;
		return Promise.resolve({
			objects,
			...truncated ? {
				cursor: pageKeys.at(-1),
				truncated
			} : {}
		});
	}
};
var MemoryInboxStore = class {
	entries = /* @__PURE__ */ new Map();
	append(entry) {
		const existing = this.entries.get(entry.inputId);
		if (existing) return Promise.resolve({ ...existing });
		const stored = {
			...entry,
			status: "pending"
		};
		this.entries.set(entry.inputId, stored);
		return Promise.resolve({ ...stored });
	}
	listPending(threadId) {
		const pending = [...this.entries.values()].filter((entry) => entry.threadId === threadId && entry.status === "pending").sort((a, b) => a.createdAt - b.createdAt).map((entry) => ({ ...entry }));
		return Promise.resolve(pending);
	}
	markApplied(inputId, operationId) {
		const existing = this.entries.get(inputId);
		if (existing) this.entries.set(inputId, {
			...existing,
			status: "applied",
			operationId
		});
		return Promise.resolve();
	}
	markRejected(inputId, reason) {
		const existing = this.entries.get(inputId);
		if (existing) this.entries.set(inputId, {
			...existing,
			status: "rejected",
			reason
		});
		return Promise.resolve();
	}
	get(inputId) {
		const existing = this.entries.get(inputId);
		return Promise.resolve(existing ? { ...existing } : null);
	}
};
var MemoryCredentialStore = class {
	values = /* @__PURE__ */ new Map();
	owner(scope) {
		return JSON.stringify([scope.tenantId ?? null, scope.userId ?? null]);
	}
	get(scope, id) {
		const stored = this.values.get(this.owner(scope))?.get(id);
		return Promise.resolve(stored ? { ...stored } : null);
	}
	set(scope, id, credential) {
		const key = this.owner(scope);
		let bucket = this.values.get(key);
		if (!bucket) {
			bucket = /* @__PURE__ */ new Map();
			this.values.set(key, bucket);
		}
		bucket.set(id, { ...credential });
		return Promise.resolve();
	}
	delete(scope, id) {
		this.values.get(this.owner(scope))?.delete(id);
		return Promise.resolve();
	}
	list(scope) {
		const bucket = this.values.get(this.owner(scope));
		return Promise.resolve([...bucket?.entries() ?? []].map(([id, credential]) => ({
			id,
			type: credential.type,
			...credential.type === "oauth" && credential.expiresAt !== void 0 ? { expiresAt: credential.expiresAt } : {}
		})));
	}
};
var MemoryWorkClaimStore = class {
	claims = /* @__PURE__ */ new Map();
	claim(entry) {
		const held = this.claims.get(entry.threadId);
		if (held !== void 0 && held.ownerId !== entry.ownerId && held.until > Date.now()) return Promise.resolve(false);
		this.claims.set(entry.threadId, { ...entry });
		return Promise.resolve(true);
	}
	release(threadId, ownerId) {
		if (this.claims.get(threadId)?.ownerId === ownerId) this.claims.delete(threadId);
		return Promise.resolve();
	}
	listExpired(options) {
		const expired = [...this.claims.values()].filter((claim) => claim.until <= options.now).sort((a, b) => a.until - b.until).slice(0, options.limit ?? Number.POSITIVE_INFINITY).map(({ threadId, harness }) => ({
			threadId,
			harness
		}));
		return Promise.resolve(expired);
	}
};
var bySessionOrder = (a, b) => b.updatedAt - a.updatedAt || compareUtf8Bytes(a.threadId, b.threadId);
function parseSessionCursor(cursor) {
	const split = cursor.indexOf(":");
	const updatedAt = Number(cursor.slice(0, split));
	if (split <= 0 || !Number.isFinite(updatedAt)) throw new Error(`Invalid session index cursor: ${cursor}`);
	return {
		updatedAt,
		threadId: cursor.slice(split + 1)
	};
}
var MemorySessionIndexStore = class {
	entries = /* @__PURE__ */ new Map();
	upsert(entry) {
		this.entries.set(entry.threadId, structuredClone(entry));
		return Promise.resolve();
	}
	get(threadId) {
		const entry = this.entries.get(threadId);
		return Promise.resolve(entry && structuredClone(entry));
	}
	list(options = {}) {
		const { limit, cursor, parentThreadId, principal, search, harness } = options;
		const after = cursor === void 0 ? void 0 : parseSessionCursor(cursor);
		const needle = search?.toLowerCase();
		const metadata = Object.entries(options.metadata ?? {});
		const matching = [...this.entries.values()].filter((entry) => {
			const isChild = parentThreadId === void 0 || (entry.parentThreadId ?? null) === parentThreadId;
			const isSameTenant = principal?.tenantId === void 0 || entry.principal?.tenantId === principal.tenantId;
			const isOwned = principal === void 0 || entry.principal?.id === principal.id && isSameTenant;
			const isAfterCursor = after === void 0 || bySessionOrder(after, entry) < 0;
			const isFound = needle === void 0 || (entry.title?.toLowerCase().includes(needle) ?? false);
			const isHarness = harness === void 0 || entry.harness === harness;
			const hasMetadata = metadata.every(([key, value]) => entry.metadata?.[key] === value);
			return isChild && isOwned && isFound && isHarness && hasMetadata && isAfterCursor;
		}).sort(bySessionOrder);
		const page = limit === void 0 ? matching : matching.slice(0, limit);
		const last = page.at(-1);
		const hasMore = limit !== void 0 && matching.length > limit && last !== void 0;
		return Promise.resolve({
			entries: page.map((entry) => structuredClone(entry)),
			...hasMore ? {
				cursor: `${last.updatedAt}:${last.threadId}`,
				truncated: true
			} : {}
		});
	}
	delete(threadId) {
		this.entries.delete(threadId);
		return Promise.resolve();
	}
};
/** A JSON copy, so the log never shares an object with a caller. */
var copyRecord = (record) => JSON.parse(JSON.stringify(record));
var MemoryLogStore = class {
	threads = /* @__PURE__ */ new Map();
	listeners = /* @__PURE__ */ new Map();
	append(threadId, seq, records) {
		if (records.length === 0) return Promise.resolve();
		const log = this.threads.get(threadId) ?? [];
		if (seq !== log.length + 1) return Promise.reject(new LogConflictError(threadId, seq));
		let copies;
		try {
			copies = records.map(copyRecord);
		} catch (error) {
			return Promise.reject(error);
		}
		log.push(...copies);
		this.threads.set(threadId, log);
		for (const listener of [...this.listeners.get(threadId) ?? []]) listener();
		return Promise.resolve();
	}
	read(threadId, options) {
		const log = this.threads.get(threadId) ?? [];
		const after = options?.after ?? 0;
		const end = options?.limit === void 0 ? log.length : after + options.limit;
		const entries = log.slice(after, end).map((record, index) => ({
			seq: after + index + 1,
			record: copyRecord(record)
		}));
		return Promise.resolve(entries);
	}
	subscribe(threadId, listener) {
		let set = this.listeners.get(threadId);
		if (!set) {
			set = /* @__PURE__ */ new Set();
			this.listeners.set(threadId, set);
		}
		set.add(listener);
		return () => {
			set.delete(listener);
		};
	}
};
/**
* In-process reference {@link LogStore}, for tests and one-process hosts. The
* log is lost when the process stops. Records are JSON-copied in and out.
*
* @example
* ```ts
* const host = createHarnessHost({
*   persistence: { stores: { log: memoryLogStore(), runs } },
* })
* ```
*/
function memoryLogStore() {
	return new MemoryLogStore();
}
/**
* In-process reference backend for the full state + generation store set.
*
* Returns messages + activities + runs + generationRuns + interrupts +
* metadata + artifacts + blobs + inbox + credentials + sessions + workClaims.
* Locks are not included. Use `InMemoryLockStore` + `withLocks` from
* `@tanstack/ai` when a test or single-process app needs coordination.
*/
function memoryPersistence() {
	const stores = {
		messages: new MemoryMessageStore(),
		activities: new MemoryActivityStore(),
		runs: new MemoryRunStore(),
		generationRuns: new MemoryGenerationRunStore(),
		interrupts: new MemoryInterruptStore(),
		metadata: new MemoryMetadataStore(),
		inbox: new MemoryInboxStore(),
		credentials: new MemoryCredentialStore(),
		workClaims: new MemoryWorkClaimStore(),
		sessions: new MemorySessionIndexStore(),
		artifacts: new MemoryArtifactStore(),
		blobs: new MemoryBlobStore()
	};
	return defineAIPersistence({ stores });
}
//#endregion
export { memoryLogStore, memoryPersistence };

//# sourceMappingURL=memory.js.map