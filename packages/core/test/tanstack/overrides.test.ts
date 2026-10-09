/**
 * The runtime flag: `TanStackOverrides.forRuntime` swaps opencode's runtime nodes for the TanStack ones.
 *
 * The tests build the app graph as the server does (`AppNodeBuilder.build` with the flag's replacements), and use
 * the services that the HTTP routes call: `Session` for the session routes and `Generate` for
 * `/api/experimental/generate`. Only the model is fake: an OpenAI-compatible endpoint on loopback, which records
 * the tools and the client of each request.
 */
import { afterAll, describe, expect } from "bun:test"
import { Effect, Schema } from "effect"
import { Agent } from "@opencode/core/agent"
import { Bus } from "@opencode/core/bus"
import { Config } from "@opencode/core/config"
import { Database } from "@opencode/core/database/database"
import { AppNodeBuilder } from "@opencode/core/effect/app-node-builder"
import { Watcher } from "@opencode/core/filesystem/watcher"
import { Generate } from "@opencode/core/generate"
import { InstructionDiscovery } from "@opencode/core/instruction-discovery"
import { Job } from "@opencode/core/job"
import { Location } from "@opencode/core/location"
import { LocationServiceMap } from "@opencode/core/location-service-map"
import { PermissionSaved } from "@opencode/core/permission/saved"
import { AbsolutePath } from "@opencode/core/schema"
import { Session } from "@opencode/core/session"
import { TanStackOverrides } from "@opencode/core/tanstack/overrides"
import { LayerNode } from "@opencode/util/effect/layer-node"
import { Global } from "@opencode/util/global"
import { tempGlobalLayer } from "../fixture/global"
import { offlineModels } from "../fixture/models"
import { tmpdirScoped } from "../fixture/tmpdir"
import { testEffect } from "../lib/effect"

const ANSWER = "Hello from the fake model."

/** One request to the fake model: the names of its tools, and whether the OpenAI SDK of a TanStack adapter sent it. */
interface ModelRequest {
  readonly tools: ReadonlyArray<string>
  readonly openaiSDK: boolean
  /** The `x-opencode-session` header. OpenCode Zen and Go route on it. */
  readonly session: string | null
}

const requests: ModelRequest[] = []
const encoder = new TextEncoder()
const decodeRequest = Schema.decodeUnknownSync(
  Schema.Struct({
    stream: Schema.optional(Schema.Boolean),
    tools: Schema.optional(Schema.Array(Schema.Struct({ function: Schema.Struct({ name: Schema.String }) }))),
  }),
)
const server = Bun.serve({
  hostname: "127.0.0.1",
  port: 0,
  fetch: async (request) => {
    const body = decodeRequest(await request.json())
    requests.push({
      tools: (body.tools ?? []).map((tool) => tool.function.name),
      openaiSDK: request.headers.has("x-stainless-lang"),
      session: request.headers.get("x-opencode-session"),
    })
    if (!body.stream) return Response.json(completion())
    return new Response(encoder.encode(completionStream()), { headers: { "content-type": "text/event-stream" } })
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

/** The app graph of the server, with the replacements of an `OPENCODE_RUNTIME` value. */
function appWith(runtime: string | undefined) {
  return testEffect(
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
        ...TanStackOverrides.forRuntime(runtime),
      ],
    ),
  )
}

const tanstack = appWith("tanstack")
const opencode = appWith(undefined)

/** A temp project. Each test starts with no recorded model requests. */
const project = Effect.gen(function* () {
  requests.length = 0
  const tmp = yield* tmpdirScoped()
  return Location.Ref.make({ directory: AbsolutePath.make(tmp.path) })
})

/** Sends a prompt to a new session in `location`, waits for the turn, and gives the user and assistant texts. */
const promptTurn = (location: Location.Ref) =>
  Effect.gen(function* () {
    const sessions = yield* Session.Service
    const session = yield* sessions.create({ location, agent: Agent.ID.make("build") })
    yield* sessions.prompt({ sessionID: session.id, text: "Say hello" })
    yield* sessions.wait(session.id)
    const messages = yield* sessions.messages({ sessionID: session.id, order: "asc" })
    return messages
      .flatMap((message) => (message.type === "user" || message.type === "assistant" ? [message] : []))
      .map((message) => ({
        type: message.type,
        text:
          message.type === "user"
            ? message.text
            : message.content.flatMap((part) => (part.type === "text" ? [part.text] : [])).join(""),
      }))
  })

/** The tool names of the turn requests. A title or generate request has no tools. */
const turnTools = () => requests.flatMap((request) => request.tools)
/** The distinct session headers of the turn requests. */
const turnSessions = () => [
  ...new Set(requests.filter((request) => request.tools.length > 0).map((request) => request.session)),
]

describe("TanStackOverrides", () => {
  tanstack.live(
    "with OPENCODE_RUNTIME=tanstack, the harness runs the prompt and the reply arrives through the Session API",
    () =>
      Effect.gen(function* () {
        const location = yield* project

        const replies = yield* promptTurn(location)

        expect(replies).toEqual([
          { type: "user", text: "Say hello" },
          { type: "assistant", text: ANSWER },
        ])
        // The harness sends its own tool names. opencode's runner calls the same tool `read`.
        expect(turnTools()).toContain("read_file")
        expect(turnTools()).not.toContain("read")
        // The same session headers as opencode's runner sends.
        expect(turnSessions()).toEqual([expect.stringMatching(/^ses_/)])
      }),
    60_000,
  )

  tanstack.live(
    "with OPENCODE_RUNTIME=tanstack, /api/experimental/generate sends through a TanStack adapter",
    () =>
      Effect.gen(function* () {
        const location = yield* project

        const text = yield* Effect.gen(function* () {
          const generate = yield* Generate.Service
          return yield* generate.text({ prompt: "Say hello" })
        }).pipe(Effect.provide(LocationServiceMap.Service.get(location)))

        expect(text).toBe(ANSWER)
        expect(requests).toEqual([{ tools: [], openaiSDK: true, session: expect.stringMatching(/^ses_/) }])
      }),
    60_000,
  )

  opencode.live(
    "without the flag, opencode's runner runs the prompt",
    () =>
      Effect.gen(function* () {
        const location = yield* project

        const replies = yield* promptTurn(location)

        expect(replies).toEqual([
          { type: "user", text: "Say hello" },
          { type: "assistant", text: ANSWER },
        ])
        expect(turnTools()).toContain("read")
        expect(turnTools()).not.toContain("read_file")
        expect(turnSessions()).toEqual([expect.stringMatching(/^ses_/)])
        expect(requests.some((request) => request.openaiSDK)).toBe(false)
      }),
    60_000,
  )
})
