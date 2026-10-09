/**
 * The `browser.*` tools of opencode's browser plugin on the TanStack harness.
 *
 * The tools run on the real browser plugin of the location. Only the desktop browser is fake: it attaches to the
 * session over the browser RPC, as the desktop app does, and answers each command with its tab list. No real browser
 * starts.
 */
import { describe, expect } from "bun:test"
import { Agent } from "@opencode/core/agent"
import { Bus } from "@opencode/core/bus"
import { Config } from "@opencode/core/config"
import { AppNodeBuilder } from "@opencode/core/effect/app-node-builder"
import { Watcher } from "@opencode/core/filesystem/watcher"
import { InstructionDiscovery } from "@opencode/core/instruction-discovery"
import { Location } from "@opencode/core/location"
import { LocationServiceMap } from "@opencode/core/location-service-map"
import { Plugin } from "@opencode/core/plugin"
import { Rpc } from "@opencode/core/rpc"
import { AbsolutePath } from "@opencode/core/schema"
import { Session } from "@opencode/core/session"
import { TanStackHarness } from "@opencode/core/tanstack/harness"
import { TanStackOpencodeTools } from "@opencode/core/tanstack/opencode-tools"
import { Tool } from "@opencode/core/tool"
import { definition } from "@opencode/core/tool/runtime"
import { Browser } from "@opencode/plugin-browser/rpc"
import { LayerNode } from "@opencode/util/effect/layer-node"
import { Global } from "@opencode/util/global"
import { fakeText } from "@tanstack/ai/testing"
import { createHarnessHost } from "@tanstack/ai-harness"
import { memoryPersistence } from "@tanstack/ai-persistence"
import { Deferred, Effect, Schedule, Stream } from "effect"
import { tempGlobalLayer } from "../fixture/global"
import { offlineModels } from "../fixture/models"
import { tmpdirScoped } from "../fixture/tmpdir"
import { testEffect } from "../lib/effect"

// A provider on a closed local port, so a request that the test does not script (the session title) fails at once and
// never leaves the machine.
const config = {
  model: "local/coder",
  providers: {
    local: {
      name: "Local",
      package: "@opencode/ai/providers/openai-compatible",
      settings: { baseURL: "http://127.0.0.1:9/v1", apiKey: "test-key" },
      models: { coder: { name: "Coder", limit: { context: 100_000, output: 8_000 } } },
    },
  },
}

const it = testEffect(
  AppNodeBuilder.build(LayerNode.group([Bus.node, Global.node, Session.node, LocationServiceMap.node]), [
    Global.node.replace(tempGlobalLayer),
    // No config, skills, or AGENTS.md from the user's home or the project's ancestors.
    Config.node.replace(Config.configured({ project: false, global: false, content: JSON.stringify(config) })),
    InstructionDiscovery.node.replace(InstructionDiscovery.configured({ project: false, global: false })),
    offlineModels,
    Watcher.node.replace(Watcher.configured({ enabled: false })),
  ]),
)

const tab = {
  id: Browser.TabID.make(`tab_${crypto.randomUUID()}`),
  url: "https://example.com/docs",
  title: "Example docs",
  loading: false,
  canGoBack: false,
  canGoForward: false,
  generation: 1,
}

type Tools = Effect.Success<ReturnType<typeof TanStackOpencodeTools.registered>>

/** A temp project with an opencode session in it. */
const project = Effect.gen(function* () {
  const tmp = yield* tmpdirScoped()
  const ref = Location.Ref.make({ directory: AbsolutePath.make(tmp.path) })
  const session = yield* (yield* Session.Service).create({ location: ref, agent: Agent.ID.make("build") })
  const location = LocationServiceMap.Service.get(ref)
  yield* Plugin.awaitActivation.pipe(Effect.provide(location))
  return { directory: tmp.path, sessionID: session.id, location }
})

/**
 * A fake desktop browser with one tab, attached to the session for the rest of the test. It answers each command
 * with its tab list, and records the commands.
 */
const attachBrowser = (context: Effect.Success<typeof project>) =>
  Effect.gen(function* () {
    const rpc = (yield* Rpc.Service).client(Browser.Definition)
    const connectionID = crypto.randomUUID()
    const attachment = { sessionID: context.sessionID, connectionID }
    const commands: Browser.Action[] = []
    const attached = yield* Deferred.make<void>()
    yield* rpc.events.subscribe("control").pipe(
      Stream.filter((event) => event.data.connectionID === connectionID),
      Stream.runForEach((event) => {
        if (event.data.type === "attached") return Deferred.succeed(attached, undefined)
        if (event.data.type !== "command") return Effect.void
        const request = { ...attachment, requestID: event.data.requestID }
        return rpc.command(request).pipe(
          Effect.tap((command) => Effect.sync(() => commands.push(command.action))),
          Effect.andThen(
            rpc.result({
              ...request,
              outcome: { type: "success", result: { value: { tabs: [tab], focusedTabID: tab.id }, files: [] } },
            }),
          ),
          Effect.orDie,
        )
      }),
      Effect.forkScoped({ startImmediately: true }),
    )
    yield* rpc.attach({ ...attachment, version: 4 }).pipe(Effect.ignore, Effect.forkScoped)
    yield* rpc.state({ ...attachment, state: { tabs: [tab], focusedTabID: tab.id } }).pipe(
      Effect.retry({
        while: (error) => "type" in error && error.type === "unavailable",
        schedule: Schedule.spaced("10 millis"),
      }),
      Effect.timeout("5 seconds"),
    )
    // The attachment grants the session the browser tools before it announces itself.
    yield* Deferred.await(attached).pipe(Effect.timeout("5 seconds"))
    return { commands }
  }).pipe(Effect.provide(context.location))

/** The registry tools of the session, as the harness gets them for a turn. */
const registered = (context: Effect.Success<typeof project>) =>
  TanStackOpencodeTools.registered({ sessionID: context.sessionID }).pipe(Effect.provide(context.location))

/** The browser tools in a list, sorted by name. */
const browserTools = <Item extends { readonly name: string }>(tools: ReadonlyArray<Item>) =>
  tools.filter((tool) => tool.name.startsWith("browser_")).toSorted((left, right) => left.name.localeCompare(right.name))

/** What the model sees of each tool. */
const describeTools = (
  tools: ReadonlyArray<{ name: string; description: string; inputSchema?: unknown; outputSchema?: unknown }>,
) =>
  tools.map((tool) => ({
    name: tool.name,
    description: tool.description,
    inputSchema: tool.inputSchema,
    outputSchema: tool.outputSchema,
  }))

/** Runs the execute function of a tool, as the harness does. */
const call = (tools: Tools, name: string, args: unknown) =>
  Effect.tryPromise({
    try: async () => {
      const tool = tools.find((item) => item.name === name)
      if (!tool?.execute) throw new Error(`No tool ${name}`)
      return tool.execute(args)
    },
    catch: (error) => error,
  })

describe("TanStack browser tools", () => {
  it.live(
    "has the names, descriptions, and schemas of the browser tools, in Code Mode",
    () =>
      Effect.gen(function* () {
        const context = yield* project
        yield* attachBrowser(context)
        const originals = browserTools(
          (yield* Tool.Service.use((registry) => registry.list()).pipe(Effect.provide(context.location))).map(
            definition,
          ),
        )
        const tools = browserTools(yield* registered(context))

        expect(tools.map((tool) => tool.name)).toContain("browser_tabs_list")
        expect(tools.map((tool) => tool.name)).toContain("browser_snapshot")
        expect(describeTools(tools)).toEqual(describeTools(originals))
        expect(tools.every((tool) => tool.metadata?.codeMode === true)).toBe(true)
      }),
    60_000,
  )

  it.live(
    "leaves the browser tools out until a desktop browser attaches to the session",
    () =>
      Effect.gen(function* () {
        const context = yield* project

        expect(browserTools(yield* registered(context))).toEqual([])
        yield* attachBrowser(context)
        expect(browserTools(yield* registered(context)).length).toBeGreaterThan(0)
      }),
    60_000,
  )

  it.live(
    "browser_tabs_list gives the tab list of the desktop browser",
    () =>
      Effect.gen(function* () {
        const context = yield* project
        const browser = yield* attachBrowser(context)

        const output = yield* call(yield* registered(context), "browser_tabs_list", {})

        expect(output).toEqual({ tabs: [tab], focusedTabID: tab.id })
        expect(browser.commands).toEqual([{ type: "tabs.list" }])
      }),
    60_000,
  )

  it.live(
    "a browser tool rejects with the error of the browser plugin",
    () =>
      Effect.gen(function* () {
        const context = yield* project
        const browser = yield* attachBrowser(context)

        const error = yield* call(yield* registered(context), "browser_snapshot", { tabID: `tab_${crypto.randomUUID()}` }).pipe(
          Effect.flip,
        )

        expect(error instanceof Tool.Error ? error.message : String(error)).toStartWith("[browser.tab_unavailable]")
        expect(browser.commands).toEqual([])
      }),
    60_000,
  )

  it.live(
    "a turn calls browser.tabs.list from Code Mode",
    () =>
      Effect.gen(function* () {
        const context = yield* project
        const browser = yield* attachBrowser(context)
        const built = yield* TanStackHarness.make().pipe(Effect.provide(context.location))
        const host = createHarnessHost({ persistence: memoryPersistence() })
        yield* Effect.addFinalizer(() => Effect.promise(() => host.close()))
        const session = yield* Effect.promise(() => host.open(built.harness, { threadId: context.sessionID }))
        const tools: string[][] = []
        const results: unknown[] = []
        const model = fakeText()
        model.setResponses([
          ({ request }) => {
            tools.push((request.tools ?? []).map((tool) => tool.name))
            return {
              toolCalls: [
                {
                  id: "call-code",
                  name: "execute_typescript",
                  input: { typescriptCode: "return await external_browser_tabs_list({})" },
                },
              ],
            }
          },
          ({ request }) => {
            results.push(request.messages.find((message) => message.toolCallId === "call-code")?.content)
            return { text: "One tab is open." }
          },
        ])

        const turn = yield* Effect.promise(() => session.prompt("Which tabs are open?", { overrides: { adapter: model } }))

        expect(turn.text).toBe("One tab is open.")
        expect(tools[0]).toContain("execute_typescript")
        expect(tools[0]).not.toContain("browser_tabs_list")
        expect(browser.commands).toEqual([{ type: "tabs.list" }])
        expect(JSON.stringify(results[0])).toContain(tab.title)
      }),
    60_000,
  )
})
