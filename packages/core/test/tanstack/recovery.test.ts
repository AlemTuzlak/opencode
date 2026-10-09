/**
 * Crash recovery and cancel on the TanStack runtime.
 *
 * Each test builds the server's app graph on a SQLite file. A "process" is one
 * build of that graph. A crash closes it, as a stop for a deploy does (the hosts close with `recoverable: true`),
 * and a second process on the same file boots and runs `SessionRestart`, as the server does. Only the model is fake:
 * an OpenAI-compatible endpoint on loopback that streams scripted steps.
 */
import { $ } from "bun"
import { afterAll, describe, expect } from "bun:test"
import path from "path"
import { Effect, Exit, Fiber, Layer, Option, Schema, Scope, Stream } from "effect"
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
import { SessionExecution } from "@opencode/core/session/execution"
import { SessionRestart } from "@opencode/core/session/execution/restart"
import { SessionStore } from "@opencode/core/session/store"
import { TanStackOverrides } from "@opencode/core/tanstack/overrides"
import { LayerNode } from "@opencode/util/effect/layer-node"
import { Global } from "@opencode/util/global"
import { tmpdirScoped } from "../fixture/tmpdir"
import { offlineModels } from "../fixture/models"
import { it } from "../lib/effect"
import { recordTrace } from "./trace"

/** One scripted model response. */
interface Step {
  readonly text?: string
  readonly toolCalls?: ReadonlyArray<{ readonly id: string; readonly name: string; readonly input: unknown }>
  /** Streams the text, then keeps the stream open until the client cuts it. */
  readonly hang?: boolean
}

const decodeRequest = Schema.decodeUnknownSync(
  Schema.Struct({
    model: Schema.String,
    stream: Schema.optional(Schema.Boolean),
    tools: Schema.optional(Schema.Array(Schema.Unknown)),
    messages: Schema.Array(Schema.Unknown),
  }),
)
type Request = ReturnType<typeof decodeRequest>

/**
 * The fake model. A turn request (a request with tools) takes the step that `route` picks, else the next of
 * `steps`. A request without tools (the title, a summary) gets "Title".
 */
const model = {
  steps: [] as Step[],
  route: undefined as ((request: Request) => Step | undefined) | undefined,
  requests: [] as Request[],
  /** Resolves when a hanging step starts, and when the client cuts it. */
  hanging: Promise.withResolvers<void>(),
  cut: Promise.withResolvers<void>(),
}

function script(steps: ReadonlyArray<Step>, route?: (request: Request) => Step | undefined) {
  model.steps = [...steps]
  model.route = route
  model.requests = []
  model.hanging = Promise.withResolvers<void>()
  model.cut = Promise.withResolvers<void>()
}

const CHUNK = { id: "chatcmpl-1", object: "chat.completion.chunk", created: 0 }
const encoder = new TextEncoder()

const server = Bun.serve({
  // A hanging step waits for the client to cut it, longer than the default idle time.
  idleTimeout: 0,
  hostname: "127.0.0.1",
  port: 0,
  fetch: async (request) => {
    const body = decodeRequest(await request.json())
    const isTurn = (body.tools?.length ?? 0) > 0
    if (isTurn) model.requests.push(body)
    const step = isTurn ? (model.route?.(body) ?? model.steps.shift() ?? { text: "No step left" }) : { text: "Title" }
    if (!body.stream)
      return Response.json({
        ...CHUNK,
        object: "chat.completion",
        model: body.model,
        choices: [{ index: 0, message: { role: "assistant", content: step.text ?? "" }, finish_reason: "stop" }],
      })
    return new Response(sse(body.model, step), { headers: { "content-type": "text/event-stream" } })
  },
})
afterAll(() => server.stop(true))

function sse(name: string, step: Step) {
  const data = (delta: object, finish: string | null) =>
    encoder.encode(
      `data: ${JSON.stringify({ ...CHUNK, model: name, choices: [{ index: 0, delta, finish_reason: finish }] })}\n\n`,
    )
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
      if (step.hang) {
        // A comment, so a step with no text still sends something before it hangs.
        controller.enqueue(encoder.encode(": waiting\n\n"))
        model.hanging.resolve()
        return
      }
      end.forEach((chunk) => controller.enqueue(chunk))
      controller.close()
    },
    cancel: () => model.cut.resolve(),
  })
}

const golden = Model.Ref.make({ id: Model.ID.make("golden"), providerID: Provider.ID.make("test") })
const other = Model.Ref.make({ id: Model.ID.make("other"), providerID: Provider.ID.make("test") })

const config = {
  // The build agent asks before an edit.
  permissions: [{ action: "edit", resource: "*", effect: "ask" }],
  model: "test/golden",
  small_model: "test/golden",
  providers: {
    test: {
      name: "Test",
      package: "@opencode/ai/providers/openai-compatible",
      settings: { baseURL: new URL("v1", server.url).href, apiKey: "test-key" },
      models: {
        golden: { name: "Golden", limit: { context: 200_000, output: 32_000 } },
        other: { name: "Other", limit: { context: 200_000, output: 32_000 } },
      },
    },
  },
}

/** The server's app graph, on the SQLite file and the folders under `root`. */
function app(root: string) {
  const data = path.join(root, "data")
  const cache = path.join(root, "cache")
  return AppNodeBuilder.build(
    LayerNode.group([
      Bus.node,
      Global.node,
      Database.node,
      Job.node,
      Session.node,
      SessionStore.node,
      SessionExecution.node,
      SessionRestart.node,
      PermissionSaved.node,
      LocationServiceMap.node,
    ]),
    [
      Global.node.replace(
        Global.layerWith({
          data,
          cache,
          config: path.join(root, "config"),
          state: path.join(root, "state"),
          tmp: path.join(root, "tmp"),
          bin: path.join(cache, "bin"),
          log: path.join(data, "log"),
          repos: path.join(data, "repos"),
        }),
      ),
      Database.node.replace(Database.configured({ path: "opencode.db" })),
      // No config, skills, or AGENTS.md from the user's home or the project's ancestors.
      Config.node.replace(Config.configured({ project: false, global: false, content: JSON.stringify(config) })),
      InstructionDiscovery.node.replace(InstructionDiscovery.configured({ project: false, global: false })),
      offlineModels,
      Watcher.node.replace(Watcher.configured({ enabled: false })),
      ...TanStackOverrides.replacements,
    ],
  )
}

/** One process: the app graph, built until `stop` closes it. */
const boot = (root: string) =>
  Effect.gen(function* () {
    const scope = yield* Scope.make()
    yield* Effect.addFinalizer(() => Scope.close(scope, Exit.void))
    const context = yield* Layer.buildWithScope(app(root), scope)
    return {
      context,
      stop: Scope.close(scope, Exit.void),
      use: <A, E, R>(effect: Effect.Effect<A, E, R>) => effect.pipe(Effect.provide(context)),
    }
  })

type Process = Effect.Success<ReturnType<typeof boot>>

/** The folder of the test's processes, and a git project with `notes.txt` for the session. */
const setup = Effect.gen(function* () {
  const root = (yield* tmpdirScoped()).path
  const project = (yield* tmpdirScoped()).path
  yield* Effect.promise(async () => {
    await Bun.write(path.join(project, "notes.txt"), "alpha\n")
    await $`git init -q`.cwd(project).quiet()
  })
  return { root, location: Location.Ref.make({ directory: AbsolutePath.make(project) }) }
})

type Setup = Effect.Success<typeof setup>

const createSession = (process: Process, context: Setup, ref = golden) =>
  process.use(
    Session.Service.use((sessions) => sessions.create({ location: context.location, agent: Agent.ID.make("build"), model: ref })),
  )

const prompt = (process: Process, sessionID: Session.ID, text: string) =>
  process.use(Session.Service.use((sessions) => sessions.prompt({ sessionID, text })))

/** The boot sweep of the server: `SessionRestart` resumes the sessions that kept their execution claim. */
const resume = (process: Process) =>
  process.use(SessionRestart.Service.use((restarted) => restarted.resumeSuspendedSessions))

/** A crash: the process stops as for a deploy, and the next process on the same files boots and resumes. */
const restart = (process: Process, root: string) =>
  Effect.gen(function* () {
    yield* process.stop
    const next = yield* boot(root)
    yield* resume(next)
    return next
  })

const decodeSessionID = Schema.decodeUnknownOption(Schema.Struct({ sessionID: Schema.String }))

// The projector publishes it on its own fiber after a step ends or fails with usage, so its place among the
// events of the turn is not fixed.
const USAGE_UPDATED = "session.usage.updated"

/**
 * Records the session, permission, and form events that the process publishes. `types` reads them for a session,
 * without `session.usage.updated`.
 */
const record = (process: Process) =>
  Effect.gen(function* () {
    const recorder = yield* process.use(recordTrace())
    return {
      types: (sessionID: Session.ID) =>
        recorder.events.pipe(
          Effect.map((events) =>
            events.flatMap((event) => {
              const isOfSession = Option.getOrUndefined(decodeSessionID(event.data))?.sessionID === sessionID
              return isOfSession && event.type !== USAGE_UPDATED ? [event.type] : []
            }),
          ),
        ),
    }
  })

function shown(type: string, text: string) {
  return { type, text }
}

/** The type and the text of each projected user, synthetic, and assistant message, oldest first. */
const projected = (process: Process, sessionID: Session.ID) =>
  process.use(
    Session.Service.use((sessions) => sessions.messages({ sessionID, order: "asc" })).pipe(
      Effect.map((messages) =>
        messages.flatMap((message) => {
          if (message.type === "user" || message.type === "synthetic") return [shown(message.type, message.text)]
          if (message.type !== "assistant") return []
          const text = message.content.flatMap((part) => (part.type === "text" ? [part.text] : [])).join("")
          return [shown(message.type, text)]
        }),
      ),
    ),
  )

const suspended = (process: Process) => process.use(SessionStore.Service.use((store) => store.listSuspended()))

const execution = <A>(process: Process, use: (service: SessionExecution.Interface) => Effect.Effect<A>) =>
  process.use(SessionExecution.Service.use(use))

/** The location's `Permission`, as the permission routes use it. */
const permissions = <A, E>(process: Process, context: Setup, use: (permission: Permission.Interface) => Effect.Effect<A, E>) =>
  process.use(Permission.Service.use(use).pipe(Effect.provide(LocationServiceMap.Service.get(context.location))))

/** Waits in the background for the next event that matches. Join the fiber to wait. */
const nextEvent = <D extends Parameters<Bus.Interface["publish"]>[0]>(process: Process, definition: D) =>
  process.use(Bus.Service.use((bus) => bus.subscribe(definition).pipe(Stream.runHead))).pipe(
    Effect.forkScoped({ startImmediately: true }),
  )

const waitIdle = (process: Process, sessionID: Session.ID) =>
  process.use(Session.Service.use((sessions) => sessions.wait(sessionID)))

/** Reads until `done` holds, for up to 20 seconds. */
const until = <A, E>(read: Effect.Effect<A, E>, done: (value: A) => boolean) =>
  Effect.gen(function* () {
    const deadline = Date.now() + 20_000
    for (;;) {
      const value = yield* read
      if (done(value) || Date.now() > deadline) return value
      yield* Effect.sleep("20 millis")
    }
  })

/** Is it a model call of the subagent with the prompt "Look around"? Its last message is that prompt. */
const isHelper = (request: Request) => JSON.stringify(request.messages.at(-1) ?? null).includes("Look around")

const editCall = (id: string) => ({
  id,
  name: "edit_file",
  input: { path: "notes.txt", old: "alpha", new: "beta" },
})

describe("TanStack recovery: crash and restart", () => {
  it.live(
    "a crash during a turn: the next process resumes the turn on the session's model, and releases the claim",
    () =>
      Effect.gen(function* () {
        const context = yield* setup
        const first = yield* boot(context.root)
        // The session's own model, not the default model of the location.
        const session = yield* createSession(first, context, other)
        script([{ hang: true }, { text: "Resumed answer" }])
        yield* prompt(first, session.id, "Say hello")
        yield* Effect.promise(() => model.hanging.promise)

        const claimed = yield* suspended(first)
        const second = yield* restart(first, context.root)
        yield* until(projected(second, session.id), (messages) => messages.some((item) => item.text === "Resumed answer"))
        yield* waitIdle(second, session.id)

        expect(claimed).toEqual([session.id])
        expect(model.requests.map((request) => request.model)).toEqual(["other", "other"])
        expect(yield* projected(second, session.id)).toEqual([
          { type: "user", text: "Say hello" },
          {
            type: "synthetic",
            text: "The server restarted while you were working. Continue from where you left off without repeating completed work.",
          },
          { type: "assistant", text: "Resumed answer" },
        ])
        expect(yield* suspended(second)).toEqual([])
      }),
    60_000,
  )

  it.live(
    "a crash during a turn keeps the waiting prompt and the manual compaction, and both still deliver",
    () =>
      Effect.gen(function* () {
        const context = yield* setup
        const first = yield* boot(context.root)
        const session = yield* createSession(first, context)
        script([{ hang: true }, { text: "First answer" }, { text: "Queued answer" }])
        yield* prompt(first, session.id, "First question")
        yield* Effect.promise(() => model.hanging.promise)
        const queued = yield* first.use(
          Session.Service.use((sessions) =>
            sessions.prompt({ sessionID: session.id, text: "Queued question", delivery: "queue" }),
          ),
        )
        const compaction = yield* first.use(Session.Service.use((sessions) => sessions.compact({ sessionID: session.id })))
        const waiting = yield* first.use(Session.Service.use((sessions) => sessions.inbox(session.id)))

        yield* first.stop
        const second = yield* boot(context.root)
        const recorder = yield* record(second)
        yield* resume(second)
        yield* until(projected(second, session.id), (messages) => messages.some((item) => item.text === "Queued answer"))
        yield* waitIdle(second, session.id)

        expect(waiting.map((item) => item.id)).toEqual([queued.id, compaction.id])
        // The mapper of the new process knew the waiting items, so their deliveries reached opencode's inbox.
        expect(yield* second.use(Session.Service.use((sessions) => sessions.inbox(session.id)))).toEqual([])
        const types = yield* recorder.types(session.id)
        expect(types.filter((type) => type.startsWith("session.compaction."))).not.toEqual([])
        expect((yield* projected(second, session.id)).filter((item) => item.type !== "synthetic")).toEqual([
          { type: "user", text: "First question" },
          { type: "assistant", text: "First answer" },
          { type: "user", text: "Queued question" },
          { type: "assistant", text: "Queued answer" },
        ])
      }),
    60_000,
  )

  it.live(
    "a crash during a permission ask: the next process lists the ask again, and the answer finishes the turn",
    () =>
      Effect.gen(function* () {
        const context = yield* setup
        const first = yield* boot(context.root)
        const session = yield* createSession(first, context)
        script([{ toolCalls: [editCall("call-1")] }, { toolCalls: [editCall("call-2")] }, { text: "Changed it." }])
        const asked = yield* nextEvent(first, Permission.Event.Asked)
        yield* prompt(first, session.id, "Change alpha to beta in notes.txt")
        yield* Fiber.join(asked)

        yield* first.stop
        const second = yield* boot(context.root)
        const askedAgain = yield* nextEvent(second, Permission.Event.Asked)
        yield* second.use(SessionRestart.Service.use((restarted) => restarted.resumeSuspendedSessions))
        yield* Fiber.join(askedAgain)
        const listed = yield* permissions(second, context, (permission) => permission.list())
        yield* permissions(second, context, (permission) =>
          permission.reply({ requestID: listed[0]?.id ?? Permission.ID.create(), reply: "once" }),
        )
        yield* until(projected(second, session.id), (messages) => messages.some((item) => item.text === "Changed it."))
        yield* waitIdle(second, session.id)

        expect(listed.map((request) => ({ sessionID: request.sessionID, action: request.action }))).toEqual([
          { sessionID: session.id, action: "edit" },
        ])
        expect(yield* Effect.promise(() => Bun.file(path.join(context.location.directory, "notes.txt")).text())).toBe(
          "beta\n",
        )
        expect(yield* permissions(second, context, (permission) => permission.list())).toEqual([])
        expect(yield* suspended(second)).toEqual([])
      }),
    60_000,
  )

  it.live(
    "a crash during a background agent run: the next process ends the run and wakes the session",
    () =>
      Effect.gen(function* () {
        const context = yield* setup
        const first = yield* boot(context.root)
        const session = yield* createSession(first, context)
        const isWake = (request: Request) => JSON.stringify(request.messages).includes("The host stopped")
        script(
          [
            {
              toolCalls: [
                { id: "call-agent", name: "subagent", input: { agent: "general", prompt: "Look around", background: true } },
              ],
            },
            { text: "A helper looks around." },
          ],
          (request) =>
            isWake(request)
              ? { text: "The helper stopped." }
              : isHelper(request)
                ? { hang: true }
                : undefined,
        )
        yield* prompt(first, session.id, "Get help")
        yield* Effect.promise(() => model.hanging.promise)
        yield* until(projected(first, session.id), (messages) =>
          messages.some((item) => item.text === "A helper looks around."),
        )
        yield* waitIdle(first, session.id)

        const claimed = yield* suspended(first)
        const second = yield* restart(first, context.root)
        yield* until(projected(second, session.id), (messages) => messages.some((item) => item.text === "The helper stopped."))
        yield* waitIdle(second, session.id)

        // The agent run kept the claim after its turn ended.
        expect(claimed).toEqual([session.id])
        expect(model.requests.some(isWake)).toBe(true)
        expect(yield* suspended(second)).toEqual([])
      }),
    60_000,
  )
})

describe("TanStack recovery: interrupt", () => {
  it.live(
    "interrupt during a stream: the harness turn stops, the final step events go out, and the waiting Effect ends",
    () =>
      Effect.gen(function* () {
        const context = yield* setup
        const process = yield* boot(context.root)
        const recorder = yield* record(process)
        const session = yield* createSession(process, context)
        script([{ text: "Partial", hang: true }])
        const delta = yield* nextEvent(process, SessionEvent.Text.Delta)
        yield* prompt(process, session.id, "Write a long story")
        yield* Fiber.join(delta)
        const waiting = yield* waitIdle(process, session.id).pipe(Effect.forkScoped({ startImmediately: true }))
        const active = yield* execution(process, (service) => service.active)

        // The Effect side: `SessionExecution.interrupt` interrupts the busy fiber of the session.
        const interrupted = yield* execution(process, (service) =>
          service.interrupt(session.id, { awaitSettlement: true }),
        )
        yield* Fiber.join(waiting)
        yield* Effect.promise(() => model.cut.promise)

        expect(active).toEqual(new Set([session.id]))
        expect(interrupted).toBe(true)
        expect(yield* execution(process, (service) => service.isActive(session.id))).toBe(false)
        expect((yield* recorder.types(session.id)).slice(-4)).toEqual([
          "session.text.ended",
          "session.step.streamed",
          "session.step.failed",
          "session.execution.interrupted",
        ])
        expect(yield* suspended(process)).toEqual([])
      }),
    60_000,
  )

  it.live(
    "interrupt during a tool: the call fails as interrupted, and a cancel on the harness side ends the Effect",
    () =>
      Effect.gen(function* () {
        const context = yield* setup
        const process = yield* boot(context.root)
        const recorder = yield* record(process)
        const session = yield* createSession(process, context)
        // A foreground subagent: the parent's tool call runs while the child's model call hangs.
        script(
          [{ toolCalls: [{ id: "call-agent", name: "subagent", input: { agent: "general", prompt: "Look around" } }] }],
          (request) => (isHelper(request) ? { hang: true } : undefined),
        )
        yield* prompt(process, session.id, "Get help")
        yield* Effect.promise(() => model.hanging.promise)
        const waiting = yield* waitIdle(process, session.id).pipe(Effect.forkScoped({ startImmediately: true }))

        // The harness side: `Session.interrupt` cancels the harness turn.
        const interrupted = yield* process.use(Session.Service.use((sessions) => sessions.interrupt(session.id)))
        yield* Fiber.join(waiting)

        expect(interrupted).toBe(true)
        expect(yield* execution(process, (service) => service.isActive(session.id))).toBe(false)
        expect((yield* recorder.types(session.id)).slice(-3)).toEqual([
          "session.tool.failed",
          "session.step.failed",
          "session.execution.interrupted",
        ])
      }),
    60_000,
  )

  // TanStack gap: `session.cancel()` does not end a turn that waits on a `permissions()` question. The question
  // waits in `onBeforeToolCall`, and neither the chat tool phase nor `ctx.session.ask` reads the abort signal, so
  // the operation stays running and the question stays pending until someone answers it. Unskip when the harness
  // settles the questions of a cancelled operation.
  it.live.skip(
    "interrupt during a permission ask: the call fails, the ask goes away, and the turn ends",
    () =>
      Effect.gen(function* () {
        const context = yield* setup
        const process = yield* boot(context.root)
        const recorder = yield* record(process)
        const session = yield* createSession(process, context)
        script([{ toolCalls: [editCall("call-1")] }])
        const asked = yield* nextEvent(process, Permission.Event.Asked)
        yield* prompt(process, session.id, "Change alpha to beta in notes.txt")
        yield* Fiber.join(asked)

        const interrupted = yield* execution(process, (service) =>
          service.interrupt(session.id, { awaitSettlement: true }),
        )

        expect(interrupted).toBe(true)
        expect((yield* recorder.types(session.id)).slice(-3)).toEqual([
          "session.tool.failed",
          "session.step.failed",
          "session.execution.interrupted",
        ])
        expect(yield* permissions(process, context, (permission) => permission.list())).toEqual([])
      }),
    60_000,
  )

  it.live(
    "a decline with no message ends the turn, as on opencode's runtime; a decline with a message lets the model go on",
    () =>
      Effect.gen(function* () {
        const context = yield* setup
        const process = yield* boot(context.root)
        const recorder = yield* record(process)
        const declined = yield* createSession(process, context)
        const corrected = yield* createSession(process, context)
        const reject = (sessionID: Session.ID, message?: string) =>
          Effect.gen(function* () {
            const asked = yield* nextEvent(process, Permission.Event.Asked)
            yield* prompt(process, sessionID, "Change alpha to beta in notes.txt")
            const event = yield* Fiber.join(asked)
            const requestID = event._tag === "Some" ? event.value.data.id : Permission.ID.create()
            yield* permissions(process, context, (permission) =>
              permission.reply({ requestID, reply: "reject", ...(message === undefined ? {} : { message }) }),
            )
            yield* until(recorder.types(sessionID), (types) =>
              types.some((type) => type === "session.execution.interrupted" || type === "session.execution.succeeded"),
            )
            yield* waitIdle(process, sessionID)
            return yield* recorder.types(sessionID)
          })

        script([{ toolCalls: [editCall("call-1")] }, { text: "Never shown" }])
        const declinedTypes = yield* reject(declined.id)
        script([{ toolCalls: [editCall("call-2")] }, { text: "I will leave the file as it is." }])
        const correctedTypes = yield* reject(corrected.id, "Do not change the file.")

        expect(declinedTypes.slice(-2)).toEqual(["session.step.failed", "session.execution.interrupted"])
        expect((yield* projected(process, declined.id)).some((item) => item.text === "Never shown")).toBe(false)
        expect(correctedTypes.at(-1)).toBe("session.execution.succeeded")
        expect((yield* projected(process, corrected.id)).at(-1)).toEqual({
          type: "assistant",
          text: "I will leave the file as it is.",
        })
        expect(yield* Effect.promise(() => Bun.file(path.join(context.location.directory, "notes.txt")).text())).toBe(
          "alpha\n",
        )
      }),
    60_000,
  )
})

describe("TanStack recovery: the eviction view", () => {
  it.live(
    "SessionExecution shows a running harness turn, and an inactivity interrupt stops it before the location goes",
    () =>
      Effect.gen(function* () {
        const context = yield* setup
        const process = yield* boot(context.root)
        const recorder = yield* record(process)
        const session = yield* createSession(process, context)
        script([{ hang: true }])
        const idle = yield* execution(process, (service) => service.active)
        yield* prompt(process, session.id, "Think for an hour")
        yield* Effect.promise(() => model.hanging.promise)
        const running = yield* execution(process, (service) => service.active)
        const isActive = yield* execution(process, (service) => service.isActive(session.id))

        // What `LocationActivity` does with an owner of a location that passed its time to live.
        const interrupted = yield* execution(process, (service) =>
          service.interrupt(session.id, { reason: "inactivity", awaitSettlement: true }),
        )
        yield* Effect.promise(() => model.cut.promise)

        expect(idle).toEqual(new Set())
        expect(running).toEqual(new Set([session.id]))
        expect(isActive).toBe(true)
        expect(interrupted).toBe(true)
        expect(yield* execution(process, (service) => service.active)).toEqual(new Set())
        expect((yield* recorder.types(session.id)).at(-1)).toBe("session.execution.interrupted")
      }),
    60_000,
  )
})
