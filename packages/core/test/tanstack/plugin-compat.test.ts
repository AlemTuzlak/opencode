/**
 * opencode's plugin hooks on the TanStack harness.
 *
 * Each test loads a real plugin through the plugin host of a location, builds the harness of that location, and runs
 * a turn. Only the model is fake: an OpenAI-compatible endpoint on loopback that streams scripted steps and records
 * each request. The tests read what the model got, so they pin the input and output contract of each hook as the old
 * runtime has it.
 */
import { afterAll, describe, expect } from "bun:test"
import { mkdir } from "node:fs/promises"
import path from "node:path"
import { define } from "@opencode/plugin/effect/plugin"
import type { Plugin as PluginDefinition } from "@opencode/plugin/effect/plugin"
import { Agent } from "@opencode/core/agent"
import { Bus } from "@opencode/core/bus"
import { Config } from "@opencode/core/config"
import { Database } from "@opencode/core/database/database"
import { AppNodeBuilder } from "@opencode/core/effect/app-node-builder"
import { Watcher } from "@opencode/core/filesystem/watcher"
import { InstructionDiscovery } from "@opencode/core/instruction-discovery"
import { Job } from "@opencode/core/job"
import { KV } from "@opencode/core/kv"
import { Location } from "@opencode/core/location"
import { LocationServiceMap } from "@opencode/core/location-service-map"
import { PermissionSaved } from "@opencode/core/permission/saved"
import { PersistentPty } from "@opencode/core/persistent-pty"
import { Plugin } from "@opencode/core/plugin"
import { PluginHost } from "@opencode/core/plugin/host"
import { AbsolutePath } from "@opencode/core/schema"
import { Session } from "@opencode/core/session"
import { TanStackHarness } from "@opencode/core/tanstack/harness"
import { TanStackOverrides } from "@opencode/core/tanstack/overrides"
import { TanStackPluginCompat } from "@opencode/core/tanstack/plugin-compat"
import { Tool } from "@opencode/core/tool"
import { Worktree } from "@opencode/core/worktree"
import { LayerNode } from "@opencode/util/effect/layer-node"
import { Global } from "@opencode/util/global"
import { createHarnessHost } from "@tanstack/ai-harness"
import { memoryPersistence } from "@tanstack/ai-persistence"
import { Effect, Schema } from "effect"
import { tempGlobalLayer } from "../fixture/global"
import { offlineModels } from "../fixture/models"
import { tmpdirScoped } from "../fixture/tmpdir"
import { testEffect } from "../lib/effect"

/** One scripted model response: a text, tool calls, or an HTTP error. */
interface Step {
  readonly text?: string
  readonly toolCalls?: ReadonlyArray<{ readonly id: string; readonly name: string; readonly input: unknown }>
  readonly status?: number
}

/** A turn request that the fake model got. */
interface Received {
  readonly path: string
  readonly headers: Headers
  readonly messages: ReadonlyArray<typeof Message.Type>
}

const Message = Schema.Struct({
  role: Schema.String,
  content: Schema.optional(Schema.Unknown),
  tool_call_id: Schema.optional(Schema.String),
})
const decodeRequest = Schema.decodeUnknownSync(
  Schema.Struct({
    messages: Schema.Array(Message),
    stream: Schema.optional(Schema.Boolean),
    tools: Schema.optional(Schema.Array(Schema.Unknown)),
  }),
)

// The steps of the turn requests, in order. A request without tools, such as the session title, takes none.
const steps: Step[] = []
const received: Received[] = []
const encoder = new TextEncoder()

const server = Bun.serve({
  hostname: "127.0.0.1",
  port: 0,
  fetch: async (request) => {
    const body = decodeRequest(await request.json())
    const isTurn = (body.tools?.length ?? 0) > 0
    if (isTurn) received.push({ path: new URL(request.url).pathname, headers: request.headers, messages: body.messages })
    const step = isTurn ? steps.shift() : { text: "Title" }
    if (!step) return new Response("No scripted step left", { status: 500 })
    if (step.status !== undefined)
      return Response.json({ error: { message: "The request is not valid." } }, { status: step.status })
    if (!body.stream) return Response.json(completion(step))
    return new Response(sse(step), { headers: { "content-type": "text/event-stream" } })
  },
})
afterAll(() => server.stop(true))

const CHUNK = { id: "chatcmpl-1", object: "chat.completion.chunk", created: 0, model: "fake" }

function completion(step: Step) {
  return {
    id: "chatcmpl-1",
    object: "chat.completion",
    created: 0,
    model: "fake",
    choices: [{ index: 0, message: { role: "assistant", content: step.text ?? "" }, finish_reason: "stop" }],
  }
}

function sse(step: Step) {
  const data = (delta: object, finish: string | null) =>
    encoder.encode(`data: ${JSON.stringify({ ...CHUNK, choices: [{ index: 0, delta, finish_reason: finish }] })}\n\n`)
  const toolCalls = (step.toolCalls ?? []).map((call, index) => ({
    index,
    id: call.id,
    type: "function",
    function: { name: call.name, arguments: JSON.stringify(call.input) },
  }))
  const chunks = [
    ...(step.text === undefined ? [] : [data({ role: "assistant", content: step.text }, null)]),
    ...(toolCalls.length === 0 ? [] : [data({ role: "assistant", tool_calls: toolCalls }, null)]),
    data({}, toolCalls.length > 0 ? "tool_calls" : "stop"),
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
  received.length = 0
  steps.push(...next)
}

const config = {
  // Every tool call runs without a question, so the hooks decide alone.
  permissions: [{ action: "*", resource: "*", effect: "allow" }],
  snapshots: false,
  model: "test/fake",
  small_model: "test/fake",
  providers: {
    test: {
      name: "Test",
      package: "@opencode/ai/providers/openai-compatible",
      settings: { baseURL: new URL("v1", server.url).href, apiKey: "test-key" },
      models: { fake: { name: "Fake", limit: { context: 200_000, output: 32_000 } } },
    },
  },
}

const nodes = [
  Global.node.replace(tempGlobalLayer),
  // No config, skills, or AGENTS.md from the user's home or the project's ancestors.
  Config.node.replace(Config.configured({ project: false, global: false, content: JSON.stringify(config) })),
  InstructionDiscovery.node.replace(InstructionDiscovery.configured({ project: false, global: false })),
  offlineModels,
  Watcher.node.replace(Watcher.configured({ enabled: false })),
  Plugin.node.replace(TanStackPluginCompat.pluginNode),
]

// The harness of one location, as `TanStackHarness.make` builds it. `KV`, `PersistentPty`, and `Worktree` are the
// global services of the plugin host.
const it = testEffect(
  AppNodeBuilder.build(
    LayerNode.group([
      Bus.node,
      Global.node,
      Session.node,
      LocationServiceMap.node,
      KV.node,
      PersistentPty.node,
      Worktree.node,
    ]),
    nodes,
  ),
)

// The app graph of the server with OPENCODE_RUNTIME=tanstack, for the hooks of the session layer.
const serverGraph = testEffect(
  AppNodeBuilder.build(
    LayerNode.group([
      Bus.node,
      Global.node,
      Database.node,
      Job.node,
      Session.node,
      PermissionSaved.node,
      LocationServiceMap.node,
      KV.node,
      PersistentPty.node,
      Worktree.node,
    ]),
    [...nodes, ...TanStackOverrides.forRuntime("tanstack")],
  ),
)

/** A temp project with `notes.txt`, an empty `sub` folder, and an opencode session in it. */
const project = Effect.gen(function* () {
  const tmp = yield* tmpdirScoped()
  yield* Effect.promise(async () => {
    await Bun.write(path.join(tmp.path, "notes.txt"), "alpha\n")
    await mkdir(path.join(tmp.path, "sub"))
  })
  const ref = Location.Ref.make({ directory: AbsolutePath.make(tmp.path) })
  const session = yield* (yield* Session.Service).create({ location: ref, agent: Agent.ID.make("build") })
  return { directory: tmp.path, sessionID: session.id, location: LocationServiceMap.Service.get(ref) }
})

/** Loads `plugin` in the location as the plugin registry does, for the rest of the test. */
const load = (location: Effect.Success<typeof project>["location"], plugin: PluginDefinition) =>
  Effect.gen(function* () {
    yield* plugin.effect(yield* PluginHost.make(yield* Plugin.Service, plugin.id))
  }).pipe(Effect.provide(location))

/** Loads `plugin`, builds the harness of the project, and runs one turn with the scripted model. */
const turn = (input: { readonly plugin: PluginDefinition; readonly prompt: string }) =>
  Effect.gen(function* () {
    const context = yield* project
    yield* load(context.location, input.plugin)
    const built = yield* TanStackHarness.make().pipe(Effect.provide(context.location))
    const host = createHarnessHost({ persistence: memoryPersistence() })
    yield* Effect.addFinalizer(() => Effect.promise(() => host.close()))
    const session = yield* Effect.promise(() => host.open(built.harness, { threadId: context.sessionID }))
    const result = yield* Effect.promise(() => session.prompt(input.prompt))
    return { ...context, text: result.text }
  })

/** The content of the tool result that the model got for `toolCallId`. */
function toolResult(toolCallId: string) {
  const message = received.flatMap((request) => request.messages).find((item) => item.tool_call_id === toolCallId)
  return typeof message?.content === "string" ? message.content : JSON.stringify(message?.content)
}

describe("TanStackPluginCompat", () => {
  it.live(
    "session.model.request and session.http.* change the request that reaches the model",
    () =>
      Effect.gen(function* () {
        const seen: string[] = []
        script({ text: "Hello" })
        const context = yield* turn({
          prompt: "Say hello",
          plugin: define({
            id: "test.requests",
            effect: (ctx) =>
              Effect.gen(function* () {
                yield* ctx.session.hook("model.request", (event) =>
                  Effect.sync(() => {
                    seen.push(`model.request ${event.kind} ${event.agent} ${event.model.providerID}/${event.model.id}`)
                    event.headers["x-plugin-model"] = "on"
                    delete event.headers["x-opencode-client"]
                    event.baseURL = new URL("proxy/v1", server.url).href
                  }),
                )
                yield* ctx.session.hook("http.request", (event) =>
                  Effect.sync(() => event.request.headers.set("x-plugin-http", "on")),
                )
                yield* ctx.session.hook("http.response", (event) =>
                  Effect.sync(() => void seen.push(`http.response ${event.response.status}`)),
                )
              }),
          }),
        })

        const request = received[0]
        expect(context.text).toBe("Hello")
        expect(seen).toEqual(["model.request primary build test/fake", "http.response 200"])
        expect(request?.path).toBe("/proxy/v1/chat/completions")
        expect(request?.headers.get("x-plugin-model")).toBe("on")
        expect(request?.headers.get("x-plugin-http")).toBe("on")
        expect(request?.headers.get("x-opencode-session-id")).toBe(context.sessionID)
        expect(request?.headers.has("x-opencode-client")).toBe(false)
      }),
    60_000,
  )

  it.live(
    "tool.execute.before sees the opencode tool and input, and can change the input",
    () =>
      Effect.gen(function* () {
        const seen: Array<{ tool: string; input: unknown }> = []
        script(
          { toolCalls: [{ id: "call-read", name: "read_file", input: { path: "missing.txt" } }] },
          { text: "Read it." },
        )
        yield* turn({
          prompt: "Read the notes",
          plugin: define({
            id: "test.before",
            effect: (ctx) =>
              ctx.tool
                .hook("execute.before", (event) =>
                  Effect.sync(() => {
                    seen.push({ tool: event.tool, input: event.input })
                    if (event.tool === "read") event.input = { path: "notes.txt" }
                  }),
                )
                .pipe(Effect.asVoid),
          }),
        })

        expect(seen).toEqual([{ tool: "read", input: { path: "missing.txt" } }])
        expect(toolResult("call-read")).toBe("1\talpha")
      }),
    60_000,
  )

  it.live(
    "tool.execute.before refuses a call with a Tool.Error",
    () =>
      Effect.gen(function* () {
        script(
          { toolCalls: [{ id: "call-edit", name: "edit_file", input: { path: "notes.txt", old: "alpha", new: "beta" } }] },
          { text: "It was refused." },
        )
        const context = yield* turn({
          prompt: "Change alpha to beta",
          plugin: define({
            id: "test.refuse",
            effect: (ctx) =>
              ctx.tool
                .hook("execute.before", (event) =>
                  event.tool === "edit" ? Effect.fail(new Tool.Error({ message: "Edits wait for review." })) : Effect.void,
                )
                .pipe(Effect.asVoid),
          }),
        })

        expect(toolResult("call-edit")).toBe('{"error":"Edits wait for review."}')
        expect(yield* Effect.promise(() => Bun.file(path.join(context.directory, "notes.txt")).text())).toBe("alpha\n")
      }),
    60_000,
  )

  it.live(
    "tool.execute.after can replace the result that the model gets",
    () =>
      Effect.gen(function* () {
        const seen: unknown[] = []
        script({ toolCalls: [{ id: "call-read", name: "read_file", input: { path: "notes.txt" } }] }, { text: "Done." })
        yield* turn({
          prompt: "Read the notes",
          plugin: define({
            id: "test.after",
            effect: (ctx) =>
              ctx.tool
                .hook("execute.after", (event) =>
                  Effect.sync(() => {
                    if (event.status !== "completed") return
                    seen.push(event.result.content)
                    event.result = { ...event.result, content: [{ type: "text", text: "[redacted]" }] }
                  }),
                )
                .pipe(Effect.asVoid),
          }),
        })

        expect(seen).toEqual([[{ type: "text", text: "1\talpha" }]])
        expect(toolResult("call-read")).toBe("[redacted]")
      }),
    60_000,
  )

  it.live(
    "permission.evaluate can deny a call that the rules allow",
    () =>
      Effect.gen(function* () {
        const seen: string[] = []
        script(
          { toolCalls: [{ id: "call-edit", name: "edit_file", input: { path: "notes.txt", old: "alpha", new: "beta" } }] },
          { text: "It was denied." },
        )
        const context = yield* turn({
          prompt: "Change alpha to beta",
          plugin: define({
            id: "test.permission",
            effect: (ctx) =>
              ctx.permission
                .hook("evaluate", (event) =>
                  Effect.sync(() => {
                    seen.push(`${event.action} ${event.resources.join(",")} ${event.effect}`)
                    if (event.action !== "edit") return
                    event.effect = "deny"
                    event.message = "Edits are frozen."
                  }),
                )
                .pipe(Effect.asVoid),
          }),
        })

        expect(seen).toEqual(["edit notes.txt allow"])
        expect(toolResult("call-edit")).toBe('{"error":"Edits are frozen."}')
        expect(yield* Effect.promise(() => Bun.file(path.join(context.directory, "notes.txt")).text())).toBe("alpha\n")
      }),
    60_000,
  )

  it.live(
    "shell.create.before can change the folder and the environment of a command",
    () =>
      Effect.gen(function* () {
        const command = `bun -e "console.log(process.env.PLUGIN_VALUE + ' ' + process.cwd())"`
        const seen: string[] = []
        script({ toolCalls: [{ id: "call-bash", name: "bash", input: { command } }] }, { text: "Ran it." })
        const context = yield* turn({
          prompt: "Run the command",
          plugin: define({
            id: "test.shell",
            effect: (ctx) =>
              ctx.shell
                .hook("create.before", (event) =>
                  Effect.sync(() => {
                    seen.push(event.command)
                    event.cwd = path.join(event.cwd, "sub")
                    event.env.PLUGIN_VALUE = "from-plugin"
                  }),
                )
                .pipe(Effect.asVoid),
          }),
        })

        expect(seen).toEqual([command])
        expect(toolResult("call-bash")).toContain(`from-plugin ${path.join(context.directory, "sub")}`)
      }),
    60_000,
  )

  it.live(
    "session.retry can retry an error that the harness would not retry",
    () =>
      Effect.gen(function* () {
        const seen: unknown[] = []
        script({ status: 400 }, { text: "Recovered" })
        const context = yield* turn({
          prompt: "Say hello",
          plugin: define({
            id: "test.retry",
            effect: (ctx) =>
              ctx.session
                .hook("retry", (event) =>
                  Effect.sync(() => {
                    seen.push({ attempt: event.attempt, status: event.error.status, decision: event.decision })
                    event.decision = { retry: true, delay: 0 }
                  }),
                )
                .pipe(Effect.asVoid),
          }),
        })

        expect(seen).toEqual([{ attempt: 2, status: 400, decision: { retry: false } }])
        expect(context.text).toBe("Recovered")
      }),
    60_000,
  )

  it.live(
    "a plugin that is not built in fails to load when it registers an aisdk hook",
    () =>
      Effect.gen(function* () {
        const context = yield* project
        const plugins = yield* Plugin.Service.pipe(Effect.provide(context.location))
        const aisdk = (id: string) =>
          define({ id, effect: (ctx) => ctx.aisdk.hook("sdk", () => Effect.void).pipe(Effect.asVoid) })
        yield* plugins.awaitActivation

        yield* plugins.activate([
          { ...aisdk("test.builtin"), revision: "1", source: { type: "builtin" } },
          { ...aisdk("test.local"), revision: "1", source: { type: "local", path: "/plugins/local.ts" } },
        ])

        const listed = yield* plugins.list()
        expect(listed.find((item) => item.id === "test.builtin")?.state).toEqual({ status: "active" })
        const local = listed.find((item) => item.id === "test.local")?.state
        expect(local?.status).toBe("failed")
        expect(local?.status === "failed" ? local.error : "").toContain(
          TanStackPluginCompat.unsupportedHookMessage("test.local", "aisdk.sdk"),
        )
      }),
    60_000,
  )
})

describe("TanStackPluginCompat on the server graph", () => {
  serverGraph.live(
    "session.prompt changes the prompt before the harness admits it",
    () =>
      Effect.gen(function* () {
        script({ text: "Hello" })
        const context = yield* project
        yield* load(
          context.location,
          define({
            id: "test.prompt",
            effect: (ctx) =>
              ctx.session
                .hook("prompt", (event) => Effect.sync(() => void (event.prompt.text = `Rewritten: ${event.prompt.text}`)))
                .pipe(Effect.asVoid),
          }),
        )
        const sessions = yield* Session.Service

        yield* sessions.prompt({ sessionID: context.sessionID, text: "Say hello" })
        yield* sessions.wait(context.sessionID)

        const user = received[0]?.messages.findLast((message) => message.role === "user")
        expect(JSON.stringify(user?.content)).toContain("Rewritten: Say hello")
      }),
    60_000,
  )
})
