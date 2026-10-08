import { mergeMetadata, tanstackMetadata, withTanstackMetadata } from "../../utilities/merge-metadata.js";
import { isRedactedThinkingId } from "../../utilities/reasoning-encrypted-value.js";
import { isAssistantSegmentOf, isProviderExecutedToolCall } from "../../utilities/provider-executed.js";
import { isContentPartArray, isToolResultOutcome, normalizeToolResult } from "../../utilities/tool-result.js";
import { splitSubagentWire, subagentWireText } from "../../utilities/subagent-wire.js";
import { buildBlockOrder, orderedAssistantBlocks } from "../../utilities/block-order.js";
//#region src/activities/chat/messages.ts
function isRecord(value) {
	return typeof value === "object" && value !== null && !Array.isArray(value);
}
/**
* Check if a MessagePart is a content part (text, image, audio, video, document)
* that maps directly to a ModelMessage ContentPart.
*/
function isContentPart(part) {
	return part.type === "text" || part.type === "image" || part.type === "audio" || part.type === "video" || part.type === "document";
}
function safeJsonStringify(value) {
	try {
		return JSON.stringify(value) ?? "";
	} catch {
		return "";
	}
}
function nonEmptyString(value) {
	return typeof value === "string" && value !== "" ? value : void 0;
}
function encryptedValueFrom(value) {
	if ("encryptedValue" in value) {
		const fromSpec = nonEmptyString(value.encryptedValue);
		if (fromSpec !== void 0) return fromSpec;
	}
	return nonEmptyString(tanstackMetadata(value)?.signature);
}
/** `{ redacted: true }` when a reasoning message's id marks a redacted block. */
function redactedFrom(value) {
	return "id" in value && isRedactedThinkingId(value.id) ? { redacted: true } : {};
}
function toolCallFromWire(toolCall, bag) {
	const fromBag = bag != null && typeof bag === "object" && !Array.isArray(bag) ? bag : void 0;
	const encrypted = encryptedValueFrom(toolCall);
	if (bag === null && encrypted === void 0) return {
		...toolCall,
		metadata: null
	};
	if (fromBag === void 0 && encrypted === void 0) return toolCall;
	return {
		...toolCall,
		metadata: {
			...fromBag ?? {},
			...encrypted !== void 0 ? { thoughtSignature: encrypted } : {}
		}
	};
}
function parseToolResultContent(content) {
	try {
		return JSON.parse(content);
	} catch {
		return content;
	}
}
/**
* Collapse an array of ContentParts into the most compact ModelMessage content:
* - Empty array → null
* - All text parts → joined string (or null if empty)
* - Mixed content → ContentPart array as-is
*/
function collapseContentParts(parts) {
	if (parts.length === 0) return null;
	if (parts.every((p) => p.type === "text")) return parts.map((p) => p.content).join("") || null;
	return parts;
}
/**
* Extract text content from ModelMessage content (string, null, or ContentPart array).
* Used when only the text portion is needed (e.g., tool result content).
*/
function getTextContent(content) {
	if (content === null || content === void 0) return "";
	if (typeof content === "string") return content;
	return content.filter((part) => part.type === "text").map((part) => part.content).join("");
}
function historyTextFromParts(parts) {
	const blocks = [];
	for (const part of parts) if (part.type === "text" && part.content !== "") blocks.push(part.content);
	else if (part.type === "structured-output" && part.status === "complete" && part.raw !== "") blocks.push(part.raw);
	else if (part.type === "subagent") {
		const nested = subagentHistoryText(part);
		if (nested !== "") blocks.push(nested);
	}
	return blocks.join("\n\n");
}
/** Child text for a later turn. The name stays so the next agent can tell the notes apart. */
function subagentHistoryText(part) {
	const blocks = [];
	for (const message of part.subagent.messages) {
		if (!("parts" in message)) continue;
		const text = historyTextFromParts(message.parts).trim();
		if (text !== "") blocks.push(text);
	}
	if (blocks.length === 0) return "";
	return `${part.subagent.name}:\n${blocks.join("\n\n")}`;
}
function toolResultContent(content) {
	return Array.isArray(content) ? content : getTextContent(content);
}
/**
* Convert UIMessages or ModelMessages to ModelMessages
*/
function convertMessagesToModelMessages(messages) {
	const { top, groups } = splitSubagentWire(messages);
	if (groups.length === 0) return convertOwnMessages(messages);
	const blocks = /* @__PURE__ */ new Map();
	for (const group of groups) {
		if (group.info.parentToolCallId !== void 0) continue;
		const text = subagentWireText(group.messages);
		if (text === "") continue;
		const host = top.slice(0, group.hostIndex + 1).findLast((message) => message.role === "assistant" && tanstackMetadata(message)?.continues === void 0);
		const hostId = host && "id" in host ? host.id : void 0;
		blocks.set(hostId, [...blocks.get(hostId) ?? [], `${group.info.name}:\n${text}`]);
	}
	const converted = convertOwnMessages(top);
	for (const [hostId, texts] of blocks) {
		const block = texts.join("\n\n");
		const index = hostId === void 0 ? -1 : converted.findIndex((message) => message.role === "assistant" && message.id === hostId);
		const host = converted[index];
		if (!host) {
			converted.push({
				role: "assistant",
				content: block
			});
			continue;
		}
		converted[index] = {
			...host,
			content: typeof host.content === "string" && host.content !== "" ? `${host.content}\n\n${block}` : Array.isArray(host.content) ? [...host.content, {
				type: "text",
				content: block
			}] : block
		};
	}
	return converted;
}
function convertOwnMessages(messages) {
	const anchoredToolCallIds = /* @__PURE__ */ new Set();
	for (const msg of messages) if ("parts" in msg) {
		for (const part of msg.parts) if (part.type === "tool-result") anchoredToolCallIds.add(part.toolCallId);
	}
	const modelMessages = [];
	let pendingThinking = [];
	let lastAssistantRow;
	for (const msg of messages) {
		if ("parts" in msg) {
			modelMessages.push(...uiMessageToModelMessages(msg));
			continue;
		}
		const modelMessage = restoreModelMessageCreatedAt(restoreToolResultOwnership(msg));
		const role = modelMessage.role;
		if (role === "tool" && modelMessage.toolCallId && anchoredToolCallIds.has(modelMessage.toolCallId)) continue;
		if (role === "reasoning") {
			const content = msg.content;
			const signature = encryptedValueFrom(msg);
			if (content || signature !== void 0) pendingThinking.push({
				content: typeof content === "string" ? content : "",
				...signature !== void 0 ? { signature } : {},
				...redactedFrom(msg)
			});
			continue;
		}
		if (role === "activity") continue;
		if (role === "developer") {
			modelMessages.push({
				role: "system",
				content: msg.content,
				...optionalName(modelMessage),
				...optionalCreatedAt(modelMessage),
				...modelMessage.metadata !== void 0 && { metadata: modelMessage.metadata }
			});
			continue;
		}
		if (role === "user" && Array.isArray(msg.content)) {
			const content = msg.content;
			if (!content.some((part) => part.type === "text" && "text" in part && !("content" in part))) {
				modelMessages.push(modelMessage);
				continue;
			}
			const contentParts = aguiUserContentToParts(content).filter(isContentPart);
			modelMessages.push({
				role: "user",
				content: collapseContentParts(contentParts),
				...msg.id !== void 0 && { id: msg.id },
				...optionalName(modelMessage),
				...optionalCreatedAt(modelMessage),
				...modelMessage.metadata !== void 0 && { metadata: modelMessage.metadata }
			});
			continue;
		}
		if (role === "assistant") {
			const source = modelMessage;
			const toolCallMetadata = tanstackMetadata(msg)?.toolCallMetadata;
			const toolCalls = source.toolCalls?.map((toolCall) => toolCallFromWire(toolCall, toolCallMetadata?.[toolCall.id]));
			const row = {
				...source,
				...toolCalls !== void 0 ? { toolCalls } : {},
				...pendingThinking.length > 0 ? { thinking: [...source.thinking ?? [], ...pendingThinking] } : {}
			};
			pendingThinking = [];
			const continues = tanstackMetadata(msg)?.continues;
			if (lastAssistantRow !== void 0 && modelMessages.at(-1) === lastAssistantRow.message && continues !== void 0 && continues === lastAssistantRow.id) {
				const joined = joinAssistantRows(lastAssistantRow.message, row);
				modelMessages[modelMessages.length - 1] = joined;
				lastAssistantRow = {
					id: source.id,
					message: joined
				};
			} else {
				modelMessages.push(row);
				lastAssistantRow = {
					id: source.id,
					message: row
				};
			}
			continue;
		}
		modelMessages.push(modelMessage);
	}
	return modelMessages;
}
/**
* The blocks of an assistant message as order entries: in map order when
* the map is valid, else in the default order.
*/
function blockOrderEntries(message) {
	const blocks = orderedAssistantBlocks(message);
	if (blocks) return blocks.map((block) => {
		if (block.type === "thinking") return { type: "thinking" };
		if (block.type === "text") return {
			type: "text",
			text: block.text
		};
		return {
			type: "tool-call",
			id: block.toolCall.id
		};
	});
	return [
		...(message.thinking ?? []).map(() => ({ type: "thinking" })),
		...typeof message.content === "string" ? [{
			type: "text",
			text: message.content
		}] : [],
		...(message.toolCalls ?? []).map((toolCall) => ({
			type: "tool-call",
			id: toolCall.id
		}))
	];
}
/**
* Join an assistant wire row marked `continues` into the message of the
* assistant row before it, and extend that message's order map. The message
* keeps the first row's id and merges metadata from both rows.
*/
function joinAssistantRows(previous, row) {
	const text = [previous.content, row.content].filter((content) => typeof content === "string").join("");
	const thinking = [...previous.thinking ?? [], ...row.thinking ?? []];
	const toolCalls = [...previous.toolCalls ?? [], ...row.toolCalls ?? []];
	const blockOrder = buildBlockOrder([...blockOrderEntries(previous), ...blockOrderEntries(row)]);
	const rowResources = tanstackMetadata(row)?.uiResources ?? [];
	const metadata = mergeMetadata(previous.metadata, row.metadata);
	let joinedMetadata = metadata === void 0 ? void 0 : {
		...metadata,
		...metadata.tanstack ? { tanstack: { ...metadata.tanstack } } : {}
	};
	if (joinedMetadata?.tanstack) {
		delete joinedMetadata.tanstack.continues;
		if (Object.keys(joinedMetadata.tanstack).length === 0) delete joinedMetadata.tanstack;
	}
	if (joinedMetadata && Object.keys(joinedMetadata).length === 0) joinedMetadata = void 0;
	const merged = { ...previous };
	if (joinedMetadata === void 0) delete merged.metadata;
	else merged.metadata = joinedMetadata;
	return {
		...rowResources.length > 0 ? withTanstackMetadata(merged, { uiResources: [...tanstackMetadata(previous)?.uiResources ?? [], ...rowResources] }) : merged,
		...text !== "" && { content: text },
		...toolCalls.length > 0 && { toolCalls },
		...thinking.length > 0 && { thinking },
		...blockOrder && { blockOrder }
	};
}
function restoreModelMessageCreatedAt(message) {
	const createdAt = coerceCreatedAt(message.createdAt) ?? createdAtFromMetadata(message);
	if (createdAt === void 0) {
		if (message.createdAt === void 0) return message;
		const { createdAt: _invalid, ...rest } = message;
		return rest;
	}
	return Object.is(message.createdAt, createdAt) ? message : {
		...message,
		createdAt
	};
}
function restoreToolResultOwnership(message) {
	if (!("role" in message) || message.role !== "tool") return message;
	const source = message;
	const owned = tanstackMetadata(source)?.toolResult;
	if (!isRecord(owned)) return message;
	if ("content" in owned && !isContentPartArray(owned.content)) return message;
	const next = { ...message };
	if (!("id" in owned)) Reflect.deleteProperty(next, "id");
	if (!("createdAt" in owned)) Reflect.deleteProperty(next, "createdAt");
	if (typeof owned.id === "string") Reflect.set(next, "id", owned.id);
	if (typeof owned.createdAt === "string") {
		const createdAt = coerceCreatedAt(owned.createdAt);
		if (createdAt) Reflect.set(next, "createdAt", createdAt);
	}
	if (isContentPartArray(owned.content)) Reflect.set(next, "content", owned.content);
	const sourceMetadata = Reflect.get(source, "metadata");
	if (isRecord(sourceMetadata)) {
		const tanstack = sourceMetadata.tanstack;
		if (isRecord(tanstack)) {
			const { toolResult: _toolResult, ...restTanstack } = tanstack;
			const restMetadata = { ...sourceMetadata };
			if (Object.keys(restTanstack).length) restMetadata.tanstack = restTanstack;
			else delete restMetadata.tanstack;
			if (Object.keys(restMetadata).length) Reflect.set(next, "metadata", restMetadata);
			else Reflect.deleteProperty(next, "metadata");
		}
	}
	return next;
}
/**
* Rebuild a `Date` from a live `Date` or from an ISO string.
* `JSON.stringify` turns `Date` into a string, so persistence reload
* and AG-UI wire both land here as strings.
*/
function coerceCreatedAt(value) {
	if (value instanceof Date) return Number.isNaN(value.getTime()) ? void 0 : value;
	if (typeof value !== "string") return void 0;
	const createdAt = new Date(value);
	return Number.isNaN(createdAt.getTime()) ? void 0 : createdAt;
}
function normalizeMessagePart(part) {
	if (part.type !== "tool-result") return part;
	const createdAt = coerceCreatedAt(part.createdAt);
	const { createdAt: _createdAt, ...rest } = part;
	return createdAt === void 0 ? rest : {
		...rest,
		createdAt
	};
}
function createdAtFromMetadata(source) {
	return coerceCreatedAt(tanstackMetadata(source)?.createdAt);
}
function optionalCreatedAt(source) {
	const createdAt = coerceCreatedAt(source.createdAt);
	return createdAt !== void 0 ? { createdAt } : {};
}
function optionalName(source) {
	return source.name !== void 0 ? { name: source.name } : {};
}
function isUiResourcePart(value) {
	if (value == null || typeof value !== "object" || Array.isArray(value)) return false;
	if (!("type" in value) || value.type !== "ui-resource") return false;
	if (!("toolCallId" in value) || typeof value.toolCallId !== "string") return false;
	if (!("toolName" in value) || typeof value.toolName !== "string") return false;
	if (!("resource" in value) || value.resource == null || typeof value.resource !== "object" || Array.isArray(value.resource)) return false;
	const resource = value.resource;
	return "uri" in resource && typeof resource.uri === "string" && "mimeType" in resource && typeof resource.mimeType === "string";
}
function uiResourceKey(part) {
	return `${part.toolCallId}\0${part.toolName}\0${part.resource.uri}`;
}
function appendUiResources(ui, resources) {
	if (resources.length === 0) return ui;
	const seen = new Set(ui.parts.filter(isUiResourcePart).map((part) => uiResourceKey(part)));
	const extra = resources.filter((part) => !seen.has(uiResourceKey(part)));
	if (extra.length === 0) return ui;
	return {
		...ui,
		parts: [...ui.parts, ...extra]
	};
}
/**
* Build a UIResourcePart from the value of a CUSTOM `ui-resource` chunk
* emitted via `ctx.emitCustomEvent('ui-resource', ...)` (MCP Apps). The
* emission-side value carries `resource`/`serverId`/`toolName` plus the
* `toolCallId` stamped by the tool-call context wrapper — the `type`
* discriminator is added here. Returns undefined when the value does not
* match the ui-resource shape.
*/
function uiResourcePartFromCustomValue(value) {
	if (!isRecord(value)) return void 0;
	const part = {
		type: "ui-resource",
		...value
	};
	return isUiResourcePart(part) ? part : void 0;
}
/**
* Store an emitted ui-resource part on the assistant ModelMessage that owns
* its `toolCallId` (the tool-call anchor), so it survives later
* MESSAGES_SNAPSHOT chunks — e.g. the interrupt snapshot emitted when the
* run pauses on a client tool (#1397). Mirrors how `toolCallMetadata` is
* preserved on the anchor (#867).
*
* Returns the SAME array reference when no anchor owns the tool call or the
* resource is already stored (idempotent).
*/
function appendUiResourceToModelMessages(messages, part) {
	for (let index = messages.length - 1; index >= 0; index--) {
		const message = messages[index];
		if (!message || message.role !== "assistant") continue;
		if (!message.toolCalls?.some((toolCall) => toolCall.id === part.toolCallId)) continue;
		const previous = tanstackMetadata(message)?.uiResources ?? [];
		if (previous.some((stored) => uiResourceKey(stored) === uiResourceKey(part))) return messages;
		const nextMessage = {
			...message,
			metadata: {
				...message.metadata,
				tanstack: {
					...tanstackMetadata(message),
					uiResources: [...previous, part]
				}
			}
		};
		const next = messages.slice();
		next[index] = nextMessage;
		return next;
	}
	return messages;
}
function assistantMetadata(uiMessage) {
	const fromParts = uiMessage.parts.filter(isUiResourcePart);
	const current = uiMessage.metadata ?? {};
	const tanstack = { ...tanstackMetadata(uiMessage) };
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
	if (fromParts.length > 0) tanstack.uiResources = fromParts;
	const result = { ...current };
	if (Object.keys(tanstack).length > 0) result.tanstack = tanstack;
	else delete result.tanstack;
	return Object.keys(result).length > 0 ? result : void 0;
}
/**
* Convert a UIMessage to ModelMessage(s)
*
* Walks the parts array IN ORDER to preserve the interleaving of text,
* tool calls, and tool results. This is critical for multi-round tool
* flows where the model generates text, calls a tool, gets the result,
* then generates more text and calls another tool.
*
* The output preserves the sequential structure:
*   text1 → toolCall1 → toolResult1 → text2 → toolCall2 → toolResult2
* becomes:
*   assistant: {content: "text1", toolCalls: [toolCall1]}
*   tool: toolResult1
*   assistant: {content: "text2", toolCalls: [toolCall2]}
*   tool: toolResult2
*
* @param uiMessage - The UIMessage to convert
* @returns An array of ModelMessages preserving part ordering
*/
function uiMessageToModelMessages(uiMessage) {
	if (uiMessage.role === "system") return [];
	if (uiMessage.role === "activity") return [];
	if (uiMessage.role !== "assistant") return [buildUserOrToolMessage(uiMessage)];
	return buildAssistantMessages(uiMessage);
}
/**
* Build a single ModelMessage for user messages (simple path).
* Preserves ordering of text and multimodal content parts.
*/
function buildUserOrToolMessage(uiMessage) {
	const contentParts = [];
	for (const part of uiMessage.parts) if (isContentPart(part)) contentParts.push(part);
	return {
		id: uiMessage.id,
		role: uiMessage.role,
		content: collapseContentParts(contentParts),
		...optionalName(uiMessage),
		...optionalCreatedAt(uiMessage),
		...uiMessage.metadata !== void 0 && { metadata: uiMessage.metadata }
	};
}
function createSegment() {
	return {
		contentParts: [],
		toolCalls: [],
		order: []
	};
}
function isToolCallIncluded(part) {
	return part.state === "input-complete" || part.state === "complete" || part.state === "approval-requested" || part.state === "approval-responded" || part.state === "error" || part.output !== void 0;
}
/**
* Build ModelMessages for an assistant UIMessage, preserving the
* sequential interleaving of text, tool calls, and tool results.
*
* Walks parts in order. Text and tool-call parts accumulate into the
* current "segment". When a tool-result part is encountered, the
* current segment is flushed as an assistant message, then the tool
* result is emitted as a tool message.
*/
function buildAssistantMessages(uiMessage) {
	const messageList = [];
	let current = createSegment();
	let pendingThinking = [];
	const emittedToolResultIds = /* @__PURE__ */ new Set();
	const identityFields = {
		id: uiMessage.id,
		...optionalName(uiMessage),
		...optionalCreatedAt(uiMessage)
	};
	const metadata = assistantMetadata(uiMessage);
	const assistantFields = {
		...identityFields,
		...metadata !== void 0 && { metadata }
	};
	function flushSegment(force = false) {
		const content = collapseContentParts(current.contentParts);
		const hasContent = content !== null;
		const hasToolCalls = current.toolCalls.length > 0;
		const hasThinking = pendingThinking.length > 0;
		const blockOrder = Array.isArray(content) ? void 0 : buildBlockOrder(current.order);
		if (force || hasContent || hasToolCalls || hasThinking) {
			messageList.push({
				...assistantFields,
				role: "assistant",
				content,
				...hasToolCalls && { toolCalls: current.toolCalls },
				...hasThinking && { thinking: pendingThinking },
				...current.structuredOutput && { structuredOutput: current.structuredOutput },
				...blockOrder && { blockOrder }
			});
			pendingThinking = [];
		}
		current = createSegment();
	}
	for (const part of uiMessage.parts) switch (part.type) {
		case "text":
			current.contentParts.push(part);
			current.order.push({
				type: "text",
				text: part.content
			});
			break;
		case "image":
		case "audio":
		case "video":
		case "document":
			current.contentParts.push(part);
			break;
		case "tool-call":
			if (isToolCallIncluded(part)) {
				current.toolCalls.push({
					id: part.id,
					type: "function",
					function: {
						name: part.name,
						arguments: part.arguments
					},
					...part.metadata !== void 0 && { metadata: part.metadata }
				});
				current.order.push({
					type: "tool-call",
					id: part.id
				});
			}
			break;
		case "tool-result":
			flushSegment(messageList.length === 0);
			if ((part.state === "complete" || part.state === "error") && !emittedToolResultIds.has(part.toolCallId)) {
				const metadata = part.outcome === void 0 ? part.metadata : withTanstackMetadata(part, { toolResultOutcome: part.outcome }).metadata;
				messageList.push({
					...part.id !== void 0 && { id: part.id },
					...optionalCreatedAt(part),
					role: "tool",
					content: part.content,
					toolCallId: part.toolCallId,
					...part.name !== void 0 && { name: part.name },
					...metadata !== void 0 && { metadata },
					...part.error !== void 0 && { error: part.error }
				});
				emittedToolResultIds.add(part.toolCallId);
			}
			break;
		case "thinking":
			if (part.content || part.signature) {
				if (current.toolCalls.some(isProviderExecutedToolCall)) flushSegment();
				pendingThinking.push({
					content: part.content,
					...part.signature && { signature: part.signature },
					...part.redacted && { redacted: true }
				});
				current.order.push({ type: "thinking" });
			}
			break;
		case "structured-output":
			if (part.status === "complete") {
				const serialized = part.raw !== "" ? part.raw : part.data !== void 0 ? safeJsonStringify(part.data) : "";
				if (serialized !== "") {
					current.contentParts.push({
						type: "text",
						content: serialized
					});
					current.order.push({
						type: "text",
						text: serialized
					});
					current.structuredOutput = part;
				}
			}
			break;
		case "ui-resource": break;
		case "activity": break;
		case "subagent": {
			const block = part.subagent.parentToolCallId === void 0 ? subagentHistoryText(part) : "";
			if (block !== "") {
				const text = `${current.contentParts.length > 0 ? "\n\n" : ""}${block}`;
				current.contentParts.push({
					type: "text",
					content: text
				});
				current.order.push({
					type: "text",
					text
				});
			}
			break;
		}
	}
	flushSegment();
	for (const part of uiMessage.parts) {
		if (part.type !== "tool-call") continue;
		if (part.output !== void 0 && !emittedToolResultIds.has(part.id)) {
			messageList.push({
				role: "tool",
				content: normalizeToolResult(part.output),
				toolCallId: part.id
			});
			emittedToolResultIds.add(part.id);
		}
		if (part.output === void 0 && part.state === "approval-responded" && part.approval?.approved !== void 0 && !emittedToolResultIds.has(part.id)) {
			const approved = part.approval.approved;
			messageList.push({
				role: "tool",
				content: JSON.stringify({
					approved,
					...approved && { pendingExecution: true },
					message: approved ? "User approved this action" : "User denied this action"
				}),
				toolCallId: part.id,
				...approved === false && { metadata: { tanstack: { toolResultOutcome: "denied" } } }
			});
			emittedToolResultIds.add(part.id);
		}
	}
	if (messageList.length === 0) messageList.push({
		...assistantFields,
		role: "assistant",
		content: null
	});
	return messageList;
}
function thinkingToPart(thinking) {
	return {
		type: "thinking",
		content: thinking.content,
		...thinking.signature && { signature: thinking.signature },
		...thinking.redacted && { redacted: true }
	};
}
function toolCallToPart(toolCall) {
	let input;
	try {
		input = JSON.parse(toolCall.function.arguments);
	} catch {
		input = void 0;
	}
	return {
		type: "tool-call",
		id: toolCall.id,
		name: toolCall.function.name,
		arguments: toolCall.function.arguments,
		state: "input-complete",
		...input !== void 0 && { input },
		...toolCall.metadata !== void 0 && { metadata: toolCall.metadata }
	};
}
/**
* Convert a ModelMessage to UIMessage
*
* This conversion creates a parts-based structure:
* - content field → TextPart
* - toolCalls array → ToolCallPart[]
* - role="tool" messages should be converted separately and merged
*
* @param modelMessage - The ModelMessage to convert
* @param id - Optional ID for the UIMessage (generated if not provided)
* @returns A UIMessage with parts
*/
function modelMessageToUIMessage(modelMessage, id) {
	const parts = [];
	const createdAt = coerceCreatedAt(modelMessage.createdAt);
	if (modelMessage.role === "assistant" && modelMessage.thinking?.length) for (const thinking of modelMessage.thinking) {
		if (!thinking.content && !thinking.signature) continue;
		parts.push(thinkingToPart(thinking));
	}
	const structuredOutput = modelMessage.structuredOutput ?? snapshotStructuredOutput(tanstackMetadata(modelMessage)?.structuredOutput);
	if (modelMessage.role === "assistant" && structuredOutput) {
		if (typeof modelMessage.content === "string" && modelMessage.content && modelMessage.content !== structuredOutput.raw) {
			const suffix = structuredOutput.raw;
			const text = suffix !== "" && modelMessage.content.endsWith(suffix) ? modelMessage.content.slice(0, -suffix.length) : modelMessage.content;
			if (text) parts.push({
				type: "text",
				content: text
			});
		}
		parts.push(structuredOutput);
	} else if (modelMessage.role === "tool" && modelMessage.toolCallId) {
		const rawToolResultOutcome = tanstackMetadata(modelMessage)?.toolResultOutcome;
		const toolResultOutcome = isToolResultOutcome(rawToolResultOutcome) ? rawToolResultOutcome : void 0;
		const resultState = modelMessage.error === void 0 && toolResultOutcome === void 0 ? "complete" : "error";
		parts.push({
			type: "tool-result",
			toolCallId: modelMessage.toolCallId,
			content: toolResultContent(modelMessage.content),
			state: resultState,
			...toolResultOutcome !== void 0 && { outcome: toolResultOutcome },
			...modelMessage.id !== void 0 && { id: modelMessage.id },
			...modelMessage.name !== void 0 && { name: modelMessage.name },
			...modelMessage.metadata !== void 0 && { metadata: modelMessage.metadata },
			...createdAt !== void 0 && { createdAt },
			...modelMessage.error !== void 0 && { error: modelMessage.error }
		});
	} else if (Array.isArray(modelMessage.content)) for (const part of modelMessage.content) parts.push(part);
	else {
		const textContent = getTextContent(modelMessage.content);
		if (textContent) parts.push({
			type: "text",
			content: textContent
		});
	}
	if (modelMessage.toolCalls && modelMessage.toolCalls.length > 0) for (const toolCall of modelMessage.toolCalls) parts.push(toolCallToPart(toolCall));
	const ordered = modelMessage.role === "assistant" && structuredOutput === void 0 ? orderedAssistantBlocks(modelMessage) : void 0;
	if (ordered) parts.splice(0, parts.length, ...ordered.flatMap((block) => {
		if (block.type === "text") return [{
			type: "text",
			content: block.text
		}];
		if (block.type === "tool-call") return [toolCallToPart(block.toolCall)];
		return block.thinking.content || block.thinking.signature ? [thinkingToPart(block.thinking)] : [];
	}));
	const ui = {
		id: id || generateMessageId(),
		role: modelMessage.role === "tool" ? "assistant" : modelMessage.role,
		parts,
		...optionalName(modelMessage),
		...createdAt !== void 0 && { createdAt },
		...modelMessage.metadata !== void 0 && { metadata: modelMessage.metadata }
	};
	const storedResources = tanstackMetadata(modelMessage)?.uiResources;
	return appendUiResources(ui, Array.isArray(storedResources) ? storedResources.filter(isUiResourcePart) : []);
}
/**
* Normalize a single AG-UI `MESSAGES_SNAPSHOT` message into a `UIMessage`.
*
* AG-UI snapshot messages use the wire shape `{ id, role, content }` and have
* no `parts` array. Casting them directly to `UIMessage` is unsafe: any code
* that later reads `message.parts` (e.g. the devtools `onToolCallStateChange`
* handler) crashes with "Cannot read properties of undefined (reading 'find')".
*
* Each role is mapped to the canonical `UIMessage` shape, reusing
* `modelMessageToUIMessage` for the roles that share `ModelMessage`'s structure.
* The original AG-UI `id` is preserved so later `TEXT_MESSAGE_CONTENT` /
* `TOOL_CALL_*` events still route by `messageId` (falling back to a generated
* id only when the snapshot omits one). Messages that already carry `parts`
* (e.g. a TanStack server echoing `UIMessage`s back over the wire) pass through
* unchanged apart from ensuring an id.
*/
function aguiSnapshotMessageToUIMessage(message) {
	if ("parts" in message) return applySnapshotMetadata(message, {
		...message,
		id: message.id || generateMessageId()
	});
	const id = message.id || generateMessageId();
	switch (message.role) {
		case "user": return applySnapshotMetadata(message, {
			id,
			role: "user",
			parts: aguiUserContentToParts(message.content)
		});
		case "assistant": {
			const metadata = tanstackMetadata(message);
			const toolCallMetadata = metadata?.toolCallMetadata;
			const structuredOutput = snapshotStructuredOutput(metadata?.structuredOutput);
			const toolCalls = message.toolCalls?.map((toolCall) => {
				const callMetadata = toolCallMetadata != null && typeof toolCallMetadata === "object" ? toolCallMetadata[toolCall.id] : void 0;
				return callMetadata !== void 0 ? {
					...toolCall,
					metadata: callMetadata
				} : toolCall;
			});
			return applySnapshotMetadata(message, modelMessageToUIMessage({
				role: "assistant",
				content: message.content ?? null,
				...optionalName(message),
				...toolCalls && { toolCalls },
				...structuredOutput && { structuredOutput }
			}, id));
		}
		case "tool": {
			message = restoreToolResultOwnership(message);
			const createdAt = coerceCreatedAt("createdAt" in message ? message.createdAt : void 0) ?? createdAtFromMetadata(message);
			return applySnapshotMetadata(message, modelMessageToUIMessage({
				role: "tool",
				content: isContentPartArray(message.content) ? message.content : aguiContentToContentParts(message.content),
				toolCallId: message.toolCallId,
				..."name" in message && typeof message.name === "string" ? { name: message.name } : {},
				..."id" in message && typeof message.id === "string" ? { id: message.id } : {},
				..."metadata" in message && message.metadata != null ? { metadata: message.metadata } : {},
				...createdAt !== void 0 ? { createdAt } : {},
				...message.error !== void 0 && { error: message.error }
			}, id));
		}
		case "system":
		case "developer": return applySnapshotMetadata(message, {
			id,
			role: "system",
			parts: message.content ? [{
				type: "text",
				content: message.content
			}] : []
		});
		case "reasoning": {
			const signature = encryptedValueFrom(message);
			const content = typeof message.content === "string" ? message.content : "";
			return applySnapshotMetadata(message, {
				id,
				role: "assistant",
				parts: content || signature !== void 0 ? [{
					type: "thinking",
					content,
					...signature !== void 0 ? { signature } : {},
					...redactedFrom(message)
				}] : []
			});
		}
		case "activity": return applySnapshotMetadata(message, {
			id,
			role: "activity",
			parts: [{
				type: "activity",
				activityType: message.activityType,
				content: structuredClone(message.content)
			}]
		});
		default: return applySnapshotMetadata(message, {
			id,
			role: "assistant",
			parts: []
		});
	}
}
/** Copy snapshot metadata when it is a record. Rebuild createdAt from tanstack.createdAt. */
function applySnapshotMetadata(source, ui) {
	const normalizedParts = ui.parts.map((part) => normalizeMessagePart(part));
	if (normalizedParts !== ui.parts) ui = {
		...ui,
		parts: normalizedParts
	};
	const name = "name" in source && typeof source.name === "string" ? source.name : void 0;
	let next = name !== void 0 ? {
		...ui,
		name
	} : ui;
	let metadata;
	if ("metadata" in source) {
		const raw = source.metadata;
		if (raw != null && typeof raw === "object" && !Array.isArray(raw)) {
			metadata = raw;
			next = {
				...next,
				metadata
			};
		}
	}
	const createdAt = coerceCreatedAt(next.createdAt) ?? (metadata !== void 0 ? createdAtFromMetadata(metadata) : void 0);
	if (createdAt !== void 0 && !Object.is(createdAt, next.createdAt)) next = {
		...next,
		createdAt
	};
	else if (createdAt === void 0 && next.createdAt !== void 0) {
		const { createdAt: _invalid, ...rest } = next;
		next = rest;
	}
	const uiResources = tanstackMetadata(metadata)?.uiResources;
	const resources = Array.isArray(uiResources) ? uiResources.filter(isUiResourcePart) : [];
	return appendUiResources(next, resources);
}
function snapshotStructuredOutput(value) {
	if (value == null || value.status !== "streaming" && value.status !== "complete" && value.status !== "error" || typeof value.raw !== "string") return;
	const base = {
		type: "structured-output",
		raw: value.raw,
		...value.partial !== void 0 ? { partial: value.partial } : {},
		...value.reasoning ? { reasoning: value.reasoning } : {},
		...value.errorMessage !== void 0 ? { errorMessage: value.errorMessage } : {}
	};
	if (value.status !== "complete") return {
		...base,
		status: value.status
	};
	if (value.data === void 0) return void 0;
	return {
		...base,
		status: "complete",
		data: value.data
	};
}
/**
* Convert AG-UI user message content into `UIMessage` parts.
*
* AG-UI user content is either a plain string or a multimodal array whose text
* entries use `{ type: 'text', text }` (vs. TanStack's `{ type: 'text', content }`).
* Text entries are rewritten to the TanStack shape; image/audio/video/document
* entries already match `ContentPart` and pass through.
*/
function aguiUserContentToParts(content) {
	const converted = aguiContentToContentParts(content);
	return typeof converted === "string" ? converted ? [{
		type: "text",
		content: converted
	}] : [] : converted;
}
/** Convert wire content parts. Data, url, and file sources pass through. */
function aguiContentToContentParts(content) {
	if (typeof content === "string") return content;
	return content.map((part) => {
		if (part.type !== "text") return part;
		const { text, ...rest } = part;
		return {
			...rest,
			content: text
		};
	});
}
/**
* Convert an array of ModelMessages to UIMessages
*
* This handles merging tool result messages with their corresponding assistant
* messages, and assistant segments that share the same stable message ID.
*
* @param modelMessages - Array of ModelMessages to convert
* @returns Array of UIMessages
*/
function modelMessagesToUIMessages(modelMessages) {
	const uiMessages = [];
	let currentAssistantMessage = null;
	for (const msg of modelMessages) if (msg.role === "tool") {
		if (msg.toolCallId !== void 0 && currentAssistantMessage && currentAssistantMessage.role === "assistant") {
			const content = toolResultContent(msg.content);
			const rawToolResultOutcome = tanstackMetadata(msg)?.toolResultOutcome;
			const toolResultOutcome = isToolResultOutcome(rawToolResultOutcome) ? rawToolResultOutcome : void 0;
			const resultState = msg.error === void 0 && toolResultOutcome === void 0 ? "complete" : "error";
			const toolCallPart = currentAssistantMessage.parts.find((part) => part.type === "tool-call" && part.id === msg.toolCallId);
			if (toolCallPart) {
				toolCallPart.output = typeof content === "string" ? parseToolResultContent(content) : content;
				toolCallPart.state = resultState;
			}
			currentAssistantMessage.parts.push({
				type: "tool-result",
				toolCallId: msg.toolCallId,
				content,
				state: resultState,
				...toolResultOutcome !== void 0 && { outcome: toolResultOutcome },
				...msg.id !== void 0 && msg.id !== currentAssistantMessage.id && { id: msg.id },
				...msg.name !== void 0 && { name: msg.name },
				...msg.metadata !== void 0 && { metadata: msg.metadata },
				...optionalCreatedAt(msg),
				...msg.error !== void 0 && { error: msg.error }
			});
		} else {
			const toolResultUIMessage = modelMessageToUIMessage(msg, msg.id);
			uiMessages.push(toolResultUIMessage);
		}
	} else {
		const uiMessage = modelMessageToUIMessage(msg, msg.id);
		if (msg.role === "assistant" && currentAssistantMessage && (msg.id === currentAssistantMessage.id || isAssistantSegmentOf(msg.id, currentAssistantMessage.id))) {
			currentAssistantMessage.parts.push(...uiMessage.parts);
			continue;
		}
		uiMessages.push(uiMessage);
		if (msg.role === "assistant") currentAssistantMessage = uiMessage;
		else currentAssistantMessage = null;
	}
	return uiMessages;
}
/**
* Normalize a message (UIMessage or ModelMessage) to a UIMessage
* Ensures the message has an ID and createdAt timestamp
*
* @param message - Either a UIMessage or ModelMessage
* @param generateId - Function to generate a message ID if needed
* @returns A UIMessage with guaranteed id and createdAt
*/
function normalizeToUIMessage(message, generateId) {
	if ("parts" in message) {
		const parts = message.parts.map((part) => normalizeMessagePart(part));
		return {
			...message,
			parts,
			id: message.id || generateId(),
			createdAt: coerceCreatedAt(message.createdAt) ?? /* @__PURE__ */ new Date()
		};
	} else return {
		...modelMessageToUIMessage(message, generateId()),
		createdAt: coerceCreatedAt(message.createdAt) ?? /* @__PURE__ */ new Date()
	};
}
/**
* Generate a unique message ID
*/
function generateMessageId() {
	return `msg-${Date.now()}-${Math.random().toString(36).substring(7)}`;
}
//#endregion
export { aguiContentToContentParts, aguiSnapshotMessageToUIMessage, appendUiResourceToModelMessages, coerceCreatedAt, convertMessagesToModelMessages, generateMessageId, modelMessageToUIMessage, modelMessagesToUIMessages, normalizeToUIMessage, restoreToolResultOwnership, safeJsonStringify, subagentHistoryText, uiMessageToModelMessages, uiResourcePartFromCustomValue };

//# sourceMappingURL=messages.js.map