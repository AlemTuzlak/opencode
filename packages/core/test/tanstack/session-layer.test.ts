/**
 * The TanStack `Session` layer: opencode's `Session` service on the harness.
 *
 * The tests replace `Session.node` with `TanStackSession.node`, as the runtime flag does, and run real harness
 * hosts on a temp location. Only the model is fake: each turn gets a scripted `FakeTextAdapter` as its adapter.
 * The golden tests drive the `Session` service, record the Bus, and compare the trace with the golden trace of
 * the old runtime, with the same patches as `events.test.ts`.
 */
import { $ } from "bun"
import { describe, expect } from "bun:test"
import path from "path"
import { Cause, Context, Effect, Exit, Fiber, Layer, Scope, Stream } from "effect"
import { EventType } from "@tanstack/ai"
import type { ModelMessage, Modality, TextOptions } from "@tanstack/ai"
import { FakeTextAdapter } from "@tanstack/ai/testing"
import type { FakeResponseStep } from "@tanstack/ai/testing"
import { Agent } from "@opencode/core/agent"
import { Bus } from "@opencode/core/bus"
import { Config } from "@opencode/core/config"
import { Database } from "@opencode/core/database/database"
import { AppNodeBuilder } from "@opencode/core/effect/app-node-builder"
import { Watcher } from "@opencode/core/filesystem/watcher"
import { InstructionDiscovery } from "@opencode/core/instruction-discovery"
import { Location } from "@opencode/core/location"
import { LocationServiceMap } from "@opencode/core/location-service-map"
import { Model } from "@opencode/core/model"
import { Permission } from "@opencode/core/permission"
import { Provider } from "@opencode/core/provider"
import { AbsolutePath } from "@opencode/core/schema"
import { Session } from "@opencode/core/session"
import { SessionEvent } from "@opencode/core/session/event"
import { TanStackHost } from "@opencode/core/tanstack/host"
import { TanStackSession } from "@opencode/core/tanstack/session-layer"
import { makeGlobalNode } from "@opencode/util/effect/app-node"
import { LayerNode } from "@opencode/util/effect/layer-node"
import { Global } from "@opencode/util/global"
import { tempGlobalLayer } from "../fixture/global"
import { offlineModels } from "../fixture/models"
import { tmpdirScoped } from "../fixture/tmpdir"
import { testEffect } from "../lib/effect"
import { normalizeTrace, readTrace, recordTrace } from "./trace"
import type { Trace, TraceEvent, TraceValue } from "./trace"
import type { Event } from "@opencode/schema/event"

const golden = Model.Ref.make({ id: Model.ID.make("golden"), providerID: Provider.ID.make("test") })
const other = Model.Ref.make({ id: Model.ID.make("other"), providerID: Provider.ID.make("test") })

/**
 * The fake model. Like the scripted model of the old runtime, it reports no token usage. With `hang`, it stops
 * after its text and waits for the turn to be cancelled.
 */
class GoldenModel extends FakeTextAdapter<string, ReadonlyArray<Modality>> {
  hang = false
  calls = 0

  override async *chatStream(options: TextOptions) {
    this.calls++
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

/** The fake model of each model ref, by `provider/model`. A test scripts it with `script`. */
const models = new Map<string, GoldenModel>()
const modelKey = (ref: Model.Ref) => `${ref.providerID}/${ref.id}`

function script(responses: ReadonlyArray<FakeResponseStep>, ref = golden) {
  const fake = new GoldenModel(ref.id, {})
  fake.setResponses([...responses])
  models.set(modelKey(ref), fake)
  return fake
}

/**
 * The hosts of the test: `TanStackHost.layer` for each location, built as the location graph builds it, with the
 * fake model of the session model as the adapter of each turn.
 */
const testHosts = makeGlobalNode({
  service: TanStackSession.Hosts,
  layer: Layer.effect(
    TanStackSession.Hosts,
    Effect.gen(function* () {
      const locations = yield* LocationServiceMap.Service
      const scope = yield* Scope.Scope
      // The global services of the host. The location graph gives them to `TanStackHost.node` the same way.
      const globals = yield* Effect.context<Bus.Service | Database.Service | Global.Service | Session.Service>()
      const cache = new Map<string, TanStackHost.Interface>()
      return TanStackSession.Hosts.of({
        get: (location) =>
          Effect.gen(function* () {
            const cached = cache.get(location.directory)
            if (cached) return cached
            const built = yield* Layer.buildWithScope(
              TanStackHost.layer.pipe(Layer.provide(LocationServiceMap.Service.get(location))),
              scope,
            ).pipe(Effect.provideService(LocationServiceMap.Service, locations), Effect.provide(globals), Effect.orDie)
            const host = Context.get(built, TanStackHost.Service)
            const scripted = TanStackHost.Service.of({
              ...host,
              overrides: (ref) =>
                Effect.suspend(() => {
                  const fake = models.get(modelKey(ref))
                  return fake
                    ? Effect.succeed({ adapter: fake })
                    : Effect.die(new Error(`No fake model ${modelKey(ref)}`))
                }),
            })
            cache.set(location.directory, scripted)
            return scripted
          }),
      })
    }),
  ),
  // opencode's own Session layer: the `opencode_*` tools of the test hosts use it.
  deps: [LocationServiceMap.node, Bus.node, Database.node, Global.node, Session.node.mapLayer((layer) => layer)],
})

const config = {
  // The build agent asks before an edit, so the tool turn has a permission ask.
  permissions: [{ action: "edit", resource: "*", effect: "ask" }],
  // The models of the sessions. Each turn gets a fake model, so nothing calls this closed loopback port. Only the
  // title of the harness tries, and fails at once.
  model: "test/golden",
  small_model: "test/golden",
  providers: {
    test: {
      name: "Test",
      package: "@opencode/ai/providers/openai-compatible",
      settings: { baseURL: "http://127.0.0.1:9/v1", apiKey: "test-key" },
      models: {
        golden: { name: "Golden", limit: { context: 200_000, output: 32_000 } },
        other: { name: "Other", limit: { context: 200_000, output: 32_000 } },
      },
    },
  },
}

const layer = AppNodeBuilder.build(
  LayerNode.group([
    Bus.node,
    Global.node,
    Database.node,
    Session.node,
    LocationServiceMap.node,
    TanStackSession.hostsNode,
  ]),
  [
    Global.node.replace(tempGlobalLayer),
    // No config, skills, or AGENTS.md from the user's home or the project's ancestors.
    Config.node.replace(Config.configured({ project: false, global: false, content: JSON.stringify(config) })),
    InstructionDiscovery.node.replace(InstructionDiscovery.configured({ project: false, global: false })),
    offlineModels,
    Watcher.node.replace(Watcher.configured({ enabled: false })),
    Session.node.replace(TanStackSession.node),
    TanStackSession.hostsNode.replace(testHosts),
  ],
)
const it = testEffect(layer)

/**
 * Creates a git project with `notes.txt`, starts the trace recorder, and creates the session, as the golden traces
 * of the old runtime do.
 */
const setup = Effect.fn("SessionLayerTest.setup")(function* () {
  const tmp = yield* tmpdirScoped()
  yield* Effect.promise(async () => {
    await Bun.write(path.join(tmp.path, "notes.txt"), "alpha\n")
    await $`git init -q`.cwd(tmp.path).quiet()
  })
  const recorder = yield* recordTrace()
  const sessions = yield* Session.Service
  const location = Location.Ref.make({ directory: AbsolutePath.make(tmp.path) })
  const session = yield* sessions.create({ location, title: "Golden", agent: Agent.ID.make("build"), model: golden })
  const hosts = yield* TanStackSession.Hosts
  return {
    directory: tmp.path,
    // Tool output files live under the temp Global directories.
    global: path.dirname((yield* Global.Service).data),
    recorder,
    sessionID: session.id,
    sessions,
    bus: yield* Bus.Service,
    /** The live harness session of a session: the one that the session layer runs. */
    harness: (sessionID: Session.ID) => hosts.get(location).pipe(Effect.flatMap((host) => host.open(sessionID))),
  }
})

type Context = Effect.Success<ReturnType<typeof setup>>

const runTurn = (context: Context, text: string, sessionID = context.sessionID) =>
  Effect.gen(function* () {
    const message = yield* context.sessions.prompt({ sessionID, text })
    yield* context.sessions.wait(sessionID)
    return message
  })

/** The role and the text of each message of a harness transcript. */
const transcript = (context: Context, sessionID: Session.ID) =>
  context.harness(sessionID).pipe(
    Effect.flatMap((session) => Effect.promise(() => session.transcript())),
    Effect.map(texts),
  )

/** One turn of a harness transcript: the user text and the answer. */
function turnOf(user: string, assistant: string) {
  return [
    { role: "user", text: user },
    { role: "assistant", text: assistant },
  ] as const
}

function texts(messages: ReadonlyArray<ModelMessage>) {
  return messages.map((message) => ({
    role: message.role,
    text:
      typeof message.content === "string"
        ? message.content
        : (message.content ?? []).flatMap((part) => (part.type === "text" ? [part.content] : [])).join(""),
  }))
}

/** The type and the text of each projected user and assistant message, oldest first. */
const projected = (context: Context, sessionID: Session.ID) =>
  context.sessions.messages({ sessionID, order: "asc" }).pipe(
    Effect.map((messages) =>
      messages.flatMap((message) => (message.type === "user" || message.type === "assistant" ? [message] : [])),
    ),
    Effect.map((messages) =>
      messages.map((message) => ({
        type: message.type,
        text:
          message.type === "user"
            ? message.text
            : message.content.flatMap((part) => (part.type === "text" ? [part.text] : [])).join(""),
      })),
    ),
  )

// Events that this layer does not publish:
// - `session.instructions.updated`: opencode's instruction tracking. The harness has no such event.
// - `permission.replied`: the permission facade, when a client answers.
const NOT_OWNED = new Set(["session.instructions.updated", "permission.replied"])

interface Patch {
  readonly type: string
  /** Data fields that pick the event. Without it, every event of the type. */
  readonly where?: Readonly<Record<string, string>>
  readonly set?: Readonly<Record<string, TraceValue>>
  readonly unset?: ReadonlyArray<string>
}

/** The golden trace as the TanStack runtime must publish it: without step snapshots, and with the patches. */
const expected = (name: string, patches: ReadonlyArray<Patch> = []) =>
  Effect.promise(() => readTrace(name)).pipe(
    Effect.map((trace) =>
      comparable(
        trace
          .filter((event) => !NOT_OWNED.has(event.type))
          .map((event) =>
            [
              { type: event.type, unset: event.type.startsWith("session.step.") ? ["snapshot"] : [] },
              ...patches,
            ].reduce(patchEvent, event),
          ),
      ),
    ),
  )

/** The recorded trace of a scenario, comparable with `expected`. */
const recorded = (context: Context) =>
  context.recorder.events.pipe(
    Effect.map((events) => comparable(normalizeTrace(events, { roots: [context.directory, context.global] }))),
  )

function patchEvent(event: TraceEvent, patch: Patch): TraceEvent {
  const data = event.data
  if (event.type !== patch.type || !isObject(data)) return event
  const matches = Object.entries(patch.where ?? {}).every(([key, value]) => data[key] === value)
  if (!matches) return event
  const kept = Object.entries(data).filter(([key]) => !(patch.unset ?? []).includes(key))
  return { ...event, data: { ...Object.fromEntries(kept), ...patch.set } }
}

function isObject(value: TraceValue | undefined): value is { [key: string]: TraceValue } {
  return typeof value === "object" && value !== null && !Array.isArray(value)
}

const PLACEHOLDER = /\b([a-z]+)_(\d+)\b/g
const HASH_PLACEHOLDER = /<hash:(\d+)>/g

/**
 * Renumbers the id and hash placeholders by first appearance, and drops the durable `seq`. Both sides have events
 * that the other side lacks, so the numbers and the Bus sequence differ, while the order and the id relations stay
 * the same.
 */
function comparable(trace: Trace) {
  const ids = new Map<string, number>()
  const hashes = new Map<string, number>()
  const renumber = (text: string) =>
    text
      .replace(PLACEHOLDER, (_, prefix: string, n: string) => `${prefix}_${numbered(ids, n)}`)
      .replace(HASH_PLACEHOLDER, (_, n: string) => `<hash:${numbered(hashes, n)}>`)
  const walk = (value: TraceValue): TraceValue => {
    if (typeof value === "string") return renumber(value)
    if (Array.isArray(value)) return value.map(walk)
    if (!isObject(value)) return value
    const keys = Object.keys(value)
      .filter((key) => key !== "seq")
      .toSorted()
    return Object.fromEntries(keys.map((key) => [renumber(key), walk(value[key])]))
  }
  return trace.map((event) => walk(event))
}

function numbered(seen: Map<string, number>, value: string) {
  const existing = seen.get(value)
  if (existing !== undefined) return existing
  seen.set(value, seen.size + 1)
  return seen.size
}

/** The raw tool input that the fake model streams. The old scripted model sent none, so its traces have "". */
const rawInput = (toolCall: string, input: string): Patch => ({
  type: "session.tool.input.ended",
  where: { id: toolCall },
  set: { text: input },
})

/** The harness tool writes another result text than opencode's own tool. */
const harnessResult = (toolCall: string, text: string): Patch => ({
  type: "session.tool.success",
  where: { id: toolCall },
  set: { content: [{ type: "text", text }] },
})

/** Waits in the background for the next event that matches. Join the fiber to wait. */
const nextEvent = <D extends Event.Definition>(context: Context, definition: D) =>
  context.bus.subscribe(definition).pipe(Stream.runHead, Effect.forkScoped({ startImmediately: true }))

/** Answers `once` to each permission question of the session, as a client does through the permission facade. */
const allowPermissions = (context: Context) =>
  context.bus.subscribe(Permission.Event.Asked).pipe(
    Stream.runForEach(() =>
      context.harness(context.sessionID).pipe(
        Effect.flatMap((session) =>
          Effect.forEach(session.snapshot().pendingQuestions, (question) =>
            Effect.promise(() => session.answer(question.questionId, { answer: "once" })),
          ),
        ),
        Effect.orDie,
      ),
    ),
    Effect.forkScoped({ startImmediately: true }),
  )

describe("TanStackSession golden traces", () => {
  it.live(
    "text-turn",
    () =>
      Effect.gen(function* () {
        const context = yield* setup()
        script([{ text: "Hello there" }])

        yield* runTurn(context, "Say hello")

        expect(yield* recorded(context)).toEqual(yield* expected("text-turn"))
      }),
    60_000,
  )

  it.live(
    "tool-permission",
    () =>
      Effect.gen(function* () {
        const context = yield* setup()
        yield* allowPermissions(context)
        // A database method: the harness reads its edit rule from the config of the location.
        yield* context.sessions.setPermissions({
          sessionID: context.sessionID,
          permissions: [{ action: "edit", resource: "*", effect: "ask" }],
        })
        script([
          { toolCalls: [{ id: "call-read", name: "read_file", input: { path: "notes.txt" } }] },
          {
            toolCalls: [
              { id: "call-edit", name: "edit_file", input: { path: "notes.txt", old: "alpha", new: "beta" } },
            ],
          },
          { text: "I changed alpha to beta." },
        ])

        yield* runTurn(context, "Change alpha to beta in notes.txt")

        expect(yield* recorded(context)).toEqual(
          yield* expected("tool-permission", [
            rawInput("call-read", '{"path":"notes.txt"}'),
            rawInput("call-edit", '{"path":"notes.txt","old":"alpha","new":"beta"}'),
            harnessResult("call-read", "1\talpha"),
            harnessResult("call-edit", "Edited notes.txt (1 change)."),
            // opencode's edit tool computes a diff preview before it asks. The harness asks before the tool runs.
            { type: "permission.asked", unset: ["metadata"] },
          ]),
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
        script([
          async () => {
            called.resolve()
            await steered.promise
            return { text: "First answer" }
          },
          { text: "Answer with the steer" },
        ])

        yield* context.sessions.prompt({ sessionID: context.sessionID, text: "First question" })
        yield* Effect.promise(() => called.promise)
        yield* context.sessions.prompt({ sessionID: context.sessionID, text: "Also answer this" })
        steered.resolve()
        yield* context.sessions.wait(context.sessionID)

        expect(yield* recorded(context)).toEqual(yield* expected("steer"))
      }),
    60_000,
  )

  it.live(
    "interrupt",
    () =>
      Effect.gen(function* () {
        const context = yield* setup()
        script([{ text: "Partial" }]).hang = true
        const delta = yield* nextEvent(context, SessionEvent.Text.Delta)

        yield* context.sessions.prompt({ sessionID: context.sessionID, text: "Write a long story" })
        yield* Fiber.join(delta)
        const interrupted = yield* context.sessions.interrupt(context.sessionID)
        yield* context.sessions.wait(context.sessionID)

        expect(interrupted).toBe(true)
        expect(yield* recorded(context)).toEqual(yield* expected("interrupt"))
      }),
    60_000,
  )
})

describe("TanStackSession runtime methods", () => {
  it.live(
    "fork copies the harness thread into the forked session, and the fork runs its own turns",
    () =>
      Effect.gen(function* () {
        const context = yield* setup()
        script([{ text: "Hello there" }, { text: "Hi again" }, { text: "Fresh start" }])
        yield* runTurn(context, "Say hello")
        const second = yield* runTurn(context, "Say it again")

        const whole = yield* context.sessions.fork({ sessionID: context.sessionID })
        const before = yield* context.sessions.fork({ sessionID: context.sessionID, before: second.id })
        yield* runTurn(context, "Start over", before.id)

        expect(yield* transcript(context, whole.id)).toEqual([
          ...turnOf("Say hello", "Hello there"),
          ...turnOf("Say it again", "Hi again"),
        ])
        expect(yield* transcript(context, before.id)).toEqual([
          ...turnOf("Say hello", "Hello there"),
          ...turnOf("Start over", "Fresh start"),
        ])
        expect(yield* projected(context, before.id)).toEqual([
          { type: "user", text: "Say hello" },
          { type: "assistant", text: "Hello there" },
          { type: "user", text: "Start over" },
          { type: "assistant", text: "Fresh start" },
        ])
      }),
    60_000,
  )

  it.live(
    "revert hides the reverted turn from the model, clear brings it back, and commit drops it",
    () =>
      Effect.gen(function* () {
        const context = yield* setup()
        const sessionID = context.sessionID
        script([{ text: "Hello there" }, { text: "Hi again" }, { text: "Third answer" }])
        yield* runTurn(context, "Say hello")
        const second = yield* runTurn(context, "Say it again")

        const staged = yield* context.sessions.revert.stage({ sessionID, messageID: second.id })
        const hidden = yield* transcript(context, sessionID)
        yield* context.sessions.revert.clear(sessionID)
        const back = yield* transcript(context, sessionID)
        yield* context.sessions.revert.stage({ sessionID, messageID: second.id })
        yield* context.sessions.revert.commit(sessionID)
        yield* runTurn(context, "Say something new")

        expect(staged).toEqual({ messageID: second.id })
        expect(hidden).toEqual([...turnOf("Say hello", "Hello there")])
        expect(back).toEqual([...turnOf("Say hello", "Hello there"), ...turnOf("Say it again", "Hi again")])
        expect(yield* transcript(context, sessionID)).toEqual([
          ...turnOf("Say hello", "Hello there"),
          ...turnOf("Say something new", "Third answer"),
        ])
        expect(yield* projected(context, sessionID)).toEqual([
          { type: "user", text: "Say hello" },
          { type: "assistant", text: "Hello there" },
          { type: "user", text: "Say something new" },
          { type: "assistant", text: "Third answer" },
        ])
        const reverts = (yield* context.recorder.events).flatMap((event) =>
          event.type.startsWith("session.revert.") ? [event.type] : [],
        )
        expect(reverts).toEqual([
          "session.revert.staged",
          "session.revert.cleared",
          "session.revert.staged",
          "session.revert.committed",
        ])
      }),
    60_000,
  )

  it.live(
    "a revert of the first message dies: the harness keeps the message it reverts to",
    () =>
      Effect.gen(function* () {
        const context = yield* setup()
        script([{ text: "Hello there" }])
        const first = yield* runTurn(context, "Say hello")

        const exit = yield* context.sessions.revert
          .stage({ sessionID: context.sessionID, messageID: first.id })
          .pipe(Effect.exit)

        expect(Exit.isFailure(exit) && Cause.squash(exit.cause)).toBeInstanceOf(TanStackSession.NotSupportedError)
      }),
    60_000,
  )

  it.live(
    "cancelInbox removes a queued prompt, and the prompt never runs",
    () =>
      Effect.gen(function* () {
        const context = yield* setup()
        const sessionID = context.sessionID
        const called = Promise.withResolvers<void>()
        const release = Promise.withResolvers<void>()
        const fake = script([
          async () => {
            called.resolve()
            await release.promise
            return { text: "First answer" }
          },
          { text: "Never sent" },
        ])
        yield* context.sessions.prompt({ sessionID, text: "First question" })
        yield* Effect.promise(() => called.promise)
        const queued = yield* context.sessions.prompt({ sessionID, text: "Later question", delivery: "queue" })
        const waiting = yield* context.sessions.inbox(sessionID)

        yield* context.sessions.cancelInbox({ sessionID, inboxID: queued.id })
        const after = yield* context.sessions.inbox(sessionID)
        release.resolve()
        yield* context.sessions.wait(sessionID)

        expect(waiting.map((item) => item.id)).toEqual([queued.id])
        expect(after).toEqual([])
        expect(fake.calls).toBe(1)
        expect(yield* projected(context, sessionID)).toEqual([
          { type: "user", text: "First question" },
          { type: "assistant", text: "First answer" },
        ])
      }),
    60_000,
  )

  it.live(
    "switchModel runs the next turn with the new model",
    () =>
      Effect.gen(function* () {
        const context = yield* setup()
        script([{ text: "From golden" }])
        script([{ text: "From other" }], other)
        yield* runTurn(context, "First")
        const steps = yield* nextEvent(context, SessionEvent.Step.Started)

        yield* context.sessions.switchModel({ sessionID: context.sessionID, model: other })
        yield* runTurn(context, "Second")

        const step = yield* Fiber.join(steps)
        expect(step._tag === "Some" ? step.value.data.model : undefined).toEqual(other)
        expect(yield* transcript(context, context.sessionID)).toEqual([
          ...turnOf("First", "From golden"),
          ...turnOf("Second", "From other"),
        ])
      }),
    60_000,
  )

  it.live(
    "database methods still go to opencode's layer",
    () =>
      Effect.gen(function* () {
        const context = yield* setup()
        const sessionID = context.sessionID
        script([{ text: "Hello there" }])
        yield* runTurn(context, "Say hello")

        yield* context.sessions.rename({ sessionID, title: "Renamed" })
        yield* context.sessions.setMetadata({ sessionID, metadata: { ticket: "OC-1" } })
        const info = yield* context.sessions.get(sessionID)
        const listed = yield* context.sessions.list()

        expect(info.title).toBe("Renamed")
        expect(info.metadata).toEqual({ ticket: "OC-1" })
        expect(listed.data.map((session) => session.id)).toEqual([sessionID])
        expect(yield* projected(context, sessionID)).toEqual([
          { type: "user", text: "Say hello" },
          { type: "assistant", text: "Hello there" },
        ])
        expect(yield* context.sessions.active).toEqual(new Set())
      }),
    60_000,
  )
})
