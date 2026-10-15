//#region src/utilities/subagent-wire.ts
function isRecord(value) {
	return typeof value === "object" && value !== null && !Array.isArray(value);
}
function wireSubagentRunId(message) {
	if (!isRecord(message) || "parts" in message) return void 0;
	const id = message.subagentRunId;
	return typeof id === "string" && id !== "" ? id : void 0;
}
function wireSubagentInfo(message) {
	if (!isRecord(message) || !isRecord(message.metadata)) return void 0;
	const tanstack = message.metadata.tanstack;
	if (!isRecord(tanstack) || !isRecord(tanstack.subagent)) return void 0;
	const { name, status, error, interruptIds } = tanstack.subagent;
	if (typeof name !== "string" || !isStatus(status)) return void 0;
	const { description, parentSubagentRunId, parentToolCallId, metadata, placeholder } = tanstack.subagent;
	return {
		name,
		status,
		...typeof description === "string" && { description },
		...isRecord(error) && typeof error.message === "string" && { error: {
			message: error.message,
			...typeof error.code === "string" && { code: error.code }
		} },
		...Array.isArray(interruptIds) && { interruptIds: interruptIds.filter((id) => typeof id === "string") },
		...typeof parentSubagentRunId === "string" && { parentSubagentRunId },
		...typeof parentToolCallId === "string" && { parentToolCallId },
		...isRecord(metadata) && { metadata },
		...placeholder === true && { placeholder: true }
	};
}
function isStatus(value) {
	return value === "running" || value === "finished" || value === "error" || value === "suspended";
}
function untag(message) {
	if (!isRecord(message)) return message;
	const { subagentRunId: _id, ...rest } = message;
	const metadata = isRecord(rest.metadata) ? rest.metadata : void 0;
	const tanstack = isRecord(metadata?.tanstack) ? metadata.tanstack : void 0;
	if (!metadata || !tanstack || !("subagent" in tanstack)) return rest;
	const { subagent: _info, ...tanstackRest } = tanstack;
	return {
		...rest,
		metadata: {
			...metadata,
			tanstack: tanstackRest
		}
	};
}
/**
* Split wire messages into the parent's own messages and one group per direct
* child. A nested child's messages stay inside its parent's group.
*/
function splitSubagentWire(messages) {
	const parentOf = /* @__PURE__ */ new Map();
	for (const message of messages) {
		const id = wireSubagentRunId(message);
		if (id !== void 0 && !parentOf.has(id)) parentOf.set(id, wireSubagentInfo(message)?.parentSubagentRunId);
	}
	const rootOf = (id) => {
		let current = id;
		for (let depth = 0; depth < 64; depth++) {
			const parent = parentOf.get(current);
			if (parent === void 0 || !parentOf.has(parent)) return current;
			current = parent;
		}
		return current;
	};
	const top = [];
	const groups = /* @__PURE__ */ new Map();
	for (const message of messages) {
		const id = wireSubagentRunId(message);
		if (id === void 0) {
			top.push(message);
			continue;
		}
		const root = rootOf(id);
		let group = groups.get(root);
		if (!group) {
			group = {
				id: root,
				info: {
					name: "subagent",
					status: "finished"
				},
				messages: [],
				hostIndex: top.length - 1
			};
			groups.set(root, group);
		}
		if (id !== root) {
			group.messages.push(message);
			continue;
		}
		const info = wireSubagentInfo(message);
		if (info) group.info = info;
		if (!info?.placeholder) group.messages.push(untag(message));
	}
	return {
		top,
		groups: [...groups.values()]
	};
}
/** Text a child wrote, for the parent model and for a later child. */
function subagentWireText(messages) {
	const blocks = [];
	for (const message of messages) {
		if (!isRecord(message) || message.role !== "assistant") continue;
		if (wireSubagentRunId(message) !== void 0) continue;
		const content = message.content;
		if (typeof content === "string" && content.trim() !== "") blocks.push(content.trim());
	}
	const nested = splitSubagentWire(messages).groups;
	for (const group of nested) {
		const text = subagentWireText(group.messages);
		if (text !== "") blocks.push(`${group.info.name}:\n${text}`);
	}
	return blocks.join("\n\n");
}
/**
* The id of the parent assistant message that hosts a routed turn's cards.
* The persistence recorder writes that message, and a handoff run passes the
* same id so the stored thread keeps one copy.
*/
function subagentHostMessageId(runId) {
	return `assistant:${runId}`;
}
//#endregion
export { splitSubagentWire, subagentHostMessageId, subagentWireText, wireSubagentInfo, wireSubagentRunId };

//# sourceMappingURL=subagent-wire.js.map