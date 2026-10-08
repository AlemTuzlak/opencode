import { EOL } from "os"
import { Effect, Option, Schedule } from "effect"
import { Service } from "@opencode/client/effect/service"
import { OpenCode } from "@opencode/client/promise"
import { renderUnicodeCompact } from "uqr"
import { Commands } from "../commands"
import { Runtime } from "../../framework/runtime"
import { RemoteTunnel } from "../../services/remote-tunnel"
import { ServiceConfig } from "../../services/service-config"
import { QrBuild } from "../../ui/qr-build"

export default Runtime.handler(
  Commands.commands.pair,
  Effect.fn("cli.pair")(function* (input: Runtime.Input<typeof Commands.commands.pair>) {
    const config = yield* ServiceConfig.read()
    if (config.disabled === true)
      return yield* Effect.fail(
        new Error("Pairing requires the background service; run `opencode service unset disabled` first"),
      )
    if (input.remote && Option.isSome(input.url))
      return yield* Effect.fail(new Error("--remote cannot be combined with --url"))
    // A device's first tunnel takes about half a minute (its certificate). In a terminal, the QR code is built
    // where it will be printed while that runs; the link's length is known, so the code's shape is too.
    const build =
      input.remote && config.remote === undefined && QrBuild.enabled() && !(yield* RemoteTunnel.created())
        ? // The route is 16 random hex characters, the tunnel ID 12, the pairing code 22.
          QrBuild.start(`https://${"x".repeat(16)}.${"x".repeat(12)}.opentunnel.xyz/auth/connect/${"x".repeat(22)}`)
        : undefined
    const setup = Effect.gen(function* () {
      if (build) {
        yield* RemoteTunnel.ensure((stage) => build.stage(QrBuild.stageOf(stage)))
        build.stage("connecting")
      }
      // Changing the setting restarts the service, and the ensure below starts it again with the tunnel.
      if (input.remote && config.remote === undefined) yield* ServiceConfig.set("remote", "true")
      const endpoint = yield* Service.ensure(yield* ServiceConfig.options())
      const client = OpenCode.make({ baseUrl: endpoint.url, headers: Service.headers(endpoint) })
      const urls = yield* pairingURLs(client, input)
      const pairing = yield* Effect.tryPromise(() => client.server.pair())
      return { endpoint, urls, pairing }
    })
    const { endpoint, urls, pairing } = yield* build ? setup.pipe(Effect.onError(() => Effect.sync(build.clear))) : setup
    const links = urls.map((url) => new URL(`/auth/connect/${pairing.code}`, url).href)
    // Loopback URLs are useless to the scanning device, so the QR code only carries reachable addresses.
    const remote = urls.filter((url) => !isLoopback(new URL(url).hostname))
    // --remote pairs through one public https address, so its QR code carries the link itself: a phone's camera
    // opens it in the OpenCode app when installed (universal link) and in the web app otherwise. Every other QR
    // code may list several addresses, which needs {"code","urls"} JSON that only the app scanners read.
    const qr = input.remote ? links[0] : JSON.stringify({ code: pairing.code, urls: remote })
    const output =
      [
        "",
        `  Open a link to connect. Links work once and expire in ${Math.round(pairing.expires_in / 60)} minutes.`,
        "",
        ...(links.length ? links.map((link) => `  ${link}`) : ["  (no server URLs)"]),
        ...(remote.length
          ? [
              "",
              // uqr separates rows with "\n" on every platform, so splitting on EOL ("\r\n" on Windows) indents only the first row.
              renderUnicodeCompact(qr, {
                border: 2,
              })
                .split("\n")
                .map((line) => "  " + line)
                .join(EOL),
            ]
          : []),
        "",
      ].join(EOL) + EOL
    // The animation finishes on the real code, then the output takes its place line for line.
    if (build && remote.length) yield* Effect.promise(() => build.finish(qr, output))
    else {
      build?.clear()
      process.stdout.write(output)
    }

    if (input.remote || Option.isSome(input.url)) return
    const url = new URL(endpoint.url)
    if (!["localhost", "127.0.0.1", "[::1]"].includes(url.hostname)) return
    process.stderr.write(
      [
        `  Over SSH? Forward the port, then open the link on your machine:`,
        `  ssh -L ${url.port}:${url.hostname}:${url.port} <host>`,
        `  If port ${url.port} is busy locally, forward another port and use it in the link.`,
        "",
        "  To connect from other devices, run `opencode service set hostname 0.0.0.0`.",
        "",
      ].join(EOL) + EOL,
    )
  }),
)

const pairingURLs = Effect.fnUntraced(function* (
  client: ReturnType<typeof OpenCode.make>,
  input: Runtime.Input<typeof Commands.commands.pair>,
) {
  if (input.remote) return [yield* remoteURL(client)]
  if (Option.isSome(input.url)) return [input.url.value]
  return (yield* Effect.tryPromise(() => client.server.info())).urls
})

// The service attaches the tunnel in the background, so wait for its URL to appear in server info.
const remoteURL = Effect.fnUntraced(function* (client: ReturnType<typeof OpenCode.make>) {
  const tunnelURL = Effect.gen(function* () {
    const route = (yield* ServiceConfig.read()).remote?.route
    const hostname = route === undefined ? undefined : yield* RemoteTunnel.hostname(route)
    const info = yield* Effect.tryPromise(() => client.server.info())
    const url = info.urls.find((candidate) => hostname !== undefined && new URL(candidate).hostname === hostname)
    if (url === undefined) return yield* Effect.fail(new Error("Remote tunnel is not ready"))
    return url
  })
  return yield* tunnelURL.pipe(
    Effect.retry({ schedule: Schedule.spaced("1 second") }),
    Effect.timeoutOrElse({
      duration: "3 minutes",
      orElse: () =>
        Effect.fail(new Error("Timed out waiting for the remote tunnel; run `opencode pair --remote` again to retry")),
    }),
  )
})

function isLoopback(hostname: string) {
  return (
    hostname === "localhost" || hostname.endsWith(".localhost") || hostname.startsWith("127.") || hostname === "[::1]"
  )
}
