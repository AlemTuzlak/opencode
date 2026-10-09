//#region src/checkpoint-store.ts
var utf8Encoder = new TextEncoder();
var compareUtf8Bytes = (left, right) => {
	const leftBytes = utf8Encoder.encode(left);
	const rightBytes = utf8Encoder.encode(right);
	const length = Math.min(leftBytes.length, rightBytes.length);
	for (let index = 0; index < length; index++) {
		const leftByte = leftBytes[index];
		const rightByte = rightBytes[index];
		if (leftByte !== rightByte) return (leftByte ?? 0) - (rightByte ?? 0);
	}
	return leftBytes.length - rightBytes.length;
};
function isForkCapableSandboxCheckpointStore(store) {
	return typeof store.forkFromCheckpoint === "function";
}
var SandboxCheckpointError = class extends Error {
	code;
	constructor(code, message) {
		super(message);
		this.name = "SandboxCheckpointError";
		this.code = code;
	}
};
var SandboxCheckpointConflictError = class extends SandboxCheckpointError {
	constructor(message) {
		super("SANDBOX_SNAPSHOT_STALE_HEAD", message);
		this.name = "SandboxCheckpointConflictError";
	}
};
var SandboxCheckpointDuplicateIdError = class extends SandboxCheckpointError {
	constructor(message) {
		super("SANDBOX_SNAPSHOT_DUPLICATE_ID", message);
		this.name = "SandboxCheckpointDuplicateIdError";
	}
};
var SandboxCheckpointInvalidIdError = class extends SandboxCheckpointError {
	constructor(message) {
		super("SANDBOX_SNAPSHOT_INVALID_ID", message);
		this.name = "SandboxCheckpointInvalidIdError";
	}
};
var SandboxCheckpointInvalidEntryError = class extends SandboxCheckpointError {
	constructor(message) {
		super("SANDBOX_SNAPSHOT_INVALID_ENTRY", message);
		this.name = "SandboxCheckpointInvalidEntryError";
	}
};
var SandboxCheckpointParentMismatchError = class extends SandboxCheckpointError {
	constructor(message) {
		super("SANDBOX_SNAPSHOT_PARENT_MISMATCH", message);
		this.name = "SandboxCheckpointParentMismatchError";
	}
};
var SandboxCheckpointNotHeadError = class extends SandboxCheckpointError {
	constructor(message) {
		super("SANDBOX_SNAPSHOT_NOT_HEAD", message);
		this.name = "SandboxCheckpointNotHeadError";
	}
};
var SandboxCheckpointWriterConflictError = class extends SandboxCheckpointError {
	constructor(message) {
		super("SANDBOX_SNAPSHOT_WRITER_CONFLICT", message);
		this.name = "SandboxCheckpointWriterConflictError";
	}
};
var SandboxCheckpointWriterLostError = class extends SandboxCheckpointError {
	constructor(message) {
		super("SANDBOX_SNAPSHOT_WRITER_LOST", message);
		this.name = "SandboxCheckpointWriterLostError";
	}
};
function defineSandboxCheckpointStore(store) {
	return store;
}
function copy(value) {
	return structuredClone(value);
}
function blobKeys(checkpoint) {
	const keys = /* @__PURE__ */ new Set();
	for (const entry of checkpoint.files) if (entry.kind === "file") keys.add(entry.blobKey);
	for (const artifact of checkpoint.artifacts) keys.add(artifact.blobKey);
	return keys;
}
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
			if (typeof candidate.blobKey !== "string" || candidate.blobKey.length === 0 || hasUnpairedSurrogate(candidate.blobKey) || !/^sandbox-files\/sha256\/[0-9a-f]{64}$/.test(candidate.blobKey)) throw new SandboxCheckpointInvalidEntryError("File entries require a non-empty blobKey");
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
var InMemorySandboxCheckpointStore = class {
	state;
	now;
	leaseDurationMs;
	renewAfterMs;
	constructor(options = {}) {
		const state = {
			checkpoints: /* @__PURE__ */ new Map(),
			heads: /* @__PURE__ */ new Map(),
			writers: /* @__PURE__ */ new Map(),
			fences: /* @__PURE__ */ new Map(),
			references: /* @__PURE__ */ new Map()
		};
		this.state = state;
		this.now = options.now ?? (() => Date.now());
		this.leaseDurationMs = options.leaseDurationMs ?? 12e4;
		this.renewAfterMs = options.renewAfterMs ?? 45e3;
		if (!Number.isFinite(this.leaseDurationMs) || this.leaseDurationMs <= 0) throw new Error("leaseDurationMs must be finite and positive");
		if (!Number.isFinite(this.renewAfterMs) || this.renewAfterMs <= 0 || this.renewAfterMs >= this.leaseDurationMs) throw new Error("renewAfterMs must be finite, positive, and less than leaseDurationMs");
	}
	async get(id) {
		assertValidIdentifier(id, "Checkpoint id");
		const checkpoint = this.state.checkpoints.get(id);
		return checkpoint ? copy(checkpoint) : null;
	}
	async list(threadId) {
		assertValidIdentifier(threadId, "Thread id");
		return Array.from(this.state.checkpoints.values()).filter((checkpoint) => checkpoint.threadId === threadId).sort((a, b) => a.createdAt - b.createdAt || compareUtf8Bytes(a.id, b.id)).map(copy);
	}
	async getHead(threadId) {
		assertValidIdentifier(threadId, "Thread id");
		return this.state.heads.get(threadId) ?? null;
	}
	async append(input) {
		const checkpoint = copy(input.checkpoint);
		const { expectedHeadId, writer } = input;
		assertValidIdentifier(checkpoint.threadId, "Checkpoint thread id");
		assertValidIdentifier(writer.threadId, "Writer thread id");
		assertValidIdentifier(checkpoint.id, "Checkpoint id");
		if (expectedHeadId !== null) assertValidIdentifier(expectedHeadId, "Expected head id");
		if (checkpoint.parentCheckpointId != null) assertValidIdentifier(checkpoint.parentCheckpointId, "Parent checkpoint id");
		if (writer.threadId !== checkpoint.threadId) throw new SandboxCheckpointWriterLostError("Checkpoint writer thread does not match checkpoint thread");
		if (typeof checkpoint.id !== "string" || checkpoint.id.length === 0) throw new SandboxCheckpointInvalidIdError("Checkpoint id must be non-empty");
		if (hasUnpairedSurrogate(checkpoint.id)) throw new SandboxCheckpointInvalidIdError("Checkpoint id must contain valid Unicode");
		if (hasUnpairedSurrogate(checkpoint.threadId)) throw new SandboxCheckpointInvalidIdError("Checkpoint thread id must contain valid Unicode");
		if (typeof checkpoint.createdAt !== "number" || !Number.isFinite(checkpoint.createdAt)) throw new SandboxCheckpointInvalidEntryError("Checkpoint createdAt must be a finite number");
		if (expectedHeadId === "") throw new SandboxCheckpointInvalidIdError("Expected head id must be null or non-empty");
		const parentCheckpointId = checkpoint.parentCheckpointId ?? null;
		if (parentCheckpointId === "") throw new SandboxCheckpointInvalidIdError("Parent checkpoint id must be null or non-empty");
		if (expectedHeadId !== null && hasUnpairedSurrogate(expectedHeadId)) throw new SandboxCheckpointInvalidIdError("Expected head id must contain valid Unicode");
		if (parentCheckpointId !== null && hasUnpairedSurrogate(parentCheckpointId)) throw new SandboxCheckpointInvalidIdError("Parent checkpoint id must contain valid Unicode");
		validateEntries(checkpoint);
		validateArtifacts(checkpoint);
		this.assertWriter(writer, checkpoint.threadId);
		if (this.state.checkpoints.has(checkpoint.id)) throw new SandboxCheckpointDuplicateIdError(`Checkpoint '${checkpoint.id}' already exists`);
		const actualHeadId = this.state.heads.get(checkpoint.threadId) ?? null;
		if (actualHeadId !== expectedHeadId) throw new SandboxCheckpointConflictError(`Expected head '${expectedHeadId}', but thread '${checkpoint.threadId}' is at '${actualHeadId}'`);
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
	assertWriter(writer, threadId) {
		const current = this.state.writers.get(threadId);
		if (!current || current.ownerToken !== writer.ownerToken || current.fence !== writer.fence || current.expiresAt <= this.now()) throw new SandboxCheckpointWriterLostError(`Checkpoint writer lease for thread '${threadId}' is no longer current`);
	}
	async listBlobReferences() {
		return Array.from(this.state.references.entries()).sort(([a], [b]) => compareUtf8Bytes(a, b)).map(([key, references]) => ({
			key,
			references
		}));
	}
};
//#endregion
export { InMemorySandboxCheckpointStore, SandboxCheckpointConflictError, SandboxCheckpointDuplicateIdError, SandboxCheckpointError, SandboxCheckpointInvalidEntryError, SandboxCheckpointInvalidIdError, SandboxCheckpointNotHeadError, SandboxCheckpointParentMismatchError, SandboxCheckpointWriterConflictError, SandboxCheckpointWriterLostError, defineSandboxCheckpointStore, isForkCapableSandboxCheckpointStore };

//# sourceMappingURL=checkpoint-store.js.map