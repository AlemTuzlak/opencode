import { isToolInputJsonLossless } from "../../utilities/tool-call-arguments.js";
import { isCancelRequestedReason } from "./cancel.js";
import { CapabilityRegistry } from "./middleware/capabilities.js";
import { getRunDetached } from "./middleware/run-store.js";
import { publishRunDetachedSignal } from "../../delivery-detach.js";
import { publishRunDisconnectHandler } from "../../delivery-disconnect.js";
import { EventType } from "../../types.js";
import { rebuildTokenUsage } from "../../utilities/ag-ui-usage.js";
import { tanstackMetadata, withTanstackMetadata } from "../../utilities/merge-metadata.js";
import { withDurabilityBatchHint } from "../../utilities/durability-batch.js";
import { isRedactedThinkingId } from "../../utilities/reasoning-encrypted-value.js";
import { normalizeStreamChunk } from "../../utilities/normalize-stream-chunk.js";
import { resolveDebugOption } from "../../logger/resolve.js";
import { streamToText } from "../../stream-to-response.js";
import { normalizeReasoning } from "../../reasoning.js";
import { canonicalInterruptJson, digestInterruptJson } from "../../interrupt-serialization.js";
import "../../interrupts.js";
import { convertSchemaForStructuredOutput, convertSchemaToJsonSchema, isStandardSchema, parseWithStandardSchema, validateWithStandardSchema } from "./tools/schema-converter.js";
import { hashSchemaInput, normalizeApprovalSchema } from "./tools/approval-schema.js";
import { INTERRUPT_BINDING_METADATA_KEY, InterruptResumeValidationError, readInterruptBinding, readUnopenedInterruptBinding, validateInterruptResumeBatch } from "../../interrupt-resume.js";
import { INTERRUPT_PAYLOAD_METADATA_KEY, createInterruptBinding, rehydrateInterruptRequest } from "../../interrupt-definition.js";
import { readGenericInterruptContinuation } from "../../generic-interrupt-continuation.js";
import { isProviderExecutedToolCall } from "../../utilities/provider-executed.js";
import { normalizeToolResult, parseToolOutput, toolResultErrorText } from "../../utilities/tool-result.js";
import { subagentHostMessageId } from "../../utilities/subagent-wire.js";
import { buildBlockOrder } from "../../utilities/block-order.js";
import { appendUiResourceToModelMessages, convertMessagesToModelMessages, generateMessageId, modelMessagesToUIMessages, safeJsonStringify, uiResourcePartFromCustomValue } from "./messages.js";
import { uiMessagesToWire } from "../../utilities/ag-ui-wire.js";
import { restorePublicUsage } from "../../utilities/restore-inbound-chunk.js";
import { assertMessagesFileSourceSupport } from "../../utilities/content-source.js";
import { planMidConversationChanges } from "../../utilities/mid-conversation.js";
import { transformMessagesForReplay } from "../../utilities/replay-messages.js";
import { normalizeSystemPrompts } from "../../system-prompts.js";
import { LazyToolManager } from "./tools/lazy-tool-manager.js";
import { assertUniqueToolNames } from "./tools/unique-tool-names.js";
import { MiddlewareAbortError, ToolCallManager, executeToolCalls } from "./tools/tool-calls.js";
import { SINGLE_SUBAGENT_TOOL, collectNamedText, createSubagentSink, createSyntheticSubagentTools, normalizeRouterPick, rebindInterrupts, spawnNamedAgents, subagentCallMessages, withChildUsage } from "./agents/spawn.js";
import { SUBAGENT_PLAN_KEY, readSubagentTurn } from "./agents/turn.js";
import { maxIterations } from "./agent-loop-strategies.js";
import { applyActivityDeltaToRecords, applyActivitySnapshotToRecords, interleaveActivityRecords, peelInboundActivities } from "./activity-records.js";
import { MiddlewareRunner } from "./middleware/compose.js";
import { provideSandboxRuntime } from "./middleware/sandbox-runtime.js";
import { provideRunDisconnect } from "./middleware/run-disconnect.js";
import { validateCapabilities } from "./middleware/validate.js";
import { MCPManager } from "./mcp/manager.js";
import { provideGenericInterruptDefinitionRegistry } from "./middleware/generic-interrupts.js";
import "./adapter.js";
import { devtoolsMiddleware } from "@tanstack/ai-event-client";
import { undoNullWidening } from "@tanstack/ai-utils";
//#region src/activities/chat/index.ts
/**
* Text Activity
*
* Handles agentic text generation, one-shot text generation, and agentic structured output.
* This is a self-contained module with implementation, types, and JSDoc.
*/
/**
* The order map for one assistant message built from `parts`. Calls that are
* not in `toolCalls` are left out, because the message does not carry them.
* Calls that the stream did not report go last, their default place.
*/
function turnBlockOrder(parts, toolCalls) {
	const unplaced = new Set(toolCalls.map((toolCall) => toolCall.id));
	const entries = parts.flatMap((part) => {
		if (part.type === "thinking") return [{ type: "thinking" }];
		if (part.type === "text") return [{
			type: "text",
			text: part.content
		}];
		return unplaced.delete(part.id) ? [{
			type: "tool-call",
			id: part.id
		}] : [];
	});
	for (const id of unplaced) entries.push({
		type: "tool-call",
		id
	});
	return buildBlockOrder(entries);
}
/**
* The tool result of a call in an answer that stopped at the output limit.
* The harness default is the same text.
*/
var TRUNCATED_TOOL_RESULT = "The answer was cut off at the output limit before this tool call was complete. The call did not run.";
/** The adapter kind this activity handles */
var kind = "text";
var interruptBindingMetadataKey = INTERRUPT_BINDING_METADATA_KEY;
/** Resume entries a subagent tool call owns. The parent run skips them. */
var CHILD_RESUME_IDS = Symbol("tanstack.ai.childResumeIds");
function isInterruptSubmissionError(value) {
	if (value === null || typeof value !== "object" || Array.isArray(value)) return false;
	if (!("scope" in value) || !("code" in value) || !("message" in value) || !("source" in value) || !("retryable" in value) || !("threadId" in value) || !("interruptedRunId" in value) || !("generation" in value) || typeof value.code !== "string" || typeof value.message !== "string" || typeof value.retryable !== "boolean" || typeof value.threadId !== "string" || typeof value.interruptedRunId !== "string" || typeof value.generation !== "number") return false;
	if (value.scope === "item") return "interruptId" in value && typeof value.interruptId === "string" && (value.source === "client" || value.source === "server");
	return value.scope === "batch" && "interruptIds" in value && Array.isArray(value.interruptIds) && value.interruptIds.every((id) => typeof id === "string") && (value.source === "client" || value.source === "server" || value.source === "transport");
}
function structuralInterruptFailure(error) {
	if (!(error instanceof Error) || error.name !== "InterruptResumeValidationError" || !("errors" in error) || !Array.isArray(error.errors) || error.errors.length === 0 || !error.errors.every(isInterruptSubmissionError)) return;
	return {
		error,
		errors: error.errors
	};
}
function normalizePublicInterruptBinding(value, expectedInterruptId) {
	return readInterruptBinding({
		id: expectedInterruptId,
		reason: "",
		metadata: { [INTERRUPT_BINDING_METADATA_KEY]: value }
	});
}
/**
* Create typed options for the chat() function without executing.
* This is useful for pre-defining configurations with full type inference.
*
* @example
* ```ts
* const chatOptions = createChatOptions({
*   adapter: anthropicText('claude-sonnet-4-5'),
* })
*
* const stream = chat({ ...chatOptions, messages })
* ```
*/
function createChatOptions(options) {
	return options;
}
/**
* Combine two optional AbortSignals into one that aborts when either does.
* Returns the other signal directly when one is absent or already aborted.
* (Manual implementation — `AbortSignal.any` requires Node >= 20.3.)
*/
function combineAbortSignals(a, b) {
	if (!a) return b;
	if (!b) return a;
	if (a.aborted) return a;
	if (b.aborted) return b;
	const controller = new AbortController();
	const onAbort = (source) => () => {
		controller.abort(source.reason);
	};
	a.addEventListener("abort", onAbort(a), { once: true });
	b.addEventListener("abort", onAbort(b), { once: true });
	return controller.signal;
}
var TextEngine = class {
	adapter;
	interruptDefinitions;
	params;
	/**
	* The tool choice of the next model call. `params.toolChoice` keeps the
	* `chat()` option, so a middleware value lasts for one call only.
	*/
	callToolChoice = void 0;
	/** The composed fetch wrapper of the next model call. */
	callWrapFetch = void 0;
	systemPrompts;
	tools;
	loopStrategy;
	toolCallManager;
	lazyToolManager;
	/** A public interruption terminal must always have this run's start event. */
	hasPublicRunStarted = false;
	initialMessageCount;
	requestId;
	streamId;
	effectiveRequest;
	effectiveSignal;
	messages;
	activities = [];
	providerMessages;
	iterationCount = 0;
	/** Cumulative tool calls counted in this run (emitted + pending resume). */
	toolCallCount = 0;
	/** Tool calls in the most recent budgeted batch (0 when none). */
	lastTurnToolCallCount = 0;
	/** Tool call IDs already counted toward `toolCallCount` (avoids double-count on resume). */
	countedToolCallIds = /* @__PURE__ */ new Set();
	lastFinishReason = null;
	streamStartTime = 0;
	totalChunkCount = 0;
	currentMessageId = null;
	currentMessageCreatedAt = null;
	streamIdentityCaptured = false;
	accumulatedContent = "";
	accumulatedThinking = [];
	/**
	* Arrival order of this iteration's thinking steps, text and tool calls.
	* A ModelMessage keeps `thinking` apart from `content`/`toolCalls`, so a
	* provider turn that thinks between provider-executed tools would otherwise
	* be recorded as "all thinking, then text, then tools" and the provider
	* rejects the replay (signed thinking must keep its position). `null` once
	* the order could no longer be tracked (callers fall back to one message).
	*/
	turnParts = [];
	/**
	* The mid-conversation record of the current model call. The first
	* assistant message that the call produces takes it. A call that produces
	* none (an error, an abort) saves nothing, and the next call plans again.
	*/
	pendingMidConversationChange = void 0;
	thinkingBlocks = /* @__PURE__ */ new Map();
	reasoningStepAliases = /* @__PURE__ */ new Map();
	currentThinkingStepId;
	pendingReasoningMessageId;
	pendingThinkingStepId;
	eventOptions;
	eventToolNames;
	finishedEvent = null;
	currentCallMetadata = {};
	structuredCallMetadata = {};
	streamedToolErrorResults = /* @__PURE__ */ new Map();
	deferredToolCallRunFinishedChunks = [];
	/** The model terminal is held until afterModel can choose an interrupt. */
	deferredModelRunFinishedChunks = [];
	earlyTermination = false;
	toolPhase = "continue";
	cyclePhase = "processText";
	initialApprovals;
	initialClientToolResults;
	resumeApprovals = /* @__PURE__ */ new Map();
	resumeClientToolResults = /* @__PURE__ */ new Map();
	resumeClientToolErrors = /* @__PURE__ */ new Map();
	resumeDeniedToolResults = /* @__PURE__ */ new Map();
	resumeCancelledToolCallIds = /* @__PURE__ */ new Set();
	resumeInputResponses = /* @__PURE__ */ new Map();
	resumeGenericInterrupts = /* @__PURE__ */ new Map();
	resumeGenericInterruptRequests = /* @__PURE__ */ new Map();
	threadId;
	runIdOverride;
	parentRunIdOverride;
	subagentRunIdOverride;
	middlewareRunner;
	middlewareCtx;
	sandboxFileQueue = [];
	middlewareCustomQueue = [];
	middlewareCustomWaiters = [];
	drainingMiddlewareCustom = false;
	deferredPromises = [];
	abortReason;
	middlewareAbortController;
	toolAbortSignal;
	terminalHookCalled = false;
	/**
	* Latched the first time the delivery socket closes; see `notifyDisconnected`.
	* Also read by `subscribe` so a listener registered AFTER the disconnect (a
	* middleware whose `setup` was still running at the time — the common case) is
	* called immediately rather than never.
	*/
	disconnected = false;
	disconnectListeners = [];
	logger;
	structuredOutputResult = null;
	structuredOutputMessageId = null;
	structuredOutputMessageCreatedAt = null;
	combinedStartEmitted = false;
	combinedStructuredMessageId = null;
	validatedStructuredOutput = void 0;
	hasValidatedStructuredOutput = false;
	finalizationError = null;
	combinedCompleteEmitted = false;
	finalStructuredOutput;
	constructor(config, logger) {
		this.logger = logger;
		this.adapter = config.adapter;
		this.interruptDefinitions = new Map((config.params.interrupts ?? []).map((definition) => [definition.id, definition]));
		this.finalStructuredOutput = config.finalStructuredOutput;
		this.params = {
			...config.params,
			reasoning: normalizeReasoning(config.params.reasoning)
		};
		this.systemPrompts = config.params.systemPrompts || [];
		this.loopStrategy = config.params.agentLoopStrategy || maxIterations(5);
		this.initialMessageCount = config.params.messages.length;
		const { approvals, clientToolResults } = this.extractClientStateFromOriginalMessages(config.params.messages);
		this.initialApprovals = approvals;
		this.initialClientToolResults = clientToolResults;
		this.activities = peelInboundActivities(config.params.messages ?? []);
		this.messages = convertMessagesToModelMessages(config.params.messages);
		this.providerMessages = this.messages;
		assertUniqueToolNames(config.params.tools || []);
		this.lazyToolManager = new LazyToolManager(config.params.tools || [], this.messages, config.params.lazyToolsConfig);
		this.tools = this.lazyToolManager.getActiveTools();
		this.toolCallManager = new ToolCallManager(this.tools);
		this.requestId = this.createId("chat");
		this.streamId = this.createId("stream");
		this.effectiveRequest = config.params.abortController ? { signal: config.params.abortController.signal } : void 0;
		this.effectiveSignal = config.params.abortController?.signal;
		this.threadId = config.params.threadId || config.params.conversationId || this.createId("thread");
		this.runIdOverride = config.params.runId;
		this.parentRunIdOverride = config.params.parentRunId;
		this.subagentRunIdOverride = config.params.subagentRunId;
		const allMiddleware = [devtoolsMiddleware(), ...config.middleware || []];
		this.middlewareRunner = new MiddlewareRunner(allMiddleware, logger);
		this.middlewareAbortController = new AbortController();
		this.toolAbortSignal = combineAbortSignals(this.effectiveSignal, this.middlewareAbortController.signal);
		this.middlewareCtx = {
			requestId: this.requestId,
			streamId: this.streamId,
			runId: this.runIdOverride ?? this.requestId,
			parentRunId: this.parentRunIdOverride,
			subagentRunId: this.subagentRunIdOverride,
			subagentName: config.params.subagentName,
			parentSubagentRunId: config.params.parentSubagentRunId,
			threadId: this.threadId,
			conversationId: this.threadId,
			phase: "init",
			iteration: 0,
			chunkIndex: 0,
			signal: this.effectiveSignal,
			abort: (reason) => {
				this.abortReason = reason;
				this.middlewareAbortController?.abort(reason);
			},
			emitCustomEvent: (name, value, options) => {
				this.middlewareCustomQueue.push(this.createCustomEventChunk(name, value, options));
				const waiters = this.middlewareCustomWaiters;
				this.middlewareCustomWaiters = [];
				for (const waiter of waiters) waiter();
			},
			context: config.context,
			defer: (promise) => {
				this.deferredPromises.push(promise);
			},
			activity: "chat",
			provider: config.adapter.name,
			model: config.params.model,
			source: "server",
			streaming: true,
			systemPrompts: this.systemPrompts,
			toolNames: void 0,
			options: void 0,
			modelOptions: config.params.modelOptions,
			messageCount: this.initialMessageCount,
			hasTools: this.tools.length > 0,
			currentMessageId: null,
			accumulatedContent: "",
			messages: this.messages,
			activities: this.activities,
			createId: (prefix) => this.createId(prefix),
			capabilities: new CapabilityRegistry(),
			get: (capability) => capability[0](this.middlewareCtx),
			getOptional: (capability) => capability[0](this.middlewareCtx, { optional: true }),
			provide: (capability, value) => capability[1](this.middlewareCtx, value)
		};
		provideRunDisconnect(this.middlewareCtx, { subscribe: (listener) => {
			this.disconnectListeners.push(listener);
			if (this.disconnected) this.runDisconnectListener(listener);
		} });
		provideGenericInterruptDefinitionRegistry(this.middlewareCtx, { definitions: this.interruptDefinitions });
		provideSandboxRuntime(this.middlewareCtx, {
			logger: this.logger,
			emit: (event) => {
				this.logger.sandbox(`file ${event.type} ${event.path}`, { event: {
					type: event.type,
					path: event.path,
					timestamp: event.timestamp
				} });
				this.middlewareRunner.runSandboxFile(this.middlewareCtx, event).catch((err) => {
					this.logger.errors("sandbox file hook failed", { error: err });
				});
				this.sandboxFileQueue.push(this.createCustomEventChunk("sandbox.file", {
					type: event.type,
					path: event.path,
					timestamp: event.timestamp
				}));
			},
			emitFileDiff: (value) => {
				this.sandboxFileQueue.push(this.createCustomEventChunk("sandbox.file.diff", value));
			}
		});
	}
	/** Get the accumulated content after the chat loop completes */
	getAccumulatedContent() {
		return this.accumulatedContent;
	}
	/** Get the final messages array after the chat loop completes */
	getMessages() {
		return this.messages;
	}
	/** Returns the structured-output result if finalization ran successfully. */
	getStructuredOutputResult() {
		return this.structuredOutputResult;
	}
	/**
	* Returns the validated structured-output value (the result of running
	* `finalStructuredOutput.validate` against the raw structured-output data)
	* wrapped in a `{ value }` object so callers can distinguish "no validation
	* happened" from "validation produced undefined". Returns `null` when no
	* validator was configured or validation hasn't been performed yet.
	*/
	getValidatedStructuredOutput() {
		return this.hasValidatedStructuredOutput ? { value: this.validatedStructuredOutput } : null;
	}
	/** Returns the recorded finalization error, if any. */
	getFinalizationError() {
		return this.finalizationError;
	}
	async runTerminalHook() {
		if (this.terminalHookCalled || this.isCancelled()) return;
		this.terminalHookCalled = true;
		if (this.finalizationError) {
			const errForHook = new Error(this.finalizationError.message, this.finalizationError.cause !== void 0 ? { cause: this.finalizationError.cause } : void 0);
			if (this.finalizationError.code !== void 0) Object.defineProperty(errForHook, "code", {
				value: this.finalizationError.code,
				enumerable: true
			});
			if (this.finalizationError.rawText !== void 0) Object.defineProperty(errForHook, "rawText", {
				value: this.finalizationError.rawText,
				enumerable: true
			});
			await this.middlewareRunner.runOnError(this.middlewareCtx, {
				error: errForHook,
				duration: Date.now() - this.streamStartTime
			});
			return;
		}
		this.addTerminalAssistantMessages();
		await this.middlewareRunner.runOnFinish(this.middlewareCtx, {
			finishReason: this.lastFinishReason,
			duration: Date.now() - this.streamStartTime,
			content: this.accumulatedContent,
			usage: rebuildTokenUsage(this.finishedEvent?.usage, tanstackMetadata(this.finishedEvent ?? void 0)?.usage)
		});
	}
	async *run() {
		this.beforeRun();
		this.logger.agentLoop("run started", { threadId: this.middlewareCtx.threadId });
		try {
			yield* this.runWhileYielding(this.middlewareRunner.runSetup(this.middlewareCtx));
			this.middlewareCtx.phase = "init";
			const initialConfig = this.buildMiddlewareConfig();
			const transformedConfig = yield* this.runWhileYielding(this.middlewareRunner.runOnConfig(this.middlewareCtx, initialConfig));
			this.applyMiddlewareConfig(transformedConfig);
			await this.applyEphemeralInterruptResume(transformedConfig);
			await this.applyDurableGenericInterruptResolution();
			yield* this.runWhileYielding(this.middlewareRunner.runOnStart(this.middlewareCtx));
			yield* this.checkCompletedResumedClientTools();
			if (this.earlyTermination) {
				yield* this.emitSuccessfulEarlyTermination();
				if (!this.terminalHookCalled) {
					this.terminalHookCalled = true;
					await this.middlewareRunner.runOnFinish(this.middlewareCtx, {
						finishReason: this.lastFinishReason,
						duration: Date.now() - this.streamStartTime,
						content: this.accumulatedContent,
						usage: rebuildTokenUsage(this.finishedEvent?.usage, tanstackMetadata(this.finishedEvent ?? void 0)?.usage)
					});
				}
				return;
			}
			const pendingPhase = yield* this.checkForPendingToolCalls();
			if (pendingPhase === "stop" || pendingPhase === "wait") {
				await this.runTerminalHook();
				return;
			}
			if (!(!!this.finalStructuredOutput && this.tools.length === 0 && this.finalStructuredOutput.nativeCombined !== true)) do {
				if (this.earlyTermination) break;
				if (this.isCancelled()) return;
				this.logger.agentLoop(`iteration=${this.middlewareCtx.iteration}`, { iteration: this.middlewareCtx.iteration });
				yield* this.runWhileYielding(this.beginCycle());
				if (this.cyclePhase === "processText") {
					this.middlewareCtx.phase = "beforeModel";
					this.middlewareCtx.iteration = this.iterationCount;
					const iterConfig = this.buildMiddlewareConfig();
					const iterTransformedConfig = yield* this.runWhileYielding(this.middlewareRunner.runOnConfig(this.middlewareCtx, iterConfig));
					this.applyMiddlewareConfig(iterTransformedConfig);
					if (yield* this.emitBoundaryInterrupts("beforeModel", this.createSyntheticFinishedEvent())) {
						this.setToolPhase("wait");
						return;
					}
					yield* this.streamModelResponse();
					if (this.earlyTermination) break;
					if (yield* this.emitBoundaryInterrupts("afterModel", this.finishedEvent ?? this.createSyntheticFinishedEvent(), this.toolCallManager.getToolCalls())) {
						this.setToolPhase("wait");
						return;
					}
					if (this.shouldExecuteToolPhase()) {
						this.deferredToolCallRunFinishedChunks.push(...this.deferredModelRunFinishedChunks);
						this.deferredModelRunFinishedChunks = [];
					} else if (!this.finalStructuredOutput?.nativeCombined) yield* this.flushDeferredModelRunFinishedChunks();
				} else yield* this.processToolCalls();
				this.endCycle();
			} while (yield* this.runWhileYielding(this.shouldContinue()));
			this.logger.agentLoop("run finished", { finishReason: this.lastFinishReason });
			if (this.finalStructuredOutput && this.toolPhase !== "wait" && !this.isCancelled() && !this.finalizationError && !this.earlyTermination) {
				if (this.finalStructuredOutput.nativeCombined === true) {
					yield* this.harvestCombinedStructuredOutput();
					if (!this.finalizationError && !this.isCancelled()) yield* this.flushDeferredModelRunFinishedChunks();
				} else yield* this.runStructuredFinalization();
			}
			await this.runTerminalHook();
		} catch (error) {
			if (error instanceof Error && error.name === "InterruptReplaySignal" && "continuationRunId" in error && typeof error.continuationRunId === "string") {
				this.terminalHookCalled = true;
				yield* this.pipeThroughMiddleware({
					type: EventType.RUN_FINISHED,
					timestamp: Date.now(),
					threadId: this.threadId,
					runId: this.runIdOverride ?? this.requestId,
					outcome: { type: "success" },
					result: {
						replayed: true,
						continuationRunId: error.continuationRunId
					}
				});
				return;
			}
			const interruptFailure = structuralInterruptFailure(error);
			if (interruptFailure) {
				this.terminalHookCalled = true;
				this.logger.errors("chat interrupt resume failed", {
					error,
					threadId: this.middlewareCtx.threadId
				});
				await this.middlewareRunner.runOnError(this.middlewareCtx, {
					error: interruptFailure.error,
					duration: Date.now() - this.streamStartTime
				});
				yield this.buildInterruptRunErrorChunk(error);
				return;
			}
			if (!this.terminalHookCalled) {
				this.terminalHookCalled = true;
				if (error instanceof MiddlewareAbortError) {
					this.abortReason = error.message;
					await this.middlewareRunner.runOnAbort(this.middlewareCtx, {
						reason: error.message,
						duration: Date.now() - this.streamStartTime,
						cancelRequested: isCancelRequestedReason(error.message)
					});
				} else {
					this.logger.errors("chat run failed", {
						error,
						threadId: this.middlewareCtx.threadId
					});
					await this.middlewareRunner.runOnError(this.middlewareCtx, {
						error,
						duration: Date.now() - this.streamStartTime
					});
				}
			}
			if (!(error instanceof MiddlewareAbortError)) throw error;
		} finally {
			if (!this.terminalHookCalled && this.isCancelled()) {
				this.terminalHookCalled = true;
				const reason = this.resolveAbortReason();
				await this.middlewareRunner.runOnAbort(this.middlewareCtx, {
					reason,
					duration: Date.now() - this.streamStartTime,
					cancelRequested: isCancelRequestedReason(reason)
				});
			}
			if (this.deferredPromises.length > 0) await Promise.allSettled(this.deferredPromises);
		}
	}
	beforeRun() {
		this.streamStartTime = Date.now();
		const { tools, metadata } = this.params;
		const options = {};
		if (metadata !== void 0) options.metadata = metadata;
		this.eventOptions = Object.keys(options).length > 0 ? options : void 0;
		this.eventToolNames = tools?.map((t) => t.name);
		this.middlewareCtx.options = this.eventOptions;
		this.middlewareCtx.toolNames = this.eventToolNames;
	}
	async beginCycle() {
		if (this.cyclePhase === "processText") await this.beginIteration();
	}
	endCycle() {
		if (this.cyclePhase === "processText") {
			this.cyclePhase = "executeToolCalls";
			return;
		}
		this.cyclePhase = "processText";
		this.iterationCount++;
	}
	async beginIteration() {
		this.currentCallMetadata = { source: {
			provider: this.adapter.provider ?? this.adapter.name,
			api: this.adapter.api ?? this.adapter.kind,
			model: this.params.model
		} };
		this.currentMessageId = this.createId("msg");
		this.currentMessageCreatedAt = /* @__PURE__ */ new Date();
		this.streamIdentityCaptured = false;
		this.accumulatedContent = "";
		this.accumulatedThinking = [];
		this.turnParts = [];
		this.thinkingBlocks.clear();
		this.reasoningStepAliases.clear();
		this.currentThinkingStepId = void 0;
		this.pendingReasoningMessageId = void 0;
		this.pendingThinkingStepId = void 0;
		this.finishedEvent = null;
		this.streamedToolErrorResults.clear();
		this.middlewareCtx.currentMessageId = this.currentMessageId;
		this.middlewareCtx.accumulatedContent = "";
		await this.middlewareRunner.runOnIteration(this.middlewareCtx, {
			iteration: this.iterationCount,
			messageId: this.currentMessageId
		});
	}
	async *streamModelResponse() {
		const { metadata, modelOptions, reasoning } = this.params;
		const tools = this.tools;
		const toolsWithJsonSchemas = tools.map((tool) => ({
			...tool,
			inputSchema: tool.inputSchema ? convertSchemaToJsonSchema(tool.inputSchema) : void 0,
			outputSchema: tool.outputSchema ? convertSchemaToJsonSchema(tool.outputSchema) : void 0
		}));
		this.middlewareCtx.phase = "modelStream";
		const providerName = this.adapter.provider ?? this.adapter.name;
		this.logger.request(`activity=chat provider=${providerName} model=${this.params.model} messages=${this.messages.length} tools=${this.tools.length} stream=true`, {
			provider: providerName,
			model: this.params.model,
			messageCount: this.messages.length,
			toolCount: this.tools.length
		});
		const combinedSchema = this.finalStructuredOutput?.nativeCombined === true ? this.finalStructuredOutput.jsonSchema : void 0;
		const { approvals } = this.collectClientState();
		const adapterApprovals = /* @__PURE__ */ new Map();
		for (const [approvalId, resolution] of approvals) adapterApprovals.set(approvalId, typeof resolution === "boolean" ? resolution : resolution.approved);
		assertMessagesFileSourceSupport(this.adapter, this.messages);
		const channels = this.adapter.midConversationChannels;
		const midConversation = channels?.tools || channels?.systemPrompts ? planMidConversationChanges({
			messages: this.providerMessages,
			toolNames: tools.map((tool) => tool.name),
			systemPrompts: normalizeSystemPrompts(this.systemPrompts).map((prompt) => prompt.content)
		}) : void 0;
		this.pendingMidConversationChange = midConversation?.record;
		const replay = transformMessagesForReplay(this.providerMessages);
		if (midConversation) {
			const originalChanges = midConversation.changes.changes;
			const mappedChanges = originalChanges.map((change) => ({
				...change,
				before: replay.boundaryMap[change.before] ?? replay.messages.length
			}));
			const grouped = /* @__PURE__ */ new Map();
			for (const change of mappedChanges) {
				const previous = grouped.get(change.before);
				grouped.set(change.before, previous ? {
					before: change.before,
					...previous.tools || change.tools ? { tools: [...previous.tools ?? [], ...change.tools ?? []] } : {},
					...previous.systemPrompts !== void 0 || change.systemPrompts !== void 0 ? { systemPrompts: (previous.systemPrompts ?? 0) + (change.systemPrompts ?? 0) } : {}
				} : change);
			}
			const uniqueOriginalBoundaries = new Set(originalChanges.map((change) => change.before)).size === originalChanges.length;
			midConversation.changes = {
				...midConversation.changes,
				changes: uniqueOriginalBoundaries ? [...grouped.values()] : mappedChanges
			};
		}
		const toolChoice = toolsWithJsonSchemas.length > 0 ? this.callToolChoice : void 0;
		for await (const adapterChunk of this.adapter.chatStream({
			model: this.params.model,
			messages: replay.messages,
			tools: toolsWithJsonSchemas,
			metadata,
			request: this.effectiveRequest,
			modelOptions,
			...reasoning ? { reasoning } : {},
			systemPrompts: this.systemPrompts,
			logger: this.logger,
			threadId: this.threadId,
			promptCache: this.params.promptCache,
			...toolChoice ? { toolChoice } : {},
			...this.callWrapFetch ? { wrapFetch: this.callWrapFetch } : {},
			...midConversation ? { midConversationChanges: midConversation.changes } : {},
			runId: this.runIdOverride,
			parentRunId: this.parentRunIdOverride,
			capabilities: this.middlewareCtx,
			approvals: adapterApprovals,
			...combinedSchema ? { outputSchema: combinedSchema } : {}
		})) {
			const raw = this.withCallMetadata(adapterChunk, this.currentCallMetadata);
			if (this.isCancelled()) break;
			this.totalChunkCount++;
			this.handleStreamChunk(raw);
			if (raw.type === EventType.CUSTOM && raw.name === "structured-output.start") {
				this.combinedStartEmitted = true;
				const startValue = raw.value;
				if (startValue && typeof startValue === "object" && "messageId" in startValue && typeof startValue.messageId === "string") {
					this.combinedStructuredMessageId = startValue.messageId;
					this.captureStructuredOutputMessageIdentity(startValue.messageId);
				}
			}
			let outboundChunk = raw;
			if (this.finalStructuredOutput?.source === "event" && raw.type === EventType.CUSTOM && raw.name === "structured-output.complete") {
				const parsed = readStructuredOutputCompleteValue(raw.value);
				if (parsed) {
					const object = this.finalStructuredOutput.normalize ? this.finalStructuredOutput.normalize(parsed.object) : parsed.object;
					this.structuredOutputResult = {
						data: object,
						rawText: parsed.raw
					};
					this.combinedCompleteEmitted = true;
					const value = raw.value;
					const completeMessageId = readCustomEventMessageId(value);
					if (completeMessageId) {
						this.combinedStructuredMessageId = completeMessageId;
						this.captureStructuredOutputMessageIdentity(completeMessageId);
					}
					if (object !== parsed.object && value && typeof value === "object") outboundChunk = {
						...raw,
						value: {
							...value,
							object
						}
					};
				}
			}
			if (this.finalStructuredOutput?.nativeCombined === true && this.finalStructuredOutput.yieldChunks && this.finalStructuredOutput.source !== "event" && !this.combinedStartEmitted && raw.type === EventType.TEXT_MESSAGE_START) {
				this.combinedStartEmitted = true;
				const messageId = typeof raw.messageId === "string" && raw.messageId !== "" ? raw.messageId : generateMessageId();
				this.combinedStructuredMessageId = messageId;
				const synthStart = {
					type: EventType.CUSTOM,
					name: "structured-output.start",
					value: { messageId },
					timestamp: Date.now()
				};
				const synthOutputs = await this.middlewareRunner.runOnChunk(this.middlewareCtx, synthStart);
				yield* this.emitPublicChunks(synthOutputs);
			}
			const outputChunks = await this.middlewareRunner.runOnChunk(this.middlewareCtx, outboundChunk);
			const suppressAgentLifecycle = !!this.finalStructuredOutput && this.finalStructuredOutput.yieldChunks && this.finalStructuredOutput.nativeCombined !== true;
			for (const outputChunk of outputChunks) for (const spec of normalizeStreamChunk(outputChunk)) {
				restorePublicUsage(spec);
				if (suppressAgentLifecycle && (spec.type === EventType.RUN_STARTED || spec.type === EventType.RUN_FINISHED)) continue;
				if (spec.type === EventType.RUN_FINISHED) {
					this.deferredModelRunFinishedChunks.push(spec);
					continue;
				}
				if (this.shouldDeferToolCallRunFinished(spec)) {
					this.deferredToolCallRunFinishedChunks.push(spec);
					continue;
				}
				if (spec.type === EventType.RUN_STARTED) {
					if (this.hasPublicRunStarted) continue;
					this.hasPublicRunStarted = true;
				}
				this.logger.output(`type=${spec.type}`, { chunk: spec });
				yield spec;
				this.middlewareCtx.chunkIndex++;
			}
			if (raw.type === EventType.RUN_FINISHED) await this.runOnUsageFromChunk(raw);
			yield* this.drainSandboxFileQueue();
			yield* this.drainMiddlewareCustomQueue();
			if (this.earlyTermination) break;
		}
		yield* this.drainSandboxFileQueue();
		yield* this.drainMiddlewareCustomQueue();
	}
	handleStreamChunk(chunk) {
		switch (chunk.type) {
			case "TEXT_MESSAGE_START":
				if (typeof chunk.messageId === "string" && chunk.messageId !== "") this.captureStreamMessageIdentity(chunk.messageId);
				break;
			case "TEXT_MESSAGE_CONTENT":
				this.handleTextMessageContentEvent(chunk);
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
			case "TOOL_CALL_RESULT":
				this.handleToolCallResultEvent(chunk);
				break;
			case "RUN_FINISHED":
				this.handleRunFinishedEvent(chunk);
				break;
			case "RUN_ERROR":
				this.handleRunErrorEvent(chunk);
				break;
			case "STEP_STARTED":
				this.handleStepStartedEvent(chunk);
				break;
			case "STEP_FINISHED":
				this.handleStepFinishedEvent(chunk);
				break;
			case "REASONING_MESSAGE_CONTENT":
				this.handleReasoningMessageContentEvent(chunk);
				break;
			case "REASONING_ENCRYPTED_VALUE":
				this.handleReasoningEncryptedValueEvent(chunk);
				break;
			case "REASONING_MESSAGE_START":
				this.handleReasoningMessageStartEvent(chunk);
				break;
			case "REASONING_START":
			case "REASONING_MESSAGE_END":
			case "REASONING_END": break;
			case "ACTIVITY_SNAPSHOT":
				this.setActivities(applyActivitySnapshotToRecords(this.activities, chunk, interleaveActivityRecords(modelMessagesToUIMessages(this.messages), this.activities).length));
				break;
			case "ACTIVITY_DELTA": this.setActivities(applyActivityDeltaToRecords(this.activities, chunk));
		}
	}
	withCallMetadata(chunk, metadata) {
		if ("subagentRunId" in chunk && typeof chunk.subagentRunId === "string") return chunk;
		if (chunk.type === EventType.ACTIVITY_SNAPSHOT || chunk.type === EventType.ACTIVITY_DELTA) return chunk;
		const incoming = tanstackMetadata(chunk);
		if (incoming?.source !== void 0) metadata.source = incoming.source;
		if (incoming?.stopReason !== void 0) metadata.stopReason = incoming.stopReason;
		if (chunk.type === EventType.RUN_STARTED || chunk.type === EventType.RUN_FINISHED) metadata.runId = chunk.runId;
		if (chunk.type === EventType.RUN_FINISHED) {
			const model = chunk.model ?? incoming?.model;
			const responseId = chunk.responseId ?? incoming?.responseId;
			const finishReason = chunk.finishReason ?? incoming?.finishReason;
			if (model !== void 0) metadata.model = model;
			if (responseId !== void 0) metadata.responseId = responseId;
			if (finishReason) metadata.finishReason = finishReason;
			if (incoming?.responseItems !== void 0) metadata.responseItems = incoming.responseItems;
			if (incoming?.reasoningEffort !== void 0) metadata.reasoningEffort = incoming.reasoningEffort;
		}
		if (chunk.type === EventType.RUN_ERROR) metadata.stopReason ??= "error";
		const merged = withTanstackMetadata(chunk, {
			...metadata,
			...incoming ?? {},
			...metadata.source !== void 0 ? { source: metadata.source } : {},
			...metadata.stopReason !== void 0 ? { stopReason: metadata.stopReason } : {}
		});
		return {
			...chunk,
			metadata: merged.metadata
		};
	}
	setActivities(activities) {
		this.activities = activities;
		this.middlewareCtx.activities = this.activities;
	}
	handleTextMessageContentEvent(chunk) {
		const extra = chunk;
		const before = this.accumulatedContent;
		if (typeof extra.content === "string" && extra.content !== "") this.accumulatedContent = extra.content;
		else this.accumulatedContent += chunk.delta;
		this.middlewareCtx.accumulatedContent = this.accumulatedContent;
		if (!this.turnParts) return;
		if (!this.accumulatedContent.startsWith(before)) {
			this.turnParts = null;
			return;
		}
		const delta = this.accumulatedContent.slice(before.length);
		if (delta === "") return;
		const last = this.turnParts[this.turnParts.length - 1];
		if (last && last.type === "text") last.content += delta;
		else this.turnParts.push({
			type: "text",
			content: delta
		});
	}
	captureStreamMessageIdentity(messageId) {
		this.currentMessageId = messageId;
		this.middlewareCtx.currentMessageId = messageId;
		if (!this.streamIdentityCaptured) {
			this.currentMessageCreatedAt = /* @__PURE__ */ new Date();
			this.streamIdentityCaptured = true;
		}
	}
	captureStructuredOutputMessageIdentity(messageId) {
		this.structuredOutputMessageId = messageId;
		this.structuredOutputMessageCreatedAt ??= /* @__PURE__ */ new Date();
	}
	handleToolCallStartEvent(chunk) {
		if (typeof chunk.parentMessageId === "string" && chunk.parentMessageId !== "") this.captureStreamMessageIdentity(chunk.parentMessageId);
		this.toolCallManager.addToolCallStartEvent(chunk);
		if (this.turnParts && !this.turnParts.some((part) => part.type === "call" && part.id === chunk.toolCallId)) this.turnParts.push({
			type: "call",
			id: chunk.toolCallId,
			providerExecuted: isProviderExecutedToolCall({ metadata: chunk.metadata })
		});
		const metadata = chunk.metadata;
		const thoughtSignature = metadata != null && typeof metadata === "object" && "thoughtSignature" in metadata && typeof metadata.thoughtSignature === "string" && metadata.thoughtSignature !== "" ? metadata.thoughtSignature : void 0;
		if (thoughtSignature === void 0) return;
		const call = this.toolCallManager.getToolCalls().find((candidate) => candidate.id === chunk.toolCallId);
		if (!call) return;
		call.metadata = {
			...call.metadata != null && typeof call.metadata === "object" ? call.metadata : {},
			thoughtSignature
		};
	}
	handleToolCallArgsEvent(chunk) {
		this.toolCallManager.addToolCallArgsEvent(chunk);
	}
	handleToolCallEndEvent(chunk) {
		this.toolCallManager.completeToolCall(chunk);
		const end = chunk;
		const call = this.toolCallManager.getToolCalls().find((candidate) => candidate.id === chunk.toolCallId);
		if (call) {
			end.args = call.function.arguments;
			end.metadata = withTanstackMetadata(end, { args: call.function.arguments }).metadata;
			try {
				const projection = JSON.parse(call.function.arguments);
				if (isToolInputJsonLossless(projection)) end.input = projection;
				else delete end.input;
			} catch {
				delete end.input;
			}
			const metadata = tanstackMetadata(end);
			if (metadata) delete metadata.input;
		}
		if ((end.state ?? tanstackMetadata(end)?.state) !== "output-error" || end.result === void 0) return;
		this.handleToolCallResultEvent({
			type: EventType.TOOL_CALL_RESULT,
			toolCallId: chunk.toolCallId,
			content: Array.isArray(end.result) ? JSON.stringify(end.result) : end.result,
			messageId: chunk.toolCallId,
			metadata: { tanstack: { state: "output-error" } }
		});
	}
	handleToolCallResultEvent(chunk) {
		if (!(tanstackMetadata(chunk)?.state === "output-error")) return;
		const toolCall = this.toolCallManager.getToolCalls().find((candidate) => candidate.id === chunk.toolCallId);
		if (!toolCall) return;
		this.streamedToolErrorResults.set(chunk.toolCallId, {
			toolCallId: chunk.toolCallId,
			toolName: toolCall.function.name,
			result: chunk.content,
			state: "output-error"
		});
	}
	handleRunFinishedEvent(chunk) {
		this.finishedEvent = chunk;
		const top = chunk.finishReason;
		this.lastFinishReason = top === "stop" || top === "length" || top === "content_filter" || top === "tool_calls" || top === null ? top : tanstackMetadata(chunk)?.finishReason ?? null;
	}
	async runOnUsageFromChunk(chunk) {
		const rebuilt = rebuildTokenUsage(chunk.usage, tanstackMetadata(chunk)?.usage);
		if (rebuilt) await this.middlewareRunner.runOnUsage(this.middlewareCtx, rebuilt);
	}
	handleRunErrorEvent(chunk) {
		this.earlyTermination = true;
		if (this.finalizationError === null) {
			const message = chunk.message || "Run failed";
			this.finalizationError = {
				message,
				...chunk.code !== void 0 ? { code: chunk.code } : {}
			};
		}
	}
	finalizeCurrentThinkingStep() {
		this.accumulatedThinking = [];
		for (const block of this.thinkingBlocks.values()) {
			block.part.index = -1;
			if (!block.content && !block.signature) continue;
			block.part.index = this.accumulatedThinking.length;
			this.accumulatedThinking.push({
				content: block.redacted ? "" : block.content,
				...block.signature && { signature: block.signature },
				...block.redacted && { redacted: true }
			});
		}
		if (this.turnParts) this.turnParts = this.turnParts.filter((part) => part.type !== "thinking" || part.index >= 0);
	}
	thinkingBlock(id) {
		const key = (id && this.reasoningStepAliases.get(id)) ?? (id && this.thinkingBlocks.has(id) ? id : void 0) ?? this.currentThinkingStepId ?? id ?? this.createId("thinking");
		let block = this.thinkingBlocks.get(key);
		if (!block) {
			const part = {
				type: "thinking",
				index: -1
			};
			block = {
				content: "",
				signature: "",
				redacted: isRedactedThinkingId(key),
				part
			};
			this.thinkingBlocks.set(key, block);
			this.turnParts?.push(part);
		}
		this.currentThinkingStepId = key;
		if (id && (id === key || this.pendingReasoningMessageId === id)) this.reasoningStepAliases.set(id, key);
		return block;
	}
	handleReasoningMessageStartEvent(chunk) {
		if (typeof chunk.messageId !== "string") return;
		const known = this.reasoningStepAliases.get(chunk.messageId);
		if (known) {
			this.currentThinkingStepId = known;
			if (this.pendingThinkingStepId === known) this.pendingThinkingStepId = void 0;
			return;
		}
		if (this.pendingThinkingStepId) {
			this.reasoningStepAliases.set(chunk.messageId, this.pendingThinkingStepId);
			this.currentThinkingStepId = this.pendingThinkingStepId;
			this.pendingThinkingStepId = void 0;
		} else {
			this.pendingReasoningMessageId = chunk.messageId;
			this.currentThinkingStepId = void 0;
		}
	}
	handleStepStartedEvent(chunk) {
		const id = chunk.stepName || chunk.stepId || this.createId("thinking");
		this.currentThinkingStepId = id;
		this.reasoningStepAliases.set(id, id);
		if (chunk.stepId) this.reasoningStepAliases.set(chunk.stepId, id);
		if (this.pendingReasoningMessageId) {
			this.reasoningStepAliases.set(this.pendingReasoningMessageId, id);
			this.pendingReasoningMessageId = void 0;
		} else this.pendingThinkingStepId = id;
		this.thinkingBlock(id);
	}
	handleStepFinishedEvent(chunk) {
		if (typeof chunk.signature !== "string" || chunk.signature === "") return;
		const block = this.thinkingBlock(chunk.stepId ?? chunk.stepName);
		if (!block.redacted) block.signature = chunk.signature;
	}
	handleReasoningMessageContentEvent(chunk) {
		const block = this.thinkingBlock(chunk.messageId);
		if (!block.redacted) block.content += chunk.delta;
	}
	handleReasoningEncryptedValueEvent(chunk) {
		if (chunk.subtype === "tool-call") {
			const call = this.messages.flatMap((message) => message.toolCalls ?? []).find((toolCall) => toolCall.id === chunk.entityId);
			if (call) call.metadata = {
				...call.metadata != null && typeof call.metadata === "object" ? call.metadata : {},
				thoughtSignature: chunk.encryptedValue
			};
			return;
		}
		const redacted = isRedactedThinkingId(chunk.stepId) || isRedactedThinkingId(chunk.entityId);
		const block = this.thinkingBlock(chunk.entityId);
		if (block.redacted && !redacted) return;
		if (redacted) {
			block.redacted = true;
			block.content = "";
			block.signature = "";
		}
		block.signature = chunk.encryptedValue;
	}
	/**
	* Tools available for execution this turn. The discovery tool is dropped
	* from the advertised set (`this.tools`) once every lazy tool is discovered,
	* but a model may still re-request discovery; this widens execution lookup
	* to include it so such calls don't fail with "Unknown tool". Centralised so
	* both execution sites (`processToolCalls` and `checkForPendingToolCalls`)
	* stay in sync.
	*/
	resolveExecutableTools(toolCalls) {
		return this.lazyToolManager.getExecutableTools(this.tools, toolCalls.map((tc) => tc.function.name));
	}
	async *checkForPendingToolCalls() {
		const pendingToolCalls = this.getPendingToolCallsFromMessages();
		if (pendingToolCalls.length === 0) return "continue";
		const finishEvent = this.createSyntheticFinishedEvent();
		this.recordToolCalls(pendingToolCalls);
		const undiscoveredLazyResults = [];
		const executablePendingCalls = pendingToolCalls.filter((tc) => {
			if (this.lazyToolManager.isUndiscoveredLazyTool(tc.function.name)) {
				undiscoveredLazyResults.push({
					toolCallId: tc.id,
					toolName: tc.function.name,
					result: { error: this.lazyToolManager.getUndiscoveredToolError(tc.function.name) },
					state: "output-error"
				});
				return false;
			}
			return true;
		});
		const deferredErrorResults = [...undiscoveredLazyResults];
		const argsMap = /* @__PURE__ */ new Map();
		for (const tc of pendingToolCalls) argsMap.set(tc.id, tc.function.arguments);
		if (executablePendingCalls.length === 0) {
			if (deferredErrorResults.length > 0) for (const chunk of this.buildToolResultChunks(deferredErrorResults, finishEvent, argsMap)) yield* this.pipeThroughMiddleware(chunk);
			return "continue";
		}
		this.middlewareCtx.phase = "beforeTools";
		if (yield* this.emitBoundaryInterrupts("beforeTools", finishEvent, executablePendingCalls)) {
			this.setToolPhase("wait");
			return "wait";
		}
		const { approvals, clientToolResults } = this.collectClientState();
		const generator = executeToolCalls(executablePendingCalls, this.resolveExecutableTools(executablePendingCalls), approvals, clientToolResults, (eventName, data, options) => this.createCustomEventChunk(eventName, data, options), {
			onBeforeToolCall: async (toolCall, tool, args) => {
				this.logger.tools(`phase=before name=${toolCall.function.name}`, {
					name: toolCall.function.name,
					args
				});
				const hookCtx = {
					toolCall,
					tool,
					args,
					toolName: toolCall.function.name,
					toolCallId: toolCall.id
				};
				return this.middlewareRunner.runOnBeforeToolCall(this.middlewareCtx, hookCtx);
			},
			onAfterToolCall: async (info) => {
				this.logger.tools(`phase=after name=${info.toolName}`, {
					name: info.toolName,
					result: info.result
				});
				return this.middlewareRunner.runOnAfterToolCall(this.middlewareCtx, info);
			}
		}, this.middlewareCtx.context, this.toolAbortSignal, {
			clientToolErrors: this.resumeClientToolErrors,
			deniedToolResults: this.resumeDeniedToolResults,
			cancelledToolCallIds: this.resumeCancelledToolCallIds,
			inputResponses: this.resumeInputResponses
		}, this.params.toolExecution);
		const rawEdits = this.captureApprovedArgumentEdits(pendingToolCalls);
		const executionResult = yield* this.drainToolCallGenerator(generator);
		this.retainApprovedArgumentEdits([...executionResult.results.filter((entry) => entry.state !== "output-error").map((entry) => entry.toolCallId), ...executionResult.needsClientExecution.map((entry) => entry.toolCallId)], rawEdits);
		if (this.isMiddlewareAborted()) {
			this.setToolPhase("stop");
			return "stop";
		}
		const allResults = [...executionResult.results, ...deferredErrorResults];
		yield* this.runWhileYielding(this.middlewareRunner.runOnToolPhaseComplete(this.middlewareCtx, {
			toolCalls: pendingToolCalls,
			results: allResults,
			needsApproval: executionResult.needsApproval,
			needsClientExecution: executionResult.needsClientExecution
		}));
		if (executionResult.needsApproval.length > 0 || executionResult.needsClientExecution.length > 0 || executionResult.inputRequired.length > 0 || executionResult.subagentInterrupts.length > 0) {
			this.discardDeferredToolCallRunFinishedChunks();
			if (allResults.length > 0) for (const chunk of this.buildToolResultChunks(allResults, finishEvent)) yield* this.pipeThroughMiddleware(chunk);
			const emitted = yield* this.emitActionableInterruptBoundary(finishEvent, executionResult.needsApproval, executionResult.needsClientExecution, [], executionResult.inputRequired, executionResult.subagentInterrupts);
			this.setToolPhase(emitted ? "wait" : "stop");
			return emitted ? "wait" : "stop";
		}
		const toolResultChunks = this.buildToolResultChunks(allResults, finishEvent);
		for (const chunk of toolResultChunks) yield* this.pipeThroughMiddleware(chunk);
		return "continue";
	}
	async *processToolCalls() {
		if (!this.shouldExecuteToolPhase()) {
			this.lastTurnToolCallCount = 0;
			this.setToolPhase("stop");
			return;
		}
		const toolCalls = this.toolCallManager.getToolCalls();
		const finishEvent = this.finishedEvent;
		if (!finishEvent || toolCalls.length === 0) {
			this.lastTurnToolCallCount = 0;
			this.setToolPhase("stop");
			return;
		}
		this.recordToolCalls(toolCalls);
		this.addAssistantToolCallMessage(toolCalls);
		if (this.lastFinishReason === "length") {
			this.deferredToolCallRunFinishedChunks = this.deferredToolCallRunFinishedChunks.map((chunk) => chunk.type === EventType.RUN_FINISHED ? {
				...chunk,
				finishReason: "tool_calls"
			} : chunk);
			yield* this.flushDeferredToolCallRunFinishedChunks();
			const results = toolCalls.flatMap((call) => {
				const result = this.messages.find((message) => message.role === "tool" && message.toolCallId === call.id);
				return result ? [{
					toolCallId: call.id,
					toolName: call.function.name,
					result: result.content,
					state: "output-error"
				}] : [];
			});
			for (const chunk of this.buildToolResultChunks(results, finishEvent, void 0, true)) yield* this.pipeThroughMiddleware(chunk);
			this.toolCallManager.clear();
			this.setToolPhase("continue");
			return;
		}
		const undiscoveredLazyResults = [];
		const executableToolCalls = toolCalls.filter((tc) => {
			if (this.streamedToolErrorResults.has(tc.id)) return false;
			if (this.lazyToolManager.isUndiscoveredLazyTool(tc.function.name)) {
				undiscoveredLazyResults.push({
					toolCallId: tc.id,
					toolName: tc.function.name,
					result: { error: this.lazyToolManager.getUndiscoveredToolError(tc.function.name) },
					state: "output-error"
				});
				return false;
			}
			return true;
		});
		const deferredErrorResults = [...this.streamedToolErrorResults.values(), ...undiscoveredLazyResults];
		if (executableToolCalls.length === 0) {
			yield* this.flushDeferredToolCallRunFinishedChunks();
			if (deferredErrorResults.length > 0) for (const chunk of this.buildToolResultChunks(deferredErrorResults, finishEvent)) yield* this.pipeThroughMiddleware(chunk);
			this.toolCallManager.clear();
			this.setToolPhase("continue");
			return;
		}
		this.middlewareCtx.phase = "beforeTools";
		if (yield* this.emitBoundaryInterrupts("beforeTools", finishEvent, executableToolCalls)) {
			this.setToolPhase("wait");
			return;
		}
		const { approvals, clientToolResults } = this.collectClientState();
		const generator = executeToolCalls(executableToolCalls, this.resolveExecutableTools(executableToolCalls), approvals, clientToolResults, (eventName, data, options) => this.createCustomEventChunk(eventName, data, options), {
			onBeforeToolCall: async (toolCall, tool, args) => {
				this.logger.tools(`phase=before name=${toolCall.function.name}`, {
					name: toolCall.function.name,
					args
				});
				const hookCtx = {
					toolCall,
					tool,
					args,
					toolName: toolCall.function.name,
					toolCallId: toolCall.id
				};
				return this.middlewareRunner.runOnBeforeToolCall(this.middlewareCtx, hookCtx);
			},
			onAfterToolCall: async (info) => {
				this.logger.tools(`phase=after name=${info.toolName}`, {
					name: info.toolName,
					result: info.result
				});
				return this.middlewareRunner.runOnAfterToolCall(this.middlewareCtx, info);
			}
		}, this.middlewareCtx.context, this.toolAbortSignal, {
			clientToolErrors: this.resumeClientToolErrors,
			deniedToolResults: this.resumeDeniedToolResults,
			cancelledToolCallIds: this.resumeCancelledToolCallIds,
			inputResponses: this.resumeInputResponses
		}, this.params.toolExecution);
		const rawEdits = this.captureApprovedArgumentEdits(toolCalls);
		const executionResult = yield* this.drainToolCallGenerator(generator);
		this.retainApprovedArgumentEdits([...executionResult.results.filter((entry) => entry.state !== "output-error").map((entry) => entry.toolCallId), ...executionResult.needsClientExecution.map((entry) => entry.toolCallId)], rawEdits);
		this.middlewareCtx.phase = "afterTools";
		if (this.isMiddlewareAborted()) {
			this.setToolPhase("stop");
			return;
		}
		const allResults = [...executionResult.results, ...deferredErrorResults];
		yield* this.runWhileYielding(this.middlewareRunner.runOnToolPhaseComplete(this.middlewareCtx, {
			toolCalls,
			results: allResults,
			needsApproval: executionResult.needsApproval,
			needsClientExecution: executionResult.needsClientExecution
		}));
		const afterToolBoundaryChunks = this.buildToolResultChunks(allResults, finishEvent);
		const afterToolRequests = yield* this.runWhileYielding(this.middlewareRunner.runOnInterruptBoundary(this.middlewareCtx));
		if (afterToolRequests.length > 0) {
			for (const chunk of afterToolBoundaryChunks) yield* this.pipeThroughMiddleware(chunk);
			yield* this.emitBoundaryInterrupts("afterTools", finishEvent, toolCalls, afterToolRequests, executionResult.inputRequired);
			this.setToolPhase("wait");
			return;
		}
		if (executionResult.needsApproval.length > 0 || executionResult.needsClientExecution.length > 0 || executionResult.inputRequired.length > 0 || executionResult.subagentInterrupts.length > 0) {
			if (allResults.length > 0) for (const chunk of afterToolBoundaryChunks) yield* this.pipeThroughMiddleware(chunk);
			const emitted = yield* this.emitActionableInterruptBoundary(finishEvent, executionResult.needsApproval, executionResult.needsClientExecution, [], executionResult.inputRequired, executionResult.subagentInterrupts);
			this.setToolPhase(emitted ? "wait" : "stop");
			return;
		}
		yield* this.flushDeferredToolCallRunFinishedChunks();
		const toolResultChunks = afterToolBoundaryChunks;
		for (const chunk of toolResultChunks) yield* this.pipeThroughMiddleware(chunk);
		if (this.lazyToolManager.hasNewlyDiscoveredTools()) {
			this.tools = this.lazyToolManager.getActiveTools();
			this.toolCallManager = new ToolCallManager(this.tools);
			this.setToolPhase("continue");
			return;
		}
		this.toolCallManager.clear();
		this.setToolPhase("continue");
	}
	shouldDeferToolCallRunFinished(chunk) {
		return chunk.type === EventType.RUN_FINISHED && this.lastFinishReason === "tool_calls" && this.tools.length > 0 && this.toolCallManager.hasToolCalls();
	}
	*flushDeferredToolCallRunFinishedChunks() {
		for (const chunk of this.deferredToolCallRunFinishedChunks) {
			this.logger.output(`type=${chunk.type}`, { chunk });
			yield chunk;
			this.middlewareCtx.chunkIndex++;
		}
		this.deferredToolCallRunFinishedChunks = [];
	}
	*flushDeferredModelRunFinishedChunks() {
		for (const chunk of this.deferredModelRunFinishedChunks) {
			this.logger.output(`type=${chunk.type}`, { chunk });
			yield chunk;
			this.middlewareCtx.chunkIndex++;
		}
		this.deferredModelRunFinishedChunks = [];
	}
	async *emitSyntheticRunStarted(finishEvent) {
		if (this.hasPublicRunStarted) return;
		yield* this.pipeThroughMiddleware({
			type: EventType.RUN_STARTED,
			runId: finishEvent.runId,
			threadId: finishEvent.threadId,
			timestamp: Date.now()
		});
	}
	async *emitSuccessfulEarlyTermination() {
		this.lastFinishReason = "stop";
		const finishEvent = this.createSyntheticFinishedEvent("stop");
		yield* this.emitSyntheticRunStarted(finishEvent);
		yield* this.pipeThroughMiddleware({
			...finishEvent,
			timestamp: Date.now(),
			outcome: { type: "success" }
		});
	}
	discardDeferredToolCallRunFinishedChunks() {
		this.deferredToolCallRunFinishedChunks = [];
	}
	shouldExecuteToolPhase() {
		return (this.lastFinishReason === "tool_calls" || this.lastFinishReason === "length" && this.params.truncatedToolResult !== void 0) && this.tools.length > 0 && this.toolCallManager.hasToolCalls();
	}
	/**
	* Split this iteration into assistant ModelMessages that keep the provider's
	* block order: a new segment starts at every thinking step that follows a
	* provider-executed tool call (the rule buildAssistantMessages applies to
	* UIMessages). Segments after the first get `${id}-segment-${n}` ids. A
	* segment whose own blocks leave the default order gets a `blockOrder` map.
	* Returns null when no split is needed or the order could not be tracked,
	* so callers fall back to the single-message shape.
	*/
	buildOrderedAssistantSegments(toolCalls, id, createdAt) {
		const parts = this.turnParts;
		if (!parts) return null;
		const providerCallIds = new Set(parts.flatMap((part) => part.type === "call" && part.providerExecuted ? [part.id] : []));
		let current = {
			thinking: [],
			text: "",
			callIds: [],
			parts: []
		};
		const segments = [current];
		let split = false;
		for (const part of parts) {
			if (part.type === "thinking") {
				const thinking = this.accumulatedThinking[part.index];
				if (!thinking) return null;
				if (current.callIds.some((callId) => providerCallIds.has(callId))) {
					current = {
						thinking: [thinking],
						text: "",
						callIds: [],
						parts: []
					};
					segments.push(current);
					split = true;
				} else current.thinking.push(thinking);
			} else if (part.type === "text") current.text += part.content;
			else current.callIds.push(part.id);
			current.parts.push(part);
		}
		if (!split) return null;
		if (segments.map((segment) => segment.text).join("") !== this.accumulatedContent) return null;
		if (segments.reduce((n, segment) => n + segment.thinking.length, 0) !== this.accumulatedThinking.length) return null;
		const placed = new Set(segments.flatMap((segment) => segment.callIds));
		for (const toolCall of toolCalls) if (!placed.has(toolCall.id)) current.callIds.push(toolCall.id);
		return segments.map((segment, index) => {
			const segmentCalls = toolCalls.filter((toolCall) => segment.callIds.includes(toolCall.id));
			const blockOrder = turnBlockOrder(segment.parts, segmentCalls);
			return {
				role: "assistant",
				content: segment.text || null,
				metadata: { tanstack: { ...this.currentCallMetadata } },
				...segmentCalls.length > 0 && { toolCalls: segmentCalls },
				id: id === void 0 ? void 0 : index === 0 ? id : `${id}-segment-${index}`,
				createdAt,
				...segment.thinking.length > 0 && { thinking: segment.thinking },
				...blockOrder && { blockOrder }
			};
		});
	}
	/**
	* `{ blockOrder }` for this iteration kept as one assistant message that
	* carries `toolCalls`, or `{}` when the order is the default one or was not
	* tracked. This is the fallback when `buildOrderedAssistantSegments` does
	* not split, so it is the common client-tool case.
	*/
	singleMessageBlockOrder(toolCalls) {
		const parts = this.turnParts;
		if (!parts) return {};
		const thinking = parts.filter((part) => part.type === "thinking");
		if (parts.map((part) => part.type === "text" ? part.content : "").join("") !== this.accumulatedContent || thinking.length !== this.accumulatedThinking.length || thinking.some((part, index) => part.index !== index)) return {};
		const blockOrder = turnBlockOrder(parts, toolCalls);
		return blockOrder ? { blockOrder } : {};
	}
	addAssistantToolCallMessage(toolCalls) {
		this.finalizeCurrentThinkingStep();
		const from = this.messages.length;
		const segments = this.buildOrderedAssistantSegments(toolCalls, this.currentMessageId ?? void 0, this.currentMessageCreatedAt ?? void 0);
		this.messages = [...this.messages, ...segments ?? [{
			role: "assistant",
			content: this.accumulatedContent || null,
			metadata: { tanstack: { ...this.currentCallMetadata } },
			toolCalls,
			id: this.currentMessageId ?? void 0,
			createdAt: this.currentMessageCreatedAt ?? void 0,
			...this.accumulatedThinking.length > 0 && { thinking: this.accumulatedThinking },
			...this.singleMessageBlockOrder(toolCalls)
		}]];
		this.closeTruncatedToolCalls(from);
		this.saveMidConversationChange(from);
		this.middlewareCtx.messages = this.messages;
	}
	/**
	* Give each call of the assistant messages from index `from` an error result
	* when the output limit cut their answer. Such a call is not complete, so it
	* never runs and asks for nothing. A provider-executed call has its result.
	*/
	closeTruncatedToolCalls(from) {
		const cut = this.messages.slice(from).flatMap((message) => tanstackMetadata(message)?.finishReason === "length" ? (message.toolCalls ?? []).filter((call) => !isProviderExecutedToolCall(call)) : []);
		const option = this.params.truncatedToolResult;
		this.messages = [...this.messages, ...cut.map((call) => {
			const text = typeof option === "function" ? option({
				toolCallId: call.id,
				toolName: call.function.name
			}) : option ?? TRUNCATED_TOOL_RESULT;
			return {
				role: "tool",
				toolCallId: call.id,
				content: text,
				error: text
			};
		})];
	}
	addTerminalAssistantMessages() {
		this.finalizeCurrentThinkingStep();
		const structuredResult = this.structuredOutputResult;
		const raw = structuredResult ? structuredResult.rawText || safeJsonStringify(structuredResult.data) : "";
		const structuredOutput = structuredResult ? {
			type: "structured-output",
			status: "complete",
			data: structuredResult.data,
			partial: structuredResult.data,
			raw,
			...structuredResult.reasoning !== void 0 ? { reasoning: structuredResult.reasoning } : {}
		} : void 0;
		const nativeCombined = this.finalStructuredOutput?.nativeCombined === true;
		const eventSourced = this.finalStructuredOutput?.source === "event";
		const structuredId = this.structuredOutputMessageId ?? this.combinedStructuredMessageId ?? this.currentMessageId ?? this.createId("msg");
		const splitStructuredMessage = Boolean(structuredOutput) && (!nativeCombined || eventSourced) && this.currentMessageId != null && structuredId !== this.currentMessageId;
		const messages = [...this.middlewareCtx.messages];
		const existingStructuredIndex = messages.findIndex((message) => message.role === "assistant" && message.id === structuredId);
		const currentTurnAlreadyRecorded = messages.some((message) => message.role === "assistant" && message.id === this.currentMessageId);
		const thinking = this.accumulatedThinking.length > 0 ? this.accumulatedThinking : void 0;
		const startedLength = messages.length;
		if (structuredOutput && existingStructuredIndex >= 0) {
			const existing = messages[existingStructuredIndex];
			if (existing) messages[existingStructuredIndex] = {
				...withTanstackMetadata(existing, this.finalStructuredOutput?.nativeCombined ? this.currentCallMetadata : this.structuredCallMetadata),
				content: raw || existing.content,
				structuredOutput
			};
		} else if (structuredOutput && !splitStructuredMessage) {
			if (!currentTurnAlreadyRecorded) messages.push({
				role: "assistant",
				content: this.accumulatedContent || raw || null,
				metadata: { tanstack: { ...nativeCombined ? this.currentCallMetadata : this.structuredCallMetadata } },
				id: structuredId,
				createdAt: this.currentMessageCreatedAt ?? this.structuredOutputMessageCreatedAt ?? /* @__PURE__ */ new Date(),
				structuredOutput,
				...thinking ? { thinking } : {}
			});
		} else {
			if (!currentTurnAlreadyRecorded && (this.accumulatedContent !== "" || thinking)) {
				const id = this.currentMessageId ?? this.createId("msg");
				const createdAt = this.currentMessageCreatedAt ?? /* @__PURE__ */ new Date();
				messages.push(...this.buildOrderedAssistantSegments(this.toolCallManager.getToolCalls(), id, createdAt) ?? [{
					role: "assistant",
					content: this.accumulatedContent || null,
					metadata: { tanstack: { ...this.currentCallMetadata } },
					id,
					createdAt,
					...thinking ? { thinking } : {},
					...this.singleMessageBlockOrder([])
				}]);
			}
			if (structuredOutput) messages.push({
				role: "assistant",
				content: raw || null,
				metadata: { tanstack: { ...this.structuredCallMetadata } },
				id: structuredId,
				createdAt: this.structuredOutputMessageCreatedAt ?? /* @__PURE__ */ new Date(),
				structuredOutput
			});
		}
		if (messages.length === startedLength && existingStructuredIndex < 0) return;
		this.messages = messages;
		this.closeTruncatedToolCalls(startedLength);
		this.saveMidConversationChange(startedLength);
		this.middlewareCtx.messages = this.messages;
	}
	/**
	* Extract client state (approvals and client tool results) from original messages.
	* This is called in the constructor BEFORE converting to ModelMessage format,
	* because the parts array (which contains approval state) is lost during conversion.
	*/
	extractClientStateFromOriginalMessages(originalMessages) {
		const approvals = /* @__PURE__ */ new Map();
		const clientToolResults = /* @__PURE__ */ new Map();
		for (const message of originalMessages) if (message.role === "assistant" && message.parts) {
			for (const part of message.parts) if (part.type === "tool-call") {
				if (part.output !== void 0 && !part.approval) clientToolResults.set(part.id, part.output);
				if (part.approval?.id && part.approval?.approved !== void 0 && part.state === "approval-responded") approvals.set(part.approval.id, part.approval.approved);
			}
		}
		return {
			approvals,
			clientToolResults
		};
	}
	collectClientState() {
		const approvals = new Map(this.initialApprovals);
		const clientToolResults = new Map(this.initialClientToolResults);
		for (const [approvalId, approved] of this.resumeApprovals) approvals.set(approvalId, approved);
		for (const [toolCallId, result] of this.resumeClientToolResults) clientToolResults.set(toolCallId, result);
		for (const message of this.messages) if (message.role === "tool" && message.toolCallId) {
			let output;
			if (Array.isArray(message.content)) output = message.content;
			else try {
				output = JSON.parse(message.content);
			} catch {
				output = message.content;
			}
			if (output && typeof output === "object" && output.pendingExecution === true) continue;
			clientToolResults.set(message.toolCallId, output);
		}
		return {
			approvals,
			clientToolResults
		};
	}
	genericInterruptId() {
		return this.createId("interrupt");
	}
	buildActionableInterrupts(approvals, clientRequests, genericRequests = [], genericInterruptIds = [], inputRequired = [], childInterrupts = []) {
		const interrupts = [];
		for (const approval of approvals) {
			const tool = this.tools.find((candidate) => candidate.name === approval.toolName);
			const normalized = normalizeApprovalSchema(tool?.approvalSchema, tool?.inputSchema);
			interrupts.push({
				id: approval.approvalId,
				reason: "tool_call",
				message: `Approval required to run ${approval.toolName}`,
				toolCallId: approval.toolCallId,
				responseSchema: normalized.responseSchema,
				metadata: {
					kind: "approval",
					toolName: approval.toolName,
					input: approval.input,
					[interruptBindingMetadataKey]: {
						v: 1,
						kind: "tool-approval",
						interruptId: approval.approvalId,
						toolName: approval.toolName,
						toolCallId: approval.toolCallId,
						originalArgs: approval.input,
						inputSchemaHash: hashSchemaInput(tool?.inputSchema),
						approvalSchemaHash: normalized.approvalSchemaHash,
						responseSchemaHash: normalized.responseSchemaHash
					}
				}
			});
		}
		for (const clientTool of clientRequests) {
			const tool = this.tools.find((candidate) => candidate.name === clientTool.toolName);
			const responseSchema = convertSchemaToJsonSchema(tool?.outputSchema) ?? {};
			interrupts.push({
				id: `client_tool_${clientTool.toolCallId}`,
				reason: "tanstack:client_tool_execution",
				message: `Client tool ${clientTool.toolName} is ready to run`,
				toolCallId: clientTool.toolCallId,
				responseSchema,
				metadata: {
					kind: "client_tool",
					toolName: clientTool.toolName,
					input: clientTool.input,
					[interruptBindingMetadataKey]: {
						v: 1,
						kind: "client-tool-execution",
						interruptId: `client_tool_${clientTool.toolCallId}`,
						toolName: clientTool.toolName,
						toolCallId: clientTool.toolCallId,
						outputSchemaHash: hashSchemaInput(tool?.outputSchema),
						responseSchemaHash: digestInterruptJson(canonicalInterruptJson(responseSchema))
					}
				}
			});
		}
		for (const [index, request] of genericRequests.entries()) {
			const batchIndex = interrupts.length;
			const id = genericInterruptIds[index];
			if (!id) throw new Error("Generic interrupt id is unavailable.");
			const preEmission = createInterruptBinding(request, { batchIndex });
			interrupts.push({
				id,
				reason: request.reason,
				message: request.message,
				...preEmission.descriptor.responseSchemaCanonicalJson !== void 0 ? { responseSchema: JSON.parse(preEmission.descriptor.responseSchemaCanonicalJson) } : {},
				...request.expiresAt !== void 0 ? { expiresAt: request.expiresAt } : {},
				metadata: {
					[interruptBindingMetadataKey]: {
						v: 1,
						kind: "generic",
						interruptId: id,
						definitionId: preEmission.descriptor.definitionId,
						key: preEmission.descriptor.key,
						batchIndex,
						...request.expiresAt !== void 0 ? { expiresAt: request.expiresAt } : {},
						...preEmission.descriptor.payloadSchemaHash ? { payloadSchemaHash: preEmission.descriptor.payloadSchemaHash } : {},
						...preEmission.descriptor.responseSchemaHash !== void 0 ? { responseSchemaHash: preEmission.descriptor.responseSchemaHash } : {}
					},
					...preEmission.payload !== void 0 ? { [INTERRUPT_PAYLOAD_METADATA_KEY]: preEmission.payload } : {}
				}
			});
		}
		for (const pendingInput of inputRequired) {
			const id = `mcp_input_${pendingInput.toolCallId}`;
			interrupts.push({
				id,
				reason: pendingInput.reason ?? "mcp_input",
				message: `Input required to run ${pendingInput.toolName}`,
				toolCallId: pendingInput.toolCallId,
				metadata: {
					toolName: pendingInput.toolName,
					[interruptBindingMetadataKey]: {
						v: 1,
						kind: "generic",
						interruptId: id
					},
					[INTERRUPT_PAYLOAD_METADATA_KEY]: {
						kind: pendingInput.kind,
						request: pendingInput.request
					}
				}
			});
		}
		interrupts.push(...childInterrupts);
		const ids = /* @__PURE__ */ new Set();
		for (const interrupt of interrupts) {
			if (ids.has(interrupt.id)) throw new Error(`Duplicate interrupt id in final batch: ${interrupt.id}`);
			ids.add(interrupt.id);
		}
		return interrupts;
	}
	buildInterruptFinishedChunk(finishEvent, approvals, clientRequests, genericRequests = [], genericInterruptIds, inputRequired = [], childInterrupts) {
		return {
			...finishEvent,
			timestamp: Date.now(),
			outcome: {
				type: "interrupt",
				interrupts: this.buildActionableInterrupts(approvals, clientRequests, genericRequests, genericInterruptIds, inputRequired, childInterrupts)
			}
		};
	}
	/**
	* Record a `ui-resource` CUSTOM chunk on the assistant ModelMessage owning
	* its `toolCallId` so the resource survives later MESSAGES_SNAPSHOT chunks
	* (e.g. the interrupt snapshot emitted when the run pauses on a client
	* tool). Mirrors the anchor-preserving approach used for
	* `toolCallMetadata` (#867). See #1397.
	*/
	recordEmittedUiResource(value) {
		const part = uiResourcePartFromCustomValue(value);
		if (!part) return;
		const next = appendUiResourceToModelMessages(this.messages, part);
		if (next === this.messages) return;
		this.messages = next;
		this.middlewareCtx.messages = this.messages;
	}
	buildMessagesSnapshotChunk() {
		const withIds = this.messages.map((message, index) => ({
			...message,
			id: message.id || `snapshot_${this.runIdOverride ?? this.requestId}_${index}`
		}));
		return {
			type: EventType.MESSAGES_SNAPSHOT,
			timestamp: Date.now(),
			messages: uiMessagesToWire(interleaveActivityRecords(modelMessagesToUIMessages(withIds), this.activities), {
				includeSnapshotStructuredOutput: true,
				includeActivity: true
			})
		};
	}
	publicInterruptTerminal(chunk) {
		if (chunk.type !== EventType.RUN_FINISHED || chunk.outcome?.type !== "interrupt") return chunk;
		return {
			...chunk,
			outcome: {
				...chunk.outcome,
				interrupts: chunk.outcome.interrupts.map((interrupt) => {
					if (!interrupt.metadata || typeof interrupt.metadata !== "object" || Array.isArray(interrupt.metadata)) return interrupt;
					const metadata = { ...interrupt.metadata };
					const binding = normalizePublicInterruptBinding(metadata[interruptBindingMetadataKey], interrupt.id);
					if (binding) metadata[interruptBindingMetadataKey] = binding;
					else delete metadata[interruptBindingMetadataKey];
					return {
						...interrupt,
						metadata
					};
				})
			}
		};
	}
	interruptFailure(error) {
		const structured = structuralInterruptFailure(error);
		if (structured) return {
			message: structured.error.message,
			code: structured.errors[0]?.code ?? "server",
			errors: structured.errors
		};
		if (error && typeof error === "object" && "errors" in error) {
			const errors = error.errors;
			if (Array.isArray(errors)) {
				const first = errors[0];
				if (first && typeof first === "object") return {
					message: "message" in first && typeof first.message === "string" ? first.message : "Interrupt persistence failed.",
					code: "code" in first && typeof first.code === "string" ? first.code : "server"
				};
			}
		}
		return {
			message: error instanceof Error ? error.message : "Interrupt persistence failed.",
			code: "server"
		};
	}
	buildInterruptRunErrorChunk(error) {
		const failure = this.interruptFailure(error);
		return withTanstackMetadata({
			type: EventType.RUN_ERROR,
			timestamp: Date.now(),
			message: failure.message,
			code: failure.code
		}, {
			runId: this.runIdOverride ?? this.requestId,
			threadId: this.threadId,
			...failure.errors !== void 0 ? { interruptErrors: failure.errors } : {}
		});
	}
	async *emitInterruptRunError(error) {
		const failure = this.interruptFailure(error);
		this.finalizationError = {
			message: failure.message,
			code: failure.code,
			cause: error
		};
		yield* this.pipeThroughMiddleware(this.buildInterruptRunErrorChunk(error));
	}
	async *emitActionableInterruptBoundary(finishEvent, approvals, clientRequests, genericRequests = [], inputRequired = [], childInterrupts = []) {
		yield* this.emitSyntheticRunStarted(finishEvent);
		const genericInterruptIds = genericRequests.map(() => this.genericInterruptId());
		const terminal = this.completeEphemeralInterruptBindings(this.buildInterruptFinishedChunk(finishEvent, approvals, clientRequests, genericRequests, genericInterruptIds, inputRequired, childInterrupts));
		let terminalOutputs;
		try {
			terminalOutputs = [...this.emitPublicChunks(await this.middlewareRunner.runOnChunk(this.middlewareCtx, terminal))];
		} catch (error) {
			yield* this.emitInterruptRunError(error);
			return false;
		}
		yield* this.pipeThroughMiddleware(this.buildMessagesSnapshotChunk());
		if (this.params.state !== void 0) yield* this.pipeThroughMiddleware({
			type: EventType.STATE_SNAPSHOT,
			timestamp: Date.now(),
			snapshot: this.params.state
		});
		for (const output of terminalOutputs) yield this.publicInterruptTerminal(output);
		return true;
	}
	async *emitBoundaryInterrupts(phase, finishEvent, toolCalls = [], requests, inputRequired = []) {
		this.middlewareCtx.phase = phase;
		const boundaryRequests = requests ?? (yield* this.runWhileYielding(this.middlewareRunner.runOnInterruptBoundary(this.middlewareCtx)));
		if (boundaryRequests.length === 0) return false;
		for (const request of boundaryRequests) if (this.interruptDefinitions.get(request.definition.id) !== request.definition) throw new Error(`Generic interrupt definition ${request.definition.id} is not registered on this chat.`);
		if (phase === "afterModel") {
			if (this.toolCallManager.hasToolCalls()) this.addAssistantToolCallMessage(this.toolCallManager.getToolCalls());
			else this.addTerminalAssistantMessages();
		}
		const actionable = yield* this.runWhileYielding(this.getBoundaryActionableToolRequests(toolCalls));
		for (const chunk of this.buildToolResultChunks(actionable.results, finishEvent)) yield* this.pipeThroughMiddleware(chunk);
		yield* this.emitActionableInterruptBoundary(finishEvent, actionable.approvals, actionable.clientRequests, boundaryRequests, inputRequired);
		return true;
	}
	/**
	* Save the pending mid-conversation record on the first assistant message
	* at index `from` or later. The record is a field of the message, so it
	* goes wherever the transcript goes: a message store, a harness log, a
	* restart.
	*/
	saveMidConversationChange(from) {
		const record = this.pendingMidConversationChange;
		if (!record) return;
		const index = this.messages.findIndex((message, at) => at >= from && message.role === "assistant");
		if (index < 0) return;
		this.pendingMidConversationChange = void 0;
		this.messages = this.messages.map((message, at) => at === index ? {
			...message,
			midConversationChange: record
		} : message);
	}
	async getBoundaryActionableToolRequests(toolCalls) {
		const { approvals, clientToolResults } = this.collectClientState();
		const pendingCalls = toolCalls.filter((toolCall) => {
			if (isProviderExecutedToolCall(toolCall)) return false;
			const tool = this.resolveExecutableTools([toolCall]).find((candidate) => candidate.name === toolCall.function.name);
			if (!tool || clientToolResults.has(toolCall.id) || this.resumeClientToolErrors.has(toolCall.id) || this.resumeCancelledToolCallIds.has(toolCall.id)) return false;
			if (!tool.execute) return true;
			const resolution = approvals.get(toolCall.id) ?? approvals.get(`approval_${toolCall.id}`);
			return tool.needsApproval === true && (resolution === void 0 || resolution === false || typeof resolution === "object" && !resolution.approved);
		});
		const generator = executeToolCalls(pendingCalls, this.resolveExecutableTools(pendingCalls), approvals, clientToolResults, void 0, {
			onBeforeToolCall: (toolCall, tool, args) => this.middlewareRunner.runOnBeforeToolCall(this.middlewareCtx, {
				toolCall,
				tool,
				args,
				toolName: toolCall.function.name,
				toolCallId: toolCall.id
			}),
			onAfterToolCall: (info) => this.middlewareRunner.runOnAfterToolCall(this.middlewareCtx, info)
		}, this.middlewareCtx.context, this.toolAbortSignal);
		const rawEdits = this.captureApprovedArgumentEdits(pendingCalls);
		while (true) {
			const next = await generator.next();
			if (next.done) {
				this.retainApprovedArgumentEdits([...next.value.results.filter((entry) => entry.state !== "output-error").map((entry) => entry.toolCallId), ...next.value.needsClientExecution.map((entry) => entry.toolCallId)], rawEdits);
				return {
					approvals: next.value.needsApproval,
					clientRequests: next.value.needsClientExecution,
					results: next.value.results
				};
			}
		}
	}
	completeEphemeralInterruptBindings(chunk) {
		if (chunk.type !== EventType.RUN_FINISHED || chunk.outcome?.type !== "interrupt") return chunk;
		const interruptedRunId = this.runIdOverride ?? this.requestId;
		return {
			...chunk,
			outcome: {
				...chunk.outcome,
				interrupts: chunk.outcome.interrupts.map((interrupt) => {
					if (!interrupt.metadata || typeof interrupt.metadata !== "object" || Array.isArray(interrupt.metadata)) return interrupt;
					const metadata = { ...interrupt.metadata };
					const unopened = metadata[interruptBindingMetadataKey];
					if (unopened === null || typeof unopened !== "object" || Array.isArray(unopened)) return interrupt;
					metadata[interruptBindingMetadataKey] = {
						...unopened,
						interruptedRunId,
						generation: 0
					};
					return {
						...interrupt,
						metadata
					};
				})
			}
		};
	}
	buildToolResultChunks(results, _finishEvent, argsMap, replaceExisting = false) {
		const chunks = [];
		for (const result of results) {
			const content = normalizeToolResult(result.result);
			const wireContent = typeof content === "string" ? content : JSON.stringify(content);
			if (argsMap) {
				chunks.push({
					type: EventType.TOOL_CALL_START,
					timestamp: Date.now(),
					toolCallId: result.toolCallId,
					toolCallName: result.toolName,
					toolName: result.toolName
				});
				const args = argsMap.get(result.toolCallId) ?? "{}";
				chunks.push({
					type: EventType.TOOL_CALL_ARGS,
					timestamp: Date.now(),
					toolCallId: result.toolCallId,
					delta: args
				});
				chunks.push({
					type: EventType.TOOL_CALL_END,
					timestamp: Date.now(),
					toolCallId: result.toolCallId
				});
			}
			const parentMessageId = [...this.messages].reverse().find((message) => message.role === "assistant")?.id;
			const resultChunk = {
				type: EventType.TOOL_CALL_RESULT,
				timestamp: Date.now(),
				messageId: parentMessageId || result.toolCallId,
				toolCallId: result.toolCallId,
				content: wireContent,
				role: "tool"
			};
			chunks.push(result.state === "output-error" ? withTanstackMetadata(resultChunk, {
				state: result.state,
				...result.outcome !== void 0 && { toolResultOutcome: result.outcome }
			}) : resultChunk);
			const placeholderIdx = this.messages.findIndex((m) => {
				if (m.role !== "tool" || m.toolCallId !== result.toolCallId) return false;
				if (typeof m.content !== "string") return false;
				try {
					return JSON.parse(m.content)?.pendingExecution === true;
				} catch {
					return false;
				}
			});
			const isDeniedResult = result.outcome === "denied";
			const existingToolResultIdx = isDeniedResult || replaceExisting ? this.messages.findIndex((message) => message.role === "tool" && message.toolCallId === result.toolCallId) : -1;
			const resultMessageIdx = existingToolResultIdx >= 0 ? existingToolResultIdx : placeholderIdx;
			const existingToolMessage = existingToolResultIdx >= 0 ? this.messages[existingToolResultIdx] : void 0;
			const errorField = result.state === "output-error" && { error: toolResultErrorText(parseToolOutput(wireContent)) };
			const replacementMessage = existingToolMessage?.role === "tool" ? {
				...existingToolMessage,
				content,
				toolCallId: result.toolCallId,
				...errorField
			} : {
				role: "tool",
				content,
				toolCallId: result.toolCallId,
				...errorField
			};
			const newToolMessage = result.outcome !== void 0 ? withTanstackMetadata(replacementMessage, { toolResultOutcome: result.outcome }) : replacementMessage;
			if (resultMessageIdx >= 0) {
				const replacedMessages = [
					...this.messages.slice(0, resultMessageIdx),
					newToolMessage,
					...this.messages.slice(resultMessageIdx + 1)
				];
				this.messages = isDeniedResult ? replacedMessages.filter((message, index) => index === resultMessageIdx || !(message.role === "tool" && message.toolCallId === result.toolCallId)) : replacedMessages;
			} else this.messages = [...this.messages, newToolMessage];
			this.middlewareCtx.messages = this.messages;
		}
		return chunks;
	}
	getPendingToolCallsFromMessages() {
		const completedToolIds = /* @__PURE__ */ new Set();
		for (const message of this.messages) if (message.role === "tool" && message.toolCallId) {
			let hasPendingExecution = false;
			if (typeof message.content === "string") try {
				if (JSON.parse(message.content).pendingExecution === true) hasPendingExecution = true;
			} catch {}
			if (!hasPendingExecution && !this.resumeDeniedToolResults.has(message.toolCallId)) completedToolIds.add(message.toolCallId);
		}
		const pending = [];
		const activeCallIds = /* @__PURE__ */ new Set();
		let assistantId;
		for (const message of this.messages) {
			if (message.role === "tool") continue;
			const segmentSuffix = assistantId === void 0 || message.id === void 0 ? void 0 : message.id.slice(assistantId.length);
			if (!(message.role === "assistant" && assistantId !== void 0 && message.id?.startsWith(assistantId) && /^-segment-[1-9]\d*$/.test(segmentSuffix ?? ""))) {
				activeCallIds.clear();
				assistantId = message.role === "assistant" ? message.id : void 0;
			}
			const stopReason = tanstackMetadata(message)?.stopReason;
			if (message.role === "assistant" && stopReason !== "error" && stopReason !== "aborted") for (const call of message.toolCalls ?? []) activeCallIds.add(call.id);
		}
		const { approvals } = this.collectClientState();
		for (const message of this.messages) if (message.role === "assistant" && message.toolCalls) {
			const metadata = tanstackMetadata(message);
			if (metadata?.stopReason === "error" || metadata?.stopReason === "aborted" || metadata?.finishReason === "length") continue;
			for (const toolCall of message.toolCalls) {
				if (isProviderExecutedToolCall(toolCall)) continue;
				const explicitlyResumed = approvals.has(toolCall.id) || approvals.has(`approval_${toolCall.id}`) || this.resumeClientToolResults.has(toolCall.id) || this.resumeClientToolErrors.has(toolCall.id) || this.resumeCancelledToolCallIds.has(toolCall.id);
				if (!completedToolIds.has(toolCall.id) && (activeCallIds.has(toolCall.id) || explicitlyResumed)) pending.push(toolCall);
			}
		}
		return pending;
	}
	/**
	* Find a tool call by id in message history (including already-completed ones).
	* Used when the client has already attached a tool result for UI before resume.
	*/
	findToolCallInMessages(toolCallId) {
		for (const message of this.messages) {
			if (message.role !== "assistant" || !message.toolCalls) continue;
			for (const toolCall of message.toolCalls) if (toolCall.id === toolCallId) return toolCall;
		}
	}
	/**
	* Tool calls that must be reconstructed as interrupt pending for ephemeral
	* resume. Includes outstanding tools plus client tools that already have
	* results in history when the resume batch still carries `client_tool_*`
	* entries (the client writes local tool results before submitting resume).
	*/
	getToolCallsForEphemeralResume(resume) {
		const pending = this.getPendingToolCallsFromMessages();
		const byId = new Map(pending.map((toolCall) => [toolCall.id, toolCall]));
		for (const entry of resume ?? []) {
			let toolCallId;
			if (entry.interruptId.startsWith("client_tool_")) toolCallId = entry.interruptId.slice(12);
			else if (entry.interruptId.startsWith("approval_")) toolCallId = entry.interruptId.slice(9);
			if (toolCallId === void 0 || byId.has(toolCallId)) continue;
			const toolCall = this.findToolCallInMessages(toolCallId);
			if (toolCall && !isProviderExecutedToolCall(toolCall)) {
				pending.push(toolCall);
				byId.set(toolCallId, toolCall);
			}
		}
		return pending;
	}
	/** Check resumed client calls whose UI result already makes them look complete. */
	async *checkCompletedResumedClientTools() {
		const pendingIds = new Set(this.getPendingToolCallsFromMessages().map((call) => call.id));
		const completedCalls = [];
		const resumedIds = /* @__PURE__ */ new Set([...this.resumeClientToolResults.keys(), ...this.resumeClientToolErrors.keys()]);
		for (const id of resumedIds) {
			if (pendingIds.has(id)) continue;
			const call = this.findToolCallInMessages(id);
			if (!call) continue;
			const tool = this.tools.find((candidate) => candidate.name === call.function.name);
			if (tool && !tool.execute && !isProviderExecutedToolCall(call)) completedCalls.push(call);
		}
		if (completedCalls.length === 0) return;
		const { approvals, clientToolResults } = this.collectClientState();
		const rawEdits = this.captureApprovedArgumentEdits(completedCalls);
		const result = yield* this.drainToolCallGenerator(executeToolCalls(completedCalls, this.resolveExecutableTools(completedCalls), approvals, clientToolResults, void 0, {
			onBeforeToolCall: (toolCall, tool, args) => this.middlewareRunner.runOnBeforeToolCall(this.middlewareCtx, {
				toolCall,
				tool,
				args,
				toolName: toolCall.function.name,
				toolCallId: toolCall.id
			}),
			onAfterToolCall: (info) => this.middlewareRunner.runOnAfterToolCall(this.middlewareCtx, info)
		}, this.middlewareCtx.context, this.toolAbortSignal, {
			clientToolErrors: this.resumeClientToolErrors,
			cancelledToolCallIds: this.resumeCancelledToolCallIds
		}));
		this.retainApprovedArgumentEdits(result.results.filter((entry) => entry.state !== "output-error").map((entry) => entry.toolCallId), rawEdits);
		for (const chunk of this.buildToolResultChunks(result.results, this.createSyntheticFinishedEvent(), void 0, true)) yield* this.pipeThroughMiddleware(chunk);
	}
	createSyntheticFinishedEvent(finishReason = "tool_calls") {
		return withTanstackMetadata({
			type: EventType.RUN_FINISHED,
			runId: this.runIdOverride ?? this.requestId,
			threadId: this.threadId,
			timestamp: Date.now()
		}, {
			finishReason,
			model: this.params.model
		});
	}
	async shouldContinue() {
		if (this.cyclePhase === "executeToolCalls") return true;
		const state = {
			iterationCount: this.iterationCount,
			messages: this.messages,
			finishReason: this.lastFinishReason,
			toolCallCount: this.toolCallCount,
			lastTurnToolCallCount: this.lastTurnToolCallCount
		};
		const strategyContinues = this.loopStrategy(state);
		const middlewareContinues = await this.middlewareRunner.runOnShouldContinue(this.middlewareCtx, state);
		return strategyContinues && middlewareContinues && this.toolPhase === "continue";
	}
	/**
	* Record tool calls (deduped by id) toward `toolCallCount` /
	* `lastTurnToolCallCount` for strategies and middleware `onShouldContinue`.
	*
	* Used for both live model turns and pending/resume batches. IDs already
	* counted in this run (e.g. wait→resume after a live turn) are not
	* re-added to `toolCallCount`. Per-turn execution caps are app middleware
	* (`onBeforeToolCall` skip), not engine policy.
	*/
	recordToolCalls(toolCalls) {
		this.lastTurnToolCallCount = toolCalls.length;
		let newlyCounted = 0;
		for (const tc of toolCalls) if (!this.countedToolCallIds.has(tc.id)) {
			this.countedToolCallIds.add(tc.id);
			newlyCounted++;
		}
		this.toolCallCount += newlyCounted;
	}
	isAborted() {
		return !!this.effectiveSignal?.aborted;
	}
	isMiddlewareAborted() {
		return !!this.middlewareAbortController?.signal.aborted;
	}
	isCancelled() {
		return this.isAborted() || this.isMiddlewareAborted();
	}
	/**
	* The reason to report on `AbortInfo` for a cancelled run.
	*
	* `this.abortReason` only ever holds a *middleware*-initiated reason
	* (`ctx.abort(reason)` / `MiddlewareAbortError`). A caller that aborts its own
	* controller — `abortController.abort(RUN_CANCEL_REASON)`, the in-process
	* cancel channel — never touches that field, so the reason has to be read back
	* off the caller's signal, which is the signal `isCancelled()` consults via
	* `isAborted()`. A signal aborted with no reason carries a DOMException rather
	* than a string, so non-string reasons are reported as absent.
	*/
	resolveAbortReason() {
		if (this.abortReason !== void 0) return this.abortReason;
		const signalReason = this.effectiveSignal?.reason;
		return typeof signalReason === "string" ? signalReason : void 0;
	}
	/**
	* Whether this run's teardown declared its abort a DETACH — see
	* {@link RunDetachedCapability}. Only `withSandbox`'s `onAbort` publishes it,
	* and only for a plain, intentless disconnect of a detachable run, so every
	* other exit path answers `false`.
	*
	* Surfaced on the engine (rather than the ctx being handed out) so the
	* capability read stays inside core, and so the delivery sink learns the
	* verdict through {@link publishRunDetachedSignal} instead of reaching into a
	* middleware context it has no business holding.
	*
	* @internal
	*/
	wasDetached() {
		return getRunDetached(this.middlewareCtx, { optional: true }) === true;
	}
	/**
	* The delivery socket closed while this run was still going.
	*
	* Notifies every subscriber (see {@link RunDisconnectCapability}) and RETURNS
	* IMMEDIATELY. Synchronous on purpose: it is called from
	* `ReadableStream.cancel()`, which must not be made to wait on a run-store
	* write, and the caller ({@link notifyRunDisconnected}) has no consumer left to
	* report to anyway.
	*
	* Subscribers therefore run CONCURRENTLY with the still-executing run — which is
	* the entire point. The run is typically suspended inside a slow middleware
	* `setup` at this moment, so anything dispatched from the run's own unwinding
	* would be minutes late. Nothing on this path aborts the run: a durable run
	* outlives its viewer.
	*
	* Each subscriber's promise is parked on `deferredPromises`, which the run awaits
	* in its `finally`, so bookkeeping cannot be lost to a race with the run's own
	* completion even though nothing awaits it here.
	*
	* IDEMPOTENT. A second cancel, or one arriving after a terminal hook already ran,
	* is ignored: the terminal hooks own the run's outcome, and re-stamping
	* `detachedSince` on a run that has already finished would hand a completed run
	* to the reaper as reclaimable work.
	*
	* @internal
	*/
	notifyDisconnected() {
		if (this.disconnected || this.terminalHookCalled) return;
		this.disconnected = true;
		for (const listener of this.disconnectListeners) this.runDisconnectListener(listener);
	}
	/**
	* Invoke one disconnect listener, isolated and with its failure SWALLOWED after
	* logging.
	*
	* There is no caller left to report to — the socket this would report on is the
	* one that just closed — and a rejection parked on `deferredPromises` would
	* surface as the run's failure, replacing a healthy outcome with a bookkeeping
	* error. Isolation matters for the usual reason too: one subscriber's failing
	* write must not skip the next one's.
	*/
	runDisconnectListener(listener) {
		let result;
		try {
			result = listener();
		} catch (error) {
			this.logger.errors("run disconnect listener failed", { error });
			return;
		}
		if (result === void 0) return;
		this.deferredPromises.push(result.catch((error) => {
			this.logger.errors("run disconnect listener failed", { error });
		}));
	}
	/**
	* Run the final structured-output adapter call through the middleware
	* pipeline. Yields chunks to the caller only when
	* `this.finalStructuredOutput.yieldChunks` is true; otherwise consumes
	* silently while still piping through middleware.
	*
	* On success, populates this.structuredOutputResult.
	* On failure, populates this.finalizationError.
	*/
	async *runStructuredFinalization() {
		if (!this.finalStructuredOutput) throw new Error("runStructuredFinalization called without finalStructuredOutput config");
		this.middlewareCtx.phase = "structuredOutput";
		const baseConfig = this.buildMiddlewareConfig();
		const { tools: _omitTools, toolChoice: _omitToolChoice, ...baseWithoutTools } = baseConfig;
		let structuredConfig = {
			...baseWithoutTools,
			outputSchema: this.finalStructuredOutput.jsonSchema
		};
		structuredConfig = yield* this.runWhileYielding(this.middlewareRunner.runOnStructuredOutputConfig(this.middlewareCtx, structuredConfig));
		const { outputSchema: pinnedSchema, ...chatConfigSlice } = structuredConfig;
		const postOnConfig = yield* this.runWhileYielding(this.middlewareRunner.runOnConfig(this.middlewareCtx, {
			...chatConfigSlice,
			tools: baseConfig.tools
		}));
		this.applyMiddlewareConfig(postOnConfig);
		assertMessagesFileSourceSupport(this.adapter, this.messages);
		const structuredCallOptions = {
			chatOptions: {
				model: this.params.model,
				messages: transformMessagesForReplay(this.providerMessages).messages,
				metadata: postOnConfig.metadata,
				modelOptions: postOnConfig.modelOptions,
				...postOnConfig.reasoning ? { reasoning: postOnConfig.reasoning } : {},
				systemPrompts: postOnConfig.systemPrompts,
				logger: this.logger,
				threadId: this.threadId,
				promptCache: this.params.promptCache,
				runId: this.runIdOverride,
				parentRunId: this.parentRunIdOverride,
				...this.effectiveRequest ? { request: this.effectiveRequest } : {},
				...this.callWrapFetch ? { wrapFetch: this.callWrapFetch } : {}
			},
			outputSchema: pinnedSchema
		};
		let fallbackAdapterError = void 0;
		this.structuredCallMetadata = { source: {
			provider: this.adapter.provider ?? this.adapter.name,
			api: this.adapter.api ?? this.adapter.kind,
			model: structuredCallOptions.chatOptions.model
		} };
		const providerStream = this.adapter.structuredOutputStream ? this.adapter.structuredOutputStream(structuredCallOptions) : fallbackStructuredOutputStream(this.adapter, structuredCallOptions, (err) => {
			fallbackAdapterError = err;
		});
		let startEmitted = false;
		let structuredMessageId = null;
		const extractMessageId = (c) => {
			if (c.type === EventType.TEXT_MESSAGE_START || c.type === EventType.TEXT_MESSAGE_CONTENT || c.type === EventType.TEXT_MESSAGE_END) return typeof c.messageId === "string" && c.messageId !== "" ? c.messageId : null;
			return null;
		};
		const buildSynthesizedStart = (timestamp = Date.now()) => {
			const idForStart = structuredMessageId ?? generateMessageId();
			structuredMessageId = idForStart;
			this.captureStructuredOutputMessageIdentity(idForStart);
			return {
				type: EventType.CUSTOM,
				name: "structured-output.start",
				value: { messageId: idForStart },
				timestamp
			};
		};
		const runChunkMiddleware = (synthChunk) => this.middlewareRunner.runOnChunk(this.middlewareCtx, synthChunk);
		let runErrorYielded = false;
		let rawText = "";
		for await (const raw of providerStream) {
			if (this.isCancelled()) break;
			{
				const chunk = this.withCallMetadata(raw, this.structuredCallMetadata);
				if (!startEmitted && chunk.type === EventType.CUSTOM && chunk.name === "structured-output.start") startEmitted = true;
				if (!structuredMessageId) {
					const extracted = extractMessageId(chunk);
					if (extracted) {
						structuredMessageId = extracted;
						this.captureStructuredOutputMessageIdentity(extracted);
					}
				}
				if (this.finalStructuredOutput.yieldChunks) {
					if (!startEmitted && (chunk.type === EventType.TEXT_MESSAGE_START || chunk.type === EventType.TEXT_MESSAGE_CONTENT || chunk.type === EventType.TEXT_MESSAGE_END)) {
						startEmitted = true;
						const synthStart = buildSynthesizedStart(chunk.timestamp);
						yield* this.emitPublicChunks(await runChunkMiddleware(synthStart));
					}
					if (!startEmitted && chunk.type === EventType.RUN_ERROR) {
						startEmitted = true;
						const synthStart = buildSynthesizedStart(chunk.timestamp);
						yield* this.emitPublicChunks(await runChunkMiddleware(synthStart));
					}
				}
				let outboundChunk = chunk;
				if (chunk.type === EventType.CUSTOM && chunk.name === "structured-output.complete") {
					const parsed = readStructuredOutputCompleteValue(chunk.value);
					if (parsed) {
						const object = this.finalStructuredOutput.normalize ? this.finalStructuredOutput.normalize(parsed.object) : parsed.object;
						this.structuredOutputResult = {
							data: object,
							rawText: parsed.raw,
							...parsed.reasoning !== void 0 ? { reasoning: parsed.reasoning } : {}
						};
						const value = chunk.value;
						if (object !== parsed.object && value && typeof value === "object") outboundChunk = {
							...chunk,
							value: {
								...value,
								object
							}
						};
					}
				}
				if (chunk.type === EventType.RUN_FINISHED) await this.runOnUsageFromChunk(chunk);
				if (chunk.type === EventType.TEXT_MESSAGE_CONTENT) rawText += chunk.delta;
				if (chunk.type === EventType.RUN_ERROR) {
					const cause = fallbackAdapterError ?? chunk.rawEvent;
					this.finalizationError = {
						message: chunk.message,
						...chunk.code ? { code: chunk.code } : {},
						...cause !== void 0 ? { cause } : {},
						...rawText ? { rawText } : {}
					};
				}
				const outputChunks = await this.middlewareRunner.runOnChunk(this.middlewareCtx, outboundChunk);
				if (this.finalStructuredOutput.yieldChunks) for (const spec of this.emitPublicChunks(outputChunks)) {
					if (spec.type === EventType.RUN_ERROR) runErrorYielded = true;
					yield spec;
				}
				if (this.finalizationError) break;
			}
			if (this.isCancelled() || this.finalizationError) break;
		}
		if (this.isCancelled()) return;
		if (!this.structuredOutputResult && !this.finalizationError) this.finalizationError = {
			message: "missing structured result",
			code: "structured-output-missing-result"
		};
		if (this.structuredOutputResult && !this.finalizationError && this.finalStructuredOutput.validate) try {
			const validated = this.finalStructuredOutput.validate(this.structuredOutputResult.data);
			this.validatedStructuredOutput = validated;
			this.hasValidatedStructuredOutput = true;
		} catch (err) {
			const message = err instanceof Error ? err.message : String(err);
			this.finalizationError = {
				message,
				code: "structured-output-validation-failed",
				cause: err
			};
		}
		if (this.finalizationError && this.finalStructuredOutput.yieldChunks && !runErrorYielded) {
			if (!startEmitted) {
				const synthStart = buildSynthesizedStart();
				yield* this.emitPublicChunks(await runChunkMiddleware(synthStart));
				startEmitted = true;
			}
			const errChunk = {
				type: EventType.RUN_ERROR,
				timestamp: Date.now(),
				message: this.finalizationError.message,
				...this.finalizationError.code ? { code: this.finalizationError.code } : {}
			};
			yield* this.emitPublicChunks(await this.middlewareRunner.runOnChunk(this.middlewareCtx, errChunk));
		}
	}
	/**
	* Native combined mode: harvest the structured output from the agent
	* loop's accumulated final-turn text (no separate provider call).
	*
	* The adapter wired `outputSchema` into the regular `chatStream` request,
	* so the model's final-turn text is the schema-constrained JSON. We parse
	* `this.accumulatedContent`, populate `this.structuredOutputResult`, emit
	* a synthetic `structured-output.complete` (and a `structured-output.start`
	* if one wasn't emitted earlier — only happens on the streaming path when
	* the model returned no text at all), and run the validate callback when
	* present. Failures populate `this.finalizationError` so the engine's
	* terminal-hook chooser routes to `onError` (per spec §7.3).
	*
	* The `'structuredOutput'` middleware phase intentionally does NOT fire on
	* this path — middleware sees the run through `beforeModel` / `modelStream`
	* as usual. See PR #605 / issue #605 for the design rationale.
	*/
	async *harvestCombinedStructuredOutput() {
		if (!this.finalStructuredOutput) throw new Error("harvestCombinedStructuredOutput called without finalStructuredOutput config");
		const yieldChunks = this.finalStructuredOutput.yieldChunks;
		const source = this.finalStructuredOutput.source ?? "text";
		if (this.lastFinishReason === "length") this.finalizationError = {
			message: "The response was cut off because the maximum token limit was reached (finish_reason=length); raise the output token limit.",
			code: "max_tokens"
		};
		else if (source === "event") {
			if (!this.structuredOutputResult) this.finalizationError = {
				message: "missing structured result",
				code: "structured-output-missing-result"
			};
		} else {
			const rawText = this.accumulatedContent;
			if (rawText.length === 0) this.finalizationError = {
				message: "missing structured result",
				code: "structured-output-missing-result"
			};
			else try {
				const parsed = JSON.parse(rawText);
				const data = this.finalStructuredOutput.normalize ? this.finalStructuredOutput.normalize(parsed) : parsed;
				this.structuredOutputResult = {
					data,
					rawText
				};
			} catch (err) {
				const detail = rawText.slice(0, 200) + (rawText.length > 200 ? "..." : "");
				this.finalizationError = {
					message: `Failed to parse structured output as JSON. Content: ${detail}`,
					code: "structured-output-parse-failed",
					cause: err,
					rawText
				};
			}
		}
		if (this.structuredOutputResult && !this.finalizationError && this.finalStructuredOutput.validate) try {
			const validated = this.finalStructuredOutput.validate(this.structuredOutputResult.data);
			this.validatedStructuredOutput = validated;
			this.hasValidatedStructuredOutput = true;
		} catch (err) {
			const message = err instanceof Error ? err.message : String(err);
			this.finalizationError = {
				message,
				code: "structured-output-validation-failed",
				cause: err
			};
		}
		if (!yieldChunks) return;
		if (!this.combinedStartEmitted) {
			this.combinedStartEmitted = true;
			const messageId = this.combinedStructuredMessageId ?? generateMessageId();
			this.combinedStructuredMessageId = messageId;
			const synthStart = {
				type: EventType.CUSTOM,
				name: "structured-output.start",
				value: { messageId },
				timestamp: Date.now()
			};
			yield* this.emitPublicChunks(await this.middlewareRunner.runOnChunk(this.middlewareCtx, synthStart));
		}
		if (this.structuredOutputResult && !this.finalizationError && !this.combinedCompleteEmitted) {
			const completeChunk = {
				type: EventType.CUSTOM,
				name: "structured-output.complete",
				value: {
					object: this.structuredOutputResult.data,
					raw: this.structuredOutputResult.rawText,
					...this.combinedStructuredMessageId ? { messageId: this.combinedStructuredMessageId } : {}
				},
				timestamp: Date.now()
			};
			yield* this.emitPublicChunks(await this.middlewareRunner.runOnChunk(this.middlewareCtx, completeChunk));
		}
		if (this.finalizationError) {
			const errChunk = {
				type: EventType.RUN_ERROR,
				timestamp: Date.now(),
				message: this.finalizationError.message,
				...this.finalizationError.code ? { code: this.finalizationError.code } : {}
			};
			yield* this.emitPublicChunks(await this.middlewareRunner.runOnChunk(this.middlewareCtx, errChunk));
		}
	}
	buildMiddlewareConfig() {
		return {
			messages: this.messages,
			activities: this.activities,
			providerMessages: this.messages,
			systemPrompts: [...this.systemPrompts],
			tools: [...this.tools],
			resume: this.params.resume,
			resumeToolState: {
				approvals: this.resumeApprovals,
				clientToolResults: this.resumeClientToolResults,
				clientToolErrors: this.resumeClientToolErrors,
				deniedToolResults: this.resumeDeniedToolResults,
				cancelledToolCallIds: this.resumeCancelledToolCallIds
			},
			metadata: this.params.metadata,
			modelOptions: this.params.modelOptions,
			reasoning: this.params.reasoning,
			promptCache: this.params.promptCache,
			toolChoice: this.params.toolChoice,
			wrapFetch: this.params.wrapFetch
		};
	}
	/** Resume entries this run answers itself. A subagent tool owns the rest. */
	ownResume(resume) {
		const childIds = this.params[CHILD_RESUME_IDS];
		return childIds ? resume?.filter((entry) => !childIds.has(entry.interruptId)) : resume;
	}
	async applyEphemeralInterruptResume(middlewareConfig) {
		const config = {
			...middlewareConfig,
			resume: this.ownResume(middlewareConfig.resume)
		};
		if ((config.resume?.length ?? 0) === 0) return;
		const interruptedRunId = this.parentRunIdOverride;
		if (!interruptedRunId) throw new InterruptResumeValidationError([{
			scope: "batch",
			threadId: this.threadId,
			interruptedRunId: this.runIdOverride ?? this.requestId,
			generation: 0,
			interruptIds: config.resume?.map((entry) => entry.interruptId) ?? [],
			code: "stale",
			message: "Interrupt continuation requires parentRunId to identify the interrupted run.",
			source: "server",
			retryable: false
		}]);
		const approvalRequests = [];
		const clientRequests = [];
		const pendingToolCalls = this.getToolCallsForEphemeralResume(config.resume);
		const resumeInterruptIds = new Set(config.resume?.map((entry) => entry.interruptId));
		const toolInputs = /* @__PURE__ */ new Map();
		const toolsByCallId = /* @__PURE__ */ new Map();
		const clientExecutionCallIds = /* @__PURE__ */ new Set();
		for (const toolCall of pendingToolCalls) {
			const tool = this.tools.find((candidate) => candidate.name === toolCall.function.name);
			if (!tool) continue;
			toolsByCallId.set(toolCall.id, tool);
			let input = {};
			try {
				input = JSON.parse(toolCall.function.arguments.trim() || (tool.inputSchema === void 0 ? "{}" : ""));
			} catch {
				throw new Error(`Failed to parse tool arguments as JSON: ${toolCall.function.arguments}`);
			}
			toolInputs.set(toolCall.id, input);
			if (!tool.execute && resumeInterruptIds.has(`client_tool_${toolCall.id}`)) clientExecutionCallIds.add(toolCall.id);
		}
		for (const toolCall of pendingToolCalls) if (toolsByCallId.get(toolCall.id)?.needsApproval && !clientExecutionCallIds.has(toolCall.id)) approvalRequests.push({
			toolCallId: toolCall.id,
			toolName: toolCall.function.name,
			input: toolInputs.get(toolCall.id),
			approvalId: `approval_${toolCall.id}`
		});
		for (const toolCall of pendingToolCalls) {
			const tool = toolsByCallId.get(toolCall.id);
			if (tool !== void 0 && !tool.execute && (!tool.needsApproval || clientExecutionCallIds.has(toolCall.id))) clientRequests.push({
				toolCallId: toolCall.id,
				toolName: toolCall.function.name,
				input: toolInputs.get(toolCall.id)
			});
		}
		const genericPending = this.getGenericContinuationPending(interruptedRunId);
		const pending = this.buildActionableInterrupts(approvalRequests, clientRequests).flatMap((descriptor) => {
			const unopened = readUnopenedInterruptBinding(descriptor);
			return unopened ? [{
				interruptId: descriptor.id,
				payload: descriptor,
				binding: {
					...unopened,
					interruptedRunId,
					generation: 0
				}
			}] : [];
		});
		pending.push(...genericPending);
		const mcpInputCallIds = /* @__PURE__ */ new Map();
		for (const toolCall of pendingToolCalls) {
			const interruptId = `mcp_input_${toolCall.id}`;
			if (!resumeInterruptIds.has(interruptId)) continue;
			if (!toolsByCallId.get(toolCall.id)?.execute) continue;
			mcpInputCallIds.set(interruptId, toolCall.id);
			pending.push({
				interruptId,
				payload: { id: interruptId },
				binding: {
					v: 1,
					kind: "generic",
					interruptId,
					interruptedRunId,
					generation: 0
				}
			});
		}
		const validated = await validateInterruptResumeBatch({
			threadId: this.threadId,
			interruptedRunId,
			generation: 0,
			pending,
			resume: config.resume,
			tools: this.tools
		});
		if (validated.errors.length > 0 || !validated.resumeToolState) throw new InterruptResumeValidationError(validated.errors);
		const approvals = new Map(validated.resumeToolState.approvals);
		for (const request of clientRequests) if (toolsByCallId.get(request.toolCallId)?.needsApproval) approvals.set(request.toolCallId, true);
		this.applyResumeToolState({
			...validated.resumeToolState,
			approvals
		});
		const genericResolutions = validated.resumeToolState.genericInterrupts;
		for (const [interruptId, toolCallId] of mcpInputCallIds) {
			const resolution = genericResolutions?.get(interruptId);
			if (!resolution) continue;
			this.resumeInputResponses.set(toolCallId, resolution.status === "resolved" ? {
				status: "resolved",
				payload: resolution.payload
			} : { status: "cancelled" });
		}
		if (genericPending.length > 0 && genericResolutions) {
			const resolutions = genericPending.sort((left, right) => {
				return (left.binding.kind === "generic" ? left.binding.batchIndex ?? 0 : 0) - (right.binding.kind === "generic" ? right.binding.batchIndex ?? 0 : 0);
			}).flatMap((record) => {
				const resolution = genericResolutions.get(record.interruptId);
				if (!resolution || !record.genericRequest) return [];
				return [resolution.status === "resolved" ? {
					request: record.genericRequest,
					status: "resolved",
					response: resolution.payload
				} : {
					request: record.genericRequest,
					status: "cancelled"
				}];
			});
			const policy = await this.middlewareRunner.runOnInterruptResolution(this.middlewareCtx, {
				for: (definition) => resolutions.filter((resolution) => resolution.request.definition === definition),
				all: (...definitions) => definitions.length === 0 ? resolutions : resolutions.filter((resolution) => definitions.includes(resolution.request.definition))
			});
			if (policy.toolResume === "stop") this.earlyTermination = true;
			else if (policy.toolResume === "cancel") for (const request of pendingToolCalls) {
				if (this.resumeDeniedToolResults.has(request.id)) continue;
				this.resumeCancelledToolCallIds.add(request.id);
			}
		}
	}
	getGenericContinuationPending(interruptedRunId) {
		const fail = (message) => {
			throw new InterruptResumeValidationError([{
				scope: "batch",
				threadId: this.threadId,
				interruptedRunId,
				generation: 0,
				interruptIds: [],
				code: "stale",
				message,
				source: "server",
				retryable: false
			}]);
		};
		const pending = [];
		const ids = /* @__PURE__ */ new Set();
		const batchIndexes = /* @__PURE__ */ new Set();
		for (const resumeItem of this.ownResume(this.params.resume) ?? []) {
			const parsed = readGenericInterruptContinuation(resumeItem.metadata);
			if (parsed.status === "absent") continue;
			if (parsed.status === "invalid") return fail(parsed.message);
			const entry = parsed.value;
			const id = resumeItem.interruptId;
			const definition = this.interruptDefinitions.get(entry.definitionId);
			if (!definition) return fail(`Generic interrupt definition ${entry.definitionId} is unavailable.`);
			if (ids.has(id) || batchIndexes.has(entry.batchIndex)) return fail("Generic interrupt continuation contains duplicate entries.");
			ids.add(id);
			batchIndexes.add(entry.batchIndex);
			let request;
			try {
				request = rehydrateInterruptRequest(definition, {
					key: entry.key,
					reason: entry.reason,
					message: entry.message,
					...typeof entry.expiresAt === "string" ? { expiresAt: entry.expiresAt } : {},
					...Object.prototype.hasOwnProperty.call(entry, "payload") ? { payload: entry.payload } : {}
				});
			} catch (error) {
				return fail(`Generic interrupt continuation ${id} is invalid: ${error instanceof Error ? error.message : String(error)}`);
			}
			const emitted = createInterruptBinding(request, { batchIndex: entry.batchIndex });
			if (entry.responseSchemaHash !== emitted.descriptor.responseSchemaHash || entry.payloadSchemaHash !== emitted.descriptor.payloadSchemaHash) return fail(`Generic interrupt continuation ${id} does not match its definition.`);
			pending.push({
				interruptId: id,
				payload: {
					id,
					...emitted.descriptor.responseSchemaCanonicalJson !== void 0 ? { responseSchema: JSON.parse(emitted.descriptor.responseSchemaCanonicalJson) } : {}
				},
				binding: {
					v: 1,
					kind: "generic",
					interruptId: id,
					interruptedRunId,
					generation: 0,
					definitionId: entry.definitionId,
					key: entry.key,
					batchIndex: entry.batchIndex,
					...typeof entry.expiresAt === "string" ? { expiresAt: entry.expiresAt } : {},
					...emitted.descriptor.payloadSchemaHash ? { payloadSchemaHash: emitted.descriptor.payloadSchemaHash } : {},
					...entry.responseSchemaHash !== void 0 ? { responseSchemaHash: entry.responseSchemaHash } : {}
				},
				genericRequest: request
			});
		}
		return pending;
	}
	applyResumeToolState(state) {
		if (state?.approvals) for (const [approvalId, resolution] of state.approvals) this.resumeApprovals.set(approvalId, resolution);
		if (state?.clientToolResults) for (const [toolCallId, result] of state.clientToolResults) this.resumeClientToolResults.set(toolCallId, result);
		if (state?.clientToolErrors) for (const [toolCallId, errorText] of state.clientToolErrors) this.resumeClientToolErrors.set(toolCallId, errorText);
		if (state?.deniedToolResults) for (const [toolCallId, result] of state.deniedToolResults) this.resumeDeniedToolResults.set(toolCallId, result);
		if (state?.cancelledToolCallIds) for (const toolCallId of state.cancelledToolCallIds) this.resumeCancelledToolCallIds.add(toolCallId);
		if (state?.genericInterrupts) for (const [interruptId, resolution] of state.genericInterrupts) this.resumeGenericInterrupts.set(interruptId, resolution);
		if (state?.genericInterruptRequests) for (const [interruptId, request] of state.genericInterruptRequests) this.resumeGenericInterruptRequests.set(interruptId, request);
	}
	async applyDurableGenericInterruptResolution() {
		if (this.resumeGenericInterruptRequests.size === 0) return;
		const resolutions = [...this.resumeGenericInterruptRequests.entries()].flatMap(([interruptId, request]) => {
			const resolution = this.resumeGenericInterrupts.get(interruptId);
			if (!resolution) return [];
			return [resolution.status === "resolved" ? {
				request,
				status: "resolved",
				response: resolution.payload
			} : {
				request,
				status: "cancelled"
			}];
		});
		const policy = await this.middlewareRunner.runOnInterruptResolution(this.middlewareCtx, {
			for: (definition) => resolutions.filter((resolution) => resolution.request.definition === definition),
			all: (...definitions) => definitions.length === 0 ? resolutions : resolutions.filter((resolution) => definitions.includes(resolution.request.definition))
		});
		if (policy.toolResume === "stop") this.earlyTermination = true;
		else if (policy.toolResume === "cancel") for (const toolCall of this.getPendingToolCallsFromMessages()) {
			if (this.resumeDeniedToolResults.has(toolCall.id)) continue;
			this.resumeCancelledToolCallIds.add(toolCall.id);
		}
	}
	applyMiddlewareConfig(config) {
		this.applyResumeToolState(config.resumeToolState);
		this.messages = config.messages;
		if (config.activities !== void 0) this.setActivities(config.activities);
		this.providerMessages = config.providerMessages === void 0 ? this.messages : config.providerMessages;
		this.systemPrompts = config.systemPrompts;
		assertUniqueToolNames(config.tools);
		this.tools = config.tools;
		this.params = {
			...this.params,
			metadata: config.metadata,
			modelOptions: config.modelOptions,
			reasoning: config.reasoning,
			promptCache: config.promptCache ?? this.params.promptCache
		};
		this.callToolChoice = config.toolChoice ?? this.params.toolChoice;
		this.callWrapFetch = config.wrapFetch;
		this.middlewareCtx.messages = this.messages;
		this.middlewareCtx.systemPrompts = this.systemPrompts;
		this.middlewareCtx.hasTools = this.tools.length > 0;
		this.middlewareCtx.toolNames = this.tools.map((t) => t.name);
		this.middlewareCtx.modelOptions = config.modelOptions;
	}
	/** Copy only lossless JSON raw edits. Opaque execution inputs stay untouched. */
	captureApprovedArgumentEdits(calls) {
		const unsupported = Symbol("unsupported");
		const copy = (value, ancestors = /* @__PURE__ */ new Set()) => {
			if (value === null || typeof value === "string" || typeof value === "boolean") return value;
			if (typeof value === "number") return Number.isFinite(value) && !Object.is(value, -0) ? value : unsupported;
			if (typeof value !== "object" || ancestors.has(value)) return unsupported;
			const array = Array.isArray(value);
			const prototype = Object.getPrototypeOf(value);
			if (array ? prototype !== Array.prototype : prototype !== Object.prototype && prototype !== null) return unsupported;
			const properties = Object.getOwnPropertyDescriptors(value);
			const keys = Reflect.ownKeys(properties);
			if (array && keys.length !== properties.length?.value + 1) return unsupported;
			ancestors.add(value);
			const result = array ? [] : Object.create(null);
			for (const key of keys) {
				if (array && key === "length") continue;
				const property = typeof key === "string" ? properties[key] : void 0;
				if (!property || !property.enumerable || !("value" in property) || array && !/^(0|[1-9]\d*)$/.test(String(key))) return unsupported;
				const copied = copy(property.value, ancestors);
				if (copied === unsupported) return unsupported;
				Object.defineProperty(result, key, {
					value: copied,
					enumerable: true,
					configurable: true,
					writable: true
				});
			}
			ancestors.delete(value);
			return result;
		};
		const snapshots = /* @__PURE__ */ new Map();
		for (const call of calls) {
			const resolution = this.resumeApprovals.get(call.id) ?? this.resumeApprovals.get(`approval_${call.id}`) ?? this.initialApprovals.get(call.id) ?? this.initialApprovals.get(`approval_${call.id}`);
			if (typeof resolution !== "object" || !resolution.approved || resolution.editedArgs === void 0) continue;
			try {
				const snapshot = copy(resolution.editedArgs);
				if (snapshot !== unsupported) {
					const historyCalls = this.messages.flatMap((message) => message.role === "assistant" ? message.toolCalls ?? [] : []);
					const selected = historyCalls.includes(call) ? call : historyCalls.slice().reverse().find((candidate) => candidate.id === call.id && candidate.function.name === call.function.name && candidate.function.arguments === call.function.arguments);
					if (selected) snapshots.set(selected, snapshot);
				}
			} catch {}
		}
		return snapshots;
	}
	/** Keep checked raw edits in the selected history occurrence. */
	retainApprovedArgumentEdits(checkedIds, snapshots) {
		const selectedIds = new Set(checkedIds);
		const historyCalls = this.messages.flatMap((message) => message.role === "assistant" ? message.toolCalls ?? [] : []);
		const update = (messages) => {
			const selected = /* @__PURE__ */ new Map();
			const calls = messages.flatMap((message) => message.role === "assistant" ? message.toolCalls ?? [] : []);
			for (const [call, snapshot] of snapshots) {
				if (!selectedIds.has(call.id)) continue;
				if (calls.includes(call)) {
					selected.set(call, snapshot);
					continue;
				}
				const sameCall = (candidate) => candidate.id === call.id && candidate.function.name === call.function.name && candidate.function.arguments === call.function.arguments;
				const occurrence = historyCalls.filter(sameCall).indexOf(call);
				const equivalent = calls.filter(sameCall)[occurrence];
				if (equivalent) selected.set(equivalent, snapshot);
			}
			return messages.map((message) => {
				if (message.role !== "assistant" || !message.toolCalls) return message;
				let changed = false;
				const toolCalls = message.toolCalls.map((call) => {
					if (!selected.has(call)) return call;
					const argumentsJson = JSON.stringify(selected.get(call));
					if (argumentsJson === void 0) return call;
					if (argumentsJson === call.function.arguments) return call;
					changed = true;
					return {
						...call,
						function: {
							...call.function,
							arguments: argumentsJson
						}
					};
				});
				return changed ? {
					...message,
					toolCalls
				} : message;
			});
		};
		this.messages = update(this.messages);
		this.providerMessages = update(this.providerMessages);
		this.middlewareCtx.messages = this.messages;
	}
	setToolPhase(phase) {
		this.toolPhase = phase;
	}
	/**
	* Spec-normalize middleware output, then yield to the public iterable.
	* Engine state and `onChunk` already saw the raw chunk.
	*/
	*emitPublicChunks(outputs) {
		for (const output of outputs) for (const spec of normalizeStreamChunk(output)) {
			restorePublicUsage(spec);
			if (spec.type === EventType.RUN_STARTED) {
				if (this.hasPublicRunStarted) continue;
				this.hasPublicRunStarted = true;
			}
			if (spec.type === EventType.CUSTOM && spec.name === "ui-resource") this.recordEmittedUiResource(spec.value);
			yield spec;
			this.middlewareCtx.chunkIndex++;
		}
	}
	/**
	* Pipe a single internal chunk through middleware, then spec-normalize
	* before the public `for await` stream.
	*/
	async *pipeThroughMiddleware(chunk) {
		const afterMw = await this.middlewareRunner.runOnChunk(this.middlewareCtx, chunk);
		yield* this.emitPublicChunks(afterMw);
		if (!this.drainingMiddlewareCustom) yield* this.drainMiddlewareCustomQueue();
	}
	/**
	* Drain CUSTOM chunks pushed by `ctx.emitCustomEvent` through middleware
	* and into the public stream. If the run has not yet sent `RUN_STARTED`,
	* emit that first so CUSTOM events are not the first wire event.
	*/
	async *drainMiddlewareCustomQueue() {
		if (this.drainingMiddlewareCustom) return;
		if (this.middlewareCustomQueue.length === 0) return;
		this.drainingMiddlewareCustom = true;
		try {
			yield* this.emitSyntheticRunStarted(this.createSyntheticFinishedEvent());
			while (this.middlewareCustomQueue.length > 0) {
				const chunk = this.middlewareCustomQueue.shift();
				if (chunk) yield* this.pipeThroughMiddleware(chunk);
			}
		} finally {
			this.drainingMiddlewareCustom = false;
		}
	}
	/**
	* Await `work` while yielding any `emitCustomEvent` chunks as they arrive.
	*/
	async *runWhileYielding(work) {
		let settled = false;
		let result;
		let error;
		const done = work.then((value) => {
			settled = true;
			result = value;
		}, (err) => {
			settled = true;
			error = err;
		});
		while (!settled) {
			yield* this.drainMiddlewareCustomQueue();
			if (settled) break;
			await Promise.race([done, new Promise((resolve) => {
				if (this.middlewareCustomQueue.length > 0) {
					resolve();
					return;
				}
				this.middlewareCustomWaiters.push(resolve);
			})]);
		}
		yield* this.drainMiddlewareCustomQueue();
		if (error !== void 0) throw error;
		return result;
	}
	/**
	* Drain queued `sandbox.file` chunks (emitted via the SandboxRuntime sink)
	* through the middleware pipeline and into the public stream.
	*/
	async *drainSandboxFileQueue() {
		while (this.sandboxFileQueue.length > 0) {
			const chunk = this.sandboxFileQueue.shift();
			if (chunk) yield* this.pipeThroughMiddleware(chunk);
		}
	}
	/**
	* Drain an executeToolCalls async generator, yielding any CustomEvent chunks
	* through the middleware pipeline and returning the final ExecuteToolCallsResult.
	*/
	async *drainToolCallGenerator(generator) {
		let pending = generator.next();
		while (true) {
			const next = yield* this.runWhileYielding(pending);
			if (next.done) return next.value;
			yield* this.pipeThroughMiddleware(next.value);
			pending = generator.next();
		}
	}
	createCustomEventChunk(eventName, value, options) {
		const chunk = {
			type: EventType.CUSTOM,
			timestamp: Date.now(),
			name: eventName,
			value
		};
		return options?.batch ? withDurabilityBatchHint(chunk) : chunk;
	}
	createId(prefix) {
		return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
	}
};
/**
* Text activity - handles agentic text generation, one-shot text generation, and agentic structured output.
*
* This activity supports four modes:
* 1. **Streaming agentic text**: Stream responses with automatic tool execution
* 2. **Streaming one-shot text**: Simple streaming request/response without tools
* 3. **Non-streaming text**: Returns a ChatResult with the text and every chunk (stream: false)
* 4. **Agentic structured output**: Run tools, then return structured data
*
* @example Full agentic text (streaming with tools)
* ```ts
* import { chat } from '@tanstack/ai'
* import { openaiText } from '@tanstack/ai-openai'
*
* for await (const chunk of chat({
*   adapter: openaiText('gpt-5.5'),
*   messages: [{ role: 'user', content: 'What is the weather?' }],
*   tools: [weatherTool]
* })) {
*   if (chunk.type === 'TEXT_MESSAGE_CONTENT') {
*     console.log(chunk.delta)
*   }
* }
* ```
*
* @example One-shot text (streaming without tools)
* ```ts
* for await (const chunk of chat({
*   adapter: openaiText('gpt-5.5'),
*   messages: [{ role: 'user', content: 'Hello!' }]
* })) {
*   console.log(chunk)
* }
* ```
*
* @example Non-streaming text (stream: false)
* ```ts
* const { text, chunks } = await chat({
*   adapter: openaiText('gpt-5.5'),
*   messages: [{ role: 'user', content: 'Hello!' }],
*   stream: false
* })
* // text is a string with the full response
* // chunks is every chunk the run produced, in order
* ```
*
* @example Agentic structured output (tools + structured response)
* ```ts
* import { z } from 'zod'
*
* const result = await chat({
*   adapter: openaiText('gpt-5.5'),
*   messages: [{ role: 'user', content: 'Research and summarize the topic' }],
*   tools: [researchTool, analyzeTool],
*   outputSchema: z.object({
*     summary: z.string(),
*     keyPoints: z.array(z.string())
*   })
* })
* // result is { summary: string, keyPoints: string[] }
* ```
*/
function chat(options) {
	validateInterruptDefinitions(options.interrupts);
	validateCapabilities(readRuntimeMiddleware(options.middleware) ?? [], options.adapter);
	if (options.tools) assertUniqueToolNames(options.tools);
	const { outputSchema, stream } = options;
	if (outputSchema && (options.subagents?.agents.length ?? 0) > 0) throw new Error("chat() does not support subagents together with outputSchema. Put outputSchema on a child chat() instead.");
	if (options.subagents?.tool === "single" && [...options.subagents.agents, ...options.tools ?? []].some((entry) => entry.name === "subagent")) throw new Error(`subagents.tool 'single' adds a tool named "${SINGLE_SUBAGENT_TOOL}". Rename the agent or tool that uses this name.`);
	if (outputSchema && stream === true) return runStreamingStructuredOutput(toRuntimeTextActivityOptions(options, {
		outputSchema,
		stream: true
	}));
	if (outputSchema) return runAgenticStructuredOutput(toRuntimeTextActivityOptions(options, {
		outputSchema,
		stream: false
	}));
	if (stream === false) return runNonStreamingText(toRuntimeTextActivityOptions(options, {
		outputSchema: void 0,
		stream: false
	}));
	return runStreamingText(toRuntimeTextActivityOptions(options, {
		outputSchema: void 0,
		stream: true
	}));
}
/**
* Resolve the `promptCache` option once, before chat() makes up any ids. The
* key is the option key, else the caller's threadId or conversationId. A
* made-up threadId is never the key: a random key splits OpenAI cache routing.
*/
function resolvePromptCache(options) {
	const option = typeof options.promptCache === "string" ? { retention: options.promptCache } : options.promptCache;
	const key = option?.key || options.threadId || options.conversationId;
	return {
		retention: option?.retention ?? "short",
		...key ? { key } : {}
	};
}
function readRuntimeMiddleware(middleware) {
	if (middleware === void 0) return void 0;
	if (!Array.isArray(middleware)) throw new TypeError("Chat middleware must be an array.");
	return middleware;
}
function toRuntimeTextActivityOptions(options, overrides) {
	const { middleware, ...rest } = options;
	return {
		...rest,
		...overrides,
		promptCache: resolvePromptCache(rest),
		...middleware === void 0 ? {} : { middleware: readRuntimeMiddleware(middleware) }
	};
}
function validateInterruptDefinitions(definitions) {
	if (!definitions) return;
	const seen = /* @__PURE__ */ new Set();
	for (const definition of definitions) {
		if (seen.has(definition.id)) throw new Error(`Duplicate interrupt definition id: ${definition.id}`);
		seen.add(definition.id);
	}
}
/**
* Publish both delivery-side seams for `stream`.
*
* Shared by the two streaming paths so they cannot drift apart — the
* structured-output path having been wired for one seam and not the other is
* exactly the bug `publishRunDetachedSignal` picked up last time (a durable
* `chat({ outputSchema, stream: true })` could never detach).
*/
function publishDeliverySeams(stream, engineRef) {
	publishRunDetachedSignal(stream, () => engineRef.current?.wasDetached() === true);
	publishRunDisconnectHandler(stream, () => {
		engineRef.current?.notifyDisconnected();
	});
}
/**
* Run streaming text (agentic or one-shot depending on tools).
*
* A thin, NON-generator wrapper, because the stream object is also the key the
* durable delivery sink looks the run's detach verdict up under (see
* `../../delivery-detach`) and delivers its disconnect notification through (see
* `../../delivery-disconnect`). A generator function cannot reach the generator it
* returns, so the identity has to be minted out here and the engine reached back
* through `engineRef`, which the body fills as soon as its engine exists.
*/
function runStreamingText(options) {
	const engineRef = {};
	const stream = streamTextChunks(options, engineRef);
	publishDeliverySeams(stream, engineRef);
	return stream;
}
async function* runChatEngine(options, engineRef) {
	const { adapter, middleware, context, debug, mcp, subagents: _subagents, ...textOptions } = options;
	const model = adapter.model;
	const logger = resolveDebugOption(debug);
	const mcpManager = MCPManager.from(mcp);
	const mcpTools = await mcpManager.discover();
	if (mcpTools.length > 0) textOptions.tools = [...textOptions.tools ?? [], ...mcpTools];
	const engine = new TextEngine({
		adapter,
		params: {
			...textOptions,
			model,
			logger
		},
		middleware,
		context
	}, logger);
	engineRef.current = engine;
	try {
		for await (const chunk of engine.run()) yield chunk;
	} finally {
		await mcpManager.dispose();
	}
}
async function* streamTextChunks(options, engineRef) {
	const bag = options.subagents && {
		...options.subagents,
		binding: {
			...options.subagents.binding,
			promptCache: options.promptCache.retention
		}
	};
	const agents = bag?.agents ?? [];
	if (bag && agents.length > 0 && bag.router) {
		yield* runRoutedSubagents({
			...options,
			subagents: bag
		}, engineRef);
		return;
	}
	if (bag && agents.length > 0) {
		const threadId = options.threadId ?? `thread-${Date.now()}`;
		const runId = options.runId ?? `run-${Date.now()}`;
		const messages = options.messages ?? [];
		const turn = readSubagentTurn(messages, options.resume);
		const sink = createSubagentSink();
		const calls = subagentCallMessages(new Set(bag.tool === "single" ? [SINGLE_SUBAGENT_TOOL] : bag.agents.map((agent) => agent.name)));
		const synthetic = createSyntheticSubagentTools(bag, {
			messages: turn?.before ?? messages,
			messagesFor: calls.messagesFor,
			childLoader: calls.childLoader,
			threadId,
			runId,
			...options.parentRunId !== void 0 && { interruptedRunId: options.parentRunId },
			...options.subagentRunId !== void 0 && { parentSubagentRunId: options.subagentRunId },
			...options.abortController && { abortSignal: options.abortController.signal },
			...turn && { turn },
			sink
		});
		yield* streamWithChildUsage(runChatEngine({
			...options,
			threadId,
			runId,
			...turn && { [CHILD_RESUME_IDS]: new Set(turn.children.flatMap((child) => child.resume.map((entry) => entry.interruptId))) },
			tools: [...options.tools ?? [], ...synthetic],
			middleware: [...options.middleware ?? [], calls.middleware]
		}, engineRef), sink);
		return;
	}
	yield* runChatEngine(options, engineRef);
}
/** Add child usage to the next RUN_FINISHED of the parent. */
async function* streamWithChildUsage(stream, sink) {
	for await (const chunk of stream) yield chunk.type === EventType.RUN_FINISHED ? withChildUsage(chunk, sink) : chunk;
}
async function* runRoutedSubagents(options, engineRef) {
	const bag = options.subagents;
	if (!bag?.router) {
		yield* runChatEngine(options, engineRef);
		return;
	}
	const threadId = options.threadId ?? `thread-${Date.now()}`;
	const runId = options.runId ?? `run-${Date.now()}`;
	const messages = options.messages ?? [];
	const turn = readSubagentTurn(messages, options.resume);
	if (!turn && (options.resume?.length ?? 0) > 0) {
		yield* runChatEngine({
			...options,
			threadId,
			runId,
			subagents: void 0
		}, engineRef);
		return;
	}
	const abortSignal = options.abortController?.signal;
	const turnMessages = turn?.before ?? messages;
	const subagentPersistence = readRoutedSubagentPersistence(options.middleware);
	await subagentPersistence?.start({
		threadId,
		runId,
		messages,
		...options.resume && { resume: options.resume }
	});
	try {
		const plan = savedPlan(turn?.plan, bag.agents, {
			threadId,
			interruptedRunId: options.parentRunId ?? runId,
			interruptIds: options.resume?.map((entry) => entry.interruptId) ?? []
		}) ?? normalizeRouterPick(await bag.router({
			messages: turnMessages,
			agents: bag.agents,
			...abortSignal && { abortSignal }
		}), bag.agents);
		if (abortSignal?.aborted) {
			const error = /* @__PURE__ */ new Error("Aborted");
			error.name = "AbortError";
			await subagentPersistence?.abort({
				threadId,
				runId,
				error
			});
			return;
		}
		const checked = await checkRoutedInputs(plan, bag.agents);
		const onlyStep = plan.steps.length === 1 ? plan.steps[0] : void 0;
		if (onlyStep?.names.length === 1 && onlyStep.names[0] === "main") {
			if (turn) await subagentPersistence?.finish({
				threadId,
				runId
			});
			yield* runChatEngine({
				...options,
				threadId,
				runId,
				subagents: void 0,
				...turn && { resume: turn.rest }
			}, engineRef);
			return;
		}
		yield {
			type: EventType.RUN_STARTED,
			threadId,
			runId,
			timestamp: Date.now()
		};
		const earlier = [...turn?.children ?? []];
		const takeEarlier = (name) => {
			const index = earlier.findIndex((child) => child.name === name);
			return index === -1 ? void 0 : earlier.splice(index, 1)[0];
		};
		const sink = createSubagentSink();
		const stepTexts = [];
		let stepMessages = turnMessages;
		let failure;
		for (const step of checked.steps) {
			const entries = [];
			const textByName = /* @__PURE__ */ new Map();
			for (const name of step.names) {
				const prior = takeEarlier(name);
				if (prior?.status === "finished") {
					textByName.set(name, prior.text);
					continue;
				}
				const input = step.inputs?.[name];
				entries.push({
					name,
					...input !== void 0 && { input },
					...prior?.status === "suspended" && { resume: {
						subagentRunId: prior.subagentRunId,
						messages: prior.messages,
						entries: prior.resume,
						text: prior.text
					} }
				});
			}
			const stepChunks = [];
			if (entries.length > 0) for await (const chunk of spawnNamedAgents(entries, {
				...bag,
				order: step.order ?? bag.order
			}, {
				messages: stepMessages,
				...abortSignal && { abortSignal },
				threadId,
				parentRunId: runId,
				...options.parentRunId !== void 0 && { interruptedRunId: options.parentRunId },
				...options.subagentRunId !== void 0 && { parentSubagentRunId: options.subagentRunId }
			}, sink)) {
				const tagged = withPlan(chunk, plan);
				stepChunks.push(tagged);
				await subagentPersistence?.chunk({
					threadId,
					runId,
					chunk: tagged
				});
				yield tagged;
			}
			failure = stepChunks.find((chunk) => chunk.type === EventType.SUBAGENT_ERROR);
			if (failure) break;
			if (sink.interrupts.length > 0) break;
			for (const entry of entries) {
				const text = collectNamedText(stepChunks, [entry.name]);
				textByName.set(entry.name, [entry.resume?.text, text].filter(Boolean).join("\n\n"));
			}
			const text = step.names.map((name) => textByName.get(name)?.trim() ?? "").filter((block) => block !== "").join("\n\n");
			if (text) {
				stepTexts.push(text);
				stepMessages = [...stepMessages, {
					role: "assistant",
					content: text
				}];
			}
		}
		if (abortSignal?.aborted) {
			const error = /* @__PURE__ */ new Error("Aborted");
			error.name = "AbortError";
			await subagentPersistence?.abort({
				threadId,
				runId,
				error
			});
			yield withChildUsage({
				type: EventType.RUN_FINISHED,
				threadId,
				runId,
				outcome: { type: "cancelled" },
				timestamp: Date.now()
			}, sink);
			return;
		}
		if (failure) {
			const message = failure.message || "A subagent failed";
			await subagentPersistence?.abort({
				threadId,
				runId,
				error: new Error(message)
			});
			yield withChildUsage({
				type: EventType.RUN_ERROR,
				threadId,
				runId,
				message,
				...failure.code !== void 0 ? { code: failure.code } : {},
				timestamp: Date.now()
			}, sink);
			return;
		}
		if (sink.interrupts.length > 0) {
			const interrupts = rebindInterrupts(sink.interrupts, runId);
			await subagentPersistence?.suspend?.({
				threadId,
				runId,
				interrupts
			});
			yield withChildUsage({
				type: EventType.RUN_FINISHED,
				threadId,
				runId,
				outcome: {
					type: "interrupt",
					interrupts
				},
				timestamp: Date.now()
			}, sink);
			return;
		}
		if ((bag.strategy ?? "exclusive") === "handoff") {
			const markedHosts = turnMessages.filter((message) => {
				const metadata = message.metadata;
				if (message.role !== "assistant" || metadata === null || typeof metadata !== "object" || !Object.hasOwn(metadata, "tanstack:subagentHost")) return false;
				const marker = Reflect.get(metadata, "tanstack:subagentHost");
				if (marker === null || typeof marker !== "object" || Array.isArray(marker) || Object.keys(marker).length !== 2 || !Object.hasOwn(marker, "version") || !Object.hasOwn(marker, "runId")) return false;
				const tanstack = Reflect.get(metadata, "tanstack");
				const genericRunId = tanstack !== null && typeof tanstack === "object" ? Reflect.get(tanstack, "runId") : void 0;
				return Reflect.get(marker, "version") === 1 && Reflect.get(marker, "runId") === runId && (genericRunId === void 0 || genericRunId === runId);
			});
			const existingHost = markedHosts.length === 1 ? markedHosts[0] : void 0;
			const hostBaseId = subagentHostMessageId(runId);
			let hostId = existingHost?.id ?? hostBaseId;
			for (let attempt = 1; turnMessages.some((message) => message !== existingHost && message.id === hostId); attempt++) hostId = hostBaseId + ":" + attempt;
			const childText = stepTexts.join("\n\n");
			await subagentPersistence?.finish({
				threadId,
				runId
			});
			yield* streamWithChildUsage(runChatEngine({
				...options,
				threadId,
				runId,
				subagents: void 0,
				...turn && { resume: turn.rest },
				messages: [...turnMessages.filter((message) => message !== existingHost), {
					id: hostId,
					role: "assistant",
					content: childText || "Subagent finished.",
					metadata: {
						...existingHost?.metadata,
						tanstack: {
							...existingHost?.metadata?.tanstack,
							runId
						},
						"tanstack:subagentHost": {
							version: 1,
							runId
						}
					}
				}]
			}, engineRef), sink);
			return;
		}
		await subagentPersistence?.finish({
			threadId,
			runId
		});
		yield withChildUsage({
			type: EventType.RUN_FINISHED,
			threadId,
			runId,
			timestamp: Date.now()
		}, sink);
	} catch (error) {
		await subagentPersistence?.abort({
			threadId,
			runId,
			error
		});
		throw error;
	}
}
/**
* The plan from a resumed turn, or undefined when it is absent. A plan that
* names agents this chat does not have is stale: re-routing would strand the
* suspended child that owns the answers, so fail the resume instead.
*/
function savedPlan(plan, agents, run) {
	if (typeof plan !== "object" || plan === null || !("steps" in plan)) return;
	try {
		return normalizeRouterPick({ steps: plan.steps.map((step) => ({
			names: step.names.map((name) => {
				const input = step.inputs?.[name];
				return input === void 0 ? name : {
					name,
					input
				};
			}),
			order: step.order
		})) }, agents);
	} catch (error) {
		throw new InterruptResumeValidationError([{
			scope: "batch",
			threadId: run.threadId,
			interruptedRunId: run.interruptedRunId,
			generation: 0,
			interruptIds: run.interruptIds,
			code: "stale",
			message: `The saved subagent plan does not match the agents of this chat. ${error instanceof Error ? error.message : String(error)}`,
			source: "server",
			retryable: false
		}]);
	}
}
/**
* Check the input of each picked agent that has `inputSchema`, and return the
* plan with the checked inputs. The saved plan keeps the raw inputs, so a
* resume checks the same values again.
*/
async function checkRoutedInputs(plan, agents) {
	const steps = [];
	for (const step of plan.steps) {
		const inputs = {};
		for (const name of step.names) {
			const schema = agents.find((agent) => agent.name === name)?.inputSchema;
			if (schema === void 0) continue;
			const input = step.inputs?.[name];
			if (input === void 0) throw new Error(`Agent "${name}" needs input. Return { name: '${name}', input } from the router.`);
			const result = await validateWithStandardSchema(schema, input);
			if (!result.success) {
				const issues = result.issues.map((issue) => issue.message).join(", ");
				throw new Error(`Input validation failed for agent ${name}: ${issues}`);
			}
			inputs[name] = result.data;
		}
		steps.push({
			...step,
			inputs
		});
	}
	return { steps };
}
/** Put the router plan on a direct child's SUBAGENT_STARTED metadata. */
function withPlan(chunk, plan) {
	if (chunk.type !== EventType.SUBAGENT_STARTED || chunk.parentSubagentRunId !== void 0) return chunk;
	return withTanstackMetadata(chunk, { [SUBAGENT_PLAN_KEY]: plan });
}
function readRoutedSubagentPersistence(middleware) {
	for (const item of middleware ?? []) if (item.routedSubagentPersistence) return item.routedSubagentPersistence;
}
/**
* Run non-streaming text - reads the whole run and returns a ChatResult.
* Runs the full agentic loop (if tools are provided) but returns the joined
* text plus every chunk the run produced.
*/
function runNonStreamingText(options) {
	const stream = runStreamingText({
		...options,
		stream: true
	});
	return streamToText(stream);
}
/**
* Run agentic structured output:
* 1. Execute the full agentic loop (with tools)
* 2. Once complete, call adapter.structuredOutput with the conversation context
* 3. Validate and return the structured result
*/
async function runAgenticStructuredOutput(options) {
	const { adapter, outputSchema, middleware, context, debug, mcp, ...textOptions } = options;
	const model = adapter.model;
	const logger = resolveDebugOption(debug);
	if (!outputSchema) throw new Error("outputSchema is required for structured output");
	const { jsonSchema, nullWideningMap } = convertSchemaForStructuredOutput(outputSchema);
	if (!jsonSchema) throw new Error("Failed to convert output schema to JSON Schema");
	const normalize = (data) => undoNullWidening(data, nullWideningMap);
	const validate = isStandardSchema(outputSchema) ? (data) => parseWithStandardSchema(outputSchema, data) : void 0;
	const nativeCombined = adapter.supportsCombinedToolsAndSchema?.(options.modelOptions) === true;
	const source = adapter.combinedStructuredOutputSource?.(options.modelOptions) ?? "text";
	const mcpManager = MCPManager.from(mcp);
	const mcpTools = await mcpManager.discover();
	if (mcpTools.length > 0) textOptions.tools = [...textOptions.tools ?? [], ...mcpTools];
	const engine = new TextEngine({
		adapter,
		params: {
			...textOptions,
			model,
			logger
		},
		middleware,
		context,
		finalStructuredOutput: {
			jsonSchema,
			yieldChunks: false,
			normalize,
			...validate ? { validate } : {},
			...nativeCombined ? { nativeCombined: true } : {},
			source
		}
	}, logger);
	try {
		for await (const _chunk of engine.run());
	} finally {
		await mcpManager.dispose();
	}
	const finalizationError = engine.getFinalizationError();
	if (finalizationError) {
		const err = new Error(finalizationError.message, finalizationError.cause !== void 0 ? { cause: finalizationError.cause } : void 0);
		if (finalizationError.code !== void 0) Object.defineProperty(err, "code", {
			value: finalizationError.code,
			enumerable: true
		});
		if (finalizationError.rawText !== void 0) Object.defineProperty(err, "rawText", {
			value: finalizationError.rawText,
			enumerable: true
		});
		throw err;
	}
	const validated = engine.getValidatedStructuredOutput();
	if (validated) return validated.value;
	const result = engine.getStructuredOutputResult();
	if (!result) throw new Error("structured output finalization produced no result");
	return result.data;
}
/**
* Parse the `value` payload of a `structured-output.complete` CUSTOM event
* into a typed shape, returning `null` if the runtime payload doesn't match.
*
* Uses an `unknown`-input runtime check rather than `as` casts so the engine
* stays cast-free in its hot path.
*/
function readCustomEventMessageId(value) {
	if (typeof value !== "object" || value === null) return void 0;
	if (!("messageId" in value)) return void 0;
	const messageId = value.messageId;
	return typeof messageId === "string" && messageId !== "" ? messageId : void 0;
}
function readStructuredOutputCompleteValue(value) {
	if (typeof value !== "object" || value === null) return null;
	if (!("object" in value) || !("raw" in value)) return null;
	const raw = value.raw;
	if (typeof raw !== "string") return null;
	const reasoningField = value.reasoning;
	const reasoning = typeof reasoningField === "string" ? reasoningField : void 0;
	return {
		object: value.object,
		raw,
		...reasoning !== void 0 ? { reasoning } : {}
	};
}
/**
* Synthesize a streaming structured-output stream by wrapping a non-streaming
* `structuredOutput` call. Used when an adapter doesn't implement
* `structuredOutputStream` natively.
*
* `onAdapterError`, when provided, is invoked with the raw error from
* `adapter.structuredOutput` before the synthesized RUN_ERROR is yielded.
* The engine uses this to preserve the original error (stack, cause, custom
* properties like provider `status`/`code`) as `finalizationError.cause`,
* because the RUN_ERROR wire shape only carries `message` and `code`.
*/
async function* fallbackStructuredOutputStream(adapter, options, onAdapterError) {
	const { chatOptions } = options;
	const fallbackRand = Math.random().toString(36).slice(2);
	const runId = chatOptions.runId ?? `fallback-${Date.now()}-${fallbackRand}`;
	const threadId = chatOptions.threadId ?? `fallback-${Date.now()}-${fallbackRand}`;
	const messageId = `fallback-${Date.now()}-${fallbackRand}`;
	const model = chatOptions.model;
	const startedAt = Date.now();
	yield {
		type: EventType.RUN_STARTED,
		runId,
		threadId,
		model,
		timestamp: startedAt
	};
	let result;
	try {
		result = await adapter.structuredOutput(options);
	} catch (error) {
		onAdapterError?.(error);
		const message = error instanceof Error ? error.message : String(error);
		yield {
			type: EventType.RUN_ERROR,
			runId,
			threadId,
			model,
			timestamp: Date.now(),
			message,
			error: { message }
		};
		return;
	}
	yield {
		type: EventType.TEXT_MESSAGE_START,
		messageId,
		role: "assistant",
		model,
		timestamp: Date.now()
	};
	yield {
		type: EventType.TEXT_MESSAGE_CONTENT,
		messageId,
		delta: result.rawText,
		model,
		timestamp: Date.now()
	};
	yield {
		type: EventType.TEXT_MESSAGE_END,
		messageId,
		model,
		timestamp: Date.now()
	};
	yield {
		type: EventType.CUSTOM,
		name: "structured-output.complete",
		value: {
			object: result.data,
			raw: result.rawText
		},
		model,
		timestamp: Date.now()
	};
	yield {
		type: EventType.RUN_FINISHED,
		runId,
		threadId,
		model: result.model ?? model,
		...result.responseId !== void 0 ? { responseId: result.responseId } : {},
		timestamp: Date.now(),
		finishReason: "stop",
		...result.usage ? { usage: result.usage } : {}
	};
}
/**
* Run streaming structured output via the TextEngine, with the engine's
* `finalStructuredOutput.yieldChunks: true` mode. The agent loop's
* RUN_STARTED/RUN_FINISHED are suppressed; the structured-output finalization
* step's pair brackets the run for the consumer.
*
* Standard Schema *validation* is intentionally NOT run on this path — it is
* the consumer's responsibility. This is a deliberate asymmetry vs.
* `runAgenticStructuredOutput` (Promise<T> path), which DOES validate inside
* the engine and routes validation failures through `onError`. The reason:
* streaming consumers typically render partial JSON progressively (via
* `parsePartialJSON` or `useChat`'s `partial` slot) and validate downstream
* after assembly. Running validation server-side would force a hard error
* on partial-by-design payloads. See `docs/structured-outputs/overview.md`.
*
* Null-widening normalization, however, IS run on both paths: the
* `structured-output.complete` CUSTOM event is forwarded with its `value.object`
* already un-widened (synthesized strict-mode nulls dropped, genuine
* `.nullable()` nulls kept), so a consumer validating the assembled object
* against the original schema doesn't choke on a `null` for an `.optional()`
* field. Same `convertSchemaForStructuredOutput` pass and same
* `undoNullWidening` map as the Promise<T> path — the two must not diverge.
*
* Pre-flight validation (missing schema, unconvertible schema) throws
* synchronously at call time rather than as a yielded RUN_ERROR mid-stream —
* those are programmer errors, not runtime conditions.
*/
function runStreamingStructuredOutput(options) {
	const { outputSchema } = options;
	if (!outputSchema) throw new Error("outputSchema is required for streaming structured output");
	const { jsonSchema, nullWideningMap } = convertSchemaForStructuredOutput(outputSchema);
	if (!jsonSchema) throw new Error("Failed to convert output schema to JSON Schema");
	const normalize = (data) => undoNullWidening(data, nullWideningMap);
	const engineRef = {};
	const stream = runStreamingStructuredOutputImpl(options, jsonSchema, normalize, engineRef);
	publishDeliverySeams(stream, engineRef);
	return stream;
}
async function* runStreamingStructuredOutputImpl(options, jsonSchema, normalize, engineRef) {
	const { adapter, outputSchema, middleware, context, debug, mcp, ...textOptions } = options;
	const model = adapter.model;
	const logger = resolveDebugOption(debug);
	const nativeCombined = adapter.supportsCombinedToolsAndSchema?.(options.modelOptions) === true;
	const source = adapter.combinedStructuredOutputSource?.(options.modelOptions) ?? "text";
	const mcpManager = MCPManager.from(mcp);
	const mcpTools = await mcpManager.discover();
	if (mcpTools.length > 0) textOptions.tools = [...textOptions.tools ?? [], ...mcpTools];
	const engine = new TextEngine({
		adapter,
		params: {
			...textOptions,
			model,
			logger
		},
		middleware,
		context,
		finalStructuredOutput: {
			jsonSchema,
			yieldChunks: true,
			normalize,
			...nativeCombined ? { nativeCombined: true } : {},
			source
		}
	}, logger);
	engineRef.current = engine;
	try {
		for await (const chunk of engine.run()) yield chunk;
	} finally {
		await mcpManager.dispose();
	}
}
//#endregion
export { chat, createChatOptions, kind };

//# sourceMappingURL=index.js.map