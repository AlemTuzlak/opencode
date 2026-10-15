import { isMediaRecord, mediaIdOf, mediaOfMessage } from "../media-ref.js";
import { HARNESS_EVENTS } from "../types.js";
import { EventType, readUnopenedInterruptBinding } from "@tanstack/ai";
//#region src/view/reduce.ts
var COMMAND_RESULT = "harness.command.result";
/** Events that change the parts of the current turn. */
var TURN_EVENTS = /* @__PURE__ */ new Set([
	EventType.TEXT_MESSAGE_CONTENT,
	EventType.REASONING_MESSAGE_CONTENT,
	EventType.TOOL_CALL_START,
	EventType.TOOL_CALL_ARGS,
	EventType.TOOL_CALL_END,
	EventType.TOOL_CALL_RESULT,
	EventType.SUBAGENT_STARTED,
	EventType.SUBAGENT_FINISHED,
	EventType.SUBAGENT_ERROR
]);
/** The state of a view before it reads anything from its session. */
function emptyState() {
	return {
		threadId: "",
		status: "idle",
		connection: "open",
		messages: [],
		approvals: [],
		clientTools: [],
		questions: [],
		signIns: [],
		agents: [],
		queuedTurns: 0,
		waitingInputs: [],
		commands: [],
		config: [],
		tools: [],
		plugins: {}
	};
}
function parseJson(text) {
	if (text === "") return void 0;
	try {
		return JSON.parse(text);
	} catch {
		return text;
	}
}
function textOf(content) {
	if (typeof content === "string") return content;
	if (!content) return "";
	return content.map((part) => part.type === "text" ? part.content : "").join("");
}
function subagentOf(event) {
	return "subagentRunId" in event && typeof event.subagentRunId === "string" ? event.subagentRunId : void 0;
}
/** Custom event values and snapshots are plain JSON objects. */
function isRecord(value) {
	return typeof value === "object" && value !== null;
}
function recordOf(value) {
	return isRecord(value) ? value : {};
}
var notInView = () => Promise.reject(/* @__PURE__ */ new Error("Only a session view can load media bytes."));
function mediaView(media) {
	return {
		type: "media",
		id: media.id,
		kind: media.kind,
		mimeType: media.mimeType,
		name: media.name,
		size: media.size,
		load: notInView
	};
}
/**
* Media parts for the `harness-media:` parts of a saved user message. The
* name and size come from the records in `metadata.harness.media`.
*/
function userMedia(message) {
	const { content } = message;
	if (typeof content === "string" || !content) return [];
	const records = mediaOfMessage(message);
	return content.flatMap((part) => {
		const id = mediaIdOf(part);
		if (id === void 0 || part.type === "text") return [];
		return [mediaView(records.find((media) => media.id === id) ?? {
			id,
			kind: part.type,
			mimeType: part.source.mimeType ?? "",
			name: id,
			size: 0
		})];
	});
}
/** The notice for a `session.reset()`: the model starts again from here. */
function resetNotice(note) {
	return typeof note === "string" ? `The context was reset. The model starts from this note: ${note}` : "The context was reset. The model sees only what comes after this.";
}
/** The notice text for a refused input. */
var notAccepted = (reason) => `Not accepted: ${String(reason ?? "unknown reason")}`;
/** Add a notice line at the end of the messages. */
function withNotice(state, kind, text) {
	const message = {
		id: `notice-${state.messages.length}`,
		role: "notice",
		kind,
		text
	};
	return {
		...state,
		messages: [...state.messages, message]
	};
}
/** Add a user message, with the files the user sent, at the end of the messages. */
function withUserMessage(state, text, media = []) {
	const message = {
		id: `user-${state.messages.length}`,
		role: "user",
		text,
		...media.length > 0 ? { media: media.map(mediaView) } : {}
	};
	return {
		...state,
		messages: [...state.messages, message]
	};
}
function appendText(parts, type, delta) {
	if (delta === "") return parts;
	const last = parts.at(-1);
	if (last?.type === type) return [...parts.slice(0, -1), {
		type,
		text: last.text + delta
	}];
	return [...parts, {
		type,
		text: delta
	}];
}
function mapToolCall(parts, id, change) {
	const index = parts.findIndex((part) => part.type === "tool-call" && part.id === id);
	const part = parts[index];
	if (part?.type !== "tool-call") return parts;
	const next = [...parts];
	next[index] = change(part);
	return next;
}
function findAgent(parts, id) {
	for (const part of parts) {
		if (part.type !== "agent") continue;
		if (part.id === id) return part;
		const inner = findAgent(part.parts, id);
		if (inner) return inner;
	}
}
function mapAgent(parts, id, change) {
	let found = false;
	let changed = false;
	const next = parts.map((part) => {
		if (part.type !== "agent" || found) return part;
		if (part.id === id) {
			found = true;
			const updated = change(part);
			if (updated !== part) changed = true;
			return updated;
		}
		const inner = mapAgent(part.parts, id, change);
		if (inner === part.parts) return part;
		found = true;
		changed = true;
		return {
			...part,
			parts: inner
		};
	});
	return changed ? next : parts;
}
/** Text, reasoning, and tool call events of one agent (the lead or a child). */
function applyOwn(parts, event) {
	if (event.type === EventType.TEXT_MESSAGE_CONTENT) return appendText(parts, "text", event.delta);
	if (event.type === EventType.REASONING_MESSAGE_CONTENT) return appendText(parts, "reasoning", event.delta);
	if (event.type === EventType.TOOL_CALL_START) {
		if (parts.some((part) => part.type === "tool-call" && part.id === event.toolCallId)) return parts;
		return [...parts, {
			type: "tool-call",
			id: event.toolCallId,
			name: event.toolCallName,
			argsText: "",
			args: void 0,
			status: "running"
		}];
	}
	if (event.type === EventType.TOOL_CALL_ARGS) return mapToolCall(parts, event.toolCallId, (call) => ({
		...call,
		argsText: call.argsText + event.delta
	}));
	if (event.type === EventType.TOOL_CALL_END) return mapToolCall(parts, event.toolCallId, (call) => ({
		...call,
		args: parseJson(call.argsText)
	}));
	if (event.type === EventType.TOOL_CALL_RESULT) return mapToolCall(parts, event.toolCallId, (call) => ({
		...call,
		status: "done",
		result: typeof event.content === "string" ? parseJson(event.content) : event.content
	}));
	return parts;
}
/** Route an event to the lead's parts or to the child agent it belongs to. */
function applyToParts(parts, event) {
	const child = subagentOf(event);
	if (child === void 0) return applyOwn(parts, event);
	if (event.type === EventType.SUBAGENT_STARTED) {
		if (findAgent(parts, child)) return parts;
		const agent = {
			type: "agent",
			id: child,
			name: event.name ?? "agent",
			status: "running",
			parts: []
		};
		const parent = event.parentSubagentRunId;
		if (parent !== void 0 && findAgent(parts, parent)) return mapAgent(parts, parent, (owner) => ({
			...owner,
			parts: [...owner.parts, agent]
		}));
		return [...parts, agent];
	}
	return mapAgent(parts, child, (agent) => {
		if (event.type === EventType.SUBAGENT_FINISHED) return {
			...agent,
			status: "done"
		};
		if (event.type === EventType.SUBAGENT_ERROR) return {
			...agent,
			status: "failed",
			error: event.message
		};
		const inner = applyOwn(agent.parts, event);
		return inner === agent.parts ? agent : {
			...agent,
			parts: inner
		};
	});
}
/** Change the assistant message of one turn. It is created on its first part. */
function updateTurn(state, operationId, change) {
	const id = `turn-${operationId}`;
	const index = state.messages.findLastIndex((message) => message.id === id);
	const current = state.messages[index];
	const parts = current?.role === "assistant" ? current.parts : [];
	const next = change(parts);
	if (next === parts) return state;
	const message = {
		id,
		role: "assistant",
		parts: next
	};
	if (index < 0) return {
		...state,
		messages: [...state.messages, message]
	};
	const messages = [...state.messages];
	messages[index] = message;
	return {
		...state,
		messages
	};
}
function addMedia(parts, part) {
	return parts.some((item) => item.type === "media" && item.id === part.id) ? parts : [...parts, part];
}
/** Media goes in the agent part of the child that made it, else in the lead parts. */
function withMedia(state, operationId, media, child) {
	const part = mediaView(media);
	return updateTurn(state, operationId, (parts) => {
		if (child === void 0 || !findAgent(parts, child)) return addMedia(parts, part);
		return mapAgent(parts, child, (agent) => {
			const inner = addMedia(agent.parts, part);
			return inner === agent.parts ? agent : {
				...agent,
				parts: inner
			};
		});
	});
}
/** A lead tool result can come in a later turn (after an approval). */
function applyToolResult(state, event) {
	for (let index = state.messages.length - 1; index >= 0; index -= 1) {
		const message = state.messages[index];
		if (message?.role !== "assistant") continue;
		const parts = applyOwn(message.parts, event);
		if (parts === message.parts) continue;
		const messages = [...state.messages];
		messages[index] = {
			...message,
			parts
		};
		return {
			...state,
			messages
		};
	}
	return state;
}
function failRunning(state, operationId) {
	return updateTurn(state, operationId, (parts) => parts.some((part) => part.type === "tool-call" && part.status === "running") ? parts.map((part) => part.type === "tool-call" && part.status === "running" ? {
		...part,
		status: "failed"
	} : part) : parts);
}
function withSignIn(state, signIn) {
	return {
		...state,
		signIns: [...state.signIns.filter((item) => item.connector !== signIn.connector), signIn]
	};
}
function withConfigValue(state, key, value) {
	if (!state.config.some((entry) => entry.key === key)) return state;
	return {
		...state,
		config: state.config.map((entry) => entry.key === key ? {
			...entry,
			value
		} : entry)
	};
}
/** Fold one session event into the state. Returns `state` when nothing changes. */
function applyEvent(state, entry) {
	const { event, operationId } = entry;
	if (event.type === EventType.TOOL_CALL_RESULT && subagentOf(event) === void 0) return applyToolResult(state, event);
	if (TURN_EVENTS.has(event.type)) return updateTurn(state, operationId, (parts) => applyToParts(parts, event));
	if (event.type === EventType.RUN_ERROR) {
		if (subagentOf(event) !== void 0) return state;
		return failRunning(withNotice(state, "error", `Error: ${event.message}`), operationId);
	}
	if (event.type === EventType.STATE_SNAPSHOT) {
		const snapshot = recordOf(event.snapshot);
		return "plugins" in snapshot ? {
			...state,
			plugins: recordOf(snapshot.plugins)
		} : state;
	}
	if (event.type !== EventType.CUSTOM) return state;
	const value = recordOf(event.value);
	if (event.name === HARNESS_EVENTS.media) return isMediaRecord(value) ? withMedia(state, operationId, value, value.subagentRunId) : state;
	if (event.name === HARNESS_EVENTS.operationResumed) return withNotice(state, "info", "Resumed a turn that a crash stopped.");
	if (event.name === COMMAND_RESULT) {
		const connector = typeof value.name === "string" ? /^connect:(.+)$/.exec(value.name)?.[1] : void 0;
		const signedIn = connector ? {
			...state,
			signIns: state.signIns.filter((item) => item.connector !== connector)
		} : state;
		return typeof value.result === "string" && value.result !== "" ? withNotice(signedIn, "command", value.result) : signedIn;
	}
	if (event.name === HARNESS_EVENTS.inputRejected) return withNotice(state, "rejected", notAccepted(value.reason));
	if (event.name === HARNESS_EVENTS.reset) return withNotice(state, "info", resetNotice(value.note));
	if (event.name === HARNESS_EVENTS.authRequired && typeof value.connector === "string") return withSignIn(state, {
		connector: value.connector,
		...typeof value.url === "string" ? { url: value.url } : {},
		...typeof value.userCode === "string" ? { userCode: value.userCode } : {}
	});
	if (event.name === HARNESS_EVENTS.configChanged && typeof value.key === "string") return withConfigValue(state, value.key, value.value);
	if (event.name === HARNESS_EVENTS.operationStarted && value.kind === "chat" && state.signIns.length > 0) return {
		...state,
		signIns: []
	};
	return state;
}
function findToolCall(messages, id) {
	if (id === void 0) return void 0;
	for (let index = messages.length - 1; index >= 0; index -= 1) {
		const message = messages[index];
		if (message?.role !== "assistant") continue;
		const part = message.parts.find((item) => item.type === "tool-call" && item.id === id);
		if (part?.type === "tool-call") return part;
	}
}
function markWaiting(messages, waiting) {
	if (waiting.size === 0) return messages;
	let changed = false;
	const next = messages.map((message) => {
		if (message.role !== "assistant") return message;
		let touched = false;
		const parts = message.parts.map((part) => {
			if (!(part.type === "tool-call" && part.status === "running" && waiting.has(part.id))) return part;
			touched = true;
			return {
				...part,
				status: "needs-approval"
			};
		});
		if (!touched) return message;
		changed = true;
		return {
			...message,
			parts
		};
	});
	return changed ? next : messages;
}
/** `old` when `next` holds the same items, so selectors see no change. */
function keep(old, next) {
	return old.length === next.length && old.every((item, index) => item === next[index]) ? old : next;
}
/** The turn waits for the output of a client tool, not for a yes or no. */
var isClientTool = (interrupt) => readUnopenedInterruptBinding(interrupt)?.kind === "client-tool-execution";
/**
* The sign-in a turn waits for, from `credentials.require(id, { wait: true })`.
* The connector's `connect:<id>` command answers it, not a yes or no.
*/
function signInOf(interrupt) {
	if (interrupt.reason !== "auth_required") return void 0;
	const request = recordOf(recordOf(interrupt.metadata?.["tanstack:interruptPayload"]).request);
	if (typeof request.connector !== "string") return void 0;
	return {
		connector: request.connector,
		...typeof request.url === "string" ? { url: request.url } : {}
	};
}
/**
* Take status, approvals, client tools, questions, background agents, and
* waiting inputs from a snapshot. Plugin state is taken only for the first
* snapshot. Later changes come as `STATE_SNAPSHOT` events. Returns `state`
* when nothing changes.
*/
function applySnapshot(state, snapshot, factory, options = {}) {
	const approvals = keep(state.approvals, snapshot.pendingInterrupts.filter((interrupt) => !isClientTool(interrupt) && !signInOf(interrupt)).map((interrupt) => state.approvals.find((item) => item.id === interrupt.id) ?? factory.approval(interrupt, findToolCall(state.messages, interrupt.toolCallId))));
	const clientTools = keep(state.clientTools, snapshot.pendingInterrupts.filter(isClientTool).map((interrupt) => state.clientTools.find((item) => item.id === interrupt.id) ?? factory.clientTool(interrupt, findToolCall(state.messages, interrupt.toolCallId))));
	const newSignIns = snapshot.pendingInterrupts.flatMap((interrupt) => signInOf(interrupt) ?? []).filter((signIn) => !state.signIns.some((item) => item.connector === signIn.connector));
	const signIns = newSignIns.length > 0 ? [...state.signIns, ...newSignIns] : state.signIns;
	const questions = keep(state.questions, snapshot.pendingQuestions.map((question) => state.questions.find((item) => item.id === question.questionId) ?? factory.question(question)));
	const agents = keep(state.agents, snapshot.activeOperations.filter((operation) => operation.kind === "agent").map((operation) => state.agents.find((item) => item.id === operation.id) ?? factory.agent({
		id: operation.id,
		name: operation.agent ?? "agent"
	})));
	const waitingInputs = keep(state.waitingInputs, (snapshot.waitingInputs ?? []).map((input) => state.waitingInputs.find((item) => item.inputId === input.inputId && item.delivery === input.delivery) ?? input));
	const waiting = new Set(approvals.flatMap((item) => item.toolCallId ? [item.toolCallId] : []));
	const messages = markWaiting(state.messages, waiting);
	const plugins = options.initial ? snapshot.plugins : state.plugins;
	if (snapshot.threadId === state.threadId && snapshot.status === state.status && snapshot.queuedTurns === state.queuedTurns && waitingInputs === state.waitingInputs && approvals === state.approvals && clientTools === state.clientTools && signIns === state.signIns && questions === state.questions && agents === state.agents && messages === state.messages && plugins === state.plugins) return state;
	return {
		...state,
		threadId: snapshot.threadId,
		status: snapshot.status,
		queuedTurns: snapshot.queuedTurns,
		waitingInputs,
		approvals,
		clientTools,
		signIns,
		questions,
		agents,
		messages,
		plugins
	};
}
/** Take the commands, config entries, and tools from a session description. */
function applyDescription(state, description) {
	return {
		...state,
		commands: description.commands,
		config: description.config,
		tools: description.tools
	};
}
/**
* Messages for a saved transcript. Tool results fill in their tool calls.
* The media a turn made (`metadata.harness.media`) goes at the end of its
* assistant message.
*/
function messagesFromTranscript(messages) {
	const result = [];
	messages.forEach((message, index) => {
		const id = message.id ?? `history-${index}`;
		const reset = recordOf(message.metadata?.harness).reset;
		if (message.role === "user" && isRecord(reset)) {
			result.push({
				id,
				role: "notice",
				kind: "info",
				text: resetNotice(reset.note)
			});
			return;
		}
		if (message.role === "user") {
			const media = userMedia(message);
			result.push({
				id,
				role: "user",
				text: textOf(message.content),
				...media.length > 0 ? { media } : {}
			});
			return;
		}
		if (message.role === "assistant") {
			const parts = [];
			const thoughts = message.thinking ?? [];
			for (const thought of thoughts) parts.push({
				type: "reasoning",
				text: thought.content
			});
			const text = textOf(message.content);
			if (text !== "") parts.push({
				type: "text",
				text
			});
			const calls = message.toolCalls ?? [];
			for (const call of calls) parts.push({
				type: "tool-call",
				id: call.id,
				name: call.function.name,
				argsText: call.function.arguments,
				args: parseJson(call.function.arguments),
				status: "running"
			});
			const media = mediaOfMessage(message);
			for (const record of media) parts.push(mediaView(record));
			result.push({
				id,
				role: "assistant",
				parts
			});
			return;
		}
		const call = findToolCall(result, message.toolCallId);
		if (!call) return;
		call.status = message.error ? "failed" : "done";
		call.result = parseJson(textOf(message.content));
	});
	return result;
}
//#endregion
export { applyDescription, applyEvent, applySnapshot, emptyState, keep, messagesFromTranscript, notAccepted, withNotice, withUserMessage };

//# sourceMappingURL=reduce.js.map