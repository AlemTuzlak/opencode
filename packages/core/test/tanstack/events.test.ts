/**
 * The event mapper: harness events in, opencode session events out.
 *
 * The golden tests run a real harness with a scripted fake model, map its
 * events, publish them on a real Bus, and compare the normalized trace with
 * the golden trace of the old runtime. The mapper owns only part of a golden
 * trace, and some harness facts differ from the old runtime. Each difference
 * is a named patch on the golden trace below, with the reason.
 */
import { describe, expect, test } from "bun:test"
import path from "path"
import { Effect } from "effect"
import { EventType } from "@tanstack/ai"
import type { Modality, StreamChunk, TextOptions } from "@tanstack/ai"
import { FakeTextAdapter } from "@tanstack/ai/testing"
import type { FakeResponseStep } from "@tanstack/ai/testing"
import { createHarnessHost, definePlugin, defineHarness, HARNESS_EVENTS } from "@tanstack/ai-harness"
import type { AnyHarness, HarnessPlugin, HarnessSession } from "@tanstack/ai-harness"
import { agents, permissions, question } from "@tanstack/ai-harness/plugins"
import { WorkspaceHooks, workspaceTools } from "@tanstack/ai-harness/plugins/coding"
import { memoryLogStore, memoryPersistence } from "@tanstack/ai-persistence"
import { Agent } from "@opencode/schema/agent"
import { Event } from "@opencode/schema/event"
import { Form } from "@opencode/schema/form"
import { Model } from "@opencode/schema/model"
import { Money } from "@opencode/schema/money"
import { Permission } from "@opencode/schema/permission"
import { Provider } from "@opencode/schema/provider"
import { AbsolutePath } from "@opencode/schema/schema"
import { SessionID } from "@opencode/schema/session-id"
import { SessionMessage } from "@opencode/schema/session-message"
import { Bus } from "@opencode/core/bus"
import { Database } from "@opencode/core/database/database"
import { AppNodeBuilder } from "@opencode/core/effect/app-node-builder"
import { createEventMapper } from "@opencode/core/tanstack/events"
import type { EventMapper, HarnessEvent, Link, Output } from "@opencode/core/tanstack/events"
import { LayerNode } from "@opencode/util/effect/layer-node"
import { tmpdirScoped } from "../fixture/tmpdir"
import { testEffect } from "../lib/effect"
import { comparable, expectedTrace, harnessResult, rawInput } from "./compare"
import type { Patch } from "./compare"
import { normalizeTrace, recordTrace } from "./trace"

const it = testEffect(AppNodeBuilder.build(LayerNode.group([Database.node, Bus.node])))

const model = { id: Model.ID.make("golden"), providerID: Provider.ID.make("test") }
const NOTES_DIFF = {
  file: "notes.txt",
  patch:
    "Index: notes.txt\n===================================================================\n--- notes.txt\n+++ notes.txt\n@@ -1,1 +1,1 @@\n-alpha\n+beta\n",
  status: "modified" as const,
  additions: 1,
  deletions: 1,
}

/**
 * The fake model of the golden tests. Like the scripted model of the old
 * runtime, it reports no token usage. With `hang`, it stops after its text
 * and waits for the turn to be cancelled.
 */
class GoldenModel extends FakeTextAdapter<"golden", ReadonlyArray<Modality>> {
  hang = false

  override async *chatStream(options: TextOptions) {
    for await (const chunk of super.chatStream(options)) {
      if (this.hang && chunk.type === EventType.TEXT_MESSAGE_END)
        return await aborted(options.request?.signal ?? undefined)
      yield chunk.type === EventType.RUN_FINISHED ? { ...chunk, usage: undefined } : chunk
    }
  }
}

function aborted(signal: AbortSignal | undefined) {
  return new Promise<void>((resolve) => signal?.addEventListener("abort", () => resolve(), { once: true }))
}

interface Drive {
  readonly session: HarnessSession
  readonly model: GoldenModel
  /** Admits the opencode inbox item, then prompts the harness with its id. */
  readonly prompt: (text: string, options?: { readonly busy?: "steer" }) => ReturnType<HarnessSession["prompt"]>
}

/**
 * Runs `script` on a real harness with a durable in-memory host, maps every
 * harness event as it comes, and returns the outputs. `onEvent` sees each
 * harness event after the mapper did.
 */
const drive = (input: {
  readonly responses: ReadonlyArray<FakeResponseStep>
  readonly plugins?: (context: {
    readonly directory: string
    readonly mapper: EventMapper
    readonly model: GoldenModel
  }) => ReadonlyArray<HarnessPlugin>
  readonly subagents?: boolean
  readonly onEvent?: (entry: HarnessEvent, drive: Drive) => void
  readonly script: (drive: Drive) => PromiseLike<unknown>
}) =>
  Effect.gen(function* () {
    const directory = (yield* tmpdirScoped("opencode-events-")).path
    return yield* Effect.promise(async () => {
      await Bun.write(path.join(directory, "notes.txt"), "alpha\n")
      const fake = new GoldenModel("golden", {})
      fake.setResponses([...input.responses])
      const mapper = createEventMapper({
        sessionID: SessionID.create(),
        location: { directory: AbsolutePath.make(directory) },
        agent: Agent.ID.make("build"),
        model,
      })
      const harness: AnyHarness = defineHarness({
        name: "golden",
        adapter: fake,
        plugins: () => [...(input.plugins?.({ directory, mapper, model: fake }) ?? [])],
        ...(input.subagents ? { subagents: { agents: [], tool: "single" as const } } : {}),
      })
      const host = createHarnessHost({
        persistence: { stores: { log: memoryLogStore(), runs: memoryPersistence().stores.runs } },
      })
      const session = await host.open(harness, { threadId: "golden" })
      const outputs: Output[] = []
      const counts = { started: 0, finished: 0 }
      const controller = new AbortController()
      const context: Drive = {
        session,
        model: fake,
        prompt: (text, options) => {
          const inboxID = SessionMessage.ID.create()
          mapper.admit({ inboxID, item: { type: "user", payload: { text }, delivery: "steer" } })
          return session.prompt(text, { inputId: inboxID, ...options })
        },
      }
      const reader = (async () => {
        for await (const entry of session.events({ signal: controller.signal })) {
          outputs.push(...mapper.map(entry))
          if (isCustom(entry.event, HARNESS_EVENTS.operationStarted)) counts.started++
          if (isCustom(entry.event, HARNESS_EVENTS.operationFinished)) counts.finished++
          input.onEvent?.(entry, context)
        }
      })()
      await input.script(context)
      // The feed is async: wait until the reader has the end of every operation.
      for (let tries = 0; tries < 500 && (counts.started === 0 || counts.finished < counts.started); tries++)
        await Bun.sleep(10)
      controller.abort()
      await reader
      await host.close()
      return { directory, outputs }
    })
  })

/** Publishes the outputs on the Bus and returns the normalized, comparable trace. */
const publish = (run: { readonly directory: string; readonly outputs: ReadonlyArray<Output> }) =>
  Effect.gen(function* () {
    const recorder = yield* recordTrace()
    const bus = yield* Bus.Service
    for (const output of run.outputs) {
      if (output.type === "publish") yield* bus.publish(output.definition, output.data, output.options)
    }
    return comparable(normalizeTrace(yield* recorder.events, { roots: [run.directory] }))
  })

function isCustom(chunk: StreamChunk, name: string) {
  return chunk.type === EventType.CUSTOM && chunk.name === name
}

// Events that other parts of the runtime publish, not the mapper:
// - `session.created` and `session.permissions`: the session facade.
// - `session.instructions.updated`: opencode's instruction tracking. The harness has no such event.
// - `session.usage.updated`: the projector, after each `step.ended`.
// - `permission.replied` and `form.replied`: the permission and form facades, when a client answers.
const NOT_MAPPED = new Set([
  "session.created",
  "session.permissions",
  "session.instructions.updated",
  "session.usage.updated",
  "permission.replied",
  "form.replied",
])

/**
 * The golden trace as the mapper must produce it: without the events the
 * mapper does not own, without step snapshots (the harness stream has no
 * snapshot ids), and with the scenario patches.
 */
const expected = (name: string, patches: ReadonlyArray<Patch> = []) =>
  expectedTrace(name, { drop: NOT_MAPPED, patches })

const answerPermissions = (entry: HarnessEvent, context: Drive) => {
  const chunk = entry.event
  if (chunk.type !== EventType.CUSTOM || chunk.name !== HARNESS_EVENTS.question) return
  void context.session.answer(chunk.value.questionId, { answer: "once" })
}

describe("golden traces through the event mapper", () => {
  it.live(
    "text-turn",
    () =>
      Effect.gen(function* () {
        const run = yield* drive({
          responses: [{ text: "Hello there" }],
          script: (context) => context.prompt("Say hello"),
        })
        expect(yield* publish(run)).toEqual(yield* expected("text-turn"))
      }),
    30_000,
  )

  it.live(
    "tool-permission",
    () =>
      Effect.gen(function* () {
        const run = yield* drive({
          responses: [
            { toolCalls: [{ id: "call-read", name: "read_file", input: { path: "notes.txt" } }] },
            {
              toolCalls: [
                { id: "call-edit", name: "edit_file", input: { path: "notes.txt", old: "alpha", new: "beta" } },
              ],
            },
            { text: "I changed alpha to beta." },
          ],
          // A later node computes the diff in the workspace backend. Here the hook gives the known diff.
          plugins: ({ directory, mapper }) => [
            workspaceTools({ root: directory, editStyle: "edit" }),
            permissions({ root: directory }),
            definePlugin({
              name: "test/diffs",
              setup: () => ({
                contribute: [WorkspaceHooks.item({ afterWrite: async () => mapper.fileChanged(NOTES_DIFF) })],
              }),
            }),
          ],
          onEvent: answerPermissions,
          script: (context) => context.prompt("Change alpha to beta in notes.txt"),
        })
        expect(yield* publish(run)).toEqual(
          yield* expected("tool-permission", [
            rawInput("call-read", '{"path":"notes.txt"}'),
            rawInput("call-edit", '{"path":"notes.txt","old":"alpha","new":"beta"}'),
            harnessResult("call-read", "1\talpha"),
            harnessResult("call-edit", "Edited notes.txt (1 change)."),
            // opencode's edit tool computes a diff preview before it asks. The harness asks before the tool runs.
            { type: "permission.asked", unset: ["metadata"] },
          ]),
        )
      }),
    30_000,
  )

  it.live(
    "steer",
    () =>
      Effect.gen(function* () {
        const called = Promise.withResolvers<void>()
        const steered = Promise.withResolvers<void>()
        const run = yield* drive({
          // The first model call waits until the steer is queued, so the steer joins the running turn.
          responses: [
            async () => {
              called.resolve()
              await steered.promise
              return { text: "First answer" }
            },
            { text: "Answer with the steer" },
          ],
          script: async (context) => {
            const first = context.prompt("First question")
            await called.promise
            const second = context.prompt("Also answer this", { busy: "steer" })
            await second.receipt
            steered.resolve()
            await Promise.all([first, second])
          },
        })
        expect(yield* publish(run)).toEqual(yield* expected("steer"))
      }),
    30_000,
  )

  it.live(
    "interrupt",
    () =>
      Effect.gen(function* () {
        const cancelled = { done: false }
        const run = yield* drive({
          responses: [{ text: "Partial" }],
          onEvent: (entry, context) => {
            if (cancelled.done || entry.event.type !== EventType.TEXT_MESSAGE_CONTENT) return
            cancelled.done = true
            void context.session.cancel(entry.operationId)
          },
          script: async (context) => {
            context.model.hang = true
            await context.prompt("Write a long story").then(undefined, () => undefined)
          },
        })
        expect(yield* publish(run)).toEqual(yield* expected("interrupt"))
      }),
    30_000,
  )

  it.live(
    "question",
    () =>
      Effect.gen(function* () {
        const questions = [
          {
            question: "Which color?",
            header: "Color",
            options: [
              { label: "Red", description: "Warm" },
              { label: "Blue", description: "Cool" },
            ],
          },
        ]
        const run = yield* drive({
          responses: [
            { toolCalls: [{ id: "call-question", name: "question", input: { questions } }] },
            { text: "You picked red." },
          ],
          plugins: () => [question()],
          onEvent: (entry, context) => {
            const chunk = entry.event
            if (chunk.type === EventType.CUSTOM && chunk.name === HARNESS_EVENTS.question)
              void context.session.answer(chunk.value.questionId, "Red")
          },
          script: (context) => context.prompt("Ask me for a color"),
        })
        expect(yield* publish(run)).toEqual(
          yield* expected("question", [
            rawInput("call-question", JSON.stringify({ questions })),
            harnessResult("call-question", "Which color?\nAnswer: Red"),
          ]),
        )
      }),
    30_000,
  )

  it.live(
    "subagent",
    () =>
      Effect.gen(function* () {
        const subagentInput = { agent: "general", description: "Count notes", prompt: "Count the lines in notes.txt" }
        const run = yield* drive({
          responses: [
            { toolCalls: [{ id: "call-subagent", name: "subagent", input: subagentInput }] },
            { text: "notes.txt has one line." },
            { text: "The subagent says one line." },
          ],
          subagents: true,
          // The subagent answers from the same script as the main model.
          plugins: (context) => [agents({ adapter: () => context.model })],
          script: (context) => context.prompt("Ask a subagent to count lines"),
        })
        // The session facade creates the child session from this output, before the child's events.
        const children = run.outputs.flatMap((output) => (output.type === "child" ? [output] : []))
        expect(children.map((child) => ({ agent: child.agent, title: child.title }))).toEqual([
          { agent: Agent.ID.make("general"), title: "Count notes" },
        ])
        expect(yield* publish(run)).toEqual(
          yield* expected("subagent", [
            rawInput("call-subagent", JSON.stringify(subagentInput)),
            // opencode adds its own note to the child prompt. The harness sends the prompt as the model wrote it.
            {
              type: "session.inbox.enqueued",
              where: { sessionID: "ses_15" },
              set: { item: { type: "user", payload: { text: "Count the lines in notes.txt" }, delivery: "steer" } },
            },
          ]),
        )
      }),
    30_000,
  )
})

/**
 * A mapper with counted ids (`msg_1`, `per_1`, ...) and a fixed clock, and
 * `feed`, which maps scripted chunks of one operation and returns the
 * published events as `[type, data]`.
 */
function scripted(
  input: Pick<Parameters<typeof createEventMapper>[0], "links" | "onLink" | "costs"> = {},
) {
  const counts = new Map<string, number>()
  const next = (prefix: string) => {
    const count = (counts.get(prefix) ?? 0) + 1
    counts.set(prefix, count)
    return `${prefix}_${count}`
  }
  const mapper = createEventMapper({
    sessionID: SessionID.make("ses_main"),
    location: { directory: AbsolutePath.make("/project") },
    agent: Agent.ID.make("build"),
    model,
    ids: {
      event: () => Event.ID.make(next("evt")),
      message: () => SessionMessage.ID.make(next("msg")),
      permission: () => Permission.ID.make(next("per")),
      form: () => Form.ID.make(next("frm")),
      session: () => SessionID.make(next("ses")),
    },
    clock: () => 1000,
    ...input,
  })
  const feed = (...chunks: ReadonlyArray<StreamChunk>) =>
    chunks
      .flatMap((event) => mapper.map({ operationId: "op-1", event }))
      .flatMap((output) => (output.type === "publish" ? [[output.definition.type, output.data] as const] : []))
  return { mapper, feed }
}

const chunks = {
  custom: (name: string, value: Record<string, unknown>): StreamChunk => ({ type: EventType.CUSTOM, name, value }),
  started: () => chunks.custom(HARNESS_EVENTS.operationStarted, { operationId: "op-1", kind: "chat" }),
  finished: (status: string) => chunks.custom(HARNESS_EVENTS.operationFinished, { operationId: "op-1", status }),
  runStarted: (): StreamChunk => ({ type: EventType.RUN_STARTED, threadId: "thread", runId: "op-1" }),
  runFinished: (finishReason: "stop" | "tool_calls"): StreamChunk => ({
    type: EventType.RUN_FINISHED,
    threadId: "thread",
    runId: "op-1",
    metadata: { tanstack: { finishReason } },
  }),
  runError: (message: string): StreamChunk => ({ type: EventType.RUN_ERROR, message }),
  text: (messageId: string, delta: string): ReadonlyArray<StreamChunk> => [
    { type: EventType.TEXT_MESSAGE_START, messageId, role: "assistant" },
    { type: EventType.TEXT_MESSAGE_CONTENT, messageId, delta },
    { type: EventType.TEXT_MESSAGE_END, messageId },
  ],
  reasoning: (messageId: string, delta: string): ReadonlyArray<StreamChunk> => [
    { type: EventType.REASONING_MESSAGE_START, messageId, role: "reasoning" },
    { type: EventType.REASONING_MESSAGE_CONTENT, messageId, delta },
    { type: EventType.REASONING_MESSAGE_END, messageId },
  ],
  toolCall: (toolCallId: string, name: string, input: Record<string, unknown>): ReadonlyArray<StreamChunk> => [
    { type: EventType.TOOL_CALL_START, toolCallId, toolCallName: name },
    { type: EventType.TOOL_CALL_ARGS, toolCallId, delta: JSON.stringify(input) },
    { type: EventType.TOOL_CALL_END, toolCallId, input },
  ],
  toolResult: (toolCallId: string, content: string, metadata: Record<string, unknown>): StreamChunk => ({
    type: EventType.TOOL_CALL_RESULT,
    messageId: `result-${toolCallId}`,
    toolCallId,
    content,
    metadata,
  }),
}

const stepStarted = (assistantMessageID: string) =>
  ["session.step.started", { sessionID: "ses_main", agent: "build", model, assistantMessageID, started: 1000 }] as const
const noTokens = { input: 0, output: 0, reasoning: 0, cache: { read: 0, write: 0 } }

describe("event mapper rules", () => {
  test("reasoning and text of one model call share the step, each with its own ordinal", () => {
    const { feed } = scripted()
    const events = feed(
      chunks.started(),
      chunks.runStarted(),
      ...chunks.reasoning("r-1", "Think."),
      ...chunks.text("t-1", "Hi."),
      chunks.runFinished("stop"),
      chunks.finished("completed"),
    )
    const step = { sessionID: "ses_main", assistantMessageID: "msg_1" }
    expect(events).toEqual([
      ["session.execution.started", { sessionID: "ses_main" }],
      stepStarted("msg_1"),
      ["session.reasoning.started", { ...step, ordinal: 0 }],
      ["session.reasoning.delta", { ...step, ordinal: 0, delta: "Think." }],
      ["session.reasoning.ended", { ...step, ordinal: 0, text: "Think." }],
      ["session.text.started", { ...step, ordinal: 0 }],
      ["session.text.delta", { ...step, ordinal: 0, delta: "Hi." }],
      ["session.text.ended", { ...step, ordinal: 0, text: "Hi." }],
      ["session.step.streamed", step],
      ["session.step.ended", { ...step, finish: "stop", cost: 0, tokens: noTokens, files: [] }],
      ["session.execution.succeeded", { sessionID: "ses_main" }],
    ])
  })

  test("a step counts input without the cache, and takes the cost of its own model call", () => {
    const { feed } = scripted()
    const usage = { promptTokens: 100, completionTokens: 20, cachedTokens: 30, cacheWriteTokens: 10, cost: 0.5 }
    const events = feed(
      chunks.started(),
      chunks.runStarted(),
      ...chunks.text("t-1", "Hi."),
      chunks.custom(HARNESS_EVENTS.usage, { model: "fake/golden", usage }),
      chunks.runFinished("stop"),
      chunks.finished("completed"),
    )
    expect(events.find(([type]) => type === "session.step.ended")).toEqual([
      "session.step.ended",
      {
        sessionID: "ses_main",
        assistantMessageID: "msg_1",
        finish: "stop",
        cost: 0.5,
        tokens: { input: 60, output: 20, reasoning: 0, cache: { read: 30, write: 10 } },
        files: [],
      },
    ])
  })

  test("a denied tool call fails with a permission error", () => {
    const { feed } = scripted()
    const events = feed(
      chunks.started(),
      chunks.runStarted(),
      ...chunks.toolCall("call-1", "bash", { command: "rm -rf /" }),
      chunks.runFinished("tool_calls"),
      chunks.toolResult("call-1", "The user denied this tool call.", {
        tanstack: { state: "output-error", toolResultOutcome: "denied" },
      }),
    )
    expect(events.at(-1)).toEqual([
      "session.tool.failed",
      {
        sessionID: "ses_main",
        assistantMessageID: "msg_1",
        id: "call-1",
        error: { type: "permission.rejected", message: "The user denied this tool call." },
        executed: false,
      },
    ])
  })

  test("a cancel fails the running tool calls, then the step, then interrupts the execution", () => {
    const { feed } = scripted()
    const events = feed(
      chunks.started(),
      chunks.runStarted(),
      ...chunks.toolCall("call-1", "bash", { command: "sleep 60" }),
      chunks.finished("cancelled"),
    )
    const step = { sessionID: "ses_main", assistantMessageID: "msg_1" }
    const interrupted = { type: "aborted", message: "Tool execution interrupted" }
    expect(events.slice(-4)).toEqual([
      ["session.step.streamed", step],
      ["session.tool.failed", { ...step, id: "call-1", error: interrupted, executed: false }],
      ["session.step.failed", { ...step, error: { type: "aborted", message: "Step interrupted" }, files: [] }],
      ["session.execution.interrupted", { sessionID: "ses_main", reason: "user" }],
    ])
  })

  test("a retry keeps the step of the failed model call", () => {
    const { feed } = scripted()
    const events = feed(
      chunks.started(),
      chunks.runStarted(),
      chunks.runError("overloaded"),
      chunks.custom(HARNESS_EVENTS.turnRetry, { operationId: "op-1", retries: 1, error: { message: "overloaded" } }),
      ...chunks.text("t-1", "Hi."),
      chunks.runFinished("stop"),
      chunks.finished("completed"),
    )
    expect(events.filter(([type]) => type === "session.step.started")).toEqual([stepStarted("msg_1")])
    expect(events.find(([type]) => type === "session.retry.scheduled")).toEqual([
      "session.retry.scheduled",
      {
        sessionID: "ses_main",
        assistantMessageID: "msg_1",
        attempt: 1,
        at: 1000,
        error: { type: "provider.unknown", message: "overloaded" },
      },
    ])
  })

  test("a step with no provider cost costs what the catalog prices of its model say", () => {
    // $2 for each million input tokens, and $10 for each million output tokens.
    const price = (value: number) => Money.USDPerMillionTokens.make(value)
    const { feed } = scripted({ costs: [{ input: price(2), output: price(10), cache: { read: price(0), write: price(0) } }] })
    const usage = { promptTokens: 1_000, completionTokens: 500, cachedTokens: 0, cacheWriteTokens: 0 }
    const events = feed(
      chunks.started(),
      chunks.runStarted(),
      ...chunks.text("t-1", "Hi."),
      chunks.custom(HARNESS_EVENTS.usage, { model: "fake/golden", usage }),
      chunks.runFinished("stop"),
      chunks.finished("completed"),
    )
    expect(events.find(([type]) => type === "session.step.ended")?.[1]).toMatchObject({ cost: 0.007 })
  })

  test("a declined call fails as on opencode's runtime, and its finished step fails with its usage", () => {
    const { feed } = scripted()
    const events = feed(
      chunks.started(),
      chunks.runStarted(),
      ...chunks.toolCall("call-1", "edit_file", { path: "notes.txt" }),
      chunks.runFinished("tool_calls"),
      // The result that the harness `permissions()` plugin gives a call that the user rejects with no message.
      chunks.toolResult("call-1", JSON.stringify({ error: "The user denied this tool call." }), {}),
      chunks.finished("cancelled"),
    )
    const step = { sessionID: "ses_main", assistantMessageID: "msg_1" }
    expect(events.slice(-3)).toEqual([
      [
        "session.tool.failed",
        { ...step, id: "call-1", error: { type: "aborted", message: "The user declined this tool call" }, executed: false },
      ],
      [
        "session.step.failed",
        { ...step, error: { type: "aborted", message: "Step interrupted" }, cost: 0, tokens: noTokens, files: [] },
      ],
      ["session.execution.interrupted", { sessionID: "ses_main", reason: "user" }],
    ])
  })

  test("a cancel interrupts with the reason given before it, and the next cancel is the user's", () => {
    const { mapper, feed } = scripted()
    const cancelled = () => feed(chunks.started(), chunks.runStarted(), chunks.finished("cancelled")).at(-1)

    mapper.interrupting("inactivity")
    const evicted = cancelled()
    const stopped = cancelled()

    expect(evicted).toEqual(["session.execution.interrupted", { sessionID: "ses_main", reason: "inactivity" }])
    expect(stopped).toEqual(["session.execution.interrupted", { sessionID: "ses_main", reason: "user" }])
  })

  test("a question that no question tool call asks gets its form from its schema and its url", () => {
    const { feed } = scripted()
    const events = feed(
      chunks.started(),
      chunks.runStarted(),
      chunks.custom(HARNESS_EVENTS.question, {
        questionId: "q-1",
        message: "Which code did you get?",
        url: "https://pay.example/1",
      }),
    )
    expect(events.at(-1)).toEqual([
      "form.created",
      {
        form: {
          id: "frm_1",
          sessionID: "ses_main",
          title: "Which code did you get?",
          fields: [
            { key: "page", type: "external", url: "https://pay.example/1", title: "Open this page, then answer." },
            { key: "answer", title: "Which code did you get?", required: true, type: "string" },
          ],
        },
      },
    ])
  })

  test("a failed turn fails its step and its execution with the model error", () => {
    const { feed } = scripted()
    const events = feed(chunks.started(), chunks.runStarted(), chunks.runError("boom"), chunks.finished("failed"))
    const error = { type: "provider.unknown", message: "boom" }
    expect(events.slice(-2)).toEqual([
      ["session.step.failed", { sessionID: "ses_main", assistantMessageID: "msg_1", error, files: [] }],
      ["session.execution.failed", { sessionID: "ses_main", error }],
    ])
  })

  test("waiting inputs: a moved input changes its delivery, and a cancelled one leaves the inbox", () => {
    const { mapper, feed } = scripted()
    const item = (text: string) => ({ type: "user" as const, payload: { text }, delivery: "queue" as const })
    mapper.admit({ inboxID: SessionMessage.ID.make("msg_a"), item: item("First") })
    mapper.admit({ inboxID: SessionMessage.ID.make("msg_b"), item: item("Second") })
    const events = feed(
      chunks.custom(HARNESS_EVENTS.inputAccepted, { inputId: "msg_a", op: "followUp" }),
      chunks.custom(HARNESS_EVENTS.inputAccepted, { inputId: "msg_b", op: "followUp" }),
      chunks.custom(HARNESS_EVENTS.inputDelivery, { inputId: "msg_b", delivery: "steer" }),
      chunks.custom(HARNESS_EVENTS.inputSettled, { inputId: "msg_a", outcome: "aborted" }),
      chunks.custom(HARNESS_EVENTS.inputApplied, { inputId: "msg_b", operationId: "op-1" }),
    )
    expect(events).toEqual([
      ["session.inbox.enqueued", { sessionID: "ses_main", inboxID: "msg_a", item: item("First") }],
      ["session.inbox.enqueued", { sessionID: "ses_main", inboxID: "msg_b", item: item("Second") }],
      ["session.inbox.delivery.changed", { sessionID: "ses_main", inboxID: "msg_b", delivery: "steer" }],
      ["session.inbox.cancelled", { sessionID: "ses_main", inboxID: "msg_a" }],
      ["session.execution.started", { sessionID: "ses_main" }],
      ["session.inbox.delivered", { sessionID: "ses_main", inboxID: "msg_b" }],
    ])
  })

  test("a revert stages the linked opencode message, and an unrevert clears it", () => {
    const { mapper, feed } = scripted()
    mapper.link({ kind: "message", harnessID: "harness-user-1", opencodeID: "msg_user" })
    const events = feed(
      chunks.custom(HARNESS_EVENTS.revert, { messageId: "harness-user-1" }),
      // No opencode message matches a harness message without a link.
      chunks.custom(HARNESS_EVENTS.revert, { messageId: "harness-unknown" }),
      chunks.custom(HARNESS_EVENTS.revert, { messageId: null }),
    )
    expect(events).toEqual([
      ["session.revert.staged", { sessionID: "ses_main", revert: { messageID: "msg_user" } }],
      ["session.revert.cleared", { sessionID: "ses_main" }],
    ])
  })

  test("links: new pairs go to onLink, and a saved subagent link keeps its child session", () => {
    const saved: Link[] = []
    const { mapper } = scripted({
      links: [{ kind: "session", harnessID: "run-1", opencodeID: "ses_saved" }],
      onLink: (link) => saved.push(link),
    })
    const subagent: StreamChunk = {
      type: EventType.SUBAGENT_STARTED,
      subagentRunId: "run-1",
      name: "general",
      parentToolCallId: "call-1",
    }
    const outputs = [
      chunks.started(),
      chunks.runStarted(),
      ...chunks.text("t-1", "Hi."),
      ...chunks.toolCall("call-1", "subagent", { agent: "general", description: "Count", prompt: "Count lines" }),
      subagent,
    ].flatMap((event) => mapper.map({ operationId: "op-1", event }))
    expect(saved).toEqual([{ kind: "message", harnessID: "t-1", opencodeID: "msg_1" }])
    expect(outputs.filter((output) => output.type === "child")).toEqual([
      {
        type: "child",
        sessionID: SessionID.make("ses_saved"),
        parentID: SessionID.make("ses_main"),
        agent: Agent.ID.make("general"),
        title: "Count",
      },
    ])
    expect(mapper.messageID("t-1")).toBe("msg_1")
    expect(mapper.childSessionID("run-1")).toBe("ses_saved")
  })

  test("Code Mode tool calls show as rows of the running execute call", () => {
    const { feed } = scripted()
    const events = feed(
      chunks.started(),
      chunks.runStarted(),
      ...chunks.toolCall("call-1", "execute_typescript", {
        typescriptCode: "await external_read_file({ path: 'a.ts' })",
      }),
      chunks.runFinished("tool_calls"),
      chunks.custom("code_mode:external_call", {
        function: "external_read_file",
        args: { path: "a.ts" },
        toolCallId: "call-1",
      }),
    )
    expect(events.at(-1)).toEqual([
      "session.tool.progress",
      {
        sessionID: "ses_main",
        assistantMessageID: "msg_1",
        id: "call-1",
        metadata: { toolCalls: [{ tool: "read", status: "running", input: { path: "a.ts" } }] },
      },
    ])
  })

  test("a permission ask names the running tool call, and keeps the harness question id", () => {
    const { mapper, feed } = scripted()
    const schema = { type: "object", properties: { answer: { type: "string", enum: ["once", "always", "reject"] } } }
    const events = feed(
      chunks.started(),
      chunks.runStarted(),
      ...chunks.toolCall("call-1", "bash", { command: "git status" }),
      chunks.custom(HARNESS_EVENTS.question, {
        questionId: "q-1",
        message: 'Allow bash {"command":"git status"}? Answer once, always, or reject.',
        schema,
      }),
    )
    expect(events.at(-1)).toEqual([
      "permission.asked",
      {
        id: "per_1",
        sessionID: "ses_main",
        action: "shell",
        resources: ["git status"],
        save: ["git status"],
        source: { type: "tool", messageID: "msg_1", id: "call-1" },
      },
    ])
    expect(mapper.questionID("per_1")).toBe("q-1")
  })

  test("a permission ask names the call whose input it shows, not the newest call of that tool", () => {
    const { feed } = scripted()
    const schema = { type: "object", properties: { answer: { type: "string", enum: ["once", "always", "reject"] } } }
    const events = feed(
      chunks.started(),
      chunks.runStarted(),
      ...chunks.toolCall("call-1", "bash", { command: "rm -rf build" }),
      ...chunks.toolCall("call-2", "bash", { command: "git status" }),
      chunks.custom(HARNESS_EVENTS.question, {
        questionId: "q-1",
        message: 'Allow bash {"command":"rm -rf build"}? Answer once, always, or reject.',
        schema,
      }),
    )
    expect(events.at(-1)).toMatchObject([
      "permission.asked",
      { resources: ["rm -rf build"], source: { type: "tool", id: "call-1" } },
    ])
  })

  test("a failed compaction maps, and a successful one sends nothing without its summary", () => {
    const { feed } = scripted()
    const failed = feed(
      chunks.custom("compaction:started", { reason: "forced" }),
      chunks.custom("compaction:ended", { reason: "forced", error: { message: "too big" } }),
    )
    const succeeded = feed(
      chunks.custom("compaction:started", { reason: "threshold" }),
      chunks.custom("compaction:ended", { reason: "threshold" }),
    )
    expect(failed).toEqual([
      ["session.compaction.started", { sessionID: "ses_main", reason: "manual", recent: "" }],
      [
        "session.compaction.failed",
        {
          sessionID: "ses_main",
          reason: "manual",
          error: { type: "compaction", message: "too big" },
          cost: 0,
          tokens: noTokens,
        },
      ],
    ])
    expect(succeeded).toEqual([])
  })

  test("a manual compaction delivers its inbox item, and maps the summary that the log gives", () => {
    const { mapper, feed } = scripted()
    const summaryModel = { id: Model.ID.make("summary"), providerID: Provider.ID.make("stub") }
    const usage = { promptTokens: 100, completionTokens: 20, totalTokens: 120, cost: 0.25 }
    const ended = chunks.custom("compaction:ended", { reason: "forced", after: 27, usage })
    mapper.compacting(SessionMessage.ID.make("msg_compact"))

    const before = feed(chunks.custom("compaction:started", { reason: "forced" }), chunks.custom("compaction:state", {}))
    const tokensAfter = mapper.compactionEnd({ operationId: "op-1", event: ended })
    mapper.compacted("op-1", { text: "## Objective\n- Say hello", model: summaryModel })
    const events = feed(ended)

    const spent = { tokens: { input: 100, output: 20, reasoning: 0, cache: { read: 0, write: 0 } }, cost: 0.25 }
    expect(before).toEqual([])
    expect(tokensAfter).toBe(27)
    expect(events).toEqual([
      ["session.inbox.delivered", { sessionID: "ses_main", inboxID: "msg_compact" }],
      ["session.compaction.started", { sessionID: "ses_main", reason: "manual", recent: "", inputID: "msg_compact" }],
      ["session.compaction.delta", { sessionID: "ses_main", text: "## Objective\n- Say hello" }],
      ["session.usage.recorded", { sessionID: "ses_main", source: "compaction", ...spent }],
      [
        "session.compaction.ended",
        {
          sessionID: "ses_main",
          reason: "manual",
          model: summaryModel,
          text: "## Objective\n- Say hello",
          recent: "",
          ...spent,
        },
      ],
    ])
  })

  test("a manual compaction with nothing to cut fails with the error of the old runtime", () => {
    const { mapper, feed } = scripted()
    const ended = chunks.custom("compaction:ended", { reason: "forced", after: 11 })
    mapper.compacting(SessionMessage.ID.make("msg_compact"))

    feed(chunks.custom("compaction:started", { reason: "forced" }))
    const tokensAfter = mapper.compactionEnd({ operationId: "op-1", event: ended })
    const events = feed(ended)

    expect(tokensAfter).toBeUndefined()
    expect(events).toEqual([
      ["session.inbox.delivered", { sessionID: "ses_main", inboxID: "msg_compact" }],
      ["session.compaction.started", { sessionID: "ses_main", reason: "manual", recent: "", inputID: "msg_compact" }],
      [
        "session.compaction.failed",
        {
          sessionID: "ses_main",
          reason: "manual",
          error: { type: "compaction.unavailable", message: "Nothing to compact yet" },
          inputID: "msg_compact",
          cost: 0,
          tokens: noTokens,
        },
      ],
    ])
  })
})
