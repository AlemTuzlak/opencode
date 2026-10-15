import { SandboxSnapshotError, captureSandboxArtifacts, captureSandboxFiles, resolveSandboxSnapshotPolicy } from "./snapshots.js";
import { resolveAllSecrets } from "./secrets.js";
import { computeSandboxKey, computeWorkspaceHash } from "./key.js";
import { stageEnsureExistingSandbox } from "./sandbox.js";
//#region src/snapshot-operations.ts
async function withWriterLease(acquire, renew, operation) {
	const writer = await acquire();
	const release = writer.release.bind(writer);
	const renewWriter = renew ? writer.renew.bind(writer) : void 0;
	const renewAfterMs = renew ? writer.renewAfterMs : void 0;
	let renewalTimer;
	let renewalTask;
	let renewalFailure;
	let stopped = false;
	const scheduleRenewal = () => {
		if (renewWriter === void 0 || renewAfterMs === void 0) return;
		renewalTimer = setTimeout(() => {
			renewalTimer = void 0;
			renewalTask = (async () => {
				try {
					await renewWriter();
				} catch (error) {
					renewalFailure = { error };
				} finally {
					renewalTask = void 0;
				}
				if (!stopped && renewalFailure === void 0) scheduleRenewal();
			})();
		}, renewAfterMs);
	};
	if (renew) scheduleRenewal();
	const throwIfLost = async () => {
		await renewalTask;
		if (renewalFailure !== void 0) throw renewalFailure.error;
	};
	let outcome;
	let operationFailure;
	try {
		outcome = { value: await operation(writer, throwIfLost) };
	} catch (error) {
		operationFailure = { error };
	}
	stopped = true;
	if (renewalTimer !== void 0) clearTimeout(renewalTimer);
	await renewalTask;
	let releaseFailure;
	try {
		await release();
	} catch (error) {
		releaseFailure = { error };
	}
	if (renewalFailure !== void 0) throw renewalFailure.error;
	if (operationFailure !== void 0) throw operationFailure.error;
	if (releaseFailure !== void 0) throw releaseFailure.error;
	if (outcome === void 0) throw new Error("Writer operation had no outcome");
	return outcome.value;
}
function stageWorkspace(workspace) {
	if (workspace === void 0) return void 0;
	const source = workspace.source;
	const packageManager = workspace.packageManager;
	const setup = workspace.setup;
	const scripts = workspace.scripts;
	const skills = workspace.skills;
	const instructions = workspace.instructions;
	const plugins = workspace.plugins;
	const secrets = workspace.secrets;
	const root = workspace.root;
	return {
		source,
		...Object.hasOwn(workspace, "packageManager") ? { packageManager } : {},
		...Object.hasOwn(workspace, "setup") ? { setup } : {},
		...Object.hasOwn(workspace, "scripts") ? { scripts } : {},
		...Object.hasOwn(workspace, "skills") ? { skills } : {},
		...Object.hasOwn(workspace, "instructions") ? { instructions } : {},
		...Object.hasOwn(workspace, "plugins") ? { plugins } : {},
		...Object.hasOwn(workspace, "secrets") ? { secrets } : {},
		...Object.hasOwn(workspace, "root") ? { root } : {}
	};
}
function effectivePolicy(supplied, workspaceHash) {
	return resolveSandboxSnapshotPolicy(supplied, workspaceHash);
}
function stageInstanceStore(store) {
	return {
		get: store.get.bind(store),
		upsert: store.upsert.bind(store),
		delete: store.delete.bind(store)
	};
}
function stageLockStore(locks) {
	if (locks === void 0) return void 0;
	return { withLock: locks.withLock.bind(locks) };
}
function requireSnapshotPersistence(persistence) {
	const stores = persistence.stores;
	if (!stores?.messages || !stores.artifacts || !stores.blobs) throw new SandboxSnapshotError("SANDBOX_SNAPSHOT_MISSING_PERSISTENCE_STORES", "Sandbox snapshots require persistence stores.messages, stores.artifacts, and stores.blobs");
	return persistence;
}
function createSandboxSnapshots(input) {
	const persistence = requireSnapshotPersistence(input.persistence);
	const checkpoints = input.checkpoints;
	const policy = input.policy;
	const boundSandbox = input.sandbox;
	const boundInstances = input.instances;
	const boundTenant = input.tenant;
	const boundLocks = input.locks;
	return {
		persistence,
		checkpoints,
		...policy === void 0 ? {} : { policy },
		async save(saveInput) {
			const sandbox = saveInput.sandbox ?? boundSandbox;
			const instances = saveInput.instances ?? boundInstances;
			if (sandbox === void 0) throw new SandboxSnapshotError("SANDBOX_SNAPSHOT_MISSING_SANDBOX", "Named snapshots require a sandbox at create time or on save");
			if (instances === void 0) throw new SandboxSnapshotError("SANDBOX_SNAPSHOT_MISSING_INSTANCES", "Named snapshots require instances at create time or on save");
			return saveNamedSandboxSnapshot({
				definition: sandbox,
				threadId: saveInput.threadId,
				runId: saveInput.runId,
				instances,
				persistence,
				checkpoints,
				policy,
				label: saveInput.label,
				tenant: saveInput.tenant ?? boundTenant,
				locks: saveInput.locks ?? boundLocks,
				signal: saveInput.signal,
				adapterName: saveInput.adapterName
			});
		},
		fork(forkInput) {
			return forkFromSandboxSnapshot({
				threadId: forkInput.threadId,
				checkpointId: forkInput.checkpointId,
				destinationThreadId: forkInput.destinationThreadId,
				checkpoints,
				destinationCheckpointId: forkInput.destinationCheckpointId,
				createdAt: forkInput.createdAt
			});
		},
		readArtifact(readInput) {
			return resolveSnapshotArtifact({
				threadId: readInput.threadId,
				checkpointId: readInput.checkpointId,
				artifactId: readInput.artifactId,
				persistence,
				checkpoints
			});
		}
	};
}
async function saveNamedSandboxSnapshot(input) {
	const definition = input.definition;
	const threadId = input.threadId;
	const runId = input.runId;
	const instances = stageInstanceStore(input.instances);
	const label = input.label;
	const suppliedTenant = input.tenant;
	const tenantUserId = suppliedTenant?.userId;
	const tenantOrgId = suppliedTenant?.orgId;
	const tenant = suppliedTenant ? {
		...tenantUserId === void 0 ? {} : { userId: tenantUserId },
		...tenantOrgId === void 0 ? {} : { orgId: tenantOrgId }
	} : void 0;
	const locks = stageLockStore(input.locks);
	const signal = input.signal;
	const adapterName = input.adapterName;
	const lifecycle = definition.lifecycle;
	const reuse = lifecycle?.reuse;
	const snapshotMaxAge = lifecycle?.snapshotMaxAge;
	const workspace = stageWorkspace(definition.workspace);
	const sandboxId = definition.id;
	const provider = definition.provider;
	const providerName = provider.name;
	const resume = provider.resume.bind(provider);
	const ensureExisting = stageEnsureExistingSandbox(definition);
	const stores = input.persistence.stores;
	const messages = stores.messages;
	const loadThread = messages.loadThread.bind(messages);
	const artifactStore = stores.artifacts;
	const listForThread = artifactStore.listForThread.bind(artifactStore);
	const suppliedBlobs = stores.blobs;
	const blobs = {
		get: suppliedBlobs.get.bind(suppliedBlobs),
		head: suppliedBlobs.head.bind(suppliedBlobs),
		put: suppliedBlobs.put.bind(suppliedBlobs)
	};
	const checkpoints = input.checkpoints;
	const acquireWriter = checkpoints.acquireWriter.bind(checkpoints);
	const getHead = checkpoints.getHead.bind(checkpoints);
	const append = checkpoints.append.bind(checkpoints);
	const policy = effectivePolicy(input.policy, workspace === void 0 ? void 0 : computeWorkspaceHash(workspace));
	const workspaceSecrets = workspace?.secrets;
	const secrets = workspaceSecrets ? resolveAllSecrets(workspaceSecrets) : {};
	const workspaceRoot = workspace?.root;
	const key = computeSandboxKey({
		threadId,
		sandboxId,
		providerName,
		workspace,
		tenant
	});
	return withWriterLease(() => acquireWriter(threadId), true, async (writer, throwIfLost) => {
		if (reuse === "none") throw new SandboxSnapshotError("SANDBOX_SNAPSHOT_REUSE_NONE", "Named snapshots require a reusable sandbox lifecycle");
		const handle = await ensureExisting({
			threadId,
			runId,
			store: instances,
			locks,
			tenant,
			signal,
			adapterName
		}, {
			key,
			workspace,
			resolvedSecrets: workspaceSecrets ? secrets : void 0,
			snapshotMaxAge,
			resume
		});
		if (!handle) throw new SandboxSnapshotError("SANDBOX_SNAPSHOT_MISSING_REUSABLE_SANDBOX", "Named snapshots require an existing resumable sandbox");
		const conversation = await loadThread(threadId);
		const files = await captureSandboxFiles(handle, {
			blobs,
			workspaceRoot
		}, policy, secrets);
		const artifacts = await captureSandboxArtifacts({
			blobs,
			artifacts: { listForThread }
		}, threadId, secrets);
		const parentCheckpointId = await getHead(threadId);
		await throwIfLost();
		const checkpoint = {
			id: crypto.randomUUID(),
			threadId,
			parentCheckpointId,
			createdAt: Date.now(),
			reason: "named",
			label,
			sourceRunId: runId,
			files: files.files,
			conversation,
			artifacts
		};
		await append({
			checkpoint,
			expectedHeadId: parentCheckpointId,
			writer
		});
		await throwIfLost();
		return checkpoint;
	});
}
async function forkFromSandboxSnapshot(input) {
	const sourceThreadId = input.threadId;
	const sourceCheckpointId = input.checkpointId;
	const destinationThreadId = input.destinationThreadId;
	const suppliedDestinationCheckpointId = input.destinationCheckpointId;
	const suppliedCreatedAt = input.createdAt;
	const destinationCheckpointId = suppliedDestinationCheckpointId ?? crypto.randomUUID();
	const createdAt = suppliedCreatedAt ?? Date.now();
	const checkpoints = input.checkpoints;
	const acquireWriter = checkpoints.acquireWriter.bind(checkpoints);
	const forkFromCheckpoint = checkpoints.forkFromCheckpoint?.bind(checkpoints);
	return withWriterLease(() => acquireWriter(destinationThreadId), false, async (writer) => {
		if (forkFromCheckpoint === void 0) throw new SandboxSnapshotError("SANDBOX_SNAPSHOT_FORK_UNAVAILABLE", "The checkpoint store does not support atomic forks");
		return (await forkFromCheckpoint({
			sourceThreadId,
			sourceCheckpointId,
			destinationThreadId,
			destinationCheckpointId,
			createdAt,
			writer
		})).checkpoint;
	});
}
async function sha256(bytes) {
	const digest = await crypto.subtle.digest("SHA-256", new Uint8Array(bytes));
	return Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, "0")).join("");
}
async function resolveSnapshotArtifact(input) {
	const threadId = input.threadId;
	const checkpointId = input.checkpointId;
	const artifactId = input.artifactId;
	const checkpoints = input.checkpoints;
	const getCheckpoint = checkpoints.get.bind(checkpoints);
	const blobs = input.persistence.stores.blobs;
	const getBlob = blobs.get.bind(blobs);
	const checkpoint = await getCheckpoint(checkpointId);
	if (!checkpoint) throw new SandboxSnapshotError("SANDBOX_SNAPSHOT_MISSING_CHECKPOINT_ARTIFACT", "Snapshot checkpoint does not exist");
	const checkpointThreadId = checkpoint.threadId;
	const checkpointArtifacts = checkpoint.artifacts;
	if (checkpointThreadId !== threadId) throw new SandboxSnapshotError("SANDBOX_SNAPSHOT_FOREIGN_CHECKPOINT_ARTIFACT", "Snapshot checkpoint belongs to another thread");
	const foundArtifact = checkpointArtifacts.find((value) => value.artifactId === artifactId);
	if (!foundArtifact) throw new SandboxSnapshotError("SANDBOX_SNAPSHOT_MISSING_CHECKPOINT_ARTIFACT", "Snapshot artifact does not exist");
	const artifact = {
		artifactId: foundArtifact.artifactId,
		name: foundArtifact.name,
		mimeType: foundArtifact.mimeType,
		size: foundArtifact.size,
		blobKey: foundArtifact.blobKey,
		createdAt: foundArtifact.createdAt
	};
	const blob = await getBlob(artifact.blobKey);
	if (!blob) throw new SandboxSnapshotError("SANDBOX_SNAPSHOT_INVALID_ARTIFACT_BYTES", "Snapshot artifact blob does not exist");
	const arrayBuffer = blob.arrayBuffer.bind(blob);
	const bytes = new Uint8Array(await arrayBuffer());
	if (bytes.byteLength !== artifact.size || artifact.blobKey !== `sandbox-artifacts/sha256/${await sha256(bytes)}`) throw new SandboxSnapshotError("SANDBOX_SNAPSHOT_INVALID_ARTIFACT_BYTES", "Snapshot artifact bytes do not match metadata");
	return {
		artifact: { ...artifact },
		bytes: bytes.slice()
	};
}
//#endregion
export { createSandboxSnapshots };

//# sourceMappingURL=snapshot-operations.js.map