/**
 * Golden event traces of the old session runtime.
 *
 * Each scenario drives a real Session with the scripted `TestLLM` provider,
 * records every session, permission, and form event that the Bus publishes,
 * and compares the normalized trace with `traces/<scenario>.json`.
 *
 * The traces are the contract for the TanStack runtime. Re-record them only
 * when the old runtime changes on purpose:
 *
 *   UPDATE_TRACES=1 bun test test/tanstack/golden-traces.test.ts
 */
import { $ } from "bun"
import { describe, expect } from "bun:test"
import path from "path"
import { Deferred, Effect, Fiber, Layer, Scope, Stream } from "effect"
import { LanguageModel, LLMEvent } from "@opencode/ai"
import { OpenAIChat } from "@opencode/ai/protocols/openai-chat"
import { TestLLM } from "@opencode/ai/testing"
import { Agent } from "@opencode/core/agent"
import { Bus } from "@opencode/core/bus"
import { AppNodeBuilder } from "@opencode/core/effect/app-node-builder"
import { LayerNodePlatform } from "@opencode/core/effect/app-node-platform"
import { Watcher } from "@opencode/core/filesystem/watcher"
import { Config } from "@opencode/core/config"
import { Form } from "@opencode/core/form"
import { InstructionDiscovery } from "@opencode/core/instruction-discovery"
import { LocationServiceMap } from "@opencode/core/location-service-map"
import { Model } from "@opencode/core/model"
import { Permission } from "@opencode/core/permission"
import { Provider } from "@opencode/core/provider"
import { AbsolutePath } from "@opencode/core/schema"
import { Session } from "@opencode/core/session"
import { SessionEvent } from "@opencode/core/session/event"
import { SessionRunnerModel } from "@opencode/core/session/runner/model"
import { LayerNode } from "@opencode/util/effect/layer-node"
import { Global } from "@opencode/util/global"
import type { Event } from "@opencode/schema/event"
import { tempGlobalLayer } from "../fixture/global"
import { offlineModels } from "../fixture/models"
import { tmpdirScoped } from "../fixture/tmpdir"
import { testEffect } from "../lib/effect"
import { normalizeTrace, readTrace, recordTrace, writeTrace } from "./trace"

const llmLayer = TestLLM.testLayer()
const layer = Layer.merge(
  llmLayer,
  AppNodeBuilder.build(LayerNode.group([Bus.node, Global.node, Session.node, LocationServiceMap.node]), [
    Global.node.replace(tempGlobalLayer),
    // The same "vanilla" swaps that `Instance` uses: no config, skills, or
    // AGENTS.md from the user's home or the project's ancestors. Without them
    // a plain `bun test` keeps the real HOME, the temp project sits under it,
    // and the ancestor walk adds the user's own AGENTS.md to the trace.
    Config.node.replace(Config.configured({ project: false, global: false })),
    InstructionDiscovery.node.replace(InstructionDiscovery.configured({ project: false, global: false })),
    offlineModels,
    Watcher.node.replace(Watcher.configured({ enabled: false })),
    LayerNodePlatform.llmClient.replace(llmLayer),
    SessionRunnerModel.node.replace(
      Layer.succeed(SessionRunnerModel.Service, {
        resolve: () =>
          Effect.succeed(
            SessionRunnerModel.resolved(
              LanguageModel.make({ id: "golden", provider: "test", route: OpenAIChat.route }),
              {
                capabilities: { tools: true, input: ["text"], output: ["text"] },
                cost: [],
                limit: { context: 200_000, output: 32_000 },
              },
            ),
          ),
      }),
    ),
  ]),
)
const it = testEffect(layer)

const model = Model.Ref.make({ id: Model.ID.make("golden"), providerID: Provider.ID.make("test") })
const updateTraces = process.env.UPDATE_TRACES === "1"
// Prints `done` once a `release` file exists in the working directory. It
// gives up after 30 seconds, so a failed test never leaves the process behind.
// The command has no `$` or `!`, so bash, PowerShell, and cmd run it the same.
const HOLD_COMMAND = `bun -e "const fs=require('fs');for(let i=0;i<3000;i++){if(fs.existsSync('release'))break;Bun.sleepSync(10)}console.log('done')"`

type Context = Effect.Success<ReturnType<typeof setup>>

/**
 * Creates a git project with `notes.txt`, starts the trace recorder, and
 * creates the session. The recorder starts first, so `session.created` is the
 * first event of every trace.
 */
const setup = Effect.fn("GoldenTraces.setup")(function* () {
  const tmp = yield* tmpdirScoped()
  yield* Effect.promise(async () => {
    await Bun.write(path.join(tmp.path, "notes.txt"), "alpha\n")
    await $`git init -q`.cwd(tmp.path).quiet()
  })
  const recorder = yield* recordTrace()
  const sessions = yield* Session.Service
  const session = yield* sessions.create({
    location: { directory: AbsolutePath.make(tmp.path) },
    title: "Golden",
    agent: Agent.ID.make("build"),
    model,
  })
  return {
    directory: tmp.path,
    // Tool output files live under the temp Global directories.
    global: path.dirname((yield* Global.Service).data),
    recorder,
    session,
    sessions,
    bus: yield* Bus.Service,
    llm: yield* TestLLM.Test,
    location: LocationServiceMap.Service.get(session.location),
  }
})

const scenario = (
  name: string,
  body: (context: Context) => Effect.Effect<void, unknown, Layer.Success<typeof layer> | Scope.Scope>,
) =>
  it.live(
    name,
    () =>
      Effect.gen(function* () {
        const context = yield* setup()
        yield* body(context)
        const trace = normalizeTrace(yield* context.recorder.events, { roots: [context.directory, context.global] })
        if (updateTraces) yield* Effect.promise(() => writeTrace(name, trace))
        expect(trace).toEqual(yield* Effect.promise(() => readTrace(name)))
      }),
    30_000,
  )

/** Waits in the background for the next event that matches. Join the fiber to wait. */
const nextEvent = <D extends Event.Definition>(
  context: Context,
  definition: D,
  matches: (event: Event.Payload<D>) => boolean = () => true,
) =>
  context.bus
    .subscribe(definition)
    .pipe(Stream.filter(matches), Stream.runHead, Effect.forkScoped({ startImmediately: true }))

/** Replies `once` to every permission ask in the session's Location. */
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

const toolCall = (id: string, name: string, input: unknown) => TestLLM.toolCalls(LLMEvent.toolCall({ id, name, input }))

const runTurn = (context: Context, text: string) =>
  Effect.gen(function* () {
    const message = yield* context.sessions.prompt({ sessionID: context.session.id, text })
    yield* context.sessions.wait(context.session.id)
    return message
  })

describe("golden traces on the old runtime", () => {
  scenario("text-turn", (context) =>
    Effect.gen(function* () {
      yield* context.llm.push(TestLLM.text("Hello there", "text-1"))
      yield* runTurn(context, "Say hello")
    }),
  )

  scenario("tool-permission", (context) =>
    Effect.gen(function* () {
      yield* allowPermissions(context)
      // Reads stay allowed. Edits ask, so the trace has one ask and one reply.
      yield* context.sessions.setPermissions({
        sessionID: context.session.id,
        permissions: [{ action: "edit", resource: "*", effect: "ask" }],
      })
      yield* context.llm.push(
        toolCall("call-read", "read", { path: "notes.txt" }),
        toolCall("call-edit", "edit", { path: "notes.txt", oldString: "alpha", newString: "beta" }),
        TestLLM.text("I changed alpha to beta.", "text-1"),
      )
      yield* runTurn(context, "Change alpha to beta in notes.txt")
    }),
  )

  scenario("steer", (context) =>
    Effect.gen(function* () {
      // The first response waits until the steer is queued, so the steer
      // always joins the running turn.
      const steered = yield* Deferred.make<void>()
      yield* context.llm.push(
        Stream.unwrap(
          Deferred.await(steered).pipe(Effect.as(Stream.fromIterable(TestLLM.text("First answer", "text-1")))),
        ),
        TestLLM.text("Answer with the steer", "text-2"),
      )
      yield* context.sessions.prompt({ sessionID: context.session.id, text: "First question" })
      yield* context.llm.wait(1)
      yield* context.sessions.prompt({ sessionID: context.session.id, text: "Also answer this" })
      yield* Deferred.succeed(steered, undefined)
      yield* context.sessions.wait(context.session.id)
    }),
  )

  scenario("interrupt", (context) =>
    Effect.gen(function* () {
      const delta = yield* nextEvent(context, SessionEvent.Text.Delta)
      yield* context.llm.push(
        TestLLM.hangAfter(
          LLMEvent.stepStart({ index: 0 }),
          LLMEvent.textStart({ id: "text-1" }),
          LLMEvent.textDelta({ id: "text-1", text: "Partial" }),
        ),
      )
      yield* context.sessions.prompt({ sessionID: context.session.id, text: "Write a long story" })
      yield* Fiber.join(delta)
      yield* context.sessions.interrupt(context.session.id)
      yield* context.sessions.wait(context.session.id)
    }),
  )

  scenario("compaction", (context) =>
    Effect.gen(function* () {
      yield* context.llm.push(
        TestLLM.text("Hello there", "text-1"),
        TestLLM.text("## Objective\n- Say hello", "summary"),
      )
      yield* runTurn(context, "Say hello")
      yield* context.sessions.compact({ sessionID: context.session.id })
      yield* context.sessions.wait(context.session.id)
    }),
  )

  scenario("subagent", (context) =>
    Effect.gen(function* () {
      yield* allowPermissions(context)
      yield* context.llm.push(
        toolCall("call-subagent", "subagent", {
          agent: "general",
          description: "Count notes",
          prompt: "Count the lines in notes.txt",
        }),
        TestLLM.text("notes.txt has one line.", "child-text"),
        TestLLM.text("The subagent says one line.", "text-1"),
      )
      yield* runTurn(context, "Ask a subagent to count lines")
    }),
  )

  scenario("revert", (context) =>
    Effect.gen(function* () {
      yield* allowPermissions(context)
      yield* context.llm.push(
        toolCall("call-edit", "edit", { path: "notes.txt", oldString: "alpha", newString: "beta" }),
        TestLLM.text("Done.", "text-1"),
      )
      const message = yield* runTurn(context, "Change alpha to beta")
      const sessionID = context.session.id
      yield* context.sessions.revert.stage({ sessionID, messageID: message.id, files: true })
      // Clearing wakes the session so held inputs can run.
      yield* context.sessions.revert.clear(sessionID)
      yield* context.sessions.wait(sessionID)
      yield* context.sessions.revert.stage({ sessionID, messageID: message.id, files: true })
      yield* context.sessions.revert.commit(sessionID)
    }),
  )

  scenario("fork", (context) =>
    Effect.gen(function* () {
      yield* context.llm.push(TestLLM.text("Hello there", "text-1"))
      yield* runTurn(context, "Say hello")
      yield* context.sessions.fork({ sessionID: context.session.id })
    }),
  )

  scenario("question", (context) =>
    Effect.gen(function* () {
      yield* context.bus.subscribe(Form.Event.Created).pipe(
        Stream.runForEach((event) =>
          Form.Service.use((forms) => forms.reply({ id: event.data.form.id, answer: { q0: "Red" } })).pipe(
            Effect.provide(context.location),
            Effect.orDie,
          ),
        ),
        Effect.forkScoped({ startImmediately: true }),
      )
      yield* context.llm.push(
        toolCall("call-question", "question", {
          questions: [
            {
              question: "Which color?",
              header: "Color",
              options: [
                { label: "Red", description: "Warm" },
                { label: "Blue", description: "Cool" },
              ],
            },
          ],
        }),
        TestLLM.text("You picked red.", "text-1"),
      )
      yield* runTurn(context, "Ask me for a color")
    }),
  )

  scenario("background-shell", (context) =>
    Effect.gen(function* () {
      yield* allowPermissions(context)
      // The job waits for a `release` file, so it always ends after the
      // first turn and starts a second turn with its notification.
      const release = path.join(context.directory, "release")
      yield* Effect.addFinalizer(() => Effect.promise(() => Bun.write(release, "")))
      yield* context.llm.push(
        toolCall("call-shell", "shell", { command: HOLD_COMMAND, background: true }),
        TestLLM.text("Started the job.", "text-1"),
        TestLLM.text("The job printed done.", "text-2"),
      )
      yield* runTurn(context, "Run the job in the background")
      const resumed = yield* nextEvent(context, SessionEvent.Execution.Succeeded)
      yield* Effect.promise(() => Bun.write(release, ""))
      yield* Fiber.join(resumed)
    }),
  )
})
