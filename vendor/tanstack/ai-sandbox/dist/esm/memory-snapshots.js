import { SandboxCheckpointConflictError, SandboxCheckpointDuplicateIdError, SandboxCheckpointError, SandboxCheckpointInvalidEntryError, SandboxCheckpointInvalidIdError, SandboxCheckpointNotHeadError, SandboxCheckpointParentMismatchError, SandboxCheckpointWriterConflictError, SandboxCheckpointWriterLostError } from "./checkpoint-store.js";
import { createSandboxSnapshots } from "./snapshot-operations.js";
//#region src/memory-snapshots.ts
function resolveBlobRange(size, range) {
	if (!Number.isInteger(range.offset) || range.offset < 0 || range.offset >= size) throw new RangeError(`Blob range offset ${range.offset} is outside the object (size ${size}).`);
	const remaining = size - range.offset;
	if (range.length === void 0) return {
		offset: range.offset,
		length: remaining
	};
	if (!Number.isInteger(range.length) || range.length < 0) throw new RangeError(`Blob range length ${range.length} is not valid.`);
	return {
		offset: range.offset,
		length: Math.min(range.length, remaining)
	};
}
var encoder = new TextEncoder();
var compare = (a, b) => {
	const left = encoder.encode(a);
	const right = encoder.encode(b);
	for (let i = 0; i < Math.min(left.length, right.length); i++) {
		const leftByte = left[i];
		const rightByte = right[i];
		if (leftByte !== rightByte) return (leftByte ?? 0) - (rightByte ?? 0);
	}
	return left.length - right.length;
};
var clone = (value) => structuredClone(value);
function hasUnpairedSurrogate(value) {
	for (let index = 0; index < value.length; index++) {
		const code = value.charCodeAt(index);
		if (code >= 55296 && code <= 56319) {
			const next = value.charCodeAt(index + 1);
			if (Number.isNaN(next) || next < 56320 || next > 57343) return true;
			index++;
		} else if (code >= 56320 && code <= 57343) return true;
	}
	return false;
}
function assertValidIdentifier(value, label) {
	if (typeof value !== "string" || value.length === 0 || hasUnpairedSurrogate(value)) throw new SandboxCheckpointInvalidIdError(`${label} must be a non-empty well-formed Unicode string`);
}
function hasOwn(value, key) {
	return Object.prototype.hasOwnProperty.call(value, key);
}
function validateEntries(checkpoint) {
	if (!Array.isArray(checkpoint.files)) throw new SandboxCheckpointInvalidEntryError("Checkpoint files must be an array");
	const paths = /* @__PURE__ */ new Set();
	const kinds = /* @__PURE__ */ new Map();
	for (const entry of checkpoint.files) {
		if (entry === null || typeof entry !== "object") throw new SandboxCheckpointInvalidEntryError("Checkpoint entry must be an object");
		const candidate = entry;
		if (typeof candidate.path !== "string" || candidate.path.length === 0 || candidate.path.includes("\0") || candidate.path.startsWith("/") || candidate.path.startsWith("\\") || /^[A-Za-z]:([\\/]|$)/.test(candidate.path) || candidate.path.includes("\\") || candidate.path.split("/").some((part) => part.length === 0 || part === "." || part === "..")) throw new SandboxCheckpointInvalidEntryError("Checkpoint entry path must be a normalized workspace-relative path");
		const path = candidate.path;
		if (paths.has(path)) throw new SandboxCheckpointInvalidEntryError(`Checkpoint contains duplicate entry path '${path}'`);
		for (let separator = path.indexOf("/"); separator !== -1; separator = path.indexOf("/", separator + 1)) {
			const ancestor = path.slice(0, separator);
			if (kinds.get(ancestor) === "file") throw new SandboxCheckpointInvalidEntryError(`Checkpoint entry '${path}' is beneath file '${ancestor}'`);
		}
		if (candidate.kind === "file" && Array.from(kinds.keys()).some((other) => other.startsWith(`${path}/`))) throw new SandboxCheckpointInvalidEntryError(`Checkpoint file '${path}' is an ancestor of another entry`);
		paths.add(path);
		if (candidate.kind === "file") {
			if (typeof candidate.blobKey !== "string" || candidate.blobKey.length === 0 || hasUnpairedSurrogate(candidate.blobKey) || !/^sandbox-files\/sha256\/[0-9a-f]{64}$/.test(candidate.blobKey)) throw new SandboxCheckpointInvalidEntryError("File entries require a valid content-addressed blobKey");
			if (!hasOwn(candidate, "size") || typeof candidate.size !== "number" || !Number.isSafeInteger(candidate.size) || candidate.size < 0) throw new SandboxCheckpointInvalidEntryError("File entry size must be a non-negative safe integer");
		} else if (candidate.kind === "dir") {
			if (hasOwn(candidate, "blobKey") || hasOwn(candidate, "size")) throw new SandboxCheckpointInvalidEntryError("Directory entries cannot contain file fields");
		} else throw new SandboxCheckpointInvalidEntryError("Checkpoint entry kind must be file or dir");
		kinds.set(path, candidate.kind);
	}
}
function validateArtifacts(checkpoint) {
	if (!Array.isArray(checkpoint.artifacts)) throw new SandboxCheckpointInvalidEntryError("Checkpoint artifacts must be an array");
	for (const artifact of checkpoint.artifacts) {
		if (artifact === null || typeof artifact !== "object") throw new SandboxCheckpointInvalidEntryError("Checkpoint artifact must be an object");
		const candidate = artifact;
		if (typeof candidate.artifactId !== "string" || candidate.artifactId.length === 0 || hasUnpairedSurrogate(candidate.artifactId) || typeof candidate.name !== "string" || candidate.name.length === 0 || typeof candidate.mimeType !== "string" || candidate.mimeType.length === 0 || typeof candidate.blobKey !== "string" || candidate.blobKey.length === 0 || hasUnpairedSurrogate(candidate.blobKey) || !/^sandbox-artifacts\/sha256\/[0-9a-f]{64}$/.test(candidate.blobKey) || typeof candidate.size !== "number" || !Number.isSafeInteger(candidate.size) || candidate.size < 0 || typeof candidate.createdAt !== "number" || !Number.isFinite(candidate.createdAt)) throw new SandboxCheckpointInvalidEntryError("Checkpoint artifact has invalid fields");
	}
}
function validateCheckpoint(checkpoint) {
	assertValidIdentifier(checkpoint.id, "Checkpoint id");
	assertValidIdentifier(checkpoint.threadId, "Checkpoint thread id");
	if (checkpoint.parentCheckpointId !== null) assertValidIdentifier(checkpoint.parentCheckpointId, "Parent checkpoint id");
	if (!Number.isFinite(checkpoint.createdAt)) throw new SandboxCheckpointInvalidEntryError("Checkpoint createdAt must be a finite number");
	validateEntries(checkpoint);
	validateArtifacts(checkpoint);
}
function blobKeys(checkpoint) {
	const keys = /* @__PURE__ */ new Set();
	for (const entry of checkpoint.files) if (entry.kind === "file") keys.add(entry.blobKey);
	for (const artifact of checkpoint.artifacts) keys.add(artifact.blobKey);
	return keys;
}
var MemorySnapshotCheckpointStore = class {
	state;
	now = () => Date.now();
	leaseDurationMs = 12e4;
	renewAfterMs = 45e3;
	constructor(state) {
		this.state = state;
	}
	async get(id) {
		assertValidIdentifier(id, "Checkpoint id");
		const checkpoint = this.state.checkpoints.get(id);
		return checkpoint ? clone(checkpoint) : null;
	}
	async list(threadId) {
		assertValidIdentifier(threadId, "Thread id");
		return [...this.state.checkpoints.values()].filter((checkpoint) => checkpoint.threadId === threadId).sort((a, b) => a.createdAt - b.createdAt || compare(a.id, b.id)).map(clone);
	}
	async getHead(threadId) {
		assertValidIdentifier(threadId, "Thread id");
		return this.state.heads.get(threadId) ?? null;
	}
	async append(input) {
		const checkpoint = clone(input.checkpoint);
		const { expectedHeadId, writer } = input;
		assertValidIdentifier(checkpoint.id, "Checkpoint id");
		assertValidIdentifier(checkpoint.threadId, "Checkpoint thread id");
		assertValidIdentifier(writer.threadId, "Writer thread id");
		if (expectedHeadId !== null) assertValidIdentifier(expectedHeadId, "Expected head id");
		if (checkpoint.parentCheckpointId != null) assertValidIdentifier(checkpoint.parentCheckpointId, "Parent checkpoint id");
		if (writer.threadId !== checkpoint.threadId) throw new SandboxCheckpointWriterLostError("Checkpoint writer thread does not match checkpoint thread");
		validateCheckpoint(checkpoint);
		this.assertWriter(writer, checkpoint.threadId);
		if (this.state.checkpoints.has(checkpoint.id)) throw new SandboxCheckpointDuplicateIdError(`Checkpoint '${checkpoint.id}' already exists`);
		const actualHeadId = this.state.heads.get(checkpoint.threadId) ?? null;
		if (actualHeadId !== expectedHeadId) throw new SandboxCheckpointConflictError(`Expected head '${expectedHeadId}', but thread '${checkpoint.threadId}' is at '${actualHeadId}'`);
		const parentCheckpointId = checkpoint.parentCheckpointId ?? null;
		if (parentCheckpointId !== expectedHeadId) throw new SandboxCheckpointParentMismatchError(`Checkpoint '${checkpoint.id}' parent does not match expected head`);
		const stored = {
			...checkpoint,
			parentCheckpointId
		};
		const keys = blobKeys(stored);
		this.state.checkpoints.set(stored.id, stored);
		this.state.heads.set(stored.threadId, stored.id);
		for (const key of keys) this.state.references.set(key, (this.state.references.get(key) ?? 0) + 1);
		return { headId: stored.id };
	}
	async deleteHead(input) {
		const { threadId, checkpointId, writer } = input;
		assertValidIdentifier(threadId, "Thread id");
		assertValidIdentifier(checkpointId, "Checkpoint id");
		assertValidIdentifier(writer.threadId, "Writer thread id");
		if (writer.threadId !== threadId) throw new SandboxCheckpointWriterLostError("Checkpoint writer thread does not match operation thread");
		this.assertWriter(writer, threadId);
		if ((this.state.heads.get(threadId) ?? null) !== checkpointId) throw new SandboxCheckpointNotHeadError(`Checkpoint '${checkpointId}' is not the current head of thread '${threadId}'`);
		const checkpoint = this.state.checkpoints.get(checkpointId);
		if (!checkpoint) throw new SandboxCheckpointNotHeadError(`Checkpoint '${checkpointId}' does not exist`);
		this.state.checkpoints.delete(checkpointId);
		if (checkpoint.parentCheckpointId) this.state.heads.set(threadId, checkpoint.parentCheckpointId);
		else this.state.heads.delete(threadId);
		for (const key of blobKeys(checkpoint)) {
			const references = (this.state.references.get(key) ?? 0) - 1;
			if (references > 0) this.state.references.set(key, references);
			else this.state.references.delete(key);
		}
	}
	async acquireWriter(threadId) {
		assertValidIdentifier(threadId, "Thread id");
		const current = this.state.writers.get(threadId);
		if (current && current.expiresAt > this.now()) throw new SandboxCheckpointWriterConflictError(`Thread '${threadId}' already has an active checkpoint writer`);
		const fence = (this.state.fences.get(threadId) ?? 0) + 1;
		this.state.fences.set(threadId, fence);
		const ownerToken = globalThis.crypto.randomUUID();
		const lease = {
			threadId,
			ownerToken,
			fence,
			expiresAt: this.now() + this.leaseDurationMs
		};
		this.state.writers.set(threadId, lease);
		return {
			...lease,
			get expiresAt() {
				return lease.expiresAt;
			},
			renewAfterMs: this.renewAfterMs,
			renew: async () => {
				this.assertWriter(lease, threadId);
				lease.expiresAt = this.now() + this.leaseDurationMs;
				return { expiresAt: lease.expiresAt };
			},
			release: async () => {
				const currentLease = this.state.writers.get(threadId);
				if (currentLease?.ownerToken === ownerToken && currentLease.fence === fence) this.state.writers.delete(threadId);
			}
		};
	}
	async listBlobReferences() {
		return [...this.state.references.entries()].sort(([a], [b]) => compare(a, b)).map(([key, references]) => ({
			key,
			references
		}));
	}
	async forkFromCheckpoint(input) {
		const sourceThreadId = input.sourceThreadId;
		const sourceCheckpointId = input.sourceCheckpointId;
		const destinationThreadId = input.destinationThreadId;
		const destinationCheckpointId = input.destinationCheckpointId;
		const createdAt = input.createdAt;
		const suppliedWriter = input.writer;
		const writer = {
			threadId: suppliedWriter.threadId,
			ownerToken: suppliedWriter.ownerToken,
			fence: suppliedWriter.fence
		};
		assertValidIdentifier(sourceThreadId, "Source thread id");
		assertValidIdentifier(sourceCheckpointId, "Source checkpoint id");
		assertValidIdentifier(destinationThreadId, "Destination thread id");
		assertValidIdentifier(destinationCheckpointId, "Destination checkpoint id");
		assertValidIdentifier(writer.threadId, "Writer thread id");
		if (!Number.isFinite(createdAt)) throw new SandboxCheckpointInvalidEntryError("Fork checkpoint createdAt must be a finite number");
		if (sourceThreadId === destinationThreadId) throw new SandboxCheckpointError("SANDBOX_SNAPSHOT_FORK_SOURCE_THREAD_MISMATCH", "Source and destination threads must differ");
		const source = this.state.checkpoints.get(sourceCheckpointId);
		if (!source) throw new SandboxCheckpointError("SANDBOX_SNAPSHOT_FORK_SOURCE_NOT_FOUND", "Source checkpoint was not found");
		if (source.threadId !== sourceThreadId) throw new SandboxCheckpointError("SANDBOX_SNAPSHOT_FORK_SOURCE_THREAD_MISMATCH", "Source checkpoint belongs to another thread");
		if (writer.threadId !== destinationThreadId) throw new SandboxCheckpointWriterLostError("Checkpoint writer thread does not match destination thread");
		this.assertWriter(writer, destinationThreadId);
		this.assertDestinationEmpty(destinationThreadId, destinationCheckpointId);
		const stagedCheckpoint = clone({
			id: destinationCheckpointId,
			threadId: destinationThreadId,
			parentCheckpointId: null,
			createdAt,
			reason: "fork-root",
			files: source.files,
			conversation: source.conversation,
			artifacts: source.artifacts
		});
		validateCheckpoint(stagedCheckpoint);
		const stagedTranscript = clone([...stagedCheckpoint.conversation]);
		const result = { checkpoint: clone(stagedCheckpoint) };
		const stagedReferences = [...blobKeys(stagedCheckpoint)].map((key) => ({
			key,
			references: (this.state.references.get(key) ?? 0) + 1
		}));
		this.assertWriter(writer, destinationThreadId);
		this.assertDestinationEmpty(destinationThreadId, destinationCheckpointId);
		this.state.messages.set(stagedCheckpoint.threadId, stagedTranscript);
		this.state.checkpoints.set(stagedCheckpoint.id, stagedCheckpoint);
		this.state.heads.set(stagedCheckpoint.threadId, stagedCheckpoint.id);
		for (const reference of stagedReferences) this.state.references.set(reference.key, reference.references);
		return result;
	}
	assertDestinationEmpty(destinationThreadId, destinationCheckpointId) {
		if (this.state.messages.has(destinationThreadId) || [...this.state.runs.values()].some((value) => value.threadId === destinationThreadId) || [...this.state.generations.values()].some((value) => value.threadId === destinationThreadId) || [...this.state.interrupts.values()].some((value) => value.threadId === destinationThreadId) || [...this.state.artifacts.values()].some((value) => value.threadId === destinationThreadId) || [...this.state.checkpoints.values()].some((value) => value.threadId === destinationThreadId) || this.state.heads.has(destinationThreadId) || this.state.checkpoints.has(destinationCheckpointId)) throw new SandboxCheckpointError("SANDBOX_SNAPSHOT_FORK_DESTINATION_NOT_EMPTY", "Destination thread is not empty");
	}
	assertWriter(writer, threadId) {
		const current = this.state.writers.get(threadId);
		if (!current || current.ownerToken !== writer.ownerToken || current.fence !== writer.fence || current.expiresAt <= this.now()) throw new SandboxCheckpointWriterLostError(`Checkpoint writer lease for thread '${threadId}' is no longer current`);
	}
};
async function bodyBytes(body) {
	if (typeof body === "string") return encoder.encode(body);
	if (body instanceof ArrayBuffer) return new Uint8Array(body.slice(0));
	if (ArrayBuffer.isView(body)) return new Uint8Array(body.buffer.slice(body.byteOffset, body.byteOffset + body.byteLength));
	if (typeof Blob !== "undefined" && body instanceof Blob) return new Uint8Array(await body.arrayBuffer());
	if (typeof ReadableStream !== "undefined" && body instanceof ReadableStream) {
		const reader = body.getReader();
		const parts = [];
		try {
			for (;;) {
				const next = await reader.read();
				if (next.done) break;
				parts.push(new Uint8Array(next.value));
			}
		} finally {
			reader.releaseLock();
		}
		const result = new Uint8Array(parts.reduce((total, part) => total + part.byteLength, 0));
		let offset = 0;
		for (const part of parts) {
			result.set(part, offset);
			offset += part.byteLength;
		}
		return result;
	}
	throw new TypeError("Unsupported blob body.");
}
async function memorySandboxSnapshots(options = {}) {
	const { persistence, checkpoints } = await createMemorySandboxSnapshots();
	return createSandboxSnapshots({
		persistence,
		checkpoints,
		...options
	});
}
async function createMemorySandboxSnapshots() {
	const messages = /* @__PURE__ */ new Map();
	const runs = /* @__PURE__ */ new Map();
	const generations = /* @__PURE__ */ new Map();
	const interrupts = /* @__PURE__ */ new Map();
	const metadata = /* @__PURE__ */ new Map();
	const artifacts = /* @__PURE__ */ new Map();
	const blobs = /* @__PURE__ */ new Map();
	const state = {
		messages,
		runs,
		generations,
		interrupts,
		metadata,
		artifacts,
		blobs,
		checkpoints: /* @__PURE__ */ new Map(),
		heads: /* @__PURE__ */ new Map(),
		writers: /* @__PURE__ */ new Map(),
		fences: /* @__PURE__ */ new Map(),
		references: /* @__PURE__ */ new Map()
	};
	let etag = 0;
	return {
		persistence: { stores: {
			messages: {
				loadThread: async (threadId) => messages.get(threadId)?.slice() ?? [],
				saveThread: async (threadId, value) => {
					messages.set(threadId, value.slice());
				}
			},
			runs: {
				createOrResume: async (input) => {
					const existing = runs.get(input.runId);
					if (existing) return existing;
					const record = {
						...input,
						status: input.status ?? "running"
					};
					runs.set(record.runId, record);
					return record;
				},
				update: async (runId, patch) => {
					const value = runs.get(runId);
					if (value) runs.set(runId, {
						...value,
						...patch
					});
				},
				get: async (runId) => runs.get(runId) ?? null,
				findActiveRun: async (threadId) => [...runs.values()].filter((run) => run.threadId === threadId && run.status === "running").sort((a, b) => b.startedAt - a.startedAt)[0] ?? null,
				listByThread: async (threadId) => [...runs.values()].filter((run) => run.threadId === threadId).sort((a, b) => a.startedAt - b.startedAt),
				listByParentRun: async (parentRunId) => [...runs.values()].filter((run) => run.parentRunId === parentRunId).sort((a, b) => a.startedAt - b.startedAt),
				listReclaimable: async (input) => [...runs.values()].filter((run) => run.status === "running" && run.detachedSince !== void 0 && run.detachedSince <= input.now - input.ttlMs)
			},
			generationRuns: {
				createOrResume: async (input) => {
					const value = generations.get(input.runId) ?? {
						...input,
						status: input.status ?? "running"
					};
					generations.set(input.runId, value);
					return value;
				},
				update: async (runId, patch) => {
					const value = generations.get(runId);
					if (value) generations.set(runId, {
						...value,
						...patch
					});
				},
				get: async (runId) => generations.get(runId) ?? null,
				findLatestForThread: async (threadId) => [...generations.values()].filter((run) => run.threadId === threadId).sort((a, b) => b.startedAt - a.startedAt)[0] ?? null
			},
			interrupts: {
				create: async (record) => {
					if (!interrupts.has(record.interruptId)) interrupts.set(record.interruptId, {
						...record,
						status: "pending"
					});
				},
				resolve: async (id, response) => {
					const value = interrupts.get(id);
					if (value) interrupts.set(id, {
						...value,
						status: "resolved",
						resolvedAt: Date.now(),
						response
					});
				},
				cancel: async (id) => {
					const value = interrupts.get(id);
					if (value) interrupts.set(id, {
						...value,
						status: "cancelled",
						resolvedAt: Date.now()
					});
				},
				get: async (id) => interrupts.get(id) ?? null,
				list: async (threadId) => [...interrupts.values()].filter((value) => value.threadId === threadId).sort((a, b) => a.requestedAt - b.requestedAt),
				listPending: async (threadId) => [...interrupts.values()].filter((value) => value.threadId === threadId && value.status === "pending").sort((a, b) => a.requestedAt - b.requestedAt),
				listByRun: async (runId) => [...interrupts.values()].filter((value) => value.runId === runId).sort((a, b) => a.requestedAt - b.requestedAt),
				listPendingByRun: async (runId) => [...interrupts.values()].filter((value) => value.runId === runId && value.status === "pending").sort((a, b) => a.requestedAt - b.requestedAt)
			},
			metadata: {
				get: async (namespace, key) => {
					const bucket = metadata.get(namespace);
					return bucket?.has(key) ? bucket.get(key) : null;
				},
				set: async (namespace, key, value) => {
					let bucket = metadata.get(namespace);
					if (!bucket) {
						bucket = /* @__PURE__ */ new Map();
						metadata.set(namespace, bucket);
					}
					bucket.set(key, value);
				},
				delete: async (namespace, key) => {
					metadata.get(namespace)?.delete(key);
				}
			},
			artifacts: {
				save: async (value) => {
					artifacts.set(value.artifactId, { ...value });
				},
				get: async (id) => artifacts.get(id) ?? null,
				list: async (runId) => [...artifacts.values()].filter((value) => value.runId === runId).sort((a, b) => a.createdAt - b.createdAt || compare(a.artifactId, b.artifactId)),
				listForThread: async (threadId) => [...artifacts.values()].filter((value) => value.threadId === threadId).sort((a, b) => a.createdAt - b.createdAt || compare(a.artifactId, b.artifactId)),
				delete: async (id) => {
					artifacts.delete(id);
				},
				deleteForRun: async (runId) => {
					for (const [id, value] of artifacts) if (value.runId === runId) artifacts.delete(id);
				}
			},
			blobs: {
				put: async (key, body, putOptions) => {
					const bytes = await bodyBytes(body);
					const now = Date.now();
					const record = {
						key,
						size: bytes.byteLength,
						etag: String(++etag),
						contentType: putOptions?.contentType ?? (typeof Blob !== "undefined" && body instanceof Blob ? body.type || void 0 : void 0),
						customMetadata: putOptions?.customMetadata ? { ...putOptions.customMetadata } : void 0,
						createdAt: blobs.get(key)?.record.createdAt ?? now,
						updatedAt: now
					};
					blobs.set(key, {
						record,
						bytes: new Uint8Array(bytes)
					});
					return clone(record);
				},
				get: async (key, getOptions) => {
					const value = blobs.get(key);
					if (!value) return null;
					const range = getOptions?.range ? resolveBlobRange(value.bytes.byteLength, getOptions.range) : {
						offset: 0,
						length: value.bytes.byteLength
					};
					const bytes = value.bytes.slice(range.offset, range.offset + range.length);
					return {
						...clone(value.record),
						...getOptions?.range ? { range } : {},
						body: new Blob([bytes]).stream(),
						arrayBuffer: async () => bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength),
						text: async () => new TextDecoder().decode(bytes)
					};
				},
				head: async (key) => clone(blobs.get(key)?.record ?? null),
				delete: async (key) => {
					blobs.delete(key);
				},
				list: async (listOptions) => {
					const keys = [...blobs.keys()].filter((key) => key.startsWith(listOptions?.prefix ?? "")).filter((key) => listOptions?.cursor === void 0 || key > listOptions.cursor).sort();
					if (listOptions?.limit === 0) return {
						objects: [],
						truncated: false
					};
					const page = listOptions?.limit === void 0 ? keys : keys.slice(0, listOptions.limit);
					const truncated = listOptions?.limit !== void 0 && keys.length > page.length;
					return {
						objects: clone(page.map((key) => {
							const value = blobs.get(key);
							if (!value) throw new Error(`Missing blob for listed key: ${key}`);
							return value.record;
						})),
						...truncated ? {
							cursor: page.at(-1),
							truncated: true
						} : {}
					};
				}
			}
		} },
		checkpoints: new MemorySnapshotCheckpointStore(state)
	};
}
//#endregion
export { memorySandboxSnapshots };

//# sourceMappingURL=memory-snapshots.js.map