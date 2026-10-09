import { describe, expect } from "bun:test"
import path from "path"
import { Effect } from "effect"
import { Agent } from "@opencode/core/agent"
import { AppNodeBuilder } from "@opencode/core/effect/app-node-builder"
import { Watcher } from "@opencode/core/filesystem/watcher"
import { LocationServiceMap } from "@opencode/core/location-service-map"
import { Model } from "@opencode/core/model"
import { Provider } from "@opencode/core/provider"
import { AbsolutePath } from "@opencode/core/schema"
import { Session } from "@opencode/core/session"
import { LayerNode } from "@opencode/util/effect/layer-node"
import { Global } from "@opencode/util/global"
import { tempGlobalLayer } from "../fixture/global"
import { offlineModels } from "../fixture/models"
import { tmpdirScoped } from "../fixture/tmpdir"
import { testEffect } from "../lib/effect"

const it = testEffect(
  AppNodeBuilder.build(LayerNode.group([Session.node, LocationServiceMap.node]), [
    Global.node.replace(tempGlobalLayer),
    offlineModels,
    Watcher.node.replace(Watcher.configured({ enabled: false })),
  ]),
)

const parentModel = Model.Ref.make({ id: Model.ID.make("parent"), providerID: Provider.ID.make("test") })

describe("command subagents", () => {
  it.live("subagent: false overrides subagent mode and the legacy alias", () =>
    Effect.gen(function* () {
      const parent = yield* project({ subagent: false, subtask: true, agent: "reviewer" })
      const sessions = yield* Session.Service
      yield* sessions.command({ sessionID: parent.id, command: "review", text: "changes" })
      expect((yield* sessions.list({ parentID: parent.id })).data).toEqual([])
      expect(yield* sessions.get(parent.id)).toMatchObject({
        agent: "reviewer",
        model: { id: "child" },
      })
      expect(yield* sessions.inbox(parent.id)).toMatchObject([
        { type: "user", payload: { text: "Review changes: ready" } },
      ])
    }),
  )
})

function project(command: { agent?: string; model?: string; subagent?: boolean; subtask?: boolean }) {
  return Effect.gen(function* () {
    const tmp = yield* tmpdirScoped()
    const definition = { description: "Review code", template: "Review $ARGUMENTS: !`printf ready`", ...command }
    yield* Effect.promise(() =>
      Bun.write(
        path.join(tmp.path, "opencode.json"),
        JSON.stringify({
          agents: { reviewer: { mode: "subagent", model: "test/child" } },
          commands: { review: definition },
        }),
      ),
    )
    const sessions = yield* Session.Service
    return yield* sessions.create({
      location: { directory: AbsolutePath.make(tmp.path) },
      title: "Parent session",
      agent: Agent.ID.make("build"),
      model: parentModel,
    })
  })
}
