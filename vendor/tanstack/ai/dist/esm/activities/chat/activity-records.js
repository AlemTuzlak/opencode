import { mergeMetadata } from "../../utilities/merge-metadata.js";
import { generateMessageId } from "./messages.js";
import jsonPatch from "fast-json-patch";
//#region src/activities/chat/activity-records.ts
function isActivityPart(part) {
	return part.type === "activity";
}
function isActivityContent(value) {
	return value != null && typeof value === "object" && !Array.isArray(value);
}
function activityRecordToUIMessage(record) {
	return {
		id: record.id,
		role: "activity",
		parts: [{
			type: "activity",
			activityType: record.activityType,
			content: structuredClone(record.content),
			...record.subagentRunId !== void 0 && { subagentRunId: record.subagentRunId }
		}],
		...record.metadata != null ? { metadata: structuredClone(record.metadata) } : {}
	};
}
/**
* Insert activity rows into a model-derived UI transcript at each record's
* stored `index`. Earlier records are inserted first so later indexes stay
* aligned with the growing list.
*/
function interleaveActivityRecords(modelUI, records) {
	const out = [...modelUI];
	const sorted = [...records].sort((a, b) => a.index - b.index);
	for (const record of sorted) out.splice(Math.min(record.index, out.length), 0, activityRecordToUIMessage(record));
	return out;
}
/**
* Collect inbound `role: 'activity'` messages: a UIMessage with an activity
* part, or an AG-UI `ActivityMessage`. `index` is the position in the
* original inbound list so reconstruct can put them back.
*/
function peelInboundActivities(messages) {
	const records = [];
	for (const [index, message] of messages.entries()) {
		if (message.role !== "activity") continue;
		const source = Array.isArray(message.parts) ? message.parts.find(isActivityPart) : message;
		if (typeof source?.activityType !== "string" || !isActivityContent(source.content)) continue;
		const subagentRunId = source.subagentRunId ?? message.subagentRunId;
		records.push({
			id: message.id || generateMessageId(),
			activityType: source.activityType,
			content: structuredClone(source.content),
			index,
			...typeof subagentRunId === "string" && { subagentRunId },
			...isActivityContent(message.metadata) ? { metadata: structuredClone(message.metadata) } : {}
		});
	}
	return records;
}
function applyActivitySnapshotToUIMessages(messages, chunk) {
	const { messageId, activityType, content } = chunk;
	const replace = chunk.replace ?? true;
	const existingIndex = messages.findIndex((m) => m.id === messageId);
	const existing = existingIndex >= 0 ? messages[existingIndex] : void 0;
	if (existing && existing.role !== "activity") {
		console.warn(`ACTIVITY_SNAPSHOT: Message '${messageId}' is not an activity message`);
		return messages;
	}
	if (existing && !replace) return messages;
	const metadata = mergeMetadata(existing?.role === "activity" ? existing.metadata : void 0, chunk.metadata);
	const next = {
		id: messageId,
		role: "activity",
		parts: [{
			type: "activity",
			activityType,
			content: structuredClone(content ?? {})
		}],
		...metadata != null ? { metadata } : {},
		...existing?.role === "activity" && existing.createdAt != null ? { createdAt: existing.createdAt } : {},
		...existing?.role === "activity" && existing.name != null ? { name: existing.name } : {}
	};
	if (existingIndex === -1) return [...messages, next];
	return messages.map((msg, index) => index === existingIndex ? next : msg);
}
function applyActivityDeltaToUIMessages(messages, chunk) {
	const { messageId, activityType, patch } = chunk;
	const existingIndex = messages.findIndex((m) => m.id === messageId);
	if (existingIndex === -1) {
		console.warn(`ACTIVITY_DELTA: No activity message '${messageId}'`);
		return messages;
	}
	const existing = messages[existingIndex];
	if (existing == null || existing.role !== "activity") {
		console.warn(`ACTIVITY_DELTA: Message '${messageId}' is not an activity message`);
		return messages;
	}
	const activityPart = existing.parts.find(isActivityPart);
	if (activityPart && activityPart.activityType !== activityType) {
		console.warn(`ACTIVITY_DELTA: activityType '${activityType}' does not match '${activityPart.activityType}' for '${messageId}'`);
		return messages;
	}
	const baseContent = structuredClone(activityPart?.content ?? {});
	try {
		const result = jsonPatch.applyPatch(baseContent, patch ?? [], true, false);
		if (!isActivityContent(result.newDocument)) {
			console.warn(`ACTIVITY_DELTA: patched content for '${messageId}' is not an object`);
			return messages;
		}
		const nextPart = {
			type: "activity",
			activityType,
			content: structuredClone(result.newDocument)
		};
		const parts = activityPart ? existing.parts.map((part) => part.type === "activity" ? nextPart : part) : [nextPart];
		const metadata = mergeMetadata(existing.metadata, chunk.metadata);
		return messages.map((msg, index) => index === existingIndex ? {
			...msg,
			parts,
			...metadata != null ? { metadata } : {}
		} : msg);
	} catch (error) {
		const errorMessage = error instanceof Error ? error.message : String(error);
		console.warn(`Failed to apply activity patch for '${messageId}': ${errorMessage}`);
		return messages;
	}
}
function uiMessagesToActivityRecords(messages, previous, nextIndex, chunk) {
	return messages.flatMap((message) => {
		const part = message.parts.find(isActivityPart);
		if (!part) return [];
		const prev = previous.find((record) => record.id === message.id);
		const subagentRunId = prev?.subagentRunId ?? (message.id === chunk.messageId ? chunk.subagentRunId : void 0);
		return {
			id: message.id,
			activityType: part.activityType,
			content: structuredClone(part.content),
			index: prev?.index ?? nextIndex,
			...subagentRunId !== void 0 && { subagentRunId },
			...message.metadata != null ? { metadata: structuredClone(message.metadata) } : {}
		};
	});
}
function applyActivitySnapshotToRecords(records, chunk, nextIndex) {
	return uiMessagesToActivityRecords(applyActivitySnapshotToUIMessages(records.map(activityRecordToUIMessage), chunk), records, nextIndex, chunk);
}
function applyActivityDeltaToRecords(records, chunk) {
	return uiMessagesToActivityRecords(applyActivityDeltaToUIMessages(records.map(activityRecordToUIMessage), chunk), records, records.length, chunk);
}
//#endregion
export { activityRecordToUIMessage, applyActivityDeltaToRecords, applyActivityDeltaToUIMessages, applyActivitySnapshotToRecords, applyActivitySnapshotToUIMessages, interleaveActivityRecords, peelInboundActivities };

//# sourceMappingURL=activity-records.js.map