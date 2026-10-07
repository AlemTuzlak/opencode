import { createServer } from "node:http"
import { expect } from "bun:test"
import { NodeHttpServer } from "@effect/platform-node"
import { Context, Effect, Layer } from "effect"
import { HttpRouter, HttpServer } from "effect/unstable/http"
import { tmpdirScoped } from "../../core/test/fixture/tmpdir"
import { it } from "../../core/test/lib/effect"
import { createEmbeddedRoutes } from "../src/routes"

it.live("embedded routes accept password-authorized PTY WebSockets on an HTTP server", () =>
  Effect.gen(function* () {
    const directory = yield* tmpdirScoped()
    const context = yield* Layer.build(
      createEmbeddedRoutes({
        password: "secret",
        database: { path: ":memory:" },
        models: { fetch: false },
        config: { directory: directory.path, project: false, content: "{}" },
        fs: { filewatcher: false },
      }).pipe(Layer.provide(HttpServer.layerServices)),
    )
    const server = yield* NodeHttpServer.make(() => createServer(), { port: 0, host: "127.0.0.1" })
    yield* server
      .serve(Context.get(context, HttpRouter.HttpRouter).asHttpEffect())
      .pipe(Effect.provide(NodeHttpServer.layerHttpServices))
    const base = HttpServer.formatAddress(server.address)
    const auth = { authorization: `Basic ${btoa("opencode:secret")}` }
    const location = `directory=${encodeURIComponent(directory.path)}`

    const output = yield* Effect.promise(async () => {
      expect((await fetch(`${base}/api/pty?${location}`)).status).toBe(401)
      const pty = await (
        await fetch(`${base}/api/pty?${location}`, {
          method: "POST",
          headers: { ...auth, "content-type": "application/json" },
          body: JSON.stringify({ command: "/bin/sh", args: ["-c", "echo embedded-pty-ready; exec cat"] }),
        })
      ).json()
      const ticket = await (
        await fetch(`${base}/api/pty/${pty.data.id}/connect-token?${location}`, {
          method: "POST",
          headers: { ...auth, "x-opencode-ticket": "1" },
        })
      ).json()
      const url = new URL(`/api/pty/${pty.data.id}/connect?${location}`, base)
      url.protocol = "ws:"
      url.searchParams.set("ticket", ticket.data.ticket)
      return new Promise<string>((resolve, reject) => {
        const socket = new WebSocket(url)
        let text = ""
        const timeout = setTimeout(() => reject(new Error(`PTY output missing: ${text}`)), 5_000)
        socket.addEventListener("message", (event) => {
          text += typeof event.data === "string" ? event.data : new TextDecoder().decode(event.data)
          if (!text.includes("embedded-pty-ready")) return
          clearTimeout(timeout)
          socket.close()
          resolve(text)
        })
        socket.addEventListener("error", () => {
          clearTimeout(timeout)
          reject(new Error("PTY WebSocket failed"))
        })
      })
    })
    expect(output).toContain("embedded-pty-ready")
  }),
)
