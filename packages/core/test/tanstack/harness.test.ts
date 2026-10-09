import { describe, expect } from "bun:test"
import path from "node:path"
import { Agent } from "@opencode/core/agent"
import { Bus } from "@opencode/core/bus"
import { Config } from "@opencode/core/config"
import { AppNodeBuilder } from "@opencode/core/effect/app-node-builder"
import { Watcher } from "@opencode/core/filesystem/watcher"
import { InstructionDiscovery } from "@opencode/core/instruction-discovery"
import { Location } from "@opencode/core/location"
import { LocationServiceMap } from "@opencode/core/location-service-map"
import { Model } from "@opencode/core/model"
import { Provider } from "@opencode/core/provider"
import { AbsolutePath } from "@opencode/core/schema"
import { Session } from "@opencode/core/session"
import { TanStackHarness } from "@opencode/core/tanstack/harness"
import { LayerNode } from "@opencode/util/effect/layer-node"
import { Global } from "@opencode/util/global"
import { fakeText } from "@tanstack/ai/testing"
import { createHarnessHost } from "@tanstack/ai-harness"
import { memoryPersistence } from "@tanstack/ai-persistence"
import { Effect } from "effect"
import { tempGlobalLayer } from "../fixture/global"
import { offlineModels } from "../fixture/models"
import { tmpdirScoped } from "../fixture/tmpdir"
import { testEffect } from "../lib/effect"

// A provider on a closed local port, so a request that the test does not script (the session title) fails at
// once and never leaves the machine.
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

const layer = AppNodeBuilder.build(LayerNode.group([Bus.node, Global.node, Session.node, LocationServiceMap.node]), [
  Global.node.replace(tempGlobalLayer),
  // No config, skills, or AGENTS.md from the user's home or the project's ancestors.
  Config.node.replace(Config.configured({ project: false, global: false, content: JSON.stringify(config) })),
  InstructionDiscovery.node.replace(InstructionDiscovery.configured({ project: false, global: false })),
  offlineModels,
  Watcher.node.replace(Watcher.configured({ enabled: false })),
])
const it = testEffect(layer)

/** A temp project with `notes.txt`, an opencode session in it, and the harness of its location. */
const setup = Effect.gen(function* () {
  const tmp = yield* tmpdirScoped()
  yield* Effect.promise(() => Bun.write(path.join(tmp.path, "notes.txt"), "alpha\n"))
  const ref = Location.Ref.make({ directory: AbsolutePath.make(tmp.path) })
  const session = yield* (yield* Session.Service).create({ location: ref, agent: Agent.ID.make("build") })
  const changes: TanStackHarness.FileChange[] = []
  const built = yield* TanStackHarness.make({ onFileChange: (change) => changes.push(change) }).pipe(
    Effect.provide(LocationServiceMap.Service.get(ref)),
  )
  const host = createHarnessHost({ persistence: memoryPersistence() })
  yield* Effect.addFinalizer(() => Effect.promise(() => host.close()))
  const harnessSession = yield* Effect.promise(() => host.open(built.harness, { threadId: session.id }))
  return { directory: tmp.path, location: ref, built, changes, session: harnessSession }
})

describe("TanStackHarness", () => {
  it.live(
    "runs a scripted turn that edits a file through the workspace tools",
    () =>
      Effect.gen(function* () {
        const context = yield* setup
        const tools: string[][] = []
        const model = fakeText()
        model.setResponses([
          ({ request }) => {
            tools.push((request.tools ?? []).map((tool) => tool.name).toSorted())
            return {
              toolCalls: [
                { id: "call-edit", name: "edit_file", input: { path: "notes.txt", old: "alpha", new: "beta" } },
              ],
            }
          },
          { text: "I changed alpha to beta." },
        ])

        const turn = yield* Effect.promise(() =>
          context.session.prompt("Change alpha to beta in notes.txt", { overrides: { adapter: model } }),
        )

        expect(turn.text).toBe("I changed alpha to beta.")
        expect(yield* Effect.promise(() => Bun.file(path.join(context.directory, "notes.txt")).text())).toBe("beta\n")
        expect(context.changes).toEqual([
          {
            toolCallId: "call-edit",
            path: path.join(context.directory, "notes.txt"),
            before: "alpha\n",
            after: "beta\n",
            status: "modified",
          },
        ])
        // The opencode tools moved into Code Mode. The edit tool of a model that is not GPT is `edit_file`.
        const first = tools[0] ?? []
        expect(first).toContain("execute_typescript")
        expect(first).toContain("edit_file")
        expect(first).toContain("subagent")
        expect(first).not.toContain("patch")
        expect(first).not.toContain("opencode_session_rename")
      }),
    60_000,
  )

  it.live(
    "takes the default model and the primary agents from the opencode config",
    () =>
      Effect.gen(function* () {
        const context = yield* setup
        const adapter = context.built.harness.adapter
        const agents = yield* Effect.promise(() => context.session.command("agent"))

        expect(adapter && "model" in adapter ? adapter.model : undefined).toBe("coder")
        expect(agents).toBe("Agent: build. Agents: build, plan.")
      }),
    60_000,
  )

  it.live(
    "compacts with the default model when the compaction agent has no model",
    () =>
      Effect.gen(function* () {
        const context = yield* setup

        expect(context.built.compaction?.model).toEqual(
          Model.Ref.make({ providerID: Provider.ID.make("local"), id: Model.ID.make("coder") }),
        )
      }),
    60_000,
  )

  it.live(
    "fails the turn overrides of a model that the catalog does not have",
    () =>
      Effect.gen(function* () {
        const context = yield* setup
        const error = yield* context.built
          .overrides(Model.Ref.make({ providerID: Provider.ID.make("local"), id: Model.ID.make("missing") }))
          .pipe(Effect.provide(LocationServiceMap.Service.get(context.location)), Effect.flip)

        expect(error.message).toBe("Model unavailable: local/missing")
      }),
    60_000,
  )
})
