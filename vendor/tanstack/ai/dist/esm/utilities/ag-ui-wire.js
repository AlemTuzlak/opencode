import { tanstackMetadata } from "./merge-metadata.js";
import { REDACTED_THINKING_ID_PREFIX } from "./reasoning-encrypted-value.js";
import { isProviderExecutedToolCall } from "./provider-executed.js";
import { normalizeToolResult } from "./tool-result.js";
import { wireSubagentInfo, wireSubagentRunId } from "./subagent-wire.js";
import { coerceCreatedAt, modelMessageToUIMessage } from "../activities/chat/messages.js";
//#region src/utilities/ag-ui-wire.ts
function isRecord(value) {
	return typeof value === "object" && value !== null && !Array.isArray(value);
}
function rebuiltToolMetadata(metadata, createdAt, id, content, anchorOwnsUiResources = false, outcome) {
	const source = isRecord(metadata) ? metadata : {};
	const tanstack = isRecord(source.tanstack) ? { ...source.tanstack } : {};
	if (anchorOwnsUiResources) delete tanstack.uiResources;
	const date = coerceCreatedAt(createdAt);
	const toolResult = {
		...id !== void 0 ? { id } : {},
		...date && { createdAt: date.toISOString() },
		...Array.isArray(content) && { content }
	};
	const result = {
		...source,
		tanstack: {
			...tanstack,
			...outcome !== void 0 && { toolResultOutcome: outcome },
			toolResult
		}
	};
	return Object.keys(result).length ? result : void 0;
}
/**
* Serialize TanStack `UIMessage`s and `ModelMessage`s into the AG-UI
* `RunAgentInput.messages` wire shape. Anchors are spec-only (`id`, `role`,
* `name`, `content`, `toolCalls`, `metadata`). Tool results and thinking parts
* on assistant messages are additionally emitted as fan-out
* `{role:'tool',...}` and `{role:'reasoning',...}` entries for strict AG-UI
* server consumers. Set `includeSnapshotStructuredOutput` to retain complete
* structured-output metadata for UI snapshots. An assistant message whose
* parts leave the default block order goes out as several rows in the real
* order (see `TanStackMessageMetadata.continues`). A tool result also ends a
* row, and its tool row follows that row. Set `includeActivity` to emit
* AG-UI `ActivityMessage` rows (MESSAGES_SNAPSHOT only — default omit so
* RunAgentInput never carries activity).
*/
function uiMessagesToWire(messages, options) {
	const wire = [];
	const usedWireIds = new Set(messages.flatMap((message) => "id" in message && message.id && message.role !== "tool" ? [message.id] : []));
	const includeSnapshotStructuredOutput = options?.includeSnapshotStructuredOutput ?? false;
	const includeActivity = options?.includeActivity ?? false;
	const assistantIds = /* @__PURE__ */ new Set();
	for (const msg of messages) if (msg.role === "assistant" && msg.id !== void 0) assistantIds.add(msg.id);
	for (const msg of messages) {
		if (msg.role === "activity") {
			if (includeActivity && "parts" in msg) {
				const part = msg.parts.find((p) => p.type === "activity");
				if (part) {
					const activity = {
						id: msg.id,
						role: "activity",
						activityType: part.activityType,
						content: structuredClone(part.content),
						...msg.metadata != null && { metadata: msg.metadata },
						...part.subagentRunId !== void 0 && { subagentRunId: part.subagentRunId }
					};
					wire.push(activity);
				}
			}
			continue;
		}
		if (!("parts" in msg) && msg.role === "tool" && msg.toolCallId) {
			const id = uniqueToolWireId(toolWireId(msg.id, msg.toolCallId, assistantIds), usedWireIds);
			const metadata = rebuiltToolMetadata(msg.metadata, msg.createdAt, msg.id, msg.content);
			wire.push({
				role: "tool",
				id,
				...msg.name !== void 0 && { name: msg.name },
				toolCallId: msg.toolCallId,
				content: typeof msg.content === "string" ? msg.content : JSON.stringify(msg.content),
				...msg.error !== void 0 && { error: msg.error },
				...metadata !== void 0 && { metadata }
			});
			continue;
		}
		const uiMessage = "parts" in msg ? msg : modelMessageToUIMessage(msg, msg.id);
		const parts = uiMessage.parts;
		usedWireIds.add(uiMessage.id);
		if (msg.role === "system") {
			wire.push(toAnchor(uiMessage, "system", { content: parts.length > 0 ? collectText(parts) : msg.content ?? "" }, parts, includeSnapshotStructuredOutput));
			continue;
		}
		if (msg.role === "user") {
			wire.push(toAnchor(uiMessage, "user", { content: parts.length > 0 ? collectUserContent(parts) : msg.content ?? "" }, parts, includeSnapshotStructuredOutput));
			continue;
		}
		const newSegment = (continues) => ({
			thinking: [],
			parts: [],
			continues,
			closed: false
		});
		let current = newSegment(false);
		const segments = [current];
		for (const part of parts) {
			if (current.closed && (part.type === "thinking" || part.type === "text" || part.type === "tool-call")) {
				current = newSegment(false);
				segments.push(current);
			}
			const afterCall = current.parts.some((p) => p.type === "tool-call");
			if (part.type === "thinking") {
				if (current.parts.some((p) => p.type === "tool-call" && isProviderExecutedToolCall(p))) {
					current = newSegment(false);
					segments.push(current);
				} else if (afterCall || current.parts.some((p) => p.type === "text")) {
					current = newSegment(true);
					segments.push(current);
				}
				current.thinking.push(part);
			} else if (part.type === "text" && afterCall) {
				current = newSegment(true);
				segments.push(current);
				current.parts.push(part);
			} else {
				current.parts.push(part);
				if (part.type === "tool-result") current.closed = true;
			}
		}
		const explicitToolResults = new Set(parts.flatMap((part) => part.type === "tool-result" ? [part.toolCallId] : []));
		const pushToolRows = (rowParts) => {
			for (const part of rowParts) if (part.type === "tool-result") {
				const id = uniqueToolWireId(part.id ?? deriveToolMessageId(part.toolCallId), usedWireIds);
				const metadata = rebuiltToolMetadata(part.metadata, part.createdAt, part.id, part.content, true, part.outcome);
				wire.push({
					role: "tool",
					id,
					toolCallId: part.toolCallId,
					...part.name !== void 0 && { name: part.name },
					content: typeof part.content === "string" ? part.content : JSON.stringify(part.content),
					...part.error !== void 0 && { error: part.error },
					...metadata !== void 0 && { metadata }
				});
			} else if (part.type === "tool-call") {
				const approved = part.approval?.approved;
				if (explicitToolResults.has(part.id) || part.output === void 0 && (part.state !== "approval-responded" || approved === void 0)) continue;
				const result = part.output !== void 0 ? normalizeToolResult(part.output) : JSON.stringify({
					approved,
					...approved && { pendingExecution: true },
					message: approved ? "User approved this action" : "User denied this action"
				});
				const content = typeof result === "string" ? result : JSON.stringify(result);
				wire.push({
					role: "tool",
					id: uniqueToolWireId(deriveToolMessageId(part.id), usedWireIds),
					toolCallId: part.id,
					content,
					metadata: rebuiltToolMetadata(void 0, void 0, void 0, result, false, part.approval?.approved === false ? "denied" : void 0)
				});
			}
		};
		let previousAnchorId = uiMessage.id;
		let toolParts = [];
		segments.forEach((segment, index) => {
			for (const part of segment.thinking) {
				const reasoning = {
					role: "reasoning",
					id: uniqueWireId(deriveReasoningId(uiMessage.id, part), usedWireIds),
					content: part.content
				};
				if (part.signature) reasoning.encryptedValue = part.signature;
				wire.push(reasoning);
			}
			const text = collectText(segment.parts);
			const toolCalls = collectToolCalls(segment.parts);
			const anchor = toAnchor(index === 0 ? uiMessage : {
				...uiMessage,
				id: uniqueWireId(`${uiMessage.id}-segment-${index}`, usedWireIds)
			}, "assistant", {
				...text !== "" && { content: text },
				...toolCalls && { toolCalls }
			}, segment.parts, includeSnapshotStructuredOutput);
			if (segment.continues) {
				const metadata = anchor.metadata ?? {};
				anchor.metadata = {
					...metadata,
					tanstack: {
						...isRecord(metadata.tanstack) ? metadata.tanstack : {},
						continues: previousAnchorId
					}
				};
			}
			wire.push(anchor);
			previousAnchorId = anchor.id;
			toolParts.push(...segment.parts);
			if (segment.closed || index === segments.length - 1) {
				pushToolRows(toolParts);
				toolParts = [];
			}
		});
		for (const part of parts) if (part.type === "subagent") wire.push(...subagentToWire(part, options));
	}
	return wire;
}
function toAnchor(msg, role, extras, parts, includeSnapshotStructuredOutput) {
	const metadata = messageMetadata(msg, parts, includeSnapshotStructuredOutput);
	const base = {
		id: msg.id,
		...msg.name !== void 0 && { name: msg.name },
		...metadata !== void 0 && { metadata }
	};
	if (role === "system") return {
		...base,
		role,
		content: String(extras.content ?? "")
	};
	if (role === "user") return {
		...base,
		role,
		content: extras.content ?? ""
	};
	return {
		...base,
		role,
		...typeof extras.content === "string" && { content: extras.content },
		...extras.toolCalls !== void 0 && { toolCalls: extras.toolCalls }
	};
}
function messageMetadata(msg, parts, includeSnapshotStructuredOutput) {
	const base = { ...msg.metadata ?? {} };
	const tanstack = { ...tanstackMetadata(msg) };
	if (tanstack.run) {
		tanstack.run = { ...tanstack.run };
		delete tanstack.run.startedAt;
		delete tanstack.run.finishedAt;
	}
	delete tanstack.createdAt;
	delete tanstack.continues;
	delete tanstack.structuredOutput;
	delete tanstack.toolCallMetadata;
	delete tanstack.toolResult;
	delete tanstack.toolResultOutcome;
	delete tanstack.uiResources;
	const createdAt = coerceCreatedAt(msg.createdAt);
	if (createdAt !== void 0) tanstack.createdAt = createdAt.toISOString();
	const structuredOutput = serializedStructuredOutput(parts, includeSnapshotStructuredOutput);
	if (structuredOutput) tanstack.structuredOutput = structuredOutput;
	const toolCallMetadata = {};
	for (const part of parts) if (part.type === "tool-call" && part.metadata !== void 0) toolCallMetadata[part.id] = part.metadata;
	if (Object.keys(toolCallMetadata).length > 0) tanstack.toolCallMetadata = toolCallMetadata;
	const uiResources = parts.filter((p) => p.type === "ui-resource");
	if (uiResources.length > 0) tanstack.uiResources = uiResources;
	if (Object.keys(tanstack).length > 0) base.tanstack = tanstack;
	else delete base.tanstack;
	return Object.keys(base).length > 0 ? base : void 0;
}
function serializedStructuredOutput(parts, includeSnapshotStructuredOutput) {
	for (const p of parts) if (p.type === "structured-output" && (includeSnapshotStructuredOutput || p.status !== "complete")) return structuredOutputMetadata(p, includeSnapshotStructuredOutput);
}
function structuredOutputMetadata(part, includeSnapshotStructuredOutput) {
	return {
		status: part.status,
		raw: part.raw,
		...includeSnapshotStructuredOutput && part.partial !== void 0 ? { partial: part.partial } : {},
		...includeSnapshotStructuredOutput && part.data !== void 0 ? { data: part.data } : {},
		...includeSnapshotStructuredOutput && part.reasoning ? { reasoning: part.reasoning } : {},
		...part.errorMessage !== void 0 && { errorMessage: part.errorMessage }
	};
}
function collectText(parts) {
	const out = [];
	for (const p of parts) if (p.type === "text") out.push(p.content);
	else if (p.type === "structured-output" && p.status === "complete" && p.raw !== "") out.push(p.raw);
	return out.join("");
}
/**
* A child's messages, tagged with its AG-UI `subagentRunId`. The card data
* rides in `metadata.tanstack.subagent`, so the other side can rebuild the
* card and continue a suspended child.
*/
function subagentToWire(part, options) {
	const { subagent } = part;
	const info = {
		name: subagent.name,
		status: subagent.status,
		...subagent.description !== void 0 && { description: subagent.description },
		...subagent.error !== void 0 && { error: subagent.error },
		...subagent.interruptIds !== void 0 && { interruptIds: subagent.interruptIds },
		...subagent.parentSubagentRunId !== void 0 && { parentSubagentRunId: subagent.parentSubagentRunId },
		...subagent.parentToolCallId !== void 0 && { parentToolCallId: subagent.parentToolCallId },
		...subagent.metadata !== void 0 && { metadata: subagent.metadata }
	};
	const child = uiMessagesToWire(subagent.messages, options);
	const own = child.some((message) => wireSubagentRunId(message) === void 0);
	return (own ? child : [{
		id: `subagent:${subagent.id}`,
		role: "assistant"
	}, ...child]).map((message, index) => {
		const nestedId = wireSubagentRunId(message);
		if (nestedId !== void 0) {
			const nested = wireSubagentInfo(message);
			if (!nested || nested.parentSubagentRunId !== void 0) return message;
			return withSubagentInfo(message, nestedId, {
				...nested,
				parentSubagentRunId: subagent.id
			});
		}
		return withSubagentInfo(message, subagent.id, !own && index === 0 ? {
			...info,
			placeholder: true
		} : info);
	});
}
function withSubagentInfo(message, subagentRunId, info) {
	const metadata = isRecord(message.metadata) ? message.metadata : {};
	const tanstack = isRecord(metadata.tanstack) ? metadata.tanstack : {};
	return {
		...message,
		subagentRunId,
		metadata: {
			...metadata,
			tanstack: {
				...tanstack,
				subagent: info
			}
		}
	};
}
function collectUserContent(parts) {
	if (!parts.some((p) => p.type === "image" || p.type === "audio" || p.type === "video" || p.type === "document")) return collectText(parts);
	const out = [];
	for (const p of parts) if (p.type === "text") out.push({
		type: "text",
		text: p.content
	});
	else if (p.type === "image" || p.type === "audio" || p.type === "video" || p.type === "document") out.push(p);
	return out;
}
function thoughtSignatureFromMetadata(metadata) {
	if (metadata == null || typeof metadata !== "object" || Array.isArray(metadata)) return;
	if (!("thoughtSignature" in metadata)) return void 0;
	const value = metadata.thoughtSignature;
	return typeof value === "string" && value !== "" ? value : void 0;
}
function collectToolCalls(parts) {
	const calls = [];
	for (const p of parts) if (p.type === "tool-call") {
		const encryptedValue = thoughtSignatureFromMetadata(p.metadata);
		calls.push({
			id: p.id,
			type: "function",
			function: {
				name: p.name,
				arguments: p.arguments
			},
			...encryptedValue !== void 0 ? { encryptedValue } : {}
		});
	}
	return calls.length > 0 ? calls : void 0;
}
function deriveReasoningId(messageId, part) {
	const id = `${messageId}-reasoning-${part.id ?? hashContent(part.content)}`;
	return part.type === "thinking" && part.redacted ? `${REDACTED_THINKING_ID_PREFIX}${id}` : id;
}
function deriveToolMessageId(toolCallId) {
	return `tool-${toolCallId}`;
}
function uniqueToolWireId(id, used) {
	return uniqueWireId(id, used);
}
function uniqueWireId(id, used) {
	if (!used.has(id)) {
		used.add(id);
		return id;
	}
	let suffix = 2;
	while (used.has(`${id}-${suffix}`)) suffix++;
	const unique = `${id}-${suffix}`;
	used.add(unique);
	return unique;
}
function toolWireId(id, toolCallId, assistantIds) {
	const derived = deriveToolMessageId(toolCallId);
	if (id === void 0 || assistantIds.has(id)) return derived;
	return id;
}
function hashContent(s) {
	let h = 0;
	for (let i = 0; i < s.length; i++) h = h * 31 + s.charCodeAt(i) | 0;
	return Math.abs(h).toString(36);
}
//#endregion
export { uiMessagesToWire };

//# sourceMappingURL=ag-ui-wire.js.map