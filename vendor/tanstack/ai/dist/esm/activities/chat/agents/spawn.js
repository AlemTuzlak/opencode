import { EventType } from "../../../types.js";
import { addTokenUsage, isTanstackUsage, rebuildTokenUsage, toSpecTokenUsage } from "../../../utilities/ag-ui-usage.js";
import { tanstackMetadata, withTanstackMetadata } from "../../../utilities/merge-metadata.js";
import { convertSchemaToJsonSchema } from "../tools/schema-converter.js";
import { INTERRUPT_BINDING_METADATA_KEY } from "../../../interrupt-resume.js";
import { mergeStreams } from "../../../utilities/merge-streams.js";
import { validateToolInput } from "../tools/input-validation.js";
import { EMIT_STREAM_CHUNK, SUBAGENT_TOOL } from "../tools/tool-calls.js";
import { getLoadChild } from "../middleware/load-child.js";
import { envProviderKeys } from "../../../byok/env-keys.js";
import { createBoundActivities } from "./bound.js";
import { SubagentBudget } from "./limits.js";
//#region src/activities/chat/agents/spawn.ts
var SUBAGENT_STARTED = EventType.SUBAGENT_STARTED;
var SUBAGENT_FINISHED = EventType.SUBAGENT_FINISHED;
var SUBAGENT_ERROR = EventType.SUBAGENT_ERROR;
/** The name of the one tool in `subagents: { tool: 'single' }`. */
var SINGLE_SUBAGENT_TOOL = "subagent";
function createSubagentSink() {
	return {
		interrupts: [],
		usage: []
	};
}
function createSubagentId() {
	return `subagent-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}
function childRunId(parentRunId, subagentRunId) {
	return `${parentRunId}:${subagentRunId}`;
}
/**
* Bind child interrupts to the parent run. The client resumes the parent run,
* so each binding must name that run. The resumed child then validates with
* the parent's interrupted run id.
*/
function rebindInterrupts(interrupts, runId) {
	return interrupts.map((interrupt) => {
		const binding = interrupt.metadata?.[INTERRUPT_BINDING_METADATA_KEY];
		if (typeof binding !== "object" || binding === null) return interrupt;
		return {
			...interrupt,
			metadata: {
				...interrupt.metadata,
				[INTERRUPT_BINDING_METADATA_KEY]: {
					...binding,
					interruptedRunId: runId,
					generation: 0
				}
			}
		};
	});
}
function createAbortError() {
	const error = /* @__PURE__ */ new Error("Aborted");
	error.name = "AbortError";
	return error;
}
function isAbortError(error, signal) {
	if (signal?.aborted) return true;
	return error instanceof Error && (error.name === "AbortError" || error.message === "Aborted");
}
function stoppedEvent(subagentRunId) {
	return {
		type: SUBAGENT_ERROR,
		subagentRunId,
		message: "Stopped",
		timestamp: Date.now()
	};
}
function childThreadId(sandbox, parentThreadId, name) {
	return sandbox === "inherit" ? parentThreadId : `${parentThreadId}:${name}`;
}
function linkAbort(parent) {
	const controller = new AbortController();
	if (!parent) return {
		controller,
		dispose: () => {}
	};
	if (parent.aborted) {
		controller.abort();
		return {
			controller,
			dispose: () => {}
		};
	}
	const onAbort = () => controller.abort();
	parent.addEventListener("abort", onAbort, { once: true });
	return {
		controller,
		dispose: () => parent.removeEventListener("abort", onAbort)
	};
}
function orAbort(promise, signal) {
	if (!signal) return promise;
	if (signal.aborted) return Promise.reject(createAbortError());
	return new Promise((resolve, reject) => {
		const onAbort = () => reject(createAbortError());
		signal.addEventListener("abort", onAbort, { once: true });
		promise.then((value) => {
			signal.removeEventListener("abort", onAbort);
			resolve(value);
		}, (error) => {
			signal.removeEventListener("abort", onAbort);
			reject(error);
		});
	});
}
function agentByName(agents, name) {
	const agent = agents.find((entry) => entry.name === name);
	if (!agent) {
		const names = agents.map((entry) => entry.name).join(", ");
		throw new Error(`Unknown subagent: ${name}. The router can pick: ${names}.`);
	}
	return agent;
}
function openAgentStream(entry, bag, ctx, sink, parentToolCallId, binding = bag.binding) {
	const agent = agentByName(bag.agents, entry.name);
	const resume = entry.resume;
	const continued = entry.continued;
	const subagentRunId = resume?.subagentRunId ?? continued?.subagentRunId ?? createSubagentId();
	if (resume !== void 0 && ctx.interruptedRunId === void 0) throw new Error(`Subagent "${entry.name}" has interrupt answers, but the run has no parentRunId. Pass the interrupted run id as parentRunId.`);
	const base = continued?.messages ?? ctx.messages;
	const messages = entry.prompt === void 0 ? base : [...base, {
		role: "user",
		content: entry.prompt
	}];
	const storedIds = new Set(continued?.messages.map((message) => message.id));
	const resumed = resume !== void 0 ? {
		messages: [...messages, ...resume.messages.filter((message) => message.id === void 0 || !storedIds.has(message.id))],
		parentRunId: ctx.interruptedRunId,
		resume: resume.entries
	} : void 0;
	return spawnAgentStream(agent, {
		input: entry.input,
		messages: resumed?.messages ?? messages,
		...ctx.abortSignal ? { abortSignal: ctx.abortSignal } : {},
		threadId: childThreadId(bag.sandbox, ctx.threadId, entry.name),
		runId: childRunId(ctx.parentRunId, subagentRunId),
		parentRunId: resumed?.parentRunId ?? ctx.parentRunId,
		subagentRunId,
		...ctx.parentSubagentRunId !== void 0 ? { parentSubagentRunId: ctx.parentSubagentRunId } : {},
		...resumed ? { resume: resumed.resume } : {}
	}, sink, parentToolCallId, binding);
}
var ROUTER_PICK_ERROR = "subagents.router must return main, a name, a list of names, { names, order }, or { steps }.";
function assertOrder(order) {
	if (order !== void 0 && order !== "parallel" && order !== "sequence") throw new Error("subagents.router order must be parallel or sequence.");
}
/** One step of a pick: plain names, plus the input of each name that has one. */
function normalizeNames(picks, agents) {
	if (picks.length === 0) throw new Error(ROUTER_PICK_ERROR);
	const names = picks.map((pick) => typeof pick === "string" ? pick : pick.name);
	const hasMain = names.includes("main");
	if (hasMain && names.length > 1) throw new Error("Do not mix main into a subagent list.");
	if (hasMain) return { names: ["main"] };
	for (const name of names) agentByName(agents, name);
	let inputs;
	for (const pick of picks) {
		if (typeof pick === "string" || pick.input === void 0) continue;
		inputs = {
			...inputs,
			[pick.name]: pick.input
		};
	}
	return inputs === void 0 ? { names } : {
		names,
		inputs
	};
}
function isPickList(pick) {
	return Array.isArray(pick);
}
function normalizeRouterPick(pick, agents) {
	if (pick === "main" || typeof pick === "string") return { steps: [normalizeNames([pick], agents)] };
	if (isPickList(pick)) return { steps: [normalizeNames(pick, agents)] };
	if ("name" in pick) return { steps: [normalizeNames([pick], agents)] };
	if ("steps" in pick) {
		if (pick.steps.length === 0) throw new Error(ROUTER_PICK_ERROR);
		const steps = pick.steps.map((step) => {
			assertOrder(step.order);
			const names = normalizeNames(step.names, agents);
			return step.order === void 0 ? names : {
				...names,
				order: step.order
			};
		});
		const flat = steps.flatMap((step) => step.names);
		if (flat.includes("main") && flat.length > 1) throw new Error("Do not mix main into a subagent list.");
		return { steps };
	}
	assertOrder(pick.order);
	const names = normalizeNames(pick.names, agents);
	return { steps: [pick.order === void 0 ? names : {
		...names,
		order: pick.order
	}] };
}
/**
* Tag a child chunk with its subagent. A chunk that a nested child already
* tagged keeps its own id, and a nested child's start names this child as
* its parent.
*/
function attributeChunk(chunk, subagentRunId) {
	if (chunk.type === SUBAGENT_STARTED) return chunk.parentSubagentRunId !== void 0 ? chunk : {
		...chunk,
		parentSubagentRunId: subagentRunId
	};
	if (chunk.type === SUBAGENT_FINISHED || chunk.type === SUBAGENT_ERROR) return chunk;
	if ("subagentRunId" in chunk && typeof chunk.subagentRunId === "string") return chunk;
	return {
		...chunk,
		subagentRunId
	};
}
function runUsage(chunk) {
	if (chunk?.type !== EventType.RUN_FINISHED) return [];
	if (Array.isArray(chunk.usage)) return chunk.usage;
	return isTanstackUsage(chunk.usage) ? toSpecTokenUsage(chunk.usage).usage : [];
}
/** The full usage of a run: token counts plus cost and the other fields. */
function fullUsage(chunk) {
	if (chunk?.type !== EventType.RUN_FINISHED) return void 0;
	return rebuildTokenUsage(chunk.usage, tanstackMetadata(chunk)?.usage);
}
/** Add a finished child run's usage to the sink. */
function collectUsage(sink, finished) {
	sink.usage.push(...runUsage(finished));
	const full = fullUsage(finished);
	if (full) sink.total = sink.total ? addTokenUsage(sink.total, full) : full;
}
/**
* Put the children's usage on a parent terminal. `usage[]` keeps one entry per
* model call. `metadata.tanstack.usage` holds the summed cost and the other
* TanStack fields, so `fromSpecTokenUsage` reads the full total. Empties the
* sink, so the next parent terminal does not count it again.
*
* `RUN_ERROR` is accepted too: a turn that failed still spent whatever its
* children spent. Such a chunk carries no usage of its own, so `runUsage` and
* `fullUsage` return empty for it and the children's total stands alone.
*/
function withChildUsage(chunk, sink) {
	if (sink.usage.length === 0 && !sink.total) return chunk;
	const own = fullUsage(chunk);
	const total = own && sink.total ? addTokenUsage(own, sink.total) : own ?? sink.total;
	const usage = [...runUsage(chunk), ...sink.usage.splice(0)];
	sink.total = void 0;
	const leftover = total ? toSpecTokenUsage(total).leftover : void 0;
	const next = {
		...chunk,
		usage
	};
	if (!leftover) return next;
	return withTanstackMetadata(next, { usage: leftover });
}
function isAsyncIterable(value) {
	return typeof value === "object" && value !== null && Symbol.asyncIterator in value;
}
/**
* The text of a `chat({ stream: false })` result, else the value. A `run`
* that resolves to a chat result gives its text, like a string.
*/
function chatResultText(value) {
	return typeof value === "object" && value !== null && "text" in value && typeof value.text === "string" && "chunks" in value && Array.isArray(value.chunks) ? value.text : value;
}
/**
* Chunks for an agent whose `run` resolved to a plain value instead of a
* stream. A string also streams as the child's text, so the parent model, a
* `sequence` router, and the UI all read it like chat output. `messageId` is
* new for each run and call, so the text of a continued child does not merge
* into its stored text.
*/
function* valueResultChunks(value, id, messageId) {
	if (typeof value === "string" && value !== "") {
		const timestamp = Date.now();
		yield attributeChunk({
			type: EventType.TEXT_MESSAGE_START,
			messageId,
			role: "assistant",
			timestamp
		}, id);
		yield attributeChunk({
			type: EventType.TEXT_MESSAGE_CONTENT,
			messageId,
			delta: value,
			timestamp
		}, id);
		yield attributeChunk({
			type: EventType.TEXT_MESSAGE_END,
			messageId,
			timestamp
		}, id);
	}
	yield {
		type: SUBAGENT_FINISHED,
		subagentRunId: id,
		...value !== void 0 ? { result: value } : {},
		timestamp: Date.now()
	};
}
/**
* Build the context `run` receives: the spawn input plus `forward`, the
* provider keys, and the bound activity functions.
*/
function runContext(agentName, input, abortController, binding) {
	return {
		...input,
		forward: {
			threadId: input.threadId,
			runId: input.runId,
			parentRunId: input.parentRunId,
			subagentRunId: input.subagentRunId,
			...input.resume ? { resume: input.resume } : {},
			abortController,
			...binding?.promptCache ? { promptCache: binding.promptCache } : {}
		},
		keys: binding?.keys ?? envProviderKeys,
		step: binding?.step ?? runEachTime,
		agents: binding?.agents ?? noAgents,
		...createBoundActivities(agentName, input, abortController, binding)
	};
}
/** The steps of an agent run that no host can run again: `fn` runs each time. */
var runEachTime = { do: async (_name, fn) => fn() };
/** `ctx.agents` of a run that no host binds: a start throws. */
var noAgents = { start: () => {
	throw new Error("ctx.agents.start needs a host that runs agents in the background, such as a harness session.");
} };
async function* spawnAgentStream(agent, input, sink, parentToolCallId, binding) {
	const link = linkAbort(input.abortSignal);
	const ctx = runContext(agent.name, input, link.controller, binding);
	const id = ctx.subagentRunId;
	yield {
		type: SUBAGENT_STARTED,
		subagentRunId: id,
		name: agent.name,
		description: agent.description,
		...parentToolCallId !== void 0 ? { parentToolCallId } : {},
		timestamp: Date.now()
	};
	let iterator;
	let finished;
	try {
		if (ctx.abortSignal?.aborted) {
			yield stoppedEvent(id);
			return;
		}
		const produced = await orAbort(Promise.resolve(agent.run(ctx)), ctx.abortSignal);
		if (!isAsyncIterable(produced)) {
			if (ctx.abortSignal?.aborted) {
				yield stoppedEvent(id);
				return;
			}
			const messageId = parentToolCallId === void 0 ? `${ctx.runId}-text` : `${ctx.runId}-${parentToolCallId}-text`;
			yield* valueResultChunks(chatResultText(produced), id, messageId);
			return;
		}
		iterator = produced[Symbol.asyncIterator]();
		while (true) {
			if (ctx.abortSignal?.aborted) {
				yield stoppedEvent(id);
				return;
			}
			const result = await orAbort(iterator.next(), ctx.abortSignal);
			if (result.done) break;
			const chunk = result.value;
			if (chunk.type === EventType.RUN_STARTED || chunk.type === EventType.MESSAGES_SNAPSHOT) continue;
			if (chunk.type === EventType.RUN_FINISHED) {
				if (sink) collectUsage(sink, chunk);
				finished = chunk;
				continue;
			}
			if (chunk.type === EventType.RUN_ERROR) {
				yield {
					type: SUBAGENT_ERROR,
					subagentRunId: id,
					message: chunk.message || "Subagent failed",
					...chunk.code ? { code: chunk.code } : {},
					timestamp: Date.now()
				};
				return;
			}
			yield attributeChunk(chunk, id);
		}
		if (ctx.abortSignal?.aborted) {
			yield stoppedEvent(id);
			return;
		}
		const outcome = finished?.type === EventType.RUN_FINISHED ? finished.outcome : void 0;
		if (outcome?.type === "cancelled") {
			yield stoppedEvent(id);
			return;
		}
		if (outcome?.type === "interrupt") {
			const interrupts = outcome.interrupts.map((interrupt) => interrupt.subagentRunId ? interrupt : {
				...interrupt,
				subagentRunId: id
			});
			sink?.interrupts.push(...interrupts);
			yield {
				type: SUBAGENT_FINISHED,
				subagentRunId: id,
				outcome: {
					type: "suspended",
					interruptIds: interrupts.filter((interrupt) => interrupt.subagentRunId === id).map((interrupt) => interrupt.id)
				},
				timestamp: Date.now()
			};
			return;
		}
		const result = finished?.type === EventType.RUN_FINISHED ? finished.result : void 0;
		yield {
			type: SUBAGENT_FINISHED,
			subagentRunId: id,
			...result !== void 0 ? { result } : {},
			timestamp: Date.now()
		};
	} catch (error) {
		yield {
			type: SUBAGENT_ERROR,
			subagentRunId: id,
			message: isAbortError(error, ctx.abortSignal) ? "Stopped" : error instanceof Error ? error.message : String(error),
			timestamp: Date.now()
		};
	} finally {
		try {
			await iterator?.return?.();
		} catch {}
		link.dispose();
	}
}
/** True when a child in these chunks failed or stopped for outside input. */
function stopsSequence(chunks, id) {
	return chunks.some((chunk) => chunk.type === SUBAGENT_ERROR && chunk.subagentRunId === id || chunk.type === SUBAGENT_FINISHED && chunk.subagentRunId === id && chunk.outcome?.type === "suspended");
}
async function* spawnNamedAgents(entries, bag, ctx, sink) {
	if (bag.sandbox === "inherit" && entries.length > 1) throw new Error("subagents.sandbox 'inherit' cannot start two children in one turn");
	const group = linkAbort(ctx.abortSignal);
	const groupCtx = {
		...ctx,
		abortSignal: group.controller.signal
	};
	try {
		if (bag.order === "sequence") {
			let messages = ctx.messages;
			for (const entry of entries) {
				const chunks = [];
				let id;
				for await (const chunk of openAgentStream(entry, bag, {
					...groupCtx,
					messages
				}, sink)) {
					if (chunk.type === SUBAGENT_STARTED && id === void 0) id = chunk.subagentRunId;
					chunks.push(chunk);
					yield chunk;
				}
				if (id !== void 0 && stopsSequence(chunks, id)) return;
				const text = [entry.resume?.text, collectNamedText(chunks, [entry.name])].filter((part) => part !== void 0 && part !== "").join("");
				if (text) messages = [...messages, {
					role: "assistant",
					content: text
				}];
			}
			return;
		}
		const streams = entries.map((entry) => openAgentStream(entry, bag, groupCtx, sink));
		const onlyStream = streams.length === 1 ? streams[0] : void 0;
		if (onlyStream) {
			yield* onlyStream;
			return;
		}
		yield* mergeStreams(streams);
	} finally {
		group.controller.abort();
		group.dispose();
	}
}
/**
* Text of the named direct children, in `names` order. Text from nested
* children stays out: their chunks carry their own id.
*/
function collectNamedText(chunks, names) {
	const nameByRunId = /* @__PURE__ */ new Map();
	const textByName = /* @__PURE__ */ new Map();
	for (const chunk of chunks) {
		if (chunk.type === SUBAGENT_STARTED) {
			if (chunk.parentSubagentRunId === void 0) nameByRunId.set(chunk.subagentRunId, chunk.name);
			continue;
		}
		if (chunk.type !== EventType.TEXT_MESSAGE_CONTENT) continue;
		if (!("subagentRunId" in chunk) || typeof chunk.subagentRunId !== "string") continue;
		const name = nameByRunId.get(chunk.subagentRunId);
		if (!name) continue;
		textByName.set(name, `${textByName.get(name) ?? ""}${chunk.delta}`);
	}
	return names.map((name) => textByName.get(name)?.trim() ?? "").filter((text) => text.length > 0).join("\n\n");
}
/**
* The parent conversation up to the message that carries this tool call, with
* that message's tool calls removed. Its string text stays; array content is
* dropped.
*/
function messagesBeforeCall(messages, toolCallId) {
	const index = messages.findIndex((message) => message.toolCalls?.some((call) => call.id === toolCallId));
	if (index === -1) return [...messages];
	const host = messages[index];
	const kept = messages.slice(0, index);
	if (host && typeof host.content === "string" && host.content !== "") {
		const { toolCalls: _calls, ...text } = host;
		kept.push(text);
	}
	return kept;
}
/**
* Record the parent messages when the model calls a subagent tool, so the
* child reads the conversation as it is at that call. Also read the run's
* `loadChild` service, so a call can continue a stored child.
*/
function subagentCallMessages(names) {
	const byCall = /* @__PURE__ */ new Map();
	let loadChild;
	return {
		middleware: {
			name: "subagent-call-messages",
			onStart(ctx) {
				loadChild = getLoadChild(ctx, { optional: true });
			},
			onBeforeToolCall(ctx, hook) {
				if (!names.has(hook.toolName)) return void 0;
				byCall.set(hook.toolCallId, messagesBeforeCall(ctx.messages, hook.toolCallId));
			}
		},
		messagesFor: (toolCallId) => toolCallId === void 0 ? void 0 : byCall.get(toolCallId),
		childLoader: () => loadChild
	};
}
/** The JSON Schema of each agent `input`, by agent name. */
function agentInputSchemas(agents) {
	const schemas = /* @__PURE__ */ new Map();
	for (const agent of agents) {
		const schema = convertSchemaToJsonSchema(agent.inputSchema, { io: "input" });
		if (schema) schemas.set(agent.name, schema);
	}
	return schemas;
}
/**
* The description and the wire schema of the single `subagent` tool.
* Providers need one object at the top, so `input` is an `anyOf` of the agent
* schemas. `execute` checks each field against the picked agent.
*/
function singleToolShape(agents) {
	const inputs = agentInputSchemas(agents);
	const takesPrompt = agents.some((agent) => !inputs.has(agent.name));
	const lines = agents.map((agent) => {
		const schema = inputs.get(agent.name);
		const how = schema ? `Pass \`input\`: ${JSON.stringify(schema)}` : "Pass `prompt`: the task as text.";
		return `- ${agent.name}: ${agent.description} ${how}`;
	});
	const inputSchema = {
		type: "object",
		properties: {
			agent: {
				type: "string",
				enum: agents.map((agent) => agent.name)
			},
			...inputs.size > 0 && { input: { anyOf: [...inputs.values()] } },
			...takesPrompt && { prompt: { type: "string" } },
			sessionId: { type: "string" },
			background: { type: "boolean" }
		},
		required: ["agent"]
	};
	return {
		description: [
			"Run a subagent. Set `agent` to one of these names:",
			...lines,
			"Set `sessionId` to the subagentRunId of an earlier result to continue that child.",
			"Set `background` to true to start the child and get its subagentRunId at once."
		].join("\n"),
		inputSchema
	};
}
/** The checked `input` of a single-tool call. A wrong field throws a tool error. */
async function callInput(agent, call) {
	if (agent.inputSchema === void 0) {
		if (call.input !== void 0) throw new Error(`Agent "${agent.name}" takes prompt, not input.`);
		return;
	}
	if (call.prompt !== void 0) throw new Error(`Agent "${agent.name}" takes input, not prompt.`);
	if (call.input === void 0) throw new Error(`Agent "${agent.name}" needs input.`);
	return validateToolInput(agent.inputSchema, call.input, agent.name);
}
function createSyntheticSubagentTools(bag, parent) {
	const budget = bag.binding?.budget ?? SubagentBudget.root(bag.limits);
	let active = 0;
	/** Run one child for a tool call. The model gets its text or result. */
	async function runChild(child, context) {
		const toolContext = context;
		const toolCallId = toolContext?.toolCallId;
		const suspended = parent.turn?.children.find((turnChild) => turnChild.status === "suspended" && turnChild.parentToolCallId !== void 0 && turnChild.parentToolCallId === toolCallId);
		const entry = {
			...child,
			...suspended && { resume: {
				subagentRunId: suspended.subagentRunId,
				messages: suspended.messages,
				entries: suspended.resume,
				text: suspended.text
			} }
		};
		const refusal = suspended ? void 0 : budget.reserve(active);
		if (refusal !== void 0) return {
			subagentRunId: "",
			text: "",
			error: refusal
		};
		active += 1;
		const sink = createSubagentSink();
		const link = linkAbort(parent.abortSignal);
		const timeout = budget.childTimeout();
		const timer = timeout === void 0 ? void 0 : setTimeout(() => link.controller.abort(/* @__PURE__ */ new Error(`subagent timed out after ${timeout} ms`)), timeout);
		const childBinding = {
			...bag.binding,
			budget: budget.child(timeout === void 0 ? void 0 : Date.now() + timeout)
		};
		let subagentRunId = suspended?.subagentRunId ?? "";
		let text = suspended?.text ?? "";
		let error;
		let result;
		try {
			for await (const chunk of openAgentStream(entry, bag, {
				messages: parent.messagesFor?.(toolCallId) ?? parent.messages,
				abortSignal: link.controller.signal,
				threadId: parent.threadId,
				parentRunId: parent.runId,
				...parent.interruptedRunId !== void 0 ? { interruptedRunId: parent.interruptedRunId } : {},
				...parent.parentSubagentRunId !== void 0 ? { parentSubagentRunId: parent.parentSubagentRunId } : {}
			}, sink, toolCallId, childBinding)) {
				if (chunk.type === SUBAGENT_STARTED && subagentRunId === "") subagentRunId = chunk.subagentRunId;
				if (chunk.type === EventType.TEXT_MESSAGE_CONTENT && "subagentRunId" in chunk && chunk.subagentRunId === subagentRunId) text += chunk.delta;
				if (chunk.type === SUBAGENT_ERROR && chunk.subagentRunId === subagentRunId) error = chunk.message;
				if (chunk.type === SUBAGENT_FINISHED && chunk.subagentRunId === subagentRunId && chunk.result !== void 0) result = chunk.result;
				toolContext?.[EMIT_STREAM_CHUNK]?.(chunk);
			}
		} finally {
			active -= 1;
			if (timer !== void 0) clearTimeout(timer);
			link.dispose();
		}
		parent.sink.usage.push(...sink.usage);
		if (sink.total) parent.sink.total = parent.sink.total ? addTokenUsage(parent.sink.total, sink.total) : sink.total;
		return {
			subagentRunId,
			text,
			...result !== void 0 ? { result } : {},
			...error !== void 0 ? { error } : {},
			...sink.interrupts.length > 0 ? { interrupts: sink.interrupts } : {},
			...parent.childLoader?.() ? { keepRunId: true } : {}
		};
	}
	/**
	* The stored child that a `sessionId` names, for `agent`. Throws a tool
	* error, also when the child ran under another agent.
	*/
	async function storedChild(sessionId, agent) {
		const load = parent.childLoader?.();
		if (!load) throw new Error("sessionId needs a persistence store.");
		const stored = await load(sessionId);
		if (!stored) throw new Error(`Unknown sessionId "${sessionId}".`);
		if (stored.agent !== void 0 && stored.agent !== agent) throw new Error(`Session "${sessionId}" belongs to agent "${stored.agent}", not "${agent}".`);
		return {
			subagentRunId: sessionId,
			messages: stored.messages
		};
	}
	if (bag.tool === "single") return [{
		name: SINGLE_SUBAGENT_TOOL,
		...singleToolShape(bag.agents),
		[SUBAGENT_TOOL]: true,
		execute: async (call, context) => {
			const agent = bag.agents.find((entry) => entry.name === call.agent);
			if (!agent) throw new Error(`Unknown agent "${call.agent}".`);
			const input = await callInput(agent, call);
			const fields = {
				...input !== void 0 && { input },
				...call.prompt !== void 0 && { prompt: call.prompt }
			};
			const child = {
				name: agent.name,
				...fields
			};
			if (call.background === true) {
				if (call.sessionId !== void 0) throw new Error("background cannot continue a sessionId.");
				const start = bag.binding?.start;
				if (!start) throw new Error("background needs a harness host.");
				const { subagentRunId } = await start({
					agent: agent.name,
					...fields,
					...context?.toolCallId !== void 0 && { parentToolCallId: context.toolCallId }
				}, { wake: true });
				return {
					subagentRunId,
					text: "",
					result: { status: "started" },
					keepRunId: true
				};
			}
			const { sessionId } = call;
			const work = sessionId === void 0 ? runChild(child, context) : storedChild(sessionId, agent.name).then((continued) => runChild({
				...child,
				continued
			}, context));
			const detach = context?.detach;
			if (!detach) return work;
			const moved = detach(work).then((text) => ({
				subagentRunId: "",
				text
			}));
			return Promise.race([work, moved]);
		}
	}];
	return bag.agents.map((agent) => ({
		name: agent.name,
		description: agent.description,
		...agent.inputSchema !== void 0 && { inputSchema: agent.inputSchema },
		[SUBAGENT_TOOL]: true,
		execute: (input, context) => runChild({
			name: agent.name,
			...agent.inputSchema !== void 0 && { input }
		}, context)
	}));
}
//#endregion
export { SINGLE_SUBAGENT_TOOL, SUBAGENT_ERROR, SUBAGENT_FINISHED, SUBAGENT_STARTED, collectNamedText, collectUsage, createSubagentId, createSubagentSink, createSyntheticSubagentTools, normalizeRouterPick, rebindInterrupts, spawnAgentStream, spawnNamedAgents, subagentCallMessages, withChildUsage };

//# sourceMappingURL=spawn.js.map