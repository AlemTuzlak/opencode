import { splitSubagentWire, subagentWireText, wireSubagentRunId } from "../../../utilities/subagent-wire.js";
//#region src/activities/chat/agents/turn.ts
/** Key of the router plan in `SUBAGENT_STARTED` metadata (`metadata.tanstack`). */
var SUBAGENT_PLAN_KEY = "subagentPlan";
function planOf(metadata) {
	const tanstack = metadata?.tanstack;
	if (typeof tanstack !== "object" || tanstack === null) return void 0;
	return tanstack[SUBAGENT_PLAN_KEY];
}
function uiText(messages) {
	return messages.flatMap((message) => message.role === "assistant" ? message.parts.flatMap((part) => part.type === "text" && part.content.trim() !== "" ? [part.content.trim()] : []) : []).join("\n\n");
}
function partInterruptIds(part) {
	return [...part.subagent.interruptIds ?? [], ...part.subagent.messages.flatMap((message) => message.parts.flatMap((nested) => nested.type === "subagent" ? partInterruptIds(nested) : []))];
}
function groupInterruptIds(group) {
	return [...group.info.interruptIds ?? [], ...splitSubagentWire(group.messages).groups.flatMap(groupInterruptIds)];
}
/**
* Find the children of the trailing assistant turn that `resume` answers.
* Returns undefined when no child owns a resume entry.
*/
function readSubagentTurn(messages, resume) {
	if (!resume || resume.length === 0) return void 0;
	const lastUser = messages.findLastIndex((message) => message.role === "user" && wireSubagentRunId(message) === void 0);
	const before = messages.slice(0, lastUser + 1);
	const turn = messages.slice(lastUser + 1);
	const found = [];
	let plan;
	for (const message of turn) {
		if (!("parts" in message)) continue;
		for (const part of message.parts) {
			if (part.type !== "subagent") continue;
			plan ??= planOf(part.subagent.metadata);
			found.push({
				subagentRunId: part.subagent.id,
				name: part.subagent.name,
				status: part.subagent.status,
				...part.subagent.parentToolCallId !== void 0 && { parentToolCallId: part.subagent.parentToolCallId },
				messages: part.subagent.messages,
				text: uiText(part.subagent.messages),
				ids: new Set(partInterruptIds(part))
			});
		}
	}
	for (const group of splitSubagentWire(turn).groups) {
		plan ??= planOf(group.info.metadata);
		found.push({
			subagentRunId: group.id,
			name: group.info.name,
			status: group.info.status,
			...group.info.parentToolCallId !== void 0 && { parentToolCallId: group.info.parentToolCallId },
			messages: group.messages,
			text: subagentWireText(group.messages),
			ids: new Set(groupInterruptIds(group))
		});
	}
	const owned = /* @__PURE__ */ new Set();
	const children = found.map(({ ids, ...child }) => {
		const entries = resume.filter((entry) => ids.has(entry.interruptId));
		for (const entry of entries) owned.add(entry.interruptId);
		return {
			...child,
			resume: entries
		};
	});
	if (owned.size === 0) return void 0;
	return {
		before,
		children,
		rest: resume.filter((entry) => !owned.has(entry.interruptId)),
		...plan !== void 0 && { plan }
	};
}
//#endregion
export { SUBAGENT_PLAN_KEY, readSubagentTurn };

//# sourceMappingURL=turn.js.map