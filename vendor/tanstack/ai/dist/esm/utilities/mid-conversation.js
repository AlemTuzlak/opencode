//#region src/utilities/mid-conversation.ts
/**
* FNV-1a 32-bit over the UTF-16 code units of `content`, as 8 lowercase hex
* characters. A short, stable id for one system prompt.
*/
function promptHash(content) {
	let hash = 2166136261;
	for (let index = 0; index < content.length; index++) {
		hash ^= content.charCodeAt(index);
		hash = Math.imul(hash, 16777619);
	}
	return (hash >>> 0).toString(16).padStart(8, "0");
}
function foldRecords(messages) {
	let folded;
	for (let before = 0; before < messages.length; before++) {
		const message = messages[before];
		const record = message?.role === "assistant" ? message.midConversationChange : void 0;
		if (!record) continue;
		const prompts = record.systemPrompts ?? [];
		if (record.tools) {
			folded = {
				changes: {
					start: {
						tools: [...record.tools],
						systemPrompts: prompts.length
					},
					changes: []
				},
				tools: [...record.tools],
				prompts: [...prompts]
			};
			continue;
		}
		if (!folded) continue;
		const added = record.toolsAdded ?? [];
		folded.tools.push(...added);
		folded.prompts.push(...prompts);
		folded.changes.changes.push({
			before,
			...added.length > 0 && { tools: [...added] },
			...prompts.length > 0 && { systemPrompts: prompts.length }
		});
	}
	return folded;
}
/**
* Fold the records in `messages`, compare them with the tools and prompts of
* this call, and decide. A change is additive when every recorded tool is
* still there, the prompts start with the recorded prompts, and the start
* point has a tool or no tool was added. Anything else is a new start point.
* Pure.
*/
function planMidConversationChanges(input) {
	const tools = [...input.toolNames];
	const prompts = input.systemPrompts.map((prompt) => promptHash(prompt));
	const startPoint = {
		changes: {
			start: {
				tools,
				systemPrompts: prompts.length
			},
			changes: []
		},
		record: {
			tools: [...tools],
			systemPrompts: prompts
		}
	};
	const folded = foldRecords(input.messages);
	if (!folded) return startPoint;
	const toolsAdded = tools.filter((name) => !folded.tools.includes(name));
	const promptsAdded = prompts.slice(folded.prompts.length);
	if (!(folded.tools.every((name) => tools.includes(name)) && folded.prompts.every((hash, index) => prompts[index] === hash) && (folded.changes.start.tools.length > 0 || toolsAdded.length === 0))) return startPoint;
	if (toolsAdded.length === 0 && promptsAdded.length === 0) return { changes: folded.changes };
	folded.changes.changes.push({
		before: input.messages.length,
		...toolsAdded.length > 0 && { tools: toolsAdded },
		...promptsAdded.length > 0 && { systemPrompts: promptsAdded.length }
	});
	return {
		changes: folded.changes,
		record: {
			...toolsAdded.length > 0 && { toolsAdded: [...toolsAdded] },
			...promptsAdded.length > 0 && { systemPrompts: promptsAdded }
		}
	};
}
/**
* For adapters: resolve the names and counts of `changes` against the current
* `tools` and `systemPrompts`. Returns `undefined` when a name is missing, a
* name is used twice, or the counts do not add up. Then the adapter sends the
* request it sends today.
*/
function splitMidConversationChanges(input) {
	const { changes, tools, systemPrompts } = input;
	const byName = new Map(tools.map((tool) => [tool.name, tool]));
	const used = /* @__PURE__ */ new Set();
	const pick = (names) => {
		const picked = [];
		for (const name of names) {
			const tool = byName.get(name);
			if (!tool || used.has(name)) return void 0;
			used.add(name);
			picked.push(tool);
		}
		return picked;
	};
	const startTools = pick(changes.start.tools);
	let offset = changes.start.systemPrompts;
	if (!startTools || offset > systemPrompts.length) return void 0;
	const request = {
		startTools,
		startSystemPrompts: systemPrompts.slice(0, offset),
		addedTools: [],
		at: /* @__PURE__ */ new Map()
	};
	for (const change of changes.changes) {
		const added = pick(change.tools ?? []);
		const count = change.systemPrompts ?? 0;
		if (!added || offset + count > systemPrompts.length || request.at.has(change.before)) return;
		request.addedTools.push(...added);
		request.at.set(change.before, {
			tools: added,
			systemPrompts: systemPrompts.slice(offset, offset + count)
		});
		offset += count;
	}
	if (used.size !== tools.length || offset !== systemPrompts.length) return;
	return request;
}
//#endregion
export { planMidConversationChanges, promptHash, splitMidConversationChanges };

//# sourceMappingURL=mid-conversation.js.map