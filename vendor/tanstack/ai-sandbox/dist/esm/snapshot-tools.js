import { SandboxSnapshotError } from "./snapshots.js";
import { toolDefinition } from "@tanstack/ai";
//#region src/snapshot-tools.ts
function field(value, key) {
	if (value === null || typeof value !== "object") return void 0;
	return Reflect.get(value, key);
}
function requiredString(value, key) {
	const candidate = field(value, key);
	if (typeof candidate !== "string" || candidate.length === 0) throw new SandboxSnapshotError("SANDBOX_SNAPSHOT_INVALID_TOOL_INPUT", `Snapshot tool requires a non-empty ${key}`);
	return candidate;
}
function optionalString(value, key) {
	const candidate = field(value, key);
	if (candidate === void 0) return void 0;
	if (typeof candidate !== "string" || candidate.length === 0) throw new SandboxSnapshotError("SANDBOX_SNAPSHOT_INVALID_TOOL_INPUT", `Snapshot tool ${key} must be a non-empty string when provided`);
	return candidate;
}
function requireIdentifier(value, label) {
	if (value.length === 0) throw new SandboxSnapshotError("SANDBOX_SNAPSHOT_INVALID_TOOL_INPUT", `${label} must be a non-empty string`);
	return value;
}
function createSnapshotTools(snapshots, options) {
	const threadId = requireIdentifier(options.threadId, "threadId");
	const runId = requireIdentifier(options.runId, "runId");
	const createThreadId = options.createThreadId;
	const tenant = options.tenant;
	const onForked = options.onForked;
	if (typeof createThreadId !== "function") throw new SandboxSnapshotError("SANDBOX_SNAPSHOT_INVALID_TOOL_INPUT", "createSnapshotTools requires createThreadId");
	return [
		toolDefinition({
			name: "save_sandbox_snapshot",
			description: "Save a named checkpoint of the current live sandbox for this thread. Do not pass a thread id.",
			inputSchema: {
				type: "object",
				properties: { label: {
					type: "string",
					description: "A short name for this version, such as release-1."
				} },
				required: ["label"],
				additionalProperties: false
			},
			outputSchema: {
				type: "object",
				properties: {
					checkpointId: { type: "string" },
					label: { type: "string" },
					threadId: { type: "string" }
				},
				required: [
					"checkpointId",
					"label",
					"threadId"
				],
				additionalProperties: false
			}
		}).server(async (input) => {
			const label = requiredString(input, "label");
			const checkpoint = await snapshots.save({
				threadId,
				runId,
				label,
				...tenant === void 0 ? {} : { tenant }
			});
			return {
				checkpointId: checkpoint.id,
				label: checkpoint.label ?? label,
				threadId
			};
		}),
		toolDefinition({
			name: "fork_sandbox_snapshot",
			description: "Copy one checkpoint from this thread into a new empty thread. Omit checkpointId to copy the latest checkpoint. Do not pass thread ids.",
			inputSchema: {
				type: "object",
				properties: { checkpointId: {
					type: "string",
					description: "The checkpoint to copy. When omitted, the latest checkpoint is copied."
				} },
				additionalProperties: false
			},
			outputSchema: {
				type: "object",
				properties: {
					checkpointId: { type: "string" },
					destinationThreadId: { type: "string" }
				},
				required: ["checkpointId", "destinationThreadId"],
				additionalProperties: false
			}
		}).server(async (input) => {
			const checkpointId = optionalString(input, "checkpointId") ?? await snapshots.checkpoints.getHead(threadId);
			if (checkpointId === null) throw new SandboxSnapshotError("SANDBOX_SNAPSHOT_MISSING_CHECKPOINT", "This thread has no checkpoint to fork");
			const destinationThreadId = requireIdentifier(createThreadId(), "destinationThreadId");
			const checkpoint = await snapshots.fork({
				threadId,
				checkpointId,
				destinationThreadId
			});
			if (onForked !== void 0) await onForked({
				destinationThreadId,
				checkpointId: checkpoint.id
			});
			return {
				checkpointId: checkpoint.id,
				destinationThreadId
			};
		}),
		toolDefinition({
			name: "read_sandbox_snapshot_artifact",
			description: "Read metadata for one artifact on a checkpoint in this thread. Do not pass a thread id.",
			inputSchema: {
				type: "object",
				properties: {
					checkpointId: { type: "string" },
					artifactId: { type: "string" }
				},
				required: ["checkpointId", "artifactId"],
				additionalProperties: false
			},
			outputSchema: {
				type: "object",
				properties: {
					artifactId: { type: "string" },
					name: { type: "string" },
					mimeType: { type: "string" },
					size: { type: "number" },
					createdAt: { type: "number" }
				},
				required: [
					"artifactId",
					"name",
					"mimeType",
					"size",
					"createdAt"
				],
				additionalProperties: false
			}
		}).server(async (input) => {
			const checkpointId = requiredString(input, "checkpointId");
			const artifactId = requiredString(input, "artifactId");
			const resolved = await snapshots.readArtifact({
				threadId,
				checkpointId,
				artifactId
			});
			return {
				artifactId: resolved.artifact.artifactId,
				name: resolved.artifact.name,
				mimeType: resolved.artifact.mimeType,
				size: resolved.artifact.size,
				createdAt: resolved.artifact.createdAt
			};
		})
	];
}
//#endregion
export { createSnapshotTools };

//# sourceMappingURL=snapshot-tools.js.map