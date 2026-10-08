//#region src/utilities/block-order.ts
/**
* The order map for these entries in produced order, or undefined when they
* are in the default order (all thinking, then text, then tool calls).
* Adjacent text entries merge into one, and empty text is left out. The n-th
* thinking entry gets index n.
*/
function buildBlockOrder(entries) {
	const blocks = [];
	let thinking = 0;
	let isDefault = true;
	for (const entry of entries) {
		const last = blocks.at(-1);
		if (entry.type === "thinking") {
			if (last !== void 0 && last.type !== "thinking") isDefault = false;
			blocks.push({
				type: "thinking",
				index: thinking++
			});
		} else if (entry.type === "text") {
			if (entry.text === "") continue;
			if (last?.type === "text") {
				last.length += entry.text.length;
				continue;
			}
			if (last?.type === "tool-call") isDefault = false;
			blocks.push({
				type: "text",
				length: entry.text.length
			});
		} else blocks.push({
			type: "tool-call",
			id: entry.id
		});
	}
	return isDefault ? void 0 : blocks;
}
/**
* The blocks of an assistant message in map order, or undefined when the
* message has no map or the map does not match the message. A map matches
* when it uses each `thinking` entry and each `toolCalls` entry exactly once,
* and its text lengths add up to the length of the text content (`null`
* content counts as no text). Readers use the default order when this
* returns undefined.
*/
function orderedAssistantBlocks(message) {
	const order = message.blockOrder;
	if (!Array.isArray(order) || order.length === 0) return void 0;
	const content = message.content ?? "";
	if (typeof content !== "string") return void 0;
	const thinking = message.thinking ?? [];
	const toolCalls = message.toolCalls ?? [];
	const usedThinking = /* @__PURE__ */ new Set();
	const usedCalls = /* @__PURE__ */ new Set();
	const blocks = [];
	let offset = 0;
	for (const block of order) {
		if (typeof block !== "object" || block === null) return void 0;
		if (block.type === "thinking") {
			const entry = Number.isInteger(block.index) ? thinking[block.index] : void 0;
			if (entry === void 0 || usedThinking.has(block.index)) return;
			usedThinking.add(block.index);
			blocks.push({
				type: "thinking",
				thinking: entry
			});
		} else if (block.type === "text") {
			const end = offset + block.length;
			if (!Number.isInteger(block.length) || block.length <= 0 || end > content.length) return;
			blocks.push({
				type: "text",
				text: content.slice(offset, end)
			});
			offset = end;
		} else if (block.type === "tool-call") {
			const toolCall = toolCalls.find((candidate) => candidate.id === block.id);
			if (toolCall === void 0 || usedCalls.has(block.id)) return void 0;
			usedCalls.add(block.id);
			blocks.push({
				type: "tool-call",
				toolCall
			});
		} else return;
	}
	if (offset !== content.length || usedThinking.size !== thinking.length || usedCalls.size !== toolCalls.length) return;
	return blocks;
}
//#endregion
export { buildBlockOrder, orderedAssistantBlocks };

//# sourceMappingURL=block-order.js.map