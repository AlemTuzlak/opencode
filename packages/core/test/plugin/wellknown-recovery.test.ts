import { expect } from "bun:test"
import { Effect, Fiber, Layer, Option, Stream } from "effect"
import { Bus } from "@opencode/core/bus"
import { KV } from "@opencode/core/kv"
import { Integration } from "@opencode/core/integration"
import { Plugin } from "@opencode/core/plugin"
import { WellKnown } from "@opencode/core/wellknown"
import { WellKnownPlugin } from "@opencode/core/wellknown/plugin"
import { AppNodeBuilder } from "@opencode/core/effect/app-node-builder"
import { httpClient } from "@opencode/util/effect/app-node-platform"
import { LayerNode } from "@opencode/util/effect/layer-node"
import { wellknownFixture } from "../fixture/wellknown"
import { testEffect } from "../lib/effect"
import { PluginTestLayer } from "./fixture"

const it = testEffect(PluginTestLayer)

it.live(
  "recovers wellknown login registration after cold discovery failure without a revision change",
  () =>
    Effect.gen(function* () {
      const fixture = wellknownFixture()
      const bus = yield* Bus.Service
      const kv = yield* KV.Service
      const plugins = yield* Plugin.Service
      const integrations = yield* Integration.Service
      yield* kv.set("wellknown:sources", [fixture.origin])
      fixture.manifest(false)
      yield* Effect.gen(function* () {
        const wellknown = yield* WellKnown.Service
        // The production internal-plugin loader captures service dependencies,
        // while the registry supplies the activation Scope. Keep that ownership.
        const generation: Plugin.Generation = {
          id: Plugin.ID.make(WellKnownPlugin.Plugin.id),
          revision: "internal",
          effect: (ctx) =>
            WellKnownPlugin.Plugin.effect(ctx).pipe(
              Effect.provideService(Bus.Service, bus),
              Effect.provideService(WellKnown.Service, wellknown),
            ),
        }
        yield* plugins.activate([generation])
        const initial = yield* plugins.list()
        expect(
          fixture.requests.some((request) => request.path === "/.well-known/opencode" && !request.manifestAvailable),
        ).toBe(true)
        expect(yield* integrations.get(Integration.ID.make(fixture.origin))).toBeUndefined()

        const registered = yield* bus.subscribe().pipe(
          Stream.filter((event) => event.type === "integration.updated"),
          Stream.take(1),
          Stream.runDrain,
          Effect.forkScoped({ startImmediately: true }),
        )
        fixture.manifest(true)
        yield* wellknown.add(fixture.origin)
        // The unchanged generation is what a supervisor reactivation supplies.
        // This call must not itself force a revision bump or graph invalidation.
        yield* plugins.activate([generation])
        const observed = yield* Fiber.join(registered).pipe(Effect.timeoutOption("500 millis"))
        const recovered = yield* plugins.list()
        const login = yield* integrations.get(Integration.ID.make(fixture.origin))

        // A fresh activation is an explicit control proving healthy discovery
        // and method registration work. Capture autonomous evidence before it.
        yield* plugins.activate([])
        yield* plugins.activate([generation])
        const reset = yield* integrations.get(Integration.ID.make(fixture.origin))
        expect(reset?.methods.some((method) => method.type === "command" && method.id === "login")).toBe(true)
        expect(recovered.find((plugin) => plugin.id === generation.id)?.state.status).toBe("active")
        expect(Option.isSome(observed)).toBe(true)
        expect(login?.methods.some((method) => method.type === "command" && method.id === "login")).toBe(true)
        // Setup should stay alive through a recoverable discovery outage. This
        // assertion is intentionally not applied to arbitrary failed plugins.
        expect(initial.find((plugin) => plugin.id === generation.id)?.state.status).toBe("active")
      }).pipe(
        Effect.provide(
          AppNodeBuilder.build(LayerNode.group([WellKnown.node]), [
            Bus.node.replace(Layer.succeed(Bus.Service, bus)),
            KV.node.replace(Layer.succeed(KV.Service, kv)),
            httpClient.replace(fixture.http),
          ]),
        ),
      )
    }).pipe(Effect.timeout("5 seconds")),
  6000,
)
