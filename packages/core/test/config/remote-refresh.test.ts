import path from "path"
import { expect } from "bun:test"
import { Effect, Exit, Fiber, Layer, Option, Stream } from "effect"
import { Config } from "@opencode/core/config"
import { Credential } from "@opencode/core/credential"
import { Bus } from "@opencode/core/bus"
import { WellKnown } from "@opencode/core/wellknown"
import { Watcher } from "@opencode/core/filesystem/watcher"
import { Location } from "@opencode/core/location"
import { AbsolutePath } from "@opencode/core/schema"
import { AppNodeBuilder } from "@opencode/core/effect/app-node-builder"
import { Global } from "@opencode/util/global"
import { FSUtil } from "@opencode/util/fs-util"
import { LayerNode } from "@opencode/util/effect/layer-node"
import { Event } from "@opencode/schema/config"
import { location } from "../fixture/location"
import { tmpdir } from "../fixture/tmpdir"
import { testEffect } from "../lib/effect"

const it = testEffect(Layer.empty)

for (const failure of ["503", "401", "html"] as const) {
  it.live(`retains warm remote config across ${failure} and heals without losing local providers`, () =>
    Effect.gen(function* () {
      const tmp = yield* Effect.acquireDisposable(Effect.promise(() => tmpdir()))
      let mode: "ok" | typeof failure = "ok"
      const server = yield* Effect.acquireRelease(
        Effect.sync(() =>
          Bun.serve({
            hostname: "127.0.0.1",
            port: 0,
            fetch(request) {
              const url = new URL(request.url)
              if (url.pathname === "/.well-known/opencode")
                return Response.json({
                  auth: { command: ["fixture-login"], env: "FIXTURE_TOKEN" },
                  remote_config: {
                    url: `${url.origin}/config`,
                    headers: { authorization: "Bearer {env:FIXTURE_TOKEN}" },
                  },
                })
              if (url.pathname === "/login") return new Response("<html>Fixture login</html>")
              if (request.headers.get("authorization") !== "Bearer fixture-token")
                return new Response(null, { status: 401 })
              if (mode === "html") return Response.redirect(`${url.origin}/login`, 302)
              if (mode !== "ok") return new Response(null, { status: Number(mode) })
              return Response.json({
                providers: { "fixture-org": { package: "native", models: { "fixture-chat": {} } } },
                enabled_providers: ["fixture-org"],
              })
            },
          }),
        ),
        (server) => Effect.promise(() => server.stop(true)),
      )
      const dependencies = AppNodeBuilder.build(
        LayerNode.group([
          Bus.node,
          Credential.node,
          WellKnown.node,
          Watcher.node,
          Location.node,
          Global.node,
          FSUtil.node,
        ]),
        [
          Location.node.replace(
            Layer.succeed(
              Location.Service,
              Location.Service.of(
                location({
                  directory: AbsolutePath.make(tmp.path),
                }),
              ),
            ),
          ),
          Global.node.replace(Global.layerWith({ config: path.join(tmp.path, "global"), home: tmp.path })),
          Watcher.node.replace(Watcher.testLayer),
        ],
      )
      yield* Effect.gen(function* () {
        const wellknown = yield* WellKnown.Service
        const credentials = yield* Credential.Service
        const entry = yield* wellknown.add(server.url.origin)
        yield* credentials.create({
          integrationID: entry.integrationID,
          value: Credential.Key.make({
            type: "key",
            key: "fixture-token",
          }),
        })
        yield* Effect.gen(function* () {
          const config = yield* Config.Service
          const bus = yield* Bus.Service
          const before = yield* config.entries()
          expect(before.some((entry) => entry.type === "document" && entry.info.providers?.["fixture-org"])).toBe(true)
          const refresh = () =>
            Effect.gen(function* () {
              const changed = yield* bus
                .subscribe(Event.Updated)
                .pipe(Stream.take(1), Stream.runDrain, Effect.forkScoped({ startImmediately: true }))
              yield* bus.publish(WellKnown.Event.Updated, {}, { global: true })
              // A last-good implementation may correctly emit no config change.
              yield* Fiber.join(changed).pipe(Effect.timeoutOption("2 seconds"))
              return yield* config.entries()
            })
          mode = failure
          const during = yield* refresh()
          // A fresh Config layer for another Location uses the same global
          // last-good response even though its first remote request fails.
          const cold = yield* Config.Service.use((config) => config.entries()).pipe(
            Effect.provide(Config.layer({ global: false, project: false })),
            Effect.provideService(
              Location.Service,
              Location.Service.of(location({ directory: AbsolutePath.make(path.join(tmp.path, "cold")) })),
            ),
          )
          mode = "ok"
          const after = yield* refresh()
          // Complete the heal phase before the intentionally failing assertion.
          expect(after).toEqual(before)
          expect(during.some((entry) => entry.type === "document" && entry.info.providers?.["fixture-local"])).toBe(
            true,
          )
          expect(cold.some((entry) => entry.type === "document" && entry.info.providers?.["fixture-org"])).toBe(true)
          expect(during).toEqual(before)
        }).pipe(
          Effect.provide(
            Config.layer({
              global: false,
              project: false,
              content: JSON.stringify({
                providers: { "fixture-local": { package: "native", models: { "local-chat": {} } } },
              }),
            }),
          ),
        )
      }).pipe(Effect.provide(dependencies))
    }).pipe(Effect.timeout("10 seconds")),
  )
}

const serviceIt = testEffect(LayerNode.compile(LayerNode.group([WellKnown.node, Bus.node])))

serviceIt.live("changed global wellknown manifests notify both Locations when refreshed from one", () =>
  Effect.gen(function* () {
    let revision = "before"
    const server = yield* Effect.acquireRelease(
      Effect.sync(() =>
        Bun.serve({
          hostname: "127.0.0.1",
          port: 0,
          fetch: () =>
            Response.json({ auth: { command: ["fixture-login"], env: "FIXTURE_TOKEN" }, config: { shell: revision } }),
        }),
      ),
      (server) => Effect.promise(() => server.stop(true)),
    )
    const wellknown = yield* WellKnown.Service
    const bus = yield* Bus.Service
    yield* wellknown.add(server.url.origin)
    const a = Location.Service.of(location({ directory: AbsolutePath.make("/fixture/a") }))
    const b = Location.Service.of(location({ directory: AbsolutePath.make("/fixture/b") }))
    const observe = (value: typeof a) =>
      bus
        .subscribe(WellKnown.Event.Updated)
        .pipe(
          Stream.take(1),
          Stream.runCollect,
          Effect.provideService(Location.Service, value),
          Effect.timeoutOption("500 millis"),
          Effect.forkScoped({ startImmediately: true }),
        )
    const receivedA = yield* observe(a)
    const receivedB = yield* observe(b)
    revision = "after"
    expect(yield* wellknown.refresh().pipe(Effect.provideService(Location.Service, a))).toBe(true)
    expect(Option.isSome(yield* Fiber.join(receivedA))).toBe(true)
    expect(Option.isSome(yield* Fiber.join(receivedB))).toBe(true)
  }).pipe(Effect.timeout("5 seconds")),
)

serviceIt.live("last-good remote config is shared but never reused for a different credential or removed origin", () =>
  Effect.gen(function* () {
    let available = true
    const server = yield* Effect.acquireRelease(
      Effect.sync(() =>
        Bun.serve({
          hostname: "127.0.0.1",
          port: 0,
          fetch(request) {
            const url = new URL(request.url)
            if (url.pathname === "/.well-known/opencode")
              return Response.json({
                auth: { command: ["fixture-login"], env: "FIXTURE_TOKEN" },
                remote_config: { url: `${url.origin}/config` },
              })
            return available
              ? Response.json({ model: "fixture-org/fixture-chat" })
              : new Response(null, { status: 503 })
          },
        }),
      ),
      (server) => Effect.promise(() => server.stop(true)),
    )
    const wellknown = yield* WellKnown.Service
    const entry = yield* wellknown.add(server.url.origin)
    const variables = { FIXTURE_TOKEN: "fixture-token" }
    const before = yield* wellknown.resolve(entry, variables, "fixture-credential")
    available = false
    expect(yield* wellknown.resolve(entry, variables, "fixture-credential")).toEqual(before)
    expect(Exit.isFailure(yield* Effect.exit(wellknown.resolve(entry, variables, "fixture-other-credential")))).toBe(
      true,
    )
    expect(
      Exit.isFailure(
        yield* Effect.exit(wellknown.resolve(entry, { FIXTURE_TOKEN: "rotated-fixture-token" }, "fixture-credential")),
      ),
    ).toBe(true)
    yield* wellknown.remove(server.url.origin)
    const readded = yield* wellknown.add(server.url.origin)
    expect(Exit.isFailure(yield* Effect.exit(wellknown.resolve(readded, variables, "fixture-credential")))).toBe(true)
  }).pipe(Effect.timeout("5 seconds")),
)
