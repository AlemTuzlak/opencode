import path from "path"
import { expect } from "bun:test"
import { Clock, Duration, Effect, Fiber, Layer, Option, Queue, Stream } from "effect"
import { TestClock } from "effect/testing"
import { Config } from "@opencode/core/config"
import { Credential } from "@opencode/core/credential"
import { Bus } from "@opencode/core/bus"
import { KV } from "@opencode/core/kv"
import { WellKnown } from "@opencode/core/wellknown"
import { Watcher } from "@opencode/core/filesystem/watcher"
import { Location } from "@opencode/core/location"
import { AbsolutePath } from "@opencode/core/schema"
import { AppNodeBuilder } from "@opencode/core/effect/app-node-builder"
import { Global } from "@opencode/util/global"
import { FSUtil } from "@opencode/util/fs-util"
import { httpClient } from "@opencode/util/effect/app-node-platform"
import { LayerNode } from "@opencode/util/effect/layer-node"
import { Event } from "@opencode/schema/config"
import { Integration } from "@opencode/schema/integration"
import { location } from "../fixture/location"
import { tmpdirScoped } from "../fixture/tmpdir"
import { wellknownFixture } from "../fixture/wellknown"
import { testEffect } from "../lib/effect"

const it = testEffect(Layer.empty)

for (const start of ["cold", "warm"] as const) {
  it.live(
    start === "cold"
      ? "retries persisted cold sources on the real ten-minute timer after discovery recovers"
      : "warm timer control retries discovery after a manifest outage",
    () =>
      Effect.gen(function* () {
        const fixture = yield* configurationFixture()
        yield* Effect.gen(function* () {
          const wellknown = yield* WellKnown.Service
          const credentials = yield* Credential.Service
          const kv = yield* KV.Service
          // Persist without add() in the cold case; add() warms only the control.
          yield* kv.set("wellknown:sources", [fixture.origin])
          yield* credentials.create({
            integrationID: Integration.ID.make(fixture.origin),
            value: Credential.Key.make({ type: "key", key: "fixture-token" }),
          })
          if (start === "warm") yield* wellknown.add(fixture.origin)
          fixture.manifest(false)
          yield* Effect.gen(function* () {
            const clock = yield* TestClock.testClockWith(Effect.succeed)
            const armed = yield* Queue.unbounded<void>()
            yield* Effect.gen(function* () {
              const config = yield* Config.Service
              const bus = yield* Bus.Service
              const initial = yield* config.entries()
              expect(wellknown.snapshot().length).toBe(start === "warm" ? 1 : 0)
              expect(initial.some((entry) => entry.type === "document" && entry.info.providers?.["fixture-org"])).toBe(
                start === "warm",
              )
              // Observe the actual production sleep, not an accelerated replacement
              // interval. Rearming marks completion of the preceding timer iteration.
              yield* Queue.take(armed)
              if (start === "cold") fixture.manifest(true)
              const changed = yield* bus
                .subscribe(Event.Updated)
                .pipe(Stream.take(1), Stream.runDrain, Effect.forkScoped({ startImmediately: true }))
              yield* TestClock.adjust("10 minutes")
              yield* Queue.take(armed)
              const recovered =
                start === "cold"
                  ? yield* TestClock.withLive(Fiber.join(changed).pipe(Effect.timeoutOption("500 millis")))
                  : Option.none()
              const first = yield* config.entries()
              fixture.manifest(true)
              yield* TestClock.adjust("10 minutes")
              yield* Queue.take(armed)
              const second = yield* config.entries()
              const attempts = fixture.requests
                .filter((request) => request.path === "/.well-known/opencode")
                .map((request) => request.manifestAvailable)
              // Explicit discovery proves the restored fixture is usable, but
              // happens only after capturing the autonomous timer evidence.
              expect((yield* wellknown.entries()).length).toBe(1)
              if (start === "cold") expect(Option.isSome(recovered)).toBe(true)
              expect(first.some((entry) => entry.type === "document" && entry.info.providers?.["fixture-org"])).toBe(
                true,
              )
              expect(second.some((entry) => entry.type === "document" && entry.info.providers?.["fixture-org"])).toBe(
                true,
              )
              expect(attempts.length).toBeGreaterThanOrEqual(3)
              expect(attempts.includes(false)).toBe(true)
              expect(attempts.at(-1)).toBe(true)
              expect(fixture.requests.filter((request) => request.path === "/config").length).toBeGreaterThanOrEqual(
                start === "warm" ? 3 : 2,
              )
            }).pipe(
              Effect.provide(Config.layer({ global: false, project: false })),
              Effect.provideService(Clock.Clock, {
                ...clock,
                sleep: (duration) => {
                  if (Duration.toMillis(duration) === 600_000) Queue.offerUnsafe(armed, undefined)
                  return clock.sleep(duration)
                },
              }),
            )
          }).pipe(Effect.provide(TestClock.layer()))
        }).pipe(Effect.provide(fixture.layer))
      }).pipe(Effect.timeout("5 seconds")),
    6000,
  )
}

const configurationFixture = Effect.fn("fixture.configurationFixture")(function* () {
  const tmp = yield* tmpdirScoped()
  const fixture = wellknownFixture()
  return {
    ...fixture,
    layer: AppNodeBuilder.build(
      LayerNode.group([
        Bus.node,
        Credential.node,
        KV.node,
        WellKnown.node,
        Watcher.node,
        Location.node,
        Global.node,
        FSUtil.node,
      ]),
      [
        httpClient.replace(fixture.http),
        Location.node.replace(
          Layer.succeed(Location.Service, Location.Service.of(location({ directory: AbsolutePath.make(tmp.path) }))),
        ),
        Global.node.replace(Global.layerWith({ config: path.join(tmp.path, "global"), home: tmp.path })),
        Watcher.node.replace(Watcher.testLayer),
      ],
    ),
  }
})
