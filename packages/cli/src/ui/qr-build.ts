export * as QrBuild from "./qr-build"

import { EOL } from "os"
import { encode, QrCodeDataType } from "uqr"

// While `opencode pair --remote` sets up a device's tunnel for the first time (~25 s, mostly waiting for its
// certificate), two builders build the pairing QR code block by block where it will be printed: the outer wall,
// the corner squares and the timing beams first, then the rest from the bottom row up, each block popping in in
// its builder's color. Nothing unbuilt is shown. The pairing code only exists once the service restarts with
// the tunnel, so the builders lay a stand-in of the same length; when it's ready, the finishing pass re-lays
// every data block from the real code and the whole thing flashes, ending exactly on the printed output.

export type Stage = "address" | "key" | "certificate" | "connecting"

const labels: Record<Stage, string> = {
  address: "Reserving an address for this computer",
  key: "Making a key for this computer",
  certificate: "Getting a certificate for the tunnel",
  connecting: "Connecting the tunnel",
}

// Only in a terminal that can redraw in place and show color.
export function enabled() {
  return (
    process.stdout.isTTY === true &&
    process.env.NO_COLOR === undefined &&
    process.env.TERM !== "dumb" &&
    process.env.CI === undefined
  )
}

type Builder = "left" | "right"
type Look = "blank" | "stone" | "done" | "flash" | Builder

const FPS = 30
const POP = 0.3 // seconds a new block shows its builder's color
const FINISH = 0.55 // seconds for the finishing pass
const FLASH = 0.35

// `sample` is any text of the final QR code's length: same length, same version, so same structure.
export function start(sample: string) {
  const placeholder = encode(sample, { border: 2 })
  const n = placeholder.size
  const mid = (n - 1) / 2
  const height = 5 + Math.ceil(n / 2) + 1
  const started = performance.now()
  const now = () => (performance.now() - started) / 1000

  // Blocks are light modules; dark ones are left empty. Walls go up from the bottom corners, then the
  // corner squares, then the beams, then the rest bottom row up, edge inward.
  const rank = (type: QrCodeDataType) =>
    type === QrCodeDataType.Border
      ? 0
      : type === QrCodeDataType.Position
        ? 1
        : type === QrCodeDataType.Timing || type === QrCodeDataType.Alignment
          ? 2
          : 3
  const owner = (x: number, y: number): Builder => (x < mid || (x === mid && y % 2 === 0) ? "left" : "right")
  const placedAt = Array.from({ length: n }, () => new Array<number>(n).fill(Infinity))
  for (const builder of ["left", "right"] as const) {
    const queue = placeholder.data
      .flatMap((row, y) => row.map((dark, x) => ({ x, y, dark })))
      .filter(({ x, y, dark }) => !dark && owner(x, y) === builder)
      .map(({ x, y }) => {
        const fromEdge = builder === "left" ? x : n - 1 - x
        const kind = rank(placeholder.types[y][x])
        const within =
          kind === 0 ? (n - 1 - y) * 0.6 + fromEdge * 0.2 : kind === 3 ? (n - 1 - y) * 3 + fromEdge * 0.35 : n - 1 - y + fromEdge * 0.4
        return { x, y, order: kind * 1000 + within + Math.random() * 1.5 }
      })
      .sort((a, b) => a.order - b.order)
    // A steady rhythm that eases off, so the build is still going whenever the certificate arrives.
    queue.forEach(({ x, y }, i) => {
      const share = (i + 1) / queue.length
      placedAt[y][x] = share >= 0.92 ? Infinity : -11 * Math.log(1 - share / 0.92) + 0.6
    })
  }

  let stage: Stage = "address"
  let real: ReturnType<typeof encode> | undefined
  let finishAt = Infinity
  const finishDelay = (x: number, y: number) => (1 - Math.abs(x - mid) / (mid + 1)) * 0.45 + (y / n) * 0.1

  function look(x: number, y: number, t: number): Look {
    if (y >= n) return "blank"
    const builder = owner(x, y)
    if (real && t >= finishAt + finishDelay(x, y)) {
      // The finishing pass lays the real block (wall and beams match the stand-in already).
      if (real.data[y][x]) return "blank"
      const laid = finishAt + finishDelay(x, y)
      const settled = t >= finishAt + FINISH ? (t < finishAt + FINISH + FLASH ? "flash" : "done") : "stone"
      // Data blocks are laid again; wall, corners and beams already built stay put.
      const fresh = rank(real.types[y][x]) === 3 || placedAt[y][x] > finishAt
      return fresh && t - laid < POP ? builder : settled
    }
    if (placeholder.data[y][x] || t < placedAt[y][x]) return "blank"
    return t - placedAt[y][x] < POP ? builder : "stone"
  }

  const sgr: Record<Exclude<Look, "blank">, string> = {
    stone: "\x1b[2m",
    done: "",
    flash: "\x1b[1m",
    left: "\x1b[38;2;246;178;108m",
    right: "\x1b[38;2;124;176;246m",
  }
  const priority: Look[] = ["left", "right", "flash", "done", "stone"]

  function frame(t: number) {
    const rows: string[] = []
    for (let y = 0; y < n; y += 2) {
      let line = "  "
      for (let x = 0; x < n; x++) {
        const top = look(x, y, t)
        const bottom = look(x, y + 1, t)
        if (top === "blank" && bottom === "blank") {
          line += " "
          continue
        }
        // One style per character: the liveliest of its two blocks.
        const style = priority.find((p) => p === top || p === bottom) as Exclude<Look, "blank">
        line += sgr[style] + (top !== "blank" && bottom !== "blank" ? "█" : top !== "blank" ? "▀" : "▄") + "\x1b[0m"
      }
      rows.push(line)
    }
    const status = real ? "Ready" : `${labels[stage]}…`
    return ["", `  \x1b[2m${status}\x1b[0m`, "", "", "", ...rows, ""]
  }

  let drawn = false
  const draw = (lines: string[]) => {
    process.stdout.write((drawn ? `\x1b[${height}A` : "") + lines.map((line) => `\x1b[2K${line}`).join(EOL) + EOL)
    drawn = true
  }
  const restoreCursor = () => process.stdout.write("\x1b[?25h")
  process.stdout.write("\x1b[?25l")
  process.once("exit", restoreCursor)
  draw(frame(0))
  const timer = setInterval(() => draw(frame(now())), 1000 / FPS)

  const stop = () => {
    clearInterval(timer)
    restoreCursor()
    process.removeListener("exit", restoreCursor)
  }

  return {
    stage: (next: Stage) => {
      stage = next
    },
    // Lays the real code, flashes, then writes `output` over the animation; `output` must put the code
    // where the animation drew it (5 lines down, indented 2).
    finish: async (content: string, output: string) => {
      const final = encode(content, { border: 2 })
      if (final.size === n) {
        real = final
        finishAt = now()
        await new Promise((resolve) => setTimeout(resolve, (FINISH + FLASH + 0.15) * 1000))
      }
      stop()
      process.stdout.write(`\x1b[${height}A\x1b[J` + output)
    },
    // Clears the animation, for a failed setup.
    clear: () => {
      stop()
      if (drawn) process.stdout.write(`\x1b[${height}A\x1b[J`)
    },
  }
}

// OpenTunnel's provisioning stages, as the steps a person cares about.
export function stageOf(stage: string): Stage {
  if (stage === "creating-tunnel") return "address"
  if (stage === "generating-key" || stage === "generating-csr") return "key"
  if (stage === "saving-identity" || stage === "ready") return "connecting"
  return "certificate"
}
