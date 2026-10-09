/**
 * The parity sweep: the golden traces and the other runtime scenarios on the TanStack runtime.
 *
 * The tests build the app graph as the server does with `OPENCODE_RUNTIME=tanstack` (see `slice.test.ts`), and
 * drive it through the services that the HTTP routes call. Only the model is fake: an OpenAI-compatible endpoint
 * on loopback that streams scripted steps and records each request.
 *
 * Each golden test compares the recorded Bus trace with the golden trace of the old runtime. Each difference that
 * stays is a named patch or omission, with a comment that names its cause: a gap of TanStack AI from
 * `.agent/scratch/tanstack-gaps.md`, or a documented difference of the harness tools.
 */
import { $ } from "bun"
import { afterAll, describe, expect } from "bun:test"
import path from "path"
import { Cause, Context, Duration, Effect, Exit, Fiber, Option, Schema, Stream } from "effect"
import { EventType } from "@tanstack/ai"
import { Event as ConfigEvent } from "@opencode/schema/config"
import type { Event } from "@opencode/schema/event"
import { Agent } from "@opencode/core/agent"
import { Bus } from "@opencode/core/bus"
import { Config } from "@opencode/core/config"
import { Database } from "@opencode/core/database/database"
import { AppNodeBuilder } from "@opencode/core/effect/app-node-builder"
import { Watcher } from "@opencode/core/filesystem/watcher"
import { Form } from "@opencode/core/form"
import { InstructionDiscovery } from "@opencode/core/instruction-discovery"
import { Job } from "@opencode/core/job"
import { Location } from "@opencode/core/location"
import { LocationServiceMap } from "@opencode/core/location-service-map"
import { Model } from "@opencode/core/model"
import { Permission } from "@opencode/core/permission"
import { PermissionSaved } from "@opencode/core/permission/saved"
import { Provider } from "@opencode/core/provider"
import { AbsolutePath } from "@opencode/core/schema"
import { Session } from "@opencode/core/session"
import { SessionEvent } from "@opencode/core/session/event"
import { TanStackHost } from "@opencode/core/tanstack/host"
import { TanStackOverrides } from "@opencode/core/tanstack/overrides"
import { TanStackSession } from "@opencode/core/tanstack/session-layer"
import { LayerNode } from "@opencode/util/effect/layer-node"
import { Global } from "@opencode/util/global"
import { tempGlobalLayer } from "../fixture/global"
import { offlineModels } from "../fixture/models"
import { tmpdirScoped } from "../fixture/tmpdir"
import { testEffect } from "../lib/effect"
import { comparable, compactionSlice, expectedTrace, from, harnessResult, rawInput, without } from "./compare"
import type { Selector } from "./compare"
import { normalizeTrace, recordTrace } from "./trace"
import type { Trace } from "./trace"

/** One scripted model response: a text, or tool calls. */
interface Step {
  readonly text?: string
  readonly toolCalls?: ReadonlyArray<{ readonly id: string; readonly name: string; readonly input: unknown }>
  /** The token usage that the response reports. Without it, none, like the scripted model of the golden traces. */
  readonly usage?: { readonly prompt: number; readonly completion: number }
}

/** One turn request that reached the fake model. */
interface TurnRequest {
  readonly path: string
  readonly headers: Headers
  readonly model: string
}

const SUMMARY = "## Objective\n- Say hello"
const TITLE = "Counting lines"

// The steps of the turn requests, in order. A request without tools (a title or a summary) does not take one.
const steps: Step[] = []
const turnRequests: TurnRequest[] = []
const encoder = new TextEncoder()
const decodeRequest = Schema.decodeUnknownSync(
  Schema.fromJsonString(
    Schema.Struct({
      model: Schema.String,
      stream: Schema.optional(Schema.Boolean),
      tools: Schema.optional(Schema.Array(Schema.Unknown)),
    }),
  ),
)

const server = Bun.serve({
  hostname: "127.0.0.1",
  port: 0,
  fetch: async (request) => {
    const text = await request.text()
    const body = decodeRequest(text)
    const isTurn = (body.tools?.length ?? 0) > 0
    if (isTurn) turnRequests.push({ path: new URL(request.url).pathname, headers: request.headers, model: body.model })
    // A request without tools asks for a title or for a compaction summary. Like the scripted model of the old
    // runtime, it reports zero tokens.
    const step = isTurn
      ? steps.shift()
      : { text: /title/i.test(text) ? TITLE : SUMMARY, usage: { prompt: 0, completion: 0 } }
    if (!step) return new Response("No scripted step left", { status: 500 })
    if (!body.stream) return Response.json(completion(step))
    return new Response(sse(step), { headers: { "content-type": "text/event-stream" } })
  },
})
afterAll(() => server.stop(true))

const CHUNK = { id: "chatcmpl-1", object: "chat.completion.chunk", created: 0, model: "golden" }

function completion(step: Step) {
  return {
    id: "chatcmpl-1",
    object: "chat.completion",
    created: 0,
    model: "golden",
    choices: [{ index: 0, message: { role: "assistant", content: step.text ?? "" }, finish_reason: "stop" }],
    ...(step.usage ? { usage: usageOf(step.usage) } : {}),
  }
}

/** The usage of a response, as the OpenAI API reports it. */
function usageOf(usage: NonNullable<Step["usage"]>) {
  return { prompt_tokens: usage.prompt, completion_tokens: usage.completion, total_tokens: usage.prompt + usage.completion }
}

/** The SSE chunks of a step. */
function sse(step: Step) {
  const data = (fields: object) => encoder.encode(`data: ${JSON.stringify({ ...CHUNK, ...fields })}\n\n`)
  const choice = (delta: object, finish: string | null) => data({ choices: [{ index: 0, delta, finish_reason: finish }] })
  const toolCalls = (step.toolCalls ?? []).map((call, index) => ({
    index,
    id: call.id,
    type: "function",
    function: { name: call.name, arguments: JSON.stringify(call.input) },
  }))
  const chunks = [
    ...(step.text === undefined ? [] : [choice({ role: "assistant", content: step.text }, null)]),
    ...(toolCalls.length === 0 ? [] : [choice({ role: "assistant", tool_calls: toolCalls }, null)]),
    choice({}, toolCalls.length > 0 ? "tool_calls" : "stop"),
    ...(step.usage ? [data({ choices: [], usage: usageOf(step.usage) })] : []),
    encoder.encode("data: [DONE]\n\n"),
  ]
  return new ReadableStream<Uint8Array>({
    start: (controller) => {
      chunks.forEach((chunk) => controller.enqueue(chunk))
      controller.close()
    },
  })
}

function script(...next: ReadonlyArray<Step>) {
  steps.length = 0
  turnRequests.length = 0
  steps.push(...next)
}

// A model setting of every test model.
const LIMIT = { context: 200_000, output: 32_000 }
// The base URL of the ChatGPT Codex backend, which has no TanStack adapter.
const CODEX_BASE_URL = "https://chatgpt.com/backend-api/codex"

const config = {
  // The build agent asks before an edit, so the tool turn has a permission ask.
  permissions: [{ action: "edit", resource: "*", effect: "ask" }],
  model: "test/golden",
  small_model: "test/golden",
  providers: {
    test: {
      name: "Test",
      package: "@opencode/ai/providers/openai-compatible",
      settings: { baseURL: new URL("v1", server.url).href, apiKey: "test-key" },
      models: {
        golden: { name: "Golden", limit: LIMIT },
        other: { name: "Other", limit: LIMIT },
        // $2 for each million input tokens, and $10 for each million output tokens.
        priced: { name: "Priced", limit: LIMIT, cost: { input: 2, output: 10 } },
      },
    },
    // Copilot's Chat Completions endpoint, on the fake model.
    "github-copilot": {
      name: "GitHub Copilot",
      package: "aisdk:@ai-sdk/github-copilot",
      settings: { baseURL: new URL("copilot", server.url).href, apiKey: "gho_test", endpoint: "chat" },
      models: { "gpt-4.1": { name: "GPT-4.1", limit: LIMIT } },
    },
    openai: {
      name: "OpenAI",
      package: "@opencode/ai/providers/openai",
      settings: { baseURL: CODEX_BASE_URL, apiKey: "codex-key" },
      models: { "gpt-5.5": { name: "GPT-5.5", limit: LIMIT } },
    },
  },
}

// The app graph of the server with OPENCODE_RUNTIME=tanstack.
const it = testEffect(
  AppNodeBuilder.build(
    LayerNode.group([
      Bus.node,
      Global.node,
      Database.node,
      Job.node,
      Session.node,
      PermissionSaved.node,
      LocationServiceMap.node,
    ]),
    [
      Global.node.replace(tempGlobalLayer),
      // No config, skills, or AGENTS.md from the user's home or the project's ancestors.
      Config.node.replace(Config.configured({ project: false, global: false, content: JSON.stringify(config) })),
      InstructionDiscovery.node.replace(InstructionDiscovery.configured({ project: false, global: false })),
      offlineModels,
      Watcher.node.replace(Watcher.configured({ enabled: false })),
      ...TanStackOverrides.forRuntime("tanstack"),
    ],
  ),
)

const modelRef = (providerID: string, id: string) =>
  Model.Ref.make({ id: Model.ID.make(id), providerID: Provider.ID.make(providerID) })
const golden = modelRef("test", "golden")

// opencode's instruction tracking. The harness has no such event.
const DROPPED = new Set(["session.instructions.updated"])

/**
 * Creates a git project with `notes.txt`, starts the trace recorder, and creates the session, as the golden traces
 * of the old runtime do. `title: undefined` gives the session opencode's default title.
 */
const setup = Effect.fn("ParityTest.setup")(function* (
  input: { readonly title?: string | undefined; readonly model?: Model.Ref } = {},
) {
  const tmp = yield* tmpdirScoped()
  yield* Effect.promise(async () => {
    await Bun.write(path.join(tmp.path, "notes.txt"), "alpha\n")
    await $`git init -q`.cwd(tmp.path).quiet()
  })
  const recorder = yield* recordTrace()
  const sessions = yield* Session.Service
  const location = Location.Ref.make({ directory: AbsolutePath.make(tmp.path) })
  const title = "title" in input ? input.title : "Golden"
  const session = yield* sessions.create({
    location,
    agent: Agent.ID.make("build"),
    model: input.model ?? golden,
    ...(title === undefined ? {} : { title }),
  })
  return {
    directory: tmp.path,
    // Tool output files live under the temp Global directories.
    global: path.dirname((yield* Global.Service).data),
    recorder,
    sessionID: session.id,
    sessions,
    bus: yield* Bus.Service,
    ref: location,
    location: LocationServiceMap.Service.get(location),
  }
})

type Context = Effect.Success<ReturnType<typeof setup>>

/** The recorded events with stable placeholders, in publish order. */
const events = (context: Context) =>
  context.recorder.events.pipe(
    Effect.map((recorded) => normalizeTrace(recorded, { roots: [context.directory, context.global] })),
  )

/** The recorded trace of a scenario, without the `omit` events, comparable with `expectedTrace`. */
const recorded = (
  context: Context,
  input: { readonly omit?: ReadonlyArray<Selector>; readonly select?: (trace: Trace) => Trace } = {},
) =>
  events(context).pipe(
    Effect.map((trace) => comparable((input.select ?? ((all: Trace) => all))(without(trace, input.omit ?? [])))),
  )

/** The event types of a trace, from the first event of type `type`. */
function typesFrom(trace: Trace, type: string) {
  return from(type)(trace).map((event) => event.type)
}

/** The data of each event of type `type`. */
function dataOf(trace: Trace, type: string) {
  return trace.flatMap((event) => (event.type === type ? [event.data] : []))
}

const runTurn = (context: Context, text: string) =>
  Effect.gen(function* () {
    const message = yield* context.sessions.prompt({ sessionID: context.sessionID, text })
    yield* context.sessions.wait(context.sessionID)
    return message
  })

/** Replies to each permission ask with the location's `Permission`, as the permission reply route does. */
const replyPermissions = (context: Context, reply: "once" | "reject") =>
  context.bus.subscribe(Permission.Event.Asked).pipe(
    Stream.runForEach((event) =>
      Permission.Service.use((permission) => permission.reply({ requestID: event.data.id, reply })).pipe(
        Effect.provide(context.location),
        Effect.orDie,
      ),
    ),
    Effect.forkScoped({ startImmediately: true }),
  )

/** Waits in the background for the next event of a type. Join the fiber to wait. */
const nextEvent = <D extends Event.Definition>(context: Context, definition: D) =>
  context.bus.subscribe(definition).pipe(Stream.runHead, Effect.forkScoped({ startImmediately: true }))

const readNotes = (context: Context) =>
  Effect.promise(() => Bun.file(path.join(context.directory, "notes.txt")).text())

// Prints `done` once a `release` file exists in the working directory: the command of the golden trace.
const HOLD_COMMAND = `bun -e "const fs=require('fs');for(let i=0;i<3000;i++){if(fs.existsSync('release'))break;Bun.sleepSync(10)}console.log('done')"`

describe("parity sweep: golden traces on the server graph with OPENCODE_RUNTIME=tanstack", () => {
  it.live(
    "subagent",
    () =>
      Effect.gen(function* () {
        const context = yield* setup()
        yield* replyPermissions(context, "once")
        const subagentInput = { agent: "general", description: "Count notes", prompt: "Count the lines in notes.txt" }
        script(
          { toolCalls: [{ id: "call-subagent", name: "subagent", input: subagentInput }] },
          { text: "notes.txt has one line." },
          { text: "The subagent says one line." },
        )

        yield* runTurn(context, "Ask a subagent to count lines")

        expect(yield* recorded(context)).toEqual(
          yield* expectedTrace("subagent", {
            drop: DROPPED,
            patches: [
              rawInput("call-subagent", JSON.stringify(subagentInput)),
              // Not a TanStack gap: opencode's `subagent` tool adds its own note to the child prompt, and the harness
              // `subagent` tool sends the prompt as the model wrote it (the same patch as in `events.test.ts`).
              {
                type: "session.inbox.enqueued",
                where: { sessionID: "ses_15" },
                set: { item: { type: "user", payload: { text: subagentInput.prompt }, delivery: "steer" } },
              },
            ],
          }),
        )
      }),
    60_000,
  )

  it.live(
    "question",
    () =>
      Effect.gen(function* () {
        const context = yield* setup()
        yield* context.bus.subscribe(Form.Event.Created).pipe(
          Stream.runForEach((event) =>
            Form.Service.use((forms) => forms.reply({ id: event.data.form.id, answer: { q0: "Red" } })).pipe(
              Effect.provide(context.location),
              Effect.orDie,
            ),
          ),
          Effect.forkScoped({ startImmediately: true }),
        )
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
        script(
          { toolCalls: [{ id: "call-question", name: "question", input: { questions } }] },
          { text: "You picked red." },
        )

        yield* runTurn(context, "Ask me for a color")

        expect(yield* recorded(context)).toEqual(
          yield* expectedTrace("question", {
            drop: DROPPED,
            patches: [
              rawInput("call-question", JSON.stringify({ questions })),
              // Gap tool-name-map "answers only in result text": the harness `question` tool writes its own text.
              harnessResult("call-question", "Which color?\nAnswer: Red"),
            ],
          }),
        )
      }),
    60_000,
  )

  it.live(
    "fork",
    () =>
      Effect.gen(function* () {
        const context = yield* setup()
        script({ text: "Hello there" })

        yield* runTurn(context, "Say hello")
        yield* context.sessions.fork({ sessionID: context.sessionID })

        expect(yield* recorded(context)).toEqual(
          yield* expectedTrace("fork", {
            drop: DROPPED,
            // The fork copies the instruction state of the parent. The harness keeps its instructions in its own
            // prompt (`projectInstructions`), so the parent has no `session.instructions.updated` and no state.
            patches: [{ type: "session.forked", unset: ["instructions"] }],
          }),
        )
      }),
    60_000,
  )

  it.live(
    "background-shell",
    () =>
      Effect.gen(function* () {
        const context = yield* setup()
        yield* replyPermissions(context, "once")
        // The job waits for a `release` file, so it always ends after the first turn and starts a second turn.
        const release = path.join(context.directory, "release")
        yield* Effect.addFinalizer(() => Effect.promise(() => Bun.write(release, "")))
        const input = { command: HOLD_COMMAND, background: true }
        script(
          { toolCalls: [{ id: "call-shell", name: "bash", input }] },
          { text: "Started the job." },
          { text: "The job printed done." },
        )

        yield* runTurn(context, "Run the job in the background")
        const resumed = yield* nextEvent(context, SessionEvent.Execution.Succeeded)
        yield* Effect.promise(() => Bun.write(release, ""))
        yield* Fiber.join(resumed)

        // Gap permission-rules "shell syntax is never allowed": the command has `;` and `(`, so the harness asks
        // before it runs, and opencode allows it. The test allows the ask.
        expect(yield* recorded(context, { omit: [{ type: "permission.asked" }, { type: "permission.replied" }] })).toEqual(
          yield* expectedTrace("background-shell", {
            drop: DROPPED,
            omit: [
              // Gap tool-name-map "no bg output path": the harness `bash` tool sends no progress with the job id.
              { type: "session.tool.progress", where: { id: "call-shell" } },
              // Gap event-mapper 5 "`harness.input.accepted`/`applied` have no message text": the harness note of the
              // ended job is an input with no inbox item, so the second turn starts with no inbox events.
              { type: "session.inbox.enqueued", where: { inboxID: "msg_29" } },
              { type: "session.inbox.delivered", where: { inboxID: "msg_29" } },
            ],
            patches: [
              rawInput("call-shell", JSON.stringify(input)),
              // Gap tool-name-map "no bg output path": the harness job has its own id and no output file.
              {
                type: "session.tool.success",
                where: { id: "call-shell" },
                set: {
                  content: [{ type: "text", text: "Command moved to the background (shell ID: bash-1)." }],
                  metadata: { status: "running", truncated: false, shellID: "bash-1" },
                },
              },
            ],
          }),
        )
      }),
    60_000,
  )

  it.live(
    "compaction",
    () =>
      Effect.gen(function* () {
        const context = yield* setup()
        // Over the 15,000 tokens that the compaction keeps, so the compaction cuts the first turn.
        script({ text: "Hello there. ".repeat(6_000) }, { text: "Hello again" })

        yield* runTurn(context, "Say hello")
        const admitted = yield* context.sessions.compact({ sessionID: context.sessionID })
        yield* context.sessions.wait(context.sessionID)
        const waiting = yield* context.sessions.inbox(context.sessionID)
        // Gap compaction "middleware cannot compact outside a model call" (and session-facade "no manual compaction
        // outside a turn"): the compaction waits for the next turn, and runs inside it.
        yield* runTurn(context, "Say it again")

        expect(waiting.map((item) => item.id)).toEqual([admitted.id])
        expect(yield* context.sessions.inbox(context.sessionID)).toEqual([])
        // Only the compaction events compare: the old runtime ran the compaction as its own busy period, and the
        // harness runs it inside the next turn, after that turn's `inbox.delivered` and `step.started`.
        expect(yield* recorded(context, { select: compactionSlice })).toEqual(
          yield* expectedTrace("compaction", { drop: DROPPED, select: compactionSlice }),
        )
      }),
    60_000,
  )

  it.live(
    "revert: the golden scenario reverts the first message, which the harness cannot do",
    () =>
      Effect.gen(function* () {
        const context = yield* setup()
        yield* replyPermissions(context, "once")
        script(
          { toolCalls: [{ id: "call-edit", name: "edit_file", input: { path: "notes.txt", old: "alpha", new: "beta" } }] },
          { text: "Done." },
        )
        const message = yield* runTurn(context, "Change alpha to beta")

        const exit = yield* context.sessions.revert
          .stage({ sessionID: context.sessionID, messageID: message.id, files: true })
          .pipe(Effect.exit)

        // Gap session-facade "`revert(messageId)` keeps that message; nothing can revert the first message".
        expect(Exit.isFailure(exit) && Cause.squash(exit.cause)).toBeInstanceOf(TanStackSession.NotSupportedError)
      }),
    60_000,
  )

  it.live(
    "revert: stage, clear, stage, and commit of a later turn",
    () =>
      Effect.gen(function* () {
        const context = yield* setup()
        yield* replyPermissions(context, "once")
        script(
          { text: "Hello there" },
          { toolCalls: [{ id: "call-edit", name: "edit_file", input: { path: "notes.txt", old: "alpha", new: "beta" } }] },
          { text: "Done." },
        )
        yield* runTurn(context, "Say hello")
        const message = yield* runTurn(context, "Change alpha to beta")
        const sessionID = context.sessionID

        yield* context.sessions.revert.stage({ sessionID, messageID: message.id, files: true })
        const staged = yield* readNotes(context)
        yield* context.sessions.revert.clear(sessionID)
        yield* context.sessions.wait(sessionID)
        const cleared = yield* readNotes(context)
        yield* context.sessions.revert.stage({ sessionID, messageID: message.id, files: true })
        yield* context.sessions.revert.commit(sessionID)

        expect({ staged, cleared }).toEqual({ staged: "alpha\n", cleared: "beta\n" })
        // The revert events of the golden trace, from the first `revert.staged`.
        expect(yield* recorded(context, { select: from("session.revert.staged") })).toEqual(
          yield* expectedTrace("revert", {
            drop: DROPPED,
            select: from("session.revert.staged"),
            // Gap event-mapper 10 "`harness.revert` has no files or snapshot": the staged revert names only the
            // message.
            patches: [{ type: "session.revert.staged", set: { revert: { messageID: "msg_4" } } }],
          }),
        )
      }),
    60_000,
  )
})

describe("parity sweep: scenarios with no golden trace", () => {
  it.live(
    "a declined permission fails the tool and the step, and interrupts the turn, as on opencode's runtime",
    () =>
      Effect.gen(function* () {
        const context = yield* setup()
        yield* replyPermissions(context, "reject")
        const input = { path: "notes.txt", old: "alpha", new: "beta" }
        script({ toolCalls: [{ id: "call-edit", name: "edit_file", input }] }, { text: "Never shown" })

        yield* runTurn(context, "Change alpha to beta in notes.txt")

        // What opencode's runtime publishes after the reply (recorded once with `TestLLM` on the old runtime).
        const trace = yield* events(context)
        const noTokens = { input: 0, output: 0, reasoning: 0, cache: { read: 0, write: 0 } }
        expect(typesFrom(trace, "permission.replied")).toEqual([
          "permission.replied",
          "session.tool.failed",
          "session.step.failed",
          "session.usage.updated",
          "session.execution.interrupted",
        ])
        expect(dataOf(trace, "session.tool.failed")).toMatchObject([
          { id: "call-edit", error: { type: "aborted", message: "The user declined this tool call" }, executed: false },
        ])
        expect(dataOf(trace, "session.step.failed")).toMatchObject([
          { error: { type: "aborted", message: "Step interrupted" }, cost: 0, tokens: noTokens, files: [] },
        ])
        // opencode's runtime says `shutdown` here, because its drain interrupts itself with no reason, and so the
        // session never shows as idle. The TanStack runtime says `user`.
        expect(dataOf(trace, "session.execution.interrupted")).toMatchObject([{ reason: "user" }])
        expect(yield* readNotes(context)).toBe("alpha\n")
        expect(steps).toEqual([{ text: "Never shown" }])
      }),
    60_000,
  )

  it.live(
    "reload: a config update mid-session rebuilds the harness, and the session keeps working",
    () =>
      Effect.gen(function* () {
        const context = yield* setup()
        script({ text: "Hello there" }, { text: "Still here" })
        yield* runTurn(context, "Say hello")
        // The live harness session of the session, on the host of its location.
        const services = yield* (yield* LocationServiceMap.Service).contextEffect(context.ref)
        const host = Option.getOrThrow(Context.getOption(services, TanStackHost.Service))
        const harness = yield* host.open(context.sessionID).pipe(Effect.orDie)
        const controller = new AbortController()
        yield* Effect.addFinalizer(() => Effect.sync(() => controller.abort()))
        const reloaded = (async () => {
          for await (const entry of harness.events({ from: harness.snapshot().cursor, signal: controller.signal }))
            if (entry.event.type === EventType.CUSTOM && entry.event.name === "harness.reloaded") return true
          return false
        })()

        // What the config of the location publishes when its files change.
        yield* context.bus.publish(ConfigEvent.Updated, {}, { location: context.ref })
        const isReloaded = yield* Effect.promise(() => reloaded)
        yield* runTurn(context, "Are you still there?")

        expect(isReloaded).toBe(true)
        const messages = yield* context.sessions.messages({ sessionID: context.sessionID, order: "asc" })
        expect(
          messages.flatMap((message) =>
            message.type === "assistant"
              ? [message.content.flatMap((part) => (part.type === "text" ? [part.text] : [])).join("")]
              : [],
          ),
        ).toEqual(["Hello there", "Still here"])
        expect(typesFrom(yield* events(context), "session.execution.started").at(-1)).toBe(
          "session.execution.succeeded",
        )
      }),
    60_000,
  )

  it.live(
    "title: a session with opencode's default title gets a title from its first message",
    () =>
      Effect.gen(function* () {
        const context = yield* setup({ title: undefined })
        const renamed = yield* nextEvent(context, SessionEvent.Renamed)
        script({ text: "Hello there" })

        yield* runTurn(context, "Count the lines in notes.txt")
        const event = yield* Fiber.join(renamed).pipe(Effect.timeout(Duration.seconds(10)))

        expect(Option.map(event, (item) => item.data.title)).toEqual(Option.some(TITLE))
        expect((yield* context.sessions.get(context.sessionID)).title).toBe(TITLE)
      }),
    60_000,
  )

  it.live(
    "usage and cost: a step costs what the catalog price says, and the session usage adds it up",
    () =>
      Effect.gen(function* () {
        const context = yield* setup({ model: modelRef("test", "priced") })
        script({ text: "Hello there", usage: { prompt: 1_000, completion: 500 } })

        yield* runTurn(context, "Say hello")

        // 1,000 input tokens at $2 and 500 output tokens at $10 for each million tokens.
        const spent = { cost: 0.007, tokens: { input: 1_000, output: 500, reasoning: 0, cache: { read: 0, write: 0 } } }
        const trace = yield* events(context)
        expect(dataOf(trace, "session.step.ended")).toMatchObject([{ finish: "stop", ...spent }])
        expect(dataOf(trace, "session.usage.updated")).toMatchObject([spent])
      }),
    60_000,
  )

  it.live(
    "model switch: the next turn goes to the other model",
    () =>
      Effect.gen(function* () {
        const context = yield* setup()
        script({ text: "From golden" }, { text: "From other" })
        yield* runTurn(context, "First")

        yield* context.sessions.switchModel({ sessionID: context.sessionID, model: modelRef("test", "other") })
        yield* runTurn(context, "Second")

        expect(turnRequests.map((request) => request.model)).toEqual(["golden", "other"])
        expect(dataOf(yield* events(context), "session.step.started")).toMatchObject([
          { model: { id: "golden", providerID: "test" } },
          { model: { id: "other", providerID: "test" } },
        ])
      }),
    60_000,
  )

  it.live(
    "Copilot wire: a turn reaches the Copilot endpoint with the Copilot headers",
    () =>
      Effect.gen(function* () {
        const context = yield* setup({ model: modelRef("github-copilot", "gpt-4.1") })
        script({ text: "Hello there" })

        yield* runTurn(context, "Say hello")

        expect(
          turnRequests.map((request) => ({
            path: request.path,
            model: request.model,
            authorization: request.headers.get("authorization"),
            intent: request.headers.get("openai-intent"),
            initiator: request.headers.get("x-initiator"),
            hasApiVersion: request.headers.has("x-github-api-version"),
          })),
        ).toEqual([
          {
            path: "/copilot/chat/completions",
            model: "gpt-4.1",
            authorization: "Bearer gho_test",
            intent: "conversation-edits",
            initiator: "user",
            hasApiVersion: true,
          },
        ])
        const copilot = { id: "gpt-4.1", providerID: "github-copilot" }
        expect(yield* recorded(context)).toEqual(
          yield* expectedTrace("text-turn", {
            drop: DROPPED,
            patches: [
              { type: "session.created", set: { model: copilot } },
              { type: "session.step.started", set: { model: copilot } },
            ],
          }),
        )
      }),
    60_000,
  )

  it.live(
    "Codex wire: the ChatGPT Codex backend fails the turn with a clear error",
    () =>
      Effect.gen(function* () {
        const context = yield* setup({ model: modelRef("openai", "gpt-5.5") })
        script()

        const message = yield* runTurn(context, "Say hello")

        const trace = yield* events(context)
        expect(turnRequests).toEqual([])
        expect(typesFrom(trace, "session.inbox.enqueued")).toEqual([
          "session.inbox.enqueued",
          "session.execution.started",
          "session.execution.failed",
        ])
        expect(dataOf(trace, "session.execution.failed")).toMatchObject([
          {
            error: {
              type: "provider.no-route",
              message:
                'openai/gpt-5.5 does not work on the TanStack runtime (OPENCODE_RUNTIME=tanstack): the ChatGPT Codex backend has no TanStack AI adapter. Run /connect, choose OpenAI, and select "Sign in with ChatGPT"',
            },
          },
        ])
        // As on opencode's runtime, the prompt stays in the inbox.
        expect((yield* context.sessions.inbox(context.sessionID)).map((item) => item.id)).toEqual([message.id])
      }),
    60_000,
  )
})
