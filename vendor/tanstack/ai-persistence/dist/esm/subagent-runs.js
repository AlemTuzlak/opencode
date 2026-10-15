import { mergeStoredMessages } from "./merge-stored.js";
import { StreamProcessor, convertMessagesToModelMessages, modelMessagesToUIMessages, subagentHostMessageId, wireSubagentInfo } from "@tanstack/ai";
//#region src/subagent-runs.ts
function withSubagentInfo(metadata, info) {
	const source = metadata != null && typeof metadata === "object" ? metadata : {};
	const tanstack = source.tanstack != null && typeof source.tanstack === "object" ? source.tanstack : {};
	return {
		...source,
		tanstack: {
			...tanstack,
			subagent: info
		}
	};
}
function childStoreId(subagentRunId) {
	return `subagent:${subagentRunId}`;
}
/**
* Head metadata key for what a later call of the child needs:
* - `base`: how many stored messages came before the current call. A resume
*   of that call keeps the number.
* - `parentThreadId`: the thread that started the child. Only that thread can
*   continue it.
* - `prompt`: the task of the first call, the first user message of the child.
*/
var CHILD_KEY = "tanstack:subagentChild";
function storedMarker(messages) {
	const marker = messages[0]?.metadata?.[CHILD_KEY];
	const read = (key) => marker !== null && typeof marker === "object" ? Reflect.get(marker, key) : void 0;
	const base = read("base");
	const parentThreadId = read("parentThreadId");
	const prompt = read("prompt");
	return {
		...typeof base === "number" && { base },
		...typeof parentThreadId === "string" && { parentThreadId },
		...typeof prompt === "string" && { prompt }
	};
}
/** The thread a chat writes its children under: its own child thread, if any. */
function ownerThread(caller) {
	return caller.subagentRunId === void 0 ? caller.threadId : childStoreId(caller.subagentRunId);
}
var SINGLE_TOOL = "subagent";
/**
* The task of a child that a tool call started: the `prompt` of the `subagent`
* tool, else its `input` as JSON. Other tools pass their whole arguments.
*/
function callPrompt(call) {
	if (call.args === "") return void 0;
	if (call.name !== SINGLE_TOOL) return call.args;
	let args;
	try {
		args = JSON.parse(call.args);
	} catch {
		return call.args;
	}
	if (args === null || typeof args !== "object") return call.args;
	const prompt = Reflect.get(args, "prompt");
	if (typeof prompt === "string") return prompt;
	const input = Reflect.get(args, "input");
	return input === void 0 ? call.args : JSON.stringify(input);
}
function readSubagentRunId(chunk) {
	if (!("subagentRunId" in chunk)) return;
	const id = chunk.subagentRunId;
	return typeof id === "string" && id !== "" ? id : void 0;
}
function assistantId(runId) {
	return subagentHostMessageId(runId);
}
function messageText(message) {
	return typeof message.content === "string" ? message.content : "";
}
function readModelRunId(message) {
	const metadata = message.metadata;
	if (metadata == null || typeof metadata !== "object") return;
	if (!("tanstack" in metadata)) return;
	const tanstack = metadata.tanstack;
	if (tanstack == null || typeof tanstack !== "object") return;
	if (!("runId" in tanstack)) return;
	const runId = tanstack.runId;
	return typeof runId === "string" && runId !== "" ? runId : void 0;
}
function withRunId(message, runId) {
	const metadata = message.metadata;
	const tanstack = metadata != null && typeof metadata === "object" && "tanstack" in metadata && metadata.tanstack != null && typeof metadata.tanstack === "object" ? metadata.tanstack : {};
	return {
		...message,
		metadata: {
			...metadata,
			tanstack: {
				...tanstack,
				runId
			}
		}
	};
}
function subagentHostRunId(metadata) {
	if (metadata === null || typeof metadata !== "object" || !Object.hasOwn(metadata, "tanstack:subagentHost")) return;
	const marker = Reflect.get(metadata, "tanstack:subagentHost");
	if (marker === null || typeof marker !== "object" || Array.isArray(marker)) return;
	if (Object.keys(marker).length !== 2 || !Object.hasOwn(marker, "version") || !Object.hasOwn(marker, "runId")) return;
	const runId = Reflect.get(marker, "runId");
	return Reflect.get(marker, "version") === 1 && typeof runId === "string" && runId !== "" ? runId : void 0;
}
function hasHostMarker(metadata) {
	return metadata !== null && typeof metadata === "object" && Object.hasOwn(metadata, "tanstack:subagentHost");
}
function hostScopeMatches(metadata, runId) {
	const generic = readModelRunIdFromMetadata(metadata);
	return (generic === void 0 || generic === runId) && (!hasHostMarker(metadata) || subagentHostRunId(metadata) === runId);
}
function precedingUserId(messages, index) {
	return messages.slice(0, index).findLast((message) => message.role === "user")?.id;
}
function selectSubagentHost(messages, runId, text, summaries) {
	const marked = messages.flatMap((message, index) => message.role === "assistant" && hostScopeMatches(message.metadata, runId) && subagentHostRunId(message.metadata) === runId ? [index] : []);
	if (marked.length === 1) return marked[0] ?? -1;
	if (marked.length > 1) return -1;
	const scoped = messages.flatMap((message, index) => message.role === "assistant" && readModelRunIdFromMetadata(message.metadata) === runId ? [index] : []);
	const segments = new Set(scoped.map((index) => precedingUserId(messages, index)));
	if (segments.size !== 1 || segments.has(void 0)) return -1;
	const legacy = scoped.filter((index) => {
		const message = messages[index];
		if (!message || hasHostMarker(message.metadata) || !hostScopeMatches(message.metadata, runId)) return false;
		return summaries.some((summary) => summary !== "" && text(message) === summary);
	});
	if (legacy.length !== 1) return -1;
	const index = legacy[0];
	if (index === void 0) return -1;
	const candidate = messages[index];
	if (!candidate) return -1;
	return candidate.id === assistantId(runId) || scoped.some((other) => other !== index) ? index : -1;
}
function unusedHostId(messages, runId) {
	const base = assistantId(runId);
	let id = base;
	for (let attempt = 1; messages.some((message) => message.id === id); attempt++) id = base + ":" + attempt;
	return id;
}
function readModelRunIdFromMetadata(metadata) {
	if (metadata === null || typeof metadata !== "object") return;
	const tanstack = Reflect.get(metadata, "tanstack");
	if (tanstack === null || typeof tanstack !== "object") return;
	const runId = Reflect.get(tanstack, "runId");
	return typeof runId === "string" && runId !== "" ? runId : void 0;
}
function withHost(message, runId) {
	const next = withRunId(message, runId);
	return {
		...next,
		metadata: {
			...next.metadata,
			"tanstack:subagentHost": {
				version: 1,
				runId
			}
		}
	};
}
function keepSubagentRunIds(stored, merged, summariesByRun) {
	const runIds = new Set(stored.flatMap((message) => {
		const runId = subagentHostRunId(message.metadata) ?? readModelRunId(message);
		return runId === void 0 ? [] : [runId];
	}));
	for (const runId of runIds) {
		const summaries = summariesByRun.get(runId) ?? [];
		const previousIndex = selectSubagentHost(stored, runId, messageText, summaries);
		const previous = stored[previousIndex];
		if (!previous || merged.some((message) => message.id === previous.id)) continue;
		if (selectSubagentHost(merged, runId, messageText, summaries) !== -1) continue;
		const turn = precedingUserId(stored, previousIndex);
		if (turn === void 0) continue;
		const forms = /* @__PURE__ */ new Set([messageText(previous), ...summaries]);
		const candidates = merged.flatMap((message, index) => message.role === "assistant" && hostScopeMatches(message.metadata, runId) && precedingUserId(merged, index) === turn && forms.has(messageText(message)) ? [index] : []);
		if (candidates.length !== 1) continue;
		const index = candidates[0];
		if (index !== void 0 && merged[index]) merged[index] = withHost(merged[index], runId);
	}
	return merged;
}
function childText(messages) {
	return messages.flatMap((message) => message.role === "assistant" ? message.parts.flatMap((part) => part.type === "text" && part.content.trim() !== "" ? [part.content.trim()] : []) : []).join("\n\n");
}
function withoutCards(messages) {
	return messages.map((message) => ({
		...message,
		parts: message.parts.filter((part) => part.type !== "subagent")
	}));
}
/**
* Card data for a stored child transcript. It rides on the first message, in
* `metadata.tanstack.subagent`, the same shape the wire uses.
*/
function storedSubagentInfo(messages) {
	return wireSubagentInfo(messages[0]);
}
/** A stored child transcript without its card-only placeholder. */
function withoutPlaceholder(messages) {
	return messages.filter((message) => storedSubagentInfo([message])?.placeholder !== true);
}
function createSubagentRunRecorder(stores) {
	const children = /* @__PURE__ */ new Map();
	const intervalMs = stores.intervalMs ?? 1e3;
	const answered = /* @__PURE__ */ new Map();
	const parentSavedAt = /* @__PURE__ */ new Map();
	const calls = /* @__PURE__ */ new Map();
	async function loadMessages(threadId) {
		return stores.messages.loadThread(threadId);
	}
	function lineage(subagentRunId) {
		const notes = [];
		let id = subagentRunId;
		for (let depth = 0; id !== void 0 && depth < 64; depth++) {
			const note = children.get(id);
			if (!note) break;
			notes.push(note);
			id = note.parentSubagentRunId;
		}
		return notes;
	}
	async function saveChild(subagentRunId) {
		const note = children.get(subagentRunId);
		if (!note) return;
		note.savedAt = Date.now();
		const info = {
			name: note.name,
			status: note.status,
			...note.parentSubagentRunId !== void 0 && { parentSubagentRunId: note.parentSubagentRunId },
			...note.parentToolCallId !== void 0 && { parentToolCallId: note.parentToolCallId },
			...note.interruptIds !== void 0 && { interruptIds: note.interruptIds },
			...note.error !== void 0 && { error: note.error },
			...note.metadata !== void 0 && { metadata: note.metadata }
		};
		const transcript = convertMessagesToModelMessages(withoutCards(note.processor.getMessages()));
		const marker = { [CHILD_KEY]: {
			base: note.base,
			parentThreadId: note.parentThreadId,
			...note.prompt !== void 0 && { prompt: note.prompt }
		} };
		const [first, ...rest] = transcript;
		const head = first ? {
			...first,
			metadata: {
				...withSubagentInfo(first.metadata, info),
				...marker
			}
		} : {
			id: `child:${subagentRunId}`,
			role: "assistant",
			content: "",
			metadata: {
				...withSubagentInfo(void 0, {
					...info,
					placeholder: true
				}),
				...marker
			}
		};
		await stores.messages.saveThread(childStoreId(subagentRunId), [head, ...rest]);
	}
	async function saveParent(threadId, runId) {
		const notes = [...children.values()].filter((note) => note.parentRunId === runId && note.parentSubagentRunId === void 0 && note.parentToolCallId === void 0);
		if (notes.length === 0) return;
		const content = notes.map((note) => {
			const text = childText(note.processor.getMessages());
			return text === "" ? "" : `${note.name}:\n${text}`;
		}).filter((block) => block !== "").join("\n\n");
		const stored = await loadMessages(threadId);
		const index = selectSubagentHost(stored, runId, messageText, [content, notes.map((note) => childText(note.processor.getMessages())).filter(Boolean).join("\n\n")]);
		const host = stored[index];
		if (host) {
			const otherMessages = stored.filter((_, position) => position !== index);
			const id = host.id != null && !otherMessages.some((message) => message.id === host.id) ? host.id : unusedHostId(otherMessages, runId);
			const next = [...stored];
			next[index] = withHost({
				...host,
				id,
				content
			}, runId);
			await stores.messages.saveThread(threadId, next);
			return;
		}
		const assistant = {
			id: unusedHostId(stored, runId),
			role: "assistant",
			content,
			metadata: {
				tanstack: { runId },
				"tanstack:subagentHost": {
					version: 1,
					runId
				}
			}
		};
		await stores.messages.saveThread(threadId, [...stored, assistant]);
	}
	async function startChild(input, chunk) {
		const id = chunk.subagentRunId;
		const call = chunk.parentToolCallId === void 0 ? void 0 : calls.get(chunk.parentToolCallId);
		if (chunk.parentToolCallId !== void 0) calls.delete(chunk.parentToolCallId);
		const record = await stores.runs?.createOrResume({
			runId: id,
			threadId: childStoreId(id),
			startedAt: Date.now(),
			parentRunId: chunk.parentSubagentRunId ?? input.runId,
			subagentRunId: id,
			name: chunk.name
		});
		const existing = children.get(id);
		if (existing) {
			existing.threadId = input.threadId;
			existing.runId = input.runId;
			existing.status = "running";
			delete existing.interruptIds;
			if (chunk.metadata !== void 0) existing.metadata = chunk.metadata;
		} else {
			const raw = await loadMessages(childStoreId(id));
			const stored = withoutPlaceholder(raw);
			const marker = storedMarker(raw);
			const resumes = storedSubagentInfo(raw)?.status === "suspended";
			const prompt = raw.length > 0 ? marker.prompt : call && callPrompt(call);
			children.set(id, {
				name: chunk.name,
				threadId: input.threadId,
				runId: input.runId,
				savedAt: 0,
				parentRunId: record?.parentRunId ?? chunk.parentSubagentRunId ?? input.runId,
				...chunk.parentSubagentRunId !== void 0 && { parentSubagentRunId: chunk.parentSubagentRunId },
				...chunk.parentToolCallId !== void 0 && { parentToolCallId: chunk.parentToolCallId },
				...chunk.metadata !== void 0 && { metadata: chunk.metadata },
				processor: new StreamProcessor({
					subagentRunId: id,
					initialMessages: modelMessagesToUIMessages(stored)
				}),
				status: "running",
				base: resumes ? marker.base ?? 0 : stored.length,
				parentThreadId: ownerThread({
					threadId: input.threadId,
					subagentRunId: chunk.parentSubagentRunId ?? input.subagentRunId
				}),
				...prompt !== void 0 && { prompt }
			});
		}
		if (record && record.status !== "running") await stores.runs?.update(id, { status: "running" });
		if (chunk.parentSubagentRunId !== void 0) children.get(chunk.parentSubagentRunId)?.processor.processChunk(chunk);
		await saveChild(id);
		const note = children.get(id);
		if (stores.sessions && note) await indexChild(stores.sessions, id, note);
	}
	async function indexChild(sessions, subagentRunId, note) {
		const childThreadId = childStoreId(subagentRunId);
		const current = await sessions.get(childThreadId);
		const parent = await sessions.get(note.parentThreadId);
		const now = Date.now();
		await sessions.upsert({
			...current,
			threadId: childThreadId,
			parentThreadId: note.parentThreadId,
			...note.parentToolCallId !== void 0 && { parentToolCallId: note.parentToolCallId },
			...parent?.principal !== void 0 && { principal: parent.principal },
			...parent?.harness !== void 0 && { harness: parent.harness },
			createdAt: current?.createdAt ?? now,
			updatedAt: now
		});
	}
	/**
	* The stored transcript of a child, for a call that continues it by
	* `sessionId`. It starts with the task of the first call as a user message.
	* `undefined` when `caller` did not start a child with this id. While the
	* child waits on an interrupt, it is the transcript from before that call:
	* the resume adds the newer messages of the child itself.
	*/
	async function loadChild(subagentRunId, caller) {
		const stored = await loadMessages(childStoreId(subagentRunId));
		const marker = storedMarker(stored);
		if (marker.parentThreadId !== ownerThread(caller)) return void 0;
		const messages = withoutPlaceholder(stored);
		const info = storedSubagentInfo(stored);
		const transcript = info?.status === "suspended" && marker.base !== void 0 ? messages.slice(0, marker.base) : messages;
		return {
			messages: [...marker.prompt === void 0 ? [] : [{
				id: `${childStoreId(subagentRunId)}:prompt`,
				role: "user",
				content: marker.prompt
			}], ...transcript],
			...info !== void 0 && { agent: info.name }
		};
	}
	async function settleChild(chunk) {
		const id = chunk.subagentRunId;
		const note = children.get(id);
		if (!note) return;
		try {
			await writeSettled(note, id, chunk);
		} finally {
			if (note.parentSubagentRunId !== void 0 || note.parentToolCallId !== void 0) children.delete(id);
		}
	}
	async function writeSettled(note, id, chunk) {
		note.processor.finalizeStream();
		if (note.parentSubagentRunId !== void 0) children.get(note.parentSubagentRunId)?.processor.processChunk(chunk);
		if (chunk.type === "SUBAGENT_ERROR") {
			const stopped = chunk.message === "Stopped";
			note.status = "error";
			note.error = {
				message: chunk.message,
				...chunk.code !== void 0 && { code: chunk.code }
			};
			await saveChild(id);
			await stores.runs?.update(id, {
				status: stopped ? "aborted" : "failed",
				finishedAt: Date.now(),
				...!stopped ? { error: { message: chunk.message } } : {}
			});
			return;
		}
		if (chunk.outcome?.type === "suspended") {
			note.status = "suspended";
			note.interruptIds = chunk.outcome.interruptIds ?? [];
			await saveChild(id);
			await stores.runs?.update(id, { status: "interrupted" });
			return;
		}
		note.status = "finished";
		await saveChild(id);
		await stores.runs?.update(id, {
			status: "completed",
			finishedAt: Date.now()
		});
	}
	async function commitAnswers(runId) {
		const entries = answered.get(runId) ?? [];
		answered.delete(runId);
		for (const entry of entries) if (entry.status === "cancelled") await stores.interrupts?.cancel(entry.interruptId);
		else await stores.interrupts?.resolve(entry.interruptId, entry.payload);
	}
	/** The notes a run fed. */
	function notesOf(runId) {
		return [...children].filter(([, note]) => note.runId === runId);
	}
	function forget(runId) {
		for (const [id] of notesOf(runId)) children.delete(id);
		parentSavedAt.delete(runId);
	}
	async function settleOpenChildren(runId, status, error) {
		for (const [subagentRunId] of notesOf(runId)) {
			await saveChild(subagentRunId);
			const current = await stores.runs?.get(subagentRunId);
			if (current && current.status !== "running") continue;
			await stores.runs?.update(subagentRunId, {
				status,
				finishedAt: Date.now(),
				...error ? { error } : {}
			});
		}
	}
	/** Write the parent messages of this thread's routed children. */
	async function saveParents(threadId) {
		const runIds = new Set([...children.values()].filter((note) => note.threadId === threadId).map((note) => note.parentRunId));
		for (const runId of runIds) await saveParent(threadId, runId);
	}
	return {
		loadChild,
		async start(input) {
			await stores.runs?.createOrResume({
				runId: input.runId,
				threadId: input.threadId,
				startedAt: Date.now()
			});
			if (input.resume?.length) answered.set(input.runId, [...input.resume]);
			const incoming = convertMessagesToModelMessages([...input.messages]);
			const stored = await loadMessages(input.threadId);
			const merged = mergeStoredMessages(stored, incoming);
			const summariesByRun = /* @__PURE__ */ new Map();
			const parentIds = new Set(stored.flatMap((message) => {
				const id = readModelRunId(message);
				return id === void 0 ? [] : [id];
			}));
			for (const parentId of parentIds) {
				const blocks = [];
				for (const child of await stores.runs?.listByParentRun?.(parentId) ?? []) {
					const transcript = await loadMessages(child.threadId);
					if (storedSubagentInfo(transcript)?.parentToolCallId !== void 0) continue;
					blocks.push({
						name: child.name ?? storedSubagentInfo(transcript)?.name ?? "subagent",
						text: childText(modelMessagesToUIMessages(transcript))
					});
				}
				summariesByRun.set(parentId, [blocks.filter((block) => block.text !== "").map((block) => block.name + ":\n" + block.text).join("\n\n"), blocks.map((block) => block.text).filter(Boolean).join("\n\n")]);
			}
			await stores.messages.saveThread(input.threadId, keepSubagentRunIds(stored, merged, summariesByRun));
		},
		async chunk(input) {
			const chunk = input.chunk;
			if (chunk.type === "TOOL_CALL_START") calls.set(chunk.toolCallId, {
				name: chunk.toolCallName,
				args: ""
			});
			if (chunk.type === "TOOL_CALL_ARGS") {
				const call = calls.get(chunk.toolCallId);
				if (call) call.args += chunk.delta;
			}
			if (chunk.type === "TOOL_CALL_RESULT") calls.delete(chunk.toolCallId);
			if (chunk.type === "SUBAGENT_STARTED") {
				await startChild(input, chunk);
				return;
			}
			if (chunk.type === "SUBAGENT_FINISHED" || chunk.type === "SUBAGENT_ERROR") {
				await settleChild(chunk);
				await saveParents(input.threadId);
				return;
			}
			const subagentRunId = readSubagentRunId(chunk);
			if (!subagentRunId) return;
			const notes = lineage(subagentRunId);
			if (notes.length === 0) return;
			for (const note of notes) note.processor.processChunk(chunk);
			const now = Date.now();
			const note = notes[0];
			if (note && now - note.savedAt >= intervalMs) await saveChild(subagentRunId);
			if (chunk.type === "TEXT_MESSAGE_CONTENT" && now - (parentSavedAt.get(input.runId) ?? 0) >= intervalMs) {
				parentSavedAt.set(input.runId, now);
				await saveParents(input.threadId);
			}
		},
		async suspend(input) {
			await commitAnswers(input.runId);
			await saveParents(input.threadId);
			for (const [subagentRunId] of notesOf(input.runId)) await saveChild(subagentRunId);
			for (const interrupt of input.interrupts) await stores.interrupts?.create({
				interruptId: interrupt.id,
				runId: input.runId,
				threadId: input.threadId,
				requestedAt: Date.now(),
				payload: { ...interrupt }
			});
			await stores.runs?.update(input.runId, { status: "interrupted" });
			forget(input.runId);
		},
		async finish(input) {
			await commitAnswers(input.runId);
			await saveParents(input.threadId);
			await settleOpenChildren(input.runId, "completed");
			await stores.runs?.update(input.runId, {
				status: "completed",
				finishedAt: Date.now()
			});
			forget(input.runId);
		},
		async abort(input) {
			const aborted = input.error instanceof Error && input.error.name === "AbortError";
			const message = input.error instanceof Error ? input.error.message : "Run failed";
			await settleOpenChildren(input.runId, aborted ? "aborted" : "failed", aborted ? void 0 : { message });
			await saveParents(input.threadId);
			await stores.runs?.update(input.runId, {
				status: aborted ? "aborted" : "failed",
				finishedAt: Date.now(),
				...!aborted ? { error: { message } } : {}
			});
			answered.delete(input.runId);
			forget(input.runId);
		}
	};
}
//#endregion
export { createSubagentRunRecorder, selectSubagentHost, storedSubagentInfo, subagentHostRunId };

//# sourceMappingURL=subagent-runs.js.map