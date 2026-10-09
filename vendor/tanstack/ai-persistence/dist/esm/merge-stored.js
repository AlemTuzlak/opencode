//#region src/merge-stored.ts
/** How many stored messages the merge keeps. Less than `stored.length` on a reload. */
function storedCutoff(stored, incoming) {
	for (let index = incoming.length - 1; index >= 0; index--) {
		const id = incoming[index]?.id;
		if (id === void 0) continue;
		const storedIndex = stored.findIndex((message) => message.id === id);
		if (storedIndex >= 0) return storedIndex + 1;
	}
	return stored.length;
}
function mergeStoredMessages(stored, incoming) {
	if (incoming.length === 0) return stored.slice();
	const prefix = stored.slice(0, storedCutoff(stored, incoming));
	const incomingById = /* @__PURE__ */ new Map();
	for (const message of incoming) {
		const id = message.id;
		if (id) incomingById.set(id, message);
	}
	const storedIds = /* @__PURE__ */ new Set();
	const merged = [];
	for (const message of prefix) {
		const id = message.id;
		if (id) {
			storedIds.add(id);
			const replacement = incomingById.get(id);
			merged.push(replacement ? keepStoredRecord(replacement, message) : message);
			continue;
		}
		merged.push(message);
	}
	for (let index = 0; index < incoming.length; index++) {
		const message = incoming[index];
		if (!message) continue;
		const id = message.id;
		if (id && storedIds.has(id)) continue;
		if (!id) {
			const existing = merged[index];
			if (existing && existing.id === void 0 && existing.role === message.role && existing.content === message.content) continue;
		}
		merged.push(message);
	}
	return merged;
}
function keepStoredRecord(incoming, stored) {
	if (incoming.midConversationChange || !stored.midConversationChange) return incoming;
	return {
		...incoming,
		midConversationChange: stored.midConversationChange
	};
}
//#endregion
export { mergeStoredMessages, storedCutoff };

//# sourceMappingURL=merge-stored.js.map