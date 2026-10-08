import { validateChatPersistenceStores, validateGenerationPersistenceStores } from "./types.js";
import { InterruptsCapability, PersistenceCapability, PersistenceCompletionCapability, provideInterrupts, providePersistence, providePersistenceCompletion } from "./capabilities.js";
import { mergeStoredMessages, storedCutoff } from "./merge-stored.js";
import { createSubagentRunRecorder } from "./subagent-runs.js";
import { artifactBlobKey } from "./retrieve.js";
import { InterruptResumeValidationError, LoadChildCapability, MetadataCapability, defineChatMiddleware, fromSpecTokenUsage, getDetachableRun, modelMessagesToUIMessages, provideLoadChild, provideMetadata, readInterruptBinding, validateInterruptResumeBatch, wasCancelRequested } from "@tanstack/ai";
import { createInterruptBinding, getGenericInterruptDefinitionRegistry, providePendingTurn, rehydrateInterruptRequest, toRunErrorPayload } from "@tanstack/ai/adapter-internals";
import { base64ToUint8Array } from "@tanstack/ai-utils";
import { mergeMetadata, tanstackMetadata, withTanstackMetadata } from "@tanstack/ai/client";
//#region src/middleware.ts
/**
* The slot this generation's runs are filed under: `ctx.threadId` (the
* `threadId` the caller passed the activity), or the option when it overrides.
*
* Throws when neither supplies one. A run filed under no scope can never be
* hydrated by one, so `persistence: true` would restore nothing, forever. That
* is worth failing loudly for, since the alternative is a silent hole a reader
* cannot diagnose from behavior.
*/
function generationScope(ctx, opts) {
	const threadId = opts.threadId ?? ctx.threadId;
	if (threadId === void 0 || threadId.length === 0) throw new Error("Generation persistence requires a `threadId`, the stable scope successive runs are filed under. Pass it to the activity, e.g. `generateImage({ threadId, middleware: [withGenerationPersistence(p)] })`, or override it with `withGenerationPersistence(p, { threadId })`.");
	return threadId;
}
var DEFAULT_ARTIFACT_FETCH_TIMEOUT_MS = 3e4;
var DEFAULT_MAX_ARTIFACT_BYTES = 1073741824;
var runState = /* @__PURE__ */ new WeakMap();
/**
* Stored activity rows that sit before the reload cutoff. A reload drops the
* old assistant turn, so its activity rows go too.
*/
function keptActivities(records, stored, cutoff) {
	if (cutoff >= stored.length) return records;
	const keptUi = modelMessagesToUIMessages(stored.slice(0, cutoff)).length;
	return [...records].sort((a, b) => a.index - b.index).filter((record, earlier) => record.index - earlier < keptUi);
}
/** `metadata.tanstack.run.id` of a stored message, when set. */
function runTagOf(message) {
	const tanstack = message.metadata?.tanstack;
	if (typeof tanstack !== "object" || tanstack === null) return;
	const run = tanstack.run;
	if (typeof run !== "object" || run === null) return;
	const id = run.id;
	return typeof id === "string" && id !== "" ? id : void 0;
}
function withRunTag(message, runId) {
	const metadata = message.metadata ?? {};
	const tanstack = metadata.tanstack;
	return {
		...message,
		metadata: {
			...metadata,
			tanstack: {
				...typeof tanstack === "object" && tanstack !== null ? tanstack : {},
				run: { id: runId }
			}
		}
	};
}
/**
* The thread to save, with this run's id on the assistant messages it added
* (`metadata.tanstack.run.id`). `reconstructChat` uses it to match each
* message to its run. Messages from earlier runs are left as they are.
*/
function runMessages(ctx, state) {
	const from = state?.firstRunMessage;
	if (from === void 0) return [...ctx.messages];
	return ctx.messages.map((message, index) => index >= from && message.role === "assistant" && runTagOf(message) === void 0 ? withRunTag(message, ctx.runId) : message);
}
var validResumeStatuses = /* @__PURE__ */ new Set(["resolved", "cancelled"]);
function mergeMaps(left, right) {
	if (!left && !right) return void 0;
	return new Map([...left ?? [], ...right ?? []]);
}
function mergeSets(left, right) {
	if (!left && !right) return void 0;
	return /* @__PURE__ */ new Set([...left ?? [], ...right ?? []]);
}
function mergeResumeToolState(left, right) {
	if (!left) return right;
	if (!right) return left;
	return {
		approvals: mergeMaps(left.approvals, right.approvals),
		clientToolResults: mergeMaps(left.clientToolResults, right.clientToolResults),
		clientToolErrors: mergeMaps(left.clientToolErrors, right.clientToolErrors),
		genericInterrupts: mergeMaps(left.genericInterrupts, right.genericInterrupts),
		genericInterruptRequests: mergeMaps(left.genericInterruptRequests, right.genericInterruptRequests),
		deniedToolResults: mergeMaps(left.deniedToolResults, right.deniedToolResults),
		cancelledToolCallIds: mergeSets(left.cancelledToolCallIds, right.cancelledToolCallIds)
	};
}
function rejectMixedRunPending(pending, ctx) {
	if (new Set(pending.map((interrupt) => interrupt.runId)).size <= 1) return;
	throw new InterruptResumeValidationError([{
		scope: "batch",
		threadId: ctx.threadId,
		interruptedRunId: ctx.runId,
		generation: 0,
		interruptIds: pending.map((interrupt) => interrupt.interruptId),
		code: "stale",
		message: "Thread has pending interrupts from more than one run.",
		source: "server",
		retryable: false
	}]);
}
function validatePendingResumes(pending, resume, ctx) {
	const interruptedRunId = pending[0]?.runId ?? ctx.runId;
	const failure = (interruptId, code, message) => {
		throw new InterruptResumeValidationError([{
			scope: "item",
			threadId: ctx.threadId,
			interruptedRunId,
			generation: 0,
			interruptId,
			code,
			message,
			source: "client",
			retryable: false
		}, {
			scope: "batch",
			threadId: ctx.threadId,
			interruptedRunId,
			generation: 0,
			interruptIds: pending.map((interrupt) => interrupt.interruptId),
			code: code === "conflict" ? "conflict" : "incomplete-batch",
			message: "Resume entries must resolve or cancel the complete interrupt batch.",
			source: "client",
			retryable: false
		}]);
	};
	const pendingInterruptIds = new Set(pending.map((interrupt) => interrupt.interruptId));
	const resumeByInterruptId = /* @__PURE__ */ new Map();
	for (const entry of resume ?? []) {
		if (resumeByInterruptId.has(entry.interruptId)) return failure(entry.interruptId, "conflict", `Interrupt ${entry.interruptId} has duplicate resume entries.`);
		resumeByInterruptId.set(entry.interruptId, entry);
	}
	if (pending.length === 0) {
		const staleEntry = resume?.[0];
		if (staleEntry) return failure(staleEntry.interruptId, "unknown-interrupt", `Resume entry references non-pending interrupt ${staleEntry.interruptId}.`);
		return resumeByInterruptId;
	}
	const firstPending = pending[0];
	if (firstPending === void 0) return resumeByInterruptId;
	if (!resume || resume.length === 0) return failure(firstPending.interruptId, "unknown-interrupt", `Thread has pending interrupts; resume is required before accepting new input.`);
	for (const interrupt of pending) {
		const entry = resumeByInterruptId.get(interrupt.interruptId);
		if (!entry) return failure(interrupt.interruptId, "unknown-interrupt", `Missing resume entry for pending interrupt ${interrupt.interruptId}.`);
		if (!validResumeStatuses.has(entry.status)) return failure(interrupt.interruptId, "unknown-interrupt", `Invalid resume status for pending interrupt ${interrupt.interruptId}: ${entry.status}.`);
	}
	for (const entry of resume) if (!pendingInterruptIds.has(entry.interruptId)) return failure(entry.interruptId, "unknown-interrupt", `Resume entry references non-pending interrupt ${entry.interruptId}.`);
	return resumeByInterruptId;
}
async function applyPendingResumes(pending, resumeByInterruptId, interrupts) {
	const entries = [];
	for (const interrupt of pending) {
		const entry = resumeByInterruptId.get(interrupt.interruptId);
		if (!entry) continue;
		if (entry.status === "resolved") entries.push({
			interruptId: interrupt.interruptId,
			status: "resolved",
			response: entry.payload
		});
		else entries.push({
			interruptId: interrupt.interruptId,
			status: "cancelled"
		});
	}
	if (interrupts.commitBatch) {
		await interrupts.commitBatch(entries);
		return;
	}
	const ids = /* @__PURE__ */ new Set();
	for (const entry of entries) {
		if (ids.has(entry.interruptId)) throw new Error(`Interrupt batch contains duplicate id: ${entry.interruptId}.`);
		ids.add(entry.interruptId);
		const existing = await interrupts.get(entry.interruptId);
		if (!existing) throw new Error(`Interrupt batch references missing id: ${entry.interruptId}.`);
		if (existing.status !== "pending") throw new Error(`Interrupt batch references non-pending id: ${entry.interruptId}.`);
	}
	for (const entry of entries) if (entry.status === "resolved") await interrupts.resolve(entry.interruptId, entry.response);
	else await interrupts.cancel(entry.interruptId);
}
/**
* Commit the resumes stashed in `onConfig`, marking each resumed interrupt
* resolved/cancelled. Called only from success boundaries (`onFinish`, and the
* `onChunk` interrupt boundary) so a provider failure or abort between accepting
* the resume and reaching a boundary leaves the interrupts pending — the
* approval is not consumed and a retry with the same resume succeeds. Idempotent
* and a no-op when nothing is stashed.
*/
async function commitPendingResumes(state, interrupts) {
	if (!state?.pendingResumes || !interrupts) return;
	const { pending, resumeByInterruptId } = state.pendingResumes;
	await applyPendingResumes(pending, resumeByInterruptId, interrupts);
	state.pendingResumes = void 0;
}
function objectValue(value) {
	return value && typeof value === "object" ? value : null;
}
function stringField(value, key) {
	return typeof value[key] === "string" ? value[key] : void 0;
}
function interruptKind(interrupt) {
	const metadata = objectValue(interrupt.payload.metadata);
	return metadata ? stringField(metadata, "kind") : void 0;
}
function hasReservedInterruptBinding(payload) {
	const metadata = objectValue(objectValue(payload)?.metadata);
	return !!metadata && "tanstack:interruptBinding" in metadata;
}
function isPersistedInterruptDescriptor(value) {
	const record = objectValue(value);
	return !!record && typeof record.id === "string" && typeof record.reason === "string" && typeof record.message === "string";
}
/**
* Does this pending record belong to the TanStack chat resume protocol?
*
* An external system can persist an AG-UI descriptor in the same durable
* thread. A descriptor without a TanStack binding or legacy tool marker stays
* pending for its owner, but it does not make this resume incomplete. Older
* opaque records remain owned because their provenance cannot be known.
*/
function isChatOwnedPendingInterrupt(interrupt) {
	const kind = interruptKind(interrupt);
	return !isPersistedInterruptDescriptor(interrupt.payload) || stringField(interrupt.payload, "toolCallId") !== void 0 || kind === "approval" || kind === "client_tool" || hasReservedInterruptBinding(interrupt.payload);
}
function durableGenericFailure(ctx, persisted, message) {
	return new InterruptResumeValidationError([{
		scope: "item",
		threadId: ctx.threadId,
		interruptedRunId: persisted.runId || ctx.runId,
		generation: 0,
		interruptId: persisted.interruptId,
		code: "stale",
		message,
		source: "server",
		retryable: false
	}, {
		scope: "batch",
		threadId: ctx.threadId,
		interruptedRunId: persisted.runId || ctx.runId,
		generation: 0,
		interruptIds: [persisted.interruptId],
		code: "item-validation-failed",
		message: "One or more persisted interrupt records are invalid.",
		source: "server",
		retryable: false
	}]);
}
var APPROVAL_CONTEXT = "tanstack:approvalContext";
function readApprovalContext(value) {
	const record = objectValue(value);
	const fields = [
		"v",
		"approvalInterruptId",
		"approvalRunId",
		"generation",
		"toolCallId",
		"toolName",
		"inputSchemaHash",
		"approvalSchemaHash",
		"responseSchemaHash"
	];
	if (!record || Array.isArray(value) || Object.keys(record).length !== fields.length || fields.some((key) => !Object.hasOwn(record, key))) return void 0;
	const { v, approvalInterruptId, approvalRunId, generation, toolCallId, toolName, inputSchemaHash, approvalSchemaHash, responseSchemaHash } = record;
	if (v !== 1 || typeof generation !== "number" || !Number.isSafeInteger(generation) || generation < 0 || typeof approvalInterruptId !== "string" || !approvalInterruptId || typeof approvalRunId !== "string" || !approvalRunId || typeof toolCallId !== "string" || !toolCallId || typeof toolName !== "string" || !toolName || typeof inputSchemaHash !== "string" || !inputSchemaHash || typeof approvalSchemaHash !== "string" || !approvalSchemaHash || typeof responseSchemaHash !== "string" || !responseSchemaHash) return void 0;
	return {
		v,
		approvalInterruptId,
		approvalRunId,
		generation,
		toolCallId,
		toolName,
		inputSchemaHash,
		approvalSchemaHash,
		responseSchemaHash
	};
}
function clientInterruptPayload(interrupt, state) {
	const payload = interruptPayload(interrupt);
	if (!isPersistedInterruptDescriptor(payload)) return payload;
	const client = readInterruptBinding(payload);
	if (client?.kind !== "client-tool-execution") return payload;
	const metadata = { ...objectValue(payload.metadata) };
	delete metadata[APPROVAL_CONTEXT];
	for (const previous of state?.pendingResumes?.pending ?? []) {
		if (!isPersistedInterruptDescriptor(previous.payload)) continue;
		const binding = readInterruptBinding(previous.payload);
		const resume = state?.pendingResumes?.resumeByInterruptId.get(previous.interruptId);
		const decision = objectValue(resume?.payload);
		if (binding?.kind !== "tool-approval" || binding.toolCallId !== client.toolCallId || binding.toolName !== client.toolName || binding.generation !== client.generation || resume?.status !== "resolved" || resume.payload !== true && decision?.approved !== true) continue;
		metadata[APPROVAL_CONTEXT] = {
			v: 1,
			approvalInterruptId: previous.interruptId,
			approvalRunId: previous.runId,
			generation: binding.generation,
			toolCallId: binding.toolCallId,
			toolName: binding.toolName,
			inputSchemaHash: binding.inputSchemaHash,
			approvalSchemaHash: binding.approvalSchemaHash,
			responseSchemaHash: binding.responseSchemaHash
		};
		break;
	}
	return {
		...payload,
		metadata
	};
}
async function durableGenericResumeState(ctx, pending, resume, tools, interrupts) {
	const registry = getGenericInterruptDefinitionRegistry(ctx, { optional: true });
	const records = [];
	for (const persisted of pending) {
		if (!isPersistedInterruptDescriptor(persisted.payload)) {
			if (hasReservedInterruptBinding(persisted.payload)) throw durableGenericFailure(ctx, persisted, `Persisted interrupt ${persisted.interruptId} has an invalid binding descriptor.`);
			continue;
		}
		const descriptor = persisted.payload;
		const binding = readInterruptBinding(descriptor);
		if (!binding) {
			if (hasReservedInterruptBinding(descriptor)) throw durableGenericFailure(ctx, persisted, `Persisted interrupt ${persisted.interruptId} has an invalid or incomplete binding.`);
			continue;
		}
		if (descriptor.id !== persisted.interruptId || binding.interruptId !== persisted.interruptId || binding.interruptedRunId !== persisted.runId || binding.generation !== 0) throw durableGenericFailure(ctx, persisted, `Persisted interrupt ${persisted.interruptId} has stale correlation metadata.`);
		if (binding.kind !== "generic") {
			records.push({
				interruptId: persisted.interruptId,
				payload: descriptor,
				binding
			});
			continue;
		}
		if (!binding.definitionId || !binding.key || binding.batchIndex === void 0) {
			records.push({
				interruptId: persisted.interruptId,
				payload: descriptor,
				binding
			});
			continue;
		}
		if (!registry) throw durableGenericFailure(ctx, persisted, `Persisted generic interrupt ${persisted.interruptId} cannot be restored because no interrupt registry is available.`);
		const definition = registry.definitions.get(binding.definitionId);
		if (!definition) throw durableGenericFailure(ctx, persisted, `Persisted generic interrupt definition ${binding.definitionId} is unavailable.`);
		const payload = objectValue(descriptor.metadata)?.["tanstack:interruptPayload"];
		let request;
		try {
			request = rehydrateInterruptRequest(definition, {
				key: binding.key,
				reason: descriptor.reason,
				message: descriptor.message,
				...descriptor.expiresAt !== void 0 ? { expiresAt: descriptor.expiresAt } : {},
				...payload !== void 0 ? { payload } : {}
			});
		} catch (error) {
			throw durableGenericFailure(ctx, persisted, `Persisted generic interrupt ${persisted.interruptId} is invalid: ${error instanceof Error ? error.message : String(error)}`);
		}
		const emitted = createInterruptBinding(request, { batchIndex: binding.batchIndex });
		if (emitted.descriptor.responseSchemaHash !== binding.responseSchemaHash || emitted.descriptor.payloadSchemaHash !== binding.payloadSchemaHash || binding.interruptId !== persisted.interruptId) throw durableGenericFailure(ctx, persisted, `Persisted generic interrupt ${persisted.interruptId} is stale.`);
		records.push({
			interruptId: persisted.interruptId,
			payload: descriptor,
			binding,
			genericRequest: request
		});
	}
	const firstRecord = records[0];
	if (firstRecord === void 0) return void 0;
	const interruptedRunId = firstRecord.binding.interruptedRunId;
	const generation = firstRecord.binding.generation;
	const validated = await validateInterruptResumeBatch({
		threadId: ctx.threadId,
		interruptedRunId,
		generation,
		pending: records,
		resume: resume.filter((entry) => records.some((record) => record.interruptId === entry.interruptId)),
		tools
	});
	if (validated.errors.length > 0 || !validated.resumeToolState) throw new InterruptResumeValidationError(validated.errors);
	const approvals = new Map(validated.resumeToolState.approvals);
	for (const record of records) {
		if (record.binding.kind !== "client-tool-execution") continue;
		const toolName = record.binding.toolName;
		if (!tools.find((candidate) => candidate.name === toolName)?.needsApproval) continue;
		const metadata = objectValue(objectValue(record.payload)?.metadata);
		const hasContext = !!metadata && Object.hasOwn(metadata, APPROVAL_CONTEXT);
		const context = hasContext ? readApprovalContext(metadata?.[APPROVAL_CONTEXT]) : void 0;
		const previous = await interrupts.get(context?.approvalInterruptId ?? `approval_${record.binding.toolCallId}`);
		if (!previous || previous.status !== "resolved" || previous.threadId !== ctx.threadId || (hasContext ? !context || context.approvalRunId !== previous.runId : previous.runId !== record.binding.interruptedRunId) || !isPersistedInterruptDescriptor(previous.payload)) {
			const persisted = pending.find((entry) => entry.interruptId === record.interruptId);
			if (!persisted) throw new Error(`Missing persisted client interrupt ${record.interruptId}`);
			throw durableGenericFailure(ctx, persisted, `Client tool ${record.binding.toolName} has no matching resolved approval.`);
		}
		const binding = readInterruptBinding(previous.payload);
		if (!binding || binding.kind !== "tool-approval" || binding.toolCallId !== record.binding.toolCallId || binding.toolName !== record.binding.toolName || previous.payload.id !== previous.interruptId || binding.interruptedRunId !== previous.runId || binding.generation !== record.binding.generation || binding.interruptId !== previous.interruptId || hasContext && (!context || context.approvalInterruptId !== previous.interruptId || context.toolCallId !== binding.toolCallId || context.toolName !== binding.toolName || context.generation !== binding.generation || context.inputSchemaHash !== binding.inputSchemaHash || context.approvalSchemaHash !== binding.approvalSchemaHash || context.responseSchemaHash !== binding.responseSchemaHash)) throw durableGenericFailure(ctx, previous, `Client tool ${record.binding.toolName} has a stale resolved approval.`);
		const restored = await validateInterruptResumeBatch({
			threadId: ctx.threadId,
			interruptedRunId: binding.interruptedRunId,
			generation: binding.generation,
			pending: [{
				interruptId: previous.interruptId,
				payload: previous.payload,
				binding
			}],
			resume: [{
				interruptId: previous.interruptId,
				status: "resolved",
				payload: previous.response
			}],
			tools,
			...previous.resolvedAt !== void 0 ? { now: previous.resolvedAt } : {}
		});
		if (restored.errors.length > 0 || !restored.resumeToolState) throw new InterruptResumeValidationError(restored.errors);
		const decision = restored.resumeToolState.approvals?.get(binding.toolCallId);
		if (decision !== true && (typeof decision !== "object" || !decision.approved)) throw durableGenericFailure(ctx, previous, `Client tool ${record.binding.toolName} was not approved.`);
		approvals.set(binding.toolCallId, decision);
	}
	const isGenericRecord = (record) => record.binding.kind === "generic" && record.genericRequest !== void 0;
	const genericRecords = [];
	const batchIndexes = /* @__PURE__ */ new Set();
	for (const record of records) {
		if (!isGenericRecord(record)) continue;
		const batchIndex = record.binding.batchIndex;
		if (batchIndex === void 0 || batchIndexes.has(batchIndex)) throw new InterruptResumeValidationError([{
			scope: "batch",
			threadId: ctx.threadId,
			interruptedRunId,
			generation,
			interruptIds: records.map((item) => item.interruptId),
			code: "stale",
			message: "Persisted generic interrupts have duplicate or invalid batch indexes.",
			source: "server",
			retryable: false
		}]);
		batchIndexes.add(batchIndex);
		genericRecords.push({
			record,
			batchIndex
		});
	}
	genericRecords.sort((left, right) => left.batchIndex - right.batchIndex);
	return {
		...validated.resumeToolState,
		approvals,
		genericInterruptRequests: new Map(genericRecords.flatMap(({ record }) => record.genericRequest ? [[record.interruptId, record.genericRequest]] : []))
	};
}
function resolvedApprovalDecision(entry) {
	if (entry.status === "cancelled") return false;
	const payload = objectValue(entry.payload);
	return typeof payload?.approved === "boolean" ? payload.approved : false;
}
/**
* Translate the persisted pending interrupts + the resume batch into the
* `ChatResumeToolState` the chat engine consumes. This is the server-authoritative
* counterpart to the engine's ephemeral (client-history) reconstruction: because
* the persistence flow sends empty client messages, the engine has no history to
* rebuild from, so persistence supplies the resume state directly (and clears
* `config.resume` so the ephemeral path is skipped — see `onConfig`).
*/
function resumeToolStateFromPending(pending, resumeByInterruptId) {
	const approvals = /* @__PURE__ */ new Map();
	const clientToolResults = /* @__PURE__ */ new Map();
	const cancelledToolCallIds = /* @__PURE__ */ new Set();
	for (const interrupt of pending) {
		const entry = resumeByInterruptId.get(interrupt.interruptId);
		if (!entry) continue;
		if (hasReservedInterruptBinding(interrupt.payload)) continue;
		const kind = interruptKind(interrupt);
		const reason = stringField(interrupt.payload, "reason");
		const toolCallId = stringField(interrupt.payload, "toolCallId");
		if (entry.status === "cancelled" && toolCallId) cancelledToolCallIds.add(toolCallId);
		if (kind === "approval" || reason === "approval_required") {
			approvals.set(interrupt.interruptId, resolvedApprovalDecision(entry));
			continue;
		}
		if (entry.status === "resolved" && toolCallId && (kind === "client_tool" || reason === "client_tool_input")) clientToolResults.set(toolCallId, entry.payload);
	}
	if (approvals.size === 0 && clientToolResults.size === 0 && cancelledToolCallIds.size === 0) return;
	return {
		approvals,
		clientToolResults,
		cancelledToolCallIds
	};
}
function interruptPayload(interrupt) {
	return interrupt && typeof interrupt === "object" ? { ...interrupt } : { value: interrupt };
}
function isArtifactRef(value) {
	const record = objectValue(value);
	return !!record && typeof record.artifactId === "string";
}
function mediaActivity(activity) {
	return activity === "image" || activity === "audio" || activity === "tts" || activity === "video" || activity === "transcription" ? activity : void 0;
}
function parseDataUrl(value) {
	const match = /^data:([^;,]+)?(;base64)?,(.*)$/s.exec(value);
	if (!match) return void 0;
	const mimeType = match[1] || "application/octet-stream";
	const raw = match[3] ?? "";
	let payload;
	try {
		payload = decodeURIComponent(raw);
	} catch {
		payload = raw;
	}
	return {
		mimeType,
		bytes: match[2] ? base64ToUint8Array(payload) : new TextEncoder().encode(payload)
	};
}
function extensionForMime(mimeType) {
	if (mimeType === void 0) return "bin";
	switch (mimeType) {
		case "image/png": return "png";
		case "image/jpeg": return "jpg";
		case "audio/wav": return "wav";
		case "audio/mpeg": return "mp3";
		case "audio/mp3": return "mp3";
		case "video/mp4": return "mp4";
		case "application/json": return "json";
		default: return "bin";
	}
}
function defaultArtifactName(descriptor, activity, index) {
	const ext = extensionForMime(descriptor.mimeType);
	return `${activity}-${descriptor.role}-${descriptor.mediaType ?? "artifact"}-${index}.${ext}`;
}
function sourcePartDescriptors(part, role, path) {
	const record = objectValue(part);
	const type = stringField(record ?? {}, "type");
	const source = objectValue(record?.source);
	if (!record || !source || type !== "image" && type !== "audio" && type !== "video") return [];
	const sourceType = stringField(source, "type");
	const mimeType = stringField(source, "mimeType") ?? `${type}/mpeg`;
	if (sourceType === "data") {
		const value = stringField(source, "value");
		if (!value) return [];
		return [{
			role,
			path,
			mediaType: type,
			mimeType,
			bytes: base64ToUint8Array(value)
		}];
	}
	if (sourceType === "url") {
		const value = stringField(source, "value");
		if (!value) return [];
		return [{
			role,
			path,
			mediaType: type,
			mimeType,
			url: value
		}];
	}
	return [];
}
function promptInputDescriptors(inputs) {
	const prompt = objectValue(inputs)?.prompt;
	if (!Array.isArray(prompt)) return [];
	const counts = {
		image: 0,
		audio: 0,
		video: 0
	};
	const descriptors = [];
	for (const part of prompt) {
		const type = stringField(objectValue(part) ?? {}, "type");
		if (type !== "image" && type !== "audio" && type !== "video") continue;
		const index = counts[type] ?? 0;
		counts[type] = index + 1;
		descriptors.push(...sourcePartDescriptors(part, "input", `prompt.${type}s.${index}`));
	}
	return descriptors;
}
function generatedMediaDescriptor(args) {
	const media = objectValue(args.media);
	if (!media) return void 0;
	const b64Json = stringField(media, "b64Json");
	if (b64Json) return {
		role: args.role,
		path: args.path,
		mediaType: args.mediaType,
		mimeType: stringField(media, "contentType") ?? args.mimeType,
		bytes: base64ToUint8Array(b64Json),
		jobId: args.jobId,
		expiresAt: args.expiresAt
	};
	const url = stringField(media, "url");
	if (url) return {
		role: args.role,
		path: args.path,
		mediaType: args.mediaType,
		mimeType: stringField(media, "contentType") ?? args.mimeType,
		url,
		jobId: args.jobId,
		expiresAt: args.expiresAt
	};
}
function builtInArtifactDescriptors(activity, inputs, result) {
	const descriptors = promptInputDescriptors(inputs);
	const output = objectValue(result);
	if (!output) return descriptors;
	if (activity === "image" && Array.isArray(output.images)) output.images.forEach((image, index) => {
		const descriptor = generatedMediaDescriptor({
			role: "output",
			path: `images.${index}`,
			mediaType: "image",
			mimeType: "image/png",
			media: image
		});
		if (descriptor) descriptors.push(descriptor);
	});
	if (activity === "audio") {
		const descriptor = generatedMediaDescriptor({
			role: "output",
			path: "audio",
			mediaType: "audio",
			mimeType: "audio/mpeg",
			media: output.audio
		});
		if (descriptor) descriptors.push(descriptor);
	}
	if (activity === "tts") {
		const audio = stringField(output, "audio");
		if (audio) {
			const format = stringField(output, "format");
			descriptors.push({
				role: "output",
				path: "audio",
				mediaType: "audio",
				mimeType: stringField(output, "contentType") ?? (format ? `audio/${format}` : "audio/mpeg"),
				bytes: base64ToUint8Array(audio)
			});
		}
	}
	if (activity === "video" && output.body instanceof ReadableStream) descriptors.push({
		role: "output",
		path: "video",
		mediaType: "video",
		mimeType: stringField(output, "contentType") ?? "video/mp4",
		bytes: output.body,
		jobId: stringField(output, "jobId")
	});
	else if (activity === "video" && typeof output.url === "string") descriptors.push({
		role: "output",
		path: "video",
		mediaType: "video",
		mimeType: "video/mp4",
		url: output.url,
		jobId: stringField(output, "jobId"),
		expiresAt: output.expiresAt instanceof Date ? output.expiresAt : void 0
	});
	if (activity === "transcription") {
		const audio = objectValue(inputs)?.audio;
		if (typeof audio === "string") {
			const data = parseDataUrl(audio);
			descriptors.push({
				role: "input",
				path: "audio",
				mediaType: "audio",
				mimeType: data?.mimeType ?? "audio/mpeg",
				bytes: data?.bytes ?? base64ToUint8Array(audio)
			});
		} else if (audio instanceof ArrayBuffer) descriptors.push({
			role: "input",
			path: "audio",
			mediaType: "audio",
			mimeType: "audio/mpeg",
			bytes: audio.slice(0)
		});
		else if (typeof Blob !== "undefined" && audio instanceof Blob) descriptors.push({
			role: "input",
			path: "audio",
			mediaType: "audio",
			mimeType: audio.type || "audio/mpeg",
			bytes: audio
		});
		if (Array.isArray(output.segments) || Array.isArray(output.words)) descriptors.push({
			role: "output",
			path: "transcription",
			mediaType: "json",
			mimeType: "application/json",
			json: output
		});
	}
	return descriptors;
}
/**
* Reject hosts that only make sense as an SSRF target: loopback, link-local
* (including the cloud metadata address), private, and unique-local ranges.
*
* Applied to caller-supplied input URLs only. Provider result URLs skip it on
* purpose — a self-hosted or local provider legitimately returns a `localhost`
* URL, and those live inside the same trust boundary as the adapter itself.
*
* This checks IP *literals*. A hostname that resolves to a private address
* passes, which is why `allowInputUrl` is required rather than optional.
*/
function isBlockedInputHost(hostname) {
	const host = hostname.toLowerCase().replace(/^\[|\]$/g, "");
	if (host === "localhost" || host.endsWith(".localhost")) return true;
	const ipv4 = /^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/.exec(host);
	if (ipv4) {
		const [a, b] = [Number(ipv4[1]), Number(ipv4[2])];
		if (a === 127 || a === 0 || a === 10) return true;
		if (a === 169 && b === 254) return true;
		if (a === 172 && b >= 16 && b <= 31) return true;
		if (a === 192 && b === 168) return true;
		return false;
	}
	if (host === "::" || host === "::1") return true;
	if (host.startsWith("fe80:")) return true;
	if (/^f[cd][0-9a-f]{2}:/.test(host)) return true;
	const mappedDotted = /^::ffff:(\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3})$/.exec(host);
	if (mappedDotted?.[1]) return isBlockedInputHost(mappedDotted[1]);
	const mappedHex = /^::ffff:([0-9a-f]{1,4}):([0-9a-f]{1,4})$/.exec(host);
	if (mappedHex?.[1] && mappedHex[2]) {
		const high = Number.parseInt(mappedHex[1], 16);
		const low = Number.parseInt(mappedHex[2], 16);
		return isBlockedInputHost(`${high >> 8}.${high & 255}.${low >> 8}.${low & 255}`);
	}
	return false;
}
/**
* Fail the stream once more than `maxBytes` have passed through, so an
* unexpectedly huge artifact can't fill the blob store.
*
* Only used when the response does NOT already bound itself — a chunked reply,
* or a content-encoded one whose declared length describes the compressed
* bytes. When `content-length` describes the body the store will drain, HTTP
* framing is the bound and wrapping would only cost the caller the declared
* length: a `TransformStream`'s readable side carries none, which is what
* pushes a length-strict runtime (workerd + R2) onto a multipart upload.
*/
function capBodySize(body, maxBytes, url) {
	let seen = 0;
	return body.pipeThrough(new TransformStream({ transform(chunk, controller) {
		seen += chunk.byteLength;
		if (seen > maxBytes) {
			controller.error(/* @__PURE__ */ new Error(`Artifact at ${url} exceeds maxArtifactBytes (${maxBytes}).`));
			return;
		}
		controller.enqueue(chunk);
	} }));
}
/**
* Resolve a descriptor to the bytes to store. Returns `undefined` when the
* descriptor is deliberately not persisted — today that means a caller-supplied
* input URL without an `allowInputUrl` opt-in.
*/
async function descriptorBody(descriptor, opts) {
	if (descriptor.json !== void 0) {
		const body = JSON.stringify(descriptor.json);
		return {
			body,
			size: new TextEncoder().encode(body).byteLength,
			mimeType: descriptor.mimeType ?? "application/json"
		};
	}
	if (descriptor.bytes !== void 0) {
		const body = descriptor.bytes;
		let size;
		if (typeof body === "string") size = new TextEncoder().encode(body).byteLength;
		else if (body instanceof ArrayBuffer) size = body.byteLength;
		else if (ArrayBuffer.isView(body)) size = body.byteLength;
		else if (typeof Blob !== "undefined" && body instanceof Blob) size = body.size;
		else size = 0;
		return {
			body,
			size,
			mimeType: descriptor.mimeType ?? "application/octet-stream"
		};
	}
	if (descriptor.url) {
		const data = parseDataUrl(descriptor.url);
		if (data) return {
			body: data.bytes,
			size: data.bytes.byteLength,
			mimeType: descriptor.mimeType ?? data.mimeType
		};
		const isCallerSupplied = descriptor.role === "input";
		const allowInputUrl = opts?.allowInputUrl;
		if (isCallerSupplied && !allowInputUrl) return void 0;
		let target;
		try {
			target = new URL(descriptor.url);
		} catch {
			throw new Error(`Failed to persist artifact: ${descriptor.url} is not a valid URL.`);
		}
		if (target.protocol !== "https:" && target.protocol !== "http:") throw new Error(`Refusing to fetch artifact over ${target.protocol} (${descriptor.path}).`);
		if (allowInputUrl && isCallerSupplied) {
			if (isBlockedInputHost(target.hostname)) throw new Error(`Refusing to fetch input artifact from internal host ${target.hostname}.`);
			if (!await allowInputUrl({
				url: target,
				descriptor
			})) throw new Error(`Refusing to fetch input artifact from ${target.hostname}: rejected by allowInputUrl.`);
		}
		const maxBytes = opts?.maxArtifactBytes ?? DEFAULT_MAX_ARTIFACT_BYTES;
		const response = await (opts?.artifactFetch ?? globalThis.fetch)(target, {
			redirect: isCallerSupplied ? "manual" : "follow",
			signal: AbortSignal.timeout(opts?.artifactFetchTimeoutMs ?? DEFAULT_ARTIFACT_FETCH_TIMEOUT_MS)
		});
		if (isCallerSupplied && response.status >= 300 && response.status < 400) throw new Error(`Refusing to follow a redirect for input artifact ${descriptor.path}.`);
		if (!response.ok) throw new Error(`Failed to persist artifact from ${descriptor.url}: HTTP ${response.status}`);
		const contentLength = response.headers.get("content-length");
		const declaredLength = contentLength === null ? void 0 : Number(contentLength);
		if (maxBytes !== false && declaredLength !== void 0 && Number.isFinite(declaredLength) && declaredLength > maxBytes) throw new Error(`Artifact at ${descriptor.url} exceeds maxArtifactBytes (${maxBytes}).`);
		const mimeType = descriptor.mimeType ?? response.headers.get("content-type") ?? "application/octet-stream";
		const encoding = response.headers.get("content-encoding");
		const decodedLengthIsKnown = declaredLength !== void 0 && Number.isFinite(declaredLength) && (encoding === null || encoding === "identity");
		const expectedLength = decodedLengthIsKnown ? declaredLength : void 0;
		if (response.body) return {
			body: maxBytes === false || decodedLengthIsKnown ? response.body : capBodySize(response.body, maxBytes, descriptor.url),
			size: 0,
			expectedLength,
			mimeType,
			sourceUrl: descriptor.url
		};
		const body = await response.arrayBuffer();
		if (maxBytes !== false && body.byteLength > maxBytes) throw new Error(`Artifact at ${descriptor.url} exceeds maxArtifactBytes (${maxBytes}).`);
		return {
			body,
			size: body.byteLength,
			mimeType,
			sourceUrl: descriptor.url
		};
	}
	throw new Error(`Artifact descriptor ${descriptor.path} has no bytes, url, or json.`);
}
async function persistGenerationArtifacts(persistence, opts, ctx, result) {
	const activity = mediaActivity(ctx.activity);
	if (!activity) return [];
	const threadId = generationScope(ctx, opts);
	const runId = ctx.runId ?? ctx.requestId;
	const extractionInput = {
		activity,
		provider: ctx.provider,
		model: ctx.model,
		threadId,
		runId,
		inputs: ctx.artifactInputs,
		result
	};
	const extracted = opts?.extractArtifacts !== void 0 ? await opts.extractArtifacts(extractionInput) : builtInArtifactDescriptors(activity, ctx.artifactInputs, result);
	if (extracted.length === 0) return [];
	const existingRefs = extracted.filter(isArtifactRef);
	const descriptors = extracted.filter((item) => !isArtifactRef(item));
	if (descriptors.length === 0) return existingRefs;
	if (!persistence.stores.artifacts || !persistence.stores.blobs) throw new Error("Generation artifact persistence requires stores.artifacts and stores.blobs.");
	const refs = [...existingRefs];
	for (const [index, descriptor] of descriptors.entries()) {
		const artifactId = ctx.createId("artifact");
		const resolved = await descriptorBody(descriptor, opts);
		if (!resolved) continue;
		const { body, size, expectedLength, mimeType, sourceUrl } = resolved;
		const name = opts?.nameArtifact?.({
			descriptor: {
				...descriptor,
				mimeType
			},
			activity,
			provider: ctx.provider,
			model: ctx.model,
			threadId,
			runId,
			index
		}) ?? descriptor.name ?? defaultArtifactName({
			...descriptor,
			mimeType
		}, activity, index);
		const key = opts?.storageKey?.({
			artifactId,
			runId,
			threadId,
			role: descriptor.role,
			activity,
			path: descriptor.path,
			mimeType,
			name
		}) ?? artifactBlobKey({
			runId,
			artifactId
		});
		const stored = await persistence.stores.blobs.put(key, body, {
			contentType: mimeType,
			...expectedLength !== void 0 ? { expectedLength } : {},
			customMetadata: {
				runId,
				threadId,
				role: descriptor.role,
				activity,
				path: descriptor.path
			}
		});
		const resolvedSize = size || stored.size || 0;
		const createdAtMs = Date.now();
		const record = {
			artifactId,
			runId,
			threadId,
			blobKey: key,
			name,
			mimeType,
			size: resolvedSize,
			sourceUrl,
			createdAt: createdAtMs
		};
		await persistence.stores.artifacts.save(record);
		refs.push({
			role: descriptor.role,
			artifactId,
			threadId,
			runId,
			name,
			mimeType,
			size: resolvedSize,
			createdAt: new Date(createdAtMs).toISOString(),
			...sourceUrl ? { sourceUrl } : {},
			source: {
				activity,
				path: descriptor.path,
				provider: ctx.provider,
				model: ctx.model,
				mediaType: descriptor.mediaType,
				jobId: descriptor.jobId,
				expiresAt: descriptor.expiresAt instanceof Date ? descriptor.expiresAt.toISOString() : descriptor.expiresAt
			}
		});
	}
	if (opts?.artifactUrl) for (let i = 0; i < refs.length; i++) {
		const ref = refs[i];
		if (ref && !ref.url) {
			const url = opts.artifactUrl(ref);
			if (url) refs[i] = {
				...ref,
				url
			};
		}
	}
	return refs;
}
/**
* Rewrite the live result's media fields to each output ref's durable serve URL
* (`ref.url`), so the live result matches what a reload restores. Keyed off the
* ref's `source.path`: `images.<i>` → `result.images[i].url`, `video` →
* `result.url`, `audio` (object) → `result.audio.url`. tts (a base64 string) and
* transcription (json) have no media-URL field, so they are left as-is; their
* durable bytes are reachable via `result.artifacts`. A no-op when no ref has a
* `url`.
*/
function applyDurableMediaUrls(result, refs) {
	let next = result;
	for (const ref of refs) {
		if (ref.role !== "output" || !ref.url) continue;
		const path = ref.source.path;
		if (path.startsWith("images.")) {
			const index = Number(path.slice(7));
			const images = next.images;
			if (Array.isArray(images) && objectValue(images[index])) {
				const cloned = [...images];
				cloned[index] = {
					...objectValue(images[index]),
					url: ref.url
				};
				next = {
					...next,
					images: cloned
				};
			}
		} else if (path === "video") {
			const { body: _body, contentType: _contentType, ...rest } = next;
			next = {
				...rest,
				url: ref.url
			};
		} else if (path === "audio" && objectValue(next.audio)) next = {
			...next,
			audio: {
				...objectValue(next.audio),
				url: ref.url
			}
		};
	}
	return next;
}
function resolvePersistencePlan(persistence) {
	return {
		wantsInterrupts: persistence.stores.interrupts !== void 0,
		wantsArtifactPersistence: persistence.stores.artifacts !== void 0 && persistence.stores.blobs !== void 0,
		runs: persistence.stores.runs,
		sessions: persistence.stores.sessions
	};
}
async function createOrResumeRun(runs, runId, threadId) {
	return (await runs?.createOrResume({
		runId,
		threadId,
		startedAt: Date.now()
	}))?.usage;
}
function sumOptionalNumber(current, next) {
	if (current === void 0) return next;
	if (next === void 0) return current;
	return current + next;
}
function sumNumberFields(current, next) {
	if (!current) return next;
	if (!next) return current;
	const result = { ...current };
	for (const key of Object.keys(next)) {
		const currentValue = current[key];
		const nextValue = next[key];
		if (typeof nextValue === "number") result[key] = (typeof currentValue === "number" ? currentValue : 0) + nextValue;
	}
	return result;
}
function tokenUsageFromChunk(chunk) {
	if (chunk.type !== "RUN_FINISHED" && chunk.type !== "RUN_ERROR") return;
	const usage = chunk.usage;
	if (usage != null && typeof usage === "object" && !Array.isArray(usage) && "promptTokens" in usage) return usage;
	const metadata = chunk.metadata;
	const tanstack = metadata != null && typeof metadata === "object" && "tanstack" in metadata ? metadata.tanstack : void 0;
	const leftover = tanstack != null && typeof tanstack === "object" && !Array.isArray(tanstack) ? tanstack.usage : void 0;
	return fromSpecTokenUsage(Array.isArray(usage) ? usage : void 0, leftover);
}
function accumulateTokenUsage(current, next) {
	if (!current) return { ...next };
	const promptTokensDetails = sumNumberFields(current.promptTokensDetails, next.promptTokensDetails);
	const completionTokensDetails = sumNumberFields(current.completionTokensDetails, next.completionTokensDetails);
	const costDetails = sumNumberFields(current.costDetails, next.costDetails);
	const providerUsageDetails = next.providerUsageDetails ?? current.providerUsageDetails;
	const durationSeconds = sumOptionalNumber(current.durationSeconds, next.durationSeconds);
	const unitsBilled = sumOptionalNumber(current.unitsBilled, next.unitsBilled);
	const billed = accumulateBilled(current.billed, next.billed);
	const cost = sumOptionalNumber(current.cost, next.cost);
	return {
		...current,
		...next,
		promptTokens: current.promptTokens + next.promptTokens,
		completionTokens: current.completionTokens + next.completionTokens,
		totalTokens: current.totalTokens + next.totalTokens,
		...promptTokensDetails ? { promptTokensDetails } : {},
		...completionTokensDetails ? { completionTokensDetails } : {},
		...durationSeconds !== void 0 ? { durationSeconds } : {},
		...unitsBilled !== void 0 ? { unitsBilled } : {},
		...billed !== void 0 ? { billed } : {},
		...cost !== void 0 ? { cost } : {},
		...costDetails ? { costDetails } : {},
		...providerUsageDetails ? { providerUsageDetails } : {}
	};
}
/**
* Sum billed quantities when both reports use the same unit. Different units
* cannot be added, so the later report wins.
*/
function accumulateBilled(current, next) {
	if (!current) return next;
	if (!next) return current;
	if (current.unit !== next.unit) return next;
	return {
		quantity: current.quantity + next.quantity,
		unit: current.unit
	};
}
async function completeRun(runs, runId, usage) {
	await runs?.update(runId, {
		status: "completed",
		finishedAt: Date.now(),
		detachedSince: void 0,
		...usage ? { usage } : {}
	});
}
async function failRun(runs, runId, error, usage) {
	const runError = toRunErrorPayload(error);
	await runs?.update(runId, {
		status: "failed",
		finishedAt: Date.now(),
		detachedSince: void 0,
		error: {
			message: runError.message,
			...runError.code !== void 0 ? { code: runError.code } : {}
		},
		...usage ? { usage } : {}
	});
}
/**
* Record a human-in-the-loop PAUSE.
*
* Deliberately writes NO `finishedAt`: `'interrupted'` is not a terminal status
* (`isTerminalRunStatus('interrupted')` is `false`), and stamping a terminal
* timestamp on it told every reader the run was over while it was in fact
* waiting for a human. Only `abortRun`/`completeRun`/`failRun` finish a run.
*/
async function interruptRun(runs, runId, usage) {
	await runs?.update(runId, {
		status: "interrupted",
		...usage ? { usage } : {}
	});
}
/**
* Record that the run has ended for good — an explicit cancel, or a disconnect
* on a run that has nothing to reattach to. Terminal, so it carries
* `finishedAt`.
*/
async function abortRun(runs, runId, usage) {
	await runs?.update(runId, {
		status: "aborted",
		finishedAt: Date.now(),
		detachedSince: void 0,
		...usage ? { usage } : {}
	});
}
/**
* Whether some middleware has declared this run detachable — i.e. it has a
* durable event log and a run store, so a disconnect can be survived and the
* run picked back up rather than destroyed.
*
* The capability is read from CORE, never from `@tanstack/ai-sandbox`: sandbox
* provides it, persistence consumes it, and a persistence → sandbox import
* would invert the layering.
*/
function detachableRun(ctx) {
	return getDetachableRun(ctx, { optional: true }) === true;
}
function threadMessages(loaded) {
	return Array.isArray(loaded) ? loaded : loaded.messages;
}
/**
* Chat-only **state** persistence middleware. Provides durable transcript,
* run records, and interrupts for `chat()`. Does **not** provide locks —
* use `withLocks` from `@tanstack/ai` for multi-instance coordination.
*
* This middleware never mutates the chunk stream; delivery durability
* (replaying a disconnected/reloaded stream) is a separate transport-layer
* concern (see the resumable-streams docs).
*
* Requires `stores.messages`. When `stores.interrupts` is present,
* `stores.runs` is also required.
*
* Incoming `messages` merge into the stored thread by id. An empty list loads
* the stored thread. The last incoming id that already exists in stored is a
* cutoff; stored messages after it are dropped (reload). If no incoming id is
* in stored, every stored message stays. Same id: incoming wins. New ids and
* messages with no id are appended. `saveThread` still replaces the thread
* with that merged list.
*
* @param persistence - Must satisfy {@link ChatTranscriptStores} (messages
*   required). Known-absent `messages` or `interrupts` without `runs` fail at
*   compile time; fully dynamic bags are checked at runtime.
*/
function withPersistence(persistence, options = {}) {
	validateChatPersistenceStores(persistence);
	const snapshotStreaming = options.snapshotStreaming ?? false;
	const snapshotIntervalMs = options.snapshotIntervalMs ?? 1e3;
	const { wantsInterrupts, runs, sessions } = resolvePersistencePlan(persistence);
	const messageStore = persistence.stores.messages;
	if (!messageStore) throw new Error("Chat persistence requires stores.messages.");
	const activityStore = persistence.stores.activities;
	async function persistActivities(ctx) {
		if (!activityStore || ctx.activities === void 0) return;
		try {
			await activityStore.saveActivities(ctx.threadId, [...ctx.activities]);
		} catch (error) {
			console.warn(`[ai-persistence] saveActivities failed for thread '${ctx.threadId}'`, error);
		}
	}
	const provides = [
		PersistenceCapability,
		PersistenceCompletionCapability,
		LoadChildCapability,
		...persistence.stores.metadata ? [MetadataCapability] : [],
		...wantsInterrupts ? [InterruptsCapability] : []
	];
	const subagentRuns = createSubagentRunRecorder({
		messages: messageStore,
		runs,
		intervalMs: snapshotIntervalMs,
		...wantsInterrupts && persistence.stores.interrupts ? { interrupts: persistence.stores.interrupts } : {},
		...sessions ? { sessions } : {}
	});
	async function updateStreamingRows(ctx, stopReason) {
		const state = runState.get(ctx);
		const ids = state?.streamingMessageIds;
		if (!state || !ids?.size) return;
		const loaded = threadMessages(await messageStore.loadThread(ctx.threadId));
		let changed = false;
		const messages = loaded.map((message) => {
			if (message.role !== "assistant" || message.id === void 0 || !ids.has(message.id)) return message;
			changed = true;
			const metadata = mergeMetadata(message.metadata, state.streamingMetadata);
			const next = {
				...message,
				...metadata !== void 0 ? { metadata } : {}
			};
			return stopReason === void 0 ? next : withTanstackMetadata(next, { stopReason });
		});
		if (changed) await messageStore.saveThread(ctx.threadId, messages);
	}
	return defineChatMiddleware({
		name: "chat-persistence",
		routedSubagentPersistence: subagentRuns,
		provides,
		setup(ctx) {
			providePersistence(ctx, persistence);
			if (persistence.stores.metadata) provideMetadata(ctx, persistence.stores.metadata);
			provideLoadChild(ctx, (subagentRunId) => subagentRuns.loadChild(subagentRunId, {
				threadId: ctx.threadId,
				...ctx.subagentRunId !== void 0 && { subagentRunId: ctx.subagentRunId }
			}));
			let resolveCompletion = () => void 0;
			let rejectCompletion = () => void 0;
			const completion = new Promise((resolve, reject) => {
				resolveCompletion = resolve;
				rejectCompletion = reject;
			});
			completion.catch(() => void 0);
			runState.set(ctx, {
				merged: false,
				interrupted: false,
				completion: {
					promise: completion,
					resolve: resolveCompletion,
					reject: rejectCompletion
				}
			});
			providePersistenceCompletion(ctx, { waitForRunCompletion: () => completion });
			if (wantsInterrupts && persistence.stores.interrupts) provideInterrupts(ctx, persistence.stores.interrupts);
			providePendingTurn(ctx, { snapshot: async () => {
				const stored = threadMessages(await messageStore.loadThread(ctx.threadId));
				const list = mergeStoredMessages(stored, ctx.messages);
				await messageStore.saveThread(ctx.threadId, list);
				const cutoff = storedCutoff(stored, ctx.messages);
				if (activityStore && cutoff < stored.length) await activityStore.saveActivities(ctx.threadId, keptActivities(await activityStore.loadActivities(ctx.threadId), stored, cutoff));
			} });
		},
		async onConfig(ctx, config) {
			if (snapshotStreaming && (ctx.phase === "beforeModel" || ctx.phase === "structuredOutput")) {
				const current = runState.get(ctx);
				if (current) {
					current.streamingMetadata = void 0;
					current.streamingMessageIds = /* @__PURE__ */ new Set();
					current.streamingMessageId = void 0;
					current.streamingMessageCreatedAt = void 0;
					current.streamingText = "";
					current.lastSnapshotAt = void 0;
				}
			}
			if (ctx.phase !== "init") return;
			const patch = {};
			if (wantsInterrupts && persistence.stores.interrupts) {
				const ownedPending = (await persistence.stores.interrupts.listPending(ctx.threadId)).filter(isChatOwnedPendingInterrupt);
				rejectMixedRunPending(ownedPending, ctx);
				const resumeByInterruptId = validatePendingResumes(ownedPending, config.resume, ctx);
				if ((config.resume?.length ?? 0) > 0) {
					const resumeToolState = resumeToolStateFromPending(ownedPending, resumeByInterruptId);
					const genericResumeState = await durableGenericResumeState(ctx, ownedPending, config.resume ?? [], config.tools, persistence.stores.interrupts);
					patch.resume = [];
					if (resumeToolState || genericResumeState) patch.resumeToolState = mergeResumeToolState(resumeToolState, genericResumeState);
				}
				const state = runState.get(ctx);
				if (state && ownedPending.length > 0) state.pendingResumes = {
					pending: ownedPending,
					resumeByInterruptId
				};
			}
			const storedUsage = await createOrResumeRun(runs, ctx.runId, ctx.threadId);
			const state = runState.get(ctx);
			if (state && storedUsage) state.usage = storedUsage;
			if (!state?.merged) {
				if (state) state.merged = true;
				const stored = threadMessages(await messageStore.loadThread(ctx.threadId));
				patch.messages = mergeStoredMessages(stored, config.messages);
				if (activityStore) {
					const byId = new Map(keptActivities(await activityStore.loadActivities(ctx.threadId), stored, storedCutoff(stored, config.messages)).map((record) => [record.id, record]));
					for (const record of ctx.activities ?? []) {
						const index = byId.get(record.id)?.index ?? record.index;
						byId.set(record.id, {
							...record,
							index
						});
					}
					patch.activities = [...byId.values()];
				}
			}
			return Object.keys(patch).length > 0 ? patch : void 0;
		},
		async onStart(ctx) {
			const state = runState.get(ctx);
			if (state) state.firstRunMessage = ctx.messages.length;
			try {
				await messageStore.saveThread(ctx.threadId, [...ctx.messages]);
				await persistActivities(ctx);
			} catch {}
		},
		async onChunk(ctx, chunk) {
			await subagentRuns.chunk({
				threadId: ctx.threadId,
				runId: ctx.runId,
				...ctx.subagentRunId !== void 0 && { subagentRunId: ctx.subagentRunId },
				chunk
			});
			const current = runState.get(ctx);
			const isParentChunk = !("subagentRunId" in chunk) || chunk.subagentRunId === void 0;
			if (snapshotStreaming && isParentChunk && current && chunk.type === "RUN_STARTED") {
				current.streamingMetadata = void 0;
				current.streamingMessageIds = /* @__PURE__ */ new Set();
				current.streamingMessageId = void 0;
				current.streamingMessageCreatedAt = void 0;
				current.streamingText = "";
				current.lastSnapshotAt = void 0;
			}
			if (snapshotStreaming && isParentChunk && current) {
				const tanstack = tanstackMetadata(chunk);
				const metadata = chunk.type === "TOOL_CALL_START" ? tanstack === void 0 ? void 0 : { tanstack } : chunk.metadata;
				current.streamingMetadata = mergeMetadata(current.streamingMetadata, metadata);
				if (chunk.type === "RUN_FINISHED") {
					current.streamingMetadata = withTanstackMetadata({ metadata: current.streamingMetadata }, {
						...chunk.responseId !== void 0 ? { responseId: chunk.responseId } : {},
						...chunk.model !== void 0 ? { model: chunk.model } : {}
					}).metadata;
					await updateStreamingRows(ctx);
				}
			}
			if (snapshotStreaming && isParentChunk && (ctx.phase === "modelStream" || ctx.phase === "structuredOutput")) {
				const s = runState.get(ctx);
				if (s && chunk.type === "TEXT_MESSAGE_START") {
					s.streamingMessageId = typeof chunk.messageId === "string" && chunk.messageId !== "" ? chunk.messageId : void 0;
					s.streamingMessageCreatedAt = /* @__PURE__ */ new Date();
					s.streamingText = "";
				} else if (s && chunk.type === "TOOL_CALL_START" && typeof chunk.parentMessageId === "string" && chunk.parentMessageId !== "" && s.streamingMessageId === void 0) {
					s.streamingMessageId = chunk.parentMessageId;
					s.streamingMessageCreatedAt ??= /* @__PURE__ */ new Date();
				}
			}
			if (snapshotStreaming && isParentChunk && chunk.type === "TEXT_MESSAGE_CONTENT" && typeof chunk.delta === "string") {
				const snapshotState = runState.get(ctx);
				if (snapshotState) {
					snapshotState.streamingText = (snapshotState.streamingText ?? "") + chunk.delta;
					const now = Date.now();
					if (now - (snapshotState.lastSnapshotAt ?? 0) >= snapshotIntervalMs) {
						snapshotState.lastSnapshotAt = now;
						try {
							await messageStore.saveThread(ctx.threadId, [...ctx.messages, {
								role: "assistant",
								content: snapshotState.streamingText,
								...snapshotState.streamingMetadata !== void 0 ? { metadata: snapshotState.streamingMetadata } : {},
								...snapshotState.streamingMessageId ? { id: snapshotState.streamingMessageId } : {},
								...snapshotState.streamingMessageCreatedAt ? { createdAt: snapshotState.streamingMessageCreatedAt } : {}
							}]);
							if (snapshotState.streamingMessageId !== void 0) {
								snapshotState.streamingMessageIds ??= /* @__PURE__ */ new Set();
								snapshotState.streamingMessageIds.add(snapshotState.streamingMessageId);
							}
							await persistActivities(ctx);
						} catch {}
					}
				}
			}
			if (chunk.type !== "RUN_FINISHED" || chunk.outcome?.type !== "interrupt") return;
			const state = runState.get(ctx);
			if (!state) return;
			if (wantsInterrupts && persistence.stores.interrupts) {
				const payloads = chunk.outcome.interrupts.map((interrupt) => ({
					interrupt,
					payload: clientInterruptPayload(interrupt, state)
				}));
				await commitPendingResumes(state, persistence.stores.interrupts);
				for (const { interrupt, payload } of payloads) await persistence.stores.interrupts.create({
					interruptId: interrupt.id,
					runId: ctx.runId,
					threadId: ctx.threadId,
					requestedAt: Date.now(),
					payload
				});
			}
			const chunkUsage = tokenUsageFromChunk(chunk);
			const usage = ctx.phase === "modelStream" && chunkUsage ? accumulateTokenUsage(state.usage, chunkUsage) : state.usage ?? chunkUsage;
			state.usage = usage;
			await interruptRun(runs, ctx.runId, usage);
			await messageStore.saveThread(ctx.threadId, runMessages(ctx, state));
			state.interrupted = true;
			await persistActivities(ctx);
		},
		onUsage(ctx, usage) {
			const state = runState.get(ctx);
			if (!state || state.interrupted) return;
			state.usage = accumulateTokenUsage(state.usage, usage);
		},
		async onFinish(ctx, info) {
			const state = runState.get(ctx);
			if (state?.interrupted) return;
			try {
				await messageStore.saveThread(ctx.threadId, runMessages(ctx, state));
				await commitPendingResumes(state, persistence.stores.interrupts);
				await completeRun(runs, ctx.runId, state?.usage ?? info.usage);
				await persistActivities(ctx);
				state?.completion?.resolve();
			} catch (error) {
				try {
					await failRun(runs, ctx.runId, error, state?.usage);
				} finally {
					state?.completion?.reject(error);
				}
				throw error;
			}
		},
		async onError(ctx, info) {
			try {
				try {
					await updateStreamingRows(ctx, "error");
				} finally {
					await failRun(runs, ctx.runId, info.error, runState.get(ctx)?.usage);
				}
			} finally {
				runState.get(ctx)?.completion?.reject(info.error);
			}
		},
		async onAbort(ctx, info) {
			const state = runState.get(ctx);
			let terminal = false;
			try {
				terminal = info.cancelRequested === true || runs !== void 0 && await wasCancelRequested(runs, ctx.runId) || !detachableRun(ctx) && state?.interrupted !== true;
				if (terminal) try {
					await updateStreamingRows(ctx, "aborted");
				} finally {
					await abortRun(runs, ctx.runId, state?.usage);
				}
			} finally {
				if (terminal) state?.completion?.reject(info.reason);
			}
		}
	});
}
function withGenerationPersistence(persistence, opts = {}) {
	validateGenerationPersistenceStores(persistence);
	const { wantsArtifactPersistence } = resolvePersistencePlan(persistence);
	const generationRuns = persistence.stores.generationRuns;
	if (!generationRuns) throw new Error("Generation persistence requires stores.generationRuns.");
	const runIdOf = (ctx) => ctx.runId ?? ctx.requestId;
	return {
		name: "generation-persistence",
		async onStart(ctx) {
			const runId = runIdOf(ctx);
			await generationRuns.createOrResume({
				runId,
				activity: ctx.activity,
				provider: ctx.provider,
				model: ctx.model,
				startedAt: Date.now(),
				threadId: generationScope(ctx, opts)
			});
			if (wantsArtifactPersistence) ctx.resultTransforms?.push(async (result) => {
				const refs = await persistGenerationArtifacts(persistence, opts, ctx, result);
				if (refs.length === 0) return void 0;
				const base = objectValue(result) ?? {};
				const existing = base.artifacts;
				return applyDurableMediaUrls({
					...base,
					artifacts: [...Array.isArray(existing) ? existing : [], ...refs]
				}, refs);
			});
			ctx.resultTransforms?.push(async (result) => {
				const rawArtifacts = objectValue(result)?.artifacts;
				const artifacts = Array.isArray(rawArtifacts) ? rawArtifacts.filter(isArtifactRef) : [];
				await generationRuns.update(runId, {
					result,
					...artifacts.length > 0 ? { artifacts } : {}
				});
			});
		},
		async onFinish(ctx, info) {
			await generationRuns.update(runIdOf(ctx), {
				status: "completed",
				finishedAt: Date.now(),
				...info.usage ? { usage: info.usage } : {}
			});
		},
		async onError(ctx, info) {
			await generationRuns.update(runIdOf(ctx), {
				status: "failed",
				finishedAt: Date.now(),
				error: { message: info.error instanceof Error ? info.error.message : String(info.error) }
			});
		},
		async onAbort(ctx, _info) {
			await generationRuns.update(runIdOf(ctx), {
				status: "aborted",
				finishedAt: Date.now()
			});
		}
	};
}
//#endregion
export { abortRun, interruptRun, withGenerationPersistence, withPersistence };

//# sourceMappingURL=middleware.js.map