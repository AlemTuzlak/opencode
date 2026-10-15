import { validateReconstructChatStores } from "./types.js";
import { selectSubagentHost, storedSubagentInfo } from "./subagent-runs.js";
import { interleaveActivityRecords, isTerminalRunStatus, modelMessagesToUIMessages } from "@tanstack/ai";
//#region src/reconstruct.ts
var MAX_PAGE_SIZE = 500;
/**
* Build the JSON `Response` a server-authoritative client hydrates from on load
* (see the client-persistence guide). Reads the thread id from the request query
* (`?threadId=` by default) and returns `{ messages, activeRun, interrupts }`
* ({@link ReconstructedChat}):
*
* - `messages` — the stored transcript as UI messages.
* - `activeRun` — `{ runId }` if a run is still generating for the thread (so the
*   client tails it via the durability stream), else `null`. Resolved via the
*   required `stores.runs.findActiveRun`; `null` when the `runs` store is absent.
* - `interrupts` — `{ runId, pending }` if the thread has pending human-in-the-loop
*   interrupts (a paused approval / wait) and the run they paused, else `null`, so
*   a reload re-prompts the decision from the server. Resolved via the optional
*   `stores.interrupts.listPending`; `null` when that store is absent.
*
* Paging is opt-in. A valid `?limit=` (positive integer, capped at 500) returns
* the newest window of UI messages plus `page`. `?before=` walks to an older
* window. Invalid `limit` (`0`, negative, NaN) is ignored and the full
* transcript is returned. `activeRun` and `interrupts` are never paged.
*
* Requires `stores.messages`. Returns an empty transcript with no active run
* and no interrupts when the thread id is missing or the thread is unknown, so
* the caller never has to special-case a first load.
*
* This helper does **not** enforce tenancy by itself. Pass
* {@link ReconstructChatOptions.authorize} (or wrap the call in your own
* session gate) before exposing it on a public route.
*
* ```ts
* export async function GET(request: Request) {
*   return reconstructChat(persistence, request, {
*     authorize: async (threadId, req) => {
*       const userId = await getSessionUserId(req)
*       return userId != null && (await userOwnsThread(userId, threadId))
*     },
*   })
* }
* ```
*/
async function reconstructChat(persistence, request, options) {
	validateReconstructChatStores(persistence);
	const messageStore = persistence.stores.messages;
	if (!messageStore) throw new Error("reconstructChat requires stores.messages.");
	const requestUrl = new URL(request.url);
	const param = options?.param ?? "threadId";
	const threadId = requestUrl.searchParams.get(param) ?? "";
	const pageSize = parsePageSize(requestUrl.searchParams.get("limit"));
	const before = parseBefore(requestUrl.searchParams.get("before"));
	if (threadId && options?.authorize) {
		const decision = await options.authorize(threadId, request);
		if (decision instanceof Response) return decision;
		if (!decision) return new Response(JSON.stringify({ error: "Forbidden" }), {
			status: 403,
			headers: {
				"content-type": "application/json",
				"cache-control": "no-store"
			}
		});
	}
	const active = threadId ? await persistence.stores.runs?.findActiveRun(threadId) : null;
	const storedActivities = threadId === "" ? [] : await persistence.stores.activities?.loadActivities(threadId) ?? [];
	let pageAfterInterleave = storedActivities.length > 0;
	const loadPage = async (limit) => await messageStore.loadThread(threadId, {
		limit,
		...before === void 0 ? {} : { before }
	});
	let stored = threadId === "" ? [] : pageSize === void 0 || pageAfterInterleave ? await messageStore.loadThread(threadId) : await loadPage(pageSize + 1);
	const fullUi = () => interleaveActivityRecords(modelMessagesToUIMessages(threadMessages(stored)), storedActivities);
	if (pageAfterInterleave && pageSize !== void 0 && before !== void 0 && !fullUi().some((message) => message.id === before)) {
		pageAfterInterleave = false;
		stored = await loadPage(pageSize + 1);
	}
	const pending = threadId ? await persistence.stores.interrupts?.listPending(threadId) ?? [] : [];
	const firstPending = pending[0];
	const transcript = !(pageSize !== void 0 && threadId !== "") ? { messages: fullUi() } : pageAfterInterleave ? uiWindowBefore(fullUi(), pageSize, before) : Array.isArray(stored) ? await windowFromArray({
		stored,
		messageStore,
		threadId,
		pageSize,
		before
	}) : windowFromMessagePage(stored, pageSize);
	const messages = await attachSubagentCards(transcript.messages, persistence.stores.runs, messageStore, threadId, pending);
	const runStore = persistence.stores.runs;
	const runs = options?.includeRuns && threadId && runStore?.listByThread ? (await runStore.listByThread(threadId)).flatMap((run) => isTerminalRunStatus(run.status) ? [{
		runId: run.runId,
		status: run.status,
		startedAt: run.startedAt,
		...run.finishedAt !== void 0 && { finishedAt: run.finishedAt }
	}] : []) : void 0;
	const body = {
		messages: runs ? stampRunTimings(messages, runs) : messages,
		activeRun: active ? { runId: active.runId } : null,
		interrupts: firstPending ? {
			runId: firstPending.runId,
			pending: pending.map((record) => record.payload)
		} : null,
		..."page" in transcript ? { page: transcript.page } : {},
		...runs ? { runs } : {}
	};
	return new Response(JSON.stringify(body), { headers: {
		"content-type": "application/json",
		"cache-control": "no-store"
	} });
}
function messageRunId(message) {
	const metadata = message.metadata;
	if (!metadata || typeof metadata !== "object") return;
	const tanstack = metadata.tanstack;
	if (!tanstack || typeof tanstack !== "object") return;
	const runId = tanstack.runId;
	return typeof runId === "string" && runId !== "" ? runId : void 0;
}
/**
* Write each finished run's timings to `metadata.tanstack.run` on the
* assistant messages of that run, so a client reads them from the message.
*/
function stampRunTimings(messages, runs) {
	const byId = new Map(runs.map((run) => [run.runId, run]));
	return messages.map((message) => {
		const tanstack = message.metadata?.tanstack;
		const runId = tanstack?.run?.id;
		const run = message.role === "assistant" && typeof runId === "string" ? byId.get(runId) : void 0;
		if (!run) return message;
		return {
			...message,
			metadata: {
				...message.metadata,
				tanstack: {
					...tanstack,
					run: {
						id: run.runId,
						startedAt: run.startedAt,
						...run.finishedAt !== void 0 && { finishedAt: run.finishedAt }
					}
				}
			}
		};
	});
}
/** Rebuild one child card from its run record and stored transcript. */
async function childCard(child, runs, messageStore, pending, depth) {
	const subagentRunId = child.subagentRunId ?? child.runId;
	const stored = await messageStore.loadThread(child.threadId);
	const info = storedSubagentInfo(stored);
	const messages = modelMessagesToUIMessages(stored.filter((message) => storedSubagentInfo([message])?.placeholder !== true));
	const nested = runs.listByParentRun && depth < 8 ? await runs.listByParentRun(subagentRunId) : [];
	if (nested.length > 0) {
		const cards = await Promise.all(nested.map((run) => childCard(run, runs, messageStore, pending, depth + 1)));
		const last = messages.findLastIndex((m) => m.role === "assistant");
		if (last === -1) messages.push({
			id: `child-cards:${subagentRunId}`,
			role: "assistant",
			parts: cards
		});
		else {
			const host = messages[last];
			if (host) messages[last] = {
				...host,
				parts: [...host.parts, ...cards]
			};
		}
	}
	const failed = child.status === "failed" || child.status === "aborted";
	const error = info?.error ?? child.error;
	const interruptIds = pending.filter((record) => record.payload.subagentRunId === subagentRunId).map((record) => record.interruptId);
	return {
		type: "subagent",
		subagent: {
			id: subagentRunId,
			name: child.name ?? info?.name ?? "subagent",
			status: failed ? "error" : child.status === "running" ? "running" : child.status === "interrupted" ? "suspended" : "finished",
			...child.parentRunId !== void 0 && { parentRunId: child.parentRunId },
			...info?.parentToolCallId !== void 0 && { parentToolCallId: info.parentToolCallId },
			...interruptIds.length > 0 && { interruptIds },
			...info?.metadata !== void 0 && { metadata: info.metadata },
			messages,
			...failed && error ? { error } : {}
		}
	};
}
/**
* Put stored subagent cards back on the transcript. A routed child sits on
* the parent assistant message of its run. A child that a tool call started
* sits on the message that holds that tool call.
*/
async function attachSubagentCards(messages, runs, messageStore, threadId, pending) {
	if (!runs?.listByParentRun) return messages;
	const parentRunIds = /* @__PURE__ */ new Set();
	for (const message of messages) {
		const runId = messageRunId(message);
		if (runId) parentRunIds.add(runId);
	}
	if (runs.listByThread && threadId !== "") for (const run of await runs.listByThread(threadId)) parentRunIds.add(run.runId);
	const cardsByRun = /* @__PURE__ */ new Map();
	const cardsByToolCall = /* @__PURE__ */ new Map();
	for (const runId of parentRunIds) for (const child of await runs.listByParentRun(runId)) {
		const card = await childCard(child, runs, messageStore, pending, 0);
		const toolCallId = card.subagent.parentToolCallId;
		const target = toolCallId === void 0 ? cardsByRun : cardsByToolCall;
		const key = toolCallId ?? runId;
		target.set(key, [...target.get(key) ?? [], card]);
	}
	if (cardsByRun.size === 0 && cardsByToolCall.size === 0) return messages;
	const result = messages.map((message) => {
		if (message.role !== "assistant") return message;
		const started = message.parts.flatMap((part) => part.type === "tool-call" ? cardsByToolCall.get(part.id) ?? [] : []);
		return started.length === 0 ? message : {
			...message,
			parts: [...message.parts, ...started]
		};
	});
	const text = (message) => message.parts.flatMap((part) => part.type === "text" ? [part.content] : []).join("");
	for (const [runId, cards] of cardsByRun) {
		const blocks = cards.map((card) => ({
			name: card.subagent.name,
			text: card.subagent.messages.filter((message) => message.role === "assistant").flatMap((message) => message.parts.flatMap((part) => part.type === "text" && part.content.trim() !== "" ? [part.content.trim()] : [])).join("\n\n")
		}));
		const named = blocks.filter((block) => block.text !== "").map((block) => block.name + ":\n" + block.text).join("\n\n");
		const bare = blocks.map((block) => block.text).filter(Boolean).join("\n\n");
		const index = selectSubagentHost(result, runId, text, [named, bare]);
		const host = result[index];
		if (host) result[index] = {
			...host,
			parts: [...cards, ...host.parts.filter((part) => part.type !== "text")]
		};
		else {
			const baseId = "subagent-cards:" + runId;
			let id = baseId;
			for (let attempt = 1; result.some((message) => message.id === id); attempt++) id = baseId + ":" + attempt;
			result.push({
				id,
				role: "assistant",
				parts: cards
			});
		}
	}
	return result;
}
function parsePageSize(raw) {
	if (raw == null) return;
	const pageSize = Number(raw);
	if (!(Number.isInteger(pageSize) && pageSize > 0)) return;
	return Math.min(pageSize, MAX_PAGE_SIZE);
}
function parseBefore(raw) {
	if (raw == null || raw === "") return;
	return raw;
}
function threadMessages(loaded) {
	return Array.isArray(loaded) ? loaded : loaded.messages;
}
function completePage() {
	return { truncated: false };
}
function truncatedPage(cursor) {
	return {
		truncated: true,
		cursor
	};
}
function pageFromCursor(cursor) {
	if (cursor === void 0 || cursor === "") return completePage();
	return truncatedPage(cursor);
}
function newestUiWindow(messages, pageSize) {
	if (!(messages.length > pageSize)) return {
		messages,
		page: completePage()
	};
	const uiWindow = messages.slice(messages.length - pageSize);
	return {
		messages: uiWindow,
		page: pageFromCursor(uiWindow[0]?.id)
	};
}
function uiBeforeCursor(messages, cursor) {
	const cut = messages.findIndex((message) => message.id === cursor);
	if (cut === -1) return;
	return messages.slice(0, cut);
}
function windowFromMessagePage(page, pageSize) {
	const ui = modelMessagesToUIMessages(page.messages);
	if (ui.length > pageSize) return newestUiWindow(ui, pageSize);
	if (page.truncated) return {
		messages: ui,
		page: pageFromCursor(page.cursor)
	};
	return {
		messages: ui,
		page: completePage()
	};
}
async function windowFromArray(input) {
	const { stored, messageStore, threadId, pageSize, before } = input;
	if (before === void 0) return newestUiWindow(modelMessagesToUIMessages(stored), pageSize);
	const full = threadMessages(await messageStore.loadThread(threadId));
	return uiWindowBefore(modelMessagesToUIMessages(full), pageSize, before);
}
/** Newest window of a full UI transcript, older than `before` when set. */
function uiWindowBefore(messages, pageSize, before) {
	if (before === void 0) return newestUiWindow(messages, pageSize);
	const older = uiBeforeCursor(messages, before);
	if (older === void 0) return {
		messages: [],
		page: truncatedPage(before)
	};
	return newestUiWindow(older, pageSize);
}
//#endregion
export { reconstructChat };

//# sourceMappingURL=reconstruct.js.map