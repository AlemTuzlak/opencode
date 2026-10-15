import { reconcileToolCallArguments } from "../../../utilities/tool-call-arguments.js";
import { EventType } from "../../../types.js";
import { mergeMetadata, tanstackMetadata, withTanstackMetadata } from "../../../utilities/merge-metadata.js";
import { isRedactedThinkingId } from "../../../utilities/reasoning-encrypted-value.js";
import { runErrorEventToError } from "../../../utilities/errors.js";
import { INTERRUPT_BINDING_METADATA_KEY } from "../../../interrupt-resume.js";
import { isAssistantSegmentOf, isProviderExecutedToolCall } from "../../../utilities/provider-executed.js";
import { isContentPartArray, isToolResultOutcome, normalizeToolResult, toolResultErrorText } from "../../../utilities/tool-result.js";
import { splitSubagentWire } from "../../../utilities/subagent-wire.js";
import { aguiContentToContentParts, aguiSnapshotMessageToUIMessage, coerceCreatedAt, generateMessageId, uiMessageToModelMessages } from "../messages.js";
import { applyActivityDeltaToUIMessages, applyActivitySnapshotToUIMessages } from "../activity-records.js";
import { getChunkRunId } from "../../../utilities/chunk-ids.js";
import { defaultJSONParser } from "./json-parser.js";
import { appendStructuredOutputDelta, completeStructuredOutputPart, errorStructuredOutputPart, updateTextPart, updateThinkingPart, updateToolCallApproval, updateToolCallApprovalResponse, updateToolCallPart, updateToolCallWithOutput, updateToolResultPart } from "./message-updaters.js";
import { ImmediateStrategy } from "./strategies.js";
//#region src/activities/chat/stream/processor.ts
/**
* Unified Stream Processor
*
* Core stream processing engine that manages the full UIMessage[] conversation.
* Single source of truth for message state.
*
* Handles:
* - Full conversation management (UIMessage[])
* - Text content accumulation with configurable chunking strategies
* - Parallel tool calls with lifecycle state tracking
* - Tool results and approval flows
* - Thinking/reasoning content
* - Recording/replay for testing
* - Event-driven architecture for UI updates
* - Per-message stream state tracking for multi-message sessions
*
* @see docs/chat-architecture.md — Canonical reference for AG-UI chunk ordering,
*   adapter contract, single-shot flows, and expected UIMessage output.
*/
var STRUCTURED_OUTPUT_UPDATE_BATCH_SIZE = 12;
/**
* Events that leave this processor's open *_CHUNK stream open.
* RAW, activity events, and REASONING_ENCRYPTED_VALUE match the AG-UI client.
* Subagent lifecycle events stay here too: the child processor owns that
* lane, and SUBAGENT_FINISHED or SUBAGENT_ERROR finalizes the child.
*/
var CHUNK_PASS_THROUGH = /* @__PURE__ */ new Set([
	"RAW",
	"ACTIVITY_SNAPSHOT",
	"ACTIVITY_DELTA",
	"REASONING_ENCRYPTED_VALUE",
	"SUBAGENT_STARTED",
	"SUBAGENT_FINISHED",
	"SUBAGENT_ERROR"
]);
/** A run-level event closes every open shorthand lane, including children. */
var RUN_LEVEL_CLOSES_LANES = /* @__PURE__ */ new Set([
	"RUN_STARTED",
	"RUN_FINISHED",
	"RUN_ERROR",
	"MESSAGES_SNAPSHOT"
]);
function interruptBatchHasGeneric(interrupts) {
	return interrupts.some((interrupt) => {
		const metadata = interrupt.metadata;
		if (!metadata || typeof metadata !== "object" || Array.isArray(metadata)) return false;
		const binding = metadata[INTERRUPT_BINDING_METADATA_KEY];
		return binding !== null && typeof binding === "object" && !Array.isArray(binding) && binding.kind === "generic";
	});
}
/**
* The input of a tool call from its raw arguments: `{}` for an empty string,
* `undefined` when the arguments are not complete JSON (for example cut off)
* or are `null`.
*/
function parseToolArguments(args) {
	if (args.trim() === "") return {};
	try {
		return JSON.parse(args) ?? void 0;
	} catch {
		return;
	}
}
/**
* StreamProcessor - State machine for processing AI response streams
*
* Manages the full UIMessage[] conversation and emits events on changes.
* Trusts the adapter contract: adapters emit clean AG-UI events in the
* correct order.
*
* State tracking:
* - Full message array
* - Per-message stream state (text, tool calls, thinking)
* - Multiple concurrent message streams
* - Tool call completion via TOOL_CALL_END events
*
* @see docs/chat-architecture.md#streamprocessor-internal-state — State field reference
* @see docs/chat-architecture.md#adapter-contract — What this class expects from adapters
*/
var StreamProcessor = class StreamProcessor {
	chunkStrategy;
	events;
	jsonParser;
	recordingEnabled;
	messages = [];
	messageStates = /* @__PURE__ */ new Map();
	activeMessageIds = /* @__PURE__ */ new Set();
	toolCallToMessage = /* @__PURE__ */ new Map();
	pendingManualMessageId = null;
	provisionalMessageId = null;
	legacyManualMessage = false;
	pendingThinkingStepId = null;
	pendingReasoningMessageId = null;
	unboundThinkingStepId = null;
	pendingReasoningAliases = /* @__PURE__ */ new Map();
	openChunk = null;
	structuredMessageIds = /* @__PURE__ */ new Set();
	structuredOutputUpdateBatches = /* @__PURE__ */ new Map();
	activeRuns = /* @__PURE__ */ new Set();
	callMessageIds = /* @__PURE__ */ new Map();
	unassignedCallMessageIds = /* @__PURE__ */ new Set();
	runToolCallIds = [];
	toolCallsSentToClient = /* @__PURE__ */ new Set();
	childProcessors = /* @__PURE__ */ new Map();
	childToolCalls = /* @__PURE__ */ new Map();
	finishReason = null;
	hasError = false;
	isDone = false;
	streamEndEmitted = false;
	recording = null;
	recordingStartTime = 0;
	subagentRunId;
	constructor(options = {}) {
		this.subagentRunId = options.subagentRunId;
		this.chunkStrategy = options.chunkStrategy || new ImmediateStrategy();
		this.events = options.events || {};
		this.jsonParser = options.jsonParser || defaultJSONParser;
		this.recordingEnabled = options.recording ?? false;
		if (options.initialMessages) this.messages = [...options.initialMessages];
	}
	/**
	* Set the messages array (e.g., from persisted state)
	*/
	setMessages(messages) {
		this.messages = [...messages];
		for (const state of this.messageStates.values()) this.hydrateThinkingState(state);
		this.removeMessagesAfter(this.messages.length - 1);
	}
	/**
	* Put older UI messages at the front of the conversation.
	*
	* Skip a message if its id is already in the list. Keep the existing message.
	* Then emit the same messages-change event as `setMessages`.
	*
	* Use this for older history pages. The first hydrate window uses `setMessages`.
	*
	* @param messages Older UI messages in insertion order. The first item is the oldest.
	*
	* @example
	* ```ts
	* processor.setMessages([newest])
	* processor.prependMessages([oldest])
	* ```
	*/
	prependMessages(messages) {
		const existingIds = new Set(this.messages.map((message) => message.id));
		const olderMessages = [];
		for (const message of messages) {
			if (existingIds.has(message.id)) continue;
			existingIds.add(message.id);
			olderMessages.push(message);
		}
		this.messages = [...olderMessages, ...this.messages];
		this.emitMessagesChange();
	}
	/**
	* Add a user message to the conversation.
	* Supports both simple string content and multimodal content arrays.
	*
	* @param content - The message content (string or array of content parts)
	* @param id - Optional custom message ID (generated if not provided)
	* @param metadata - Optional AG-UI metadata bag
	* @returns The created UIMessage
	*
	* @example
	* ```ts
	* // Simple text message
	* processor.addUserMessage('Hello!')
	*
	* // Multimodal message with image
	* processor.addUserMessage([
	*   { type: 'text', content: 'What is in this image?' },
	*   { type: 'image', source: { type: 'url', value: 'https://example.com/photo.jpg' } }
	* ])
	*
	* // With custom ID
	* processor.addUserMessage('Hello!', 'custom-id-123')
	* ```
	*/
	addUserMessage(content, id, metadata) {
		const parts = typeof content === "string" ? [{
			type: "text",
			content
		}] : content.map((part) => {
			return part;
		});
		const userMessage = {
			id: id ?? generateMessageId(),
			role: "user",
			parts,
			createdAt: /* @__PURE__ */ new Date(),
			...metadata != null ? { metadata } : {}
		};
		this.messages = [...this.messages, userMessage];
		this.emitMessagesChange();
		return userMessage;
	}
	/**
	* Prepare for a new assistant message stream.
	* Does NOT create the message immediately -- the message is created lazily
	* when the first content-bearing chunk arrives via ensureAssistantMessage().
	* This prevents empty assistant messages from flickering in the UI when
	* auto-continuation produces no content.
	*/
	prepareAssistantMessage() {
		this.resetStreamState();
	}
	/**
	* @deprecated Use prepareAssistantMessage() instead. This eagerly creates
	* an assistant message which can cause empty message flicker.
	*/
	startAssistantMessage(messageId) {
		this.prepareAssistantMessage();
		const { messageId: id } = this.ensureAssistantMessage(messageId);
		this.pendingManualMessageId = id;
		this.legacyManualMessage = true;
		return id;
	}
	/**
	* Get the current assistant message ID (if one has been created).
	* Returns null if prepareAssistantMessage() was called but no content
	* has arrived yet.
	*/
	getCurrentAssistantMessageId() {
		let lastId = null;
		for (const [id, state] of this.messageStates) if (state.role === "assistant") lastId = id;
		return lastId;
	}
	/**
	* Add a tool result (called by client after handling onToolCall)
	*/
	addToolResult(toolCallId, output, error) {
		const messageWithToolCall = this.messages.find((msg) => msg.parts.some((p) => p.type === "tool-call" && p.id === toolCallId));
		if (!messageWithToolCall) {
			const owner = this.childOwningToolCall((part) => part.id === toolCallId);
			if (owner !== void 0) {
				this.updateChild(owner, (child) => child.addToolResult(toolCallId, output, error));
				return;
			}
			console.warn(`[StreamProcessor] Could not find message with tool call ${toolCallId}`);
			return;
		}
		let updatedMessages = updateToolCallWithOutput(this.messages, toolCallId, output, error ? "error" : void 0, error);
		const content = normalizeToolResult(output);
		const toolResultState = error ? "error" : "complete";
		updatedMessages = updateToolResultPart(updatedMessages, messageWithToolCall.id, toolCallId, content, toolResultState, error);
		this.messages = updatedMessages;
		this.emitMessagesChange();
	}
	/**
	* Add an approval response (called by client after handling onApprovalRequest)
	*/
	addToolApprovalResponse(approvalId, approved) {
		const owner = this.childOwningToolCall((part) => part.approval?.id === approvalId);
		if (owner !== void 0) {
			this.updateChild(owner, (child) => child.addToolApprovalResponse(approvalId, approved));
			return;
		}
		this.messages = updateToolCallApprovalResponse(this.messages, approvalId, approved);
		this.emitMessagesChange();
	}
	/**
	* Get the conversation as ModelMessages (for sending to LLM)
	*/
	toModelMessages() {
		const modelMessages = [];
		for (const msg of this.messages) modelMessages.push(...uiMessageToModelMessages(msg));
		return modelMessages;
	}
	/**
	* Get current messages
	*/
	getMessages() {
		return this.messages;
	}
	/**
	* Check if all tool calls in the last assistant message are complete
	* Useful for auto-continue logic
	*/
	areAllToolsComplete() {
		const lastAssistant = this.messages.findLast((m) => m.role === "assistant");
		if (!lastAssistant) return true;
		const toolParts = lastAssistant.parts.filter((p) => p.type === "tool-call");
		if (toolParts.length === 0) return true;
		const toolResultIds = new Set(lastAssistant.parts.filter((p) => p.type === "tool-result").map((p) => p.toolCallId));
		return toolParts.every((part) => part.state === "complete" || part.state === "approval-responded" || part.output !== void 0 && !part.approval || toolResultIds.has(part.id) || isProviderExecutedToolCall(part));
	}
	/**
	* Remove messages after a certain index (for reload/retry)
	*/
	removeMessagesAfter(index) {
		const keptIds = new Set(this.messages.slice(0, index + 1).map((m) => m.id));
		this.pendingThinkingStepId = null;
		this.pendingReasoningMessageId = null;
		this.unboundThinkingStepId = null;
		this.pendingReasoningAliases.clear();
		for (const id of this.structuredMessageIds) if (!keptIds.has(id)) this.structuredMessageIds.delete(id);
		for (const id of this.structuredOutputUpdateBatches.keys()) if (!keptIds.has(id)) this.structuredOutputUpdateBatches.delete(id);
		for (const id of this.messageStates.keys()) if (!keptIds.has(id)) this.messageStates.delete(id);
		for (const [toolCallId, msgId] of this.toolCallToMessage) if (!keptIds.has(msgId)) this.toolCallToMessage.delete(toolCallId);
		for (const id of this.activeMessageIds) if (!keptIds.has(id)) this.activeMessageIds.delete(id);
		if (this.provisionalMessageId && !keptIds.has(this.provisionalMessageId)) this.provisionalMessageId = null;
		if (this.pendingManualMessageId && !keptIds.has(this.pendingManualMessageId)) this.pendingManualMessageId = null;
		for (const ids of this.callMessageIds.values()) for (const id of ids) if (!keptIds.has(id)) ids.delete(id);
		for (const id of this.unassignedCallMessageIds) if (!keptIds.has(id)) this.unassignedCallMessageIds.delete(id);
		this.messages = this.messages.slice(0, index + 1);
		this.emitMessagesChange();
	}
	/**
	* Clear all messages
	*/
	clearMessages() {
		for (const ids of this.callMessageIds.values()) ids.clear();
		this.unassignedCallMessageIds.clear();
		this.messages = [];
		this.messageStates.clear();
		this.activeMessageIds.clear();
		this.toolCallToMessage.clear();
		this.structuredMessageIds.clear();
		this.structuredOutputUpdateBatches.clear();
		this.pendingManualMessageId = null;
		this.provisionalMessageId = null;
		this.legacyManualMessage = false;
		this.openChunk = null;
		this.childProcessors.clear();
		this.childToolCalls.clear();
		this.pendingThinkingStepId = null;
		this.pendingReasoningMessageId = null;
		this.unboundThinkingStepId = null;
		this.pendingReasoningAliases.clear();
		this.emitMessagesChange();
	}
	/**
	* Process a stream and emit events through handlers
	*/
	async process(stream) {
		this.resetStreamState();
		if (this.recordingEnabled) this.startRecording();
		for await (const chunk of stream) this.processChunk(chunk);
		this.finalizeStream();
		if (this.recording) this.recording.result = this.getResult();
		return this.getResult();
	}
	/**
	* Process a single chunk from the stream.
	*
	* Central dispatch for all AG-UI events. Each event type maps to a specific
	* handler. Events not listed in the switch are intentionally ignored
	* (STATE_SNAPSHOT, STATE_DELTA).
	*
	* @see docs/chat-architecture.md#adapter-contract — Expected event types and ordering
	*/
	processChunk(chunk) {
		if (this.recording) this.recording.chunks.push({
			chunk,
			timestamp: Date.now(),
			index: this.recording.chunks.length
		});
		if (this.routeToChild(chunk)) return;
		for (const event of this.expandChunk(chunk)) this.dispatchChunk(event);
	}
	/** Send one event, after expandChunk(), to its handler. */
	dispatchChunk(chunk) {
		switch (chunk.type) {
			case "SUBAGENT_STARTED":
				this.handleSubagentStartedEvent(chunk);
				break;
			case "SUBAGENT_FINISHED":
				this.handleSubagentFinishedEvent(chunk);
				break;
			case "SUBAGENT_ERROR":
				this.handleSubagentErrorEvent(chunk);
				break;
			case "TEXT_MESSAGE_START":
				this.handleTextMessageStartEvent(chunk);
				break;
			case "TEXT_MESSAGE_CONTENT":
				this.handleTextMessageContentEvent(chunk);
				break;
			case "TEXT_MESSAGE_END":
				this.handleTextMessageEndEvent(chunk);
				break;
			case "TOOL_CALL_START":
				this.handleToolCallStartEvent(chunk);
				break;
			case "TOOL_CALL_ARGS":
				this.handleToolCallArgsEvent(chunk);
				break;
			case "TOOL_CALL_END":
				this.handleToolCallEndEvent(chunk);
				break;
			case "RUN_FINISHED":
				this.handleRunFinishedEvent(chunk);
				break;
			case "RUN_ERROR":
				this.handleRunErrorEvent(chunk);
				break;
			case "STEP_FINISHED":
				this.handleStepFinishedEvent(chunk);
				break;
			case "MESSAGES_SNAPSHOT":
				this.handleMessagesSnapshotEvent(chunk);
				break;
			case "CUSTOM":
				this.handleCustomEvent(chunk);
				break;
			case "RUN_STARTED":
				this.handleRunStartedEvent(chunk);
				break;
			case "REASONING_MESSAGE_START":
				this.handleReasoningMessageStartEvent(chunk);
				break;
			case "REASONING_START":
			case "REASONING_MESSAGE_END":
			case "REASONING_END": break;
			case "REASONING_MESSAGE_CONTENT":
				this.handleReasoningMessageContentEvent(chunk);
				break;
			case "REASONING_ENCRYPTED_VALUE":
				this.handleReasoningEncryptedValueEvent(chunk);
				break;
			case "TOOL_CALL_RESULT":
				this.handleToolCallResultEvent(chunk);
				break;
			case "STEP_STARTED":
				this.handleStepStartedEvent(chunk);
				break;
			case "ACTIVITY_SNAPSHOT":
				this.handleActivitySnapshotEvent(chunk);
				break;
			case "ACTIVITY_DELTA": this.handleActivityDeltaEvent(chunk);
		}
	}
	/**
	* AG-UI lets a producer send one TEXT_MESSAGE_CHUNK, TOOL_CALL_CHUNK or
	* REASONING_MESSAGE_CHUNK in place of the START / CONTENT (ARGS) / END
	* events. A chunk with a new id opens a stream. A chunk with the same id or
	* no id continues it. Any other event closes it, except the ones in
	* CHUNK_PASS_THROUGH. Expand the shorthand into the START / CONTENT (ARGS)
	* / END events, so both forms build the same message.
	*/
	expandChunk(chunk) {
		const open = this.openChunk;
		const timestamp = chunk.timestamp;
		switch (chunk.type) {
			case "TEXT_MESSAGE_CHUNK": {
				const id = this.chunkStreamId("TEXT_MESSAGE", chunk.messageId, chunk.type);
				if (id === void 0) return this.closeChunk();
				const events = [];
				if (open?.family !== "TEXT_MESSAGE" || open.id !== id) {
					events.push(...this.closeChunk(), {
						type: EventType.TEXT_MESSAGE_START,
						messageId: id,
						role: chunk.role ?? "assistant",
						...chunk.name !== void 0 ? { name: chunk.name } : {},
						timestamp
					});
					this.openChunk = {
						family: "TEXT_MESSAGE",
						id
					};
				}
				if (chunk.delta !== void 0 || chunk.metadata !== void 0) events.push({
					type: EventType.TEXT_MESSAGE_CONTENT,
					messageId: id,
					delta: chunk.delta ?? "",
					metadata: chunk.metadata,
					timestamp
				});
				return events;
			}
			case "TOOL_CALL_CHUNK": {
				const id = this.chunkStreamId("TOOL_CALL", chunk.toolCallId, chunk.type);
				if (id === void 0) return this.closeChunk();
				const events = [];
				if (open?.family !== "TOOL_CALL" || open.id !== id) {
					if (chunk.toolCallName === void 0) {
						console.warn(`[StreamProcessor] Dropped TOOL_CALL_CHUNK ${id}: the first chunk of a tool call needs a toolCallName`);
						return this.closeChunk();
					}
					events.push(...this.closeChunk(), {
						type: EventType.TOOL_CALL_START,
						toolCallId: id,
						toolCallName: chunk.toolCallName,
						parentMessageId: chunk.parentMessageId,
						metadata: chunk.metadata,
						timestamp
					});
					this.openChunk = {
						family: "TOOL_CALL",
						id
					};
				}
				if (chunk.delta !== void 0 || chunk.metadata !== void 0) events.push({
					type: EventType.TOOL_CALL_ARGS,
					toolCallId: id,
					delta: chunk.delta ?? "",
					...chunk.metadata !== void 0 ? { metadata: chunk.metadata } : {},
					timestamp
				});
				return events;
			}
			case "REASONING_MESSAGE_CHUNK": {
				const id = this.chunkStreamId("REASONING_MESSAGE", chunk.messageId, chunk.type);
				if (id === void 0) return this.closeChunk();
				const events = [];
				if (open?.family !== "REASONING_MESSAGE" || open.id !== id) {
					events.push(...this.closeChunk(), {
						type: EventType.REASONING_MESSAGE_START,
						messageId: id,
						role: "reasoning",
						timestamp
					});
					this.openChunk = {
						family: "REASONING_MESSAGE",
						id
					};
				}
				if (chunk.delta !== void 0 || chunk.metadata !== void 0) events.push({
					type: EventType.REASONING_MESSAGE_CONTENT,
					messageId: id,
					delta: chunk.delta ?? "",
					...chunk.metadata !== void 0 ? { metadata: chunk.metadata } : {},
					timestamp
				});
				return events;
			}
			default: {
				const events = open && !CHUNK_PASS_THROUGH.has(chunk.type) ? this.closeChunk() : [];
				if (RUN_LEVEL_CLOSES_LANES.has(chunk.type)) this.closeChildChunkLanes();
				return [...events, chunk];
			}
		}
	}
	/** Synthesize *_END on every nested shorthand lane and apply those events there. */
	closeChildChunkLanes() {
		for (const child of this.childProcessors.values()) {
			for (const event of child.closeChunk()) child.dispatchChunk(event);
			child.closeChildChunkLanes();
		}
	}
	/**
	* The child an untagged chunk with no id continues: the only child whose
	* subtree has an open chunk stream of its kind, when this processor has
	* none. The AG-UI client resolves a chunk that tags only its opener the
	* same way.
	*/
	childContinuing(chunk) {
		let family;
		if (chunk.type === "TEXT_MESSAGE_CHUNK" && chunk.messageId === void 0) family = "TEXT_MESSAGE";
		else if (chunk.type === "REASONING_MESSAGE_CHUNK" && chunk.messageId === void 0) family = "REASONING_MESSAGE";
		else if (chunk.type === "TOOL_CALL_CHUNK" && chunk.toolCallId === void 0) family = "TOOL_CALL";
		else return;
		if (this.openChunkCount(family) !== 1) return void 0;
		for (const [id, child] of this.childProcessors) if (child.openChunkCount(family) === 1) return id;
	}
	/**
	* How many open chunk streams of a kind this processor and all its nested
	* children hold.
	*/
	openChunkCount(family) {
		let count = this.openChunk?.family === family ? 1 : 0;
		for (const child of this.childProcessors.values()) count += child.openChunkCount(family);
		return count;
	}
	/**
	* The id a chunk opens or continues. A chunk with no id continues. If it
	* continues nothing, the caller drops it and closes the open stream, so a
	* later chunk with no id cannot continue that stream either.
	*/
	chunkStreamId(family, id, type) {
		if (id !== void 0) return id;
		if (this.openChunk?.family === family) return this.openChunk.id;
		console.warn(`[StreamProcessor] Dropped ${type}: it has no id and continues nothing`);
	}
	closeChunk() {
		const open = this.openChunk;
		if (!open) return [];
		this.openChunk = null;
		const timestamp = Date.now();
		switch (open.family) {
			case "TEXT_MESSAGE": return [{
				type: EventType.TEXT_MESSAGE_END,
				messageId: open.id,
				timestamp
			}];
			case "TOOL_CALL": return [{
				type: EventType.TOOL_CALL_END,
				toolCallId: open.id,
				timestamp
			}];
			case "REASONING_MESSAGE": return [{
				type: EventType.REASONING_MESSAGE_END,
				messageId: open.id,
				timestamp
			}];
		}
	}
	/**
	* Create a new MessageStreamState for a message
	*/
	createMessageState(messageId, role) {
		const state = {
			id: messageId,
			role,
			totalTextContent: "",
			currentSegmentText: "",
			lastEmittedText: "",
			hasSeenReasoningEvents: false,
			thinkingSteps: /* @__PURE__ */ new Map(),
			thinkingStepSignatures: /* @__PURE__ */ new Map(),
			reasoningStepAliases: /* @__PURE__ */ new Map(),
			redactedThinkingSteps: /* @__PURE__ */ new Set(),
			thinkingStepOrder: [],
			currentThinkingStepId: null,
			toolCalls: /* @__PURE__ */ new Map(),
			toolCallOrder: [],
			hasToolCallsSinceTextStart: false,
			isComplete: false
		};
		this.hydrateThinkingState(state);
		this.messageStates.set(messageId, state);
		return state;
	}
	hydrateThinkingState(state) {
		const aliases = new Map(state.reasoningStepAliases);
		const currentStep = state.currentThinkingStepId;
		state.thinkingSteps.clear();
		state.thinkingStepSignatures.clear();
		state.reasoningStepAliases.clear();
		state.redactedThinkingSteps.clear();
		state.thinkingStepOrder = [];
		state.currentThinkingStepId = null;
		const existing = this.messages.find((message) => message.id === state.id);
		for (const part of existing?.parts ?? []) {
			if (part.type !== "thinking" || !part.stepId) continue;
			state.thinkingSteps.set(part.stepId, part.redacted ? "" : part.content);
			if (part.signature !== void 0) state.thinkingStepSignatures.set(part.stepId, part.signature);
			if (part.redacted) state.redactedThinkingSteps.add(part.stepId);
			state.reasoningStepAliases.set(part.stepId, part.stepId);
			state.thinkingStepOrder.push(part.stepId);
		}
		for (const [alias, step] of aliases) if (state.thinkingSteps.has(step)) state.reasoningStepAliases.set(alias, step);
		if (currentStep && state.thinkingSteps.has(currentStep)) state.currentThinkingStepId = currentStep;
	}
	/**
	* Get the MessageStreamState for a message
	*/
	getMessageState(messageId) {
		return this.messageStates.get(messageId);
	}
	/**
	* Promote a pending stepId from a STEP_STARTED that fired before the
	* assistant message existed onto the given message state, so the next
	* thinking event (STEP_FINISHED or REASONING_MESSAGE_CONTENT) attributes
	* to the correct step.
	*/
	consumePendingThinkingStep(state) {
		for (const [id, step] of this.pendingReasoningAliases) {
			state.reasoningStepAliases.set(id, step);
			if (!state.thinkingSteps.has(step)) {
				state.thinkingSteps.set(step, "");
				state.thinkingStepOrder.push(step);
			}
		}
		this.pendingReasoningAliases.clear();
		if (!this.pendingThinkingStepId) return;
		const stepId = this.pendingThinkingStepId;
		state.currentThinkingStepId = stepId;
		if (!state.thinkingSteps.has(stepId)) {
			state.thinkingSteps.set(stepId, "");
			state.thinkingStepOrder.push(stepId);
		}
		this.pendingThinkingStepId = null;
	}
	/**
	* Get the most recent active assistant message ID.
	* Used as fallback for events that don't include a messageId.
	*/
	getActiveAssistantMessageId() {
		const belongsToCurrentCall = (id) => this.activeRuns.size === 0 || [...this.activeRuns].some((runId) => this.callMessageIds.get(runId)?.has(id)) || this.pendingManualMessageId === id && !this.messageStates.get(id)?.isComplete && !this.isDone;
		const ids = Array.from(this.activeMessageIds).reverse();
		for (const id of ids) {
			const state = this.messageStates.get(id);
			if (state && state.role === "assistant" && belongsToCurrentCall(id)) return id;
		}
		for (const [id, state] of [...this.messageStates].reverse()) if (state.role === "assistant" && belongsToCurrentCall(id)) return id;
		return null;
	}
	resumeAssistantState(id, state) {
		this.activeMessageIds.add(id);
		if (state.isComplete || this.isDone) {
			state.isComplete = false;
			this.isDone = false;
		}
	}
	/**
	* Ensure an active assistant message exists, creating one if needed.
	* Used for backward compat when events arrive without prior TEXT_MESSAGE_START.
	*
	* On reconnect/resume, a TEXT_MESSAGE_CONTENT may arrive for a message that
	* already exists in this.messages (e.g. from initialMessages or a prior
	* MESSAGES_SNAPSHOT) but whose transient state was cleared. In that case we
	* hydrate state from the existing message rather than creating a duplicate.
	*/
	/** Give a generated current-call row its first provider message ID. */
	remapProvisionalMessage(messageId) {
		const previousId = this.provisionalMessageId;
		if (!previousId || previousId === messageId || this.messages.some((message) => message.id === messageId)) return;
		const state = this.messageStates.get(previousId);
		if (!state || state.isComplete) return;
		this.messages = this.messages.map((message) => message.id === previousId ? {
			...message,
			id: messageId
		} : message);
		state.id = messageId;
		this.messageStates.delete(previousId);
		this.messageStates.set(messageId, state);
		if (this.activeMessageIds.delete(previousId)) this.activeMessageIds.add(messageId);
		for (const [toolId, targetId] of this.toolCallToMessage) if (targetId === previousId) this.toolCallToMessage.set(toolId, messageId);
		for (const ids of this.callMessageIds.values()) if (ids.delete(previousId)) ids.add(messageId);
		if (this.unassignedCallMessageIds.delete(previousId)) this.unassignedCallMessageIds.add(messageId);
		if (this.structuredMessageIds.delete(previousId)) this.structuredMessageIds.add(messageId);
		const batch = this.structuredOutputUpdateBatches.get(previousId);
		if (batch) {
			this.structuredOutputUpdateBatches.delete(previousId);
			this.structuredOutputUpdateBatches.set(messageId, batch);
		}
		if (this.pendingManualMessageId === previousId) this.pendingManualMessageId = messageId;
		this.provisionalMessageId = null;
		this.legacyManualMessage = false;
	}
	ensureAssistantMessage(preferredId) {
		if (preferredId) {
			this.remapProvisionalMessage(preferredId);
			const state = this.getMessageState(preferredId);
			if (state) {
				this.resumeAssistantState(preferredId, state);
				return {
					messageId: preferredId,
					state
				};
			}
		}
		const activeId = this.getActiveAssistantMessageId();
		if (activeId && (preferredId === void 0 || preferredId === activeId)) {
			const state = this.getMessageState(activeId);
			if (state) {
				this.resumeAssistantState(activeId, state);
				return {
					messageId: activeId,
					state
				};
			}
		}
		if (preferredId) {
			const existingMsg = this.messages.find((m) => m.id === preferredId);
			if (existingMsg?.role === "activity") preferredId = void 0;
			else if (existingMsg) {
				const state = this.createMessageState(preferredId, existingMsg.role);
				this.activeMessageIds.add(preferredId);
				const lastPart = existingMsg.parts.length > 0 ? existingMsg.parts[existingMsg.parts.length - 1] : null;
				if (lastPart && lastPart.type === "text") {
					state.currentSegmentText = lastPart.content;
					state.lastEmittedText = lastPart.content;
					state.totalTextContent = lastPart.content;
				}
				return {
					messageId: preferredId,
					state
				};
			}
		}
		const id = preferredId || generateMessageId();
		const assistantMessage = {
			id,
			role: "assistant",
			parts: [],
			createdAt: /* @__PURE__ */ new Date()
		};
		this.messages = [...this.messages, assistantMessage];
		const state = this.createMessageState(id, "assistant");
		this.activeMessageIds.add(id);
		this.pendingManualMessageId = id;
		if (!preferredId) this.provisionalMessageId = id;
		this.events.onStreamStart?.();
		this.emitMessagesChange();
		return {
			messageId: id,
			state
		};
	}
	/**
	* Merge event metadata onto a UIMessage. `tanstack` is deep-merged so a
	* later delta does not wipe `tanstack.model`. High-frequency leftover
	* keys (`content`, `args`) never stamp onto the message.
	* Rebuilds `createdAt` when `tanstack.createdAt` is an ISO string.
	*/
	mergeMessageMetadata(messageId, incoming) {
		const runId = tanstackMetadata({ metadata: incoming !== null && typeof incoming === "object" ? { ...incoming } : void 0 })?.runId ?? (this.activeRuns.size === 1 ? [...this.activeRuns][0] : void 0);
		if (runId !== void 0) {
			const ids = this.callMessageIds.get(runId) ?? /* @__PURE__ */ new Set();
			ids.add(messageId);
			this.callMessageIds.set(runId, ids);
		} else this.unassignedCallMessageIds.add(messageId);
		if (incoming == null || typeof incoming !== "object" || Array.isArray(incoming)) return;
		const message = this.messages.find((msg) => msg.id === messageId);
		if (!message) return;
		const incomingRecord = incoming;
		const incomingTanstack = tanstackMetadata(incomingRecord);
		const toMerge = incomingTanstack != null && ("content" in incomingTanstack || "args" in incomingTanstack) ? {
			...incomingRecord,
			tanstack: Object.fromEntries(Object.entries(incomingTanstack).filter(([key]) => key !== "content" && key !== "args"))
		} : incomingRecord;
		const metadata = mergeMetadata(message.metadata, toMerge);
		const createdAt = coerceCreatedAt(tanstackMetadata(incomingRecord)?.createdAt);
		const createdAtValid = createdAt !== void 0;
		this.messages = this.messages.map((msg) => msg.id === messageId ? {
			...msg,
			...metadata !== void 0 ? { metadata } : {},
			...createdAtValid ? { createdAt } : {}
		} : msg);
		this.emitMessagesChange();
	}
	findSubagentPart(subagentRunId) {
		for (const message of this.messages) for (const part of message.parts) if (part.type === "subagent" && part.subagent.id === subagentRunId) return {
			message,
			part
		};
	}
	/**
	* The direct child whose card holds `id`: the child itself, or a nested
	* child inside its messages.
	*/
	childOwning(id) {
		const holds = (messages) => messages.some((message) => message.parts.some((part) => part.type === "subagent" && (part.subagent.id === id || holds(part.subagent.messages))));
		for (const message of this.messages) for (const part of message.parts) {
			if (part.type !== "subagent") continue;
			if (part.subagent.id === id || holds(part.subagent.messages)) return part.subagent.id;
		}
	}
	/** The direct child whose messages hold this tool call. */
	childOwningToolCall(matches) {
		const holds = (messages) => messages.some((message) => message.parts.some((part) => part.type === "tool-call" && matches(part) || part.type === "subagent" && holds(part.subagent.messages)));
		for (const message of this.messages) for (const part of message.parts) if (part.type === "subagent" && holds(part.subagent.messages)) return part.subagent.id;
	}
	/**
	* The processor for a direct child. The card's messages are the source of
	* truth. The processor re-reads them when something else replaced them.
	*/
	childProcessor(subagentRunId) {
		const found = this.findSubagentPart(subagentRunId);
		if (!found) return void 0;
		const messages = found.part.subagent.messages;
		const existing = this.childProcessors.get(subagentRunId);
		if (existing) {
			if (existing.getMessages() !== messages) existing.messages = messages;
			return existing;
		}
		const child = new StreamProcessor({
			subagentRunId,
			initialMessages: messages,
			events: {
				onToolCall: (args) => this.events.onToolCall?.(args),
				onApprovalRequest: (args) => this.events.onApprovalRequest?.(args),
				onCustomEvent: (name, value, context) => this.events.onCustomEvent?.(name, value, context)
			}
		});
		this.childProcessors.set(subagentRunId, child);
		return child;
	}
	/** Run `update` on a direct child, then copy its messages onto the card. */
	updateChild(subagentRunId, update) {
		const child = this.childProcessor(subagentRunId);
		if (!child) return;
		update(child);
		const messages = child.getMessages();
		this.patchSubagent(subagentRunId, (subagent) => {
			subagent.messages = messages;
		});
	}
	handleSubagentStartedEvent(chunk) {
		if (chunk.type !== "SUBAGENT_STARTED") return;
		if (this.findSubagentPart(chunk.subagentRunId)) {
			this.childProcessors.delete(chunk.subagentRunId);
			this.patchSubagent(chunk.subagentRunId, (subagent) => {
				subagent.status = "running";
				delete subagent.interruptIds;
				delete subagent.error;
				if (chunk.metadata !== void 0) subagent.metadata = chunk.metadata;
			});
			return;
		}
		const { messageId } = this.ensureAssistantMessage();
		const part = {
			type: "subagent",
			subagent: {
				id: chunk.subagentRunId,
				name: chunk.name,
				...chunk.description !== void 0 && { description: chunk.description },
				status: "running",
				...chunk.parentSubagentRunId !== void 0 && { parentSubagentRunId: chunk.parentSubagentRunId },
				...chunk.parentToolCallId !== void 0 && { parentToolCallId: chunk.parentToolCallId },
				...chunk.metadata !== void 0 && { metadata: chunk.metadata },
				messages: []
			}
		};
		this.messages = this.messages.map((message) => message.id === messageId ? {
			...message,
			parts: [...message.parts, part]
		} : message);
		this.emitMessagesChange();
	}
	handleSubagentFinishedEvent(chunk) {
		if (chunk.type !== "SUBAGENT_FINISHED") return;
		this.updateChild(chunk.subagentRunId, (child) => child.finalizeStream());
		this.patchSubagent(chunk.subagentRunId, (subagent) => {
			if (subagent.status === "error") return;
			if (chunk.outcome?.type === "suspended") {
				subagent.status = "suspended";
				subagent.interruptIds = chunk.outcome.interruptIds ?? [];
				return;
			}
			subagent.status = "finished";
		});
	}
	handleSubagentErrorEvent(chunk) {
		if (chunk.type !== "SUBAGENT_ERROR") return;
		this.updateChild(chunk.subagentRunId, (child) => child.finalizeStream());
		this.patchSubagent(chunk.subagentRunId, (subagent) => {
			subagent.status = "error";
			subagent.error = {
				message: chunk.message,
				...chunk.code !== void 0 && { code: chunk.code }
			};
		});
	}
	patchSubagent(subagentRunId, patch) {
		this.messages = this.messages.map((message) => {
			const index = message.parts.findIndex((part) => part.type === "subagent" && part.subagent.id === subagentRunId);
			if (index === -1) return message;
			const part = message.parts[index];
			if (!part || part.type !== "subagent") return message;
			const next = {
				type: "subagent",
				subagent: { ...part.subagent }
			};
			patch(next.subagent);
			const parts = [...message.parts];
			parts[index] = next;
			return {
				...message,
				parts
			};
		});
		this.emitMessagesChange();
	}
	/**
	* Send a child's chunk to that child's processor, so the card keeps text,
	* reasoning, tool calls, results, and nested children. A tool event without
	* `subagentRunId` follows its `TOOL_CALL_START` or `TOOL_CALL_CHUNK`. An
	* untagged chunk with no id follows a child's open chunk stream (see
	* childContinuing()).
	*/
	routeToChild(chunk) {
		let id;
		if (chunk.type === "SUBAGENT_STARTED") id = chunk.parentSubagentRunId;
		else if (chunk.type === "SUBAGENT_FINISHED" || chunk.type === "SUBAGENT_ERROR") {
			if (this.findSubagentPart(chunk.subagentRunId)) return false;
			id = chunk.subagentRunId;
		} else if ("subagentRunId" in chunk && chunk.subagentRunId) id = chunk.subagentRunId;
		else if ("toolCallId" in chunk && typeof chunk.toolCallId === "string") id = this.childToolCalls.get(chunk.toolCallId);
		else id = this.childContinuing(chunk);
		if (id === void 0) return false;
		const owner = this.childOwning(id);
		if (owner === void 0) {
			if (id === this.subagentRunId) return false;
			console.warn(`[StreamProcessor] Dropped a chunk for unknown subagent ${id}`);
			return true;
		}
		if (this.findSubagentPart(owner)?.part.subagent.status === "error") return true;
		if ((chunk.type === "TOOL_CALL_START" || chunk.type === "TOOL_CALL_CHUNK") && chunk.toolCallId !== void 0) this.childToolCalls.set(chunk.toolCallId, owner);
		this.updateChild(owner, (child) => child.processChunk(chunk));
		return true;
	}
	/**
	* Handle TEXT_MESSAGE_START event
	*/
	handleTextMessageStartEvent(chunk) {
		const { messageId, role } = chunk;
		if (this.messages.some((m) => m.id === messageId && m.role === "activity")) {
			console.warn(`TEXT_MESSAGE_START: Dropped text for '${messageId}', the id of an activity message`);
			return;
		}
		const uiRole = role === "user" || role === "system" ? role : "assistant";
		if (this.pendingManualMessageId && (this.pendingManualMessageId === messageId || this.pendingManualMessageId === this.provisionalMessageId)) {
			this.remapProvisionalMessage(messageId);
			this.pendingManualMessageId = null;
			this.provisionalMessageId = null;
			this.legacyManualMessage = false;
			let pendingState = this.messageStates.get(messageId);
			if (!pendingState) {
				pendingState = this.createMessageState(messageId, uiRole);
				this.activeMessageIds.add(messageId);
			} else if (pendingState.hasToolCallsSinceTextStart) {
				if (pendingState.currentSegmentText !== pendingState.lastEmittedText) this.emitTextUpdateForMessage(messageId);
				pendingState.currentSegmentText = "";
				pendingState.lastEmittedText = "";
				pendingState.hasToolCallsSinceTextStart = false;
			}
			this.applySenderName(messageId, chunk.name);
			this.mergeMessageMetadata(messageId, chunk.metadata);
			this.emitMessagesChange();
			return;
		}
		this.pendingManualMessageId = null;
		if (this.messages.find((m) => m.id === messageId)) {
			this.activeMessageIds.add(messageId);
			const existingState = this.messageStates.get(messageId);
			if (!existingState) this.createMessageState(messageId, uiRole);
			else if (existingState.hasToolCallsSinceTextStart) {
				if (existingState.currentSegmentText !== existingState.lastEmittedText) this.emitTextUpdateForMessage(messageId);
				existingState.currentSegmentText = "";
				existingState.lastEmittedText = "";
				existingState.hasToolCallsSinceTextStart = false;
			}
			this.applySenderName(messageId, chunk.name);
			this.mergeMessageMetadata(messageId, chunk.metadata);
			return;
		}
		const newMessage = {
			id: messageId,
			role: uiRole,
			parts: [],
			createdAt: /* @__PURE__ */ new Date()
		};
		this.messages = [...this.messages, newMessage];
		this.createMessageState(messageId, uiRole);
		this.activeMessageIds.add(messageId);
		this.applySenderName(messageId, chunk.name);
		this.mergeMessageMetadata(messageId, chunk.metadata);
		this.events.onStreamStart?.();
		this.emitMessagesChange();
	}
	applySenderName(messageId, name) {
		if (name === void 0) return;
		this.messages = this.messages.map((msg) => msg.id === messageId ? {
			...msg,
			name
		} : msg);
	}
	/**
	* Handle TEXT_MESSAGE_END event
	*/
	handleTextMessageEndEvent(chunk) {
		const { messageId } = chunk;
		this.mergeMessageMetadata(messageId, chunk.metadata);
		const state = this.getMessageState(messageId);
		if (!state) return;
		if (state.isComplete) return;
		if (state.currentSegmentText !== state.lastEmittedText) this.emitTextUpdateForMessage(messageId);
	}
	/**
	* Handle MESSAGES_SNAPSHOT event
	*/
	handleMessagesSnapshotEvent(chunk) {
		this.resetStreamState();
		const prevMessages = this.messages;
		const prevById = new Map(prevMessages.map((msg) => [msg.id, msg]));
		const { top, groups } = splitSubagentWire(chunk.messages);
		const normalized = this.mergeReasoningFanOut(top.map(aguiSnapshotMessageToUIMessage));
		const reconciled = this.reconcileSnapshotToolCalls(normalized, prevMessages).map((msg) => {
			if (msg.metadata != null) return msg;
			const prev = prevById.get(msg.id);
			if (prev?.metadata == null) return msg;
			return {
				...msg,
				metadata: prev.metadata
			};
		});
		this.messages = this.mergeOmittedActivity(prevMessages, this.attachSnapshotSubagents(reconciled, top, groups, prevMessages));
		this.emitMessagesChange();
	}
	/**
	* Snapshot is authoritative for user/assistant/system. Activity omitted
	* from the snapshot (TanStack chat() still builds snapshots from
	* ModelMessage[]) stays in the transcript so persist/reconnect cannot
	* wipe it. Snapshot activity rows win when the id is present.
	*
	* Keep every snapshot row, including two assistants that share an id
	* (agent-loop retry reuses `currentMessageId`). A Map keyed by id would
	* drop the earlier error tool-call (#1192).
	*/
	mergeOmittedActivity(prevMessages, snapshot) {
		const snapshotIds = new Set(snapshot.map((msg) => msg.id));
		const omitted = prevMessages.filter((msg) => msg.role === "activity" && !snapshotIds.has(msg.id));
		if (omitted.length === 0) return snapshot;
		const out = [...snapshot];
		for (const activity of omitted) {
			const prevIndex = prevMessages.findIndex((msg) => msg.id === activity.id);
			out.splice(Math.min(Math.max(prevIndex, 0), out.length), 0, activity);
		}
		return out;
	}
	/**
	* Put subagent cards back on a snapshot. Child wire messages (tagged with
	* `subagentRunId`) become a card on the nearest assistant message before
	* them, or a new assistant message when there is none. A card that the
	* snapshot does not carry stays on its message, because a server snapshot
	* can hold the parent history only.
	*/
	attachSnapshotSubagents(messages, top, groups, prevMessages) {
		const cards = [];
		const children = /* @__PURE__ */ new Map();
		for (const group of groups) {
			const child = new StreamProcessor({ subagentRunId: group.id });
			child.processChunk({
				type: EventType.MESSAGES_SNAPSHOT,
				messages: group.messages,
				timestamp: Date.now()
			});
			children.set(group.id, child);
			const { placeholder: _placeholder, ...info } = group.info;
			cards.push({
				hostId: top.slice(0, group.hostIndex + 1).findLast((message) => message.role === "assistant")?.id,
				part: {
					type: "subagent",
					subagent: {
						...info,
						id: group.id,
						messages: child.getMessages()
					}
				},
				carried: false
			});
		}
		const inSnapshot = new Set(groups.map((group) => group.id));
		for (const message of prevMessages) for (const part of message.parts) {
			if (part.type !== "subagent" || inSnapshot.has(part.subagent.id)) continue;
			cards.push({
				hostId: message.id,
				...part.subagent.parentToolCallId !== void 0 && { toolCallId: part.subagent.parentToolCallId },
				part,
				carried: true
			});
			const kept = this.childProcessors.get(part.subagent.id);
			if (kept) children.set(part.subagent.id, kept);
		}
		this.childProcessors.clear();
		for (const [id, child] of children) this.childProcessors.set(id, child);
		let out = messages;
		for (const card of cards) {
			let index = out.findIndex((message) => message.id === card.hostId);
			if (index === -1 && card.toolCallId !== void 0) index = out.findIndex((message) => message.parts.some((part) => part.type === "tool-call" && part.id === card.toolCallId));
			if (index === -1 && !card.carried) index = out.findLastIndex((message) => message.role === "assistant");
			if (index === -1) {
				if (!card.carried) out = [...out, {
					id: generateMessageId(),
					role: "assistant",
					parts: [card.part]
				}];
				continue;
			}
			out = out.map((message, position) => position !== index || message.parts.some((part) => part.type === "subagent" && part.subagent.id === card.part.subagent.id) ? message : {
				...message,
				parts: [...message.parts, card.part]
			});
		}
		return out;
	}
	/**
	* Reconcile a freshly normalized snapshot with the pre-snapshot message
	* state so unreconstructable tool-call metadata is preserved.
	*
	* Post-pass (a): anchor `tool-result`-only assistant messages (the shape
	* `aguiSnapshotMessageToUIMessage` emits for AG-UI `role: 'tool'` wire
	* messages) into the message containing the matching `tool-call` part, or —
	* when the snapshot supplies no such part — the nearest earlier anchorable
	* assistant message, matching the in-stream fan-out shape
	* `assistant: [text, tool-call, tool-result, ...]`. Detached messages with
	* no earlier anchorable assistant are kept verbatim.
	*
	* Post-pass (b): when a `tool-result` part references a `toolCallId` whose
	* `tool-call` part is absent from the snapshot, carry the `tool-call` part
	* forward from the pre-snapshot state (state and output untouched) so a
	* subsequent `addToolResult(toolCallId)` can still locate the call.
	*
	* Post-pass (c): AG-UI wire snapshots rebuild `tool-call` parts as
	* `input-complete` without `output` (ModelMessage has no result field on
	* the call). After anchoring results, copy each `tool-result` onto its
	* matching `tool-call` (and prefer pre-snapshot complete/output when the
	* snapshot is poorer) so server tools keep the same UI shape as client tools.
	*/
	/**
	* Wire order is reasoning fan-outs, then the assistant anchor.
	* Snapshot conversion turns each reasoning row into its own assistant
	* message. Fold leading thinking-only messages into the next real
	* assistant. Do not fold into a tool-result-only message (`role: 'tool'`
	* on the wire). `reconcileSnapshotToolCalls` anchors those results.
	* A `<id>-segment-<n>` row folds into its message, together with the
	* tool-result rows between them (a tool result ends a wire segment).
	*/
	mergeReasoningFanOut(messages) {
		const out = [];
		let pending = [];
		const thinkingParts = (msg) => msg.parts.filter((part) => part.type === "thinking");
		const isThinkingOnly = (msg) => msg.role === "assistant" && msg.parts.length > 0 && msg.parts.every((part) => part.type === "thinking");
		const isToolResultOnly = (msg) => msg.role === "assistant" && msg.parts.some((part) => part.type === "tool-result") && msg.parts.every((part) => part.type === "tool-result" || part.type === "ui-resource");
		const flushPending = () => {
			out.push(...pending);
			pending = [];
		};
		for (const msg of messages) {
			if (isThinkingOnly(msg)) {
				pending.push(msg);
				continue;
			}
			let next = msg;
			if (msg.role === "assistant" && pending.length > 0 && !isToolResultOnly(msg)) {
				next = {
					...msg,
					parts: [...pending.flatMap(thinkingParts), ...msg.parts]
				};
				pending = [];
			} else flushPending();
			let parentIndex = out.length - 1;
			while (parentIndex >= 0) {
				const candidate = out[parentIndex];
				if (!candidate || !isToolResultOnly(candidate)) break;
				parentIndex--;
			}
			const parent = out[parentIndex];
			if (parent?.role === "assistant" && next.role === "assistant" && isAssistantSegmentOf(next.id, parent.id)) {
				const folded = out.slice(parentIndex).flatMap((message) => message.parts);
				out.splice(parentIndex, out.length - parentIndex, {
					...parent,
					parts: [...folded, ...next.parts]
				});
				continue;
			}
			out.push(next);
		}
		flushPending();
		return out;
	}
	reconcileSnapshotToolCalls(snapshot, prevMessages) {
		const prevToolCalls = /* @__PURE__ */ new Map();
		for (const msg of prevMessages) for (const part of msg.parts) if (part.type === "tool-call") prevToolCalls.set(part.id, part);
		const snapshotToolCallIds = /* @__PURE__ */ new Set();
		for (const msg of snapshot) for (const part of msg.parts) if (part.type === "tool-call") snapshotToolCallIds.add(part.id);
		const reconciled = [];
		for (const msg of snapshot) {
			const toolResultParts = msg.parts.filter((part) => part.type === "tool-result");
			const toolResultPart = msg.role === "assistant" && toolResultParts.length === 1 && msg.parts.every((part) => part.type === "tool-result" || part.type === "ui-resource") ? toolResultParts[0] : void 0;
			if (!toolResultPart) {
				reconciled.push(msg);
				continue;
			}
			const target = reconciled.findLast((m) => m.parts.some((p) => p.type === "tool-call" && p.id === toolResultPart.toolCallId)) ?? reconciled.findLast((m) => m.role === "assistant" && !(m.parts.length === 1 && m.parts[0]?.type === "tool-result"));
			if (!target) {
				if (!snapshotToolCallIds.has(toolResultPart.toolCallId)) console.warn(`[StreamProcessor] MESSAGES_SNAPSHOT contains a tool-result for "${toolResultPart.toolCallId}" but no matching tool-call exists in the snapshot, and there is no assistant message to anchor into; addToolResult("${toolResultPart.toolCallId}") will not be able to locate this call`);
				reconciled.push(msg);
				continue;
			}
			const parts = [...target.parts];
			if (!snapshotToolCallIds.has(toolResultPart.toolCallId) && !parts.some((p) => p.type === "tool-call" && p.id === toolResultPart.toolCallId)) {
				const prev = prevToolCalls.get(toolResultPart.toolCallId);
				if (prev) {
					parts.push({ ...prev });
					snapshotToolCallIds.add(prev.id);
				} else console.warn(`[StreamProcessor] MESSAGES_SNAPSHOT contains a tool-result for "${toolResultPart.toolCallId}" but no matching tool-call exists in the snapshot or the pre-snapshot state; addToolResult("${toolResultPart.toolCallId}") will not be able to locate this call`);
			}
			parts.push(...msg.parts);
			target.parts = parts;
		}
		return this.enrichSnapshotToolCallsFromResults(reconciled, prevToolCalls);
	}
	/**
	* Post-pass (c): fold `tool-result` content into sibling `tool-call` parts
	* and prefer pre-snapshot complete/output when the snapshot rebuilt a
	* poorer `input-complete` call (AG-UI ModelMessage has no result on calls).
	*/
	enrichSnapshotToolCallsFromResults(messages, prevToolCalls) {
		const resultsByCallId = /* @__PURE__ */ new Map();
		for (const msg of messages) for (const part of msg.parts) if (part.type === "tool-result") resultsByCallId.set(part.toolCallId, part);
		return messages.map((msg) => {
			const parts = msg.parts.map((part) => {
				if (part.type !== "tool-call") return part;
				const prev = prevToolCalls.get(part.id);
				const result = resultsByCallId.get(part.id);
				let next = part;
				if (prev && (prev.output !== void 0 || prev.state === "complete" || prev.state === "error") && (part.output === void 0 || part.state === "input-complete" || part.state === "input-streaming" || part.state === "awaiting-input")) next = {
					...part,
					...prev.output !== void 0 ? { output: prev.output } : {},
					state: prev.state,
					...prev.approval !== void 0 ? { approval: prev.approval } : {},
					...prev.metadata !== void 0 ? { metadata: prev.metadata } : {}
				};
				if (result && next.output === void 0) {
					let output;
					if (Array.isArray(result.content)) output = result.content;
					else try {
						output = JSON.parse(result.content);
					} catch {
						output = result.content;
					}
					const errorText = result.state === "error" ? toolResultErrorText(output) : void 0;
					next = {
						...next,
						output: errorText ? { error: errorText } : output,
						state: result.state === "error" ? "error" : "complete"
					};
				}
				return next;
			});
			return parts.some((part, index) => part !== msg.parts[index]) ? {
				...msg,
				parts
			} : msg;
		});
	}
	/**
	* Handle TEXT_MESSAGE_CONTENT event.
	*
	* Accumulates delta into both currentSegmentText (for UI emission) and
	* totalTextContent (for ProcessorResult). Lazily creates the assistant
	* UIMessage on first content. Uses updateTextPart() which replaces the
	* last TextPart or creates a new one depending on part ordering.
	*
	* @see docs/chat-architecture.md#single-shot-text-response — Text accumulation step-by-step
	* @see docs/chat-architecture.md#uimessage-part-ordering-invariants — Replace vs. push logic
	*/
	handleTextMessageContentEvent(chunk) {
		if (this.messages.some((m) => m.id === chunk.messageId && m.role === "activity")) {
			console.warn(`TEXT_MESSAGE_CONTENT: Dropped text for '${chunk.messageId}', the id of an activity message`);
			return;
		}
		const preferredId = this.legacyManualMessage && this.pendingManualMessageId ? this.pendingManualMessageId : chunk.messageId;
		const { messageId, state } = this.ensureAssistantMessage(preferredId);
		this.mergeMessageMetadata(messageId, chunk.metadata);
		if (this.structuredMessageIds.has(messageId)) {
			const delta = chunk.delta || "";
			if (delta !== "") {
				this.messages = appendStructuredOutputDelta(this.messages, messageId, delta);
				state.totalTextContent += delta;
				this.queueStructuredOutputUpdate(messageId, delta);
				this.emitMessagesChange();
			}
			return;
		}
		const previousSegment = state.currentSegmentText;
		if (state.hasToolCallsSinceTextStart && previousSegment.length > 0 && this.isNewTextSegment(chunk, previousSegment)) {
			if (previousSegment !== state.lastEmittedText) this.emitTextUpdateForMessage(messageId);
			state.currentSegmentText = "";
			state.lastEmittedText = "";
			state.hasToolCallsSinceTextStart = false;
		}
		state.hasToolCallsSinceTextStart = false;
		const currentText = state.currentSegmentText;
		const delta = chunk.delta || "";
		const nextText = delta !== "" ? currentText + delta : currentText;
		const textDelta = nextText.slice(currentText.length);
		state.currentSegmentText = nextText;
		state.totalTextContent += textDelta;
		const chunkPortion = chunk.delta || "";
		if (this.chunkStrategy.shouldEmit(chunkPortion, state.currentSegmentText) && state.currentSegmentText !== state.lastEmittedText) this.emitTextUpdateForMessage(messageId);
	}
	/**
	* Handle TOOL_CALL_START event.
	*
	* Creates a new InternalToolCallState entry in the toolCalls Map and appends
	* a ToolCallPart to the UIMessage. Duplicate toolCallId is a no-op.
	*
	* CRITICAL: This MUST be received before any TOOL_CALL_ARGS for the same
	* toolCallId. Args for unknown IDs are silently dropped.
	*
	* @see docs/chat-architecture.md#single-shot-tool-call-response — Tool call state transitions
	* @see docs/chat-architecture.md#parallel-tool-calls-single-shot — Parallel tracking by ID
	* @see docs/chat-architecture.md#adapter-contract — Ordering requirements
	*/
	handleToolCallStartEvent(chunk) {
		const targetMessageId = chunk.parentMessageId ?? this.getActiveAssistantMessageId();
		const { messageId, state } = this.ensureAssistantMessage(targetMessageId ?? void 0);
		const tanstack = tanstackMetadata(chunk);
		this.mergeMessageMetadata(messageId, tanstack === void 0 ? void 0 : { tanstack });
		state.hasToolCallsSinceTextStart = true;
		const toolCallId = chunk.toolCallId;
		if (!state.toolCalls.get(toolCallId)) {
			const initialState = "awaiting-input";
			const toolName = chunk.toolCallName;
			const chunkMetadata = chunk.metadata;
			const newToolCall = {
				id: chunk.toolCallId,
				name: toolName,
				arguments: "",
				state: initialState,
				parsedArguments: void 0,
				index: state.toolCalls.size,
				...chunkMetadata !== void 0 && { metadata: chunkMetadata }
			};
			state.toolCalls.set(toolCallId, newToolCall);
			state.toolCallOrder.push(toolCallId);
			this.runToolCallIds.push(toolCallId);
			this.toolCallToMessage.set(toolCallId, messageId);
			this.messages = updateToolCallPart(this.messages, messageId, {
				id: chunk.toolCallId,
				name: toolName,
				arguments: "",
				state: initialState,
				...chunkMetadata !== void 0 && { metadata: chunkMetadata }
			});
			this.emitMessagesChange();
			this.events.onToolCallStateChange?.(messageId, chunk.toolCallId, initialState, "");
		}
	}
	/**
	* Handle TOOL_CALL_ARGS event.
	*
	* Appends the delta to the tool call's accumulated arguments string.
	* Transitions state from awaiting-input → input-streaming on first non-empty delta.
	* Attempts partial JSON parse on each update for UI preview.
	*
	* If toolCallId is not found in the Map (no preceding TOOL_CALL_START),
	* this event is silently dropped.
	*
	* @see docs/chat-architecture.md#single-shot-tool-call-response — Step-by-step tool call processing
	*/
	handleToolCallArgsEvent(chunk) {
		const toolCallId = chunk.toolCallId;
		const messageId = this.toolCallToMessage.get(toolCallId);
		if (!messageId) return;
		const state = this.getMessageState(messageId);
		if (!state) return;
		const existingToolCall = state.toolCalls.get(toolCallId);
		if (!existingToolCall) return;
		const wasAwaitingInput = existingToolCall.state === "awaiting-input";
		if (chunk.metadata !== void 0) existingToolCall.metadata = mergeMetadata(existingToolCall.metadata, chunk.metadata);
		existingToolCall.arguments += chunk.delta || "";
		if (wasAwaitingInput && chunk.delta) existingToolCall.state = "input-streaming";
		existingToolCall.parsedArguments = this.jsonParser.parse(existingToolCall.arguments);
		this.messages = updateToolCallPart(this.messages, messageId, {
			id: existingToolCall.id,
			name: existingToolCall.name,
			arguments: existingToolCall.arguments,
			state: existingToolCall.state,
			...existingToolCall.metadata !== void 0 && { metadata: existingToolCall.metadata }
		});
		this.emitMessagesChange();
		this.events.onToolCallStateChange?.(messageId, existingToolCall.id, existingToolCall.state, existingToolCall.arguments);
	}
	/**
	* Handle TOOL_CALL_END event — arguments are finalized (input-complete).
	* Tool output arrives on TOOL_CALL_RESULT, not on this event.
	*
	* If TOOL_CALL_END carries parsed `input`, it is the canonical arguments:
	* write it into the accumulated string and override the rendered part's
	* `input` with it. That covers adapters that deliver the whole input on END
	* (e.g. Anthropic server_tool_use / web_search — issue #839) and adapters
	* that stream the wire arguments and then normalize them (OpenAI strict-mode
	* null widening, undone by the adapter after #939), so `arguments` and
	* `input` never disagree on the persisted part.
	*
	* @see docs/chat-architecture.md#single-shot-tool-call-response — End-to-end flow
	*/
	handleToolCallEndEvent(chunk) {
		const messageId = this.toolCallToMessage.get(chunk.toolCallId);
		if (!messageId) return;
		const msgState = this.getMessageState(messageId);
		const toolCall = msgState?.toolCalls.get(chunk.toolCallId);
		if (!msgState || !toolCall) return;
		const extra = chunk;
		const metadata = tanstackMetadata(chunk);
		const storedArgs = metadata && "args" in metadata ? metadata.args : void 0;
		const input = chunk.input !== void 0 ? chunk.input : metadata?.input;
		if (typeof extra.args !== "string" && typeof storedArgs === "string") toolCall.arguments = storedArgs;
		else {
			const snapshot = typeof extra.args === "string" ? extra.args : void 0;
			let raw = snapshot ?? toolCall.arguments;
			if (snapshot === void 0 && input !== void 0) try {
				JSON.parse(raw);
			} catch {
				raw = void 0;
			}
			try {
				toolCall.arguments = reconcileToolCallArguments(raw, input);
			} catch {
				if (raw !== void 0) toolCall.arguments = raw;
			}
		}
		this.completeToolCall(messageId, msgState.toolCallOrder.indexOf(chunk.toolCallId), toolCall);
	}
	/**
	* Handle TOOL_CALL_RESULT event (AG-UI spec).
	*
	* Creates a tool-result part and updates the tool-call output field,
	* mirroring the logic from TOOL_CALL_END when it carries a result.
	* This is the spec-compliant path for delivering tool results to the client.
	*/
	handleToolCallResultEvent(chunk) {
		const messageId = this.toolCallToMessage.get(chunk.toolCallId) ?? this.messages.find((m) => m.parts.some((p) => p.type === "tool-call" && p.id === chunk.toolCallId))?.id;
		if (!messageId) return;
		const extra = chunk;
		const rawToolResultOutcome = tanstackMetadata(chunk)?.toolResultOutcome;
		const toolResultOutcome = isToolResultOutcome(rawToolResultOutcome) ? rawToolResultOutcome : void 0;
		const isOutputError = extra.state === "output-error" || tanstackMetadata(chunk)?.state === "output-error" || toolResultOutcome !== void 0;
		let output;
		try {
			output = typeof chunk.content === "string" ? JSON.parse(chunk.content) : chunk.content;
		} catch {
			output = chunk.content;
		}
		this.messages = updateToolCallWithOutput(this.messages, chunk.toolCallId, output, isOutputError ? "error" : void 0);
		const resultState = isOutputError ? "error" : "complete";
		this.messages = updateToolResultPart(this.messages, messageId, chunk.toolCallId, isContentPartArray(output) ? output : aguiContentToContentParts(chunk.content), resultState, resultState === "error" ? toolResultErrorText(output) : void 0, toolResultOutcome);
		this.emitMessagesChange();
	}
	/**
	* Handle RUN_STARTED event.
	*
	* Registers the run so that RUN_FINISHED can determine whether other
	* runs are still active before finalizing.
	*/
	handleRunStartedEvent(chunk) {
		if (!this.activeRuns.has(chunk.runId)) {
			this.pendingThinkingStepId = null;
			this.pendingReasoningMessageId = null;
			this.unboundThinkingStepId = null;
			this.pendingReasoningAliases.clear();
		}
		if (this.activeRuns.size === 0) {
			this.runToolCallIds = [];
			this.toolCallsSentToClient.clear();
		}
		this.activeRuns.add(chunk.runId);
	}
	/**
	* Handle RUN_FINISHED event.
	*
	* Records the finishReason and removes the run from activeRuns.
	* Only finalizes when no more runs are active, so that concurrent
	* runs don't interfere with each other.
	*
	* @see docs/chat-architecture.md#single-shot-tool-call-response — finishReason semantics
	* @see docs/chat-architecture.md#adapter-contract — Why RUN_FINISHED is mandatory
	*/
	handleRunFinishedEvent(chunk) {
		const extra = chunk;
		const incoming = tanstackMetadata(chunk);
		const model = chunk.model ?? incoming?.model;
		const responseId = chunk.responseId ?? incoming?.responseId;
		const ids = this.callMessageIds.get(chunk.runId) ?? (this.activeRuns.has(chunk.runId) ? /* @__PURE__ */ new Set() : new Set(this.unassignedCallMessageIds));
		for (const messageId of ids) this.mergeMessageMetadata(messageId, withTanstackMetadata(chunk, {
			...model !== void 0 ? { model } : {},
			...responseId !== void 0 ? { responseId } : {}
		}).metadata);
		if (this.pendingManualMessageId && ids.has(this.pendingManualMessageId)) this.pendingManualMessageId = null;
		if (this.provisionalMessageId && ids.has(this.provisionalMessageId)) this.provisionalMessageId = null;
		this.callMessageIds.delete(chunk.runId);
		for (const id of ids) this.unassignedCallMessageIds.delete(id);
		this.finishReason = extra.finishReason !== void 0 ? extra.finishReason : tanstackMetadata(chunk)?.finishReason ?? null;
		this.activeRuns.delete(chunk.runId);
		if (chunk.outcome?.type === "interrupt") this.handleInterrupts(chunk.outcome.interrupts);
		if (this.activeRuns.size === 0) {
			this.completeAllToolCalls();
			if (this.finishReason === "tool_calls" && chunk.outcome?.type !== "interrupt") return;
			if (!chunk.outcome || chunk.outcome.type === "success") this.handlePendingToolCalls(chunk.outcome?.pendingToolCallIds);
			this.isDone = true;
			this.finalizeStream();
		}
	}
	/**
	* AG-UI ends a run that calls a frontend tool with a success outcome and
	* leaves the call unanswered. The pending calls are the ones named in
	* `pendingToolCallIds` that this run started, or else every call this run
	* started that has no result. Fire onToolCall once for each, so the client
	* runs it and continues.
	*/
	handlePendingToolCalls(pendingToolCallIds) {
		const ids = pendingToolCallIds?.length ? pendingToolCallIds.filter((id) => this.runToolCallIds.includes(id)) : this.runToolCallIds;
		const parts = this.messages.flatMap((msg) => msg.parts ?? []);
		for (const toolCallId of ids) {
			if (this.toolCallsSentToClient.has(toolCallId)) continue;
			const part = parts.find((p) => p.type === "tool-call" && p.id === toolCallId);
			if (!part || isProviderExecutedToolCall(part) || part.output !== void 0 || parts.some((p) => p.type === "tool-result" && p.toolCallId === toolCallId) || this.isToolCallPartTerminal(toolCallId) || this.isToolCallPartAwaitingUserAction(toolCallId)) continue;
			const input = part.input ?? parseToolArguments(part.arguments);
			if (input === void 0) {
				console.warn(`[StreamProcessor] Did not run tool call ${toolCallId}: the arguments of ${part.name} are not complete JSON`);
				continue;
			}
			this.toolCallsSentToClient.add(toolCallId);
			this.events.onToolCall?.({
				toolCallId,
				toolName: part.name,
				input
			});
		}
	}
	/**
	* Apply interrupt state to tool-call parts, then fire the client events.
	* A child's interrupt updates the child's card. `emit` is false there, so
	* the events fire once, from the top processor.
	*/
	handleInterrupts(interrupts, emit = true) {
		const hasGeneric = interruptBatchHasGeneric(interrupts);
		for (const interrupt of interrupts) {
			const metadata = interrupt.metadata && typeof interrupt.metadata === "object" ? interrupt.metadata : {};
			const kind = typeof metadata.kind === "string" ? metadata.kind : void 0;
			const toolCallId = interrupt.toolCallId;
			if (!toolCallId) continue;
			const owner = interrupt.subagentRunId !== void 0 ? this.childOwning(interrupt.subagentRunId) : this.childOwningToolCall((part) => part.id === toolCallId);
			if (owner !== void 0) this.updateChild(owner, (child) => child.handleInterrupts([interrupt], false));
			const toolName = typeof metadata.toolName === "string" ? metadata.toolName : this.findToolCallName(toolCallId);
			const input = Object.hasOwn(metadata, "input") ? metadata.input : {};
			if (kind === "approval" || interrupt.reason === "approval_required") {
				if (owner !== void 0) {
					if (emit) this.events.onApprovalRequest?.({
						toolCallId,
						toolName,
						input,
						approvalId: interrupt.id
					});
					continue;
				}
				const resolvedMessageId = this.getActiveAssistantMessageId() ?? this.toolCallToMessage.get(toolCallId) ?? this.messages.find((m) => m.role === "assistant" && m.parts.some((p) => p.type === "tool-call" && p.id === toolCallId))?.id;
				if (resolvedMessageId) {
					this.messages = updateToolCallApproval(this.messages, resolvedMessageId, toolCallId, interrupt.id);
					this.emitMessagesChange();
				}
				if (!emit) continue;
				this.events.onApprovalRequest?.({
					toolCallId,
					toolName,
					input,
					approvalId: interrupt.id
				});
				continue;
			}
			if (kind === "client_tool" || interrupt.reason === "client_tool_input") {
				if (hasGeneric || !emit) continue;
				this.toolCallsSentToClient.add(toolCallId);
				this.events.onToolCall?.({
					toolCallId,
					toolName,
					input
				});
			}
		}
	}
	findToolCallName(toolCallId) {
		for (const state of this.messageStates.values()) {
			const toolCall = state.toolCalls.get(toolCallId);
			if (toolCall) return toolCall.name;
		}
		return "";
	}
	/**
	* Handle RUN_ERROR event
	*/
	handleRunErrorEvent(chunk) {
		this.hasError = true;
		const runId = getChunkRunId(chunk) ?? (this.activeRuns.size === 1 ? [...this.activeRuns][0] : void 0);
		const currentIds = runId !== void 0 ? this.callMessageIds.get(runId) ?? this.unassignedCallMessageIds : this.unassignedCallMessageIds;
		if (runId) this.activeRuns.delete(runId);
		else this.activeRuns.clear();
		const lastMessageId = currentIds === void 0 ? void 0 : [...currentIds].at(-1);
		const messageId = runId !== void 0 && this.callMessageIds.has(runId) && currentIds.size === 0 ? void 0 : this.ensureAssistantMessage(lastMessageId ?? generateMessageId()).messageId;
		const ids = new Set(currentIds);
		if (messageId !== void 0) ids.add(messageId);
		for (const id of ids) this.mergeMessageMetadata(id, withTanstackMetadata(chunk, { stopReason: tanstackMetadata(chunk)?.stopReason ?? "error" }).metadata);
		if (this.pendingManualMessageId && ids.has(this.pendingManualMessageId)) this.pendingManualMessageId = null;
		if (this.provisionalMessageId && ids.has(this.provisionalMessageId)) this.provisionalMessageId = null;
		if (runId !== void 0) this.callMessageIds.delete(runId);
		for (const id of ids) this.unassignedCallMessageIds.delete(id);
		const errorMessage = chunk.message || "An error occurred";
		if (!chunk.message) console.error("[StreamProcessor] RUN_ERROR with no message; original chunk:", chunk);
		if (messageId !== void 0 && this.structuredMessageIds.has(messageId)) {
			this.flushStructuredOutputUpdate(messageId);
			this.messages = errorStructuredOutputPart(this.messages, messageId, errorMessage);
			this.structuredMessageIds.delete(messageId);
			this.emitStructuredOutputChange(messageId, "error");
			this.emitMessagesChange();
		}
		this.events.onError?.(runErrorEventToError(chunk));
	}
	/**
	* Handle STEP_STARTED event (for thinking/reasoning content).
	*
	* Records the stepId so later REASONING_MESSAGE_CONTENT deltas accumulate
	* into their own ThinkingPart. Does not create a message — the message
	* is lazily created when the first REASONING_MESSAGE_CONTENT arrives.
	*/
	knownThinkingTarget(id) {
		if (!id) return void 0;
		for (const [messageId, state] of [...this.messageStates].reverse()) {
			if (this.activeRuns.size > 0 && ![...this.activeRuns].some((run) => this.callMessageIds.get(run)?.has(messageId)) && messageId !== this.pendingManualMessageId) continue;
			const stepId = state.reasoningStepAliases.get(id) ?? (state.thinkingSteps.has(id) ? id : void 0) ?? (messageId === id ? state.currentThinkingStepId ?? state.thinkingStepOrder.at(-1) : void 0);
			if (stepId) return {
				messageId,
				state,
				stepId
			};
		}
		for (const message of [...this.messages].reverse()) {
			if (message.role === "activity") continue;
			if (this.activeRuns.size > 0 && ![...this.activeRuns].some((run) => this.callMessageIds.get(run)?.has(message.id)) && message.id !== this.pendingManualMessageId) continue;
			if (!message.parts.some((part) => part.type === "thinking" && part.stepId === id)) continue;
			const state = this.getMessageState(message.id) ?? this.createMessageState(message.id, message.role);
			return {
				messageId: message.id,
				state,
				stepId: id
			};
		}
	}
	thinkingTarget(id) {
		const known = this.knownThinkingTarget(id);
		if (known) return known;
		const { messageId, state } = this.ensureAssistantMessage(this.getActiveAssistantMessageId() ?? void 0);
		this.consumePendingThinkingStep(state);
		const stepId = (id && state.reasoningStepAliases.get(id)) ?? (this.pendingReasoningMessageId === id ? id : void 0) ?? state.currentThinkingStepId ?? id ?? generateMessageId();
		if (id && (id === stepId || this.pendingReasoningMessageId === id)) state.reasoningStepAliases.set(id, stepId);
		const existingPart = this.messages.find((message) => message.id === messageId)?.parts.find((part) => part.type === "thinking" && part.stepId === stepId) ?? this.messages.find((message) => message.id === messageId)?.parts.find((part) => part.type === "thinking" && part.stepId === void 0);
		if (existingPart?.type === "thinking") {
			state.thinkingSteps.set(stepId, existingPart.redacted ? "" : existingPart.content);
			if (existingPart.signature !== void 0) state.thinkingStepSignatures.set(stepId, existingPart.signature);
			if (existingPart.redacted) state.redactedThinkingSteps.add(stepId);
		}
		if (!state.thinkingSteps.has(stepId)) state.thinkingSteps.set(stepId, "");
		if (!state.thinkingStepOrder.includes(stepId)) state.thinkingStepOrder.push(stepId);
		state.currentThinkingStepId = stepId;
		this.pendingReasoningMessageId = null;
		return {
			messageId,
			state,
			stepId
		};
	}
	handleReasoningMessageStartEvent(chunk) {
		const known = this.knownThinkingTarget(chunk.messageId);
		if (known) {
			known.state.currentThinkingStepId = known.stepId;
			if (this.unboundThinkingStepId === known.stepId) this.unboundThinkingStepId = null;
			if (this.pendingThinkingStepId === known.stepId) this.pendingThinkingStepId = null;
			return;
		}
		const active = this.getActiveAssistantMessageId();
		const state = active ? this.getMessageState(active) : void 0;
		if (this.unboundThinkingStepId) {
			(state?.reasoningStepAliases ?? this.pendingReasoningAliases).set(chunk.messageId, this.unboundThinkingStepId);
			this.unboundThinkingStepId = null;
		} else {
			this.pendingReasoningMessageId = chunk.messageId;
			if (state) state.currentThinkingStepId = null;
		}
	}
	handleStepStartedEvent(chunk) {
		const extra = chunk;
		const incoming = tanstackMetadata(chunk);
		const rawId = extra.stepId ?? (incoming && "stepId" in incoming && typeof incoming.stepId === "string" ? incoming.stepId : void 0);
		const stepId = chunk.stepName || rawId || generateMessageId();
		const active = this.getActiveAssistantMessageId();
		const state = active ? this.getMessageState(active) : void 0;
		const aliases = state?.reasoningStepAliases ?? this.pendingReasoningAliases;
		aliases.set(stepId, stepId);
		if (rawId) aliases.set(rawId, stepId);
		if (this.pendingReasoningMessageId) {
			aliases.set(this.pendingReasoningMessageId, stepId);
			this.pendingReasoningMessageId = null;
			this.unboundThinkingStepId = null;
		} else this.unboundThinkingStepId = stepId;
		if (state) {
			state.currentThinkingStepId = stepId;
			if (!state.thinkingSteps.has(stepId)) {
				state.thinkingSteps.set(stepId, "");
				state.thinkingStepOrder.push(stepId);
			}
			this.pendingThinkingStepId = null;
		} else this.pendingThinkingStepId = stepId;
	}
	/**
	* Handle ACTIVITY_SNAPSHOT. Creates or replaces a frontend-only activity
	* message. Does not create MessageStreamState (that path feeds
	* ProcessorResult.content).
	*/
	handleActivitySnapshotEvent(chunk) {
		this.messages = applyActivitySnapshotToUIMessages(this.messages, chunk);
		this.emitMessagesChange();
	}
	/**
	* Handle ACTIVITY_DELTA. Applies RFC 6902 patches to an existing activity
	* `content`. Missing or non-activity ids are no-ops. Patch failure leaves
	* the previous content in place.
	*/
	handleActivityDeltaEvent(chunk) {
		this.messages = applyActivityDeltaToUIMessages(this.messages, chunk);
		this.emitMessagesChange();
	}
	/**
	* Handle STEP_FINISHED event.
	*
	* Thinking *content* comes from REASONING_MESSAGE_CONTENT, not STEP_FINISHED.
	* But some adapters (e.g. BytePlus thinking-summary) carry the provider
	* signature blob ONLY on the STEP_FINISHED event, so still extract that here
	* and attach it to the thinking step the reasoning events already built.
	*/
	handleStepFinishedEvent(chunk) {
		const extra = chunk;
		const incoming = tanstackMetadata(chunk);
		const signature = extra.signature ?? (incoming && "signature" in incoming && typeof incoming.signature === "string" ? incoming.signature : void 0);
		if (!signature) return;
		const exact = extra.stepId ?? (incoming && "stepId" in incoming && typeof incoming.stepId === "string" ? incoming.stepId : void 0) ?? chunk.stepName;
		const { messageId, state, stepId } = this.thinkingTarget(exact);
		if (state.redactedThinkingSteps.has(stepId)) return;
		const thinking = state.thinkingSteps.get(stepId);
		if (thinking === void 0) return;
		state.thinkingStepSignatures.set(stepId, signature);
		this.messages = updateThinkingPart(this.messages, messageId, stepId, thinking, signature, false, state.thinkingStepOrder);
		this.emitMessagesChange();
	}
	/**
	* Handle REASONING_MESSAGE_CONTENT event (AG-UI reasoning protocol).
	*
	* Accumulates reasoning delta into thinking content and updates the
	* corresponding ThinkingPart in the UIMessage.
	*/
	handleReasoningMessageContentEvent(chunk) {
		const { messageId, state, stepId } = this.thinkingTarget(chunk.messageId);
		this.mergeMessageMetadata(messageId, chunk.metadata);
		state.hasSeenReasoningEvents = true;
		const delta = chunk.delta || "";
		const nextThinking = state.redactedThinkingSteps.has(stepId) ? "" : (state.thinkingSteps.get(stepId) ?? "") + delta;
		state.thinkingSteps.set(stepId, nextThinking);
		if (state.currentSegmentText !== "" && !this.messages.find((message) => message.id === messageId)?.parts.some((part) => part.type === "thinking" && (part.stepId === stepId || part.stepId === void 0))) {
			if (state.currentSegmentText !== state.lastEmittedText) this.emitTextUpdateForMessage(messageId);
			state.currentSegmentText = "";
			state.lastEmittedText = "";
		}
		this.messages = updateThinkingPart(this.messages, messageId, stepId, nextThinking, state.thinkingStepSignatures.get(stepId), state.redactedThinkingSteps.has(stepId), state.thinkingStepOrder);
		this.emitMessagesChange();
		this.events.onThinkingUpdate?.(messageId, stepId, nextThinking);
	}
	/**
	* Attach a provider signature blob from REASONING_ENCRYPTED_VALUE.
	* `subtype: 'message'` updates ThinkingPart.signature.
	* `subtype: 'tool-call'` stores Gemini thoughtSignature on the tool-call part.
	*/
	handleReasoningEncryptedValueEvent(chunk) {
		const encryptedValue = chunk.encryptedValue;
		if (typeof encryptedValue !== "string" || encryptedValue === "") return;
		if (chunk.subtype === "tool-call") {
			this.attachToolCallSignature(chunk.entityId, encryptedValue);
			return;
		}
		const { messageId, state, stepId } = this.thinkingTarget(chunk.entityId);
		const extra = chunk;
		const incoming = tanstackMetadata(chunk);
		const alias = extra.stepId ?? (incoming && "stepId" in incoming && typeof incoming.stepId === "string" ? incoming.stepId : void 0);
		const redacted = isRedactedThinkingId(alias) || isRedactedThinkingId(chunk.entityId);
		if (state.redactedThinkingSteps.has(stepId) && !redacted) return;
		if (redacted) {
			state.redactedThinkingSteps.add(stepId);
			state.thinkingSteps.set(stepId, "");
		}
		this.mergeMessageMetadata(messageId, chunk.metadata);
		state.thinkingStepSignatures.set(stepId, encryptedValue);
		const content = state.thinkingSteps.get(stepId) ?? "";
		if (!state.thinkingSteps.has(stepId)) {
			state.thinkingSteps.set(stepId, content);
			state.thinkingStepOrder.push(stepId);
		}
		this.messages = updateThinkingPart(this.messages, messageId, stepId, content, encryptedValue, redacted, state.thinkingStepOrder);
		this.emitMessagesChange();
	}
	attachToolCallSignature(toolCallId, thoughtSignature) {
		this.messages = this.messages.map((msg) => {
			let changed = false;
			const parts = msg.parts.map((part) => {
				if (part.type !== "tool-call" || part.id !== toolCallId) return part;
				changed = true;
				return {
					...part,
					metadata: {
						...part.metadata != null && typeof part.metadata === "object" ? part.metadata : {},
						thoughtSignature
					}
				};
			});
			return changed ? {
				...msg,
				parts
			} : msg;
		});
		for (const state of this.messageStates.values()) {
			const call = state.toolCalls.get(toolCallId);
			if (!call) continue;
			call.metadata = {
				...call.metadata ?? {},
				thoughtSignature
			};
		}
		this.emitMessagesChange();
	}
	/**
	* Handle CUSTOM event.
	*
	* Handles custom events consumed by the processor:
	* - 'tool-input-available': Legacy/replay-compatible input for client tool
	*   execution. Fires onToolCall.
	* - 'approval-requested': Legacy/replay-compatible input for tool approval.
	*   Updates tool-call part state and fires onApprovalRequest.
	*
	* Current core streams represent user-actionable waits through
	* RUN_FINISHED.outcome.type === 'interrupt'; these custom events are not the
	* source of truth for new emissions.
	*
	* @see docs/chat-architecture.md#client-tools-and-approval-flows — Full flow details
	*/
	handleCustomEvent(chunk) {
		const messageId = this.getActiveAssistantMessageId();
		if (chunk.name === "structured-output.start" && chunk.value) {
			const v = chunk.value;
			const { messageId: targetId } = this.ensureAssistantMessage(v.messageId && this.getMessageState(v.messageId) ? v.messageId : messageId ?? v.messageId);
			if (targetId) {
				this.structuredMessageIds.add(targetId);
				this.structuredOutputUpdateBatches.delete(targetId);
				this.events.onStructuredOutputChange?.({
					phase: "start",
					messageId: targetId,
					status: "streaming",
					raw: ""
				});
			}
			return;
		}
		if (chunk.name === "structured-output.complete" && chunk.value) {
			const v = chunk.value;
			const { messageId: targetId } = this.ensureAssistantMessage(v.messageId && this.getMessageState(v.messageId) ? v.messageId : messageId ?? v.messageId);
			if (targetId) {
				this.flushStructuredOutputUpdate(targetId);
				this.messages = completeStructuredOutputPart(this.messages, targetId, v.object, v.raw ?? "", v.reasoning);
				this.structuredMessageIds.delete(targetId);
				this.emitStructuredOutputChange(targetId, "complete");
				this.emitMessagesChange();
			}
		}
		if (chunk.name === "tool-input-available" && chunk.value) {
			const { toolCallId, toolName, input } = chunk.value;
			this.toolCallsSentToClient.add(toolCallId);
			this.events.onToolCall?.({
				toolCallId,
				toolName,
				input
			});
			return;
		}
		if (chunk.name === "approval-requested" && chunk.value) {
			const { toolCallId, toolName, input, approval } = chunk.value;
			const resolvedMessageId = messageId ?? this.toolCallToMessage.get(toolCallId);
			if (resolvedMessageId) {
				this.messages = updateToolCallApproval(this.messages, resolvedMessageId, toolCallId, approval.id);
				this.emitMessagesChange();
			}
			this.events.onApprovalRequest?.({
				toolCallId,
				toolName,
				input,
				approvalId: approval.id
			});
			return;
		}
		if (chunk.name === "ui-resource" && chunk.value) {
			const v = chunk.value;
			const resolvedMessageId = this.toolCallToMessage.get(v.toolCallId) ?? messageId;
			if (resolvedMessageId) {
				const part = {
					type: "ui-resource",
					resource: v.resource,
					toolCallId: v.toolCallId,
					toolName: v.toolName,
					...v.serverId !== void 0 && { serverId: v.serverId },
					...v.meta !== void 0 && { meta: v.meta }
				};
				this.messages = this.messages.map((msg) => msg.id === resolvedMessageId ? {
					...msg,
					parts: [...msg.parts, part]
				} : msg);
				this.emitMessagesChange();
			} else console.warn(`[mcp-apps] dropped ui-resource: no target message for toolCallId "${v.toolCallId}" (toolName "${v.toolName}")`);
			return;
		}
		if (this.events.onCustomEvent) {
			const toolCallId = chunk.value && typeof chunk.value === "object" ? chunk.value.toolCallId : void 0;
			this.events.onCustomEvent(chunk.name, chunk.value, { toolCallId });
		}
	}
	/**
	* Detect if an incoming content chunk represents a NEW text segment
	*/
	isNewTextSegment(_chunk, _previous) {
		return true;
	}
	/**
	* Complete all tool calls across all active messages — safety net for stream termination.
	*
	* Called by RUN_FINISHED and finalizeStream(). Force-transitions any tool call
	* not yet in input-complete state. Handles cases where TOOL_CALL_END was
	* missed (adapter bug, network error, aborted stream).
	*
	* @see docs/chat-architecture.md#single-shot-tool-call-response — Safety net behavior
	*/
	completeAllToolCalls() {
		for (const messageId of this.activeMessageIds) this.completeAllToolCallsForMessage(messageId);
	}
	/**
	* Complete all tool calls for a specific message
	*/
	completeAllToolCallsForMessage(messageId) {
		const state = this.getMessageState(messageId);
		if (!state) return;
		state.toolCalls.forEach((toolCall, id) => {
			if (toolCall.state !== "input-complete") {
				const index = state.toolCallOrder.indexOf(id);
				this.completeToolCall(messageId, index, toolCall);
			}
		});
	}
	/**
	* Mark a tool call as complete and emit event
	*/
	completeToolCall(messageId, _index, toolCall) {
		toolCall.state = "input-complete";
		let strictParseSucceeded = false;
		try {
			toolCall.parsedArguments = JSON.parse(toolCall.arguments);
			strictParseSucceeded = true;
		} catch {
			toolCall.parsedArguments = void 0;
		}
		const preserveState = this.isToolCallPartTerminal(toolCall.id) || this.isToolCallPartAwaitingUserAction(toolCall.id);
		const currentPart = this.messages.find((message) => message.id === messageId)?.parts?.find((part) => part.type === "tool-call" && part.id === toolCall.id);
		this.messages = updateToolCallPart(this.messages, messageId, {
			id: toolCall.id,
			name: toolCall.name,
			arguments: toolCall.arguments,
			state: preserveState && currentPart ? currentPart.state : "input-complete",
			input: strictParseSucceeded ? toolCall.parsedArguments : void 0,
			...toolCall.metadata !== void 0 && { metadata: toolCall.metadata }
		});
		this.emitMessagesChange();
		if (preserveState) return;
		this.events.onToolCallStateChange?.(messageId, toolCall.id, "input-complete", toolCall.arguments);
	}
	isToolCallPartAwaitingUserAction(toolCallId) {
		return this.messages.some((msg) => msg.parts?.some((part) => part.type === "tool-call" && part.id === toolCallId && (part.state === "approval-requested" || part.state === "approval-responded")));
	}
	/**
	* Whether the rendered tool-call part for the given id has reached a
	* terminal 'error' or 'complete' state. Used to prevent the completion
	* safety net from downgrading a finished call back to 'input-complete'.
	*/
	isToolCallPartTerminal(toolCallId) {
		return this.messages.some((msg) => msg.parts?.some((part) => part.type === "tool-call" && part.id === toolCallId && (part.state === "error" || part.state === "complete")));
	}
	/**
	* Emit pending text update for a specific message.
	*
	* Calls updateTextPart() which has critical append-vs-replace logic:
	* - If last UIMessage part is TextPart → replaces its content (same segment).
	* - If last part is anything else → pushes new TextPart (new segment after tools).
	*
	* @see docs/chat-architecture.md#uimessage-part-ordering-invariants — Replace vs. push logic
	*/
	emitTextUpdateForMessage(messageId) {
		const state = this.getMessageState(messageId);
		if (!state) return;
		state.lastEmittedText = state.currentSegmentText;
		this.messages = updateTextPart(this.messages, messageId, state.currentSegmentText);
		this.emitMessagesChange();
		this.events.onTextUpdate?.(messageId, state.currentSegmentText);
	}
	queueStructuredOutputUpdate(messageId, delta) {
		const existing = this.structuredOutputUpdateBatches.get(messageId);
		const next = {
			delta: `${existing?.delta ?? ""}${delta}`,
			chunkCount: (existing?.chunkCount ?? 0) + 1
		};
		this.structuredOutputUpdateBatches.set(messageId, next);
		if (next.chunkCount >= STRUCTURED_OUTPUT_UPDATE_BATCH_SIZE) this.flushStructuredOutputUpdate(messageId);
	}
	flushStructuredOutputUpdate(messageId) {
		const batch = this.structuredOutputUpdateBatches.get(messageId);
		if (!batch || batch.chunkCount === 0) return;
		this.structuredOutputUpdateBatches.delete(messageId);
		this.emitStructuredOutputChange(messageId, "update", batch.delta);
	}
	emitStructuredOutputChange(messageId, phase, delta) {
		const part = this.messages.find((message) => message.id === messageId)?.parts.find((messagePart) => messagePart.type === "structured-output");
		if (!part) return;
		this.events.onStructuredOutputChange?.({
			phase,
			messageId,
			status: part.status,
			raw: part.raw,
			...part.partial !== void 0 ? { partial: part.partial } : {},
			...part.data !== void 0 ? { data: part.data } : {},
			...part.reasoning !== void 0 ? { reasoning: part.reasoning } : {},
			...part.errorMessage !== void 0 ? { errorMessage: part.errorMessage } : {},
			...delta !== void 0 ? { delta } : {}
		});
	}
	/**
	* Emit messages change event
	*/
	emitMessagesChange() {
		this.events.onMessagesChange?.([...this.messages]);
	}
	/**
	* Finalize the stream — complete all pending operations.
	*
	* Called when the async iterable ends (stream closed). Acts as the final
	* safety net: completes any remaining tool calls, flushes un-emitted text,
	* and fires onStreamEnd.
	*
	* @see docs/chat-architecture.md#single-shot-text-response — Finalization step
	*/
	finalizeStream() {
		this.isDone = true;
		for (const event of this.closeChunk()) this.dispatchChunk(event);
		this.closeChildChunkLanes();
		let lastAssistantMessage;
		for (const messageId of this.activeMessageIds) {
			const state = this.getMessageState(messageId);
			if (!state) continue;
			this.completeAllToolCallsForMessage(messageId);
			if (state.currentSegmentText !== state.lastEmittedText) this.emitTextUpdateForMessage(messageId);
			state.isComplete = true;
			const msg = this.messages.find((m) => m.id === messageId);
			if (msg && msg.role === "assistant") lastAssistantMessage = msg;
		}
		for (const messageId of this.structuredMessageIds) {
			this.flushStructuredOutputUpdate(messageId);
			this.messages = errorStructuredOutputPart(this.messages, messageId, "Stream ended without structured-output.complete");
			this.emitStructuredOutputChange(messageId, "error");
		}
		this.structuredMessageIds.clear();
		this.structuredOutputUpdateBatches.clear();
		this.activeMessageIds.clear();
		if (lastAssistantMessage && !this.hasError) {
			if (this.isWhitespaceOnlyMessage(lastAssistantMessage)) {
				this.messages = this.messages.filter((m) => m.id !== lastAssistantMessage.id);
				this.emitMessagesChange();
				return;
			}
		}
		if (lastAssistantMessage && !this.streamEndEmitted) {
			this.streamEndEmitted = true;
			this.events.onStreamEnd?.(lastAssistantMessage);
		}
	}
	/**
	* Get completed tool calls in API format (aggregated across all messages)
	*/
	getCompletedToolCalls() {
		const result = [];
		for (const state of this.messageStates.values()) for (const tc of state.toolCalls.values()) if (tc.state === "input-complete") result.push({
			id: tc.id,
			type: "function",
			function: {
				name: tc.name,
				arguments: tc.arguments
			},
			...tc.metadata !== void 0 && { metadata: tc.metadata }
		});
		return result;
	}
	/**
	* Get current result (aggregated across all messages)
	*/
	getResult() {
		const toolCalls = this.getCompletedToolCalls();
		let content = "";
		let thinking = "";
		for (const state of this.messageStates.values()) {
			content += state.totalTextContent;
			for (const stepId of state.thinkingStepOrder) thinking += state.thinkingSteps.get(stepId) ?? "";
		}
		return {
			content,
			thinking: thinking || void 0,
			toolCalls: toolCalls.length > 0 ? toolCalls : void 0,
			finishReason: this.finishReason
		};
	}
	/**
	* Get current processor state (aggregated across all messages)
	*/
	getState() {
		let content = "";
		let thinking = "";
		const toolCalls = /* @__PURE__ */ new Map();
		const toolCallOrder = [];
		for (const state of this.messageStates.values()) {
			content += state.totalTextContent;
			for (const stepId of state.thinkingStepOrder) thinking += state.thinkingSteps.get(stepId) ?? "";
			for (const [id, tc] of state.toolCalls) toolCalls.set(id, tc);
			toolCallOrder.push(...state.toolCallOrder);
		}
		return {
			content,
			thinking,
			toolCalls,
			toolCallOrder,
			finishReason: this.finishReason,
			done: this.isDone
		};
	}
	/**
	* Start recording chunks
	*/
	startRecording() {
		this.recordingEnabled = true;
		this.recordingStartTime = Date.now();
		this.recording = {
			version: "1.0",
			timestamp: this.recordingStartTime,
			chunks: []
		};
	}
	/**
	* Get the current recording
	*/
	getRecording() {
		return this.recording;
	}
	/**
	* Reset stream state (but keep messages)
	*/
	resetStreamState() {
		this.messageStates.clear();
		this.callMessageIds.clear();
		this.unassignedCallMessageIds.clear();
		this.activeMessageIds.clear();
		this.activeRuns.clear();
		this.toolCallToMessage.clear();
		this.structuredMessageIds.clear();
		this.structuredOutputUpdateBatches.clear();
		this.pendingManualMessageId = null;
		this.provisionalMessageId = null;
		this.legacyManualMessage = false;
		this.pendingThinkingStepId = null;
		this.pendingReasoningMessageId = null;
		this.unboundThinkingStepId = null;
		this.pendingReasoningAliases.clear();
		this.openChunk = null;
		this.finishReason = null;
		this.hasError = false;
		this.isDone = false;
		this.streamEndEmitted = false;
		this.chunkStrategy.reset?.();
	}
	/**
	* Full reset (including messages)
	*/
	reset() {
		this.resetStreamState();
		this.messages = [];
		this.childProcessors.clear();
		this.childToolCalls.clear();
	}
	/**
	* Check if a message contains only whitespace text and no other meaningful parts
	* (no tool calls, tool results, thinking, etc.)
	*/
	isWhitespaceOnlyMessage(message) {
		if (message.parts.length === 0) return false;
		return message.parts.every((part) => part.type === "text" && part.content.trim() === "");
	}
	/**
	* Replay a recording through the processor
	*/
	static async replay(recording, options) {
		return new StreamProcessor(options).process(createReplayStream(recording));
	}
};
/**
* Create an async iterable from a recording
*/
function createReplayStream(recording) {
	return { async *[Symbol.asyncIterator]() {
		for (const { chunk } of recording.chunks) yield chunk;
	} };
}
//#endregion
export { StreamProcessor, createReplayStream };

//# sourceMappingURL=processor.js.map