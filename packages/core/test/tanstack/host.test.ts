import { afterAll, describe, expect, setSystemTime } from "bun:test"
import { Context, Effect, Exit, Layer, Schema, Scope } from "effect"
import { TestClock } from "effect/testing"
import { Event } from "@opencode/schema/config"
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
import { Provider } from "@opencode/core/provider"
import { AbsolutePath } from "@opencode/core/schema"
import { Session } from "@opencode/core/session"
import { TanStackHost } from "@opencode/core/tanstack/host"
import { TanstackLeaseTable } from "@opencode/core/tanstack/sql"
import { LayerNode } from "@opencode/util/effect/layer-node"
import { Global } from "@opencode/util/global"
import type { ModelMessage } from "@tanstack/ai"
import { tempGlobalLayer } from "../fixture/global"
import { offlineModels } from "../fixture/models"
import { tmpdirScoped } from "../fixture/tmpdir"
import { testEffect } from "../lib/effect"

const ANSWER = "Hello from the fake model."

/**
 * The model: an OpenAI-compatible endpoint on loopback. Each call gets `ANSWER`. While `hold` is set, a turn call
 * (a call with tools; the title call has none) gets a stream that never ends, until the client cuts it.
 */
const model = {
  hold: false,
  turns: 0,
  held: Promise.withResolvers<void>(),
  cut: Promise.withResolvers<void>(),
  resumed: Promise.withResolvers<void>(),
}
const encoder = new TextEncoder()
const decodeRequest = Schema.decodeUnknownSync(
  Schema.Struct({ stream: Schema.optional(Schema.Boolean), tools: Schema.optional(Schema.Array(Schema.Unknown)) }),
)
const server = Bun.serve({
  hostname: "127.0.0.1",
  port: 0,
  fetch: async (request) => {
    const body = decodeRequest(await request.json())
    const isTurn = (body.tools?.length ?? 0) > 0
    if (isTurn) model.turns += 1
    if (isTurn && model.hold) {
      model.held.resolve()
      request.signal.addEventListener("abort", () => model.cut.resolve())
      const held = new ReadableStream({
        start: (controller) => controller.enqueue(encoder.encode(": waiting\n\n")),
        cancel: () => model.cut.resolve(),
      })
      return new Response(held, { headers: { "content-type": "text/event-stream" } })
    }
    if (isTurn && model.turns > 1) model.resumed.resolve()
    if (!body.stream) return Response.json(completion())
    return new Response(completionStream(), { headers: { "content-type": "text/event-stream" } })
  },
})
afterAll(() => server.stop(true))

function completion() {
  return {
    id: "chatcmpl-1",
    object: "chat.completion",
    created: 0,
    model: "coder",
    choices: [{ index: 0, message: { role: "assistant", content: ANSWER }, finish_reason: "stop" }],
    usage: { prompt_tokens: 10, completion_tokens: 5, total_tokens: 15 },
  }
}

function completionStream() {
  const chunk = { id: "chatcmpl-1", object: "chat.completion.chunk", created: 0, model: "coder" }
  const events = [
    { ...chunk, choices: [{ index: 0, delta: { role: "assistant", content: ANSWER }, finish_reason: null }] },
    { ...chunk, choices: [{ index: 0, delta: {}, finish_reason: "stop" }] },
    { ...chunk, choices: [], usage: { prompt_tokens: 10, completion_tokens: 5, total_tokens: 15 } },
  ]
  return [...events.map((event) => `data: ${JSON.stringify(event)}\n\n`), "data: [DONE]\n\n"].join("")
}

const config = {
  model: "local/coder",
  providers: {
    local: {
      name: "Local",
      package: "@opencode/ai/providers/openai-compatible",
      settings: { baseURL: new URL("v1", server.url).href, apiKey: "test-key" },
      models: { coder: { name: "Coder", limit: { context: 100_000, output: 8_000 } } },
    },
  },
}
const coder = Model.Ref.make({ providerID: Provider.ID.make("local"), id: Model.ID.make("coder") })

const layer = AppNodeBuilder.build(
  // No session layer and no driver, so the sweeps recover their sessions on the host.
  LayerNode.group([Bus.node, Global.node, Database.node, Session.node, LocationServiceMap.node]),
  [
    Global.node.replace(tempGlobalLayer),
    // No config, skills, or AGENTS.md from the user's home or the project's ancestors.
    Config.node.replace(Config.configured({ project: false, global: false, content: JSON.stringify(config) })),
    InstructionDiscovery.node.replace(InstructionDiscovery.configured({ project: false, global: false })),
    offlineModels,
    Watcher.node.replace(Watcher.configured({ enabled: false })),
  ],
)
const it = testEffect(layer)

/** A temp project and an opencode session in it. */
const setup = Effect.gen(function* () {
  const tmp = yield* tmpdirScoped()
  const location = Location.Ref.make({ directory: AbsolutePath.make(tmp.path) })
  const session = yield* (yield* Session.Service).create({ location, agent: Agent.ID.make("build") })
  return { location, sessionID: session.id }
})

/** Builds the host layer of the location in its own scope, as the location graph does. Close the scope to stop it. */
const startHost = (location: Location.Ref) =>
  Effect.gen(function* () {
    const scope = yield* Scope.make()
    yield* Effect.addFinalizer(() => Scope.close(scope, Exit.void))
    const built = yield* Layer.buildWithScope(
      TanStackHost.layer.pipe(Layer.provide(LocationServiceMap.Service.get(location))),
      scope,
    )
    return { scope, service: Context.get(built, TanStackHost.Service) }
  })

type Setup = Effect.Success<typeof setup>
type Host = Effect.Success<ReturnType<typeof startHost>>

/** Starts a host and a turn on it that the model holds. The turn never ends on this host. */
const holdTurn = (context: Setup) =>
  Effect.gen(function* () {
    model.hold = true
    model.turns = 0
    model.held = Promise.withResolvers<void>()
    model.cut = Promise.withResolvers<void>()
    model.resumed = Promise.withResolvers<void>()
    const host = yield* startHost(context.location)
    const session = yield* host.service.open(context.sessionID)
    const overrides = yield* host.service.overrides(coder)
    // The turn never ends on this host, so its result is not awaited.
    session.prompt("Say hello", { overrides })
    yield* Effect.promise(() => model.held.promise)
    return host
  })

/** Closes the host, and lets the model answer from now on. The closed host keeps its claim on the thread. */
const stopHost = (host: Host) =>
  Effect.gen(function* () {
    yield* Scope.close(host.scope, Exit.void)
    // The closed host cut its model call.
    yield* Effect.promise(() => model.cut.promise)
    model.hold = false
  })

/**
 * A crash: the host stops, but its run leases stay until they expire, as when its process dies. A close gives
 * them back, so this writes them again. Returns the leases.
 */
const crashHost = (host: Host) =>
  Effect.gen(function* () {
    const db = (yield* Database.Service).db
    const leases = yield* db.select().from(TanstackLeaseTable).all()
    yield* stopHost(host)
    yield* db.insert(TanstackLeaseTable).values(leases).run()
    return leases
  })

/** The role and the text of each message. */
function texts(messages: ReadonlyArray<ModelMessage>) {
  return messages.map((message) => ({
    role: message.role,
    text:
      typeof message.content === "string"
        ? message.content
        : (message.content ?? []).flatMap((part) => (part.type === "text" ? [part.content] : [])).join(""),
  }))
}

describe("TanStackHost", () => {
  it.live(
    "runs a prompt with the session id as thread id and keeps the state in SQLite",
    () =>
      Effect.gen(function* () {
        const context = yield* setup
        const first = yield* startHost(context.location)
        const session = yield* first.service.open(context.sessionID)
        const overrides = yield* first.service.overrides(coder)

        const turn = yield* Effect.promise(() => session.prompt("Say hello", { overrides }))
        yield* Scope.close(first.scope, Exit.void)
        // A new host on the same database has only SQLite to read from.
        const second = yield* startHost(context.location)
        const reopened = yield* second.service.open(context.sessionID)

        expect(turn.text).toBe(ANSWER)
        expect(reopened.threadId).toBe(context.sessionID)
        expect(texts(yield* Effect.promise(() => reopened.transcript()))).toEqual([
          { role: "user", text: "Say hello" },
          { role: "assistant", text: ANSWER },
        ])
        const entry = yield* Effect.promise(() => second.service.host.sessions.get(context.sessionID))
        expect(entry?.harness).toBe("opencode")
      }),
    60_000,
  )

  it.live(
    "builds the harness again and reloads the open sessions on a config update",
    () =>
      Effect.gen(function* () {
        const context = yield* setup
        const started = yield* startHost(context.location)
        const session = yield* started.service.open(context.sessionID)
        const before = started.service.harness()
        const abort = new AbortController()
        yield* Effect.addFinalizer(() => Effect.sync(() => abort.abort()))
        const reloaded = (async () => {
          for await (const entry of session.events({ signal: abort.signal })) {
            if (entry.event.type === "CUSTOM" && entry.event.name === "harness.reloaded") return entry.event.value
          }
        })()

        yield* (yield* Bus.Service).publish(Event.Updated, {}, { location: context.location })
        const value = yield* Effect.promise(() => reloaded)

        expect(value).toEqual({})
        expect(started.service.harness()).not.toBe(before)
      }),
    60_000,
  )

  it.live(
    "compacts a session at its next model call, and reads the summary from the log",
    () =>
      Effect.gen(function* () {
        const context = yield* setup
        const started = yield* startHost(context.location)
        const session = yield* started.service.open(context.sessionID)
        const overrides = yield* started.service.overrides(coder)
        const compaction = started.service.compaction()
        // Over the 15,000 tokens that the compaction keeps, so the compaction cuts this message.
        yield* Effect.promise(() => session.prompt("Read this. ".repeat(7_000), { overrides }))
        const abort = new AbortController()
        yield* Effect.addFinalizer(() => Effect.sync(() => abort.abort()))
        const ended = (async () => {
          for await (const entry of session.events({ signal: abort.signal })) {
            if (entry.event.type === "CUSTOM" && entry.event.name === "compaction:ended") return entry.event.value.after
          }
        })()

        compaction?.compactNext(context.sessionID)
        yield* Effect.promise(() => session.prompt("Say hello again", { overrides }))
        const tokensAfter = yield* Effect.promise(() => ended)
        const summary =
          typeof tokensAfter === "number" ? yield* started.service.compacted(context.sessionID, tokensAfter) : undefined

        expect(compaction?.model).toEqual(coder)
        // The compaction cut inside the first turn, so the summary is the context of that turn.
        expect(summary).toBe(`## Turn context\n\n${ANSWER}`)
        expect(texts(yield* Effect.promise(() => session.transcript()))).toEqual([
          {
            role: "assistant",
            text: `<untrusted-conversation-summary>\n## Turn context\n\n${ANSWER}\n</untrusted-conversation-summary>`,
          },
          { role: "assistant", text: ANSWER },
          { role: "user", text: "Say hello again" },
          { role: "assistant", text: ANSWER },
        ])
      }),
    60_000,
  )

  it.live(
    "stops the running turn when the location scope closes, and the next host resumes it at boot",
    () =>
      Effect.gen(function* () {
        yield* Effect.addFinalizer(() => Effect.sync(() => setSystemTime()))
        const context = yield* setup
        yield* stopHost(yield* holdTurn(context))
        // The closed host keeps its claim on the thread for 30 seconds, as a host that crashed.
        setSystemTime(new Date(Date.now() + 60_000))
        // The host of another location leaves the turn alone, so it never runs in that location's folder.
        const elsewhere = yield* tmpdirScoped()
        // If it took the claim, the next host could not resume the turn and this test would time out.
        yield* startHost(Location.Ref.make({ directory: AbsolutePath.make(elsewhere.path) }))
        const second = yield* startHost(context.location)
        // Nothing opened the thread on the new host: its boot sweep runs the turn again.
        yield* Effect.promise(() => model.resumed.promise)
        const resumed = yield* second.service.open(context.sessionID)
        const transcript = yield* Effect.promise(() => poll(() => resumed.transcript(), (messages) => messages.length === 2))

        expect(model.turns).toBe(2)
        expect(texts(transcript)).toEqual([
          { role: "user", text: "Say hello" },
          { role: "assistant", text: ANSWER },
        ])
      }),
    60_000,
  )

  // A TestClock test: the late sweep sleeps one lease time on the Effect clock, and `TestClock.adjust` ends the sleep.
  it.effect(
    "after a crash, a late sweep one lease time after boot resumes the turn that the boot sweep skipped",
    () =>
      Effect.gen(function* () {
        yield* Effect.addFinalizer(() => Effect.sync(() => setSystemTime()))
        const context = yield* setup
        const leases = yield* crashHost(yield* holdTurn(context))
        const second = yield* startHost(context.location)
        // `SessionRestart` opens the session at boot. The crashed host still holds the lease and the claim, so the
        // boot sweep and the open run nothing.
        const session = yield* second.service.open(context.sessionID)
        const atBoot = { turns: model.turns, status: session.snapshot().status }

        // The lease and the claim of the crashed host expire, and the late sweep runs.
        setSystemTime(new Date(Date.now() + 60_000))
        yield* TestClock.adjust("30 seconds")
        yield* Effect.promise(() => model.resumed.promise)
        const transcript = yield* Effect.promise(() => poll(() => session.transcript(), (messages) => messages.length === 2))

        expect(leases).toHaveLength(1)
        expect(atBoot).toEqual({ turns: 1, status: "idle" })
        expect(model.turns).toBe(2)
        expect(texts(transcript)).toEqual([
          { role: "user", text: "Say hello" },
          { role: "assistant", text: ANSWER },
        ])
      }),
    60_000,
  )
})

/** Reads until `done` holds, for up to 10 seconds. */
async function poll<A>(read: () => Promise<A>, done: (value: A) => boolean) {
  const deadline = Date.now() + 10_000
  for (;;) {
    const value = await read()
    if (done(value) || Date.now() > deadline) return value
    await Bun.sleep(20)
  }
}
