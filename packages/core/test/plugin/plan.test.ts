import { describe, expect } from "bun:test"
import { Message, ToolFailure } from "@opencode/ai"
import { DateTime, Deferred, Effect, Option, PubSub, Ref, Stream, Types } from "effect"
import type { SessionContext } from "@opencode/plugin/effect/session"
import type { ToolHooks } from "@opencode/plugin/effect/tool"
import { Agent } from "@opencode/core/agent"
import { Config } from "@opencode/core/config"
import { Environment } from "@opencode/core/environment/index"
import { Location } from "@opencode/core/location"
import { Event } from "@opencode/schema/event"
import { Model } from "@opencode/core/model"
import { PlanPlugin } from "@opencode/core/plugin/plan"
import { Permission } from "@opencode/core/permission"
import { Project } from "@opencode/core/project"
import { Provider } from "@opencode/core/provider"
import { AbsolutePath } from "@opencode/core/schema"
import { Session } from "@opencode/core/session"
import { SessionEvent } from "@opencode/core/session/event"
import { SessionInbox } from "@opencode/core/session/inbox"
import { SessionMessage } from "@opencode/core/session/message"
import { Document, Info, type Entry } from "@opencode/schema/config"
import { Tool } from "@opencode/schema/tool"
import { Global } from "@opencode/util/global"
import path from "path"
import { it } from "../lib/effect"
import { host } from "./host"

const sessionID = Session.ID.make("ses_plan_test")
const plan = Agent.ID.make("plan")
const build = Agent.ID.make("build")
const home = "/home/plan-test"
const planDirectory = path.join(home, ".opencode", "plan")

const agentSelected = (agent: Agent.ID, previous: Agent.ID): SessionEvent.AgentSelected => ({
  id: Event.ID.create(),
  created: 0,
  durable: { aggregateID: sessionID, seq: Event.Seq.make(0), version: Event.Version.make(1) },
  type: "session.agent.selected",
  data: { sessionID, agent, previous },
})

const configUpdated = () => ({ id: Event.ID.create(), created: 0, type: "config.updated" as const, data: {} })

const basePermissions = () =>
  [
    { action: "*", resource: "*", effect: "allow" },
    { action: "external_directory", resource: "*", effect: "ask" },
  ] satisfies Types.DeepMutable<Agent.Info>["permissions"]

/** Runs the plan plugin against stubbed domains and config, capturing reminders, hooks, and Plan rules. */
const run = Effect.fnUntraced(function* (
  events: ReadonlyArray<SessionEvent.AgentSelected> = [],
  input: { readonly entries?: ReadonlyArray<Entry>; readonly location?: Location.Info; readonly watch?: boolean } = {},
) {
  const persisted = new Array<string>()
  const entries = yield* Ref.make([...(input.entries ?? [])])
  const updates = yield* PubSub.unbounded<ReturnType<typeof configUpdated>>()
  const reloaded = yield* Deferred.make<void>()
  let contextHook: ((input: SessionContext) => Effect.Effect<void>) | undefined
  let toolHook: ((input: ToolHooks["execute.after"]) => Effect.Effect<void>) | undefined
  let replay: (() => void) | undefined
  const planAgent = {
    id: plan,
    name: Agent.Name.make("Plan"),
    request: { settings: {}, headers: {}, body: {} },
    mode: "primary",
    hidden: false,
    permissions: basePermissions(),
  } satisfies Types.DeepMutable<Agent.Info>
  const driver = Environment.makeMemoryDriver()
  yield* PlanPlugin.Plugin.effect(
    host({
      location: input.location,
      agent: {
        get: () => Effect.die("unused agent.get"),
        list: () => Effect.die("unused agent.list"),
        reload: () =>
          Effect.suspend(() => {
            replay?.()
            return Deferred.succeed(reloaded, undefined)
          }),
        transform: (callback) => {
          replay = () => {
            planAgent.permissions = basePermissions()
            callback({
              list: () => [planAgent],
              get: (id) => (id === plan ? planAgent : undefined),
              default: () => {},
              update: (id, update) => {
                if (id === plan) update(planAgent)
              },
              remove: () => {},
            })
          }
          replay()
          return Effect.succeed({ dispose: Effect.void })
        },
      },
      tool: {
        transform: () => Effect.die("unused tool.transform"),
        reload: () => Effect.die("unused tool.reload"),
        list: () => Effect.die("unused tool.list"),
        hook: (name, callback) => {
          if (name === "execute.after") {
            // Hook names and callbacks are correlated, but TypeScript does not narrow this generic registration API.
            // oxlint-disable-next-line typescript-eslint/no-unsafe-type-assertion
            toolHook = callback as unknown as (input: ToolHooks["execute.after"]) => Effect.Effect<void>
          }
          return Effect.succeed({ dispose: Effect.void })
        },
      },
      event: {
        subscribe: () => (input.watch ? Stream.fromPubSub(updates) : Stream.fromIterable(events)),
      },
      session: {
        hook: (name, callback) => {
          if (name === "context") contextHook = callback as (input: SessionContext) => Effect.Effect<void>
          return Effect.succeed({ dispose: Effect.void })
        },
        synthetic: (input) => {
          persisted.push(input.text)
          return Effect.succeed(
            SessionInbox.Synthetic.make({
              id: SessionMessage.ID.make("msg_plan_test"),
              sessionID,
              time: { created: DateTime.makeUnsafe(0) },
              type: "synthetic",
              payload: { text: input.text },
              delivery: "steer",
            }),
          )
        },
      },
    }),
  ).pipe(
    Effect.provideService(Global.Service, Global.Service.of({ ...Global.make(), home })),
    Effect.provideService(
      Environment.Service,
      Environment.Service.of({ files: Environment.makeFiles(driver), spawner: driver.spawner }),
    ),
    Effect.provideService(
      Config.Service,
      Config.Service.of({ entries: () => Ref.get(entries), changes: () => Stream.empty }),
    ),
  )
  if (!contextHook) return yield* Effect.die("plan plugin did not register a context hook")
  if (!toolHook) return yield* Effect.die("plan plugin did not register a tool hook")
  return {
    persisted,
    contextHook,
    toolHook,
    files: Environment.makeFiles(driver),
    planAgent,
    setEntries: (next: Array<Entry>) => Ref.set(entries, next),
    reloaded,
    publishConfigUpdated: () => PubSub.publish(updates, configUpdated()),
  }
})

const request = (agent: Agent.ID, messages: Array<Message>): SessionContext => ({
  sessionID,
  agent,
  model: { id: Model.ID.make("test-model"), providerID: Provider.ID.make("test") },
  system: [],
  messages,
  tools: {},
  options: {},
})

type ToolErrorEvent = Extract<ToolHooks["execute.after"], { readonly status: "error" }>

const toolError = (tool: "edit" | "write" | "patch", error: Tool.Error): ToolErrorEvent => ({
  tool,
  input: {},
  sessionID,
  agent: plan,
  messageID: SessionMessage.ID.make("msg_plan_tool"),
  id: Tool.CallID.make("call_plan_tool"),
  status: "error",
  error,
})

const settle = (persisted: ReadonlyArray<string>, expected: number, remaining = 1000): Effect.Effect<void, Error> =>
  Effect.gen(function* () {
    if (persisted.length >= expected) return
    if (remaining === 0) {
      return yield* Effect.fail(new Error(`Timed out waiting for ${expected} reminders, saw ${persisted.length}`))
    }
    yield* Effect.promise(() => Bun.sleep(1))
    yield* settle(persisted, expected, remaining - 1)
  })

/** The exact reminder texts, derived from plugin behavior rather than duplicated here. */
const reminders = Effect.gen(function* () {
  const planRun = yield* run()
  yield* planRun.contextHook(request(plan, []))
  const buildRun = yield* run()
  yield* buildRun.contextHook(request(build, [Message.user(planRun.persisted[0]!)]))
  return { enter: planRun.persisted[0]!, leave: buildRun.persisted[0]! }
})

describe("plan plugin reminders", () => {
  it.effect("injects enter and leave reminders on agent switches", () =>
    Effect.gen(function* () {
      const { persisted } = yield* run([agentSelected(plan, build), agentSelected(build, plan)])
      yield* settle(persisted, 2)
      expect(persisted[0]).toContain("You are in Plan mode")
      expect(persisted[0]).toContain("Do not create or update plan files unless the user explicitly asks you to")
      expect(persisted[0]).toContain(planDirectory)
      expect(persisted[0]).toContain("Do not modify any other files")
      expect(persisted[1]).toContain("NO LONGER in Plan mode")
    }),
  )

  it.effect("reconciles a missing enter reminder into the request and persists it", () =>
    Effect.gen(function* () {
      const { persisted, contextHook } = yield* run()
      const messages = [Message.user("what agent are you?")]
      yield* contextHook(request(plan, messages))
      expect(messages).toHaveLength(2)
      // Inserted before the user's prompt, matching where agent-switch reminders land.
      const first = messages[0]?.content[0]
      expect(first?.type === "text" && first.text).toContain("You are in Plan mode")
      expect(persisted).toHaveLength(1)
    }),
  )

  it.effect("does nothing when the transcript already has a live enter reminder", () =>
    Effect.gen(function* () {
      const { enter } = yield* reminders
      const { persisted, contextHook } = yield* run()
      const messages = [Message.user(enter), Message.user("hello")]
      yield* contextHook(request(plan, messages))
      expect(messages).toHaveLength(2)
      expect(persisted).toHaveLength(0)
    }),
  )

  it.effect("reconciles a stale enter reminder with a leave reminder", () =>
    Effect.gen(function* () {
      const { enter } = yield* reminders
      const { persisted, contextHook } = yield* run()
      const messages = [Message.user(enter), Message.user("ok implement it")]
      yield* contextHook(request(build, messages))
      expect(messages).toHaveLength(3)
      const middle = messages[1]?.content[0]
      expect(middle?.type === "text" && middle.text).toContain("NO LONGER in Plan mode")
      expect(persisted).toHaveLength(1)
    }),
  )

  it.effect("does nothing for non-plan sessions without plan history", () =>
    Effect.gen(function* () {
      const { persisted, contextHook } = yield* run()
      const messages = [Message.user("hello")]
      yield* contextHook(request(build, messages))
      expect(messages).toHaveLength(1)
      expect(persisted).toHaveLength(0)
    }),
  )

  it.effect("does nothing when a leave reminder already follows the enter reminder", () =>
    Effect.gen(function* () {
      const { enter, leave } = yield* reminders
      const { persisted, contextHook } = yield* run()
      const messages = [Message.user(enter), Message.user(leave), Message.user("continue")]
      yield* contextHook(request(build, messages))
      expect(messages).toHaveLength(3)
      expect(persisted).toHaveLength(0)
    }),
  )

  it.effect("treats reminder text quoted inside a larger message as not live", () =>
    Effect.gen(function* () {
      const { enter } = yield* reminders
      const { persisted, contextHook } = yield* run()
      // Mirrors a compaction checkpoint quoting the reminder inside <recent-context>.
      const messages = [Message.user(`<conversation-checkpoint>\n${enter}\n</conversation-checkpoint>`)]
      yield* contextHook(request(plan, messages))
      expect(messages).toHaveLength(2)
      expect(persisted).toHaveLength(1)
    }),
  )
})

describe("plan plugin mutations", () => {
  it.effect("does not create the Plan directory during activation", () =>
    Effect.gen(function* () {
      const { files } = yield* run()
      expect(Option.isNone(yield* files.stat(planDirectory).pipe(Effect.option))).toBe(true)
    }),
  )

  it.effect("allows edits only inside the Plan directory", () =>
    Effect.gen(function* () {
      const { planAgent } = yield* run()
      expect(Permission.evaluate("edit", path.join(planDirectory, "work.md"), planAgent.permissions).effect).toBe(
        "allow",
      )
      expect(Permission.evaluate("edit", "/workspace/source.ts", planAgent.permissions).effect).toBe("deny")
      expect(Permission.evaluate("edit", "source.ts", planAgent.permissions).effect).toBe("deny")
    }),
  )

  it.effect("allows the Plan directory external boundary", () =>
    Effect.gen(function* () {
      const { planAgent } = yield* run()
      expect(
        Permission.evaluate("external_directory", path.join(planDirectory, "*"), planAgent.permissions).effect,
      ).toBe("allow")
      expect(
        Permission.evaluate("external_directory", path.join(planDirectory, "nested", "*"), planAgent.permissions)
          .effect,
      ).toBe("allow")
      expect(Permission.evaluate("external_directory", "/outside/*", planAgent.permissions).effect).toBe("ask")
    }),
  )

  it.effect("rewrites blocked mutation failures with the Plan directory", () =>
    Effect.gen(function* () {
      const { toolHook } = yield* run()
      for (const tool of ["edit", "write", "patch"] as const) {
        const event = toolError(
          tool,
          new ToolFailure({
            message: "Unable to modify file",
            error: new Permission.BlockedError({
              rules: [],
              permission: "edit",
              resources: ["source.ts"],
            }),
          }),
        )
        yield* toolHook(event)
        expect(event.error.message).toContain("outside the Plan directory")
        expect(event.error.message).toContain(planDirectory)
      }
    }),
  )

  it.effect("preserves mutation failures unrelated to permissions", () =>
    Effect.gen(function* () {
      const { toolHook } = yield* run()
      const error = new ToolFailure({ message: "oldString was not found" })
      const event = toolError("edit", error)
      yield* toolHook(event)
      expect(event.error).toBe(error)
    }),
  )
})

describe("plan plugin directory", () => {
  it.effect("allows edits only in a configured absolute plan directory", () =>
    Effect.gen(function* () {
      const { planAgent, contextHook, toolHook } = yield* run([], {
        entries: [new Document({ type: "document", info: new Info({ plan: { directory: "/plans" } }) })],
      })
      const messages = [Message.user("where do plans go?")]
      yield* contextHook(request(plan, messages))
      const reminder = messages[0]?.content[0]
      expect(reminder?.type === "text" && reminder.text).toContain("/plans")
      expect(Permission.evaluate("edit", "/plans/work.md", planAgent.permissions).effect).toBe("allow")
      expect(Permission.evaluate("edit", "/home/plan-test/.opencode/plan/work.md", planAgent.permissions).effect).toBe(
        "deny",
      )
      const event = toolError(
        "edit",
        new ToolFailure({
          message: "Unable to modify file",
          error: new Permission.BlockedError({ rules: [], permission: "edit", resources: ["source.ts"] }),
        }),
      )
      yield* toolHook(event)
      expect(event.error.message).toBe("Cannot use edit to modify files outside the Plan directory: /plans")
    }),
  )

  it.effect("expands a home-relative plan directory", () =>
    Effect.gen(function* () {
      const { planAgent, contextHook } = yield* run([], {
        entries: [new Document({ type: "document", info: new Info({ plan: { directory: "~/plans" } }) })],
      })
      const messages = [Message.user("where do plans go?")]
      yield* contextHook(request(plan, messages))
      const reminder = messages[0]?.content[0]
      expect(reminder?.type === "text" && reminder.text).toContain("/home/plan-test/plans")
      expect(Permission.evaluate("edit", "/home/plan-test/plans/work.md", planAgent.permissions).effect).toBe("allow")
      expect(Permission.evaluate("edit", "/home/plan-test/.opencode/plan/work.md", planAgent.permissions).effect).toBe(
        "deny",
      )
    }),
  )

  it.effect("resolves a relative plan directory against the project root", () =>
    Effect.gen(function* () {
      const { planAgent, contextHook } = yield* run([], {
        entries: [new Document({ type: "document", info: new Info({ plan: { directory: ".opencode/plans" } }) })],
        location: new Location.Info({
          directory: AbsolutePath.make("/workspace/packages/app"),
          project: {
            id: Project.ID.global,
            directory: AbsolutePath.make("/workspace"),
            canonical: AbsolutePath.make("/workspace/canonical"),
          },
        }),
      })
      const messages = [Message.user("where do plans go?")]
      yield* contextHook(request(plan, messages))
      const reminder = messages[0]?.content[0]
      expect(reminder?.type === "text" && reminder.text).toContain("/workspace/.opencode/plans")
      expect(Permission.evaluate("edit", "../../.opencode/plans/work.md", planAgent.permissions).effect).toBe("allow")
      expect(Permission.evaluate("edit", "src/index.ts", planAgent.permissions).effect).toBe("deny")
    }),
  )

  it.effect("allows the default plan directory when the Location is the home directory", () =>
    Effect.gen(function* () {
      const { planAgent } = yield* run([], {
        location: new Location.Info({
          directory: AbsolutePath.make(home),
          project: { id: Project.ID.global, directory: AbsolutePath.make(home), canonical: AbsolutePath.make(home) },
        }),
      })
      expect(Permission.evaluate("edit", ".opencode/plan/work.md", planAgent.permissions).effect).toBe("allow")
      expect(Permission.evaluate("edit", "notes.md", planAgent.permissions).effect).toBe("deny")
    }),
  )

  it.effect("applies a plan directory change from config.updated", () =>
    Effect.gen(function* () {
      const { planAgent, contextHook, setEntries, reloaded, publishConfigUpdated } = yield* run([], { watch: true })
      expect(Permission.evaluate("edit", "/home/plan-test/.opencode/plan/work.md", planAgent.permissions).effect).toBe(
        "allow",
      )
      yield* setEntries([new Document({ type: "document", info: new Info({ plan: { directory: "/srv/plans" } }) })])
      yield* publishConfigUpdated()
      yield* Deferred.await(reloaded)
      expect(Permission.evaluate("edit", "/srv/plans/work.md", planAgent.permissions).effect).toBe("allow")
      expect(Permission.evaluate("edit", "/home/plan-test/.opencode/plan/work.md", planAgent.permissions).effect).toBe(
        "deny",
      )
      const messages = [Message.user("where do plans go?")]
      yield* contextHook(request(plan, messages))
      const reminder = messages[0]?.content[0]
      expect(reminder?.type === "text" && reminder.text).toContain("/srv/plans")
    }),
  )
})
