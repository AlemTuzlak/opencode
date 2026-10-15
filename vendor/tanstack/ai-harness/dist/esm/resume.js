import { isProviderExecutedToolCall, normalizeToolResult } from "@tanstack/ai";
//#region src/resume.ts
/** How often a running host renews its lease, and when a lease expires. */
var LEASE = {
	renewMs: 1e4,
	ttlMs: 3e4
};
/** The tool result a crash leaves for a tool that must not run twice. */
var INTERRUPTED_TOOL_RESULT = {
	interrupted: true,
	note: "The tool may or may not have run. Check before you retry."
};
/** The tool result of a call in an answer that stopped at the output limit. */
var TRUNCATED_TOOL_RESULT = "The answer was cut off at the output limit before this tool call was complete. The call did not run.";
/** The user message after an answer that a crash cut. */
var CUT_OFF_NOTE = "The previous answer was cut off. Continue exactly where it stopped, without repeating it.";
var errorText = (error) => error instanceof Error ? error.message : String(error);
/**
* Hold the lease on run `runId` and renew it. Returns the function that stops
* the renewal. A host that stops lets the lease expire, so recovery can tell
* the run is dead.
*/
async function holdRunLease(runs, runId, hostId, lease) {
	if (!runs) return () => {};
	const ttlMs = lease?.ttlMs ?? LEASE.ttlMs;
	const renew = () => runs.update(runId, {
		leaseOwner: hostId,
		leaseExpiresAt: Date.now() + ttlMs
	});
	await renew();
	const timer = setInterval(() => void renew(), lease?.renewMs ?? LEASE.renewMs);
	if (typeof timer === "object" && "unref" in timer) timer.unref();
	return () => clearInterval(timer);
}
/**
* Chat middleware that makes a turn resumable after a crash:
*
* - holds a lease on the run record and renews it while the turn runs;
* - saves the transcript before and after each tool phase;
* - records each tool call that started but has no result yet;
* - gives `onToolResult` the tool message of each call that ends.
*/
function checkpointMiddleware(options) {
	const { runs, messages, hostId, onToolResult } = options;
	const state = /* @__PURE__ */ new WeakMap();
	const saveCheckpoint = async (runId, pending) => {
		await runs?.update(runId, { checkpoint: {
			at: Date.now(),
			pendingTools: [...pending]
		} });
	};
	const stop = (ctx) => {
		state.get(ctx)?.stopLease();
		state.delete(ctx);
	};
	return {
		name: "harness:checkpoint",
		async onStart(ctx) {
			const stopLease = await holdRunLease(runs, ctx.runId, hostId, options.lease);
			state.set(ctx, {
				stopLease,
				pending: []
			});
		},
		async onBeforeToolCall(ctx, hook) {
			const entry = state.get(ctx);
			if (!entry) return;
			if (entry.pending.length === 0) await messages.saveThread(ctx.threadId, [...ctx.messages]);
			entry.pending.push({
				toolCallId: hook.toolCallId,
				name: hook.toolName,
				replay: hook.tool?.replay ?? "never"
			});
			await saveCheckpoint(ctx.runId, entry.pending);
			await options.onToolStart?.({
				toolCallId: hook.toolCallId,
				name: hook.toolName,
				replay: hook.tool?.replay ?? "never"
			});
		},
		async onAfterToolCall(ctx, info) {
			const entry = state.get(ctx);
			if (!entry) return;
			entry.pending = entry.pending.filter((tool) => tool.toolCallId !== info.toolCallId);
			if (!onToolResult) return;
			const message = info.ok ? {
				role: "tool",
				toolCallId: info.toolCallId,
				content: normalizeToolResult(info.result)
			} : {
				role: "tool",
				toolCallId: info.toolCallId,
				content: JSON.stringify({ error: errorText(info.error) }),
				error: errorText(info.error)
			};
			await onToolResult({
				toolCallId: info.toolCallId,
				message
			});
		},
		async onToolPhaseComplete(ctx) {
			const entry = state.get(ctx);
			if (!entry) return;
			await messages.saveThread(ctx.threadId, [...ctx.messages]);
			entry.pending = [];
			await saveCheckpoint(ctx.runId, []);
		},
		onFinish: (ctx) => stop(ctx),
		onAbort: (ctx) => stop(ctx),
		onError: (ctx) => stop(ctx)
	};
}
/** Chat and agent runs of this thread that a crashed host left `running`. */
async function findCrashedRuns(runs, threadId, now = Date.now()) {
	if (!runs?.listByThread) return [];
	return (await runs.listByThread(threadId)).filter((record) => record.status === "running" && (record.kind === void 0 || record.kind === "chat" || record.kind === "agent") && record.leaseExpiresAt !== void 0 && record.leaseExpiresAt < now);
}
/**
* What a repair of `history` adds for each tool call of the batch (the last
* assistant message with tool calls), in order:
*
* - A call in `finished` gets its finished tool message. It does not run
*   again.
* - A call of an answer that stopped at the output limit (finish reason
*   `length`) is closed as `truncated`. It never runs.
* - A pending call with `replay: 'never'` is closed as `interrupted`.
* - A pending call with `replay: 'safe'`, or a call that never started, gets
*   nothing, so the engine runs it.
*/
function repairSteps(history, pending, finished) {
	const answer = history.slice(history.findLastIndex((message) => message.role !== "assistant") + 1);
	const cut = new Map(answer.flatMap((message) => message.metadata?.tanstack?.finishReason === "length" ? (message.toolCalls ?? []).filter((call) => !isProviderExecutedToolCall(call)).map((call) => [call.id, call.function.name]) : []));
	const answered = new Set(history.flatMap((message) => message.role === "tool" && message.toolCallId ? [message.toolCallId] : []));
	const batch = history.findLast((message) => message.role === "assistant" && message.toolCalls?.length);
	const pendingById = new Map(pending.map((tool) => [tool.toolCallId, tool]));
	return [.../* @__PURE__ */ new Set([
		...cut.keys(),
		...(batch?.toolCalls ?? []).map((call) => call.id),
		...pending.map((tool) => tool.toolCallId)
	])].filter((toolCallId) => !answered.has(toolCallId)).flatMap((toolCallId) => {
		const result = finished?.get(toolCallId);
		if (result) return [result];
		const toolName = cut.get(toolCallId);
		if (toolName !== void 0) return [{
			toolCallId,
			toolName,
			reason: "truncated"
		}];
		const tool = pendingById.get(toolCallId);
		if (!tool || tool.replay === "safe") return [];
		return [{
			toolCallId,
			toolName: tool.name,
			reason: "interrupted"
		}];
	});
}
/**
* Prepare the transcript of a crashed thread for a new run, with the
* {@link repairSteps}. A `truncated` call gets `truncated`, else
* {@link TRUNCATED_TOOL_RESULT}, as a tool error. An `interrupted` call gets
* `interrupted`, else {@link INTERRUPTED_TOOL_RESULT}, as a tool error.
*/
async function repairTranscript(options) {
	const { messages, threadId, pending, finished, interrupted, truncated } = options;
	const history = await messages.loadThread(threadId);
	const added = repairSteps(history, pending, finished).map((step) => {
		if (!("reason" in step)) return step;
		const { toolCallId, toolName } = step;
		if (step.reason === "truncated") {
			const text = typeof truncated === "function" ? truncated({
				toolCallId,
				toolName
			}) : truncated ?? "The answer was cut off at the output limit before this tool call was complete. The call did not run.";
			return {
				role: "tool",
				toolCallId,
				content: text,
				error: text
			};
		}
		return {
			role: "tool",
			toolCallId,
			content: interrupted ?? JSON.stringify(INTERRUPTED_TOOL_RESULT),
			error: interrupted ?? INTERRUPTED_TOOL_RESULT.note
		};
	});
	if (added.length > 0) await messages.saveThread(threadId, [...history, ...added]);
}
//#endregion
export { CUT_OFF_NOTE, INTERRUPTED_TOOL_RESULT, LEASE, TRUNCATED_TOOL_RESULT, checkpointMiddleware, findCrashedRuns, holdRunLease, repairSteps, repairTranscript };

//# sourceMappingURL=resume.js.map