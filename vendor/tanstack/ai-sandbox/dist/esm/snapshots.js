//#region src/snapshots.ts
var SandboxSnapshotError = class extends Error {
	code;
	constructor(code, message) {
		super(message);
		this.name = "SandboxSnapshotError";
		this.code = code;
	}
};
var DEFAULT_ROOT = "/workspace";
var PROJECTED_SKILL_ROOTS = /* @__PURE__ */ new Set([
	".claude",
	".codex",
	".grok"
]);
function isFrameworkGeneratedSymlinkPath(path) {
	if (path === "CLAUDE.md" || path === "GEMINI.md") return true;
	const segments = path.split("/");
	return segments.length === 3 && PROJECTED_SKILL_ROOTS.has(segments[0] ?? "") && segments[1] === "skills";
}
function defaultExcluded(path, workspaceHash) {
	const segments = path.split("/");
	return isFrameworkGeneratedSymlinkPath(path) || segments.some((segment) => segment === ".git" || segment === "node_modules" || segment.startsWith(".env")) || workspaceHash !== void 0 && segments[0] === `.tanstack-projected-${workspaceHash}`;
}
function isProtectedPath(path, workspaceHash) {
	return workspaceHash !== void 0 && path.split("/")[0] === `.tanstack-projected-${workspaceHash}`;
}
var FILE_BLOB_KEY = /^sandbox-files\/sha256\/[0-9a-f]{64}$/;
function defaultSandboxSnapshotPolicy(workspaceHash) {
	return {
		workspaceHash,
		exclude: (path) => defaultExcluded(path, workspaceHash)
	};
}
/**
* Keep default exclusions unless the caller passed `exclude`.
* `include` or `redact` alone must not capture `.env`, `.git`, or
* `node_modules`.
*/
function resolveSandboxSnapshotPolicy(supplied, workspaceHash) {
	const defaults = defaultSandboxSnapshotPolicy(workspaceHash ?? supplied?.workspaceHash);
	if (supplied === void 0) return defaults;
	const include = supplied.include;
	const exclude = supplied.exclude;
	const redact = supplied.redact;
	const suppliedWorkspaceHash = supplied.workspaceHash;
	return {
		...suppliedWorkspaceHash === void 0 ? {} : { workspaceHash: suppliedWorkspaceHash },
		...workspaceHash === void 0 ? {} : { workspaceHash },
		...include === void 0 ? {} : { include },
		exclude: exclude ?? defaults.exclude,
		...redact === void 0 ? {} : { redact }
	};
}
function normalize(path) {
	if (path.includes("\\")) throw new SandboxSnapshotError("SANDBOX_SNAPSHOT_INVALID_PATH", `Unsafe snapshot path '${path}'`);
	const value = path;
	if (!value || value.includes("\0") || value.startsWith("/") || /^[A-Za-z]:/.test(value) || value.endsWith("/")) throw new SandboxSnapshotError("SANDBOX_SNAPSHOT_INVALID_PATH", `Unsafe snapshot path '${path}'`);
	const parts = value.split("/");
	if (parts.some((part) => !part || part === "." || part === "..") || parts.join("/") !== value) throw new SandboxSnapshotError("SANDBOX_SNAPSHOT_INVALID_PATH", `Unsafe snapshot path '${path}'`);
	return value;
}
function childPath(parent, child) {
	if (!child.name || child.name.includes("/") || child.name.includes("\\") || child.name.includes("\0") || child.name === "." || child.name === "..") throw new SandboxSnapshotError("SANDBOX_SNAPSHOT_INVALID_WORKSPACE", `Invalid workspace entry '${child.name}'`);
	const absolute = `${parent}/${child.name}`;
	if (child.path !== absolute) throw new SandboxSnapshotError("SANDBOX_SNAPSHOT_INVALID_WORKSPACE", `Invalid workspace entry path '${child.path}'`);
	return {
		absolute,
		relative: child.name
	};
}
function lstat(handle, path) {
	if (!handle.fs.lstat) throw new SandboxSnapshotError("SANDBOX_SNAPSHOT_LSTAT_REQUIRED", "Snapshot operations require fs.lstat");
	return handle.fs.lstat(path);
}
function assertSupported(stat, path) {
	if (stat.type === "symlink" || stat.type === "other" || stat.type === "file" && (stat.mode & 73) !== 0) throw new SandboxSnapshotError("SANDBOX_SNAPSHOT_UNSUPPORTED_ENTRY", `Unsupported entry '${path}'`);
}
function included(path, kind, policy) {
	if (policy.exclude?.(path, kind)) return false;
	return kind === "dir" ? true : policy.include?.(path, kind) ?? true;
}
async function hash(bytes) {
	const digest = await crypto.subtle.digest("SHA-256", new Uint8Array(bytes));
	return Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, "0")).join("");
}
async function putIfAbsent(blobs, bytes, keys) {
	const key = `sandbox-files/sha256/${await hash(bytes)}`;
	if (!keys.has(key)) {
		if (!await blobs.head(key)) await blobs.put(key, bytes);
		keys.set(key, key);
	}
	return {
		key,
		size: bytes.byteLength
	};
}
async function redactBytes(bytes, resolvedSecrets) {
	const output = bytes.slice();
	const redacted = new Uint8Array(bytes.length);
	const secrets = Object.values(resolvedSecrets).filter(Boolean).map((secret) => new TextEncoder().encode(secret)).sort((a, b) => b.length - a.length || compareBytes(a, b));
	for (const needle of secrets) {
		if (!needle.length || needle.length > bytes.length) continue;
		for (let start = 0; start <= bytes.length - needle.length; start++) {
			let match = true;
			for (let index = 0; index < needle.length; index++) if (bytes[start + index] !== needle[index]) {
				match = false;
				break;
			}
			if (!match) continue;
			if (match) redacted.fill(1, start, start + needle.length);
		}
	}
	for (let index = 0; index < output.length; index++) if (redacted[index]) output[index] = 0;
	return output;
}
async function captureSandboxFiles(handle, bundle, suppliedPolicy = defaultSandboxSnapshotPolicy(), resolvedSecrets = {}) {
	const policy = resolveSandboxSnapshotPolicy(suppliedPolicy, suppliedPolicy.workspaceHash);
	if (!handle.fs.lstat) throw new SandboxSnapshotError("SANDBOX_SNAPSHOT_LSTAT_REQUIRED", "Snapshot capture requires fs.lstat");
	const rootPath = bundle.workspaceRoot ?? DEFAULT_ROOT;
	const root = await lstat(handle, rootPath);
	if (!root || root.type !== "dir") throw new SandboxSnapshotError("SANDBOX_SNAPSHOT_INVALID_WORKSPACE", "Snapshot workspace is missing or is not a directory");
	assertSupported(root, rootPath);
	const files = [];
	const destinationKeys = /* @__PURE__ */ new Map();
	const walk = async (absolute, relative) => {
		const stat = await lstat(handle, absolute);
		if (!stat) throw new SandboxSnapshotError("SANDBOX_SNAPSHOT_INVALID_WORKSPACE", `Snapshot entry disappeared '${relative}'`);
		assertSupported(stat, relative);
		if (stat.type !== "file" && stat.type !== "dir") throw new SandboxSnapshotError("SANDBOX_SNAPSHOT_UNSUPPORTED_ENTRY", `Unsupported entry '${relative}'`);
		if (relative && (isProtectedPath(relative, policy.workspaceHash) || policy.exclude?.(relative, stat.type))) return false;
		if (stat.type === "file") {
			const path = normalize(relative);
			if (policy.include && !policy.include(path, "file")) return false;
			let bytes = await handle.fs.readBytes(absolute);
			if (policy.redact) bytes = policy.redact({
				path,
				bytes,
				resolvedSecrets
			});
			bytes = await redactBytes(bytes, resolvedSecrets);
			const blob = await putIfAbsent(bundle.blobs, bytes, destinationKeys);
			files.push({
				path,
				kind: "file",
				blobKey: blob.key,
				size: blob.size
			});
			return true;
		}
		const children = await handle.fs.list(absolute);
		let hasCapturedChild = false;
		for (const child of children) {
			const childEntry = childPath(absolute, child);
			const childRelative = relative ? `${relative}/${childEntry.relative}` : childEntry.relative;
			if (isProtectedPath(childRelative, policy.workspaceHash) || policy.exclude?.(childRelative, child.type)) continue;
			hasCapturedChild = await walk(childEntry.absolute, childRelative) || hasCapturedChild;
		}
		if (relative && !hasCapturedChild && (!policy.include || policy.include(relative, "dir"))) files.push({
			path: normalize(relative),
			kind: "dir"
		});
		return hasCapturedChild || relative !== "" && (!policy.include || policy.include(relative, "dir"));
	};
	await walk(rootPath, "");
	files.sort((a, b) => comparePath(a.path, b.path));
	return { files };
}
function validateManifest(snapshot, policy) {
	const paths = /* @__PURE__ */ new Map();
	for (const entry of snapshot.files) {
		const path = normalize(entry.path);
		for (const ancestor of parents(path)) if (isProtectedPath(ancestor, policy.workspaceHash) || policy.exclude?.(ancestor, "dir")) throw new SandboxSnapshotError("SANDBOX_SNAPSHOT_INVALID_PATH", `Excluded snapshot ancestor '${ancestor}'`);
		if (isProtectedPath(path, policy.workspaceHash)) throw new SandboxSnapshotError("SANDBOX_SNAPSHOT_INVALID_PATH", `Protected snapshot path '${path}'`);
		if (!included(path, entry.kind, policy) || entry.kind === "dir" && policy.include?.(path, "dir") === false) throw new SandboxSnapshotError("SANDBOX_SNAPSHOT_INVALID_PATH", `Excluded snapshot path '${path}'`);
		if (paths.has(path)) throw new SandboxSnapshotError("SANDBOX_SNAPSHOT_INVALID_PATH", `Duplicate path '${path}'`);
		if (entry.kind === "file") {
			const { blobKey, size } = entry;
			if (typeof blobKey !== "string" || !FILE_BLOB_KEY.test(blobKey) || typeof size !== "number" || !Number.isSafeInteger(size) || size < 0) throw new SandboxSnapshotError("SANDBOX_SNAPSHOT_INVALID_PATH", `Invalid file entry '${path}'`);
			paths.set(path, {
				path,
				kind: "file",
				blobKey,
				size
			});
		} else if (entry.kind === "dir") paths.set(path, {
			path,
			kind: "dir"
		});
		else throw new SandboxSnapshotError("SANDBOX_SNAPSHOT_INVALID_PATH", `Unknown snapshot entry '${path}'`);
	}
	for (const [path] of paths) for (let index = path.indexOf("/"); index !== -1; index = path.indexOf("/", index + 1)) {
		const parent = paths.get(path.slice(0, index));
		if (parent?.kind === "file") throw new SandboxSnapshotError("SANDBOX_SNAPSHOT_INVALID_PATH", `File ancestor '${parent.path}'`);
	}
	return [...paths.values()];
}
async function loadBlobs(entries, bundle) {
	const blobs = /* @__PURE__ */ new Map();
	for (const entry of entries) if (entry.kind === "file" && !blobs.has(entry.blobKey)) {
		const object = await bundle.blobs.get(entry.blobKey);
		if (!object) throw new SandboxSnapshotError("SANDBOX_SNAPSHOT_MISSING_BLOB", `Missing snapshot blob '${entry.blobKey}'`);
		const bytes = new Uint8Array(await object.arrayBuffer());
		const expectedKey = `sandbox-files/sha256/${await hash(bytes)}`;
		if (entry.blobKey !== expectedKey) throw new SandboxSnapshotError("SANDBOX_SNAPSHOT_INVALID_BLOB", `Invalid content for snapshot blob '${entry.blobKey}'`);
		blobs.set(entry.blobKey, bytes);
	}
	for (const entry of entries) if (entry.kind === "file") {
		const bytes = blobs.get(entry.blobKey);
		if (!bytes || bytes.byteLength !== entry.size) throw new SandboxSnapshotError("SANDBOX_SNAPSHOT_INVALID_BLOB", `Wrong size for snapshot blob '${entry.blobKey}'`);
	}
	return blobs;
}
async function scanCurrent(handle, absolute, relative, policy) {
	const stat = await lstat(handle, absolute);
	if (!stat) return [];
	assertSupported(stat, relative);
	if (stat.type === "file") return [{
		path: relative,
		kind: "file"
	}];
	const paths = [];
	for (const child of await handle.fs.list(absolute)) {
		const childEntry = childPath(absolute, child);
		const childRelative = relative ? `${relative}/${childEntry.relative}` : childEntry.relative;
		if (isProtectedPath(childRelative, policy.workspaceHash)) {
			paths.push({
				path: childRelative,
				kind: "dir",
				protected: true
			});
			continue;
		}
		if (!included(childRelative, child.type, policy)) {
			paths.push({
				path: childRelative,
				kind: child.type,
				protected: true
			});
			continue;
		}
		paths.push(...await scanCurrent(handle, childEntry.absolute, childRelative, policy));
	}
	return relative ? [{
		path: relative,
		kind: "dir"
	}, ...paths] : paths;
}
async function scanDestination(handle, policy, rootPath) {
	const root = await lstat(handle, rootPath);
	if (!root || root.type !== "dir") throw new SandboxSnapshotError("SANDBOX_SNAPSHOT_INVALID_WORKSPACE", "Snapshot workspace is missing or is not a directory");
	assertSupported(root, rootPath);
	return scanCurrent(handle, rootPath, "", policy);
}
function parents(path) {
	const values = [];
	const parts = path.split("/");
	for (let length = 1; length < parts.length; length++) values.push(parts.slice(0, length).join("/"));
	return values;
}
function comparePath(a, b) {
	return compareBytes(new TextEncoder().encode(a), new TextEncoder().encode(b));
}
function compareBytes(a, b) {
	for (let i = 0; i < Math.min(a.length, b.length); i++) {
		const left = a[i];
		const right = b[i];
		if (left !== right) return (left ?? 0) - (right ?? 0);
	}
	return a.length - b.length;
}
function getRequiredBlob(blobs, key) {
	const bytes = blobs.get(key);
	if (!bytes) throw new SandboxSnapshotError("SANDBOX_SNAPSHOT_MISSING_BLOB", `Missing snapshot blob '${key}'`);
	return bytes;
}
function depth(path) {
	return path.split("/").length;
}
function buildRestorePlan(entries, current) {
	const desired = /* @__PURE__ */ new Map();
	for (const entry of entries) {
		desired.set(entry.path, entry.kind);
		for (const parent of parents(entry.path)) desired.set(parent, "dir");
	}
	const currentKinds = new Map(current.map((entry) => [entry.path, entry.kind]));
	const candidates = current.filter((entry) => desired.get(entry.path) !== entry.kind).map((entry) => entry.path).sort((a, b) => depth(a) - depth(b) || comparePath(a, b));
	const removes = [];
	for (const path of candidates) {
		if (current.some((entry) => entry.protected && (entry.path === path || entry.path.startsWith(`${path}/`)))) continue;
		if (removes.some((ancestor) => path.startsWith(`${ancestor}/`))) continue;
		removes.push(path);
	}
	return {
		removes,
		mkdirs: [...desired].filter(([path, kind]) => kind === "dir" && currentKinds.get(path) !== "dir").map(([path]) => path).sort((a, b) => depth(a) - depth(b) || comparePath(a, b)),
		writes: entries.filter((entry) => entry.kind === "file").sort((a, b) => comparePath(a.path, b.path))
	};
}
async function restoreSandboxFiles(handle, bundle, snapshot, suppliedPolicy = defaultSandboxSnapshotPolicy()) {
	const policy = resolveSandboxSnapshotPolicy(suppliedPolicy, suppliedPolicy.workspaceHash);
	if (!handle.fs.lstat) throw new SandboxSnapshotError("SANDBOX_SNAPSHOT_LSTAT_REQUIRED", "Snapshot restore requires fs.lstat");
	const entries = validateManifest(snapshot, policy);
	const rootPath = bundle.workspaceRoot ?? DEFAULT_ROOT;
	const current = await scanDestination(handle, policy, rootPath);
	for (const entry of entries) if (entry.kind === "file" && current.some((currentEntry) => currentEntry.protected && currentEntry.path.startsWith(`${entry.path}/`))) throw new SandboxSnapshotError("SANDBOX_SNAPSHOT_INVALID_PATH", `Protected current descendant conflicts with '${entry.path}'`);
	const blobs = await loadBlobs(entries, bundle);
	const plan = buildRestorePlan(entries, current);
	for (const path of plan.removes) await handle.fs.remove(`${rootPath}/${path}`);
	for (const path of plan.mkdirs) await handle.fs.mkdir(`${rootPath}/${path}`);
	for (const entry of plan.writes) await handle.fs.write(`${rootPath}/${entry.path}`, getRequiredBlob(blobs, entry.blobKey));
}
async function captureSandboxArtifacts(bundle, threadId, resolvedSecrets = {}) {
	if (!bundle.artifacts) throw new SandboxSnapshotError("SANDBOX_SNAPSHOT_ARTIFACT_SUPPORT_REQUIRED", "Snapshot artifact capture requires an artifact store");
	const records = await bundle.artifacts.listForThread(threadId);
	const loaded = /* @__PURE__ */ new Map();
	const destinationKeys = /* @__PURE__ */ new Map();
	const resolveBlobKey = bundle.resolveArtifactBlobKey ?? ((record) => record.blobKey ?? `artifacts/${record.runId}/${record.artifactId}`);
	for (const record of records) {
		const sourceKey = resolveBlobKey(record);
		if (loaded.has(sourceKey)) continue;
		const source = await bundle.blobs.get(sourceKey);
		if (!source) throw new SandboxSnapshotError("SANDBOX_SNAPSHOT_MISSING_ARTIFACT_BLOB", `Missing artifact source blob '${sourceKey}'`);
		loaded.set(sourceKey, new Uint8Array(await source.arrayBuffer()));
	}
	const output = [];
	for (const record of records) {
		let bytes = getRequiredBlob(loaded, resolveBlobKey(record));
		bytes = await redactBytes(bytes, resolvedSecrets);
		const key = `sandbox-artifacts/sha256/${await hash(bytes)}`;
		if (!destinationKeys.has(key)) {
			if (!await bundle.blobs.head(key)) await bundle.blobs.put(key, bytes);
			destinationKeys.set(key, key);
		}
		output.push({
			artifactId: record.artifactId,
			name: record.name,
			mimeType: record.mimeType,
			size: bytes.byteLength,
			blobKey: key,
			createdAt: record.createdAt
		});
	}
	output.sort((a, b) => a.createdAt - b.createdAt || comparePath(a.artifactId, b.artifactId));
	return Object.freeze(output.map((artifact) => Object.freeze(artifact)));
}
//#endregion
export { SandboxSnapshotError, captureSandboxArtifacts, captureSandboxFiles, defaultSandboxSnapshotPolicy, resolveSandboxSnapshotPolicy, restoreSandboxFiles };

//# sourceMappingURL=snapshots.js.map