/**
 * The vertical slice: the first end-to-end turns on the TanStack runtime.
 *
 * The tests build the app graph as the server does (`AppNodeBuilder.build` with
 * `TanStackOverrides.replacements`), and drive it through the services that the HTTP routes call:
 * `Session` for prompt, steer, and interrupt, and the location's `Permission` for a reply. The harness host comes
 * from the location graph, and its model calls go through the real TanStack adapter. Only the model is fake: an
 * OpenAI-compatible endpoint on loopback that streams scripted steps.
 *
 * Each test records the Bus and compares the trace with the golden trace of the old runtime, with the documented
 * patches of `session-layer.test.ts`.
 */
import { $ } from "bun"
import { afterAll, describe, expect } from "bun:test"
import path from "path"
import { Effect, Fiber, Schema, Stream } from "effect"
import { Agent } from "@opencode/core/agent"
import { Bus } from "@opencode/core/bus"
import { Config } from "@opencode/core/config"
import { Database } from "@opencode/core/database/database"
import { AppNodeBuilder } from "@opencode/core/effect/app-node-builder"
import { Watcher } from "@opencode/core/filesystem/watcher"
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
import { TanStackOverrides } from "@opencode/core/tanstack/overrides"
import { LayerNode } from "@opencode/util/effect/layer-node"
import { Global } from "@opencode/util/global"
import { tempGlobalLayer } from "../fixture/global"
import { offlineModels } from "../fixture/models"
import { tmpdirScoped } from "../fixture/tmpdir"
import { testEffect } from "../lib/effect"
import { comparable, expectedTrace, harnessResult, rawInput } from "./compare"
import { normalizeTrace, recordTrace } from "./trace"

/** One scripted model response: a text, or tool calls. `hold` runs before the response starts. */
interface Step {
  readonly text?: string
  readonly toolCalls?: ReadonlyArray<{ readonly id: string; readonly name: string; readonly input: unknown }>
  readonly hold?: () => Promise<void>
  /** Streams the text, then keeps the stream open until the client aborts it. */
  readonly hang?: boolean
}

// The steps of the turn requests, in order. A request without tools, such as the session title, does not take one.
const steps: Step[] = []
const turnRequests = { count: 0 }
const encoder = new TextEncoder()
const decodeRequest = Schema.decodeUnknownSync(
  Schema.Struct({
    stream: Schema.optional(Schema.Boolean),
    tools: Schema.optional(Schema.Array(Schema.Unknown)),
  }),
)

const server = Bun.serve({
  hostname: "127.0.0.1",
  port: 0,
  fetch: async (request) => {
    const body = decodeRequest(await request.json())
    const isTurn = (body.tools?.length ?? 0) > 0
    const step = isTurn ? steps.shift() : { text: "Title" }
    if (!step) return new Response("No scripted step left", { status: 500 })
    if (isTurn) turnRequests.count++
    await step.hold?.()
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
  }
}

/** The SSE chunks of a step. Like the scripted model of the golden traces, it reports no token usage. */
function sse(step: Step) {
  const data = (delta: object, finish: string | null) =>
    encoder.encode(`data: ${JSON.stringify({ ...CHUNK, choices: [{ index: 0, delta, finish_reason: finish }] })}\n\n`)
  const toolCalls = (step.toolCalls ?? []).map((call, index) => ({
    index,
    id: call.id,
    type: "function",
    function: { name: call.name, arguments: JSON.stringify(call.input) },
  }))
  const content = [
    ...(step.text === undefined ? [] : [data({ role: "assistant", content: step.text }, null)]),
    ...(toolCalls.length === 0 ? [] : [data({ role: "assistant", tool_calls: toolCalls }, null)]),
  ]
  const end = [data({}, toolCalls.length > 0 ? "tool_calls" : "stop"), encoder.encode("data: [DONE]\n\n")]
  return new ReadableStream<Uint8Array>({
    start: (controller) => {
      content.forEach((chunk) => controller.enqueue(chunk))
      if (step.hang) return
      end.forEach((chunk) => controller.enqueue(chunk))
      controller.close()
    },
  })
}

function script(...next: ReadonlyArray<Step>) {
  steps.length = 0
  turnRequests.count = 0
  steps.push(...next)
}

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
      models: { golden: { name: "Golden", limit: { context: 200_000, output: 32_000 } } },
    },
  },
}

// The app graph of the server.
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
      ...TanStackOverrides.replacements,
    ],
  ),
)

const golden = Model.Ref.make({ id: Model.ID.make("golden"), providerID: Provider.ID.make("test") })

// opencode's instruction tracking. The harness has no such event.
const DROPPED = new Set(["session.instructions.updated"])

/**
 * Creates a git project with `notes.txt`, starts the trace recorder, and creates the session, as the golden traces
 * of the old runtime do.
 */
const setup = Effect.fn("SliceTest.setup")(function* () {
  const tmp = yield* tmpdirScoped()
  yield* Effect.promise(async () => {
    await Bun.write(path.join(tmp.path, "notes.txt"), "alpha\n")
    await $`git init -q`.cwd(tmp.path).quiet()
  })
  const recorder = yield* recordTrace()
  const sessions = yield* Session.Service
  const location = Location.Ref.make({ directory: AbsolutePath.make(tmp.path) })
  const session = yield* sessions.create({ location, title: "Golden", agent: Agent.ID.make("build"), model: golden })
  return {
    directory: tmp.path,
    // Tool output files live under the temp Global directories.
    global: path.dirname((yield* Global.Service).data),
    recorder,
    sessionID: session.id,
    sessions,
    bus: yield* Bus.Service,
    location: LocationServiceMap.Service.get(location),
  }
})

type Context = Effect.Success<ReturnType<typeof setup>>

/** The recorded trace of a scenario, comparable with `expectedTrace`. */
const recorded = (context: Context) =>
  context.recorder.events.pipe(
    Effect.map((events) => comparable(normalizeTrace(events, { roots: [context.directory, context.global] }))),
  )

const runTurn = (context: Context, text: string) =>
  Effect.gen(function* () {
    yield* context.sessions.prompt({ sessionID: context.sessionID, text })
    yield* context.sessions.wait(context.sessionID)
  })

/** Replies `once` to each permission ask with the location's `Permission`, as the permission reply route does. */
const allowPermissions = (context: Context) =>
  context.bus.subscribe(Permission.Event.Asked).pipe(
    Stream.runForEach((event) =>
      Permission.Service.use((permission) => permission.reply({ requestID: event.data.id, reply: "once" })).pipe(
        Effect.provide(context.location),
        Effect.orDie,
      ),
    ),
    Effect.forkScoped({ startImmediately: true }),
  )

describe("vertical slice: the server graph", () => {
  it.live(
    "text-turn",
    () =>
      Effect.gen(function* () {
        const context = yield* setup()
        script({ text: "Hello there" })

        yield* runTurn(context, "Say hello")

        expect(yield* recorded(context)).toEqual(yield* expectedTrace("text-turn", { drop: DROPPED }))
      }),
    60_000,
  )

  it.live(
    "tool-permission",
    () =>
      Effect.gen(function* () {
        const context = yield* setup()
        yield* allowPermissions(context)
        yield* context.sessions.setPermissions({
          sessionID: context.sessionID,
          permissions: [{ action: "edit", resource: "*", effect: "ask" }],
        })
        script(
          { toolCalls: [{ id: "call-read", name: "read_file", input: { path: "notes.txt" } }] },
          { toolCalls: [{ id: "call-edit", name: "edit_file", input: { path: "notes.txt", old: "alpha", new: "beta" } }] },
          { text: "I changed alpha to beta." },
        )

        yield* runTurn(context, "Change alpha to beta in notes.txt")

        expect(yield* recorded(context)).toEqual(
          yield* expectedTrace("tool-permission", {
            drop: DROPPED,
            patches: [
              rawInput("call-read", '{"path":"notes.txt"}'),
              rawInput("call-edit", '{"path":"notes.txt","old":"alpha","new":"beta"}'),
              harnessResult("call-read", "1\talpha"),
              harnessResult("call-edit", "Edited notes.txt (1 change)."),
              // opencode's edit tool computes a diff preview before it asks. The harness asks before the tool runs.
              { type: "permission.asked", unset: ["metadata"] },
            ],
          }),
        )
        expect(yield* Effect.promise(() => Bun.file(path.join(context.directory, "notes.txt")).text())).toBe("beta\n")
      }),
    60_000,
  )

  it.live(
    "steer",
    () =>
      Effect.gen(function* () {
        const context = yield* setup()
        const called = Promise.withResolvers<void>()
        const steered = Promise.withResolvers<void>()
        // The first model call waits until the steer is in the inbox, so the steer joins the running turn.
        script(
          {
            text: "First answer",
            hold: () => {
              called.resolve()
              return steered.promise
            },
          },
          { text: "Answer with the steer" },
        )

        yield* context.sessions.prompt({ sessionID: context.sessionID, text: "First question" })
        yield* Effect.promise(() => called.promise)
        yield* context.sessions.prompt({ sessionID: context.sessionID, text: "Also answer this" })
        steered.resolve()
        yield* context.sessions.wait(context.sessionID)

        expect(yield* recorded(context)).toEqual(yield* expectedTrace("steer", { drop: DROPPED }))
        expect(turnRequests.count).toBe(2)
      }),
    60_000,
  )

  it.live(
    "interrupt",
    () =>
      Effect.gen(function* () {
        const context = yield* setup()
        script({ text: "Partial", hang: true })
        const delta = yield* context.bus
          .subscribe(SessionEvent.Text.Delta)
          .pipe(Stream.runHead, Effect.forkScoped({ startImmediately: true }))

        yield* context.sessions.prompt({ sessionID: context.sessionID, text: "Write a long story" })
        yield* Fiber.join(delta)
        const interrupted = yield* context.sessions.interrupt(context.sessionID)
        yield* context.sessions.wait(context.sessionID)

        expect(interrupted).toBe(true)
        expect(yield* recorded(context)).toEqual(yield* expectedTrace("interrupt", { drop: DROPPED }))
      }),
    60_000,
  )
})
