export * as TanStackEvents from "./events.js"

import { EventType } from "@tanstack/ai"
import type { StreamChunk } from "@tanstack/ai"
import { HARNESS_EVENTS } from "@tanstack/ai-harness"
import { Agent } from "@opencode/schema/agent"
import { Event } from "@opencode/schema/event"
import type { FileDiff } from "@opencode/schema/file-diff"
import { Form } from "@opencode/schema/form"
import type { FinishReason } from "@opencode/schema/llm"
import type { Location } from "@opencode/schema/location"
import type { Model } from "@opencode/schema/model"
import { Money } from "@opencode/schema/money"
import { Permission } from "@opencode/schema/permission"
import { RelativePath } from "@opencode/schema/schema"
import type { SessionError } from "@opencode/schema/session-error"
import { SessionEvent } from "@opencode/schema/session-event"
import { SessionID } from "@opencode/schema/session-id"
import type { SessionInbox } from "@opencode/schema/session-inbox"
import { SessionMessage } from "@opencode/schema/session-message"
import type { TokenUsage } from "@opencode/schema/token-usage"
import { Option, Schema } from "effect"
import { SessionUsage } from "../session/usage.js"
import { TanStackForm } from "./form-layer.js"
import { TanStackRecovery } from "./recovery.js"
import {
  executeToolCalls,
  isEditTool,
  permissionAction,
  toOpencodeInput,
  toOpencodeName,
  toOpencodeResult,
} from "./tool-names.js"
import type { ExecuteCall } from "./tool-names.js"

/**
 * The fields of one harness `SessionEvent` (`session.events()`) that the
 * mapper reads: the operation that sent it, and its AG-UI chunk.
 */
export type HarnessEvent = { readonly operationId: string; readonly event: StreamChunk }

/** Makes the opencode ids. Each call gives a new id, in ascending order, like the opencode `create` helpers. */
export interface Ids {
  readonly event: () => Event.ID
  readonly message: () => SessionMessage.ID
  readonly permission: () => Permission.ID
  readonly form: () => Form.ID
  readonly session: () => SessionID
}

/** The opencode id helpers. */
export const ids: Ids = {
  event: () => Event.ID.create(),
  message: () => SessionMessage.ID.create(),
  permission: () => Permission.ID.create(),
  form: () => Form.ID.create(),
  session: () => SessionID.create(),
}

/**
 * A saved pair of ids. `message`: a harness transcript message id and the
 * opencode `msg_` id. `session`: a harness `subagentRunId` and the child
 * `ses_` id. A revert to an opencode message needs these pairs, also after a
 * restart, so the caller saves them.
 */
export interface Link {
  readonly kind: "message" | "session"
  readonly harnessID: string
  readonly opencodeID: string
}

/** One opencode event to publish: `bus.publish(event.definition, event.data, event.options)`. */
export interface Published<D extends Event.Definition = Event.Definition> {
  readonly type: "publish"
  readonly definition: D
  readonly data: Event.Data<D>
  readonly options: { readonly id: Event.ID; readonly location?: Location.Ref }
}

/**
 * A subagent run started. Create the child session (it publishes
 * `session.created`) before you publish the events after this output.
 */
export interface ChildSession {
  readonly type: "child"
  readonly sessionID: SessionID
  readonly parentID: SessionID
  readonly agent: Agent.ID
  /** The `description` of the subagent tool call, as opencode titles a child session. */
  readonly title: string
}

export type Output = Published | ChildSession

export interface MapperOptions {
  readonly sessionID: SessionID
  /** The location of the session. Events that opencode publishes inside the location carry it. */
  readonly location: Location.Ref
  /** The agent and model of the next model call. Change them with `select`. */
  readonly agent: Agent.ID
  readonly model: Model.Ref
  /** The catalog prices of `model`. A step that the provider gives no cost costs what they say. Default: none. */
  readonly costs?: Model.Info["cost"]
  /** Default: {@link ids}. */
  readonly ids?: Ids
  /** Epoch milliseconds. Default: `Date.now`. */
  readonly clock?: () => number
  /** The saved links of this session, for example from SQLite. */
  readonly links?: ReadonlyArray<Link>
  /** Called with each new link. Save it. */
  readonly onLink?: (link: Link) => void
}

const STEP_INTERRUPTED = { type: "aborted", message: "Step interrupted" }
const TOOLS_INTERRUPTED = { type: "aborted", message: "Tool execution interrupted" }
const TURN_FAILED = { type: "unknown", message: "The turn failed." }
// The error of a call that the user rejected with no message, as opencode's runtime fails it.
const DECLINED = { type: "aborted", message: "The user declined this tool call" }

/** Why a turn was interrupted, as `session.execution.interrupted` names it. */
export type InterruptReason = Event.Data<typeof SessionEvent.Execution.Interrupted>["reason"]

/**
 * Turns the harness event stream of one session into opencode session events,
 * in the order the opencode projector needs.
 *
 * The mapper does no I/O. The session layer feeds it each harness event and
 * publishes what comes back, in order. It also tells the mapper what the
 * harness events do not carry:
 *
 * - `admit`: the opencode inbox item of an input, before the input goes to the harness.
 * - `fileChanged`: a file diff from the workspace backend, for the `files` of an edit.
 * - `select`: the agent and the model, when the user switches them.
 * - `link`: a pair of message ids that the transcript shows, for a revert.
 * - `compacting` and `compacted`: the inbox item of a manual compaction, and the summary of a compaction from
 *   the harness log.
 * - `interrupting`: the reason of the next cancel, when it is not the user.
 *
 * @example
 * ```ts
 * const mapper = createEventMapper({ sessionID, location, agent, model, onLink: save })
 * mapper.admit({ inboxID, item: { type: "user", payload: { text }, delivery: "steer" } })
 * session.prompt(text, { inputId: inboxID })
 * for await (const entry of session.events()) {
 *   for (const output of mapper.map(entry)) {
 *     if (output.type === "publish") yield* bus.publish(output.definition, output.data, output.options)
 *   }
 * }
 * ```
 */
export function createEventMapper(options: MapperOptions) {
  const make = options.ids ?? ids
  const clock = options.clock ?? Date.now
  const out: Output[] = []
  const inputs = new Map<string, Input>()
  const operations = new Map<string, Run>()
  const children = new Map<string, Child>()
  const asks = new Map<string, string>()
  const links = { message: new Map<string, string>(), session: new Map<string, string>() }
  const selection = { agent: options.agent, model: options.model, costs: options.costs ?? [] }
  /** The compaction of each operation, from its `compaction:started` to its `compaction:ended`. */
  const compactions = new Map<string, Compaction>()
  /** The inbox item of the manual compaction that waits for the next model call. */
  const manual: { inboxID: SessionMessage.ID | undefined } = { inboxID: undefined }
  /** The reason of the next cancel of a turn. The harness cancel names no reason. */
  const cancel: { reason: InterruptReason } = { reason: "user" }
  for (const link of options.links ?? []) links[link.kind].set(link.harnessID, link.opencodeID)

  const emit = <D extends Event.Definition>(definition: D, data: Event.Data<D>) =>
    out.push({ type: "publish", definition, data, options: { id: make.event(), location: options.location } })
  // opencode publishes these outside the location: the prompt admission and the execution lifecycle.
  const emitOutside = <D extends Event.Definition>(definition: D, data: Event.Data<D>) =>
    out.push({ type: "publish", definition, data, options: { id: make.event() } })

  const remember = (kind: Link["kind"], harnessID: string, opencodeID: string) => {
    if (links[kind].has(harnessID)) return
    links[kind].set(harnessID, opencodeID)
    options.onLink?.({ kind, harnessID, opencodeID })
  }

  const parentRun = (operationId: string) => {
    const existing = operations.get(operationId)
    if (existing) return existing
    const run: Run = {
      sessionID: options.sessionID,
      agent: selection.agent,
      executing: false,
      step: undefined,
      error: undefined,
    }
    operations.set(operationId, run)
    return run
  }

  /** The run of a chunk: a subagent run when the chunk names one, else the operation. */
  const runOf = (entry: HarnessEvent) => {
    const runID = Option.getOrUndefined(decodeSubagentChunk(entry.event))?.subagentRunId
    const child = runID === undefined ? undefined : children.get(runID)
    return child ?? parentRun(entry.operationId)
  }

  const startExecution = (run: Run) => {
    if (run.executing) return
    run.executing = true
    emitOutside(SessionEvent.Execution.Started, { sessionID: run.sessionID })
  }

  const startStep = (run: Run) => {
    const step: Step = {
      messageID: make.message(),
      streamed: false,
      texts: new Map(),
      reasoning: new Map(),
      nextText: 0,
      nextReasoning: 0,
      calls: new Map(),
      finish: undefined,
      tokens: undefined,
      cost: 0,
      costs: selection.costs,
      retrying: false,
    }
    run.step = step
    emit(SessionEvent.Step.Started, {
      sessionID: run.sessionID,
      agent: run.agent,
      model: selection.model,
      assistantMessageID: step.messageID,
      started: clock(),
    })
    return step
  }

  /**
   * The step of a model chunk. A model call starts a new step: the harness
   * sends `RUN_STARTED` only for the first call of a `chat()` loop, so the
   * first model chunk after the end of a model stream opens the next step.
   */
  const modelStep = (run: Run) => {
    const step = run.step
    if (step === undefined) return startStep(run)
    if (!step.streamed) return step
    if (step.retrying) {
      step.retrying = false
      step.streamed = false
      return step
    }
    endStep(run, step)
    return startStep(run)
  }

  /** The end of the model stream: no more text, reasoning, or tool input comes for this step. */
  const streamed = (run: Run) => {
    const step = run.step
    if (step === undefined || step.streamed) return
    closeParts(run, step)
    step.streamed = true
    emit(SessionEvent.Step.Streamed, { sessionID: run.sessionID, assistantMessageID: step.messageID })
  }

  const closeParts = (run: Run, step: Step) => {
    for (const part of step.texts.values()) endPart(run, step, part, SessionEvent.Text.Ended)
    for (const part of step.reasoning.values()) endPart(run, step, part, SessionEvent.Reasoning.Ended)
    step.texts.clear()
    step.reasoning.clear()
  }

  const endPart = (
    run: Run,
    step: Step,
    part: Part,
    definition: typeof SessionEvent.Text.Ended | typeof SessionEvent.Reasoning.Ended,
  ) =>
    emit(definition, {
      sessionID: run.sessionID,
      assistantMessageID: step.messageID,
      ordinal: part.ordinal,
      text: part.text,
    })

  const endStep = (run: Run, step: Step) => {
    streamed(run)
    run.step = undefined
    const hasCalls = step.calls.size > 0
    emit(SessionEvent.Step.Ended, {
      sessionID: run.sessionID,
      assistantMessageID: step.messageID,
      // A subagent's model calls send no RUN_FINISHED, so its finish comes from the step.
      finish: step.finish ?? (hasCalls ? "tool-calls" : "stop"),
      cost: Money.USD.make(step.cost),
      tokens: step.tokens ?? noTokens(),
      files: changedFiles(step),
    })
  }

  const failStep = (run: Run, step: Step, error: SessionError.Error) => {
    streamed(run)
    run.step = undefined
    for (const [id, call] of step.calls) {
      if (call.settled) continue
      call.settled = true
      emit(SessionEvent.Tool.Failed, {
        sessionID: run.sessionID,
        assistantMessageID: step.messageID,
        id,
        error: TOOLS_INTERRUPTED,
        executed: false,
      })
    }
    // opencode gives a failed step its usage when its model call finished, for example before a declined tool.
    const isFinished = step.finish !== undefined
    emit(SessionEvent.Step.Failed, {
      sessionID: run.sessionID,
      assistantMessageID: step.messageID,
      error,
      ...(isFinished ? { cost: Money.USD.make(step.cost), tokens: step.tokens ?? noTokens() } : {}),
      files: changedFiles(step),
    })
  }

  /** End a run: its open step, then its execution. */
  const finishRun = (run: Run, status: FinishedStatus) => {
    const step = run.step
    run.executing = false
    switch (status) {
      case "cancelled":
        if (step) failStep(run, step, STEP_INTERRUPTED)
        return emitOutside(SessionEvent.Execution.Interrupted, { sessionID: run.sessionID, reason: cancel.reason })
      case "failed": {
        const error = run.error ?? TURN_FAILED
        if (step) failStep(run, step, error)
        return emitOutside(SessionEvent.Execution.Failed, { sessionID: run.sessionID, error })
      }
      // `interrupted`: the turn waits for a resolve, which runs as a new operation.
      case "completed":
      case "interrupted":
        if (step) endStep(run, step)
        return emitOutside(SessionEvent.Execution.Succeeded, { sessionID: run.sessionID })
    }
  }

  /** The unsettled call that a question or a file change belongs to, newest first. */
  const findCall = (matches: (call: Call) => boolean) => {
    const runs = [...operations.values(), ...children.values()].toReversed()
    for (const run of runs) {
      const calls = [...(run.step?.calls ?? new Map<string, Call>())].toReversed()
      const found = calls.find(([, call]) => !call.settled && matches(call))
      if (found && run.step) return { run, step: run.step, id: found[0], call: found[1] }
    }
    return undefined
  }

  const onCustom = (entry: HarnessEvent, name: string, value: unknown) => {
    switch (name) {
      case HARNESS_EVENTS.inputAccepted:
        return onInputAccepted(value)
      case HARNESS_EVENTS.inputApplied:
        return onInputApplied(value)
      case HARNESS_EVENTS.operationStarted:
        return onOperationStarted(value)
      case HARNESS_EVENTS.operationFinished:
        return onOperationFinished(value)
      case HARNESS_EVENTS.inputSettled:
        return onInputSettled(value)
      case HARNESS_EVENTS.inputRejected:
        return onInputRejected(value)
      case HARNESS_EVENTS.inputDelivery:
        return onInputDelivery(value)
      case HARNESS_EVENTS.question:
        return onQuestion(entry, value)
      case HARNESS_EVENTS.usage:
        return onUsage(entry, value)
      case HARNESS_EVENTS.turnRetry:
        return onRetry(entry, value)
      case HARNESS_EVENTS.revert:
        return onRevert(value)
      case "compaction:started":
        return onCompactionStarted(entry, value)
      case "compaction:state":
        return onCompactionState(entry)
      case "compaction:ended":
        return onCompactionEnded(entry, value)
      default:
        return onToolEvent(entry, name, value)
    }
  }

  const onInputAccepted = (value: unknown) => {
    const accepted = Option.getOrUndefined(decodeInputID(value))
    const input = accepted === undefined ? undefined : inputs.get(accepted.inputId)
    if (input === undefined || input.state !== "admitted") return
    input.state = "enqueued"
    emitOutside(SessionEvent.InboxEnqueued, { sessionID: options.sessionID, inboxID: input.inboxID, item: input.item })
  }

  const onInputApplied = (value: unknown) => {
    const applied = Option.getOrUndefined(decodeApplied(value))
    // An answer to a question applies to the session, not to a turn.
    if (applied === undefined || applied.operationId === "session") return
    const input = inputs.get(applied.inputId)
    if (input === undefined || input.state !== "enqueued") return
    const run = parentRun(applied.operationId)
    startExecution(run)
    // A steer joins at the next model call, after the step before it ended.
    if (run.step?.streamed) endStep(run, run.step)
    input.state = "delivered"
    emit(SessionEvent.InboxDelivered, { sessionID: options.sessionID, inboxID: input.inboxID })
  }

  const onOperationStarted = (value: unknown) => {
    const started = Option.getOrUndefined(decodeOperationStarted(value))
    if (started === undefined || started.kind !== "chat") return
    startExecution(parentRun(started.operationId))
  }

  const onOperationFinished = (value: unknown) => {
    const finished = Option.getOrUndefined(decodeOperationFinished(value))
    const run = finished === undefined ? undefined : operations.get(finished.operationId)
    if (finished === undefined || run === undefined || !run.executing) return
    // A cancel or a failure stops the subagents of the turn. A background subagent outlives a completed turn.
    const stopped = finished.status === "cancelled" || finished.status === "failed"
    const open = [...children.values()].filter((child) => child.operationId === finished.operationId && child.executing)
    if (stopped) for (const child of open) finishRun(child, finished.status)
    finishRun(run, finished.status)
    operations.delete(finished.operationId)
    if (finished.status === "cancelled") cancel.reason = "user"
  }

  // An input that waited and never ran: `cancelInput`, or a cancel before it joined.
  const cancelWaiting = (inputId: string) => {
    const input = inputs.get(inputId)
    if (input === undefined || input.state !== "enqueued") return
    input.state = "done"
    emitOutside(SessionEvent.InboxCancelled, { sessionID: options.sessionID, inboxID: input.inboxID })
  }

  const onInputSettled = (value: unknown) => {
    const settled = Option.getOrUndefined(decodeSettled(value))
    if (settled === undefined) return
    if (settled.outcome === "aborted") cancelWaiting(settled.inputId)
    const input = inputs.get(settled.inputId)
    if (input?.state === "delivered") input.state = "done"
  }

  const onInputRejected = (value: unknown) => {
    const rejected = Option.getOrUndefined(decodeInputID(value))
    if (rejected !== undefined) cancelWaiting(rejected.inputId)
  }

  const onInputDelivery = (value: unknown) => {
    const moved = Option.getOrUndefined(decodeDelivery(value))
    const input = moved === undefined ? undefined : inputs.get(moved.inputId)
    if (moved === undefined || input === undefined || input.state !== "enqueued") return
    emit(SessionEvent.InboxDeliveryChanged, {
      sessionID: options.sessionID,
      inboxID: input.inboxID,
      delivery: moved.delivery,
    })
  }

  const onQuestion = (entry: HarnessEvent, value: unknown) => {
    const question = Option.getOrUndefined(decodeQuestion(value))
    if (question === undefined) return
    if (isPermissionQuestion(question.schema)) return askPermission(entry, question)
    return askForm(entry, question)
  }

  const askPermission = (entry: HarnessEvent, question: Question) => {
    // The permissions plugin asks "Allow <tool> <input>?", with the input as JSON cut at 300
    // characters. The question names no tool call, so match the call by its name and that exact
    // input. A match by name only could show the user the resources of another call.
    const asked = /^Allow (\S+) ([\s\S]*)\?(?: Answer once, always, or reject\.)?$/.exec(question.message)
    const tool = asked?.[1]
    const found = asked
      ? findCall((call) => call.name === asked[1] && JSON.stringify(call.input).slice(0, 300) === asked[2])
      : undefined
    const run = found?.run ?? parentRun(entry.operationId)
    streamed(run)
    const id = make.permission()
    asks.set(id, question.questionId)
    const resources = found ? resourcesOf(found.call) : []
    emit(Permission.Event.Asked, {
      id,
      sessionID: run.sessionID,
      action: tool === undefined ? "unknown" : permissionAction(tool),
      resources,
      save: tool !== undefined && isEditTool(tool) ? ["*"] : resources,
      ...(found ? { source: { type: "tool" as const, messageID: found.step.messageID, id: found.id } } : {}),
    })
  }

  const askForm = (entry: HarnessEvent, question: Question) => {
    const found = findCall((call) => call.name === "question")
    const run = found?.run ?? parentRun(entry.operationId)
    streamed(run)
    const id = make.form()
    asks.set(id, question.questionId)
    const index = found ? found.call.asked++ : 0
    const asked = found ? Option.getOrUndefined(decodeQuestions(found.call.input))?.questions[index] : undefined
    // A question that no `question` tool call asks, for example from a plugin: its form comes from its JSON Schema
    // and its `url`.
    const form = asked ? undefined : TanStackForm.questionForm(question)
    const [first, ...rest] = asked ? [questionField(index, asked)] : (form?.fields ?? [])
    // A JSON Schema object with no properties gives no field. Then the form asks for one answer.
    const fields: Form.Info["fields"] = first === undefined ? [answerField(question.message)] : [first, ...rest]
    emit(Form.Event.Created, {
      form: {
        id,
        sessionID: run.sessionID,
        title: form?.title ?? "Questions",
        ...(found ? { metadata: { kind: "question", tool: { messageID: found.step.messageID, id: found.id } } } : {}),
        fields,
      },
    })
  }

  const onUsage = (entry: HarnessEvent, value: unknown) => {
    const usage = Option.getOrUndefined(decodeUsage(value))?.usage
    const run = parentRun(entry.operationId)
    const step = run.step
    streamed(run)
    // The first usage of a step is its own model call. A subagent's calls report on the parent too.
    if (usage === undefined || step === undefined || step.tokens !== undefined) return
    step.tokens = tokensOf(usage.promptTokens, usage.completionTokens, 0, usage.cachedTokens, usage.cacheWriteTokens)
    step.cost = usage.cost ?? SessionUsage.calculateCost(step.costs, step.tokens)
  }

  const onRetry = (entry: HarnessEvent, value: unknown) => {
    const retry = Option.getOrUndefined(decodeRetry(value))
    const run = parentRun(entry.operationId)
    const step = run.step
    if (retry === undefined || step === undefined) return
    step.retrying = true
    run.error = undefined
    emit(SessionEvent.RetryScheduled, {
      sessionID: run.sessionID,
      assistantMessageID: step.messageID,
      attempt: Math.max(1, retry.retries),
      at: clock(),
      error: { type: "provider.unknown", message: errorMessage(retry.error) },
    })
  }

  const onRevert = (value: unknown) => {
    const revert = Option.getOrUndefined(decodeRevert(value))
    if (revert === undefined) return
    if (revert.messageId === null) return emit(SessionEvent.RevertEvent.Cleared, { sessionID: options.sessionID })
    const messageID = links.message.get(revert.messageId)
    // Without a link, no opencode message matches the harness message.
    if (messageID === undefined) return
    emit(SessionEvent.RevertEvent.Staged, {
      sessionID: options.sessionID,
      revert: { messageID: SessionMessage.ID.make(messageID) },
    })
  }

  const onCompactionStarted = (entry: HarnessEvent, value: unknown) => {
    const started = Option.getOrUndefined(decodeCompaction(value))
    // Only `compactNext` forces a compaction, and only `Session.compact` calls it.
    const isManual = started?.reason === "forced"
    const inboxID = isManual ? manual.inboxID : undefined
    if (isManual) manual.inboxID = undefined
    compactions.set(entry.operationId, {
      reason: isManual ? "manual" : "auto",
      inboxID,
      recorded: false,
      summary: undefined,
    })
  }

  // The middleware sends its state only when it replaced the messages and wrote the log record.
  const onCompactionState = (entry: HarnessEvent) => {
    const compaction = compactions.get(entry.operationId)
    if (compaction) compaction.recorded = true
  }

  // The end event has no summary text, and opencode's `compaction.ended` needs it. The session layer reads it
  // from the log record and gives it with `compacted`. All events of a compaction go out at its end.
  const onCompactionEnded = (entry: HarnessEvent, value: unknown) => {
    const ended = Option.getOrUndefined(decodeCompaction(value))
    const compaction = compactions.get(entry.operationId) ?? {
      reason: "auto",
      inboxID: undefined,
      recorded: false,
      summary: undefined,
    }
    compactions.delete(entry.operationId)
    const spent = Option.getOrUndefined(decodeTokenUsage(ended?.usage))
    const usage = spent && {
      tokens: tokensOf(
        spent.promptTokens,
        spent.completionTokens,
        spent.completionTokensDetails?.reasoningTokens ?? 0,
        spent.promptTokensDetails?.cachedTokens ?? 0,
        spent.promptTokensDetails?.cacheWriteTokens ?? 0,
      ),
      cost: Money.USD.make(spent.cost ?? 0),
    }
    if (ended?.error !== undefined)
      return failCompaction(compaction, { type: "compaction", message: ended.error.message }, usage)
    if (compaction.summary !== undefined) return completeCompaction(compaction, compaction.summary, usage)
    // The strategy found nothing to cut. The old runtime fails a manual compaction with this error.
    if (!compaction.recorded && compaction.reason === "manual") return failCompaction(compaction, NOTHING_TO_COMPACT, usage)
    // No summary came: only the inbox item settles.
    deliverCompaction(compaction)
  }

  const deliverCompaction = (compaction: Compaction) => {
    if (compaction.inboxID === undefined) return
    emit(SessionEvent.InboxDelivered, { sessionID: options.sessionID, inboxID: compaction.inboxID })
  }

  const startCompaction = (compaction: Compaction, usage: CompactionUsage | undefined) => {
    deliverCompaction(compaction)
    emit(SessionEvent.Compaction.Started, {
      sessionID: options.sessionID,
      reason: compaction.reason,
      recent: "",
      ...(compaction.inboxID === undefined ? {} : { inputID: compaction.inboxID }),
    })
    return usage ?? { tokens: noTokens(), cost: Money.USD.zero }
  }

  const recordUsage = (usage: CompactionUsage | undefined) => {
    if (usage === undefined) return
    emit(SessionEvent.UsageRecorded, { sessionID: options.sessionID, source: "compaction", ...usage })
  }

  const failCompaction = (
    compaction: Compaction,
    error: SessionError.Error,
    usage: CompactionUsage | undefined,
  ) => {
    const spent = startCompaction(compaction, usage)
    recordUsage(usage)
    emit(SessionEvent.Compaction.Failed, {
      sessionID: options.sessionID,
      reason: compaction.reason,
      error,
      ...(compaction.inboxID === undefined ? {} : { inputID: compaction.inboxID }),
      ...spent,
    })
  }

  const completeCompaction = (compaction: Compaction, summary: Summary, usage: CompactionUsage | undefined) => {
    const spent = startCompaction(compaction, usage)
    emit(SessionEvent.Compaction.Delta, { sessionID: options.sessionID, text: summary.text })
    recordUsage(usage)
    // The harness keeps the recent messages as messages, so no recent text goes with the summary.
    emit(SessionEvent.Compaction.Ended, {
      sessionID: options.sessionID,
      reason: compaction.reason,
      model: summary.model,
      text: summary.text,
      recent: "",
      ...spent,
    })
  }

  /** A `CUSTOM` chunk that a running tool sent with `emitCustomEvent`. */
  const onToolEvent = (entry: HarnessEvent, name: string, value: unknown) => {
    const toolCallId = Option.getOrUndefined(decodeToolEvent(value))?.toolCallId
    const run = runOf(entry)
    const call = toolCallId === undefined ? undefined : run.step?.calls.get(toolCallId)
    if (toolCallId === undefined || call === undefined || call.settled || run.step === undefined) return
    streamed(run)
    const rows = executeToolCalls(call.rows, { name, value })
    // Code Mode events update the `execute` rows. Other tools send their own metadata.
    const isCodeMode = name.startsWith("code_mode:")
    if (isCodeMode && rows === call.rows) return
    call.rows = rows
    const metadata = isCodeMode ? { toolCalls: rows } : progressMetadata(value)
    emit(SessionEvent.Tool.Progress, {
      sessionID: run.sessionID,
      assistantMessageID: run.step.messageID,
      id: toolCallId,
      metadata,
    })
  }

  const onText = (
    entry: HarnessEvent,
    kind: "text" | "reasoning",
    messageId: string,
    phase: "start" | "delta" | "end",
    delta = "",
  ) => {
    const run = runOf(entry)
    const step = phase === "start" ? modelStep(run) : run.step
    if (step === undefined) return
    const parts = kind === "text" ? step.texts : step.reasoning
    const events = kind === "text" ? SessionEvent.Text : SessionEvent.Reasoning
    if (phase === "start") {
      const ordinal = kind === "text" ? step.nextText++ : step.nextReasoning++
      parts.set(messageId, { ordinal, text: "" })
      remember("message", messageId, step.messageID)
      return emit(events.Started, { sessionID: run.sessionID, assistantMessageID: step.messageID, ordinal })
    }
    const part = parts.get(messageId)
    if (part === undefined) return
    if (phase === "delta") {
      part.text += delta
      return emit(events.Delta, {
        sessionID: run.sessionID,
        assistantMessageID: step.messageID,
        ordinal: part.ordinal,
        delta,
      })
    }
    parts.delete(messageId)
    endPart(run, step, part, events.Ended)
  }

  const onToolStart = (entry: HarnessEvent, id: string, name: string) => {
    const run = runOf(entry)
    const step = modelStep(run)
    step.calls.set(id, { name, args: "", input: {}, settled: false, rows: [], diffs: [], asked: 0 })
    emit(SessionEvent.Tool.Input.Started, {
      sessionID: run.sessionID,
      assistantMessageID: step.messageID,
      id,
      name: toOpencodeName(name),
    })
  }

  const onToolEnd = (entry: HarnessEvent, id: string, input: unknown) => {
    const run = runOf(entry)
    const step = run.step
    const call = step?.calls.get(id)
    if (step === undefined || call === undefined) return
    call.input = Option.getOrUndefined(decodeInput(input)) ?? Option.getOrUndefined(decodeArgs(call.args)) ?? {}
    // opencode sends the raw input once, at the end. It never sends `tool.input.delta`.
    emit(SessionEvent.Tool.Input.Ended, {
      sessionID: run.sessionID,
      assistantMessageID: step.messageID,
      id,
      text: call.args,
    })
    emit(SessionEvent.Tool.Called, {
      sessionID: run.sessionID,
      assistantMessageID: step.messageID,
      id,
      input: toOpencodeInput(call.name, call.input),
      executed: false,
    })
  }

  const onToolResult = (entry: HarnessEvent, chunk: { toolCallId: string; messageId: string; content: unknown }) => {
    const run = runOf(entry)
    const step = run.step
    const call = step?.calls.get(chunk.toolCallId)
    if (step === undefined || call === undefined || call.settled) return
    streamed(run)
    call.settled = true
    remember("message", chunk.messageId, step.messageID)
    // The harness gives a declined call a normal result. opencode fails it, and the session layer ends the turn.
    if (TanStackRecovery.isDeclined(entry.event))
      return emit(SessionEvent.Tool.Failed, {
        sessionID: run.sessionID,
        assistantMessageID: step.messageID,
        id: chunk.toolCallId,
        error: DECLINED,
        executed: false,
      })
    const text = typeof chunk.content === "string" ? chunk.content : JSON.stringify(chunk.content)
    const failure = Option.getOrUndefined(decodeResultState(chunk))?.metadata.tanstack
    if (failure?.state === "output-error") {
      return emit(SessionEvent.Tool.Failed, {
        sessionID: run.sessionID,
        assistantMessageID: step.messageID,
        id: chunk.toolCallId,
        error: {
          type:
            failure.toolResultOutcome === "denied"
              ? "permission.rejected"
              : failure.toolResultOutcome === "cancelled"
                ? "aborted"
                : "tool.execution",
          message: text,
        },
        executed: false,
      })
    }
    const result = toOpencodeResult({ name: call.name, input: call.input, result: text, toolCalls: call.rows })
    const child = call.name === "subagent" ? subagentSession(result.metadata.sessionID) : undefined
    const content = child ? withSessionID(result.content, child) : result.content
    const files = call.diffs.map((diff) => ({ ...diff }))
    emit(SessionEvent.Tool.Success, {
      sessionID: run.sessionID,
      assistantMessageID: step.messageID,
      id: chunk.toolCallId,
      content,
      metadata: {
        ...result.metadata,
        ...(child ? { sessionID: child.opencodeID } : {}),
        ...(files.length > 0 ? { files } : {}),
      },
      executed: false,
    })
  }

  // The subagent result names the harness run. opencode names the child session.
  const subagentSession = (runID: unknown) => {
    if (typeof runID !== "string") return undefined
    const opencodeID = links.session.get(runID)
    return opencodeID === undefined ? undefined : { runID, opencodeID }
  }

  const onRunFinished = (
    entry: HarnessEvent,
    chunk: { finishReason?: unknown; metadata?: unknown; usage?: unknown },
  ) => {
    const run = runOf(entry)
    const step = run.step
    streamed(run)
    if (step === undefined) return
    const reason = chunk.finishReason ?? Option.getOrUndefined(decodeRunMetadata(chunk.metadata))?.tanstack.finishReason
    step.finish = finishOf(reason)
    const usage = Option.getOrUndefined(decodeTokenUsage(chunk.usage))
    if (usage === undefined || step.tokens !== undefined) return
    step.tokens = tokensOf(
      usage.promptTokens,
      usage.completionTokens,
      usage.completionTokensDetails?.reasoningTokens ?? 0,
      usage.promptTokensDetails?.cachedTokens ?? 0,
      usage.promptTokensDetails?.cacheWriteTokens ?? 0,
    )
    step.cost = usage.cost ?? SessionUsage.calculateCost(step.costs, step.tokens)
  }

  const onRunError = (entry: HarnessEvent, message: string) => {
    const run = runOf(entry)
    streamed(run)
    run.error = { type: "provider.unknown", message }
  }

  const onSubagentStarted = (
    entry: HarnessEvent,
    chunk: { subagentRunId: string; name: string; parentToolCallId?: string },
  ) => {
    const parent = parentRun(entry.operationId)
    const step = parent.step
    streamed(parent)
    const call = chunk.parentToolCallId === undefined ? undefined : step?.calls.get(chunk.parentToolCallId)
    const known = links.session.get(chunk.subagentRunId)
    const sessionID = known === undefined ? make.session() : SessionID.make(known)
    remember("session", chunk.subagentRunId, sessionID)
    const subagent = Option.getOrUndefined(decodeSubagentInput(call?.input))
    const child: Child = {
      sessionID,
      agent: Agent.ID.make(chunk.name),
      operationId: entry.operationId,
      executing: false,
      step: undefined,
      error: undefined,
    }
    children.set(chunk.subagentRunId, child)
    out.push({
      type: "child",
      sessionID,
      parentID: options.sessionID,
      agent: child.agent,
      title: subagent?.description ?? chunk.name,
    })
    if (step && call && chunk.parentToolCallId !== undefined)
      emit(SessionEvent.Tool.Progress, {
        sessionID: parent.sessionID,
        assistantMessageID: step.messageID,
        id: chunk.parentToolCallId,
        metadata: { sessionID, status: "running" },
      })
    // The child's first message is the prompt of the subagent tool call.
    const inboxID = make.message()
    emit(SessionEvent.InboxEnqueued, {
      sessionID,
      inboxID,
      item: { type: "user", payload: { text: subagent?.prompt ?? "" }, delivery: "steer" },
    })
    startExecution(child)
    emit(SessionEvent.InboxDelivered, { sessionID, inboxID })
  }

  const onSubagentEnded = (runID: string, error: string | undefined) => {
    const child = children.get(runID)
    if (child === undefined || !child.executing) return
    if (error !== undefined) child.error = { type: "unknown", message: error }
    finishRun(child, error === undefined ? "completed" : "failed")
  }

  const onChunk = (entry: HarnessEvent) => {
    const chunk = entry.event
    switch (chunk.type) {
      case EventType.CUSTOM:
        return onCustom(entry, chunk.name, chunk.value)
      case EventType.RUN_STARTED:
        modelStep(parentRun(entry.operationId))
        return
      case EventType.TEXT_MESSAGE_START:
        return onText(entry, "text", chunk.messageId, "start")
      case EventType.TEXT_MESSAGE_CONTENT:
        return onText(entry, "text", chunk.messageId, "delta", chunk.delta)
      case EventType.TEXT_MESSAGE_END:
        return onText(entry, "text", chunk.messageId, "end")
      case EventType.REASONING_MESSAGE_START:
        return onText(entry, "reasoning", chunk.messageId, "start")
      case EventType.REASONING_MESSAGE_CONTENT:
        return onText(entry, "reasoning", chunk.messageId, "delta", chunk.delta)
      case EventType.REASONING_MESSAGE_END:
        return onText(entry, "reasoning", chunk.messageId, "end")
      case EventType.TOOL_CALL_START:
        return onToolStart(entry, chunk.toolCallId, chunk.toolCallName)
      case EventType.TOOL_CALL_ARGS: {
        const call = runOf(entry).step?.calls.get(chunk.toolCallId)
        if (call) call.args += chunk.delta
        return
      }
      case EventType.TOOL_CALL_END:
        return onToolEnd(entry, chunk.toolCallId, chunk.input)
      case EventType.TOOL_CALL_RESULT:
        return onToolResult(entry, chunk)
      case EventType.RUN_FINISHED:
        return onRunFinished(entry, chunk)
      case EventType.RUN_ERROR:
        return onRunError(entry, chunk.message)
      case EventType.SUBAGENT_STARTED:
        return onSubagentStarted(entry, chunk)
      case EventType.SUBAGENT_FINISHED:
        return onSubagentEnded(chunk.subagentRunId, undefined)
      case EventType.SUBAGENT_ERROR:
        return onSubagentEnded(chunk.subagentRunId, chunk.message)
      default:
        return
    }
  }

  return {
    /**
     * Register the opencode inbox item of an input before you give the input
     * to the harness. Use `inboxID` as the harness `inputId`. The harness
     * events name the input, but they do not carry its message.
     */
    admit: (input: { readonly inboxID: SessionMessage.ID; readonly item: SessionInbox.Item }) => {
      if (!inputs.has(input.inboxID)) inputs.set(input.inboxID, { ...input, state: "admitted" })
    },
    /** The opencode events for one harness event, in publish order. */
    map: (entry: HarnessEvent) => {
      onChunk(entry)
      return out.splice(0)
    },
    /**
     * A file that a running edit tool changed. The workspace backend knows the
     * diff, and the harness result does not. The diff goes to the
     * `metadata.files` of the tool call and to the `files` of its step. It
     * belongs to the newest running `write_file`, `edit_file`, or `patch` call,
     * and a call with the same `path` input wins.
     */
    fileChanged: (diff: FileDiff.Info) => {
      const found =
        findCall((call) => isEditTool(call.name) && call.input.path === diff.file) ??
        findCall((call) => isEditTool(call.name))
      found?.call.diffs.push(diff)
    },
    /**
     * A manual compaction: `Session.compact` admitted the inbox item `inboxID`, and the harness compacts at its
     * next model call. That compaction delivers the item.
     */
    compacting: (inboxID: SessionMessage.ID) => {
      manual.inboxID = inboxID
    },
    /**
     * The token count after the compaction that `entry` ends, when that compaction wrote its log record. Read the
     * summary text from the record, and give it to `compacted` before you map `entry`. `undefined` for any other
     * event.
     */
    compactionEnd: (entry: HarnessEvent) => {
      const chunk = entry.event
      if (chunk.type !== EventType.CUSTOM || chunk.name !== "compaction:ended") return undefined
      const ended = Option.getOrUndefined(decodeCompaction(chunk.value))
      const isRecorded = compactions.get(entry.operationId)?.recorded === true && ended?.error === undefined
      return isRecorded ? ended?.after : undefined
    },
    /** The summary of the compaction that operation `operationId` ends next, and the model that wrote it. */
    compacted: (operationId: string, summary: Summary) => {
      const compaction = compactions.get(operationId)
      if (compaction) compaction.summary = summary
    },
    /**
     * The reason of the next cancelled turn, for example `inactivity` when the location evicts its idle owners.
     * Call it before you cancel the turn. Without it, a cancelled turn is interrupted by the `user`.
     */
    interrupting: (reason: InterruptReason) => {
      cancel.reason = reason
    },
    /** The agent and the model of the next model calls. */
    select: (next: { readonly agent?: Agent.ID; readonly model?: Model.Ref; readonly costs?: Model.Info["cost"] }) => {
      if (next.agent !== undefined) selection.agent = next.agent
      if (next.model !== undefined) selection.model = next.model
      if (next.costs !== undefined) selection.costs = next.costs
    },
    /** Add a link that the stream does not show, for example a user message of the transcript. */
    link: (link: Link) => remember(link.kind, link.harnessID, link.opencodeID),
    /** The opencode `msg_` id of a harness transcript message. */
    messageID: (harnessID: string) => links.message.get(harnessID),
    /** The child `ses_` id of a harness `subagentRunId`. */
    childSessionID: (runID: string) => links.session.get(runID),
    /** The harness `questionId` of a `permission.asked` or `form.created` request. Answer it with `session.answer`. */
    questionID: (requestID: string) => asks.get(requestID),
  }
}

export type EventMapper = ReturnType<typeof createEventMapper>

interface Input {
  readonly inboxID: SessionMessage.ID
  readonly item: SessionInbox.Item
  state: "admitted" | "enqueued" | "delivered" | "done"
}

/** The summary of a compaction, and the model that wrote it. */
export interface Summary {
  readonly text: string
  readonly model: Model.Ref
}

interface Compaction {
  readonly reason: "auto" | "manual"
  /** The inbox item of a manual compaction. */
  readonly inboxID: SessionMessage.ID | undefined
  /** The middleware replaced the messages and wrote its log record. */
  recorded: boolean
  summary: Summary | undefined
}

interface CompactionUsage {
  readonly tokens: TokenUsage.Info
  readonly cost: Money.USD
}

// The error of the old runtime when a manual compaction has nothing to summarize.
const NOTHING_TO_COMPACT = { type: "compaction.unavailable", message: "Nothing to compact yet" }

interface Part {
  readonly ordinal: number
  text: string
}

interface Call {
  /** The harness tool name. */
  readonly name: string
  args: string
  input: Record<string, unknown>
  settled: boolean
  rows: ReadonlyArray<ExecuteCall>
  readonly diffs: Array<FileDiff.Info>
  /** How many questions the call asked. */
  asked: number
}

/** One model call: one opencode assistant message. */
interface Step {
  readonly messageID: SessionMessage.ID
  streamed: boolean
  readonly texts: Map<string, Part>
  readonly reasoning: Map<string, Part>
  nextText: number
  nextReasoning: number
  readonly calls: Map<string, Call>
  finish: FinishReason | undefined
  tokens: TokenUsage.Info | undefined
  cost: number
  /** The catalog prices of the model of the step. */
  readonly costs: Model.Info["cost"]
  /** A retry runs the model call again in the same step. */
  retrying: boolean
}

/** One opencode session timeline: a turn of the session, or a subagent run in its child session. */
interface Run {
  readonly sessionID: SessionID
  readonly agent: Agent.ID
  executing: boolean
  step: Step | undefined
  error: SessionError.Error | undefined
}

interface Child extends Run {
  /** The parent operation. */
  readonly operationId: string
}

type Question = typeof QuestionValue.Type

function noTokens() {
  return tokensOf(0, 0, 0, 0, 0)
}

/** opencode counts input without the cache, and output without reasoning. */
function tokensOf(prompt: number, completion: number, reasoning: number, cacheRead: number, cacheWrite: number) {
  return {
    input: Math.max(0, prompt - cacheRead - cacheWrite),
    output: Math.max(0, completion - reasoning),
    reasoning,
    cache: { read: cacheRead, write: cacheWrite },
  }
}

function finishOf(reason: unknown): FinishReason {
  switch (reason) {
    case "stop":
      return "stop"
    case "length":
      return "length"
    case "tool_calls":
      return "tool-calls"
    case "content_filter":
      return "content-filter"
    default:
      return "unknown"
  }
}

function changedFiles(step: Step) {
  const files = [...step.calls.values()].flatMap((call) => call.diffs.map((diff) => diff.file))
  return [...new Set(files)].map((file) => RelativePath.make(file))
}

/** What a call touches, as opencode's own tools name it in a permission request. */
function resourcesOf(call: Call) {
  const field = RESOURCE_FIELDS[call.name]
  const value = field === undefined ? undefined : call.input[field]
  return typeof value === "string" ? [value] : []
}

const RESOURCE_FIELDS: Record<string, string> = {
  read_file: "path",
  write_file: "path",
  edit_file: "path",
  list_files: "pattern",
  grep: "pattern",
  bash: "command",
  webfetch: "url",
  websearch: "query",
}

/** The opencode form field of question `index` of a `question` tool call. */
function questionField(index: number, item: (typeof ToolQuestions.Type)["questions"][number]) {
  const choices = item.options.map((option) => ({
    value: option.label,
    label: option.label,
    ...(option.description === undefined ? {} : { description: option.description }),
  }))
  const base = {
    key: `q${index}`,
    ...(item.header === undefined ? {} : { title: item.header }),
    description: item.question,
    options: choices,
    custom: true,
  }
  return item.multiple === true ? { ...base, type: "multiselect" as const } : { ...base, type: "string" as const }
}

/** The one field of a question with no schema. */
function answerField(message: string) {
  return { key: "answer", title: message, required: true, type: "string" as const }
}

/** The permissions plugin asks with an `answer` of `once`, `always`, or `reject`. */
function isPermissionQuestion(schema: unknown) {
  const answer = Option.getOrUndefined(decodePermissionSchema(schema))?.properties.answer.enum ?? []
  return ["once", "always", "reject"].every((choice) => answer.includes(choice))
}

function progressMetadata(value: unknown) {
  const json = Option.getOrUndefined(decodeJsonObject(value)) ?? {}
  return Object.fromEntries(Object.entries(json).filter(([key]) => key !== "toolCallId"))
}

function withSessionID(
  content: ReturnType<typeof toOpencodeResult>["content"],
  child: { runID: string; opencodeID: string },
) {
  const [first, ...rest] = content
  const swap = (item: typeof first) =>
    item.type === "text" ? { ...item, text: item.text.replaceAll(child.runID, child.opencodeID) } : item
  return [swap(first), ...rest.map(swap)] satisfies ReturnType<typeof toOpencodeResult>["content"]
}

function errorMessage(error: unknown) {
  if (typeof error === "string") return error
  return Option.getOrUndefined(decodeMessage(error))?.message ?? "The model call failed."
}

// The harness `CUSTOM` values and chunk fields are untyped. Each one is checked here, once.
const decodeInputID = Schema.decodeUnknownOption(Schema.Struct({ inputId: Schema.String }))
const decodeApplied = Schema.decodeUnknownOption(Schema.Struct({ inputId: Schema.String, operationId: Schema.String }))
const decodeOperationStarted = Schema.decodeUnknownOption(
  Schema.Struct({ operationId: Schema.String, kind: Schema.String }),
)
const FinishedStatus = Schema.Literals(["completed", "failed", "cancelled", "interrupted"])
type FinishedStatus = typeof FinishedStatus.Type
const decodeOperationFinished = Schema.decodeUnknownOption(
  Schema.Struct({ operationId: Schema.String, status: FinishedStatus }),
)
const decodeSettled = Schema.decodeUnknownOption(Schema.Struct({ inputId: Schema.String, outcome: Schema.String }))
const decodeDelivery = Schema.decodeUnknownOption(
  Schema.Struct({ inputId: Schema.String, delivery: Schema.Literals(["steer", "queue"]) }),
)
const QuestionValue = Schema.Struct({
  questionId: Schema.String,
  message: Schema.String,
  schema: Schema.optionalKey(Schema.Unknown),
  url: Schema.optionalKey(Schema.String),
})
const decodeQuestion = Schema.decodeUnknownOption(QuestionValue)
const decodePermissionSchema = Schema.decodeUnknownOption(
  Schema.Struct({ properties: Schema.Struct({ answer: Schema.Struct({ enum: Schema.Array(Schema.String) }) }) }),
)
const ToolQuestions = Schema.Struct({
  questions: Schema.Array(
    Schema.Struct({
      question: Schema.String,
      header: Schema.optionalKey(Schema.String),
      options: Schema.Array(Schema.Struct({ label: Schema.String, description: Schema.optionalKey(Schema.String) })),
      multiple: Schema.optionalKey(Schema.Boolean),
    }),
  ),
})
const decodeQuestions = Schema.decodeUnknownOption(ToolQuestions)
const decodeUsage = Schema.decodeUnknownOption(
  Schema.Struct({
    usage: Schema.Struct({
      promptTokens: Schema.Finite,
      completionTokens: Schema.Finite,
      cachedTokens: Schema.Finite,
      cacheWriteTokens: Schema.Finite,
      cost: Schema.optionalKey(Schema.Finite),
    }),
  }),
)
const decodeTokenUsage = Schema.decodeUnknownOption(
  Schema.Struct({
    promptTokens: Schema.Finite,
    completionTokens: Schema.Finite,
    promptTokensDetails: Schema.optionalKey(
      Schema.Struct({
        cachedTokens: Schema.optionalKey(Schema.Finite),
        cacheWriteTokens: Schema.optionalKey(Schema.Finite),
      }),
    ),
    completionTokensDetails: Schema.optionalKey(Schema.Struct({ reasoningTokens: Schema.optionalKey(Schema.Finite) })),
    cost: Schema.optionalKey(Schema.Finite),
  }),
)
const decodeRetry = Schema.decodeUnknownOption(
  Schema.Struct({ retries: Schema.Finite, error: Schema.optionalKey(Schema.Unknown) }),
)
const decodeMessage = Schema.decodeUnknownOption(Schema.Struct({ message: Schema.String }))
const decodeRevert = Schema.decodeUnknownOption(Schema.Struct({ messageId: Schema.NullOr(Schema.String) }))
const decodeCompaction = Schema.decodeUnknownOption(
  Schema.Struct({
    reason: Schema.optionalKey(Schema.String),
    after: Schema.optionalKey(Schema.Finite),
    usage: Schema.optionalKey(Schema.Unknown),
    error: Schema.optionalKey(Schema.Struct({ message: Schema.String })),
  }),
)
const decodeToolEvent = Schema.decodeUnknownOption(Schema.Struct({ toolCallId: Schema.String }))
const decodeJsonObject = Schema.decodeUnknownOption(Schema.Record(Schema.String, Schema.Json))
const decodeSubagentChunk = Schema.decodeUnknownOption(Schema.Struct({ subagentRunId: Schema.String }))
const decodeSubagentInput = Schema.decodeUnknownOption(
  Schema.Struct({ description: Schema.optionalKey(Schema.String), prompt: Schema.optionalKey(Schema.String) }),
)
const decodeInput = Schema.decodeUnknownOption(Schema.Record(Schema.String, Schema.Unknown))
const decodeArgs = Schema.decodeUnknownOption(Schema.fromJsonString(Schema.Record(Schema.String, Schema.Unknown)))
const decodeRunMetadata = Schema.decodeUnknownOption(
  Schema.Struct({ tanstack: Schema.Struct({ finishReason: Schema.optionalKey(Schema.NullOr(Schema.String)) }) }),
)
const decodeResultState = Schema.decodeUnknownOption(
  Schema.Struct({
    metadata: Schema.Struct({
      tanstack: Schema.Struct({
        state: Schema.optionalKey(Schema.String),
        toolResultOutcome: Schema.optionalKey(Schema.String),
      }),
    }),
  }),
)
