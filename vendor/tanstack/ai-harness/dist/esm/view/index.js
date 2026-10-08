import { MEDIA_URL_PREFIX, kindOf, mediaIdOf, mediaOfMessage, mediaPart } from "../media-ref.js";
import { HARNESS_EVENTS } from "../types.js";
import { applyDescription, applyEvent, applySnapshot, emptyState, keep, messagesFromTranscript, notAccepted, withNotice, withUserMessage } from "./reduce.js";
import { EventType, readUnopenedInterruptBinding } from "@tanstack/ai";
import { createStore } from "@tanstack/store";
//#region src/view/index.ts
/** Get a new media URL this long before the old one expires. */
var URL_REFRESH_EARLY = 6e4;
/** What a line and its attachments send: plain text when there are none. */
function userInput(line, attachments) {
	if (attachments.length === 0) return line;
	const files = attachments.map(mediaPart);
	return line === "" ? files : [{
		type: "text",
		content: line
	}, ...files];
}
/** Events after which the snapshot can differ. */
function changesSnapshot(entry) {
	const { event } = entry;
	if (event.type === EventType.RUN_STARTED || event.type === EventType.RUN_FINISHED || event.type === EventType.RUN_ERROR) return !("subagentRunId" in event && event.subagentRunId);
	return event.type === EventType.CUSTOM && /^harness\.(operation|input|question|config)/.test(event.name);
}
/**
* A receipt that `applyInput` refused before the session saw the input. The
* session reports its own refusals with a `harness.input.rejected` event, so
* the view shows only this one from the receipt.
*/
function isNotExposed(value) {
	return typeof value === "object" && value !== null && "reason" in value && value.reason === "not_exposed";
}
function isOperation(value) {
	return typeof value === "object" && value !== null && "status" in value && typeof value.status === "function" && "then" in value;
}
/** Run `task` now, or once more after the running one ends. */
function coalesce(task) {
	let running = false;
	let again = false;
	const run = async () => {
		running = true;
		do {
			again = false;
			await task();
		} while (again);
		running = false;
	};
	return () => {
		if (running) again = true;
		else run();
	};
}
/**
* A live view of a harness session for any UI. It reads the events, keeps one
* state in a TanStack Store, and gives actions and typed events.
*
* @param source A local `HarnessSession` (from `host.open`) or a remote
* `HarnessClient` (from `createHarnessClient`).
*
* @example
* ```ts
* const view = createSessionView(session)
* view.store.subscribe((state) => draw(state))
* view.on('approval', (approval) => approval.approve())
* await view.send('fix the failing test')
* ```
*/
function createSessionView(source) {
	const internal = createStore(emptyState());
	const store = createStore(() => internal.state);
	const reader = new AbortController();
	const handlers = /* @__PURE__ */ new Map();
	/** The answer to each open approval and client tool, by interrupt id. */
	const decisions = /* @__PURE__ */ new Map();
	const chatTurns = /* @__PURE__ */ new Set();
	const agentNames = /* @__PURE__ */ new Map();
	const mediaParts = /* @__PURE__ */ new Map();
	const urlRefreshes = /* @__PURE__ */ new Map();
	let resolving = false;
	let disposed = false;
	const get = () => internal.state;
	const commit = (next) => {
		if (disposed) return;
		const shown = withMediaActions(next);
		if (shown !== internal.state) internal.setState(() => shown);
	};
	const emit = (key, value) => {
		const listeners = handlers.get(key) ?? [];
		for (const listener of listeners) try {
			listener(value);
		} catch {}
	};
	const fail = (error) => {
		if (disposed) return;
		const message = error instanceof Error ? error.message : String(error);
		commit(withNotice(get(), "error", message));
		emit("error", message);
	};
	/** Show a refused receipt that no event reports. See `isNotExposed`. */
	const refused = (result) => {
		if (disposed || !isNotExposed(result)) return;
		const text = notAccepted("not_exposed");
		commit(withNotice(get(), "rejected", text));
		emit("error", text);
	};
	const alive = () => {
		if (disposed) throw new Error("The session view is disposed.");
	};
	/** A local operation reports failures as events. A remote call that throws did not arrive. */
	const settle = (result) => {
		if (isOperation(result)) {
			result.then(void 0, () => {});
			return;
		}
		Promise.resolve(result).then(refused, fail);
	};
	const fetchUrl = async (id) => {
		if (!source.mediaUrl) return;
		try {
			const { url, expiresAt } = await source.mediaUrl(id);
			const part = mediaParts.get(id);
			if (disposed || !part) return;
			if (url !== void 0) mediaParts.set(id, {
				...part,
				url
			});
			commit(get());
			if (expiresAt === void 0) return;
			const left = expiresAt - Date.now();
			const delay = Math.max(left - URL_REFRESH_EARLY, left / 2, 1e3);
			urlRefreshes.set(id, setTimeout(() => void fetchUrl(id), delay));
		} catch (error) {
			fail(error);
		}
	};
	/** The view's own part for a media id: it loads from the source and gets a url once. */
	const mediaActions = (part) => {
		const known = mediaParts.get(part.id);
		if (known) return known;
		const { id } = part;
		const shown = {
			...part,
			load: () => source.loadMedia ? source.loadMedia(id) : Promise.reject(/* @__PURE__ */ new Error("This session source cannot load media."))
		};
		mediaParts.set(id, shown);
		fetchUrl(id);
		return shown;
	};
	const partsWithActions = (parts) => keep(parts, parts.map((part) => {
		if (part.type === "media") return mediaActions(part);
		if (part.type !== "agent") return part;
		const inner = partsWithActions(part.parts);
		return inner === part.parts ? part : {
			...part,
			parts: inner
		};
	}));
	const messageWithActions = (message) => {
		if (message.role === "assistant") {
			const parts = partsWithActions(message.parts);
			return parts === message.parts ? message : {
				...message,
				parts
			};
		}
		if (message.role !== "user" || !message.media) return message;
		const media = keep(message.media, message.media.map(mediaActions));
		return media === message.media ? message : {
			...message,
			media
		};
	};
	const withMediaActions = (state) => {
		const messages = keep(state.messages, state.messages.map(messageWithActions));
		return messages === state.messages ? state : {
			...state,
			messages
		};
	};
	/**
	* Keep the answer to an item of `open`. One resume must answer every open
	* interrupt, so it goes when each approval and client tool has an answer.
	*/
	const answer = (open, entry) => {
		alive();
		const id = entry.interruptId;
		if (resolving || decisions.has(id) || !open.some((item) => item.id === id)) return;
		decisions.set(id, entry);
		const { approvals, clientTools } = get();
		const waiting = [...approvals, ...clientTools];
		const resume = waiting.flatMap((item) => decisions.get(item.id) ?? []);
		if (resume.length < waiting.length) return;
		decisions.clear();
		resolving = true;
		commit({
			...get(),
			approvals: [],
			clientTools: []
		});
		source.resolve(resume).then(void 0, fail).finally(() => {
			resolving = false;
			refreshSnapshot();
		});
	};
	const decide = (id, approved) => answer(get().approvals, {
		interruptId: id,
		status: "resolved",
		payload: approved
	});
	const decideAll = (approved) => {
		alive();
		const open = get().approvals;
		for (const item of open) decide(item.id, approved);
	};
	const factory = {
		approval: (interrupt, call) => ({
			id: interrupt.id,
			...interrupt.toolCallId ? { toolCallId: interrupt.toolCallId } : {},
			tool: call?.name ?? interrupt.message ?? "tool",
			args: call?.args,
			...interrupt.message ? { message: interrupt.message } : {},
			approve: () => decide(interrupt.id, true),
			reject: () => decide(interrupt.id, false)
		}),
		clientTool: (interrupt, call) => {
			const binding = readUnopenedInterruptBinding(interrupt);
			const open = () => get().clientTools;
			return {
				id: interrupt.id,
				...interrupt.toolCallId ? { toolCallId: interrupt.toolCallId } : {},
				tool: call?.name ?? (binding?.kind === "client-tool-execution" ? binding.toolName : "tool"),
				args: call?.args ?? interrupt.metadata?.input,
				resolve: (output) => answer(open(), {
					interruptId: interrupt.id,
					status: "resolved",
					payload: output
				}),
				fail: (message) => answer(open(), {
					interruptId: interrupt.id,
					status: "resolved",
					payload: { error: message },
					metadata: { tanstack: { state: "output-error" } }
				})
			};
		},
		question: (question) => ({
			id: question.questionId,
			message: question.message,
			...question.schema ? { schema: question.schema } : {},
			...question.secret ? { secret: true } : {},
			...question.url ? { url: question.url } : {},
			answer: (value) => {
				alive();
				return source.answer(question.questionId, value);
			}
		}),
		agent: (operation) => ({
			...operation,
			send: (message, mode) => {
				alive();
				if (!source.sendToAgent) return Promise.reject(/* @__PURE__ */ new Error("This view source cannot send messages to agents."));
				return source.sendToAgent(operation.id, message, mode ? { mode } : void 0);
			}
		})
	};
	const takeSnapshot = (snapshot, initial = false) => {
		const before = get();
		const next = applySnapshot(before, snapshot, factory, { initial });
		commit(next);
		for (const approval of next.approvals) if (!before.approvals.includes(approval)) emit("approval", approval);
		for (const call of next.clientTools) if (!before.clientTools.includes(call)) emit("clientTool", call);
		for (const signIn of next.signIns) if (!before.signIns.includes(signIn)) emit("signIn", signIn);
		for (const question of next.questions) if (!before.questions.includes(question)) emit("question", question);
	};
	const refreshSnapshot = coalesce(async () => {
		try {
			const snapshot = await source.snapshot();
			if (!disposed) takeSnapshot(snapshot);
		} catch (error) {
			fail(error);
		}
	});
	const refreshDescription = coalesce(async () => {
		try {
			const description = await source.describe();
			if (!disposed) commit(applyDescription(get(), description));
		} catch (error) {
			fail(error);
		}
	});
	const refreshTranscript = coalesce(async () => {
		try {
			const transcript = await source.transcript();
			if (!disposed) commit({
				...get(),
				messages: messagesFromTranscript(transcript)
			});
		} catch (error) {
			fail(error);
		}
	});
	const fire = (entry, before, after) => {
		const { event } = entry;
		if (event.type === EventType.TOOL_CALL_START) emit("toolCall", {
			id: event.toolCallId,
			name: event.toolCallName
		});
		if (event.type === EventType.SUBAGENT_STARTED) {
			const name = event.name ?? "agent";
			agentNames.set(event.subagentRunId, name);
			emit("agent", {
				id: event.subagentRunId,
				name,
				status: "running"
			});
		}
		if (event.type === EventType.SUBAGENT_FINISHED || event.type === EventType.SUBAGENT_ERROR) emit("agent", {
			id: event.subagentRunId,
			name: agentNames.get(event.subagentRunId) ?? "agent",
			status: event.type === EventType.SUBAGENT_FINISHED ? "done" : "failed"
		});
		if (event.type === EventType.RUN_ERROR && !("subagentRunId" in event && event.subagentRunId)) emit("error", `Error: ${event.message}`);
		if (event.type === EventType.CUSTOM) {
			const value = typeof event.value === "object" && event.value !== null ? event.value : {};
			const operationId = String(value.operationId);
			if (event.name === HARNESS_EVENTS.inputRejected) emit("error", notAccepted(value.reason));
			if (event.name === HARNESS_EVENTS.pluginEvent && typeof value.name === "string") emit(`plugin:${value.name}`, value.value);
			if (event.name === HARNESS_EVENTS.operationStarted && value.kind === "chat") chatTurns.add(operationId);
			if (event.name === HARNESS_EVENTS.operationFinished && chatTurns.delete(operationId)) emit("turnEnd", { operationId });
			if (event.name === HARNESS_EVENTS.configChanged || event.name === HARNESS_EVENTS.commandsChanged || event.name === HARNESS_EVENTS.reloaded) refreshDescription();
			if (event.name === HARNESS_EVENTS.revert) refreshTranscript();
		}
		for (const signIn of after.signIns) if (!before.signIns.includes(signIn)) emit("signIn", signIn);
	};
	const read = async (from) => {
		try {
			const entries = source.events({
				...from ? { from } : {},
				signal: reader.signal,
				onConnection: (connection) => commit({
					...get(),
					connection
				})
			});
			for await (const entry of entries) {
				if (disposed) return;
				const before = get();
				const after = applyEvent(before, entry);
				commit(after);
				fire(entry, before, after);
				if (changesSnapshot(entry)) refreshSnapshot();
			}
		} catch (error) {
			fail(error);
		}
		if (!disposed) commit({
			...get(),
			connection: "closed"
		});
	};
	const ready = (async () => {
		const [transcript, snapshot, description] = await Promise.all([
			source.transcript().catch((error) => {
				fail(error);
				return [];
			}),
			Promise.resolve(source.snapshot()).catch((error) => {
				fail(error);
			}),
			Promise.resolve(source.describe()).catch((error) => {
				fail(error);
			})
		]);
		if (disposed) return;
		commit({
			...get(),
			messages: [...messagesFromTranscript(transcript), ...get().messages]
		});
		if (snapshot) takeSnapshot(snapshot, true);
		if (description) commit(applyDescription(get(), description));
		read(snapshot?.cursor);
	})();
	const on = (key, handler) => {
		const name = typeof key === "string" ? key : `plugin:${key.name}`;
		const listener = (value) => handler(value);
		let set = handlers.get(name);
		if (!set) {
			set = /* @__PURE__ */ new Set();
			handlers.set(name, set);
		}
		set.add(listener);
		return () => set.delete(listener);
	};
	return {
		store,
		ready,
		send: async (text, attachments = []) => {
			alive();
			const line = text.trim();
			if (line === "" && attachments.length === 0) return;
			if (line.startsWith("/")) {
				const [name = "", ...rest] = line.slice(1).split(" ");
				const input = rest.join(" ").trim();
				settle(source.command(name, input === "" ? void 0 : input));
				return;
			}
			commit(withUserMessage(get(), line, attachments));
			const message = userInput(line, attachments);
			if (get().status === "running") {
				await source.steer(message).then(refused, fail);
				return;
			}
			settle(source.prompt(message));
		},
		command: async (name, input) => {
			alive();
			settle(source.command(name, input));
		},
		setConfig: async (key, value) => {
			alive();
			await source.setConfig(key, value).then(refused, fail);
		},
		cancel: async () => {
			alive();
			await source.cancel().then(void 0, fail);
		},
		approve: (id) => decide(id, true),
		reject: (id) => decide(id, false),
		approveAll: () => decideAll(true),
		rejectAll: () => decideAll(false),
		notice: (text) => {
			alive();
			commit(withNotice(get(), "ui", text));
		},
		on,
		dispose: () => {
			if (disposed) return;
			commit({
				...get(),
				connection: "closed"
			});
			disposed = true;
			reader.abort();
			for (const timer of urlRefreshes.values()) clearTimeout(timer);
			urlRefreshes.clear();
		}
	};
}
//#endregion
export { MEDIA_URL_PREFIX, createSessionView, kindOf, mediaIdOf, mediaOfMessage, mediaPart };

//# sourceMappingURL=index.js.map