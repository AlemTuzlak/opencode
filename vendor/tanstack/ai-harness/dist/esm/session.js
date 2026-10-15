import { bindDurable, createToolStep } from "./durable-tool.js";
import { addUsage, callUsage, emptyUsage, isSessionUsage } from "./usage.js";
import { isRecord } from "./utils.js";
import { commonPrefix, engineMessageStore, revertOf, sessionMessageStore, stepKey } from "./log.js";
import { BackgroundJobs, CapabilityValues, RevertFiles, RevertStanding, SessionMetadata, SessionSignal, mountPlugins } from "./plugins.js";
import { checkConfigValue } from "./config.js";
import { credentialsFor, providerKeysFor } from "./auth.js";
import { LEASE, checkpointMiddleware, findCrashedRuns, holdRunLease, repairSteps, repairTranscript } from "./resume.js";
import { AgentRegistry } from "./agents.js";
import { SessionFeed } from "./feed.js";
import { mediaIdOf, mediaOfMessage, mediaPart } from "./media-ref.js";
import { createMediaStore, mediaCapture, mediaMiddleware } from "./media.js";
import { OperationImpl } from "./operation.js";
import { HARNESS_EVENTS, InputRejectedError } from "./types.js";
import { EventType, INTERRUPT_PAYLOAD_METADATA_KEY, LogRecordsCapability, RUN_CANCEL_REASON, StreamProcessor, SubagentBudget, chat, compactForModel, convertSchemaToJsonSchema, createSubagentId, maxIterations, modelMessagesToUIMessages, provideDetachableRun, provideLogRecords, readInterruptBinding, runAgentStream, validateWithStandardSchema } from "@tanstack/ai";
import { LogConflictError, withPersistence } from "@tanstack/ai-persistence";
import { REDACTED_THINKING_ID_PREFIX, toRunErrorPayload } from "@tanstack/ai/adapter-internals";
//#region src/session.ts
/** Where `stores.metadata` keeps the interrupted turn of each thread. */
var INTERRUPTED = "harness:interrupted";
/** Where `stores.metadata` keeps the usage totals of a host without a log. */
var USAGE = "harness:usage";
/**
* The key of a resumable agent run in the session log: its steps, and the
* tool results of its chat. Not a tool call id, so a turn never reads them.
*/
var agentKey = (inputId) => `agent:${inputId}`;
/** The chain fields that the `agent` input of a first run keeps. */
var chainFields = (first) => ({
	runInputId: first.inputId,
	target: first.input.agent,
	input: first.input.input,
	options: {
		wake: first.input.detached === true,
		...first.input.resume ? { resume: true } : {},
		...first.input.attach ? { attach: first.input.attach } : {}
	},
	...first.principal ? { principal: first.principal } : {},
	...first.input.parentRunId ? { parentRunId: first.input.parentRunId } : {}
});
/** A message to an agent run as a user message. Its id is its input id. */
var asUserMessage = (sent) => ({
	id: sent.inputId,
	role: "user",
	content: sent.message
});
/** True for the `agent` input of a first run. */
var isAgentInput = (input) => input?.input.op === "agent";
/**
* The `agent` input of the chain that `input` runs: the input itself, or
* the first run of a follow-up message. `undefined` for other inputs, and
* for a steer that joined a run.
*/
var chainInputOf = (inputs, input) => {
	if (isAgentInput(input)) return input;
	if (input.input.op !== "agentMessage" || input.into !== void 0) return;
	const first = inputs.get(input.input.run ?? "");
	return isAgentInput(first) ? first : void 0;
};
/** The `agentRuns()` status of a live run. */
var runStatus = (status) => {
	switch (status) {
		case "accepted": return "queued";
		case "interrupted": return "running";
		case "running":
		case "completed":
		case "failed":
		case "cancelled": return status;
	}
};
/** The `agentRuns()` status of a run in the log, from how it ended. */
var loggedStatus = (input) => {
	switch (input.settlement?.outcome) {
		case void 0: return "running";
		case "aborted": return "cancelled";
		case "failed": return "failed";
		case "completed":
		case "interrupted": return "completed";
	}
};
/** True for an interrupted turn as `stores.metadata` gives it back. */
function isInterruptedTurn(value) {
	if (!isRecord(value) || typeof value.runId !== "string") return false;
	if (!Array.isArray(value.interrupts)) return false;
	if (!value.interrupts.every((item) => isRecord(item))) return false;
	const { routed, principal } = value;
	return (principal === void 0 || isRecord(principal) && typeof principal.id === "string") && (routed === void 0 || isRecord(routed) && Array.isArray(routed.messages) && typeof routed.root === "boolean");
}
/** The connector a sign-in interrupt (`require` with `wait`) waits for. */
function signInConnector(interrupt) {
	if (interrupt?.reason !== "auth_required") return void 0;
	const payload = interrupt.metadata?.[INTERRUPT_PAYLOAD_METADATA_KEY];
	const request = isRecord(payload) ? payload.request : void 0;
	return isRecord(request) && typeof request.connector === "string" ? request.connector : void 0;
}
/** Limits for a harness's children when `subagents.limits` is not set. */
var DEFAULT_SUBAGENT_LIMITS = {
	maxDepth: 2,
	maxConcurrent: 3,
	maxCalls: 12
};
function createInputId() {
	return `in-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 9)}`;
}
function createMessageId() {
	return `msg-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 9)}`;
}
function customEvent(name, value) {
	return {
		type: EventType.CUSTOM,
		name,
		value,
		timestamp: Date.now()
	};
}
var errorText = (error) => error instanceof Error ? error.message : String(error);
/** A `promptCache` option as an object. A string is the retention alone. */
var cacheObject = (option) => typeof option === "string" ? {
	retention: option,
	key: void 0
} : option;
/** The credential scope of `principal` in a thread, with only the set fields. */
var scopeOf = (threadId, principal) => ({
	threadId,
	...principal ? { userId: principal.id } : {},
	...principal?.tenantId ? { tenantId: principal.tenantId } : {}
});
/** What the log and the inbox keep of a principal: its id and tenant. */
/** The `metadata.tanstack` of a logged event, if it has one. */
var tanstackOf = (event) => isRecord(event.metadata) && isRecord(event.metadata.tanstack) ? event.metadata.tanstack : void 0;
/** The tool call an interrupt waits on: an approval or a client tool. */
var toolCallOf = (interrupt) => {
	const binding = readInterruptBinding(interrupt);
	return binding && "toolCallId" in binding ? binding.toolCallId : void 0;
};
var storedPrincipal = (principal) => principal ? { principal: {
	id: principal.id,
	...principal.tenantId ? { tenantId: principal.tenantId } : {}
} } : {};
/** One sender: the same id and tenant, or no principal on both. */
var isSameSender = (a, b) => a?.id === b?.id && a?.tenantId === b?.tenantId;
/**
* What makes two inputs with one id the same input: the payload and the
* sender. The same id from another sender is a conflict, not a retry.
*/
var inputKey = (input, principal) => JSON.stringify([
	input,
	principal?.id ?? null,
	principal?.tenantId ?? null
]);
var isPlainObject = (value) => isRecord(value) && [Object.prototype, null].includes(Object.getPrototypeOf(value));
/**
* The chat() context of a turn. Two plain objects merge, and the harness
* value wins, so a client cannot replace a server value. Else the harness
* value when it is set, else the input's.
*/
function turnContext(harness, input) {
	if (isPlainObject(harness) && isPlainObject(input)) return {
		...input,
		...harness
	};
	return harness !== void 0 ? harness : input;
}
/** Where `stores.metadata` keeps the stored settings of each thread. */
var SETTINGS = "harness:settings";
var SETTING_KEYS = /* @__PURE__ */ new Set([
	"model",
	"reasoning",
	"instructions",
	"tools",
	"plugins",
	"cwd"
]);
var isNames = (value) => Array.isArray(value) && value.every((item) => typeof item === "string");
/** One checked setting value. Throws with a short reason for a bad one. */
function checkSetting(key, value, names) {
	if (key === "model") {
		if (typeof value === "string" && names.models.has(value)) return value;
		throw new Error(`Unknown model ${JSON.stringify(value)}. Add it to defineHarness({ models }).`);
	}
	if (key === "instructions" || key === "cwd") {
		if (typeof value === "string") return value;
		throw new Error(`The setting "${key}" must be a string.`);
	}
	if (key === "reasoning") {
		if (typeof value === "string" || isRecord(value) && typeof value.level === "string") return value;
		throw new Error("The setting \"reasoning\" must be a level or { level }.");
	}
	if (key === "tools") {
		if (isNames(value)) return [...value];
		if (isRecord(value) && isNames(value.remove)) return { remove: [...value.remove] };
		throw new Error("The setting \"tools\" must be a list of tool names or { remove: [names] }.");
	}
	if (!isRecord(value) || !isNames(value.remove)) throw new Error("The setting \"plugins\" must be { remove: [plugin names] }.");
	const unknown = value.remove.find((name) => !names.plugins.has(name));
	if (unknown !== void 0) throw new Error(`Unknown plugin ${JSON.stringify(unknown)}.`);
	return { remove: [...value.remove] };
}
/**
* `settings` with `change` applied: `null` clears a field, a missing field
* stays. Throws with a short reason for an unknown field or a bad value.
*/
function changeSettings(settings, change, names) {
	if (!isRecord(change)) throw new Error("The settings must be an object.");
	const next = { ...settings };
	for (const [key, value] of Object.entries(change)) {
		if (!SETTING_KEYS.has(key)) throw new Error(`Unknown setting ${JSON.stringify(key)}.`);
		if (value === null) delete next[key];
		else if (value !== void 0) next[key] = checkSetting(key, value, names);
	}
	return next;
}
/**
* `mounted` without what the `removed` plugins give a turn: their tools,
* prompts, middleware, adapter picks, discoverers, and preparers.
*/
function withoutPlugins(mounted, removed) {
	const { owners } = mounted;
	const toolOwners = new Map(owners.tools.map((entry) => [entry.name, entry.owner]));
	const isKept = (owner) => owner === void 0 || !removed.has(owner);
	return {
		...mounted,
		tools: mounted.tools.filter((tool) => isKept(toolOwners.get(tool.name))),
		prompts: mounted.prompts.filter((_prompt, index) => isKept(owners.prompts[index]?.owner)),
		middleware: mounted.middleware.filter((_item, index) => isKept(owners.middleware[index])),
		adapters: mounted.adapters.filter((_pick, index) => isKept(owners.adapters[index])),
		discoverers: mounted.discoverers.filter((item) => isKept(item.owner)),
		preparers: mounted.preparers.filter((item) => isKept(item.owner))
	};
}
/**
* The tools that the `tools` setting keeps: the listed ones, or all but the
* removed ones. The tools named in `keep` (the turn's own) always stay.
*/
function settingTools(tools, setting, keep) {
	if (setting === void 0) return tools;
	const isList = Array.isArray(setting);
	const names = new Set(isList ? setting : setting.remove);
	return tools.filter((tool) => keep.has(tool.name) || names.has(tool.name) === isList);
}
/**
* The transcript message of a `reset()`: a user message with
* `metadata.harness.reset`. Its content is the note, which the model sees
* first. The id comes from the input, so the marker goes in once.
*/
function resetMarker(inputId, note) {
	return {
		id: `reset-${inputId}`,
		role: "user",
		content: note ?? "",
		metadata: { harness: { reset: note !== void 0 ? { note } : {} } }
	};
}
var isResetMarker = (message) => isRecord(message.metadata?.harness) && isRecord(message.metadata.harness.reset);
/**
* What the model sees of `messages`: only the messages after the last reset
* marker. A marker with a note stays, as a plain user message. Returns
* `messages` itself when it has no marker.
*/
function resetContext(messages) {
	const at = messages.findLastIndex(isResetMarker);
	const marker = messages[at];
	if (!marker) return messages;
	const after = messages.slice(at + 1);
	if (marker.content === "") return after;
	const { metadata: _reset, ...note } = marker;
	return [note, ...after];
}
/**
* Gives the model only the context after the last reset. It changes only
* what the adapter gets (`providerMessages`), so every save keeps the
* messages before the reset.
*/
var resetCut = {
	name: "harness:reset",
	onConfig: (ctx, config) => {
		if (ctx.phase !== "init" && ctx.phase !== "beforeModel") return void 0;
		const messages = config.providerMessages ?? config.messages;
		const cut = resetContext(messages);
		return cut === messages ? void 0 : { providerMessages: cut };
	}
};
/**
* Gives the next model call the `pending` messages after its context, and
* empties `pending`. It changes only what the adapter gets
* (`providerMessages`), so no save keeps them.
*/
function ephemeralCall(pending) {
	return {
		name: "harness:ephemeral",
		onConfig: (ctx, config) => {
			if (ctx.phase !== "beforeModel" || pending.length === 0) return void 0;
			return { providerMessages: [...config.providerMessages ?? config.messages, ...pending.splice(0)] };
		}
	};
}
/**
* Gives each model call of a turn the `ephemeral` messages of its input,
* after `start`: the last message of the context when the turn started. The
* messages that the turn adds come after them. It changes only what the
* adapter gets (`providerMessages`), so no save keeps them.
*/
function turnEphemeral(ephemeral, start) {
	const isStart = (message) => start.id !== void 0 ? message.id === start.id : JSON.stringify(message) === JSON.stringify(start);
	return {
		name: "harness:turn-ephemeral",
		onConfig: (ctx, config) => {
			if (ctx.phase !== "beforeModel") return void 0;
			const messages = config.providerMessages ?? config.messages;
			const after = config.messages.length - 1 - config.messages.findLastIndex(isStart);
			const at = Math.max(0, messages.length - after);
			return { providerMessages: [
				...messages.slice(0, at),
				...ephemeral,
				...messages.slice(at)
			] };
		}
	};
}
/** A short transcript note about how an agent ended, for the next turn. */
function referenceNote(agent, result, ended = "finished") {
	const body = typeof result === "string" ? result : JSON.stringify(compactForModel(result));
	return `[${agent} ${ended}] ${body.length > 2e3 ? `${body.slice(0, 2e3)}...` : body}`;
}
/** Why recovery fails an agent run whose host stopped. */
var AGENT_STOPPED = "The host stopped during this agent run.";
/**
* The kinds a model reads: the adapter's input list, narrowed by
* `media.accepts`. Either one alone when only one is known, and `undefined`
* (send every kind) when neither is.
*/
function acceptedKinds(modalities, accepts) {
	if (modalities === void 0 || accepts === void 0) return accepts ?? modalities;
	return accepts.filter((kind) => modalities.includes(kind));
}
/** The inputs that run as chat turns. They settle, and so do agent inputs. */
var CHAT_OPS = /* @__PURE__ */ new Set([
	"prompt",
	"steer",
	"followUp",
	"continue",
	"resolve"
]);
/** The inputs that leave work to do: the thread is busy until they end. */
var WORK_OPS = /* @__PURE__ */ new Set([
	"prompt",
	"steer",
	"followUp",
	"continue",
	"resolve",
	"reset",
	"agent",
	"agentMessage"
]);
/** The inputs that change a waiting input. */
var CONTROL_OPS = /* @__PURE__ */ new Set(["cancelInput", "setDelivery"]);
/** Why a turn stops when its input passes its time limit. */
var TIMEOUT_REASON = "harness:input-timeout";
/** What the model gets after its partial answer, on a `'continue'`. */
var CONTINUE_NOTE = "Your last answer stopped early because of an error. Continue from the exact point where it stopped. Do not repeat the text you already wrote.";
/**
* Why work stops at `close({ recoverable: true })`. A user cancel stops it
* with `RUN_CANCEL_REASON`.
*/
var SHUTDOWN_REASON = "harness:shutdown";
/**
* A shutdown abort is a detach, not an end: `withPersistence` then writes no
* aborted state to the run record. It goes before `withPersistence`, which
* reads the detach in its own `onAbort`.
*/
var detachOnShutdown = {
	name: "harness:detach-on-shutdown",
	onAbort: (ctx, info) => {
		if (info.reason === SHUTDOWN_REASON) provideDetachableRun(ctx, true);
	}
};
/** Why a turn fails when no option gives it an adapter. */
var NO_MODEL = "This turn has no model. Set `adapter` in defineHarness, return one from a plugin `adapter()`, or pass `overrides.adapter` to the turn.";
/**
* The text of the last assistant message: the answer of an operation rebuilt
* from the log, or of a routed turn.
*/
function lastAssistantText(messages) {
	const last = messages.findLast((message) => message.role === "assistant");
	return typeof last?.content === "string" ? last.content : "";
}
/**
* True when chat() runs its routed path for this bag: the router picks, and
* the engine does not run. So the middleware that gives the engine its
* history and its run lease does not run, and the turn does that work.
*/
function isRoutedBag(bag) {
	return bag !== void 0 && bag.agents.length > 0 && bag.router !== void 0;
}
/**
* Middleware that keeps the override tools of a turn. A middleware `onConfig`
* can return a tool list without them, and this adds back each one whose
* name is missing.
*/
function keepTurnTools(kept) {
	return {
		name: "harness:turn-tools",
		onConfig: (ctx, config) => {
			if (ctx.phase !== "init" && ctx.phase !== "beforeModel") return;
			const names = new Set(config.tools.map((tool) => tool.name));
			const missing = kept.filter((tool) => !names.has(tool.name));
			if (missing.length === 0) return;
			return { tools: [...config.tools, ...missing] };
		}
	};
}
/** The turn has its final answer: an assistant message with no open tool call after it was applied. */
function hasFinalAnswer(messages, appliedAt) {
	const last = messages.at(-1);
	return messages.length > appliedAt && last?.role === "assistant" && (last.toolCalls?.length ?? 0) === 0;
}
/** Throw for a record that a host may not write. */
function checkHostRecords(records) {
	for (const record of records) {
		if (record.type.startsWith("harness.")) throw new Error(`The record type ${JSON.stringify(record.type)} is reserved for the harness.`);
		if (record.thread !== void 0 && typeof record.thread !== "string") throw new Error("The thread field of a log record must be a string: the thread id of a session of the same log.");
	}
}
var notOpen = () => Promise.reject(/* @__PURE__ */ new Error("The session is not open yet."));
/** The message store of a durable session before `open()` reads its log. */
var notOpenMessages = {
	loadThread: notOpen,
	saveThread: notOpen
};
/** `feed`, and `onEvent` after each publish. This is how the host sees events. */
function tapFeed(feed, onEvent) {
	return {
		publish: (operationId, event) => {
			feed.publish(operationId, event);
			onEvent(event);
		},
		head: () => feed.head(),
		read: (options) => feed.read(options),
		close: () => feed.close()
	};
}
/**
* A live harness session: one conversation (`threadId`) with its plugins,
* operations, inbox, and event stream. Open one with `host.open()`.
*/
var HarnessSession = class {
	threadId;
	/** The log of this session. Sessions with the same log id share one log. */
	logId;
	agents;
	/** The agents this session can run, for discovery. */
	registry;
	harness;
	persistence;
	inbox;
	principal;
	/** The session log writer of a durable host. It is also the feed. */
	writer;
	feed;
	onEvent;
	/** The transcript: `stores.messages`, or a view of the log. */
	messages;
	/**
	* What `withPersistence` gets: the chat stores, with `messages`. With
	* `sessions`, each child the model starts gets an index entry.
	*/
	chatPersistence;
	/** The message store the chat engine saves through, on a durable host. */
	engine;
	/** Why the session log stopped taking writes. */
	logFailure;
	log;
	/**
	* Inputs this session stored or recovered, by id, as JSON: the duplicate
	* check. `recover()` skips them.
	*/
	admitted = /* @__PURE__ */ new Map();
	/** The receipt of each chat input this session answered, by input id. */
	receipts = /* @__PURE__ */ new Map();
	/** The turn operation of each chat input, by input id. */
	turnOperations = /* @__PURE__ */ new Map();
	/** The input of each turn operation, by operation id. */
	operationInputs = /* @__PURE__ */ new Map();
	/** The inputs that joined each turn, by operation id. */
	turnJoins = /* @__PURE__ */ new Map();
	/** How the chat inputs of this session ended, for `settled()`. */
	settlements = /* @__PURE__ */ new Map();
	agentRegistry = new AgentRegistry();
	operations = /* @__PURE__ */ new Map();
	/** The agent chains of this session, by the input id of the first run. */
	agentChains = /* @__PURE__ */ new Map();
	/** The chain of each agent run operation, by operation id. */
	chainOf = /* @__PURE__ */ new Map();
	queue = [];
	steerQueue = [];
	/**
	* Waiting steers with an abort request. An id lands here before the abort
	* append, so a join that runs during that append skips the steer.
	*/
	abortedSteers = /* @__PURE__ */ new Set();
	/** The ids of the waiting steers that a join took. A cancel of one is refused. */
	joining = /* @__PURE__ */ new Set();
	/** Notes that wait for the transcript. A durable host logged each one. */
	pendingNotes = [];
	/** Background jobs that run on this host. Recovery skips them. */
	jobs = /* @__PURE__ */ new Set();
	/** Running tool calls that support `detach`: id to the move. */
	detachable = /* @__PURE__ */ new Map();
	activeTurn;
	/** Renews this host's claim on the thread while the thread has work. */
	claimTimer;
	/** The claim write of the last `markBusy`. An input waits for it. */
	claimWrite = Promise.resolve();
	/** Called each time the thread goes idle. See `onIdle`. */
	idleListeners = /* @__PURE__ */ new Set();
	/** Work inputs that are being stored and are not queued yet. */
	inputsInFlight = 0;
	/** Who sent the input of the running turn. */
	turnPrincipal;
	/**
	* The last turn stopped for these interrupts. `routed`: a routed turn
	* stopped. The resolve continues its saved plan. `stores.metadata` keeps a
	* copy, so a resolve after a restart continues the turn too.
	*/
	interrupted;
	/** The usage totals of a host without a log. A durable host folds the log. */
	usageTotals = emptyUsage();
	/** Saves of `usageTotals` to `stores.metadata`, one after the other. */
	usageSaved = Promise.resolve();
	activeResume = false;
	plugins = [];
	sessionPlugins;
	/** The last `reload()`. The calls run one at a time. */
	reloads = Promise.resolve();
	/**
	* The reloads and reverts that run. No new turn starts while one runs: a
	* reload waits for the running turn, and a revert changes the files.
	*/
	holdTurns = 0;
	/** Called when the running turn ends. A reload waits for it. */
	turnEnds = /* @__PURE__ */ new Set();
	closing;
	/** Aborts on close, not on a reload. See {@link SessionSignal}. */
	lifetime = new AbortController();
	/** The last `recover()`. The calls run one at a time. */
	recovery = Promise.resolve();
	onClose;
	checkpoint;
	/** Gives each durable tool call its steps in the log. One per session. */
	bindTool;
	hostId;
	index;
	lease;
	listeners = /* @__PURE__ */ new Map();
	configValues = /* @__PURE__ */ new Map();
	/** The stored settings of this thread: `session.configure`. */
	threadSettings = {};
	questions = /* @__PURE__ */ new Map();
	stateDoc = {};
	/** Reads each plugin's saved state, so the first snapshot has it. */
	stateLoaders = /* @__PURE__ */ new Map();
	localState = /* @__PURE__ */ new Map();
	/** The revert that stands. See `revert`. */
	reverted;
	/** The credentials of the running turn's sender, else of the session's principal. */
	credentialAccess;
	/**
	* The connectors whose sign-in the user cancelled. Their `require` with
	* `wait` fails the tool, as without `wait`, until the next new turn.
	*/
	declinedSignIns = /* @__PURE__ */ new Set();
	/**
	* Model provider keys of the same principal as `credentialAccess`: saved
	* with `/connect <provider>`, else the env var.
	*/
	keys;
	/**
	* The credentials of one principal: the user who runs a command, or an
	* agent that outlives a turn. A save there can answer that user's sign-ins.
	*/
	credentialsOf;
	/** The provider keys of one principal, for an agent that outlives a turn. */
	keysOf;
	services;
	media;
	mediaStore;
	/** The prompt cache of every chat turn of this session. */
	promptCache;
	constructor(deps) {
		this.harness = deps.harness;
		this.threadId = deps.threadId;
		this.logId = deps.logId;
		const own = cacheObject(deps.promptCache);
		const shared = cacheObject(this.harness.promptCache);
		this.promptCache = {
			retention: own?.retention ?? shared?.retention ?? "short",
			key: own?.key ?? shared?.key ?? deps.threadId
		};
		this.persistence = deps.persistence;
		this.inbox = deps.inbox;
		this.media = deps.media;
		this.mediaStore = createMediaStore({
			persistence: deps.media,
			threadId: deps.threadId,
			options: this.harness.media
		});
		this.principal = deps.principal;
		this.onEvent = deps.onEvent;
		this.feed = tapFeed(new SessionFeed(), deps.onEvent);
		this.onClose = deps.onClose;
		this.hostId = deps.hostId;
		this.index = deps.index;
		this.lease = deps.lease;
		this.log = deps.log;
		this.messages = deps.persistence.stores.messages ?? notOpenMessages;
		const onMissing = (error) => this.feed.publish("session", customEvent(HARNESS_EVENTS.authRequired, {
			connector: error.connector,
			...error.url ? { url: error.url } : {}
		}));
		this.credentialAccess = credentialsFor(deps.credentials, () => scopeOf(deps.threadId, this.sender()), onMissing, {
			canWait: (id) => this.activeTurn !== void 0 && !this.declinedSignIns.has(id),
			onSet: () => this.resumeSignIns()
		});
		this.keys = providerKeysFor(this.credentialAccess, onMissing);
		this.credentialsOf = (principal) => credentialsFor(deps.credentials, scopeOf(deps.threadId, principal), onMissing, { onSet: () => this.resumeSignIns() });
		this.keysOf = (principal) => providerKeysFor(this.credentialsOf(principal), onMissing);
		this.services = {
			emit: (plugin, name, value) => this.emitPluginEvent(plugin, name, value),
			on: (name, handler) => {
				let set = this.listeners.get(name);
				if (!set) {
					set = /* @__PURE__ */ new Set();
					this.listeners.set(name, set);
				}
				set.add(handler);
				return () => set.delete(handler);
			},
			config: { get: (key) => this.configValue(key) },
			state: (plugin, initial) => this.pluginState(plugin, initial),
			credentials: this.credentialAccess,
			keys: this.keys,
			session: this.pluginApi(),
			agents: {
				run: ((target, input) => this.runAgent(target, input, { wake: false })),
				start: ((target, input, options) => this.runAgent(target, input, options ?? {})),
				group: (options, body) => this.agentGroup(options, body)
			},
			commandsChanged: () => this.feed.publish("session", customEvent(HARNESS_EVENTS.commandsChanged, {}))
		};
		this.registry = this.agentRegistry;
		for (const agent of this.harness.agents ?? []) this.agentRegistry.add(agent, "the harness");
		for (const agent of this.harness.subagents?.agents ?? []) this.agentRegistry.add(agent, "the harness");
		this.agents = new Proxy({}, { get: (_target, name) => {
			if (typeof name !== "string") return void 0;
			return {
				run: (input, options) => this.runAgent(name, input, {
					...options,
					wake: false
				}),
				start: (input, options) => this.runAgent(name, input, options ?? {})
			};
		} });
	}
	/**
	* The agent named `name`, for names known only at runtime (a slash
	* command, a protocol input). `undefined` when no such agent exists.
	*/
	agent(name) {
		if (!this.agentRegistry.get(name)) return void 0;
		return {
			run: (input, options) => this.runAgent(name, input, {
				...options,
				wake: false
			}),
			start: (input, options) => this.runAgent(name, input, options ?? {})
		};
	}
	/** An operation of this session by id, running or settled. */
	operation(id) {
		return this.operations.get(id);
	}
	/**
	* Add a message to the agent run `operationId`, as `AgentRun.send` does.
	* `principal` is who sent it. A follow-up runs for its sender. An unknown
	* run gets `not_running`.
	*/
	async sendToAgent(operationId, message, options) {
		const inputId = options?.inputId ?? createInputId();
		const chain = this.chainOf.get(operationId) ?? this.loggedChain(operationId);
		if (!chain) return {
			inputId,
			status: "rejected",
			reason: "not_running"
		};
		const principal = options?.principal ?? this.principal;
		const mode = options?.mode ?? "steer";
		return this.admitting(async () => {
			const admission = await this.accept(inputId, {
				op: "agentMessage",
				operationId,
				message,
				mode,
				run: chain.runInputId
			}, principal);
			if (admission !== "new") return this.duplicateReceipt(inputId, admission);
			const sent = {
				inputId,
				message,
				...principal ? { principal } : {}
			};
			return this.keep({
				inputId,
				...this.deliver(chain, sent, mode)
			});
		});
	}
	/**
	* The agent run `operationId`: a run of this session, or on a durable
	* host a run in the log that ended, so a follow-up continues it after a
	* restart. `undefined` for an unknown run, and for one that another host
	* runs.
	*/
	agentRun(operationId) {
		const chain = this.chainOf.get(operationId) ?? this.loggedChain(operationId);
		return [...chain?.runs ?? [], ...chain?.followUps ?? []].find((run) => run.operation.id === operationId)?.operation;
	}
	/**
	* The agent runs of this session, oldest first. On a durable host it also
	* lists the runs in the log, so it works after a restart.
	*/
	agentRuns() {
		const live = [...this.agentChains.values()].flatMap((chain) => [...chain.runs, ...chain.followUps].map(({ operation, principal }) => ({
			operationId: operation.id,
			agent: chain.agent,
			status: runStatus(operation.status()),
			...chain.parentRunId ? { parentRunId: chain.parentRunId } : {},
			...principal ? { principal } : {}
		})));
		const known = new Set(live.map((run) => run.operationId));
		return [...this.loggedRuns().filter((run) => !known.has(run.operationId)), ...live];
	}
	/** The agent runs in the log: each input that a run applied. */
	loggedRuns() {
		const inputs = this.writer?.state.inputs;
		if (!inputs) return [];
		return [...inputs.values()].flatMap((input) => {
			const first = chainInputOf(inputs, input);
			if (!first || input.operationId === void 0) return [];
			return [{
				operationId: input.operationId,
				agent: first.input.agent,
				status: loggedStatus(input),
				...first.input.parentRunId ? { parentRunId: first.input.parentRunId } : {},
				...input.principal ? { principal: input.principal } : {}
			}];
		});
	}
	/**
	* The chain of a run in the log, with every run it had, so a follow-up
	* continues its thread after a restart. `undefined` for an unknown run,
	* and while a run of the chain has not ended: another host runs it.
	*/
	loggedChain(operationId) {
		const inputs = this.writer?.state.inputs;
		if (!inputs) return void 0;
		const own = [...inputs.values()].find((input) => input.operationId === operationId);
		const first = own && chainInputOf(inputs, own);
		if (!first) return void 0;
		const known = this.agentChains.get(first.inputId);
		if (known) return known;
		const logged = [...inputs.values()].filter((input) => input.operationId !== void 0 && chainInputOf(inputs, input) === first);
		if (logged.some((input) => input.settlement === void 0)) return;
		const [firstRun, ...later] = logged.map((input) => {
			const operation = this.agentOperation(first.input.agent, input.operationId);
			const settlement = input.settlement;
			if (settlement?.outcome === "completed") operation.finish("completed", void 0);
			else operation.fail(settlement?.outcome === "aborted" ? "cancelled" : "failed", new Error(settlement?.error?.message ?? "The run did not complete."));
			return {
				operation,
				...input.principal ? { principal: input.principal } : {}
			};
		});
		if (!firstRun) return void 0;
		const chain = this.createChain(chainFields(first), firstRun);
		for (const entry of later) {
			chain.runs.push(entry);
			this.chainOf.set(entry.operation.id, chain);
		}
		chain.current = later.at(-1) ?? firstRun;
		return chain;
	}
	/** The stores that first-party plugins read as capabilities. */
	storeCapabilities() {
		const values = new CapabilityValues();
		const { metadata } = this.persistence.stores;
		if (metadata) values.provide(SessionMetadata, metadata);
		values.provide(RevertStanding, () => this.reverted !== void 0);
		values.provide(SessionSignal, this.lifetime.signal);
		values.provide(BackgroundJobs, {
			started: (jobId) => this.logJob(jobId, false),
			ended: (jobId) => this.logJob(jobId, true)
		});
		return values;
	}
	/** @internal Mount session plugins and replay inputs left in the inbox. */
	async open() {
		await this.openLog();
		try {
			await this.mountSessionPlugins();
			await this.loadSettings();
			this.reverted = this.writer ? this.writer.state.revert : revertOf(await this.persistence.stores.metadata?.get("harness:revert", this.threadId));
			await this.loadInterrupted();
			await this.openEntry();
			if (this.writer) {
				await this.recoverFromLog(this.writer);
				return;
			}
			await this.loadUsage();
			await this.recoverCrashedTurn();
			await this.recoverInbox();
		} catch (error) {
			this.feed.close();
			throw error;
		}
	}
	/** Read `harness.plugins()` and set up its session plugins. */
	async mountSessionPlugins() {
		this.plugins = this.harness.plugins?.() ?? [];
		this.sessionPlugins = await mountPlugins(this.plugins.filter((plugin) => (plugin.lifetime ?? "session") === "session"), {
			threadId: this.threadId,
			registry: this.agentRegistry,
			harnessTools: this.harness.tools ?? [],
			harnessProvides: (this.harness.middleware ?? []).flatMap((middleware) => middleware.provides ?? []),
			services: this.services,
			inherited: this.storeCapabilities()
		});
		await this.loadConfig();
		await this.loadPluginState();
	}
	/**
	* Tear the plugins down and set them up again, with the list that
	* `harness.plugins()` gives now. It waits for the running turn, and no new
	* turn starts until it ends. The transcript, the log, the thread settings,
	* and the inbox stay. Clients get a `harness.reloaded` event.
	*
	* When the new setup throws, the session keeps working with no plugins,
	* and the promise rejects with the error. Call `reload()` again after a
	* fix.
	*
	* @example
	* ```ts
	* await session.reload()
	* ```
	*/
	reload() {
		const run = this.reloads.then(() => this.runReload());
		this.reloads = run.catch(() => {});
		return run;
	}
	async runReload() {
		if (this.closing) return;
		this.holdTurns++;
		try {
			while (this.activeTurn) await new Promise((resolve) => this.turnEnds.add(resolve));
			const old = this.sessionPlugins;
			this.sessionPlugins = void 0;
			this.plugins = [];
			this.agentRegistry.deletePluginAgents();
			await old?.dispose();
			await this.mountSessionPlugins();
			this.feed.publish("session", customEvent(HARNESS_EVENTS.reloaded, {}));
		} catch (error) {
			this.sessionPlugins = void 0;
			this.plugins = [];
			this.agentRegistry.deletePluginAgents();
			this.feed.publish("session", customEvent(HARNESS_EVENTS.reloaded, { error: errorText(error) }));
			throw error;
		} finally {
			this.holdTurns--;
			this.drain();
		}
	}
	/**
	* Recover the work in the log again, as `open()` does. `open()` skips a
	* turn while another host holds its lease. Call this after that lease
	* expires, and the turn runs here. The work that this session runs or
	* queues stays as it is. A session without `stores.log` does nothing.
	*
	* @example
	* ```ts
	* await session.recover()
	* ```
	*/
	recover() {
		const { writer } = this;
		if (!writer || this.closing) return Promise.resolve();
		const run = this.recovery.then(async () => {
			await writer.catchUp();
			if (this.logFailure) throw this.logFailure;
			if (this.closing) return;
			await this.recoverFromLog(writer);
		});
		this.recovery = run.catch(() => {});
		return run;
	}
	/**
	* Write the index entry of this thread on open: a new entry the first
	* time, else a new `updatedAt`. The owner is who opened the thread first,
	* so an open by another user does not change it.
	*/
	async openEntry() {
		const now = Date.now();
		await this.index.update(this.threadId, (entry) => ({
			threadId: this.threadId,
			createdAt: now,
			...entry,
			harness: entry?.harness ?? this.harness.name,
			updatedAt: now,
			...storedPrincipal(entry?.principal ?? this.principal)
		}));
	}
	/**
	* A durable host gives the session its view of the log, and the session
	* writes through it: the log is the event feed and the transcript. Then
	* both modes build the stores that `withPersistence` and the checkpoints
	* get.
	*/
	async openLog() {
		const { stores } = this.persistence;
		if (this.log) {
			const { store, project } = this.log;
			this.writer = await this.log.open(this.threadId, (error) => this.stopOnLogFailure(error));
			this.feed = tapFeed(this.writer, this.onEvent);
			const view = {
				writer: this.writer,
				store,
				...project ? { project } : {}
			};
			this.messages = sessionMessageStore(view);
			this.engine = engineMessageStore(view);
		}
		const engineMessages = this.engine ?? this.messages;
		this.chatPersistence = { stores: {
			messages: engineMessages,
			...stores.runs ? { runs: stores.runs } : {},
			...stores.interrupts ? { interrupts: stores.interrupts } : {},
			...stores.metadata ? { metadata: stores.metadata } : {},
			...stores.sessions ? { sessions: stores.sessions } : {}
		} };
		const { writer } = this;
		this.checkpoint = checkpointMiddleware({
			...stores.runs ? { runs: stores.runs } : {},
			messages: engineMessages,
			hostId: this.hostId,
			...this.lease ? { lease: this.lease } : {},
			...writer ? {
				onToolStart: ({ toolCallId, name, replay }) => writer.append([{
					type: "harness.tool.started",
					toolCallId,
					name,
					replay
				}]),
				onToolResult: ({ toolCallId, message }) => writer.append([{
					type: "harness.tool.result",
					toolCallId,
					message
				}])
			} : {}
		});
		if (writer) this.bindTool = (toolCallId) => this.durableBinding(writer, toolCallId);
	}
	/**
	* The `step` and `append` a durable tool call gets. A step value is in the
	* log before `step.do` resolves. Staged records land with the next
	* transcript commit, when the tool phase completes, so a batch that a
	* crash cuts leaves none of them.
	*/
	durableBinding(writer, toolCallId) {
		const step = createToolStep({
			recorded: (name) => {
				const key = stepKey(toolCallId, name);
				return writer.state.steps.has(key) ? {
					found: true,
					value: writer.state.steps.get(key)
				} : { found: false };
			},
			record: (name, value) => writer.append([{
				type: "harness.tool.step",
				toolCallId,
				name,
				value
			}])
		});
		const append = (records) => {
			checkHostRecords(records);
			writer.stage(records);
		};
		return {
			step,
			append
		};
	}
	/**
	* The log refused a write: another host wrote to this log, or the store
	* failed. The state of this session is not known any more, so it stops.
	* The next `host.open` folds the log again.
	*/
	stopOnLogFailure(error) {
		if (this.logFailure) return;
		this.logFailure = /* @__PURE__ */ new Error(error instanceof LogConflictError ? "Another host wrote to this log, so this session stopped. Open the thread again." : `The session log failed, so this session stopped: ${error instanceof Error ? error.message : String(error)}`);
		for (const operation of this.operations.values()) if (!operation.isSettled()) operation.abortController.abort(this.logFailure);
		this.close();
	}
	/**
	* Append host records to the session log, in one batch after the events
	* that wait. Only a durable host (with `stores.log`) has a log. A `type`
	* that starts with `harness.` is refused: the harness owns those.
	* A record can name another session of the same log with `thread`. The
	* append is all or nothing.
	*
	* With `project` on the host, a record can change the model context. The
	* running turn sees the change at its next model call.
	*
	* @example
	* ```ts
	* await session.append([{ type: 'app.signal', text: 'The build failed.' }])
	* ```
	*/
	async append(records) {
		if (!this.writer) throw new Error("session.append needs a durable host (a host with stores.log).");
		checkHostRecords(records);
		await this.writer.append(records);
	}
	/**
	* Start a chat turn, or queue it while one runs (see `busy`).
	*
	* `inputId` is an id you choose. A second prompt with the same id and the
	* same message returns the first input's operation and does not run again.
	* The same id with another message is rejected with `'conflict'`.
	* `await operation.receipt` resolves when the input is stored.
	*
	* `overrides` changes the adapter, reasoning, prompt cache, or tools of
	* this turn only (see `TurnOverrides`). A steer that joins the running
	* turn uses the overrides of that turn, and its own are ignored.
	*
	* `principal` is who sent the message. Default: the principal that opened
	* the session. The log keeps it, and the turn runs with its credentials
	* and provider keys. A steer that joins the running turn runs with the
	* credentials of that turn's sender.
	*
	* `context` is JSON data from the client, stored with the input. Tools
	* get it in their context (see `HarnessConfig.context`). Do not trust it.
	*
	* `ephemeral` are messages that each model call of this turn gets, after
	* the transcript and the new user message, before the messages that the
	* turn adds (answers, tool results, steers). No store keeps them: not the
	* transcript, and not the log. Like `overrides`, they are not part of the
	* input: the `inputId` duplicate check does not read them, so a retry with
	* other ephemeral messages gets the first input's operation and its own
	* are dropped. A turn that recovery runs again has none. A steer that joins
	* the running turn ignores them.
	*/
	prompt(message, options) {
		const busy = options?.busy ?? this.harness.busy ?? "queue";
		const inputId = options?.inputId ?? createInputId();
		const overrides = options?.overrides;
		const ephemeral = options?.ephemeral;
		const principal = options?.principal ?? this.principal;
		const context = options?.context;
		const input = {
			op: "prompt",
			message,
			busy,
			...context !== void 0 ? { context } : {}
		};
		const known = this.knownTurn(inputId, input, principal);
		if (known) return known;
		const runId = options?.runId;
		if (runId !== void 0 && this.operations.has(runId)) {
			const refused = this.createTurnOperation();
			this.refuse(refused, {
				inputId,
				status: "rejected",
				reason: "conflict"
			});
			return refused;
		}
		const operation = this.createTurnOperation(runId);
		this.bindTurn(inputId, operation);
		this.admitting(() => this.accept(inputId, input, principal).then(async (admission) => {
			if (admission !== "new") {
				this.answerDuplicate(operation, inputId, admission);
				return;
			}
			if (runId !== void 0 && await this.isRunTaken(runId)) {
				this.reject(inputId, "conflict");
				this.refuse(operation, {
					inputId,
					status: "rejected",
					reason: "conflict"
				});
				return;
			}
			if (this.activeTurn && busy === "reject") {
				this.reject(inputId, "busy");
				this.refuse(operation, {
					inputId,
					status: "rejected",
					reason: "busy"
				});
				return;
			}
			const isWaiting = this.activeTurn !== void 0 || this.queue.length > 0;
			const running = busy === "steer" ? this.activeTurn : void 0;
			this.answerTurn(operation, {
				inputId,
				status: isWaiting && busy !== "steer" ? "queued" : "accepted",
				operationId: running?.id ?? operation.id
			});
			const sent = {
				principal,
				context
			};
			if (running) {
				this.steerQueue.push({
					inputId,
					message,
					operation,
					overrides,
					ephemeral,
					...sent
				});
				return;
			}
			this.enqueueTurn({
				operation,
				message,
				inputId,
				overrides,
				ephemeral,
				...sent
			});
		}, (error) => {
			const failure = this.logFailure ?? error;
			this.answerTurn(operation, {
				inputId,
				status: "rejected",
				reason: failure instanceof Error ? failure.message : String(failure)
			});
			operation.fail("failed", failure);
		}));
		return operation;
	}
	/**
	* Add a message to the running turn at its next model call. `principal`
	* and `context` mean the same as in `prompt`.
	*/
	async steer(message, options) {
		return this.admitting(async () => {
			const inputId = options?.inputId ?? createInputId();
			const principal = options?.principal ?? this.principal;
			const context = options?.context;
			const admission = await this.accept(inputId, {
				op: "steer",
				message,
				...context !== void 0 ? { context } : {}
			}, principal);
			if (admission !== "new") return this.duplicateReceipt(inputId, admission);
			if (!this.activeTurn) {
				const operation = this.createTurnOperation();
				this.bindTurn(inputId, operation);
				this.enqueueTurn({
					operation,
					message,
					inputId,
					principal,
					context
				});
				return this.keep({
					inputId,
					status: "accepted",
					operationId: operation.id
				});
			}
			this.steerQueue.push({
				inputId,
				message,
				principal,
				context
			});
			return this.keep({
				inputId,
				status: "accepted",
				operationId: this.activeTurn.id
			});
		});
	}
	/**
	* Run a turn after the current work settles. `overrides` changes the
	* adapter, reasoning, prompt cache, or tools of this turn only.
	* `principal` and `context` mean the same as in `prompt`.
	*/
	async followUp(message, options) {
		return this.admitting(async () => {
			const inputId = options?.inputId ?? createInputId();
			const principal = options?.principal ?? this.principal;
			const context = options?.context;
			const admission = await this.accept(inputId, {
				op: "followUp",
				message,
				...context !== void 0 ? { context } : {}
			}, principal);
			if (admission !== "new") return this.duplicateReceipt(inputId, admission);
			const operation = this.createTurnOperation();
			this.bindTurn(inputId, operation);
			const status = this.activeTurn || this.queue.length > 0 ? "queued" : "accepted";
			this.enqueueTurn({
				operation,
				message,
				inputId,
				overrides: options?.overrides,
				principal,
				context
			});
			return this.keep({
				inputId,
				status,
				operationId: operation.id
			});
		});
	}
	/**
	* Start a chat turn from the stored transcript, with no new message. While
	* a turn runs, it queues. When it starts, the transcript must end with a
	* user or a tool message. Else the input is rejected with
	* `'nothing_to_continue'`. `inputId`, `overrides`, `principal`,
	* `context`, and `ephemeral` mean the same as in `prompt`. Each model call
	* gets the `ephemeral` messages after the transcript.
	*
	* @example
	* ```ts
	* await session.append([{ type: 'app.signal', text: 'The build failed.' }])
	* await session.continue({ inputId: 'after-signal' })
	* ```
	*/
	continue(options) {
		const inputId = options?.inputId ?? createInputId();
		const principal = options?.principal ?? this.principal;
		const context = options?.context;
		const input = {
			op: "continue",
			...context !== void 0 ? { context } : {}
		};
		const known = this.knownTurn(inputId, input, principal);
		if (known) return known;
		const operation = this.createTurnOperation();
		this.bindTurn(inputId, operation);
		this.admitting(() => this.accept(inputId, input, principal).then((admission) => {
			if (admission !== "new") {
				this.answerDuplicate(operation, inputId, admission);
				return;
			}
			const isWaiting = this.activeTurn !== void 0 || this.queue.length > 0;
			this.answerTurn(operation, {
				inputId,
				status: isWaiting ? "queued" : "accepted",
				operationId: operation.id
			});
			this.enqueueTurn({
				operation,
				inputId,
				overrides: options?.overrides,
				ephemeral: options?.ephemeral,
				principal,
				context,
				isContinue: true
			});
		}, (error) => {
			const failure = this.logFailure ?? error;
			this.answerTurn(operation, {
				inputId,
				status: "rejected",
				reason: errorText(failure)
			});
			operation.fail("failed", failure);
		}));
		return operation;
	}
	/**
	* Start a fresh model context. From the next turn, the model sees only
	* `note` (when you give one) and what comes after the reset.
	* `transcript()` keeps every message: the reset adds a user message with
	* `metadata.harness.reset`, whose content is the note.
	*
	* While a turn runs, the reset waits and applies when that turn ends,
	* before the next queued turn. A thread that waits for interrupts is
	* refused with `'pending_interrupts'`: resolve them first. `principal` and
	* `inputId` mean the same as in `prompt`.
	*/
	async reset(note, options) {
		return this.admitting(async () => {
			const inputId = options?.inputId ?? createInputId();
			const principal = options?.principal ?? this.principal;
			const text = note?.trim() ? note : void 0;
			const admission = await this.accept(inputId, {
				op: "reset",
				...text !== void 0 ? { note: text } : {}
			}, principal);
			if (admission !== "new") return this.duplicateReceipt(inputId, admission);
			const isRunning = this.activeTurn !== void 0;
			if (!isRunning && this.queue.length === 0 && this.interrupted) {
				this.reject(inputId, "pending_interrupts");
				return {
					inputId,
					status: "rejected",
					reason: "pending_interrupts"
				};
			}
			const operation = this.queueReset(inputId, text, principal, "front");
			return this.keep({
				inputId,
				status: isRunning ? "queued" : "accepted",
				operationId: operation.id
			});
		});
	}
	/**
	* Answer the interrupts of the last turn. One resume must answer every open
	* interrupt of that turn (the AG-UI rule). `principal` means the same as in
	* `prompt`: the turn that continues runs with its credentials.
	*/
	async resolve(resume, options) {
		return this.admitting(async () => {
			const inputId = options?.inputId ?? createInputId();
			const principal = options?.principal ?? this.principal;
			const admission = await this.accept(inputId, {
				op: "resolve",
				resume
			}, principal);
			if (admission !== "new") return this.duplicateReceipt(inputId, admission);
			const runId = options?.runId;
			if (runId !== void 0 && (this.operations.has(runId) || await this.isRunTaken(runId))) {
				this.reject(inputId, "conflict");
				return {
					inputId,
					status: "rejected",
					reason: "conflict"
				};
			}
			const answers = this.interrupted;
			if (!answers) {
				this.reject(inputId, "no_pending_interrupts");
				return {
					inputId,
					status: "rejected",
					reason: "no_pending_interrupts"
				};
			}
			const isEnding = this.activeTurn?.id === answers.runId;
			if (this.activeTurn && !isEnding || this.queue.some((turn) => turn.answers?.runId === answers.runId)) {
				this.reject(inputId, "busy");
				return {
					inputId,
					status: "rejected",
					reason: "busy"
				};
			}
			for (const entry of resume) {
				const connector = signInConnector(answers.interrupts.find((item) => item.id === entry.interruptId));
				if (connector && entry.status === "cancelled") this.declinedSignIns.add(connector);
			}
			const operation = this.createTurnOperation(runId);
			this.bindTurn(inputId, operation);
			const turn = {
				operation,
				resume,
				inputId,
				answers,
				principal,
				context: answers.context
			};
			if (isEnding) this.queue.unshift(turn);
			else this.enqueueTurn(turn);
			return this.keep({
				inputId,
				status: "accepted",
				operationId: operation.id
			});
		});
	}
	/**
	* Cancel one operation, or the running chat turn. On a durable host the
	* abort request is stored first, so a turn that a crash stops later settles
	* `aborted` and does not run again.
	*/
	/**
	* Move a running tool call to the background: the call returns at once,
	* and the job keeps running. When it ends, a note tells the model and
	* wakes an idle session. Without `toolCallId`, it moves every running
	* call that supports it, such as `bash` and the single `subagent` tool.
	* With no such call, the receipt is rejected with `not_running`.
	*
	* @example
	* ```ts
	* await session.background()
	* ```
	*/
	async background(toolCallId) {
		const inputId = createInputId();
		const ids = toolCallId === void 0 ? [...this.detachable.keys()] : [toolCallId];
		const moves = ids.flatMap((id) => this.detachable.get(id) ?? []);
		if (moves.length === 0) return {
			inputId,
			status: "rejected",
			reason: "not_running"
		};
		for (const id of ids) this.detachable.delete(id);
		for (const move of moves) move();
		return {
			inputId,
			status: "accepted"
		};
	}
	async cancel(operationId) {
		const inputId = createInputId();
		await this.accept(inputId, {
			op: "cancel",
			operationId
		});
		const target = operationId ? this.operations.get(operationId) : this.activeTurn;
		if (!target || target.isSettled()) return this.reject(inputId, "not_running");
		const waitingSteer = this.steerQueue.find((steer) => steer.operation === target);
		if (waitingSteer && this.joining.has(waitingSteer.inputId)) return this.reject(inputId, "not_running");
		if (waitingSteer) this.abortedSteers.add(waitingSteer.inputId);
		const targetInput = this.operationInputs.get(target.id);
		if (this.writer && targetInput) await this.writer.append([{
			type: "harness.input.abort",
			inputId: targetInput
		}]);
		if (waitingSteer) {
			await this.markApplied(inputId, target.id);
			return {
				inputId,
				status: "accepted",
				operationId: target.id
			};
		}
		const chain = this.chainOf.get(target.id);
		const waiting = chain?.followUps.findIndex((item) => item.operation === target) ?? -1;
		if (chain && waiting >= 0) {
			const [item] = chain.followUps.splice(waiting, 1);
			if (item) await this.settle({
				inputId: item.inputId,
				outcome: "aborted",
				operationId: target.id
			});
			target.fail("cancelled", /* @__PURE__ */ new Error("Cancelled before it started."));
			this.publishFinished(target);
			await this.markApplied(inputId, target.id);
			this.checkIdle();
			return {
				inputId,
				status: "accepted",
				operationId: target.id
			};
		}
		for (const child of chain?.children ?? []) if (!child.current.operation.isSettled()) await this.cancel(child.current.operation.id);
		const queued = this.queue.findIndex((turn) => turn.operation === target);
		if (queued >= 0) {
			this.queue.splice(queued, 1);
			if (targetInput) await this.settle({
				inputId: targetInput,
				outcome: "aborted",
				operationId: target.id
			});
			await this.refreshTurnInterrupts(target);
			target.fail("cancelled", /* @__PURE__ */ new Error("Cancelled before it started."));
			this.publishFinished(target);
		} else target.abortController.abort(RUN_CANCEL_REASON);
		await this.markApplied(inputId, target.id);
		return {
			inputId,
			status: "accepted",
			operationId: target.id
		};
	}
	/**
	* The inputs that wait, in the order they run: first the steers for the
	* running turn, then the queued turns. Change one with `cancelInput` or
	* `setDelivery`.
	*
	* @example
	* ```ts
	* for (const input of session.inputs()) {
	*   if (input.delivery === 'queue') await session.cancelInput(input.inputId)
	* }
	* ```
	*/
	inputs() {
		const waiting = [];
		for (const steer of this.steerQueue) {
			if (this.isAbortRequested(steer.inputId)) continue;
			waiting.push({
				inputId: steer.inputId,
				delivery: "steer",
				message: steer.message
			});
		}
		for (const turn of this.queue) {
			if (turn.inputId === void 0 || turn.message === void 0) continue;
			waiting.push({
				inputId: turn.inputId,
				delivery: "queue",
				message: turn.message
			});
		}
		return waiting;
	}
	/**
	* Cancel an input that waits, so it never runs, also after a restart. It
	* settles `aborted`. An input that started, or that joins the running
	* turn now, is refused with `not_waiting`: stop it with
	* `cancel(operationId)`.
	*
	* @example
	* ```ts
	* await session.followUp('Then write the tests.', { inputId: 'tests' })
	* await session.cancelInput('tests')
	* ```
	*/
	async cancelInput(target) {
		const inputId = createInputId();
		await this.accept(inputId, {
			op: "cancelInput",
			inputId: target
		});
		const taken = this.takeWaiting(target);
		if (!taken) return this.reject(inputId, "not_waiting");
		await this.applyControl(inputId, {
			type: "harness.input.abort",
			inputId: target
		});
		if (!this.writer) await this.inbox.markRejected(target, "cancelled");
		const { operation } = taken;
		await this.settle({
			inputId: target,
			outcome: "aborted",
			...operation ? { operationId: operation.id } : {}
		});
		if (operation) {
			operation.fail("cancelled", /* @__PURE__ */ new Error("Cancelled before it started."));
			this.publishFinished(operation);
		}
		return {
			inputId,
			status: "accepted"
		};
	}
	/**
	* Move an input that waits. `'steer'` joins it to the running turn at the
	* next model call. `'queue'` runs it as its own turn, after the queued
	* turns. An input that started, or that joins the running turn now, is
	* refused with `not_waiting`. On a durable host the log keeps the
	* delivery, and a restart honors it. Without a log, it is kept in memory.
	*
	* @example
	* ```ts
	* await session.followUp('Use tabs, not spaces.', { inputId: 'style' })
	* await session.setDelivery('style', 'steer')
	* ```
	*/
	async setDelivery(target, delivery) {
		const inputId = createInputId();
		await this.accept(inputId, {
			op: "setDelivery",
			inputId: target,
			delivery
		});
		if (this.inputs().find((input) => input.inputId === target)?.delivery !== delivery) {
			const taken = this.takeWaiting(target);
			if (!taken) return this.reject(inputId, "not_waiting");
			if (delivery === "steer") this.steerQueue.push(taken);
			else this.enqueueTurn(this.steerTurn(taken));
		}
		await this.applyControl(inputId, {
			type: "harness.input.delivery",
			inputId: target,
			delivery
		});
		this.feed.publish("session", customEvent(HARNESS_EVENTS.inputDelivery, {
			inputId: target,
			delivery
		}));
		return {
			inputId,
			status: "accepted"
		};
	}
	/**
	* How a chat input ended: `completed`, `failed`, `aborted`, or
	* `interrupted` (the turn waits for human input). It waits until the input
	* ends. On a durable host it reads the log, so it also works after a
	* restart and from another host that opens the thread. There it also
	* takes the input id of an agent run from the log.
	*
	* Rejects with `InputRejectedError` when the session refused the input,
	* and with an error for an id this session does not know.
	*
	* @example
	* ```ts
	* const turn = session.prompt('Summarize the report.', { inputId: 'req-42' })
	* const { outcome } = await session.settled('req-42')
	* ```
	*/
	async settled(inputId) {
		const known = this.knownSettlement(inputId);
		if (known) return known;
		if (!this.isChatInput(inputId)) throw new Error(`The session knows no chat input with the id ${JSON.stringify(inputId)}.`);
		const settledEvent = (entry) => entry.event.type === EventType.CUSTOM && entry.event.name === HARNESS_EVENTS.inputSettled && isRecord(entry.event.value) && entry.event.value.inputId === inputId;
		for await (const _entry of this.feed.read({
			from: this.feed.head(),
			filter: settledEvent
		})) {
			const settlement = this.knownSettlement(inputId);
			if (settlement) return settlement;
		}
		throw new Error("The session closed before the input ended.");
	}
	/** The ordered events of every operation, from `from` (exclusive). */
	events(options) {
		return this.feed.read(options ?? {});
	}
	/**
	* The token usage of this thread: every model call of its turns, their
	* subagents, and its agent runs, in total, by `provider/model`, and by
	* sender. `cost` is the sum of what the providers reported. A durable host
	* keeps the totals in the log, a host with `stores.metadata` keeps them
	* there, and other hosts keep them in memory.
	*
	* @example
	* ```ts
	* const { total, bySender } = session.usage()
	* console.log(total.totalTokens, bySender['user-1']?.cost)
	* ```
	*/
	usage() {
		return structuredClone(this.writer?.state.usage ?? this.usageTotals);
	}
	snapshot() {
		const active = [...this.operations.values()].filter((operation) => !operation.isSettled());
		return {
			threadId: this.threadId,
			status: this.activeTurn ? "running" : this.interrupted ? "requires_action" : "idle",
			activeOperations: active.map((operation) => ({
				id: operation.id,
				kind: operation.kind,
				...operation.agent ? { agent: operation.agent } : {},
				startedCursor: operation.startedCursor
			})),
			queuedTurns: this.queue.length + this.steerQueue.length,
			waitingInputs: this.inputs(),
			pendingInterrupts: this.activeResume && !this.activeTurn?.isSettled() ? [] : this.interrupted?.interrupts ?? [],
			pendingQuestions: [...this.questions.entries()].map(([questionId, question]) => ({
				questionId,
				message: question.message,
				...question.schema ? { schema: convertSchemaToJsonSchema(question.schema) } : {},
				...question.secret ? { secret: true } : {},
				...question.url ? { url: question.url } : {}
			})),
			plugins: { ...this.stateDoc },
			usage: this.usage(),
			cursor: this.feed.head()
		};
	}
	/**
	* Store a file in the media store of this thread. Send it to a turn with
	* `mediaPart(record)`. Throws a `MediaError`: 413 when the file is bigger
	* than `media.maxBytes`, 415 for a type or kind the harness does not take.
	*
	* @example
	* const record = await session.putMedia(bytes, { mimeType: 'image/png', name: 'cat.png' })
	* session.prompt([{ type: 'text', content: 'What is this?' }, mediaPart(record)])
	*/
	putMedia(body, info) {
		return this.mediaStore.put(body, info);
	}
	/** The record of a media file of this thread, or `null` when it is not found. */
	getMedia(id) {
		return this.mediaStore.get(id);
	}
	/**
	* The bytes of a media file, or of one `range` of them. Throws a
	* `MediaError` with 404 when it is not found.
	*/
	loadMedia(id, range) {
		return this.mediaStore.load(id, range);
	}
	/**
	* A URL for a media file, for `<img>`, `<audio>`, or `<video>`. A session
	* has no server, so this is a data URL for a file up to 1 MB, and `{}` for
	* a bigger file (use `loadMedia`).
	*/
	async mediaUrl(id) {
		const url = await this.mediaStore.dataUrl(id);
		return url === void 0 ? {} : { url };
	}
	/**
	* @internal Start this new thread as a fork of `source`, before its first
	* turn: `messages` with their media copied to this thread, and the stored
	* settings and plugin config of `source`. `host.fork` calls it.
	*/
	async adoptFork(source, messages) {
		const copies = /* @__PURE__ */ new Map();
		const copy = async (id) => {
			if (!copies.has(id)) {
				const record = await source.getMedia(id);
				copies.set(id, record && await this.putMedia(await source.loadMedia(id), {
					mimeType: record.mimeType,
					name: record.name
				}));
			}
			return copies.get(id) ?? void 0;
		};
		const forked = [];
		for (const message of messages) {
			const content = Array.isArray(message.content) ? await Promise.all(message.content.map(async (part) => {
				const id = mediaIdOf(part);
				const made = id === void 0 ? void 0 : await copy(id);
				return made ? mediaPart(made) : part;
			})) : message.content;
			const media = mediaOfMessage(message);
			if (media.length === 0) {
				forked.push({
					...message,
					content
				});
				continue;
			}
			const harness = {
				...message.metadata?.harness,
				media: await Promise.all(media.map(async (record) => await copy(record.id) ?? record))
			};
			forked.push({
				...message,
				content,
				metadata: {
					...message.metadata,
					harness
				}
			});
		}
		await this.messages.saveThread(this.threadId, forked);
		const { metadata } = this.persistence.stores;
		this.threadSettings = source.settings();
		if (Object.keys(this.threadSettings).length > 0) await metadata?.set(SETTINGS, this.threadId, this.threadSettings);
		for (const [key, value] of source.configValues) if (this.sessionPlugins?.config.has(key)) this.configValues.set(key, value);
		if (this.configValues.size > 0) await metadata?.set("harness:config", this.threadId, Object.fromEntries(this.configValues));
	}
	/** Every session setting, with its option and current value. */
	config() {
		const result = {};
		for (const [key, entry] of this.sessionPlugins?.config ?? []) result[key] = {
			option: entry.option,
			owner: entry.owner,
			value: this.configValue(key)
		};
		return result;
	}
	/** Change a session setting. It applies at the next turn. */
	async setConfig(key, value) {
		const inputId = createInputId();
		await this.accept(inputId, {
			op: "config",
			key,
			value
		});
		const entry = this.sessionPlugins?.config.get(key);
		if (!entry) return this.reject(inputId, "unknown_config");
		let checked;
		try {
			checked = checkConfigValue(key, entry.option, value);
		} catch (error) {
			const reason = error instanceof Error ? error.message : String(error);
			return this.reject(inputId, reason);
		}
		this.configValues.set(key, checked);
		await this.persistence.stores.metadata?.set("harness:config", this.threadId, Object.fromEntries(this.configValues));
		await this.applied(inputId, "session");
		this.feed.publish("session", customEvent(HARNESS_EVENTS.configChanged, {
			key,
			value: checked
		}));
		return {
			inputId,
			status: "accepted"
		};
	}
	/** The stored settings of this thread. See `configure`. */
	settings() {
		return structuredClone(this.threadSettings);
	}
	/**
	* Change the stored settings of this thread: the model by name (from
	* `defineHarness({ models })`), `reasoning`, `instructions`, `tools`,
	* `plugins`, and the working folder `cwd`. A field set to `null` is
	* cleared, and a missing field stays. They apply from the next turn, and
	* the turn's `overrides` win over them. `stores.metadata` keeps them.
	*
	* It is an input, so the log keeps who changed what (`principal`). An
	* unknown field, model, or plugin, or a bad value, is rejected.
	*
	* @example
	* ```ts
	* await session.configure({ model: 'strong', instructions: 'Answer in French.' })
	* ```
	*/
	async configure(settings, options) {
		const inputId = options?.inputId ?? createInputId();
		const principal = options?.principal ?? this.principal;
		const admission = await this.accept(inputId, {
			op: "configure",
			settings
		}, principal);
		if (admission !== "new") return this.duplicateReceipt(inputId, admission);
		let next;
		try {
			next = changeSettings(this.threadSettings, settings, this.settingNames());
		} catch (error) {
			const reason = error instanceof Error ? error.message : String(error);
			this.reject(inputId, reason);
			return this.keep({
				inputId,
				status: "rejected",
				reason
			});
		}
		await this.persistence.stores.metadata?.set(SETTINGS, this.threadId, next);
		const movedFrom = this.threadSettings.cwd;
		this.threadSettings = next;
		const isNew = (await this.messages.loadThread(this.threadId)).length === 0;
		if (next.cwd !== movedFrom && !isNew) await this.addNote(next.cwd === void 0 ? "The working folder is the default folder again." : `The working folder is now ${next.cwd}. Paths are relative to it.`);
		await this.applied(inputId, "session");
		this.feed.publish("session", customEvent(HARNESS_EVENTS.settingsChanged, { settings: next }));
		return this.keep({
			inputId,
			status: "accepted"
		});
	}
	/** The model and plugin names that a setting can use. */
	settingNames() {
		return {
			models: new Set(Object.keys(this.harness.models ?? {})),
			plugins: new Set(this.plugins.map((plugin) => plugin.name))
		};
	}
	/** The commands of this session, for hosts to list. */
	commands() {
		return [...this.sessionPlugins?.commands ?? []].map(([name, entry]) => ({
			name,
			description: entry.command.description,
			owner: entry.owner,
			...entry.command.input ? { input: convertSchemaToJsonSchema(entry.command.input) } : {}
		}));
	}
	/**
	* The saved messages of this thread, oldest first. While a revert stands,
	* the messages after its message are hidden.
	*/
	async transcript() {
		const messages = [...await this.messages.loadThread(this.threadId)];
		const at = this.revertedAt(messages);
		return at < 0 ? messages : messages.slice(0, at + 1);
	}
	/** The index of the revert message in `messages`, or -1. */
	revertedAt(messages) {
		const id = this.reverted?.messageId;
		return id === void 0 ? -1 : messages.findIndex((message) => message.id === id);
	}
	/**
	* Go back to the message `messageId`. The transcript hides the messages
	* after it. With the snapshots plugin, the files that their tool calls
	* changed go back too. `unrevert()` undoes it. The next turn drops the
	* hidden messages for good. The revert state is saved, so it survives a
	* restart. Refused while the session is not idle (`'busy'`), and for a
	* message that is not in the transcript (`'unknown_message'`).
	*/
	async revert(messageId) {
		const inputId = createInputId();
		if (this.snapshot().status !== "idle") return {
			inputId,
			status: "rejected",
			reason: "busy"
		};
		return this.holding(async () => {
			const messages = await this.messages.loadThread(this.threadId);
			const at = messages.findIndex((message) => message.id === messageId);
			if (at < 0) return {
				inputId,
				status: "rejected",
				reason: "unknown_message"
			};
			await this.endRevert();
			const files = await (this.sessionPlugins?.values.get(RevertFiles))?.revert(messages.slice(at + 1), (type) => this.hostRecords(type));
			await this.saveRevert({
				messageId,
				...files !== void 0 ? { files } : {}
			});
			return {
				inputId,
				status: "accepted"
			};
		});
	}
	/** End the revert that stands: its files and messages come back. */
	async unrevert() {
		const inputId = createInputId();
		if (this.snapshot().status !== "idle") return {
			inputId,
			status: "rejected",
			reason: "busy"
		};
		return this.holding(async () => {
			if (!this.reverted) return {
				inputId,
				status: "accepted"
			};
			await this.endRevert();
			await this.flushNotes();
			return {
				inputId,
				status: "accepted"
			};
		});
	}
	/** Bring back the files of the revert that stands, and end it. */
	async endRevert() {
		const reverted = this.reverted;
		if (!reverted) return;
		if (reverted.files !== void 0) await this.sessionPlugins?.values.get(RevertFiles)?.unrevert(reverted.files);
		await this.saveRevert(void 0);
	}
	/** Run `fn` while no new turn starts. A held turn starts after it. */
	async holding(fn) {
		this.holdTurns++;
		try {
			return await fn();
		} finally {
			this.holdTurns--;
			this.drain();
		}
	}
	/** Drop the messages that a standing revert hides, and end the revert. */
	async commitRevert() {
		if (!this.reverted) return;
		const messages = await this.messages.loadThread(this.threadId);
		const at = this.revertedAt(messages);
		if (at >= 0) await this.messages.saveThread(this.threadId, messages.slice(0, at + 1));
		await this.saveRevert(void 0);
	}
	/** Keep the revert state in the log, else in the metadata store. */
	async saveRevert(revert) {
		this.reverted = revert;
		if (this.writer) await this.writer.append([{
			type: "harness.revert",
			revert: revert ?? null
		}]);
		else await this.persistence.stores.metadata?.set("harness:revert", this.threadId, revert ?? null);
		this.feed.publish("session", customEvent(HARNESS_EVENTS.revert, { messageId: revert?.messageId ?? null }));
	}
	/** The host records of `type` of this thread, from the log, oldest first. */
	async hostRecords(type) {
		const found = [];
		if (!this.writer || !this.log) return found;
		let after = 0;
		for (;;) {
			const entries = await this.log.store.read(this.logId, {
				after,
				limit: 256
			});
			for (const { seq, record } of entries) {
				after = seq;
				if ((record.thread ?? this.logId) === this.threadId && record.type === type) found.push(record);
			}
			if (entries.length < 256) return found;
		}
	}
	/** The commands, settings, and tools of this session, for a UI. */
	describe() {
		return {
			commands: this.commands(),
			config: Object.entries(this.config()).map(([key, entry]) => ({
				key,
				...entry
			})),
			tools: this.inspect().tools,
			settings: this.settings(),
			models: Object.keys(this.harness.models ?? {})
		};
	}
	/**
	* Run a plugin command. Its input is checked against the command's schema.
	* `principal` is who runs it. Default: the principal that opened the
	* session. The log keeps it, and the command gets that user's credentials.
	*/
	command(name, input, options) {
		const operation = new OperationImpl("command", this.feed, (target) => this.cancel(target.id));
		this.operations.set(operation.id, operation);
		const principal = options?.principal ?? this.principal;
		this.executeCommand(operation, name, input, principal);
		return operation;
	}
	/** Answer a question from `ctx.session.ask`. */
	async answer(questionId, value) {
		const inputId = createInputId();
		const isSecret = this.questions.get(questionId)?.secret === true;
		await this.accept(inputId, {
			op: "answer",
			questionId,
			value: isSecret ? "[secret]" : value
		});
		const question = this.questions.get(questionId);
		if (!question) return this.reject(inputId, "unknown_question");
		let checked = value;
		if (question.schema !== void 0) {
			const result = await validateWithStandardSchema(question.schema, value);
			if (!result.success) {
				const reason = `Invalid answer: ${result.issues.map((issue) => issue.message).join(", ")}`;
				return this.reject(inputId, reason);
			}
			checked = result.data;
		}
		this.questions.delete(questionId);
		await this.applied(inputId, "session");
		this.feed.publish(question.operationId, customEvent(HARNESS_EVENTS.questionAnswered, { questionId }));
		question.resolve(checked);
		return {
			inputId,
			status: "accepted"
		};
	}
	/** The resolved plugin plan: order, owners, and extension contributors. */
	inspect() {
		const mounted = this.sessionPlugins;
		const extensionPoints = {};
		for (const [point, items] of mounted?.extensions ?? []) extensionPoints[point] = [...new Set(items.map((item) => item.owner))];
		return {
			plugins: mounted?.owners.plugins ?? [],
			tools: mounted?.owners.tools ?? [],
			prompts: mounted?.owners.prompts ?? [],
			commands: [...mounted?.commands ?? []].map(([name, entry]) => ({
				name,
				owner: entry.owner
			})),
			config: [...mounted?.config ?? []].map(([key, entry]) => ({
				key,
				owner: entry.owner
			})),
			extensionPoints,
			agents: this.agentRegistry.list().map((agent) => agent.name)
		};
	}
	configValue(key) {
		if (this.configValues.has(key)) return this.configValues.get(key);
		return this.sessionPlugins?.config.get(key)?.option.default;
	}
	async loadConfig() {
		const stored = await this.persistence.stores.metadata?.get("harness:config", this.threadId);
		if (typeof stored !== "object" || stored === null) return;
		for (const [key, value] of Object.entries(stored)) {
			const entry = this.sessionPlugins?.config.get(key);
			if (!entry) continue;
			try {
				this.configValues.set(key, checkConfigValue(key, entry.option, value));
			} catch {}
		}
	}
	/** Read the stored settings of this thread. */
	async loadSettings() {
		const stored = await this.persistence.stores.metadata?.get(SETTINGS, this.threadId);
		if (!isRecord(stored)) return;
		const names = this.settingNames();
		for (const [key, value] of Object.entries(stored)) try {
			this.threadSettings = changeSettings(this.threadSettings, { [key]: value }, names);
		} catch {}
	}
	/** Restore the usage totals that `stores.metadata` keeps for this thread. */
	async loadUsage() {
		const stored = await this.persistence.stores.metadata?.get(USAGE, this.threadId);
		if (isSessionUsage(stored)) this.usageTotals = stored;
	}
	/** Restore the interrupted turn that `stores.metadata` keeps for this thread. */
	async loadInterrupted() {
		const stored = await this.persistence.stores.metadata?.get(INTERRUPTED, this.threadId);
		if (isInterruptedTurn(stored)) this.interrupted = stored;
		await this.refreshInterrupted();
	}
	/** Keep the snapshot in line with the committed interrupt records. */
	async refreshInterrupted(observed, consumed = false, persist = true) {
		const previous = observed ?? this.interrupted;
		const store = this.persistence.stores.interrupts;
		let next = previous;
		if (store) {
			const owned = (await store.listPending(this.threadId)).filter((record) => {
				const payload = record.payload;
				const metadata = isRecord(payload.metadata) ? payload.metadata : void 0;
				return previous?.interrupts.some((item) => item.id === record.interruptId) || typeof payload.toolCallId === "string" || metadata?.kind === "approval" || metadata?.kind === "client_tool" || metadata !== void 0 && "tanstack:interruptBinding" in metadata || typeof payload.id !== "string" || typeof payload.reason !== "string" || typeof payload.message !== "string";
			});
			if (new Set(owned.map((record) => record.runId)).size > 1) throw new Error("Pending interrupts belong to more than one run.");
			const runId = owned.at(-1)?.runId;
			const records = owned.filter((record) => record.runId === runId);
			const interrupts = [];
			for (const record of records) {
				const payload = record.payload;
				if (payload.id !== record.interruptId || record.threadId !== this.threadId || typeof payload.reason !== "string" || typeof payload.message !== "string") throw new Error("The stored interrupt descriptor is invalid.");
				interrupts.push({
					...payload,
					id: payload.id,
					reason: payload.reason,
					message: payload.message
				});
			}
			const savedInput = [...this.writer?.state.inputs.values() ?? []].find((input) => input.operationId === runId);
			const context = previous !== void 0 && previous.runId === runId ? previous.context : savedInput && "context" in savedInput.input ? savedInput.input.context : void 0;
			next = runId && interrupts.length > 0 ? {
				runId,
				interrupts,
				...previous !== void 0 && previous.runId === runId && previous.routed ? { routed: previous.routed } : {},
				...storedPrincipal(previous !== void 0 && previous.runId === runId ? previous.principal : savedInput?.principal),
				...context !== void 0 ? { context } : {}
			} : void 0;
		} else if (consumed && observed === void 0) next = void 0;
		else if (observed === void 0 && this.writer && this.log) {
			let after = 0;
			for (;;) {
				const entries = await this.log.store.read(this.logId, {
					after,
					limit: 256
				});
				for (const { seq, record } of entries) {
					after = seq;
					if ((record.thread ?? this.logId) !== this.threadId || record.type !== "harness.event" || !isRecord(record.event)) continue;
					const event = record.event;
					if (event.type === EventType.TOOL_CALL_RESULT && typeof event.toolCallId === "string" && next !== void 0) {
						if (!await this.isRunResult(event, record.operationId)) continue;
						const remaining = next.interrupts.filter((interrupt) => toolCallOf(interrupt) !== event.toolCallId);
						if (remaining.length !== next.interrupts.length) next = remaining.length > 0 ? {
							...next,
							interrupts: remaining
						} : void 0;
						continue;
					}
					if (event.type !== EventType.RUN_FINISHED || event.subagentRunId || typeof record.operationId !== "string") continue;
					if (isRecord(event.outcome) && event.outcome.type === "interrupt" && Array.isArray(event.outcome.interrupts)) {
						const interrupts = [];
						for (const item of event.outcome.interrupts) {
							if (!isRecord(item) || typeof item.id !== "string" || typeof item.reason !== "string" || typeof item.message !== "string") throw new Error("The logged interrupt descriptor is invalid.");
							interrupts.push({
								...item,
								id: item.id,
								reason: item.reason,
								message: item.message
							});
						}
						const savedInput = [...this.writer?.state.inputs.values() ?? []].find((input) => input.operationId === record.operationId);
						const context = previous !== void 0 && previous.runId === record.operationId ? previous.context : savedInput && "context" in savedInput.input ? savedInput.input.context : void 0;
						next = {
							runId: record.operationId,
							interrupts,
							...previous !== void 0 && previous.runId === record.operationId && previous.routed ? { routed: previous.routed } : {},
							...storedPrincipal(previous !== void 0 && previous.runId === record.operationId ? previous.principal : savedInput?.principal),
							...context !== void 0 ? { context } : {}
						};
					} else if ((await this.persistence.stores.runs?.get(record.operationId))?.status === "completed") next = void 0;
				}
				if (entries.length < 256) break;
			}
		}
		this.interrupted = next;
		if (!persist) return;
		if (next) await this.persistence.stores.metadata?.set(INTERRUPTED, this.threadId, next);
		else if (previous !== void 0) try {
			await this.persistence.stores.metadata?.delete(INTERRUPTED, this.threadId);
		} catch (error) {
			if (!consumed || observed !== void 0) throw error;
			await this.persistence.stores.metadata?.set(INTERRUPTED, this.threadId, null);
		}
	}
	/**
	* True when a logged tool result means its tool ran: it is not cancelled,
	* and an error result does not come from a stopped run.
	*/
	async isRunResult(event, operationId) {
		const tanstack = tanstackOf(event);
		if (tanstack?.toolResultOutcome === "cancelled") return false;
		if (tanstack?.state !== "output-error") return true;
		if (typeof operationId !== "string") return false;
		const run = await this.persistence.stores.runs?.get(operationId);
		return run !== null && run !== void 0 && run.status !== "aborted";
	}
	/**
	* Mark the interrupts of `resume` answered in the interrupt store, the same
	* way `withPersistence` commits them at a success boundary. Records that are
	* no longer pending are left as they are.
	*/
	async consumeResume(resume) {
		const store = this.persistence.stores.interrupts;
		if (!store) return;
		for (const item of resume) {
			const record = await store.get(item.interruptId);
			if (record?.status !== "pending" || record.threadId !== this.threadId) continue;
			if (item.status === "resolved") await store.resolve(item.interruptId, item.payload);
			else await store.cancel(item.interruptId);
		}
	}
	/** Refresh even when a turn failed before its main try block. */
	async refreshTurnInterrupts(operation, observed, consumed = false) {
		await this.refreshInterrupted(observed, consumed).catch((error) => this.warn(operation, "harness:interrupts", error));
	}
	/**
	* Make `stopped` the interrupted turn. `stores.metadata` gets it first, so a
	* restart can resolve it too, and a resolve cannot delete the copy before
	* it is written. A failed write is a warning.
	*/
	async keepInterrupted(operation, stopped) {
		await this.persistence.stores.metadata?.set(INTERRUPTED, this.threadId, stopped).catch((error) => this.warn(operation, "harness:interrupts", error));
		this.interrupted = stopped;
	}
	/**
	* A saved credential can answer the sign-ins the last turn waits for. When
	* every open interrupt is a sign-in and each of their connectors has a
	* credential of the turn's sender now, the turn goes on as that sender and
	* its tools run again. The input id comes from the interrupts, so a second
	* save does not resolve them twice.
	*/
	async resumeSignIns() {
		const stopped = this.interrupted;
		const waiting = stopped?.interrupts ?? [];
		const connectors = waiting.map(signInConnector);
		if (waiting.length === 0) return;
		const principal = stopped?.principal ?? this.principal;
		const credentials = this.credentialsOf(principal);
		for (const connector of connectors) if (!connector || !await credentials.get(connector)) return;
		if (this.interrupted !== stopped) return;
		await this.resolve(waiting.map((interrupt, index) => ({
			interruptId: interrupt.id,
			status: "resolved",
			payload: { connector: connectors[index] }
		})), {
			inputId: `sign-in:${waiting.map((item) => item.id).join(",")}`,
			...principal ? { principal } : {}
		});
	}
	/** Put each plugin's saved state in the snapshot before the first read. */
	async loadPluginState() {
		for (const [plugin, load] of this.stateLoaders) if (!(plugin in this.stateDoc)) this.stateDoc[plugin] = await load();
	}
	ask(question) {
		if (this.closing) return Promise.reject(/* @__PURE__ */ new Error("Session closed."));
		const questionId = `q-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 9)}`;
		const operationId = this.activeTurn?.id ?? "session";
		return new Promise((resolve, reject) => {
			this.questions.set(questionId, {
				message: question.message,
				schema: question.schema,
				secret: question.secret === true,
				url: question.url,
				operationId,
				resolve,
				reject
			});
			this.feed.publish(operationId, customEvent(HARNESS_EVENTS.question, {
				questionId,
				message: question.message,
				...question.schema ? { schema: convertSchemaToJsonSchema(question.schema) } : {},
				...question.secret ? { secret: true } : {},
				...question.url ? { url: question.url } : {}
			}));
		});
	}
	/**
	* Who sent the input of the running turn, else the principal that opened
	* the session. Turns run one at a time, so one value is enough.
	*/
	sender() {
		return this.turnPrincipal ?? this.principal;
	}
	/**
	* The session API of plugins. With `principal` (a command), it acts for
	* that user. Without it, it follows the sender of the running turn.
	*/
	pluginApi(principal) {
		const sender = () => principal ?? this.sender();
		return {
			threadId: this.threadId,
			get principal() {
				return sender();
			},
			snapshot: () => this.snapshot(),
			prompt: (text) => this.prompt(text, {
				busy: "queue",
				principal: sender()
			}),
			note: async (text, options) => {
				await this.addNote(text);
				if (options?.wake) await this.followUp(text, { principal: sender() });
			},
			transcript: () => this.transcript(),
			replaceTranscript: (messages) => this.messages.saveThread(this.threadId, messages),
			entry: () => this.index.get(this.threadId),
			updateEntry: ({ title, metadata, usage }) => this.index.update(this.threadId, (entry) => entry && {
				...entry,
				...title !== void 0 ? { title } : {},
				...metadata !== void 0 ? { metadata } : {},
				...usage !== void 0 ? { usage } : {},
				updatedAt: Date.now()
			}),
			ask: ((question) => this.ask(question)),
			authRequired: (info) => this.feed.publish("session", customEvent(HARNESS_EVENTS.authRequired, { ...info })),
			setConfig: (key, value) => this.setConfig(key, value),
			settings: () => this.settings()
		};
	}
	emitPluginEvent(plugin, name, value) {
		this.feed.publish("session", customEvent(HARNESS_EVENTS.pluginEvent, {
			plugin,
			name,
			value
		}));
		for (const handler of this.listeners.get(name) ?? []) try {
			handler(value);
		} catch {}
	}
	pluginState(plugin, initial) {
		const metadata = this.persistence.stores.metadata;
		const namespace = `plugin:${plugin}`;
		const key = this.threadId;
		const read = async () => {
			if (metadata?.getVersioned) {
				const stored = await metadata.getVersioned(namespace, key);
				return stored ? {
					value: stored.value,
					revision: stored.revision
				} : {
					value: initial,
					revision: null
				};
			}
			if (metadata) {
				const stored = await metadata.get(namespace, key);
				return {
					value: stored === null ? initial : stored,
					revision: null
				};
			}
			return {
				value: this.localState.has(namespace) ? this.localState.get(namespace) : initial,
				revision: null
			};
		};
		this.stateLoaders.set(plugin, async () => (await read()).value);
		const publish = (value) => {
			this.stateDoc[plugin] = value;
			this.feed.publish("session", {
				type: EventType.STATE_SNAPSHOT,
				snapshot: { plugins: { ...this.stateDoc } },
				timestamp: Date.now()
			});
		};
		return {
			get: async () => (await read()).value,
			update: async (change) => {
				for (let attempt = 0; attempt < 5; attempt += 1) {
					const current = await read();
					const next = change(structuredClone(current.value));
					if (metadata?.setIf) {
						if (!(await metadata.setIf(namespace, key, next, current.revision)).ok) continue;
					} else if (metadata) await metadata.set(namespace, key, next);
					else this.localState.set(namespace, next);
					publish(next);
					return next;
				}
				throw new Error(`Plugin ${plugin}: state update conflicted 5 times.`);
			}
		};
	}
	async executeCommand(operation, name, input, principal) {
		const inputId = createInputId();
		await this.accept(inputId, {
			op: "command",
			name,
			input
		}, principal);
		const entry = this.sessionPlugins?.commands.get(name);
		if (!entry) {
			this.reject(inputId, "unknown_command");
			operation.fail("failed", /* @__PURE__ */ new Error(`Unknown command: ${name}`));
			return;
		}
		let checked = input;
		if (entry.command.input !== void 0) {
			const result = await validateWithStandardSchema(entry.command.input, input ?? {});
			if (!result.success) {
				const reason = `Input validation failed for command ${name}: ${result.issues.map((issue) => issue.message).join(", ")}`;
				this.reject(inputId, "invalid_input");
				operation.fail("failed", new Error(reason));
				return;
			}
			checked = result.data;
		}
		operation.setStatus("running");
		await this.applied(inputId, operation.id);
		this.publishStarted(operation);
		try {
			const result = await entry.command.run(checked, {
				signal: operation.abortController.signal,
				session: principal ? this.pluginApi(principal) : this.services.session,
				...principal ? { principal } : {},
				credentials: this.credentialsOf(principal)
			});
			operation.publish(customEvent("harness.command.result", {
				name,
				result: compactForModel(result)
			}));
			operation.finish("completed", result);
		} catch (error) {
			operation.publish({
				type: EventType.RUN_ERROR,
				message: error instanceof Error ? error.message : String(error),
				timestamp: Date.now()
			});
			operation.fail(operation.abortController.signal.aborted ? "cancelled" : "failed", error);
		}
		this.publishFinished(operation);
	}
	/**
	* The thread has work: claim it in `stores.workClaims` for this host, and
	* renew the claim while the work runs, so a sweep finds the thread after a
	* crash. A claim that another host holds is left alone: the log still keeps
	* one writer. A closing session claims nothing.
	*/
	markBusy() {
		const claims = this.persistence.stores.workClaims;
		if (!claims || this.claimTimer || this.closing) return;
		const ttlMs = this.lease?.ttlMs ?? LEASE.ttlMs;
		const claim = async () => {
			try {
				if (!await claims.claim({
					threadId: this.threadId,
					harness: this.harness.name,
					ownerId: this.hostId,
					until: Date.now() + ttlMs
				})) this.stopClaimTimer();
			} catch (error) {
				this.warnClaim(error);
			}
		};
		const timer = setInterval(() => void claim(), this.lease?.renewMs ?? LEASE.renewMs);
		if (typeof timer === "object" && "unref" in timer) timer.unref();
		this.claimTimer = timer;
		this.claimWrite = claim();
	}
	stopClaimTimer() {
		if (this.claimTimer) clearInterval(this.claimTimer);
		this.claimTimer = void 0;
	}
	/** Give the thread's claim back. A failed write is a warning. */
	async releaseClaim() {
		try {
			await this.persistence.stores.workClaims?.release(this.threadId, this.hostId);
		} catch (error) {
			this.warnClaim(error);
		}
	}
	/**
	* A claim write failed. Without a claim, a sweep cannot find this work
	* after a crash, so clients get a warning. The work goes on.
	*/
	warnClaim(error) {
		this.feed.publish("session", customEvent("harness.plugin.warning", {
			plugin: "harness:work-claims",
			message: error instanceof Error ? error.message : String(error)
		}));
	}
	/**
	* No input being stored, no queued or running turn, no waiting steer, and
	* no running agent.
	*/
	isIdle() {
		if ([...this.agentChains.values()].some((chain) => chain.followUps.length > 0)) return false;
		return this.inputsInFlight === 0 && this.activeTurn === void 0 && this.queue.length === 0 && this.steerQueue.length === 0 && ![...this.operations.values()].some((operation) => operation.kind === "agent" && !operation.isSettled());
	}
	/**
	* Run `work`, a public entry that stores a work input and queues its work.
	* The thread is busy until `work` ends, so it is not idle while the input
	* is stored.
	*/
	async admitting(work) {
		this.inputsInFlight += 1;
		try {
			return await work();
		} finally {
			this.inputsInFlight -= 1;
			this.checkIdle();
		}
	}
	/**
	* When the thread is idle, give its claim back and tell the idle
	* listeners. A thread that waits for a human (an approval, a sign-in) is
	* idle.
	*/
	checkIdle() {
		if (!this.isIdle()) return;
		this.stopClaimTimer();
		this.releaseClaim();
		for (const listener of [...this.idleListeners]) listener();
	}
	/**
	* @internal Call `listener` each time the thread goes idle, and once soon
	* when it is idle now. Returns a function that stops the calls. The host
	* uses it to close a session that `resumePending` opened.
	*/
	onIdle(listener) {
		this.idleListeners.add(listener);
		queueMicrotask(() => this.checkIdle());
		return () => {
			this.idleListeners.delete(listener);
		};
	}
	/**
	* Stop every running operation, wait for them, then dispose session plugins.
	* Safe to call twice.
	*
	* With `recoverable`, the running turns and agent runs stop as on a host
	* crash: the log gets none of their later writes, they do not settle, and
	* the run store gets no aborted state. They give their leases back, so the
	* next host that opens the thread runs them again at once. Use it when a
	* durable host shuts down, for example for a deploy.
	*
	* @example
	* ```ts
	* await session.close({ recoverable: true })
	* ```
	*/
	close(options) {
		this.closing ??= (async () => {
			const wasIdle = this.isIdle();
			this.stopClaimTimer();
			if (wasIdle) await this.releaseClaim();
			if (options?.recoverable) this.writer?.close();
			for (const turn of this.queue.splice(0)) {
				await this.refreshTurnInterrupts(turn.operation);
				turn.operation.fail("cancelled", /* @__PURE__ */ new Error("Session closed."));
			}
			const running = [...this.operations.values()].filter((operation) => !operation.isSettled());
			for (const operation of running) operation.abortController.abort(options?.recoverable ? SHUTDOWN_REASON : RUN_CANCEL_REASON);
			for (const question of this.questions.values()) question.reject(/* @__PURE__ */ new Error("Session closed."));
			this.questions.clear();
			await Promise.allSettled(running.map((operation) => Promise.resolve(operation)));
			if (options?.recoverable) await this.writer?.flush().catch(() => {});
			this.lifetime.abort();
			try {
				await this.sessionPlugins?.dispose();
			} finally {
				this.feed.close();
				this.onClose();
			}
		})();
		return this.closing;
	}
	createTurnOperation(id) {
		const operation = new OperationImpl("chat", this.feed, (target) => this.cancel(target.id), void 0, id);
		this.operations.set(operation.id, operation);
		return operation;
	}
	enqueueTurn(turn) {
		this.markBusy();
		this.queue.push(turn);
		this.drain();
	}
	/**
	* Where a turn that runs next goes: after a resolve that answers the turn
	* that just ended, and after the resets that wait, in their order.
	*/
	frontOfQueue() {
		const at = this.queue.findIndex((turn) => !turn.answers && !turn.reset);
		return at < 0 ? this.queue.length : at;
	}
	drain() {
		if (this.activeTurn || this.closing || this.holdTurns > 0) return;
		const next = this.queue.shift();
		if (!next) return this.checkIdle();
		this.activeTurn = next.operation;
		this.activeResume = next.resume !== void 0;
		this.turnPrincipal = next.principal;
		this.runTurn(next).finally(() => {
			this.activeResume = false;
			this.activeTurn = void 0;
			this.turnPrincipal = void 0;
			for (const end of this.turnEnds) end();
			this.turnEnds.clear();
			this.drain();
		});
	}
	/**
	* Ask each plugin for the tools it found since the last turn. A plugin
	* that fails (for example an MCP server that is down) is skipped, and
	* clients get a `harness.plugin.warning` event.
	*/
	async discoverTools(discoverers, taken, operation) {
		const found = [];
		for (const { discover, owner } of discoverers) try {
			for (const tool of await discover()) {
				if (taken.has(tool.name)) continue;
				taken.add(tool.name);
				found.push(tool);
			}
		} catch (error) {
			this.warn(operation, owner, error);
		}
		return found;
	}
	/**
	* Let each plugin change the tool list of this turn, in plugin order. A
	* plugin that fails leaves the list as it was, with a warning event.
	*/
	async prepareTools(preparers, turn, operation) {
		let prepared = turn.tools;
		for (const { prepare, owner } of preparers) try {
			prepared = [...await prepare({
				tools: prepared,
				model: turn.model
			})];
		} catch (error) {
			this.warn(operation, owner, error);
		}
		return prepared;
	}
	warn(operation, plugin, error) {
		operation.publish(customEvent("harness.plugin.warning", {
			plugin,
			message: error instanceof Error ? error.message : String(error)
		}));
	}
	/**
	* Middleware that binds the durable tools of each model call: a
	* middleware can return new tools from `onConfig`, and the engine runs the
	* tools of that list.
	*/
	durableTools() {
		const { bindTool } = this;
		if (!bindTool) return void 0;
		return {
			name: "harness:durable-tools",
			onConfig: (ctx, config) => {
				if (ctx.phase !== "init" && ctx.phase !== "beforeModel") return;
				const tools = config.tools.map((tool) => bindDurable(tool, bindTool));
				return tools.every((tool, index) => tool === config.tools[index]) ? void 0 : { tools };
			}
		};
	}
	/**
	* Middleware that gives each tool call of a turn `detach` in its context,
	* so `background()` can move the call to the background. A tool that
	* calls `detach` supports it.
	*/
	detachTools() {
		const wrapped = /* @__PURE__ */ new WeakSet();
		const wrap = (tool) => {
			const { execute } = tool;
			if (!execute || wrapped.has(tool)) return tool;
			const next = {
				...tool,
				execute: (args, context) => {
					const id = context?.toolCallId;
					if (!context || id === void 0) return execute(args, context);
					context.detach = (work) => new Promise((moved) => {
						this.detachable.set(id, () => {
							this.logJob(id, false);
							moved(`The job moved to the background. Its id is ${id}. You get a note when it ends.`);
							work.then((result) => `Background job ${id} ended.\n${typeof result === "string" ? result : JSON.stringify(result)}`, (error) => `Background job ${id} failed: ${error instanceof Error ? error.message : String(error)}`).then((text) => this.pluginApi().note(text, { wake: true })).then(() => this.logJob(id, true)).catch(() => void 0);
						});
					});
					return Promise.resolve(execute(args, context)).finally(() => this.detachable.delete(id));
				}
			};
			wrapped.add(next);
			return next;
		};
		return {
			name: "harness:detach-tools",
			onConfig: (ctx, config) => {
				if (ctx.phase !== "init" && ctx.phase !== "beforeModel") return;
				return { tools: config.tools.map(wrap) };
			}
		};
	}
	/**
	* On a durable host, each turn's chat run gets `LogRecordsCapability`. A
	* middleware, for example a durable compaction, appends host records with
	* it. They land in the log at once and fold, with the checks of
	* `session.append`. The engine's new messages go in the same append, so a
	* record that counts the tool results of the last phase lands after them.
	* Agent runs do not get it: a child writes to its own thread.
	*/
	logRecords() {
		const { engine } = this;
		if (!engine) return void 0;
		return {
			name: "harness:log-records",
			provides: [LogRecordsCapability],
			setup: (ctx) => provideLogRecords(ctx, { append: async (records) => {
				checkHostRecords(records);
				await engine.appendRecords(ctx.messages, records);
			} })
		};
	}
	/**
	* Middleware that counts the usage of each model call of `operation` for
	* `principal`. The count does not hold back the stream: chat() waits for it
	* after the run.
	*/
	usageCounter(operation, principal) {
		return {
			name: "harness:usage",
			onUsage: (ctx, usage) => {
				ctx.defer(this.countUsage(operation, {
					model: `${ctx.provider}/${ctx.model}`,
					...storedPrincipal(principal),
					usage: callUsage(usage)
				}));
			}
		};
	}
	/**
	* Add one model call to the totals, and send a `harness.usage` event. A
	* durable host writes a `harness.usage` record, and the log fold adds it.
	*/
	async countUsage(operation, call) {
		try {
			if (this.writer) await this.writer.append([{
				type: "harness.usage",
				...call
			}]);
			else {
				addUsage(this.usageTotals, call);
				const { metadata } = this.persistence.stores;
				if (metadata) {
					const totals = structuredClone(this.usageTotals);
					this.usageSaved = this.usageSaved.then(() => metadata.set(USAGE, this.threadId, totals));
					await this.usageSaved;
				}
			}
		} catch (error) {
			this.usageSaved = Promise.resolve();
			this.warn(operation, "harness:usage", error);
			return;
		}
		operation.publish(customEvent(HARNESS_EVENTS.usage, {
			model: call.model,
			...call.principal ? { sender: call.principal.id } : {},
			usage: call.usage,
			total: this.usage().total
		}));
	}
	isAbortRequested(inputId) {
		return this.writer?.state.inputs.get(inputId)?.abortRequested === true || this.abortedSteers.has(inputId);
	}
	/**
	* Take the waiting steers that join now: the prefix up to the first one
	* that has an abort request, or that `turn.canJoin` refuses. Without
	* `canJoin`, only a steer of the running turn's sender joins, so nobody's
	* message runs with another person's credentials. A steer that a join
	* took already stays in, with no new check. Returns how many.
	*/
	async claimJoins() {
		const canJoin = this.harness.turn?.canJoin;
		const turnPrincipal = this.sender();
		let count = 0;
		const checked = [...this.steerQueue];
		for (const steer of checked) {
			if (!this.joining.has(steer.inputId)) {
				if (this.isAbortRequested(steer.inputId)) break;
				const candidate = {
					inputId: steer.inputId,
					message: steer.message,
					...steer.principal ? { principal: steer.principal } : {},
					...turnPrincipal ? { turnPrincipal } : {}
				};
				if (!(canJoin ? await canJoin(candidate) : isSameSender(steer.principal, turnPrincipal))) break;
			}
			count += 1;
		}
		const steers = this.steerQueue.slice(0, count);
		const late = steers.findIndex((steer, index) => steer !== checked[index] || !this.joining.has(steer.inputId) && this.isAbortRequested(steer.inputId));
		const taken = late >= 0 ? steers.slice(0, late) : steers;
		for (const steer of taken) this.joining.add(steer.inputId);
		return taken.length;
	}
	/**
	* Middleware that runs before each model call. Queued steers join the
	* running turn in admission order, as far as `claimJoins` lets them.
	* `turn.onJoin` adds its messages after theirs. On a durable host, one
	* append commits the engine's messages, the steer messages, the join
	* records, and the `onJoin` records, so a crash never splits a join. The
	* model gets the folded log when a host record changed the context. The
	* `onJoin` ephemeral messages go to `ephemeral`, for this model call. It
	* runs before the harness middleware, so they get the steer messages too.
	*/
	steering(ephemeral) {
		return {
			name: "harness:steering",
			onConfig: async (ctx, config) => {
				if (ctx.phase !== "beforeModel") return void 0;
				const count = await this.claimJoins();
				const steers = this.steerQueue.slice(0, count);
				try {
					const running = this.activeTurn?.id === ctx.runId ? this.activeTurn : void 0;
					const onJoin = this.harness.turn?.onJoin;
					let added;
					if (steers.length > 0 && onJoin && running) {
						added = await onJoin({
							session: this,
							operationId: ctx.runId,
							inputs: steers.map((steer) => ({
								inputId: steer.inputId,
								message: steer.message,
								...steer.principal ? { principal: steer.principal } : {}
							})),
							signal: running.abortController.signal
						});
						if (running.abortController.signal.aborted) return void 0;
					}
					const records = added?.records ?? [];
					checkHostRecords(records);
					if (records.length > 0 && !this.engine) throw new Error("Records from a turn hook need a durable host (a host with stores.log).");
					const hostInput = this.operationInputs.get(ctx.runId);
					const joins = hostInput ? steers.map((steer) => ({
						type: "harness.input.joined",
						inputId: steer.inputId,
						into: hostInput
					})) : [];
					const list = [
						...config.messages,
						...steers.map((steer) => ({
							id: createMessageId(),
							role: "user",
							content: steer.message
						})),
						...(added?.messages ?? []).map((message) => message.id ? message : {
							...message,
							id: createMessageId()
						})
					];
					const synced = await this.engine?.beforeModel(list, [...joins, ...records]);
					if (!this.engine) await this.messages.saveThread(this.threadId, list);
					this.steerQueue.splice(0, count);
					for (const steer of steers) this.join(ctx.runId, steer);
					ephemeral.push(...added?.ephemeral ?? []);
					if (list.length === config.messages.length && !synced) return;
					return { messages: synced ?? list };
				} finally {
					for (const steer of steers) this.joining.delete(steer.inputId);
				}
			}
		};
	}
	/**
	* Middleware after the harness middleware, before each model call. A
	* middleware can append host records (a compaction) after `steering`
	* committed. Commit the engine's messages again, and give the model the
	* fold when a record changed it. An earlier middleware can change what this
	* model call gets (`providerMessages`). Keep that change, and add the new
	* messages after it. When the fold rewrote older messages, the fold wins.
	*/
	syncFold() {
		return {
			name: "harness:sync-fold",
			onConfig: async (ctx, config) => {
				if (ctx.phase !== "beforeModel") return void 0;
				const synced = await this.engine?.beforeModel(config.messages);
				if (!synced) return void 0;
				const provider = config.providerMessages;
				return provider !== void 0 && commonPrefix(config.messages, synced) === config.messages.length ? {
					messages: synced,
					providerMessages: [...provider, ...synced.slice(config.messages.length)]
				} : { messages: synced };
			}
		};
	}
	/**
	* Middleware of one agent run. Before each model call of the run's own
	* chat, the steers that wait join as user messages, in order. The chain's
	* thread keeps them before a durable host records the join, so a crash
	* does not lose one, and each message id is its input id, so a run again
	* does not add a steer twice. Nested children share the binding: their
	* thread is not the chain's, so they skip it.
	*/
	agentSteering(chain, runInput, operation) {
		return {
			name: "harness:agent-steering",
			onConfig: async (ctx, config) => {
				if (ctx.phase !== "beforeModel" || ctx.threadId !== chain.thread) return;
				const steers = [...chain.steers];
				if (steers.length === 0) return void 0;
				const known = new Set(config.messages.map((item) => item.id));
				const messages = [...config.messages, ...steers.filter((steer) => !known.has(steer.inputId)).map(asUserMessage)];
				await this.chatPersistence?.stores.messages.saveThread(chain.thread, messages);
				await this.writer?.append(steers.map((steer) => ({
					type: "harness.input.joined",
					inputId: steer.inputId,
					into: runInput
				})));
				chain.steers.splice(0, steers.length);
				for (const steer of steers) this.join(operation.id, steer);
				return { messages };
			}
		};
	}
	/**
	* `steer` joined the running turn `operationId`: it settles with that
	* turn, and a prompt that joined gets the turn's result.
	*/
	join(operationId, steer) {
		const joined = this.turnJoins.get(operationId) ?? [];
		joined.push(steer.inputId);
		this.turnJoins.set(operationId, joined);
		const running = this.activeTurn;
		if (steer.operation && running) {
			const follower = steer.operation;
			this.operations.delete(follower.id);
			running.then((result) => follower.finish("completed", result), (error) => follower.fail("failed", error));
		}
		if (!this.writer) this.inbox.markApplied(steer.inputId, operationId);
		this.feed.publish(operationId, customEvent(HARNESS_EVENTS.inputApplied, {
			inputId: steer.inputId,
			operationId
		}));
	}
	/** The inputs that joined the turn of `hostInput` (or operation). */
	joinedInputs(operationId, hostInput) {
		if (this.writer && hostInput !== void 0) return [...this.writer.state.inputs.values()].filter((input) => input.status === "joined" && input.into === hostInput).map((input) => input.inputId);
		return this.turnJoins.get(operationId) ?? [];
	}
	/**
	* A tree budget for a child started from code. The child counts as the
	* first call, and its own children count against the same limits.
	*/
	codeBudget() {
		const root = SubagentBudget.root(this.limits());
		root.reserve(0);
		return root.child();
	}
	/**
	* What every agent run of `operation` gets: the middleware of session
	* plugins, then of run plugins, then the session's media middleware. It
	* keeps the media the agents make, publishes a `harness.media` event for
	* each file, and pushes its record to `captured`. The agents read the
	* session's provider keys as `ctx.keys`. Their model calls count in the
	* usage of `principal`. With `agents` (the subagents of a turn), the
	* `subagent` tool can start one of them in the background.
	*/
	binding(operation, captured, principal, runPlugins, agents) {
		const options = this.harness.media;
		const start = agents && (async (call, startOptions) => {
			const agent = agents.find((entry) => entry.name === call.agent);
			if (!agent) throw new Error(`Unknown agent "${call.agent}".`);
			const subagentRunId = createSubagentId();
			this.runAgent(agent, call.input, startOptions, void 0, {
				subagentRunId,
				...call.prompt !== void 0 && { prompt: call.prompt },
				...call.parentToolCallId !== void 0 && { parentToolCallId: call.parentToolCallId }
			});
			return { subagentRunId };
		});
		return {
			generationMiddleware: [
				...this.sessionPlugins?.generationMiddleware ?? [],
				...runPlugins?.generationMiddleware ?? [],
				...mediaCapture({
					persistence: this.media,
					threadId: this.threadId,
					options,
					publish: (record) => {
						captured.push(record);
						operation.publish(customEvent(HARNESS_EVENTS.media, { ...record }));
					},
					onError: (error) => this.warn(operation, "harness:media", `The media was not kept. ${String(error)}`)
				})
			],
			chatMiddleware: [
				...this.sessionPlugins?.agentMiddleware ?? [],
				...runPlugins?.agentMiddleware ?? [],
				resetCut,
				this.usageCounter(operation, principal),
				mediaMiddleware({
					store: this.mediaStore,
					accepted: options?.accepts,
					transcribe: options?.transcribe
				})
			],
			keys: this.keys,
			promptCache: this.promptCache.retention,
			...start && { start }
		};
	}
	/**
	* The user message of a turn. It keeps the records of its media files in
	* `metadata.harness.media`, so a UI can show their names and sizes later.
	* An id this thread does not know is skipped.
	*/
	async userMessage(content) {
		const ids = typeof content === "string" ? [] : content.map(mediaIdOf).filter((id) => id !== void 0);
		const media = (await Promise.all(ids.map((id) => this.getMedia(id)))).filter((record) => record !== null);
		return {
			id: createMessageId(),
			role: "user",
			content,
			...media.length > 0 ? { metadata: { harness: { media } } } : {}
		};
	}
	/** Add the media a turn made to the last assistant message of the thread. */
	async saveTurnMedia(media) {
		const store = this.messages;
		const history = await store.loadThread(this.threadId);
		const index = history.findLastIndex((message) => message.role === "assistant");
		const last = history[index];
		if (!last) return;
		const harness = {
			...last.metadata?.harness,
			media: [...mediaOfMessage(last), ...media]
		};
		const updated = {
			...last,
			metadata: {
				...last.metadata,
				harness
			}
		};
		await store.saveThread(this.threadId, history.with(index, updated));
	}
	/**
	* Abort `operation` when its input passes `timeoutAt` (a durable host with
	* `durability.timeoutMs`). Returns the function that stops the timer.
	*/
	startTimeout(inputId, operation) {
		const timeoutAt = inputId === void 0 ? void 0 : this.writer?.state.inputs.get(inputId)?.timeoutAt;
		if (timeoutAt === void 0) return () => {};
		const timer = setTimeout(() => operation.abortController.abort(TIMEOUT_REASON), Math.max(0, timeoutAt - Date.now()));
		if (typeof timer === "object" && "unref" in timer) timer.unref();
		return () => clearTimeout(timer);
	}
	/**
	* Hold the lease of a turn or agent attempt in `stores.leases` while it
	* runs. Returns the function that releases it. Without a lease store (or
	* without a log), it returns nothing: the run lease decides.
	*/
	async holdLease(inputId, operation) {
		const leases = this.persistence.stores.leases;
		const attempt = inputId === void 0 ? void 0 : this.writer?.state.inputs.get(inputId)?.attempt;
		if (!leases || inputId === void 0 || attempt === void 0) return;
		const ttlMs = this.lease?.ttlMs ?? LEASE.ttlMs;
		const renewMs = this.lease?.renewMs ?? LEASE.renewMs;
		const lease = () => ({
			threadId: this.threadId,
			inputId,
			operationId: operation.id,
			attempt,
			ownerId: this.hostId,
			expiresAt: Date.now() + ttlMs
		});
		await leases.acquire(lease());
		const timer = setInterval(() => void leases.renew(lease()).catch(() => {}), renewMs);
		if (typeof timer === "object" && "unref" in timer) timer.unref();
		return async () => {
			clearInterval(timer);
			await leases.release(lease()).catch(() => {});
		};
	}
	/**
	* End work that `close({ recoverable: true })` stopped, with no settlement.
	* Its leases end now, so the next host that opens the thread runs it again
	* at once. Call it after the run lease renewal stopped.
	*/
	async giveBack(operation, releaseLease) {
		await this.persistence.stores.runs?.update(operation.id, { leaseExpiresAt: 0 }).catch(() => {});
		await releaseLease?.();
		operation.fail("cancelled", /* @__PURE__ */ new Error("Session closed."));
	}
	/**
	* Apply a `reset()`: add its marker to the transcript. A thread that waits
	* for interrupts gets no marker, and the reset fails.
	*/
	async runReset(turn, reset) {
		const { operation } = turn;
		const inputId = turn.inputId ?? operation.id;
		operation.setStatus("running");
		this.publishStarted(operation);
		let error;
		try {
			await this.applied(inputId, operation.id);
			await this.refreshInterrupted(void 0, false, false);
			if (this.interrupted) error = {
				message: "The thread waits for interrupts. Resolve them first.",
				code: "pending_interrupts"
			};
			else {
				const marker = resetMarker(inputId, reset.note);
				if (!(await this.messages.loadThread(this.threadId)).some((message) => message.id === marker.id)) await this.addToTurn({ messages: [marker] });
				operation.publish(customEvent(HARNESS_EVENTS.reset, {
					inputId,
					...reset
				}));
			}
		} catch (failure) {
			error = { message: errorText(this.logFailure ?? failure) };
		}
		if (!this.logFailure) await this.settle({
			inputId,
			operationId: operation.id,
			outcome: error ? "failed" : "completed",
			...error ? { error } : {}
		}).catch(() => {});
		if (error) operation.fail("failed", new Error(error.message));
		else operation.finish("completed", { text: "" });
		this.publishFinished(operation);
		this.requeueWaitingSteers();
	}
	/** The model can answer the context: it ends with a user or a tool message. */
	async canContinue() {
		const last = resetContext(await this.messages.loadThread(this.threadId)).at(-1);
		return last?.role === "user" || last?.role === "tool";
	}
	async runTurn(turn) {
		try {
			await this.commitRevert();
		} catch (error) {
			turn.operation.fail("failed", error);
			this.publishFinished(turn.operation);
			this.requeueWaitingSteers();
			return;
		}
		if (turn.reset) return this.runReset(turn, turn.reset);
		const { operation } = turn;
		operation.setStatus("running");
		if (!turn.answers) this.declinedSignIns.clear();
		try {
			await this.refreshInterrupted(void 0, false, false);
		} catch (error) {
			this.warn(operation, "harness:interrupts", error);
			operation.fail("failed", error);
			this.publishFinished(operation);
			this.requeueWaitingSteers();
			return;
		}
		if (turn.inputId) try {
			if (turn.isContinue && !await this.canContinue()) {
				this.refuse(operation, this.reject(turn.inputId, "nothing_to_continue"));
				this.requeueWaitingSteers();
				return;
			}
			await this.applied(turn.inputId, operation.id);
		} catch (error) {
			await this.refreshTurnInterrupts(operation);
			operation.fail("failed", this.logFailure ?? error);
			this.publishFinished(operation);
			this.requeueWaitingSteers();
			return;
		}
		let releaseLease;
		try {
			releaseLease = await this.holdLease(turn.inputId, operation);
		} catch (error) {
			await this.refreshTurnInterrupts(operation);
			operation.fail("failed", error);
			this.publishFinished(operation);
			this.requeueWaitingSteers();
			return;
		}
		const stopTimer = this.startTimeout(turn.inputId, operation);
		this.publishStarted(operation);
		let runPlugins;
		let stopRunLease = () => {};
		/** The next chat() call runs the root agents that `routing` picked. */
		let isRootPart = false;
		/** chat() refused the resume of this turn, so it ran nothing. */
		let isResumeRefused = false;
		/** The tool calls of this turn that got a result, and an error result. */
		const resultIds = /* @__PURE__ */ new Set();
		const errorResultIds = /* @__PURE__ */ new Set();
		let text = "";
		let interrupts;
		let failure;
		const captured = [];
		const sentMessage = turn.message ?? turn.sentMessage;
		const sender = this.sender();
		const info = {
			operationId: operation.id,
			...turn.inputId ? { inputId: turn.inputId } : {},
			...sentMessage !== void 0 ? { message: sentMessage } : {},
			...turn.context !== void 0 ? { context: turn.context } : {},
			...sender ? { principal: sender } : {},
			...turn.overrides ? { overrides: turn.overrides } : {}
		};
		try {
			await this.flushNotes();
			const stored = this.threadSettings;
			const removed = new Set(stored.plugins?.remove ?? []);
			const perRun = this.plugins.filter((plugin) => (plugin.lifetime ?? "session") !== "session" && !removed.has(plugin.name));
			if (perRun.length > 0) runPlugins = await mountPlugins(perRun, {
				turn: info,
				threadId: this.threadId,
				registry: this.agentRegistry.fork(),
				harnessTools: [...this.harness.tools ?? [], ...this.sessionPlugins?.tools ?? []],
				harnessProvides: (this.harness.middleware ?? []).flatMap((middleware) => middleware.provides ?? []),
				...this.sessionPlugins ? {
					inherited: this.sessionPlugins.values,
					takenCommands: this.sessionPlugins.commands,
					takenConfig: this.sessionPlugins.config,
					inheritedExtensions: this.sessionPlugins.extensions
				} : {},
				services: this.services
			});
			const session = this.sessionPlugins && removed.size > 0 ? withoutPlugins(this.sessionPlugins, removed) : this.sessionPlugins;
			const bridges = [
				session?.capabilityBridge,
				runPlugins?.capabilityBridge,
				this.logRecords()
			].filter((bridge) => bridge !== void 0);
			const subagentList = [
				...this.harness.subagents?.agents ?? [],
				...session?.subagents ?? [],
				...runPlugins?.subagents ?? []
			];
			const subagents = subagentList.length > 0 ? {
				...this.harness.subagents,
				agents: subagentList
			} : void 0;
			const rootAgents = [.../* @__PURE__ */ new Set([
				...this.harness.agents ?? [],
				...session?.agents ?? [],
				...runPlugins?.agents ?? []
			])];
			const { overrides } = turn;
			const picked = [...session?.adapters ?? [], ...runPlugins?.adapters ?? []].map((pick) => pick(info)).filter((adapter) => adapter !== void 0).at(-1);
			const named = stored.model === void 0 ? void 0 : this.harness.models?.[stored.model];
			const model = overrides?.adapter ?? named ?? picked ?? this.harness.adapter;
			if (!model) throw new Error(NO_MODEL);
			const adapter = await this.keys.adapter(model);
			const resolvePrompt = (prompt) => typeof prompt === "function" ? prompt() : prompt;
			const turnTools = overrides?.tools ?? [];
			const turnToolNames = new Set(turnTools.map((tool) => tool.name));
			const staticTools = [
				...this.harness.tools ?? [],
				...session?.tools ?? [],
				...runPlugins?.tools ?? [],
				...turnTools
			];
			const discovered = await this.discoverTools([...session?.discoverers ?? [], ...runPlugins?.discoverers ?? []], new Set(staticTools.map((tool) => tool.name)), operation);
			const prepared = await this.prepareTools([...session?.preparers ?? [], ...runPlugins?.preparers ?? []], {
				tools: settingTools([...staticTools, ...discovered], stored.tools, turnToolNames),
				model: adapter.model
			}, operation);
			const { bindTool } = this;
			const tools = bindTool ? prepared.map((tool) => bindDurable(tool, bindTool)) : prepared;
			const keptTools = tools.filter((tool) => turnToolNames.has(tool.name));
			const keepTools = keptTools.length > 0 ? keepTurnTools(keptTools) : void 0;
			const reasoning = overrides?.reasoning ?? stored.reasoning ?? this.harness.reasoning;
			const context = turnContext(this.harness.context, turn.context);
			const turnCache = cacheObject(overrides?.promptCache);
			const promptCache = {
				retention: turnCache?.retention ?? this.promptCache.retention,
				key: turnCache?.key ?? this.promptCache.key
			};
			let message = turn.message !== void 0 ? await this.userMessage(turn.message) : void 0;
			let resume = turn.resume;
			let parentRunId = turn.answers?.runId ?? turn.parentRunId;
			const { chatPersistence, checkpoint } = this;
			if (!chatPersistence || !checkpoint) throw new Error("The session is not open yet.");
			const durableTools = this.durableTools();
			const signal = operation.abortController.signal;
			const { routing } = this.harness;
			let pick;
			if (routing && rootAgents.length > 0 && turn.resume === void 0) {
				const history = await this.messages.loadThread(this.threadId);
				pick = await routing.router({
					messages: resetContext([...history, ...message ? [message] : []]),
					agents: rootAgents,
					abortSignal: signal,
					session: this,
					...sentMessage !== void 0 ? { input: sentMessage } : {},
					operationId: operation.id,
					...turn.inputId ? { inputId: turn.inputId } : {},
					...sender ? { principal: sender } : {},
					...turn.context !== void 0 ? { context: turn.context } : {},
					adapter
				});
			}
			const isRootTurn = turn.answers?.routed?.root === true || (pick ?? "main") !== "main";
			const rootBag = routing && isRootTurn ? {
				...routing,
				agents: rootAgents,
				router: () => {
					if (pick === void 0) throw new Error("The routed turn has no saved plan.");
					return pick;
				},
				strategy: "exclusive"
			} : void 0;
			isRootPart = rootBag !== void 0;
			/** The subagents of the next chat() call. */
			let bag = rootBag ?? subagents;
			let routed = isRoutedBag(bag);
			if (routed) {
				const { runs } = this.persistence.stores;
				await runs?.createOrResume({
					runId: operation.id,
					threadId: this.threadId,
					startedAt: Date.now()
				});
				stopRunLease = await holdRunLease(runs, operation.id, this.hostId, this.lease);
			}
			/** The messages a resolve of a routed turn continues from. */
			let routedFrom = turn.answers?.routed?.messages;
			/** Retries since the last finished tool phase. The log keeps them. */
			let retries = this.writer?.state.inputs.get(turn.inputId ?? "")?.retries ?? 0;
			/** The partial answer and the note that a `'continue'` adds. */
			let continued = [];
			/** How many times `turn.beforeFinish` continued this turn. */
			let cycle = 0;
			/** The ephemeral messages of a turn hook, for the next model call. */
			const ephemeral = [];
			const start = turn.ephemeral?.length ? message ?? (await this.messages.loadThread(this.threadId)).at(-1) : void 0;
			for (;;) {
				const turnHooks = isRootPart ? void 0 : this.harness.turn;
				let textBefore = text;
				/** Text, reasoning, or a tool call streamed since `textBefore`. */
				let streamed = false;
				let runError;
				let heldError;
				try {
					const turnMessages = [
						...routed && !routedFrom ? await this.messages.loadThread(this.threadId) : [],
						...message ? [message] : [],
						...continued
					];
					continued = [];
					const cards = routed ? new StreamProcessor({ initialMessages: routedFrom ?? modelMessagesToUIMessages(turnMessages) }) : void 0;
					const stream = chat({
						adapter,
						messages: routedFrom ?? turnMessages,
						systemPrompts: [
							...this.harness.systemPrompts ?? [],
							...[...session?.prompts ?? [], ...runPlugins?.prompts ?? []].map(resolvePrompt).filter((prompt) => prompt !== ""),
							...stored.instructions ? [stored.instructions] : []
						],
						tools,
						middleware: [
							...bridges,
							detachOnShutdown,
							withPersistence(chatPersistence),
							checkpoint,
							...rootBag ? [] : [this.steering(ephemeral)],
							resetCut,
							this.usageCounter(operation, sender),
							...this.harness.middleware ?? [],
							...session?.middleware ?? [],
							...runPlugins?.middleware ?? [],
							...keepTools ? [keepTools] : [],
							...durableTools ? [durableTools] : [],
							this.detachTools(),
							...rootBag ? [] : [this.syncFold()],
							resetCut,
							...start && turn.ephemeral ? [turnEphemeral(turn.ephemeral, start)] : [],
							ephemeralCall(ephemeral),
							mediaMiddleware({
								store: this.mediaStore,
								accepted: acceptedKinds(adapter.inputModalities, this.harness.media?.accepts),
								transcribe: this.harness.media?.transcribe
							})
						],
						...bag ? { subagents: {
							...bag,
							limits: bag.limits ?? this.limits(),
							binding: this.binding(operation, captured, sender, runPlugins, bag.agents)
						} } : {},
						agentLoopStrategy: this.harness.agentLoopStrategy ?? maxIterations(50),
						...this.harness.toolExecution !== void 0 ? { toolExecution: this.harness.toolExecution } : {},
						...this.harness.durability?.truncatedToolResult !== void 0 ? { truncatedToolResult: this.harness.durability.truncatedToolResult } : {},
						...this.harness.modelOptions !== void 0 ? { modelOptions: this.harness.modelOptions } : {},
						...this.harness.interrupts ? { interrupts: this.harness.interrupts } : {},
						...context !== void 0 ? { context } : {},
						...reasoning !== void 0 ? { reasoning } : {},
						promptCache,
						threadId: this.threadId,
						runId: operation.id,
						...parentRunId ? { parentRunId } : {},
						...resume ? { resume } : {},
						abortController: operation.abortController,
						stream: true
					});
					routedFrom = void 0;
					for await (const chunk of stream) {
						cards?.processChunk(chunk);
						if (chunk.type === EventType.RUN_ERROR && (chunk.metadata?.tanstack?.interruptErrors?.length ?? 0) > 0) isResumeRefused = true;
						if (chunk.type === EventType.RUN_FINISHED && chunk.outcome?.type === "interrupt") {
							interrupts = chunk.outcome.interrupts;
							const messages = cards?.getMessages();
							await this.keepInterrupted(operation, {
								runId: operation.id,
								interrupts,
								...messages ? { routed: {
									messages,
									root: isRootPart
								} } : {},
								...storedPrincipal(this.sender()),
								...turn.context !== void 0 ? { context: turn.context } : {}
							});
						}
						if (chunk.type === EventType.RUN_ERROR && turnHooks?.onModelError && runError === void 0) {
							const retryAfterMs = chunk.metadata?.tanstack?.retryAfterMs;
							runError = {
								message: chunk.message,
								...chunk.code !== void 0 ? { code: chunk.code } : {},
								...retryAfterMs !== void 0 ? { retryAfterMs } : {}
							};
							heldError = chunk;
							continue;
						}
						operation.publish(chunk);
						if (!("subagentRunId" in chunk && chunk.subagentRunId)) {
							if (chunk.type === EventType.TEXT_MESSAGE_CONTENT) text += chunk.delta;
							if (chunk.type === EventType.TEXT_MESSAGE_CONTENT || chunk.type === EventType.REASONING_MESSAGE_CONTENT || chunk.type === EventType.TOOL_CALL_START || chunk.type === EventType.TOOL_CALL_ARGS) streamed = true;
						}
						if (chunk.type === EventType.RUN_ERROR) failure = chunk.message;
						if (chunk.type === EventType.TOOL_CALL_RESULT) {
							const tanstack = chunk.metadata?.tanstack;
							if (tanstack?.toolResultOutcome !== "cancelled") {
								if (tanstack?.state === "output-error") errorResultIds.add(chunk.toolCallId);
								else resultIds.add(chunk.toolCallId);
							}
							if (retries > 0) this.stageRetries(turn, operation, 0);
							retries = 0;
							textBefore = text;
							streamed = false;
						}
					}
				} catch (error) {
					if (signal.aborted || this.logFailure || !turnHooks?.onModelError) throw error;
					const { code } = toRunErrorPayload(error);
					runError = {
						message: errorText(error),
						...code !== void 0 ? { code } : {}
					};
				}
				if (runError && turnHooks?.onModelError) {
					const partial = streamed;
					const isStopped = signal.aborted || this.logFailure !== void 0;
					if (!isStopped && turn.inputId !== void 0) await this.writer?.append([{
						type: "harness.turn.retry",
						inputId: turn.inputId,
						operationId: operation.id,
						retries: retries + 1
					}]);
					const answer = isStopped ? void 0 : await turnHooks.onModelError({
						session: this,
						operationId: operation.id,
						...turn.inputId ? { inputId: turn.inputId } : {},
						error: runError,
						retries,
						partial,
						signal
					});
					if ((answer === "retry" || answer === "continue") && !signal.aborted) {
						retries += 1;
						const isContinued = answer === "continue" && text !== textBefore;
						if (isContinued) continued = [{
							role: "assistant",
							content: text.slice(textBefore.length)
						}, {
							role: "user",
							content: CONTINUE_NOTE,
							metadata: { tanstack: { synthetic: true } }
						}];
						else text = textBefore;
						operation.publish(customEvent(HARNESS_EVENTS.turnRetry, {
							operationId: operation.id,
							retries,
							error: runError,
							continued: isContinued
						}));
						message = void 0;
						await this.persistence.stores.runs?.update(operation.id, {
							status: "running",
							finishedAt: void 0,
							error: void 0
						});
						continue;
					}
					if (signal.aborted) break;
					operation.publish(heldError ?? {
						type: EventType.RUN_ERROR,
						message: runError.message,
						timestamp: Date.now()
					});
					failure = runError.message;
					break;
				}
				if (failure !== void 0 || (interrupts?.length ?? 0) > 0 || signal.aborted) break;
				if (isRootPart) {
					if (routing?.strategy !== "handoff") break;
					isRootPart = false;
					bag = subagents;
					routed = isRoutedBag(bag);
				} else if (!(!rootBag && await this.claimJoins() > 0)) {
					if (!await this.continueBeforeFinish(operation, turn.inputId, cycle, ephemeral)) break;
					cycle += 1;
				}
				message = void 0;
				resume = void 0;
				parentRunId = void 0;
				await this.persistence.stores.runs?.update(operation.id, {
					status: "running",
					finishedAt: void 0,
					error: void 0
				});
			}
			if (routed && text === "") text = lastAssistantText(await this.messages.loadThread(this.threadId));
		} catch (error) {
			failure = errorText(error);
			if (!operation.abortController.signal.aborted) operation.publish({
				type: EventType.RUN_ERROR,
				message: failure,
				timestamp: Date.now()
			});
		} finally {
			stopRunLease();
			stopTimer();
			await runPlugins?.dispose().catch(() => {});
		}
		const timedOut = operation.abortController.signal.reason === TIMEOUT_REASON;
		if (operation.abortController.signal.reason === SHUTDOWN_REASON) {
			await this.giveBack(operation, releaseLease);
			this.requeueWaitingSteers();
			return;
		}
		if (failure === void 0 && !operation.abortController.signal.aborted && captured.length > 0) await this.saveTurnMedia(captured).catch((error) => this.warn(operation, "harness:media", `The media was not added to the transcript. ${String(error)}`));
		const { total } = this.usage();
		await this.index.update(this.threadId, (entry) => entry && {
			...entry,
			updatedAt: Date.now(),
			...total.calls > 0 ? { usage: {
				...entry.usage,
				turns: total.calls,
				promptTokens: total.promptTokens,
				completionTokens: total.completionTokens,
				totalTokens: total.totalTokens,
				cachedTokens: total.cachedTokens,
				cacheWriteTokens: total.cacheWriteTokens
			} } : {}
		}).catch((error) => this.warn(operation, "harness:sessions", `The session index was not updated. ${String(error)}`));
		const { inputId } = turn;
		const settled = [...inputId === void 0 ? [] : [inputId], ...this.joinedInputs(operation.id, inputId)];
		this.turnJoins.delete(operation.id);
		const settleTurn = async (settlement) => {
			if (settled.length > 0 && !this.logFailure) await this.settle(...settled.map((id) => ({
				inputId: id,
				operationId: operation.id,
				...settlement
			}))).catch(() => {});
			if (releaseLease) await releaseLease();
		};
		if (isResumeRefused && turn.answers) await this.keepInterrupted(operation, turn.answers);
		const observedInterrupts = interrupts && interrupts.length > 0 ? {
			...this.interrupted?.runId === operation.id ? this.interrupted : {},
			runId: operation.id,
			interrupts,
			...storedPrincipal(sender),
			...turn.context !== void 0 ? { context: turn.context } : {}
		} : void 0;
		const resumed = turn.resume ?? [];
		const resumedFrom = (turn.answers ?? this.interrupted)?.interrupts ?? [];
		const didResumedToolsRun = !isResumeRefused && resumed.length > 0 && resumed.every((item) => {
			const interrupt = resumedFrom.find((candidate) => candidate.id === item.interruptId);
			const toolCallId = interrupt ? toolCallOf(interrupt) : void 0;
			if (toolCallId === void 0) return false;
			return resultIds.has(toolCallId) || !operation.abortController.signal.aborted && errorResultIds.has(toolCallId);
		});
		if (didResumedToolsRun) await this.consumeResume(resumed).catch((error) => this.warn(operation, "harness:interrupts", error));
		await this.refreshTurnInterrupts(operation, observedInterrupts, didResumedToolsRun || turn.resume !== void 0 && failure === void 0 && !isResumeRefused && !operation.abortController.signal.aborted);
		if (this.logFailure) {
			if (releaseLease) await releaseLease();
			operation.fail("failed", this.logFailure);
		} else if (timedOut) {
			const message = "The input passed its time limit.";
			await settleTurn({
				outcome: "failed",
				error: {
					message,
					code: "timeout"
				}
			});
			operation.fail("failed", /* @__PURE__ */ new Error(message));
		} else if (operation.abortController.signal.aborted) {
			await settleTurn({ outcome: "aborted" });
			operation.fail("cancelled", /* @__PURE__ */ new Error("Cancelled."));
		} else if (failure !== void 0) {
			await settleTurn({
				outcome: "failed",
				error: { message: failure }
			});
			operation.fail("failed", new Error(failure));
		} else if (interrupts && interrupts.length > 0) {
			await settleTurn({ outcome: "interrupted" });
			operation.finish("interrupted", {
				text,
				interrupts
			});
		} else {
			await settleTurn({ outcome: "completed" });
			operation.finish("completed", { text });
		}
		this.publishFinished(operation);
		this.requeueWaitingSteers();
	}
	/**
	* Steers a turn never reached run next, before other queued turns (after
	* a resolve of that turn). A steer with an abort request settles `aborted`
	* instead.
	*/
	requeueWaitingSteers() {
		this.joining.clear();
		const waiting = this.steerQueue.splice(0);
		const aborted = waiting.filter((steer) => this.isAbortRequested(steer.inputId));
		const rest = waiting.filter((steer) => !aborted.includes(steer));
		for (const steer of aborted) {
			this.abortedSteers.delete(steer.inputId);
			const { operation } = steer;
			this.settle({
				inputId: steer.inputId,
				outcome: "aborted",
				...operation ? { operationId: operation.id } : {}
			}).catch(() => {}).then(() => {
				if (!operation) return;
				operation.fail("cancelled", /* @__PURE__ */ new Error("Cancelled before it started."));
				this.publishFinished(operation);
			});
		}
		if (this.closing) {
			for (const steer of rest) steer.operation?.fail("cancelled", /* @__PURE__ */ new Error("Session closed."));
			return;
		}
		this.queue.splice(this.frontOfQueue(), 0, ...rest.map((steer) => this.steerTurn(steer)));
	}
	/** A waiting steer as its own turn, with its own operation. */
	steerTurn(steer) {
		const operation = steer.operation ?? this.createTurnOperation();
		this.bindTurn(steer.inputId, operation);
		return {
			...steer,
			operation
		};
	}
	/**
	* Take a waiting input out of the steers or the queue, so it does not run
	* from there. `undefined` when it does not wait: it started, a join holds
	* it, it has an abort request, or the id is not known.
	*/
	takeWaiting(inputId) {
		const steer = this.steerQueue.find((item) => item.inputId === inputId && !this.joining.has(inputId) && !this.isAbortRequested(inputId));
		if (steer) {
			this.steerQueue.splice(this.steerQueue.indexOf(steer), 1);
			return steer;
		}
		const turn = this.queue.find((item) => item.inputId === inputId);
		const message = turn?.message;
		if (!turn || message === void 0) return void 0;
		this.queue.splice(this.queue.indexOf(turn), 1);
		return {
			inputId,
			message,
			operation: turn.operation,
			overrides: turn.overrides,
			ephemeral: turn.ephemeral,
			principal: turn.principal,
			context: turn.context
		};
	}
	/**
	* Mark a `cancelInput` or `setDelivery` input applied. On a durable host,
	* `change` lands in the same append, so a crash never keeps one without
	* the other.
	*/
	async applyControl(inputId, change) {
		if (!this.writer) {
			await this.inbox.markApplied(inputId, "session");
			return;
		}
		await this.writer.append([change, {
			type: "harness.input.applied",
			inputId,
			operationId: "session",
			attempt: 1
		}]);
	}
	/**
	* Keep the retry count of a turn in the log, so a recovered attempt starts
	* from it. It lands with the next transcript commit of the turn. A failed
	* model call appends its count at once, before `turn.onModelError` runs.
	*/
	stageRetries(turn, operation, retries) {
		const { inputId } = turn;
		if (inputId === void 0) return;
		this.writer?.stage([{
			type: "harness.turn.retry",
			inputId,
			operationId: operation.id,
			retries
		}]);
	}
	/**
	* Add hook messages and host records to the transcript, in one append.
	* Returns true when the transcript changed.
	*/
	async addToTurn(added) {
		const records = added.records ?? [];
		const messages = (added.messages ?? []).map((message) => message.id ? message : {
			...message,
			id: createMessageId()
		});
		checkHostRecords(records);
		if (!this.writer) {
			if (records.length > 0) throw new Error("Records from a turn hook need a durable host (a host with stores.log).");
			if (messages.length === 0) return false;
			const history = await this.messages.loadThread(this.threadId);
			await this.messages.saveThread(this.threadId, [...history, ...messages]);
			return true;
		}
		const before = this.writer.state.messages;
		await this.writer.commit({
			messages: [...before, ...messages],
			records
		});
		const after = this.writer.state.messages;
		return after.length !== before.length || commonPrefix(before, after) !== before.length;
	}
	/**
	* Ask `turn.beforeFinish` whether the turn goes on. True when it added to
	* the transcript or to `ephemeral`, so the turn runs the model again.
	*/
	async continueBeforeFinish(operation, inputId, cycle, ephemeral) {
		const hooks = this.harness.turn;
		if (!hooks?.beforeFinish) return false;
		const added = await hooks.beforeFinish({
			session: this,
			operationId: operation.id,
			...inputId ? { inputId } : {},
			cycle,
			messages: await this.messages.loadThread(this.threadId),
			signal: operation.abortController.signal
		});
		if (operation.abortController.signal.aborted) return false;
		if (!added || (added.messages?.length ?? 0) === 0 && (added.records?.length ?? 0) === 0 && (added.ephemeral?.length ?? 0) === 0) return false;
		const max = hooks.maxFinishCycles ?? 32;
		if (cycle >= max) throw new Error(`beforeFinish continued the turn ${max} times. Return nothing from the hook when the work is done.`);
		const isChanged = await this.addToTurn(added);
		ephemeral.push(...added.ephemeral ?? []);
		return isChanged || ephemeral.length > 0;
	}
	/** The limits for children of this session, with the harness defaults. */
	limits() {
		return this.harness.subagents?.limits ?? DEFAULT_SUBAGENT_LIMITS;
	}
	runAgent(target, input, options, parent, child) {
		const name = typeof target === "string" ? target : target.name;
		if (options.resume && !this.writer) throw new Error(`Agent ${name}: resume: true needs a durable host (a host with stores.log).`);
		const operation = this.agentOperation(name);
		this.markBusy();
		const principal = parent ? parent.current.principal : this.sender();
		const sender = principal ? { principal } : {};
		const fromParent = parent ? {
			parentRunId: parent.current.operation.id,
			budget: parent.budget.child()
		} : {};
		const chain = this.createChain({
			runInputId: createInputId(),
			target,
			input,
			options,
			...sender,
			...fromParent
		}, {
			operation,
			...sender
		});
		parent?.children.add(chain);
		this.executeAgent(operation, chain, {
			inputId: chain.runInputId,
			...child ? { child } : {}
		});
		return operation;
	}
	/**
	* `ctx.agents` in the runs of `chain`: start a child in the background.
	* The child counts against the chain's tree budget, and over it `start`
	* throws. The child records the run that started it, and runs for that
	* run's sender.
	*/
	agentStarter(chain) {
		return { start: (target, input, options) => {
			const active = [...chain.children].filter((child) => !child.current.operation.isSettled()).length;
			const refusal = chain.budget.reserve(active);
			if (refusal !== void 0) throw new Error(refusal);
			return this.runAgent(target, input, options ?? {}, chain);
		} };
	}
	/** A new agent run operation. `id`: a stored one, after a restart. */
	agentOperation(agent, id) {
		const operation = new OperationImpl("agent", this.feed, (running) => this.cancel(running.id), agent, id);
		const run = Object.assign(operation, { send: (message, options) => this.sendToAgent(operation.id, message, options) });
		this.operations.set(run.id, run);
		return run;
	}
	/** A new chain, with `first` as its first run. */
	createChain(fields, first) {
		const agent = typeof fields.target === "string" ? fields.target : fields.target.name;
		const chain = {
			...fields,
			agent,
			thread: `${this.threadId}:${agent}:${fields.runInputId}`,
			budget: fields.budget ?? this.codeBudget(),
			current: first,
			runs: [first],
			steers: [],
			followUps: [],
			children: /* @__PURE__ */ new Set()
		};
		this.agentChains.set(chain.runInputId, chain);
		this.chainOf.set(first.operation.id, chain);
		return chain;
	}
	/**
	* Run again an agent run with `resume: true` whose host stopped: a first
	* run, or a follow-up run of the chain of `first`. The new run applies the
	* same input, so its attempt counts up, and it continues the chain's saved
	* transcript.
	*/
	resumeAgent(input, first) {
		const operation = this.agentOperation(first.input.agent);
		this.markBusy();
		const sender = input.principal ? { principal: input.principal } : {};
		const chain = this.createChain(chainFields(first), {
			operation,
			...sender
		});
		this.feed.publish(operation.id, customEvent(HARNESS_EVENTS.operationResumed, {
			operationId: operation.id,
			...input.operationId ? { resumedFrom: input.operationId } : {}
		}));
		this.executeAgent(operation, chain, {
			inputId: input.inputId,
			resumed: true,
			...input.input.op === "agentMessage" ? { message: {
				inputId: input.inputId,
				message: input.input.message,
				...sender
			} } : {}
		});
	}
	/**
	* What a resumable agent run adds on a durable host: checkpoints of its
	* `ctx.chat` tool phases, and `ctx.step` values in the session log, under
	* the key of the input the run applies.
	*/
	resumable(inputId) {
		const { chatPersistence, writer } = this;
		if (!chatPersistence || !writer) return void 0;
		const { runs } = this.persistence.stores;
		const key = agentKey(inputId);
		const checkpoint = checkpointMiddleware({
			...runs ? { runs } : {},
			messages: chatPersistence.stores.messages,
			hostId: this.hostId,
			...this.lease ? { lease: this.lease } : {},
			onToolResult: ({ toolCallId, message }) => writer.append([{
				type: "harness.tool.result",
				toolCallId: `${key}:${toolCallId}`,
				message
			}])
		});
		const durableTools = this.durableTools();
		return {
			middleware: [checkpoint, ...durableTools ? [durableTools] : []],
			step: this.durableBinding(writer, key).step
		};
	}
	/**
	* The saved transcript of a resumable agent run whose host stopped. The
	* chat runs that host left running end `failed`, and the last tool batch
	* gets the same repair as in a turn: the results that finished, and an
	* error for a cut call that must not run twice.
	*/
	async continueAgentThread(agentThread, inputId) {
		const store = this.chatPersistence?.stores.messages;
		if (!store) return [];
		const runs = this.persistence.stores.runs;
		const records = await runs?.listByThread?.(agentThread) ?? [];
		for (const run of records.filter((item) => item.status === "running")) await runs?.update(run.runId, {
			status: "failed",
			finishedAt: Date.now(),
			error: { message: AGENT_STOPPED }
		});
		const newest = [...records].sort((a, b) => b.startedAt - a.startedAt)[0];
		const prefix = `${agentKey(inputId)}:`;
		const finished = new Map([...this.writer?.state.toolResults ?? []].flatMap(([id, message]) => id.startsWith(prefix) ? [[id.slice(prefix.length), message]] : []));
		await repairTranscript({
			messages: store,
			threadId: agentThread,
			pending: newest?.checkpoint?.pendingTools ?? [],
			finished,
			interrupted: this.harness.durability?.interruptedToolResult,
			truncated: this.harness.durability?.truncatedToolResult
		});
		return store.loadThread(agentThread);
	}
	/** Run a group of agents. Every child settles before the group returns. */
	async agentGroup(options, body) {
		const started = [];
		const cancelOthers = (failed) => {
			if (options.onFailure === "collect") return;
			for (const operation of started) if (operation !== failed && !operation.isSettled()) operation.cancel();
		};
		const group = {
			run: (target, input) => {
				const operation = this.runAgent(target, input, { wake: false });
				started.push(operation);
				return Promise.resolve(operation).catch((error) => {
					cancelOthers(operation);
					throw error;
				});
			},
			runSettled: (target, input) => {
				const operation = this.runAgent(target, input, { wake: false });
				started.push(operation);
				return Promise.resolve(operation).then((value) => ({
					ok: true,
					value
				}), (error) => ({
					ok: false,
					error
				}));
			}
		};
		try {
			return await body(group);
		} finally {
			await Promise.allSettled(started.map((operation) => Promise.resolve(operation)));
		}
	}
	/**
	* One run of `chain`. Then the steers it never took run as follow-ups,
	* before the follow-ups that wait, and the next follow-up starts.
	*/
	async executeAgent(operation, chain, start) {
		try {
			await this.runAgentOnce(operation, chain, start);
		} finally {
			if (!this.logFailure) {
				chain.followUps.unshift(...chain.steers.splice(0).map((steer) => this.followUpOf(chain, steer)));
				this.nextFollowUp(chain);
			}
			this.checkIdle();
		}
	}
	/**
	* Give `sent` to `chain`. A steer waits for the running run's next model
	* call. A follow-up, or a steer to a run that ended, runs after the
	* current run. Returns the receipt fields.
	*/
	deliver(chain, sent, mode) {
		const { operation: running, principal } = chain.current;
		if (mode === "steer" && !running.isSettled() && isSameSender(sent.principal, principal)) {
			chain.steers.push(sent);
			return {
				status: "accepted",
				operationId: running.id
			};
		}
		const isWaiting = !running.isSettled() || chain.followUps.length > 0;
		const next = this.followUpOf(chain, sent);
		chain.followUps.push(next);
		this.nextFollowUp(chain);
		return {
			status: isWaiting ? "queued" : "accepted",
			operationId: next.operation.id
		};
	}
	/** `sent` as a follow-up of `chain`, with the operation of its run. */
	followUpOf(chain, sent) {
		const operation = this.agentOperation(chain.agent);
		this.chainOf.set(operation.id, chain);
		return {
			...sent,
			operation
		};
	}
	/** Start the next follow-up of `chain` once its current run ended. */
	nextFollowUp(chain) {
		if (!chain.current.operation.isSettled()) return;
		const next = chain.followUps.shift();
		if (!next) return;
		chain.current = {
			operation: next.operation,
			...next.principal ? { principal: next.principal } : {}
		};
		chain.runs.push(chain.current);
		this.markBusy();
		this.executeAgent(next.operation, chain, {
			inputId: next.inputId,
			message: next
		});
	}
	/**
	* One run of `chain`. A new first run stores its `agent` input first.
	* Every run keeps its messages in the chain's thread, so a run again
	* after a host stop continues them.
	*/
	async runAgentOnce(operation, chain, start) {
		const { agent: name, target, input, options } = chain;
		const { inputId } = start;
		const { principal } = chain.current;
		if (!start.resumed && !start.message) await this.accept(inputId, {
			op: "agent",
			agent: name,
			input,
			...options.wake ? { detached: true } : {},
			...options.resume ? { resume: true } : {},
			...options.attach === "none" ? { attach: "none" } : {},
			...chain.parentRunId ? { parentRunId: chain.parentRunId } : {}
		}, principal);
		const agent = typeof target === "string" ? this.agentRegistry.get(target) : target;
		if (!agent) {
			this.reject(inputId, "unknown_agent");
			operation.fail("failed", /* @__PURE__ */ new Error(`Unknown agent: ${name}`));
			return;
		}
		let checkedInput = input;
		if (agent.inputSchema !== void 0) {
			const checked = await validateWithStandardSchema(agent.inputSchema, input ?? {});
			if (!checked.success) {
				const reason = `Input validation failed for agent ${name}: ${checked.issues.map((issue) => issue.message).join(", ")}`;
				this.reject(inputId, "invalid_input");
				operation.fail("failed", new Error(reason));
				return;
			}
			checkedInput = checked.data;
		}
		operation.setStatus("running");
		await this.applied(inputId, operation.id);
		const runs = this.persistence.stores.runs;
		await runs?.createOrResume({
			runId: operation.id,
			threadId: this.threadId,
			startedAt: Date.now(),
			kind: "agent",
			agent: name,
			...storedPrincipal(principal)
		});
		operation.publish({
			type: EventType.RUN_STARTED,
			runId: operation.id,
			threadId: this.threadId,
			timestamp: Date.now()
		});
		this.publishStarted(operation);
		const child = start.child ?? { subagentRunId: createSubagentId() };
		await this.indexAgent(operation, child, principal);
		let text = "";
		let result;
		let failure;
		const { subagentRunId, prompt } = child;
		let stopRunLease = () => {};
		let releaseLease;
		try {
			stopRunLease = await holdRunLease(runs, operation.id, this.hostId, this.lease);
			releaseLease = await this.holdLease(inputId, operation);
			const { message } = start;
			const saved = start.resumed ? await this.continueAgentThread(chain.thread, inputId) : message ? await this.chatPersistence?.stores.messages.loadThread(chain.thread) ?? [] : await this.messages.loadThread(this.threadId) ?? [];
			const messages = message && !saved.some((item) => item.id === message.inputId) ? [...saved, asUserMessage(message)] : saved;
			const binding = this.binding(operation, [], principal);
			const durable = options.resume ? this.resumable(inputId) : void 0;
			const stream = runAgentStream(agent, {
				input: checkedInput,
				messages: prompt === void 0 ? messages : [...messages, {
					role: "user",
					content: prompt
				}],
				threadId: chain.thread,
				runId: `${operation.id}:${subagentRunId}`,
				parentRunId: operation.id,
				subagentRunId,
				abortSignal: operation.abortController.signal
			}, void 0, void 0, {
				...binding,
				chatMiddleware: [
					...this.chatPersistence ? [withPersistence(this.chatPersistence)] : [],
					...durable?.middleware ?? [],
					this.agentSteering(chain, inputId, operation),
					...binding.chatMiddleware
				],
				...durable ? { step: durable.step } : {},
				keys: this.keysOf(principal),
				budget: chain.budget,
				agents: this.agentStarter(chain)
			});
			for await (const chunk of stream) {
				operation.publish(chunk);
				if (chunk.type === EventType.TEXT_MESSAGE_CONTENT && "subagentRunId" in chunk && chunk.subagentRunId === subagentRunId) text += chunk.delta;
				if (chunk.type === EventType.SUBAGENT_FINISHED && chunk.subagentRunId === subagentRunId) result = chunk.result;
				if (chunk.type === EventType.SUBAGENT_ERROR && chunk.subagentRunId === subagentRunId) failure = chunk.message;
			}
		} catch (error) {
			failure = error instanceof Error ? error.message : String(error);
		}
		const value = result !== void 0 ? result : text;
		const end = async (run, settlement) => {
			if (this.logFailure) return;
			await runs?.update(operation.id, {
				...run,
				finishedAt: Date.now()
			});
			const joined = this.joinedInputs(operation.id, inputId);
			await this.settle(...[inputId, ...joined].map((id) => ({
				inputId: id,
				operationId: operation.id,
				...settlement
			}))).catch(() => {});
		};
		if (operation.abortController.signal.reason === SHUTDOWN_REASON) {
			stopRunLease();
			await this.giveBack(operation, releaseLease);
			return;
		}
		if (operation.abortController.signal.aborted) {
			operation.publish({
				type: EventType.RUN_FINISHED,
				runId: operation.id,
				threadId: this.threadId,
				outcome: { type: "cancelled" },
				timestamp: Date.now()
			});
			await end({ status: "aborted" }, { outcome: "aborted" });
			operation.fail("cancelled", /* @__PURE__ */ new Error("Cancelled."));
		} else if (failure !== void 0) {
			operation.publish({
				type: EventType.RUN_ERROR,
				message: failure,
				timestamp: Date.now()
			});
			const error = { message: failure };
			await end({
				status: "failed",
				error
			}, {
				outcome: "failed",
				error
			});
			await this.noteAgentEnd(name, "failed", failure, options, principal);
			operation.fail("failed", new Error(failure));
		} else {
			operation.publish({
				type: EventType.RUN_FINISHED,
				runId: operation.id,
				threadId: this.threadId,
				result: value,
				timestamp: Date.now()
			});
			await end({
				status: "completed",
				result: compactForModel(value)
			}, { outcome: "completed" });
			await this.noteAgentEnd(name, "finished", value, options, principal);
			operation.finish("completed", value);
		}
		stopRunLease();
		await releaseLease?.();
		this.publishFinished(operation);
	}
	/**
	* The index entry of an agent run: thread `subagent:<subagentRunId>`, with
	* this thread as its parent and the harness of this thread. `upsert`
	* replaces the whole entry, so the fields of other writers stay. A failed
	* write does not fail the run.
	*/
	async indexAgent(operation, child, principal) {
		const threadId = `subagent:${child.subagentRunId}`;
		const now = Date.now();
		await this.index.update(threadId, (entry) => ({
			...entry,
			threadId,
			parentThreadId: this.threadId,
			...child.parentToolCallId !== void 0 && { parentToolCallId: child.parentToolCallId },
			harness: this.harness.name,
			createdAt: entry?.createdAt ?? now,
			updatedAt: now,
			...storedPrincipal(entry?.principal ?? principal)
		})).catch((error) => this.warn(operation, "harness:sessions", `The session index was not updated. ${String(error)}`));
	}
	/**
	* Tell the main model how an agent ended: a transcript note (unless
	* `attach: 'none'`), and a new chat turn when `wake` is set. The wake turn
	* runs as `principal`, the user who started the agent.
	*/
	async noteAgentEnd(name, ended, result, options, principal) {
		const note = referenceNote(name, result, ended);
		if ((options.attach ?? "reference") === "reference") await this.addNote(note);
		if (options.wake) this.followUp(`Background agent ${name} ${ended}: ${note}`, { ...principal ? { principal } : {} });
	}
	/**
	* Fail an agent run whose host stopped. Its events end the operation for
	* views, and the main model gets a note.
	*/
	async failStoppedAgent(stopped) {
		const { operationId, inputId } = stopped;
		const error = stopped.error ?? { message: AGENT_STOPPED };
		await this.persistence.stores.runs?.update(operationId, {
			status: "failed",
			finishedAt: Date.now(),
			error
		});
		if (inputId) await this.settle(...[inputId, ...this.joinedInputs(operationId, inputId)].map((id) => ({
			inputId: id,
			operationId,
			outcome: "failed",
			error
		})));
		this.feed.publish(operationId, {
			type: EventType.RUN_ERROR,
			message: error.message,
			timestamp: Date.now()
		});
		this.feed.publish(operationId, customEvent(HARNESS_EVENTS.operationFinished, {
			operationId,
			status: "failed"
		}));
		await this.noteAgentEnd(stopped.agent, "failed", error.message, { wake: stopped.wake === true }, stopped.principal);
	}
	/**
	* Add an assistant note to the transcript: at once when no turn runs, else
	* before the next turn starts.
	*/
	async addNote(note) {
		const id = createMessageId();
		this.pendingNotes.push({
			id,
			role: "assistant",
			content: note
		});
		await this.writer?.append([{
			type: "harness.note",
			noteId: id,
			note
		}]);
		if (!this.activeTurn && !this.reverted) await this.flushNotes();
	}
	/** Write queued notes to the transcript while no turn is writing it. */
	async flushNotes() {
		const messages = this.messages;
		if (this.pendingNotes.length === 0) return;
		const notes = this.pendingNotes.splice(0);
		const history = await messages.loadThread(this.threadId);
		await messages.saveThread(this.threadId, [...history, ...notes]);
	}
	/**
	* Track a background job of this host. A durable host also logs its start
	* and end, so recovery can note a job that a crash stopped.
	*/
	logJob(jobId, ended) {
		if (ended) this.jobs.delete(jobId);
		else this.jobs.add(jobId);
		this.writer?.append([{
			type: "harness.job",
			jobId,
			ended
		}]).catch(() => void 0);
	}
	/**
	* After a crash: queue the logged notes that are not in the transcript,
	* and note each logged job that no host runs now.
	*/
	async recoverBackground(writer) {
		const queued = new Set(this.pendingNotes.map((message) => message.id));
		for (const [id, note] of writer.state.notes) {
			if (queued.has(id)) continue;
			this.pendingNotes.push({
				id,
				role: "assistant",
				content: note
			});
		}
		for (const jobId of [...writer.state.jobs]) {
			if (this.jobs.has(jobId)) continue;
			const id = createMessageId();
			const note = `Background job ${jobId} stopped when the host restarted.`;
			this.pendingNotes.push({
				id,
				role: "assistant",
				content: note
			});
			await writer.append([{
				type: "harness.note",
				noteId: id,
				note
			}, {
				type: "harness.job",
				jobId,
				ended: true
			}]);
		}
		if (!this.activeTurn && !this.reverted) await this.flushNotes();
	}
	/**
	* Store an input, unless its id is known. The check before the first
	* `await` is synchronous, so a second call with the same id in the same
	* tick is a duplicate too. `principal` is who sent it.
	*/
	async accept(inputId, input, principal = this.principal) {
		const sender = storedPrincipal(principal);
		const payload = inputKey(input, sender.principal);
		const local = this.admitted.get(inputId);
		if (local !== void 0) return local === payload ? "duplicate" : "conflict";
		const logged = this.writer?.state.inputs.get(inputId);
		if (logged) return inputKey(logged.input, logged.principal) === payload ? "duplicate" : "conflict";
		this.admitted.set(inputId, payload);
		if (WORK_OPS.has(input.op)) {
			this.markBusy();
			await this.claimWrite;
		}
		const at = Date.now();
		if (this.writer) await this.writer.append([{
			type: "harness.input",
			inputId,
			input,
			at,
			...sender
		}]);
		else {
			const stored = await this.inbox.append({
				inputId,
				threadId: this.threadId,
				input,
				createdAt: at,
				...sender
			});
			if (stored.createdAt !== at || stored.status !== "pending") return inputKey(stored.input, stored.principal) === payload ? "duplicate" : "conflict";
		}
		this.feed.publish("session", customEvent(HARNESS_EVENTS.inputAccepted, {
			inputId,
			op: input.op
		}));
		return "new";
	}
	/**
	* Does `stores.runs` have a run with this id, on any thread? A client run
	* id must not reuse it. A store that fails counts as yes, so nothing runs.
	*/
	async isRunTaken(runId) {
		const runs = this.persistence.stores.runs;
		if (!runs) return false;
		return runs.get(runId).then((run) => run !== null, () => true);
	}
	/** Record that `operationId` runs the input. A durable host counts attempts. */
	async markApplied(inputId, operationId) {
		if (!this.writer) {
			await this.inbox.markApplied(inputId, operationId);
			return;
		}
		const logged = this.writer.state.inputs.get(inputId);
		const timeoutMs = this.harness.durability?.timeoutMs;
		const timeoutAt = logged?.timeoutAt ?? (timeoutMs !== void 0 ? Date.now() + timeoutMs : void 0);
		await this.writer.append([{
			type: "harness.input.applied",
			inputId,
			operationId,
			attempt: (logged?.attempt ?? 0) + 1,
			...timeoutAt !== void 0 ? { timeoutAt } : {}
		}]);
	}
	async applied(inputId, operationId) {
		await this.markApplied(inputId, operationId);
		this.feed.publish(operationId, customEvent(HARNESS_EVENTS.inputApplied, {
			inputId,
			operationId
		}));
	}
	/** Refuse an input. Returns its rejected receipt. */
	reject(inputId, reason) {
		if (this.writer) this.writer.append([{
			type: "harness.input.rejected",
			inputId,
			reason
		}]).catch(() => {});
		else this.inbox.markRejected(inputId, reason);
		const receipt = {
			inputId,
			status: "rejected",
			reason
		};
		this.receipts.set(inputId, receipt);
		this.feed.publish("session", customEvent(HARNESS_EVENTS.inputRejected, {
			inputId,
			reason
		}));
		return receipt;
	}
	/**
	* Record how inputs ended, all in one append: a turn and the inputs that
	* joined it settle together. Clients get a `harness.input.settled` event.
	*/
	async settle(...settlements) {
		if (this.writer) await this.writer.append(settlements.map((settlement) => ({
			type: "harness.input.settled",
			...settlement
		})));
		for (const settlement of settlements) {
			this.settlements.set(settlement.inputId, settlement);
			this.feed.publish(settlement.operationId ?? "session", customEvent(HARNESS_EVENTS.inputSettled, { ...settlement }));
		}
	}
	/** How a chat input ended, when it did. Throws for a refused input. */
	knownSettlement(inputId) {
		const logged = this.writer?.state.inputs.get(inputId);
		if (logged?.settlement) return logged.settlement;
		const refused = logged?.status === "rejected" ? {
			inputId,
			status: "rejected",
			reason: logged.reason ?? ""
		} : this.receipts.get(inputId);
		if (refused?.status === "rejected") throw new InputRejectedError(refused);
		return this.settlements.get(inputId);
	}
	isChatInput(inputId) {
		const input = this.writer?.state.inputs.get(inputId)?.input;
		if (input) return CHAT_OPS.has(input.op) || input.op === "reset" || input.op === "agent" || input.op === "agentMessage";
		return this.turnOperations.has(inputId) || this.receipts.has(inputId);
	}
	/** Link a turn operation and its input. */
	bindTurn(inputId, operation) {
		this.turnOperations.set(inputId, operation);
		this.operationInputs.set(operation.id, inputId);
	}
	/** Keep a chat input's receipt, for a duplicate of the input. */
	keep(receipt) {
		this.receipts.set(receipt.inputId, receipt);
		return receipt;
	}
	/** Resolve a turn's receipt, and keep it for a duplicate. */
	answerTurn(operation, receipt) {
		operation.resolveReceipt(this.keep(receipt));
	}
	refuse(operation, receipt) {
		this.answerTurn(operation, receipt);
		operation.fail("failed", new InputRejectedError(receipt));
	}
	/** What a duplicate or a conflicting chat input gets back. */
	duplicateReceipt(inputId, admission) {
		if (admission === "conflict") return {
			inputId,
			status: "rejected",
			reason: "conflict"
		};
		const kept = this.receipts.get(inputId);
		if (kept) return kept;
		const operationId = this.writer?.state.inputs.get(inputId)?.operationId;
		return {
			inputId,
			status: "accepted",
			...operationId ? { operationId } : {}
		};
	}
	/**
	* The operation for a prompt whose id is known: the live one, one that
	* settles from the log, or a refused one for another payload.
	*/
	knownTurn(inputId, input, principal) {
		const payload = inputKey(input, principal);
		const local = this.admitted.get(inputId);
		const logged = this.writer?.state.inputs.get(inputId);
		const stored = local ?? (logged ? inputKey(logged.input, logged.principal) : void 0);
		if (stored === void 0) return void 0;
		if (stored !== payload) {
			const refused = this.createTurnOperation();
			this.refuse(refused, {
				inputId,
				status: "rejected",
				reason: "conflict"
			});
			return refused;
		}
		const live = this.turnOperations.get(inputId);
		if (live) return live;
		const replay = this.createTurnOperation(logged?.operationId);
		this.answerDuplicate(replay, inputId, "duplicate");
		return replay;
	}
	/** Settle `operation` like the earlier input with the same id. */
	answerDuplicate(operation, inputId, admission) {
		const receipt = this.duplicateReceipt(inputId, admission);
		if (receipt.status === "rejected") {
			this.refuse(operation, receipt);
			return;
		}
		operation.resolveReceipt(receipt);
		if (!this.writer) {
			operation.fail("failed", /* @__PURE__ */ new Error("This input ran before a restart. Keep its result with a durable host (stores.log)."));
			return;
		}
		this.settled(inputId).then((settlement) => this.settleOperation(operation, settlement), (error) => operation.fail("failed", error));
	}
	/** End `operation` with a stored settlement. */
	settleOperation(operation, settlement) {
		const text = lastAssistantText(this.writer?.state.messages ?? []);
		switch (settlement.outcome) {
			case "completed":
				operation.finish("completed", { text });
				return;
			case "interrupted":
				operation.finish("interrupted", {
					text,
					interrupts: []
				});
				return;
			case "aborted":
				operation.fail("cancelled", /* @__PURE__ */ new Error("Cancelled."));
				return;
			case "failed":
				operation.fail("failed", new Error(settlement.error?.message ?? "The input failed."));
				return;
		}
	}
	publishStarted(operation) {
		operation.publish(customEvent(HARNESS_EVENTS.operationStarted, {
			operationId: operation.id,
			kind: operation.kind,
			...operation.agent ? { agent: operation.agent } : {}
		}));
	}
	publishFinished(operation) {
		operation.publish(customEvent(HARNESS_EVENTS.operationFinished, {
			operationId: operation.id,
			status: operation.status()
		}));
	}
	/**
	* Continue the newest chat turn that a crashed host left running. Older
	* crashed turns are marked failed, and so are crashed agent runs.
	*/
	async recoverCrashedTurn() {
		const runs = await findCrashedRuns(this.persistence.stores.runs, this.threadId);
		for (const run of runs.filter((record) => record.kind === "agent")) await this.failStoppedAgent({
			operationId: run.runId,
			agent: run.agent ?? "agent"
		});
		const crashed = runs.filter((record) => record.kind !== "agent");
		const newest = crashed.sort((a, b) => b.startedAt - a.startedAt)[0];
		for (const record of crashed) await this.persistence.stores.runs?.update(record.runId, {
			status: "failed",
			finishedAt: Date.now(),
			error: { message: record === newest ? "The host stopped. The session continued this turn in a new run." : "The host stopped during this turn." }
		});
		if (!newest || this.interrupted) return;
		await repairTranscript({
			messages: this.messages,
			threadId: newest.threadId,
			pending: newest.checkpoint?.pendingTools ?? [],
			interrupted: this.harness.durability?.interruptedToolResult,
			truncated: this.harness.durability?.truncatedToolResult
		});
		const operation = this.createTurnOperation();
		this.feed.publish(operation.id, customEvent(HARNESS_EVENTS.operationResumed, {
			operationId: operation.id,
			resumedFrom: newest.runId
		}));
		this.enqueueTurn({ operation });
	}
	/**
	* Queue a reset: at the front for a new one (it applies when the running
	* turn ends), at the end for one from before a restart (in its admission
	* order). Its operation is a command, so clients do not see a chat turn.
	*/
	queueReset(inputId, note, principal, at) {
		const operation = new OperationImpl("command", this.feed, (target) => this.cancel(target.id));
		this.operations.set(operation.id, operation);
		this.bindTurn(inputId, operation);
		const turn = {
			operation,
			inputId,
			principal,
			reset: note !== void 0 ? { note } : {}
		};
		this.queue.splice(at === "front" ? this.frontOfQueue() : this.queue.length, 0, turn);
		this.drain();
		return operation;
	}
	/** Re-run turns that were accepted but never applied before a restart. */
	async recoverInbox() {
		const pending = await this.inbox.listPending(this.threadId);
		for (const entry of pending) {
			const input = entry.input;
			if (input.op === "prompt" || input.op === "followUp" || input.op === "steer") {
				const operation = this.createTurnOperation();
				this.admitted.set(entry.inputId, inputKey(input, entry.principal));
				this.bindTurn(entry.inputId, operation);
				this.enqueueTurn({
					operation,
					message: input.message,
					inputId: entry.inputId,
					principal: entry.principal,
					context: input.context
				});
			} else if (input.op === "reset") this.queueReset(entry.inputId, input.note, entry.principal, "end");
			else this.reject(entry.inputId, "expired_on_restart");
		}
	}
	/** The recovery decision for `input`: the hook's, or `decision`. */
	async recoverDecision(writer, input, decision, interruptedTools = []) {
		const recover = this.harness.durability?.recover;
		if (!recover) return decision;
		return await recover({
			session: this,
			input: {
				inputId: input.inputId,
				input: input.input,
				attempt: input.attempt,
				...input.timeoutAt !== void 0 ? { timeoutAt: input.timeoutAt } : {},
				abortRequested: input.abortRequested,
				...input.operationId ? { operationId: input.operationId } : {},
				retries: input.retries ?? 0
			},
			messages: [...writer.state.messages],
			interruptedTools,
			decision
		}) ?? decision;
	}
	/**
	* The part of a cut answer that the log has: the answer text and the
	* signed thinking blocks that operation `operationId` streamed after the
	* last transcript record. A thinking block with no signature, tool call
	* arguments, and agent events are not in it.
	*/
	async cutOffAnswer(writer, operationId) {
		const from = writer.state.transcriptSeq;
		if (from === void 0) return {
			text: "",
			thinking: []
		};
		let text = "";
		const blocks = /* @__PURE__ */ new Map();
		const block = (id) => {
			const found = blocks.get(id) ?? { content: "" };
			blocks.set(id, found);
			return found;
		};
		for await (const { event } of writer.read({
			from: String(from),
			filter: (entry) => entry.operationId === operationId,
			until: () => true
		})) {
			if ("subagentRunId" in event && event.subagentRunId) continue;
			if (event.type === EventType.TEXT_MESSAGE_CONTENT) text += event.delta;
			if (event.type === EventType.REASONING_MESSAGE_CONTENT) block(event.messageId).content += event.delta;
			if (event.type === EventType.REASONING_ENCRYPTED_VALUE && event.subtype === "message") block(event.entityId).signature = event.encryptedValue;
		}
		const thinking = [...blocks].flatMap(([id, { content, signature }]) => !signature ? [] : id.startsWith(REDACTED_THINKING_ID_PREFIX) ? [{
			content: "",
			signature,
			redacted: true
		}] : [{
			content,
			signature
		}]);
		return {
			text,
			thinking
		};
	}
	/**
	* A `cancelInput` or `setDelivery` whose own record is in the log, but not
	* its change: a crash cut it. Apply it now, before any input runs. When
	* its input does not wait any more, reject it with `not_waiting`. Other
	* ops are not changed.
	*/
	async recoverControl(writer, logged) {
		const { input } = logged;
		if (input.op !== "cancelInput" && input.op !== "setDelivery") return;
		const target = writer.state.inputs.get(input.inputId);
		if (!(target?.status === "pending" && "message" in target.input)) {
			this.reject(logged.inputId, "not_waiting");
			return;
		}
		await this.applyControl(logged.inputId, input.op === "cancelInput" ? {
			type: "harness.input.abort",
			inputId: input.inputId
		} : {
			type: "harness.input.delivery",
			inputId: input.inputId,
			delivery: input.delivery
		});
	}
	/**
	* Recover a durable session from its log, input by input, in admission
	* order. A chat turn whose host stopped (its run lease expired) settles
	* `completed` when the log already has its final answer. Else it settles
	* `aborted` when an abort was asked, settles `failed` when no attempt or no
	* time is left, and else runs again as the next attempt. An agent run (a
	* first run or a follow-up run) whose host stopped runs again with
	* `resume: true`, else settles `failed` with the steers that joined it. A
	* message that waited for such a run goes to the run again, else settles
	* `aborted`. An input that never ran runs now. One that a `setDelivery`
	* sent to `steer` joins the turn that runs, when one does. A `cancelInput`
	* or `setDelivery` that a crash cut before it was applied applies first.
	* Other inputs are rejected with `expired_on_restart`. An input that this
	* session stored or took already is skipped, so `recover()` can run this
	* again.
	*/
	async recoverFromLog(writer) {
		const runs = this.persistence.stores.runs;
		const maxAttempts = this.harness.durability?.maxAttempts ?? 10;
		const isTaken = (input) => {
			if (this.admitted.has(input.inputId)) return true;
			this.admitted.set(input.inputId, inputKey(input.input, input.principal));
			return false;
		};
		await this.recoverBackground(writer);
		const logged = [...writer.state.inputs.values()];
		for (const input of logged) if (input.status === "pending" && CONTROL_OPS.has(input.input.op) && !isTaken(input)) await this.recoverControl(writer, input);
		const inputs = [...writer.state.inputs.values()];
		for (const input of inputs) {
			if (input.input.op === "reset") {
				const isOpen = (input.status === "pending" || input.status === "applied") && !isTaken(input);
				if (isOpen && input.abortRequested) await this.settle({
					inputId: input.inputId,
					outcome: "aborted"
				});
				else if (isOpen) this.queueReset(input.inputId, input.input.note, input.principal, "end");
				continue;
			}
			const isChat = CHAT_OPS.has(input.input.op);
			if (input.status === "pending") {
				if (CONTROL_OPS.has(input.input.op) || isTaken(input)) continue;
				if (input.input.op === "agentMessage") {
					const chain = this.agentChains.get(input.input.run ?? "");
					if (chain) this.deliver(chain, {
						inputId: input.inputId,
						message: input.input.message,
						...input.principal ? { principal: input.principal } : {}
					}, input.input.mode ?? "steer");
					else await this.settle({
						inputId: input.inputId,
						outcome: "aborted"
					});
					continue;
				}
				if (!isChat || !("message" in input.input || input.input.op === "continue")) {
					this.reject(input.inputId, "expired_on_restart");
					continue;
				}
				const decision = await this.recoverDecision(writer, input, input.abortRequested ? {
					action: "settle",
					outcome: "aborted"
				} : { action: "run" });
				if (decision.action === "settle") {
					await this.settle({
						inputId: input.inputId,
						outcome: decision.outcome,
						...decision.error ? { error: decision.error } : {}
					});
					continue;
				}
				if (input.input.op === "continue") {
					const operation = this.createTurnOperation();
					this.bindTurn(input.inputId, operation);
					this.enqueueTurn({
						operation,
						inputId: input.inputId,
						principal: input.principal,
						context: input.input.context,
						overrides: decision.overrides,
						isContinue: true
					});
					continue;
				}
				const steer = {
					inputId: input.inputId,
					message: input.input.message,
					principal: input.principal,
					context: input.input.context,
					overrides: decision.overrides
				};
				if (input.delivery === "steer" && this.activeTurn) {
					this.steerQueue.push(steer);
					continue;
				}
				this.enqueueTurn(this.steerTurn(steer));
				continue;
			}
			const first = chainInputOf(writer.state.inputs, input);
			if (input.status !== "applied" || !(isChat || first)) continue;
			const leases = this.persistence.stores.leases;
			const run = input.operationId ? await runs?.get(input.operationId) : null;
			const now = Date.now();
			if ((leases && input.operationId ? await leases.isAlive({
				threadId: this.threadId,
				inputId: input.inputId,
				operationId: input.operationId,
				attempt: input.attempt
			}) : run?.status === "running" && run.leaseExpiresAt !== void 0 && run.leaseExpiresAt >= now) || isTaken(input)) continue;
			if (first) {
				if (!run || run.status === "running") {
					const isResumable = first.input.resume === true;
					if (isResumable && input.attempt < maxAttempts) {
						if (input.operationId) await runs?.update(input.operationId, {
							status: "failed",
							finishedAt: now,
							error: { message: "The host stopped. The session continued this agent run in a new run." }
						});
						this.resumeAgent(input, first);
						continue;
					}
					await this.failStoppedAgent({
						operationId: input.operationId ?? "",
						agent: first.input.agent,
						inputId: input.inputId,
						wake: first.input.detached,
						...input.principal ? { principal: input.principal } : {},
						...isResumable ? { error: {
							message: `The agent run stopped the host ${input.attempt} times.`,
							code: "attempts_exhausted"
						} } : {}
					});
				}
				continue;
			}
			if (run?.status === "running") await runs?.update(run.runId, {
				status: "failed",
				finishedAt: now,
				error: { message: "The host stopped during this turn." }
			});
			const operationId = input.operationId;
			const joined = this.joinedInputs(operationId ?? "", input.inputId);
			const ended = (settlement) => this.settle(...[input.inputId, ...joined].map((inputId) => ({
				inputId,
				...operationId ? { operationId } : {},
				...settlement
			})));
			const fallback = hasFinalAnswer(writer.state.messages, input.appliedAt ?? 0) ? {
				action: "settle",
				outcome: "completed"
			} : input.abortRequested ? {
				action: "settle",
				outcome: "aborted"
			} : input.attempt >= maxAttempts ? {
				action: "settle",
				outcome: "failed",
				error: {
					message: `The input stopped the host ${input.attempt} times.`,
					code: "attempts_exhausted"
				}
			} : input.timeoutAt !== void 0 && now >= input.timeoutAt ? {
				action: "settle",
				outcome: "failed",
				error: {
					message: "The input passed its time limit.",
					code: "timeout"
				}
			} : { action: "run" };
			const pending = [...run?.checkpoint?.pendingTools ?? [], ...[...writer.state.started].filter(([toolCallId]) => !writer.state.toolResults.has(toolCallId)).map(([toolCallId, tool]) => ({
				toolCallId,
				...tool
			}))];
			const interruptedTools = input.input.op === "resolve" ? [] : repairSteps(writer.state.messages, pending, writer.state.toolResults).filter((step) => "reason" in step);
			const decision = await this.recoverDecision(writer, input, fallback, interruptedTools);
			if (decision.action === "settle") {
				await ended({
					outcome: decision.outcome,
					...decision.error ? { error: decision.error } : {}
				});
				continue;
			}
			if (input.input.op === "resolve") {
				const store = this.persistence.stores.interrupts;
				const records = store ? await Promise.all(input.input.resume.map((item) => store.get(item.interruptId))) : [];
				const consumed = records.length > 0 && records.every((record) => record !== null && record.threadId === this.threadId && record.status !== "pending");
				const newPhase = this.interrupted && this.interrupted.runId === operationId;
				if (consumed || newPhase || !this.interrupted && run?.status === "completed") {
					await ended({ outcome: this.interrupted ? "interrupted" : "completed" });
					continue;
				}
				if (!this.interrupted) {
					await ended({
						outcome: "failed",
						error: { message: "The interrupted turn is no longer available." }
					});
					continue;
				}
				const operation = this.createTurnOperation();
				this.bindTurn(input.inputId, operation);
				this.feed.publish(operation.id, customEvent(HARNESS_EVENTS.operationResumed, {
					operationId: operation.id,
					...operationId ? { resumedFrom: operationId } : {}
				}));
				this.enqueueTurn({
					operation,
					inputId: input.inputId,
					resume: input.input.resume,
					answers: this.interrupted,
					principal: input.principal,
					context: this.interrupted.context,
					overrides: decision.overrides
				});
				continue;
			}
			const cutOff = this.harness.durability?.continueCutOff;
			const partial = cutOff && operationId ? await this.cutOffAnswer(writer, operationId) : void 0;
			await repairTranscript({
				messages: this.messages,
				threadId: this.threadId,
				pending,
				finished: writer.state.toolResults,
				interrupted: this.harness.durability?.interruptedToolResult,
				truncated: this.harness.durability?.truncatedToolResult
			});
			if (partial && (partial.text !== "" || partial.thinking.length > 0)) {
				const history = await this.messages.loadThread(this.threadId);
				const notes = [typeof cutOff === "object" && cutOff.note || "The previous answer was cut off. Continue exactly where it stopped, without repeating it."].flat();
				await this.messages.saveThread(this.threadId, [
					...history,
					{
						id: createMessageId(),
						role: "assistant",
						content: partial.text || null,
						...partial.thinking.length > 0 ? { thinking: partial.thinking } : {}
					},
					...notes.map((content) => ({
						id: createMessageId(),
						role: "user",
						content
					}))
				]);
			}
			const operation = this.createTurnOperation();
			this.bindTurn(input.inputId, operation);
			this.feed.publish(operation.id, customEvent(HARNESS_EVENTS.operationResumed, {
				operationId: operation.id,
				...operationId ? { resumedFrom: operationId } : {}
			}));
			const sent = input.input;
			this.enqueueTurn({
				operation,
				inputId: input.inputId,
				principal: input.principal,
				..."message" in sent ? { sentMessage: sent.message } : {},
				..."context" in sent ? { context: sent.context } : {},
				overrides: decision.overrides
			});
		}
	}
};
//#endregion
export { DEFAULT_SUBAGENT_LIMITS, HarnessSession, acceptedKinds };

//# sourceMappingURL=session.js.map