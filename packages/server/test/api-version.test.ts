import { expect } from "bun:test"
import { SdkPlugins } from "@opencode/core/plugin/sdk"
import { Plugin } from "@opencode/plugin/effect"
import { API_VERSION, API_VERSION_HEADER } from "@opencode/protocol/api-version"
import { Context, Effect, Layer } from "effect"
import { HttpEffect, HttpRouter, HttpServer } from "effect/unstable/http"
import { tmpdirScoped } from "../../core/test/fixture/tmpdir"
import { it } from "../../core/test/lib/effect"
import { createRoutes } from "../src/routes"

it.live(
  "omits external integration methods, connections, and credentials for clients below API version 2",
  () =>
    Effect.gen(function* () {
      const tmp = yield* tmpdirScoped("opencode-api-version-")
      const context = yield* Layer.build(
        createRoutes({
          password: "secret",
          database: { path: ":memory:" },
          models: { fetch: false },
          fs: { filewatcher: false },
          config: { directory: tmp.path, project: false },
        }).pipe(Layer.provide(HttpServer.layerServices)),
      )
      yield* Context.get(context, SdkPlugins.Service).register(
        Plugin.define({
          id: "external-fixture",
          effect: (ctx) =>
            ctx.integration.transform((editor) => {
              editor.update("cloud", (integration) => {
                integration.name = "Cloud"
              })
              editor.method.update({ integrationID: "cloud", method: { type: "key", label: "API key" } })
              editor.method.update({
                integrationID: "cloud",
                method: { id: "profile", type: "external", label: "Profile" },
              })
            }),
        }),
      )
      const handler = Context.get(context, HttpRouter.HttpRouter)
        .asHttpEffect()
        .pipe(HttpEffect.toWebHandlerWith(context))
      const request = (route: string, input: { version?: number; body?: unknown } = {}) =>
        Effect.promise(async (signal) => {
          const url = new URL(route, "http://opencode.local")
          url.searchParams.set("location[directory]", tmp.path)
          const headers = new Headers({ authorization: `Basic ${btoa("opencode:secret")}` })
          if (input.version !== undefined) headers.set(API_VERSION_HEADER, String(input.version))
          if (input.body !== undefined) headers.set("content-type", "application/json")
          const response = await handler(
            new Request(url, {
              method: input.body === undefined ? "GET" : "POST",
              headers,
              body: input.body === undefined ? undefined : JSON.stringify(input.body),
              signal,
            }),
          )
          expect(response.status).toBeLessThan(300)
          return response.json()
        })

      yield* request("/api/credential", {
        version: API_VERSION,
        body: { integrationID: "cloud", label: "Default profile", value: { type: "external", methodID: "profile" } },
      })
      yield* request("/api/credential", {
        version: API_VERSION,
        body: { integrationID: "cloud", label: "Key", value: { type: "key", key: "secret" }, activate: false },
      })

      const cloud = (body: { data: Array<{ id: string }> }) => body.data.find((item) => item.id === "cloud")
      expect(cloud(yield* request("/api/integration", { version: API_VERSION }))).toMatchObject({
        methods: [{ type: "key" }, { type: "external", id: "profile" }],
        connections: expect.arrayContaining([expect.objectContaining({ method: "external" })]),
      })
      expect((yield* request("/api/credential", { version: API_VERSION })).data).toHaveLength(2)

      // v2.0.24 and earlier send no version header; a malformed header is treated the same way.
      for (const version of [undefined, 1, Number.NaN]) {
        const legacy = cloud(yield* request("/api/integration", { version }))
        expect(legacy).toMatchObject({ methods: [{ type: "key" }] })
        expect(legacy).not.toMatchObject({ methods: expect.arrayContaining([{ type: "external" }]) })
        expect(JSON.stringify(legacy)).not.toContain('"external"')
        expect(JSON.stringify(yield* request("/api/integration/cloud", { version }))).not.toContain('"external"')
        expect(yield* request("/api/credential", { version })).toMatchObject({
          data: [{ integrationID: "cloud", value: { type: "key" } }],
        })
      }
    }),
  15_000,
)
