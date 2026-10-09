/**
 * The permission, form, and job facades of the TanStack runtime, on a real harness with a fake model. The
 * harness asks; the event mapper names the asks; the test feeds each mapped batch to `Live`, as the session
 * layer does; then it answers through the opencode services, as the routes do.
 */
import { describe, expect, test } from "bun:test"
import path from "path"
import { Context, Effect, Layer, Schedule, Stream } from "effect"
import { FakeTextAdapter } from "@tanstack/ai/testing"
import type { FakeResponseStep } from "@tanstack/ai/testing"
import { createHarnessHost, defineHarness } from "@tanstack/ai-harness"
import { agents, permissions, question } from "@tanstack/ai-harness/plugins"
import { workspaceTools } from "@tanstack/ai-harness/plugins/coding"
import { memoryLogStore, memoryPersistence } from "@tanstack/ai-persistence"
import { Agent } from "@opencode/core/agent"
import { Bus } from "@opencode/core/bus"
import { Config } from "@opencode/core/config"
import { Database } from "@opencode/core/database/database"
import { AppNodeBuilder } from "@opencode/core/effect/app-node-builder"
import { Watcher } from "@opencode/core/filesystem/watcher"
import { Form } from "@opencode/core/form"
import { InstructionDiscovery } from "@opencode/core/instruction-discovery"
import { Job } from "@opencode/core/job"
import { KV } from "@opencode/core/kv"
import { Location } from "@opencode/core/location"
import { LocationServiceMap } from "@opencode/core/location-service-map"
import { Model } from "@opencode/core/model"
import { Permission } from "@opencode/core/permission"
import { PermissionSaved } from "@opencode/core/permission/saved"
import { Provider } from "@opencode/core/provider"
import { AbsolutePath } from "@opencode/core/schema"
import { Session } from "@opencode/core/session"
import { SessionStore } from "@opencode/core/session/store"
import { createEventMapper } from "@opencode/core/tanstack/events"
import { TanStackForm } from "@opencode/core/tanstack/form-layer"
import { TanStackJob } from "@opencode/core/tanstack/job-layer"
import { TanStackPermission } from "@opencode/core/tanstack/permission-layer"
import { TanstackStores } from "@opencode/core/tanstack/stores"
import { LayerNode } from "@opencode/util/effect/layer-node"
import { Global } from "@opencode/util/global"
import { tempGlobalLayer } from "../fixture/global"
import { offlineModels } from "../fixture/models"
import { tmpdirScoped } from "../fixture/tmpdir"
import { testEffect } from "../lib/effect"

const layer = AppNodeBuilder.build(
  // The facades also need the session store, and the job registry needs the KV store.
  LayerNode.group([
    Bus.node,
    Global.node,
    Database.node,
    Session.node,
    SessionStore.node,
    KV.node,
    LocationServiceMap.node,
  ]),
  [
    Global.node.replace(tempGlobalLayer),
    Config.node.replace(Config.configured({ project: false, global: false, content: "{}" })),
    InstructionDiscovery.node.replace(InstructionDiscovery.configured({ project: false, global: false })),
    offlineModels,
    Watcher.node.replace(Watcher.configured({ enabled: false })),
  ],
)
const it = testEffect(layer)

const model = Model.Ref.make({ providerID: Provider.ID.make("test"), id: Model.ID.make("fake") })

/**
 * A temp project, an opencode session, and a harness session with the same id. The main model answers from
 * `main`, the subagents from `child`. The facades run in the location of the project.
 */
const setup = (responses: {
  readonly main: ReadonlyArray<FakeResponseStep>
  readonly child?: ReadonlyArray<FakeResponseStep>
}) =>
  Effect.gen(function* () {
    const directory = (yield* tmpdirScoped("opencode-ask-facades-")).path
    const sessions = yield* Session.Service
    const created = yield* sessions.create({
      location: Location.Ref.make({ directory: AbsolutePath.make(directory) }),
      agent: Agent.ID.make("build"),
    })
    const here = LocationServiceMap.Service.get(created.location)
    const location = Context.get(yield* Layer.build(here), Location.Service)
    const liveContext = yield* Layer.build(TanStackPermission.liveLayer)
    const savedContext = yield* Layer.build(TanStackPermission.savedLayer)
    const live = Layer.succeedContext(liveContext)
    const saved = Layer.succeedContext(savedContext)
    const facades = yield* Layer.build(
      Layer.mergeAll(TanStackPermission.layer, TanStackForm.layer, TanStackJob.layer).pipe(
        Layer.provide(Layer.mergeAll(live, saved)),
        Layer.provide(here),
      ),
    )
    const tracker = Context.get(liveContext, TanStackPermission.Live)

    const main = new FakeTextAdapter("fake", {})
    main.setResponses([...responses.main])
    const child = new FakeTextAdapter("child", {})
    child.setResponses([...(responses.child ?? [])])
    const stores = (yield* TanstackStores.make).stores
    const host = createHarnessHost({
      // The saved permission rules go to opencode's SQLite, where the saved facade reads them.
      persistence: {
        stores: { log: memoryLogStore(), runs: memoryPersistence().stores.runs, metadata: stores.metadata },
      },
    })
    const harness = defineHarness({
      name: "ask-facades",
      adapter: main,
      subagents: { agents: [], tool: "single" },
      plugins: () => [
        workspaceTools({ root: directory, editStyle: "edit" }),
        permissions({ root: directory }),
        question(),
        agents({ adapter: () => child }),
      ],
    })
    const session = yield* Effect.promise(() => host.open(harness, { threadId: created.id }))
    const controller = new AbortController()
    yield* Effect.addFinalizer(() =>
      Effect.promise(async () => {
        controller.abort()
        await host.close()
      }),
    )
    const mapper = createEventMapper({
      sessionID: created.id,
      location: Location.Ref.make({ directory: location.directory }),
      agent: Agent.ID.make("build"),
      model,
    })
    tracker.track({ session, mapper, outputs: [] })
    yield* Stream.fromAsyncIterable(session.events({ signal: controller.signal }), (cause) => cause).pipe(
      Stream.runForEach((entry) => Effect.sync(() => tracker.track({ session, mapper, outputs: mapper.map(entry) }))),
      Effect.ignore,
      Effect.forkScoped({ startImmediately: true }),
    )
    // Runs before the reader stops: a reader that waits for the next event ends only on the abort.
    yield* Effect.addFinalizer(() => Effect.sync(() => controller.abort()))

    const bus = yield* Bus.Service
    const replied: Array<{ readonly requestID: string; readonly reply: Permission.Reply }> = []
    yield* bus.subscribe(Permission.Event.Replied).pipe(
      Stream.runForEach((event) =>
        Effect.sync(() => replied.push({ requestID: event.data.requestID, reply: event.data.reply })),
      ),
      Effect.forkScoped({ startImmediately: true }),
    )

    return {
      directory,
      session,
      sessionID: created.id,
      location,
      replied,
      permission: Context.get(facades, Permission.Service),
      form: Context.get(facades, Form.Service),
      jobs: Context.get(facades, Job.Service),
      saved: Context.get(savedContext, PermissionSaved.Service),
      /** Starts a turn. Await it with `finished`. */
      prompt: (text: string) => session.prompt(text),
    }
  })

/** Waits for a turn, and fails the test when it does not end in 10 seconds (for example when it still asks). */
const finished = (turn: PromiseLike<unknown>) =>
  Effect.promise(() => Promise.resolve(turn)).pipe(Effect.timeout("10 seconds"))

/** Reads `read` until `done` holds, for up to 10 seconds. */
const until = <A, E, R>(read: Effect.Effect<A, E, R>, done: (value: A) => boolean) =>
  read.pipe(Effect.repeat({ schedule: Schedule.spaced("20 millis"), until: done }), Effect.timeout("10 seconds"))

const readText = (file: string) =>
  Effect.promise(async () => {
    const handle = Bun.file(file)
    return (await handle.exists()) ? await handle.text() : undefined
  })

const writeCall = (id: string, file: string, content: string): FakeResponseStep => ({
  toolCalls: [{ id, name: "write_file", input: { path: file, content } }],
})

/** A model step that keeps the messages it gets, as JSON, and answers with `text`. */
const capture =
  (seen: string[], text: string): FakeResponseStep =>
  async ({ request }) => {
    seen.push(JSON.stringify(request.messages))
    return { text }
  }

describe("TanStack permission facade", () => {
  it.live(
    "lists a harness ask, and a once reply runs the tool and publishes permission.replied",
    () =>
      Effect.gen(function* () {
        const run = yield* setup({ main: [writeCall("call-once", "once.txt", "one"), { text: "Wrote it." }] })
        const turn = run.prompt("Write once.txt")

        const asked = yield* until(run.permission.list(), (list) => list.length > 0)
        expect(asked.map((request) => ({ action: request.action, resources: request.resources }))).toEqual([
          { action: "edit", resources: ["once.txt"] },
        ])
        const id = asked[0].id
        expect(yield* run.permission.forSession(run.sessionID)).toEqual(asked)
        expect(yield* run.permission.get(id)).toEqual(asked[0])

        yield* run.permission.reply({ requestID: id, reply: "once" })
        yield* finished(turn)

        expect(yield* readText(path.join(run.directory, "once.txt"))).toBe("one")
        expect(yield* run.permission.list()).toEqual([])
        expect(
          yield* until(
            Effect.sync(() => run.replied),
            (events) => events.length > 0,
          ),
        ).toEqual([{ requestID: id, reply: "once" }])
      }),
    60_000,
  )

  it.live(
    "a reject with a message refuses the tool and gives the message to the model",
    () =>
      Effect.gen(function* () {
        const seen: string[] = []
        const run = yield* setup({ main: [writeCall("call-reject", "rejected.txt", "no"), capture(seen, "OK.")] })
        const turn = run.prompt("Write rejected.txt")

        const [request] = yield* until(run.permission.list(), (list) => list.length > 0)
        yield* run.permission.reply({ requestID: request.id, reply: "reject", message: "Write notes.md instead." })
        yield* finished(turn)

        expect(yield* readText(path.join(run.directory, "rejected.txt"))).toBeUndefined()
        expect(seen.join("\n")).toContain("Write notes.md instead.")
      }),
    60_000,
  )

  it.live(
    "an always reply saves a rule that the saved routes list and delete",
    () =>
      Effect.gen(function* () {
        const run = yield* setup({
          main: [
            writeCall("call-1", "always.txt", "v1"),
            { text: "Done." },
            writeCall("call-2", "always.txt", "v2"),
            { text: "Done again." },
          ],
        })
        const inLocation = <A, E, R>(effect: Effect.Effect<A, E, R>) =>
          effect.pipe(Effect.provideService(Location.Service, run.location))
        const first = run.prompt("Write v1")
        const [request] = yield* until(run.permission.list(), (list) => list.length > 0)
        yield* run.permission.reply({ requestID: request.id, reply: "always" })
        yield* finished(first)

        const rules = yield* inLocation(run.saved.list())
        expect(
          rules.map((rule) => ({ projectID: rule.projectID, action: rule.action, resource: rule.resource })),
        ).toEqual([{ projectID: run.location.project.id, action: "edit", resource: "always.txt" }])
        // The saved rule allows the next write: the turn ends with no ask.
        yield* finished(run.prompt("Write v2"))
        expect(yield* readText(path.join(run.directory, "always.txt"))).toBe("v2")

        // The harness keeps a deleted rule in the sessions that are open, until they open again. So only the
        // saved list shows the delete here.
        yield* inLocation(run.saved.remove(rules[0].id))
        expect(yield* inLocation(run.saved.list())).toEqual([])
      }),
    60_000,
  )

  it.live(
    "a reply to an unknown request fails with NotFoundError",
    () =>
      Effect.gen(function* () {
        const run = yield* setup({ main: [] })
        const result = yield* run.permission
          .reply({ requestID: Permission.ID.create(), reply: "once" })
          .pipe(Effect.flip)
        expect(result._tag).toBe("Permission.NotFoundError")
      }),
    60_000,
  )
})

describe("TanStack form facade", () => {
  it.live(
    "answers a question tool call through the form, and keeps the answered state",
    () =>
      Effect.gen(function* () {
        const seen: string[] = []
        const run = yield* setup({
          main: [
            {
              toolCalls: [
                {
                  id: "call-question",
                  name: "question",
                  input: { questions: [{ question: "Which color?", options: [{ label: "Red" }, { label: "Blue" }] }] },
                },
              ],
            },
            capture(seen, "Blue it is."),
          ],
        })
        const turn = run.prompt("Pick a color")

        const [form] = yield* until(run.form.list({ sessionID: run.sessionID }), (list) => list.length > 0)
        expect(form.fields).toEqual([
          {
            key: "q0",
            description: "Which color?",
            options: [
              { value: "Red", label: "Red" },
              { value: "Blue", label: "Blue" },
            ],
            custom: true,
            type: "string",
          },
        ])
        expect(yield* run.form.state(form.id)).toEqual({ status: "pending" })

        yield* run.form.reply({ id: form.id, answer: { q0: "Blue" } })
        yield* finished(turn)

        expect(seen.join("\n")).toContain("Answer: Blue")
        expect(yield* run.form.state(form.id)).toEqual({ status: "answered", answer: { q0: "Blue" } })
        expect(yield* run.form.list()).toEqual([])
        const again = yield* run.form.reply({ id: form.id, answer: { q0: "Red" } }).pipe(Effect.flip)
        expect(again._tag).toBe("Form.AlreadySettledError")
      }),
    60_000,
  )
})

describe("TanStack question forms", () => {
  const schema = {
    type: "object",
    properties: {
      delivery: { type: "string", enum: ["pickup", "mail"] },
      address: { type: "string" },
    },
    required: ["delivery"],
    if: { properties: { delivery: { const: "mail" } } },
    then: { required: ["address"] },
  }
  const form = TanStackForm.questionForm({ message: "Where do we send it?", schema, url: "https://pay.example/1" })

  test("turns a url into a page field, and an if/then condition into when", () => {
    expect(form).toEqual({
      title: "Where do we send it?",
      fields: [
        { key: "page", type: "external", url: "https://pay.example/1", title: "Open this page, then answer." },
        {
          key: "delivery",
          required: true,
          type: "string",
          options: [
            { value: "pickup", label: "pickup" },
            { value: "mail", label: "mail" },
          ],
        },
        { key: "address", required: true, when: [{ key: "delivery", op: "eq", value: "mail" }], type: "string" },
      ],
    })
    expect(Form.validateFields(form.fields)).toBeUndefined()
  })

  test("needs the conditional field only when the condition holds", () => {
    expect(Form.validateAnswer(form.fields, { page: true, delivery: "pickup" })).toBeUndefined()
    expect(Form.validateAnswer(form.fields, { page: true, delivery: "mail" })).toBe(
      "Missing required form field: address",
    )
  })

  test("answers the harness with the object, without the page field", () => {
    const answer = { page: true, delivery: "mail", address: "Main Street 1" }
    expect(TanStackForm.harnessAnswer(form.fields, schema, answer)).toEqual({
      delivery: "mail",
      address: "Main Street 1",
    })
  })
})

describe("TanStack job facade", () => {
  it.live(
    "a background subagent run is a job that runs, then completes with its text",
    () =>
      Effect.gen(function* () {
        const gate = Promise.withResolvers<void>()
        const run = yield* setup({
          main: [
            {
              toolCalls: [
                {
                  id: "call-subagent",
                  name: "subagent",
                  input: { agent: "general", description: "Count", prompt: "Count the lines", background: true },
                },
              ],
            },
            { text: "Started." },
            { text: "Noted." },
          ],
          child: [
            async () => {
              await gate.promise
              return { text: "Child done." }
            },
          ],
        })
        yield* finished(run.prompt("Count in the background"))

        const [agentRun] = yield* until(
          Effect.sync(() => run.session.agentRuns()),
          (runs) => runs.length > 0,
        )
        const running = yield* run.jobs.get(agentRun.operationId)
        expect(running && { id: running.id, type: running.type, title: running.title, status: running.status }).toEqual(
          {
            id: agentRun.operationId,
            type: "subagent",
            title: "general",
            status: "running",
          },
        )

        gate.resolve()
        const waited = yield* run.jobs.wait({ id: agentRun.operationId, timeout: 10_000 })
        expect(waited.timedOut).toBe(false)
        expect(waited.info?.status).toBe("completed")
        expect(waited.info?.output).toContain("Child done.")
        expect(yield* run.jobs.get("missing-job")).toBeUndefined()
      }),
    60_000,
  )
})
