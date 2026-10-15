import { tanstackMetadata } from "./merge-metadata.js";
import { isProviderExecutedToolCall } from "./provider-executed.js";
import { buildBlockOrder, orderedAssistantBlocks } from "./block-order.js";
//#region src/utilities/replay-messages.ts
/** The pi shortHash algorithm, over UTF-16 code units. */
function hashToolCallId(id) {
	let h1 = 3735928559;
	let h2 = 1103547991;
	for (let index = 0; index < id.length; index++) {
		const ch = id.charCodeAt(index);
		h1 = Math.imul(h1 ^ ch, 2654435761);
		h2 = Math.imul(h2 ^ ch, 1597334677);
	}
	h1 = Math.imul(h1 ^ h1 >>> 16, 2246822507) ^ Math.imul(h2 ^ h2 >>> 13, 3266489909);
	h2 = Math.imul(h2 ^ h2 >>> 16, 2246822507) ^ Math.imul(h1 ^ h1 >>> 13, 3266489909);
	return (h2 >>> 0).toString(36) + (h1 >>> 0).toString(36);
}
function isForeign(message, target) {
	const source = tanstackMetadata(message.metadata)?.source;
	return target !== void 0 && source !== void 0 && (source.provider !== target.provider || source.api !== target.api || source.model !== target.model);
}
function isFailed(message) {
	const stop = tanstackMetadata(message.metadata)?.stopReason;
	return message.role === "assistant" && (stop === "error" || stop === "aborted");
}
/** Build a provider request without changing stored history. An absent target only cleans history. */
function transformMessagesForReplay(original, target, toolIdRule) {
	const usedIds = /* @__PURE__ */ new Set();
	for (const message of original) if (!isForeign(message, target) && !isFailed(message)) for (const call of message.toolCalls ?? []) usedIds.add(call.id);
	const idMap = /* @__PURE__ */ new Map();
	const failedCallBatch = /* @__PURE__ */ new Map();
	const messages = [];
	const boundaryMap = [];
	let pending = [];
	const answered = /* @__PURE__ */ new Set();
	const deferredBoundaries = [];
	const closePending = () => {
		for (const call of pending) if (!answered.has(call.id) && !isProviderExecutedToolCall(call)) messages.push({
			role: "tool",
			toolCallId: call.id,
			name: call.function.name,
			content: "No result provided",
			error: "No result provided"
		});
		pending = [];
		answered.clear();
		for (const index of deferredBoundaries) boundaryMap[index] = messages.length;
		deferredBoundaries.length = 0;
	};
	const mapCall = (call, foreign, source) => {
		let id = call.id;
		if (foreign && toolIdRule) {
			let attempt = 0;
			do {
				if (attempt === 1e3) throw new Error(`Tool ID rule could not allocate a unique ID for ${call.id}`);
				id = toolIdRule(call.id, {
					foreign,
					source,
					attempt: attempt++
				});
			} while (usedIds.has(id));
			usedIds.add(id);
		}
		idMap.set(call.id, id);
		if (!foreign && id === call.id) return call;
		const metadata = call.metadata;
		if (metadata !== null && typeof metadata === "object" && !Array.isArray(metadata)) {
			const rest = Object.fromEntries(Object.entries(metadata).filter(([key]) => key !== "thoughtSignature"));
			return {
				...call,
				id,
				metadata: rest
			};
		}
		return id === call.id ? call : {
			...call,
			id
		};
	};
	for (const [index, message] of original.entries()) {
		if (message.role !== "tool") closePending();
		boundaryMap[index] = messages.length;
		if (message.role === "assistant") for (const call of message.toolCalls ?? []) failedCallBatch.set(call.id, isFailed(message));
		if (isFailed(message)) continue;
		if (message.role === "tool") {
			if (message.toolCallId !== void 0 && failedCallBatch.get(message.toolCallId)) continue;
			if (pending.length > 0) deferredBoundaries.push(index);
			const id = message.toolCallId !== void 0 ? idMap.get(message.toolCallId) : void 0;
			const mapped = id !== void 0 && id !== message.toolCallId ? {
				...message,
				toolCallId: id
			} : message;
			if (mapped.toolCallId !== void 0) answered.add(mapped.toolCallId);
			messages.push(mapped);
			continue;
		}
		if (message.role !== "assistant") {
			messages.push(message);
			continue;
		}
		const foreign = isForeign(message, target);
		let mapped = message;
		if (foreign) {
			const defaultBlocks = [
				...(message.thinking ?? []).map((thinking) => ({
					type: "thinking",
					thinking
				})),
				...typeof message.content === "string" ? [{
					type: "text",
					text: message.content
				}] : [],
				...(message.toolCalls ?? []).map((toolCall) => ({
					type: "tool-call",
					toolCall
				}))
			];
			const blocks = orderedAssistantBlocks(message) ?? defaultBlocks;
			const entries = [];
			const calls = [];
			let content = "";
			for (const block of blocks) if (block.type === "tool-call") {
				const call = mapCall(block.toolCall, true, tanstackMetadata(message.metadata)?.source);
				calls.push(call);
				entries.push({
					type: "tool-call",
					id: call.id
				});
			} else {
				const text = block.type === "text" ? block.text : block.thinking.redacted ? "" : block.thinking.content.trim() === "" ? "" : block.thinking.content;
				if (text) {
					content += text;
					entries.push({
						type: "text",
						text
					});
				}
			}
			const { thinking: _thinking, blockOrder: _order, ...rest } = message;
			mapped = {
				...rest,
				content: typeof message.content === "string" || message.content === null ? content || null : content ? [{
					type: "text",
					content
				}, ...message.content] : message.content,
				...message.toolCalls ? { toolCalls: calls } : {},
				...buildBlockOrder(entries) ? { blockOrder: buildBlockOrder(entries) } : {}
			};
		} else for (const call of message.toolCalls ?? []) idMap.set(call.id, call.id);
		pending = mapped.toolCalls ?? [];
		messages.push(mapped);
	}
	closePending();
	boundaryMap[original.length] = messages.length;
	return {
		messages,
		boundaryMap
	};
}
//#endregion
export { hashToolCallId, transformMessagesForReplay };

//# sourceMappingURL=replay-messages.js.map