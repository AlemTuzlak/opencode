import { COMPACTION_RECORD_TYPE, compactionRecord, projectCompaction } from "./record.js";
import { USAGE_NAMESPACE, countFromUsage, hashMessages, memoryMetadata, sumUsage, toUsageCount } from "./usage-count.js";
import { conversationSummarizer, readSummary, splitDetails, summaryBody, summaryContent } from "./summarizer.js";
import { LogRecordsCapability, MetadataCapability, getLogRecords, getMetadata } from "@tanstack/ai";
//#region src/index.ts
/**
* `@tanstack/ai-compaction` — context-window compaction as a `chat()`
* middleware. `withCompaction({ maxTokens, strategy })` runs before each model
* call: when the working message set grows past `maxTokens`, the chosen
* `CompactionStrategy` rewrites the messages. Because it runs every call,
* compaction is incremental and rolling.
*
* Strategies are pluggable, mirroring `AgentLoopStrategy`. Three are built in:
* {@link evictOldest}, {@link summarizeOldest}, and {@link clearToolResults}.
* Write your own by passing any {@link CompactionStrategy}.
*
* The system prompt is never touched — `chat()` keeps it separate from
* `messages`.
*/
/** CUSTOM stream event: compaction is about to run. */
var COMPACTION_STARTED_EVENT = "compaction:started";
/** CUSTOM stream event: compaction result (counts and previews). */
var COMPACTION_STATE_EVENT = "compaction:state";
/** CUSTOM stream event: compaction finished. */
var COMPACTION_ENDED_EVENT = "compaction:ended";
var PREVIEW_CHARS = 4e3;
var MAX_PREVIEWS = 24;
/**
* The models whose native compaction failed, by adapter. They use the
* strategy for the rest of the process.
*/
var failedNative = /* @__PURE__ */ new WeakMap();
function emitCompactionStarted(ctx, value) {
	ctx.emitCustomEvent(COMPACTION_STARTED_EVENT, value);
}
function emitCompactionState(ctx, value) {
	ctx.emitCustomEvent(COMPACTION_STATE_EVENT, value);
}
function emitCompactionEnded(ctx, value) {
	ctx.emitCustomEvent(COMPACTION_ENDED_EVENT, value);
}
var strategyKeys = /* @__PURE__ */ new WeakMap();
var CHECKPOINT_NAMESPACE = "@tanstack/ai-compaction";
function identifyStrategy(strategy, key) {
	if (key) strategyKeys.set(strategy, key);
	return strategy;
}
function isModelMessage(value) {
	return typeof value === "object" && value !== null && "role" in value && (value.role === "user" || value.role === "assistant" || value.role === "tool") && "content" in value;
}
function isCompactionCheckpoint(value) {
	return typeof value === "object" && value !== null && "schemaVersion" in value && value.schemaVersion === 1 && "sourceMessageCount" in value && typeof value.sourceMessageCount === "number" && Number.isInteger(value.sourceMessageCount) && value.sourceMessageCount >= 0 && "sourceHash" in value && typeof value.sourceHash === "string" && "strategyKey" in value && typeof value.strategyKey === "string" && "compactedMessages" in value && Array.isArray(value.compactedMessages) && value.compactedMessages.every(isModelMessage);
}
/** The metadata namespace of a ready background summary. The key is the thread. */
var BACKGROUND_NAMESPACE = "@tanstack/ai-compaction:background";
/** The memory namespace of the run of the last call of each thread. */
var RUN_NAMESPACE = "@tanstack/ai-compaction:run";
function isBackgroundReady(value) {
	return typeof value === "object" && value !== null && "prefixHash" in value && typeof value.prefixHash === "string" && "record" in value && typeof value.record === "object" && value.record !== null && "type" in value.record && value.record.type === "tanstack.compaction" && "from" in value.record && typeof value.record.from === "number";
}
/** Wait for `job`. Throw the signal's reason when it aborts first. */
function abortable(job, signal) {
	if (!signal) return job;
	return new Promise((resolve, reject) => {
		const stop = () => reject(signal.reason);
		if (signal.aborted) {
			stop();
			return;
		}
		signal.addEventListener("abort", stop, { once: true });
		job.then(() => {
			signal.removeEventListener("abort", stop);
			resolve();
		});
	});
}
function messagePreviewText(message) {
	if (typeof message.content === "string") return message.content;
	return JSON.stringify(message.content ?? "");
}
function toMessagePreview(message, estimate) {
	const text = messagePreviewText(message);
	return {
		role: message.role,
		tokens: estimate(message),
		text: text.length > PREVIEW_CHARS ? `${text.slice(0, PREVIEW_CHARS)}…` : text
	};
}
function previewList(messages, estimate) {
	const mapped = messages.map((message) => toMessagePreview(message, estimate));
	if (mapped.length <= MAX_PREVIEWS) return mapped;
	return mapped.slice(0, MAX_PREVIEWS);
}
function droppedMessages(before, after) {
	const afterKeys = new Set(after.map((message) => JSON.stringify(message)));
	return before.filter((message) => !afterKeys.has(JSON.stringify(message)));
}
function compactionStateValue(args) {
	const value = {
		before: args.before,
		after: args.after,
		messagesBefore: args.messagesBefore,
		messagesAfter: args.messagesAfter,
		reusedCheckpoint: args.reusedCheckpoint,
		maxTokens: args.maxTokens,
		...args.strategyKey ? { strategyKey: args.strategyKey } : {}
	};
	if (args.afterMessages) value.result = previewList(args.afterMessages, args.estimate);
	if (args.beforeMessages && args.afterMessages) value.dropped = previewList(droppedMessages(args.beforeMessages, args.afterMessages), args.estimate);
	return value;
}
/** Rough token estimate for one message. Default: characters / 4. */
function estimateMessageTokens(message) {
	let text = messagePreviewText(message);
	if (message.toolCalls?.length) text += JSON.stringify(message.toolCalls);
	return Math.ceil(text.length / 4);
}
var sum = (messages, estimate) => messages.reduce((total, m) => total + estimate(m), 0);
/**
* Find the split point that keeps the most recent messages up to
* `keepRecentTokens`, then moves the cut forward past any leading tool result
* so the kept tail never starts with an orphan (its tool call would be dropped).
* Returns the index where the tail begins (head is `messages[0..cut)`).
*/
function splitAtRecent(messages, estimate, keepRecentTokens) {
	let kept = 0;
	let cut = messages.length;
	while (cut > 0) {
		const prev = messages[cut - 1];
		if (!prev) break;
		const size = estimate(prev);
		if (kept + size > keepRecentTokens) break;
		kept += size;
		cut--;
	}
	if (cut >= messages.length) cut = messages.length - 1;
	while (cut < messages.length && messages[cut]?.role === "tool") cut++;
	if (cut >= messages.length) {
		cut = messages.length;
		while (cut > 0 && messages[cut - 1]?.role === "tool") cut--;
		if (cut > 0) cut--;
	}
	return cut;
}
/**
* Drop the oldest messages and replace them with a short marker. Cheapest
* strategy — no extra model call. This is the default.
*/
function evictOldest(options = {}) {
	const strategy = (messages, ctx) => {
		const keep = options.keepRecentTokens ?? Math.floor(ctx.maxTokens / 2);
		const cut = splitAtRecent(messages, ctx.estimate, keep);
		if (cut <= 0) return null;
		return [{
			role: "user",
			content: options.marker?.(cut) ?? `[${cut} earlier message(s) omitted to save context.]`
		}, ...messages.slice(cut)];
	};
	return identifyStrategy(strategy, options.marker ? void 0 : `evict-oldest:${options.keepRecentTokens ?? "half"}`);
}
/**
* The start of the turn that holds index `cut`: its user message. When no
* user message comes after an earlier summary at index 0, the turn started
* before the summary. Then the cut is not a split turn: it returns `cut`, and
* one update call merges the messages into the summary.
*/
function turnStart(messages, cut) {
	let start = cut;
	while (start > 0 && messages[start]?.role !== "user") start -= 1;
	return start === 0 && readSummary(messages[0]) ? cut : start;
}
/**
* Drop the oldest messages and replace them with an LLM summary. Keeps the gist
* of old turns at the cost of one summarization call. Wire `summarize` to
* {@link conversationSummarizer}, `summarize()`, or any model call.
*
* When the messages start with an earlier summary, `summarize` gets its text
* as `previousSummary`, so it can merge the new messages into it.
*/
function summarizeOldest(options) {
	const strategy = async (messages, ctx) => {
		const keep = options.keepRecentTokens ?? Math.floor(ctx.maxTokens / 2);
		const cut = splitAtRecent(messages, ctx.estimate, keep);
		if (cut <= 0) return null;
		const controller = new AbortController();
		const stop = () => controller.abort(ctx.signal?.reason);
		if (ctx.signal?.aborted) stop();
		ctx.signal?.addEventListener("abort", stop, { once: true });
		const summarize = async (part, input) => {
			try {
				const result = await options.summarize(part, {
					...input,
					signal: controller.signal
				});
				const summary = typeof result === "string" ? result : result.summary;
				if (typeof result !== "string" && result.usage) ctx.addUsage(result.usage);
				if (summary.trim() === "") throw new Error("The summarizer returned an empty summary.");
				return summary;
			} catch (error) {
				controller.abort(error);
				throw error;
			}
		};
		const earlier = readSummary(messages[0]);
		const start = options.cut === "turn" && messages[cut]?.role !== "user" ? turnStart(messages, cut) : cut;
		const prefix = messages.slice(start, cut);
		const historyCall = start > 0 && !(earlier && start === 1 && prefix.length > 0);
		const previousDetails = earlier?.details !== void 0 ? { previousDetails: earlier.details } : {};
		const [history, turn] = await Promise.all([historyCall ? summarize(messages.slice(0, start), {
			...earlier ? { previousSummary: earlier.summary } : {},
			...previousDetails,
			...prefix.length > 0 ? { turnPrefixMessages: prefix } : {}
		}) : void 0, prefix.length > 0 ? summarize(prefix, {
			turnPrefix: true,
			...historyCall ? {} : {
				turnPrefixMessages: prefix,
				...previousDetails
			}
		}) : void 0]).finally(() => ctx.signal?.removeEventListener("abort", stop));
		let historyText = history;
		let turnText = turn;
		if (!historyCall && turn !== void 0) {
			const split = splitDetails(turn);
			historyText = summaryBody(earlier?.summary ?? "", split.details ?? earlier?.details);
			turnText = split.summary;
		}
		const body = [historyText, turnText === void 0 ? void 0 : `## Turn context\n\n${turnText}`].filter((part) => part !== void 0 && part !== "").join("\n\n");
		return [{
			role: options.summaryRole ?? "assistant",
			content: summaryContent(body)
		}, ...messages.slice(cut)];
	};
	return identifyStrategy(strategy, `summarize-oldest:${options.keepRecentTokens ?? "half"}:${options.summaryRole ?? "assistant"}${options.cut === "turn" ? ":turn" : ""}`);
}
/**
* Replace the content of old tool-result messages with a stub, keeping every
* message and its tool-call pairing in place. Best for agent loops where tool
* output (file reads, command output) dominates the token count — it clears the
* bulk without disturbing the conversation shape. No extra model call.
*/
function clearToolResults(options = {}) {
	const keepN = options.keepRecentToolResults ?? 3;
	const stub = options.stub ?? "[tool output cleared to save context]";
	const strategy = (messages) => {
		const toolIndexes = [];
		messages.forEach((m, i) => {
			if (m.role === "tool") toolIndexes.push(i);
		});
		if (toolIndexes.length <= keepN) return null;
		const clearBefore = toolIndexes[toolIndexes.length - keepN] ?? 0;
		let changed = false;
		const next = messages.map((m, i) => {
			if (m.role === "tool" && i < clearBefore && m.content !== stub) {
				changed = true;
				return {
					...m,
					content: stub
				};
			}
			return m;
		});
		return changed ? next : null;
	};
	return identifyStrategy(strategy, `clear-tool-results:${keepN}:${stub}`);
}
/**
* Run several strategies in order, escalating: stop as soon as the running
* estimate is back under `maxTokens`. Put the cheap, targeted strategy first
* (for example {@link clearToolResults}) and a broad fallback last (for example
* {@link evictOldest}) — the fallback only runs when clearing was not enough.
* A strategy that returns `null` (no change) is skipped and the next one runs.
*
* @example
* ```ts
* withCompaction({
*   maxTokens: 100_000,
*   strategy: composeStrategies(clearToolResults(), evictOldest()),
* })
* ```
*/
function composeStrategies(...strategies) {
	const strategy = async (messages, ctx) => {
		let current = messages;
		let result = null;
		for (const itemStrategy of strategies) {
			if (sum(current, ctx.estimate) <= ctx.maxTokens) break;
			const out = await itemStrategy(current, ctx);
			if (out) {
				current = out;
				result = out;
			}
		}
		return result;
	};
	const keys = strategies.map((item) => strategyKeys.get(item));
	return identifyStrategy(strategy, keys.every((key) => key !== void 0) ? keys.join("|") : void 0);
}
/**
* Context-compaction middleware. Add to `chat({ middleware: [...] })`.
*
* @example
* ```ts
* chat({
*   adapter,
*   messages,
*   middleware: [withCompaction({ maxTokens: 100_000 })], // evictOldest by default
* })
* ```
*/
function withCompaction(options) {
	const background = options.background;
	if (background && background.atTokens >= options.maxTokens) throw new Error("withCompaction: background.atTokens must be below maxTokens.");
	const estimate = options.estimateTokens ?? estimateMessageTokens;
	const configured = options.strategy ?? evictOldest();
	const native = options.native;
	const nativeCompact = native?.compact?.bind(native);
	/**
	* The strategy of a call: the adapter's `compact` when `native` has it.
	* When `compact` fails, the configured strategy runs, and `spent.error`
	* gets the failure. An adapter can get `compact` from a shared base and
	* point at a provider with no such endpoint.
	*/
	const strategyOf = (ctx, spent, config) => native && nativeCompact ? async (messages, compaction) => {
		if (failedNative.get(native)?.has(ctx.model)) return configured(messages, compaction);
		try {
			return await nativeCompact({
				messages: [...messages],
				model: ctx.model,
				...compaction.signal ? { signal: compaction.signal } : {},
				...config?.wrapFetch ? { wrapFetch: config.wrapFetch } : {},
				...config ? { systemPrompts: config.systemPrompts } : {},
				...config ? { tools: config.tools } : {}
			});
		} catch (error) {
			if (compaction.signal?.aborted) throw error;
			const models = failedNative.get(native) ?? /* @__PURE__ */ new Set();
			failedNative.set(native, models.add(ctx.model));
			spent.error = { message: error instanceof Error ? error.message : String(error) };
			return configured(messages, compaction);
		}
	} : configured;
	const strategyKey = options.strategyKey ?? (nativeCompact ? "native" : options.estimateTokens ? void 0 : strategyKeys.get(configured));
	const checkpointStrategyKey = strategyKey ? `${strategyKey}:maxTokens=${options.maxTokens}` : void 0;
	const countUsage = options.countTokens === "usage";
	const auto = options.auto !== false;
	const memory = memoryMetadata();
	const storeOf = (ctx) => {
		const shared = getMetadata(ctx, { optional: true });
		if (shared && checkpointStrategyKey) return shared;
		return countUsage ? memory : void 0;
	};
	const compactedViews = /* @__PURE__ */ new WeakMap();
	/** The threads whose next model call compacts. */
	const forced = /* @__PURE__ */ new Set();
	/** The running background summary of each thread. */
	const jobs = /* @__PURE__ */ new Map();
	/** Where a ready background summary waits: the metadata store, else memory. */
	const backgroundStore = (ctx) => getMetadata(ctx, { optional: true }) ?? memory;
	/**
	* Run the strategy on `snapshot`, apart from the run: the run's signal does
	* not stop it, and the model call does not wait for it. The result waits in
	* the store until the first model call of a later run applies it.
	*/
	function startBackground(ctx, snapshot, before, reusedCheckpoint, config) {
		const startedAt = Date.now();
		const store = backgroundStore(ctx);
		const strategyField = checkpointStrategyKey ? { strategyKey: checkpointStrategyKey } : {};
		emitCompactionStarted(ctx, {
			before,
			messagesBefore: snapshot.length,
			reusedCheckpoint,
			maxTokens: options.maxTokens,
			...strategyField,
			reason: "background"
		});
		const spent = {};
		const end = (error) => emitCompactionEnded(ctx, {
			after: before,
			messagesAfter: snapshot.length,
			reusedCheckpoint,
			maxTokens: options.maxTokens,
			durationMs: Date.now() - startedAt,
			...strategyField,
			reason: "background",
			...spent.usage ? { usage: spent.usage } : {},
			...error ? { error } : {}
		});
		const report = (error) => {
			end(error);
			try {
				options.onCompact?.({
					before,
					after: before,
					messagesBefore: snapshot.length,
					messagesAfter: snapshot.length,
					reason: "background",
					...spent.usage ? { usage: spent.usage } : {},
					error
				});
			} catch {}
		};
		const done = Promise.resolve().then(async () => {
			try {
				const next = await strategyOf(ctx, spent, config)(snapshot, {
					maxTokens: options.maxTokens,
					estimate,
					addUsage: (usage) => {
						spent.usage = sumUsage(spent.usage, usage);
					}
				});
				if (!next || next === snapshot) {
					end(spent.error);
					return;
				}
				const record = compactionRecord({
					reason: "background",
					before: snapshot,
					after: next,
					tokensBefore: before,
					tokensAfter: sum(next, estimate),
					...spent.usage ? { usage: spent.usage } : {}
				});
				const ready = {
					record,
					prefixHash: await hashMessages(snapshot.slice(0, record.from))
				};
				await store.set(BACKGROUND_NAMESPACE, ctx.threadId, ready);
				if (spent.error) report(spent.error);
			} catch (failure) {
				report({ message: failure instanceof Error ? failure.message : String(failure) });
			} finally {
				jobs.delete(ctx.threadId);
			}
		});
		jobs.set(ctx.threadId, done);
	}
	/**
	* After the last model call of a run on a durable host: compact when the
	* usage is over the context window, or over `maxTokens` with `auto` on, and
	* write the record. Custom events from `onFinish` do not reach the stream,
	* so only `onCompact` reports it.
	*/
	async function afterTurn(ctx) {
		const logRecords = getLogRecords(ctx, { optional: true });
		const store = storeOf(ctx);
		if (!logRecords || !store) return;
		const messages = [...ctx.messages];
		const spent = {};
		let tokens = 0;
		const info = (after, messagesAfter) => ({
			before: tokens,
			after,
			messagesBefore: messages.length,
			messagesAfter,
			reason: "after-turn",
			...spent.usage ? { usage: spent.usage } : {},
			...spent.error ? { error: spent.error } : {}
		});
		const fail = (error, done = info(tokens, messages.length)) => {
			try {
				options.onCompact?.({
					...done,
					error: { message: error instanceof Error ? error.message : String(error) }
				});
			} catch {}
		};
		let next;
		let tokensAfter;
		try {
			const counted = await countFromUsage(await store.get(USAGE_NAMESPACE, ctx.threadId), messages, estimate, compactedViews.get(ctx) === true);
			if (counted === void 0) return;
			tokens = counted;
			if (!(options.contextWindow !== void 0 && tokens > options.contextWindow) && !(auto && tokens > options.maxTokens)) return;
			next = await strategyOf(ctx, spent)(messages, {
				maxTokens: options.maxTokens,
				estimate,
				signal: ctx.signal,
				addUsage: (usage) => {
					spent.usage = sumUsage(spent.usage, usage);
				}
			});
			if (!next || next === messages || ctx.signal?.aborted) {
				if (spent.error) fail(spent.error.message);
				return;
			}
			tokensAfter = sum(next, estimate);
		} catch (error) {
			fail(error);
			return;
		}
		const record = compactionRecord({
			reason: "after-turn",
			before: messages,
			after: next,
			tokensBefore: tokens,
			tokensAfter,
			...spent.usage ? { usage: spent.usage } : {}
		});
		await logRecords.append([record]);
		const done = info(tokensAfter, next.length);
		try {
			await store.delete(USAGE_NAMESPACE, ctx.threadId);
			options.onCompact?.(done);
		} catch (error) {
			fail(error, done);
		}
	}
	return {
		name: "compaction",
		optionalRequires: options.durable ? [MetadataCapability, LogRecordsCapability] : [MetadataCapability],
		compactNext: (threadId) => {
			forced.add(threadId);
		},
		async onConfig(ctx, config) {
			if (ctx.phase === "init") return;
			const force = forced.delete(ctx.threadId);
			const reason = force ? "forced" : "threshold";
			const startedAt = Date.now();
			const { messages } = config;
			const inputMessages = config.providerMessages ?? messages;
			const store = storeOf(ctx);
			const logRecords = options.durable && inputMessages === messages ? getLogRecords(ctx, { optional: true }) : void 0;
			const metadata = logRecords ? void 0 : store;
			const checkpointKey = checkpointStrategyKey ?? "memory";
			let workingMessages = inputMessages;
			let reusedCheckpoint = false;
			if (metadata && inputMessages === messages) {
				const stored = await metadata.get(CHECKPOINT_NAMESPACE, ctx.threadId);
				if (isCompactionCheckpoint(stored) && stored.strategyKey === checkpointKey && stored.sourceMessageCount <= messages.length && stored.sourceHash === await hashMessages(messages.slice(0, stored.sourceMessageCount))) {
					workingMessages = [...stored.compactedMessages, ...messages.slice(stored.sourceMessageCount)];
					reusedCheckpoint = true;
				}
			}
			compactedViews.set(ctx, reusedCheckpoint);
			let before = (countUsage && store ? await countFromUsage(await store.get("@tanstack/ai-compaction:usage", ctx.threadId), messages, estimate, reusedCheckpoint) : void 0) ?? sum(workingMessages, estimate);
			/**
			* Give the model `next` in place of `from`, and keep it: the record on
			* a durable host, else the checkpoint. Returns the count of `next`.
			*/
			const commit = async (from, next, tokensBefore, why, usage, error) => {
				const info = {
					before: tokensBefore,
					after: sum(next, estimate),
					messagesBefore: from.length,
					messagesAfter: next.length,
					reason: why,
					...usage ? { usage } : {},
					...error ? { error } : {}
				};
				options.onCompact?.(info);
				emitCompactionState(ctx, compactionStateValue({
					before: info.before,
					after: info.after,
					messagesBefore: info.messagesBefore,
					messagesAfter: info.messagesAfter,
					reusedCheckpoint,
					maxTokens: options.maxTokens,
					strategyKey: checkpointStrategyKey,
					beforeMessages: from,
					afterMessages: next,
					estimate
				}));
				emitCompactionEnded(ctx, {
					after: info.after,
					messagesAfter: info.messagesAfter,
					reusedCheckpoint,
					maxTokens: options.maxTokens,
					durationMs: Date.now() - startedAt,
					...checkpointStrategyKey ? { strategyKey: checkpointStrategyKey } : {},
					reason: why,
					...usage ? { usage } : {},
					...error ? { error } : {}
				});
				if (countUsage) await store?.delete(USAGE_NAMESPACE, ctx.threadId);
				if (logRecords) {
					if (!ctx.signal?.aborted) await logRecords.append([compactionRecord({
						reason: why,
						before: from,
						after: next,
						tokensBefore,
						tokensAfter: info.after,
						...usage ? { usage } : {}
					})]);
				} else if (metadata && inputMessages === messages) {
					const checkpoint = {
						schemaVersion: 1,
						sourceMessageCount: messages.length,
						sourceHash: await hashMessages(messages),
						strategyKey: checkpointKey,
						compactedMessages: next
					};
					if (!ctx.signal?.aborted) await metadata.set(CHECKPOINT_NAMESPACE, ctx.threadId, checkpoint);
				}
				compactedViews.set(ctx, true);
				return info.after;
			};
			/**
			* Apply the ready background summary of the thread, or drop it when it
			* no longer fits: a newer compaction cut past its kept message, or,
			* without a kept id, the messages before the cut changed. Returns the
			* new list, or `undefined`.
			*/
			const applyReady = async () => {
				const readyStore = backgroundStore(ctx);
				const ready = await readyStore.get(BACKGROUND_NAMESPACE, ctx.threadId);
				if (!isBackgroundReady(ready)) return void 0;
				await readyStore.delete(BACKGROUND_NAMESPACE, ctx.threadId);
				const { record, prefixHash } = ready;
				const next = record.firstKeptId !== void 0 || record.from <= workingMessages.length && await hashMessages(workingMessages.slice(0, record.from)) === prefixHash ? projectCompaction({
					messages: workingMessages,
					record
				}) : void 0;
				if (next) {
					await commit(workingMessages, next, before, "background", record.usage);
					return next;
				}
				const usageField = record.usage ? { usage: record.usage } : {};
				options.onCompact?.({
					before,
					after: before,
					messagesBefore: workingMessages.length,
					messagesAfter: workingMessages.length,
					reason: "background",
					stale: true,
					...usageField
				});
				emitCompactionEnded(ctx, {
					after: before,
					messagesAfter: workingMessages.length,
					reusedCheckpoint,
					maxTokens: options.maxTokens,
					durationMs: Date.now() - startedAt,
					...checkpointStrategyKey ? { strategyKey: checkpointStrategyKey } : {},
					reason: "background",
					stale: true,
					...usageField
				});
			};
			let applied = false;
			if (background) {
				const firstCall = await memory.get(RUN_NAMESPACE, ctx.threadId) !== ctx.runId;
				if (firstCall) await memory.set(RUN_NAMESPACE, ctx.threadId, ctx.runId);
				const running = !force && auto && before > options.maxTokens ? jobs.get(ctx.threadId) : void 0;
				if (running) await abortable(running, ctx.signal);
				const checked = firstCall || running !== void 0;
				if (checked) {
					const next = await applyReady();
					if (next) {
						workingMessages = next;
						before = sum(next, estimate);
						applied = true;
					}
				}
				if (!force && auto && before > background.atTokens && before <= options.maxTokens && !jobs.has(ctx.threadId) && (checked || !isBackgroundReady(await backgroundStore(ctx).get(BACKGROUND_NAMESPACE, ctx.threadId)))) startBackground(ctx, [...workingMessages], before, reusedCheckpoint, config);
			}
			const startedValue = {
				before,
				messagesBefore: workingMessages.length,
				reusedCheckpoint,
				maxTokens: options.maxTokens,
				...checkpointStrategyKey ? { strategyKey: checkpointStrategyKey } : {},
				reason
			};
			if (!force && (!auto || before <= options.maxTokens)) {
				if (applied) return { providerMessages: workingMessages };
				if (reusedCheckpoint) {
					emitCompactionStarted(ctx, startedValue);
					emitCompactionState(ctx, compactionStateValue({
						before,
						after: before,
						messagesBefore: workingMessages.length,
						messagesAfter: workingMessages.length,
						reusedCheckpoint: true,
						maxTokens: options.maxTokens,
						strategyKey: checkpointStrategyKey,
						afterMessages: workingMessages,
						estimate
					}));
					emitCompactionEnded(ctx, {
						after: before,
						messagesAfter: workingMessages.length,
						reusedCheckpoint: true,
						maxTokens: options.maxTokens,
						durationMs: Date.now() - startedAt,
						...checkpointStrategyKey ? { strategyKey: checkpointStrategyKey } : {},
						reason
					});
					return { providerMessages: workingMessages };
				}
				return;
			}
			emitCompactionStarted(ctx, startedValue);
			const spent = {};
			let next;
			try {
				next = await strategyOf(ctx, spent, config)(workingMessages, {
					maxTokens: options.maxTokens,
					estimate,
					signal: ctx.signal,
					addUsage: (usage) => {
						spent.usage = sumUsage(spent.usage, usage);
					}
				});
			} catch (error) {
				emitCompactionEnded(ctx, {
					after: before,
					messagesAfter: workingMessages.length,
					reusedCheckpoint,
					maxTokens: options.maxTokens,
					durationMs: Date.now() - startedAt,
					...checkpointStrategyKey ? { strategyKey: checkpointStrategyKey } : {},
					reason,
					...spent.usage ? { usage: spent.usage } : {},
					error: { message: error instanceof Error ? error.message : String(error) }
				});
				if (!options.continueOnError || ctx.signal?.aborted) throw error;
				return reusedCheckpoint ? { providerMessages: workingMessages } : void 0;
			}
			if (!next || next === workingMessages) {
				emitCompactionEnded(ctx, {
					after: before,
					messagesAfter: workingMessages.length,
					reusedCheckpoint,
					maxTokens: options.maxTokens,
					durationMs: Date.now() - startedAt,
					...checkpointStrategyKey ? { strategyKey: checkpointStrategyKey } : {},
					reason,
					...spent.usage ? { usage: spent.usage } : {},
					...spent.error ? { error: spent.error } : {}
				});
				if (reusedCheckpoint) return { providerMessages: workingMessages };
				return;
			}
			await commit(workingMessages, next, before, reason, spent.usage, spent.error);
			return { providerMessages: next };
		},
		onUsage: countUsage ? async (ctx, usage) => {
			const saved = await toUsageCount(ctx.messages, usage, compactedViews.get(ctx) ?? false);
			if (!saved || ctx.signal?.aborted) return;
			await storeOf(ctx)?.set(USAGE_NAMESPACE, ctx.threadId, saved);
		} : void 0,
		onFinish: countUsage && options.durable ? (ctx) => afterTurn(ctx) : void 0
	};
}
//#endregion
export { COMPACTION_ENDED_EVENT, COMPACTION_RECORD_TYPE, COMPACTION_STARTED_EVENT, COMPACTION_STATE_EVENT, clearToolResults, composeStrategies, conversationSummarizer, estimateMessageTokens, evictOldest, projectCompaction, summarizeOldest, withCompaction };

//# sourceMappingURL=index.js.map