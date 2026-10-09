import { expect } from "bun:test"
import { LanguageModel, LLMClient } from "@opencode/ai"
import { OpenAIChat } from "@opencode/ai/protocols"
import { TestLLM } from "@opencode/ai/testing"
import { llmClient } from "@opencode/core/effect/app-node-platform"
import { makeMemoryDriver } from "@opencode/core/environment/index"
import { SessionRunnerModel } from "@opencode/core/session/runner-model"
import { WorkspaceDriver } from "@opencode/core/workspace/driver"
import { Plugin } from "@opencode/plugin/effect"
import { Context, Effect, Exit, Layer, Schema, Scope } from "effect"
import { tmpdirScoped } from "../../core/test/fixture/tmpdir"
import { testEffect } from "../../core/test/lib/effect"
import { AbsolutePath, Location, OpenCode } from "../src/effect"

const it = testEffect(Layer.empty)
const metadata = Schema.decodeUnknownSync(Schema.Struct({ threadID: Schema.String }))
const model = SessionRunnerModel.resolved(
  LanguageModel.make({ id: "instance-model", provider: "test", route: OpenAIChat.route }),
  {
    capabilities: { tools: true, input: ["text"], output: ["text"] },
    cost: [],
    limit: { context: 200_000, output: 8_192 },
  },
)

it.live(
  "qualifies application keys by workspace and reselects a moved Session",
  () =>
    Effect.gen(function* () {
      const directory = yield* tmpdirScoped()
      const llm = yield* TestLLM.Test.pipe(
        Effect.provide(TestLLM.testLayer({ fallback: TestLLM.text("Ready", "answer") })),
      )
      const configured: string[] = []
      const placements: Location.Ref[] = []
      const driver = WorkspaceDriver.make({
        create: ({ workspaceID }) => Effect.succeed({ binding: { workspaceID } }),
        connect: () => Effect.succeed(makeMemoryDriver()),
        suspendForIdle: () => Effect.void,
        destroy: () => Effect.void,
      })
      const opencode = yield* OpenCode.create(
        {
          config: { directory: directory.path, project: false, content: "{}" },
          models: { fetch: false },
          fs: { filewatcher: false },
          workspaceProviders: { memory: driver },
          instances: {
            key: (session) => metadata(session.metadata).threadID,
            configure: (key) =>
              Effect.sync(() => {
                configured.push(key)
                return {
                  plugins: [
                    Plugin.define({
                      id: "placement-hook",
                      effect: (ctx) =>
                        Effect.gen(function* () {
                          placements.push(Location.Ref.make(ctx.location))
                          yield* ctx.session.hook("prompt", (event) =>
                            Effect.sync(() => {
                              event.prompt.text += `:${ctx.location.workspaceID}`
                            }),
                          )
                        }),
                    }),
                  ],
                }
              }),
          },
        },
        {
          overrides: [
            llmClient.replace(Layer.succeed(LLMClient.Service, llm)),
            SessionRunnerModel.node.replace(
              Layer.succeed(SessionRunnerModel.Service, { resolve: () => Effect.succeed(model) }),
            ),
          ],
        },
      )
      const firstWorkspace = yield* opencode.workspace.create({ provider: "memory" })
      const secondWorkspace = yield* opencode.workspace.create({ provider: "memory" })
      const first = yield* opencode.sessions.create({
        title: "First placement",
        location: Location.Ref.make({ directory: AbsolutePath.make(directory.path), workspaceID: firstWorkspace }),
        model: model.ref,
        metadata: { threadID: "same-thread" },
      })
      const second = yield* opencode.sessions.create({
        title: "Second placement",
        location: Location.Ref.make({ directory: AbsolutePath.make(directory.path), workspaceID: secondWorkspace }),
        model: model.ref,
        metadata: { threadID: "same-thread" },
      })
      for (const session of [first, second]) {
        const admitted = yield* opencode.sessions.prompt({ sessionID: session.id, text: "Hello" })
        expect(admitted.payload.text).toBe(`Hello:${session.location.workspaceID}`)
        yield* opencode.sessions.wait({ sessionID: session.id })
      }
      expect(configured).toEqual(["same-thread", "same-thread"])
      expect(placements.map((location) => location.workspaceID)).toEqual([firstWorkspace, secondWorkspace])

      yield* opencode.sessions.move({
        sessionID: first.id,
        directory: AbsolutePath.make(directory.path),
        workspaceID: secondWorkspace,
      })
      yield* opencode.sessions.wait({ sessionID: first.id })
      const moved = yield* opencode.sessions.get({ sessionID: first.id })
      expect(moved.location.workspaceID).toBe(secondWorkspace)
      const admitted = yield* opencode.sessions.prompt({ sessionID: first.id, text: "Moved", resume: false })
      expect(admitted.payload.text).toBe(`Moved:${secondWorkspace}`)
      expect(configured).toEqual(["same-thread", "same-thread"])
    }),
  15_000,
)

class Personas extends Context.Service<Personas, { readonly of: (threadID: string) => Effect.Effect<string> }>()(
  "Personas",
) {}

it.live(
  "configures instances from services provided to the SDK layer",
  () =>
    Effect.gen(function* () {
      const directory = yield* tmpdirScoped()
      const hostScope = yield* Scope.fork(yield* Effect.scope)
      const attempts: string[] = []
      const released: string[] = []
      const layer = OpenCode.layer({
        config: { directory: directory.path, project: false, content: "{}" },
        models: { fetch: false },
        fs: { filewatcher: false },
        instances: {
          key: (session) => metadata(session.metadata).threadID,
          configure: (key) =>
            Effect.gen(function* () {
              const personas = yield* Personas
              const persona = yield* personas.of(key)
              const attempt = attempts.push(key)
              yield* Effect.addFinalizer(() => Effect.sync(() => released.push(`${key}:${attempt}`)))
              if (attempt === 1) return yield* Effect.fail(new Error("Persona store cold"))
              return {
                plugins: [
                  Plugin.define({
                    id: "persona",
                    effect: (ctx) =>
                      ctx.session.hook("prompt", (event) =>
                        Effect.sync(() => {
                          event.prompt.text += `:${persona}`
                        }),
                      ),
                  }),
                ],
              }
            }),
        },
      }).pipe(Layer.provide(Layer.succeed(Personas, { of: (threadID) => Effect.succeed(`persona-for-${threadID}`) })))
      const opencode = Context.get(yield* Layer.build(layer).pipe(Scope.provide(hostScope)), OpenCode.Service)
      const session = yield* opencode.sessions.create({
        title: "Service-configured fixture",
        location: Location.Ref.make({ directory: AbsolutePath.make(directory.path) }),
        metadata: { threadID: "thread-7" },
      })

      // A failed construction is discarded with what `configure` acquired, while the host lives on. Resources
      // bound to the Scope captured alongside the services would instead linger until the host closes.
      const failed = yield* opencode.sessions
        .prompt({ sessionID: session.id, text: "Hello", resume: false })
        .pipe(Effect.exit)
      expect(Exit.isFailure(failed)).toBe(true)
      expect(released).toEqual(["thread-7:1"])

      const admitted = yield* opencode.sessions.prompt({ sessionID: session.id, text: "Hello", resume: false })
      expect(admitted.payload.text).toBe("Hello:persona-for-thread-7")
      expect(attempts).toEqual(["thread-7", "thread-7"])
      expect(released).toEqual(["thread-7:1"])
      yield* Scope.close(hostScope, Exit.void)
      expect(released).toEqual(["thread-7:1", "thread-7:2"])
    }),
  15_000,
)
