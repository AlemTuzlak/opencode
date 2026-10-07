import { expect } from "bun:test"
import { Effect, Layer } from "effect"
import { HttpEffect } from "effect/unstable/http"
import { testEffect } from "../../core/test/lib/effect"
import { tmpdir } from "../../core/test/fixture/tmpdir"

const it = testEffect(Layer.empty)

it.live("serves the embedded instance to external clients", () =>
  Effect.acquireRelease(
    Effect.promise(() => tmpdir("opencode-sdk-http-")),
    (directory) => Effect.promise(() => directory[Symbol.asyncDispose]()),
  ).pipe(
    Effect.flatMap((directory) =>
      Effect.gen(function* () {
        const sdk = yield* Effect.promise(() => import("../src/effect"))
        const opencode = yield* sdk.OpenCode.create({
          config: { directory: directory.path, project: false, content: "{}" },
          models: { fetch: false },
          fs: { filewatcher: false },
          password: "secret",
        })
        const handler = HttpEffect.toWebHandler(opencode.http)
        const server = yield* Effect.acquireRelease(
          Effect.sync(() => Bun.serve({ port: 0, hostname: "127.0.0.1", fetch: (request) => handler(request) })),
          (server) => Effect.promise(() => server.stop(true)),
        )
        const base = `http://127.0.0.1:${server.port}`
        const auth = { authorization: `Basic ${btoa("opencode:secret")}` }
        const location = `directory=${encodeURIComponent(directory.path)}`

        // In-process SDK calls still work once the routes require the password.
        const created = yield* opencode.sessions.create({
          id: sdk.Session.ID.create(),
          location: sdk.Location.Ref.make({ directory: sdk.AbsolutePath.make(directory.path) }),
        })
        const page = yield* opencode.sessions.list({ directory: sdk.AbsolutePath.make(directory.path) })
        expect(page.data.map((session) => session.id)).toContain(created.id)

        yield* Effect.promise(async () => {
          expect((await fetch(`${base}/api/session?${location}`)).status).toBe(401)
          const listed = await fetch(`${base}/api/session?${location}`, { headers: auth })
          expect(listed.status).toBe(200)
          expect(JSON.stringify(await listed.json())).toContain(created.id)

          // Server-sent events stream over the socket.
          const events = await fetch(`${base}/api/event`, { headers: auth })
          expect(events.headers.get("content-type")).toContain("text/event-stream")
          const reader = events.body!.getReader()
          expect(new TextDecoder().decode((await reader.read()).value)).toContain("server.connected")
          await reader.cancel()

          // A pairing code yields a session token that works as the password.
          const pairing = await (await fetch(`${base}/api/pair`, { method: "POST", headers: auth })).json()
          const session = await (
            await fetch(`${base}/auth/connect/${pairing.code}`, { headers: { accept: "application/json" } })
          ).json()
          const paired = await fetch(`${base}/api/session?${location}`, {
            headers: { authorization: `Basic ${btoa(`opencode:${session.token}`)}` },
          })
          expect(paired.status).toBe(200)
        })
      }),
    ),
    Effect.scoped,
  ),
)
