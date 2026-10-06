// Human-like pointer and keyboard timing for the input agents send through the relay.
//
// Playwright moves the mouse by teleporting: one mouseMoved event straight to the exact center of the target,
// then a press and release a few milliseconds apart. Behavioral bot detection (reCAPTCHA v3, Cloudflare, DataDome,
// HUMAN) scores exactly that. This module sits in the relay's CDP path and, for each Input.dispatchMouseEvent
// that moves the pointer, first sends a curved, eased trajectory from the pointer's last position (a cubic Bezier
// with a perpendicular bow, minimum-jerk velocity, ~60-120 Hz samples, sub-pixel tremor, and an occasional
// overshoot and correction), with a duration that grows with distance (Fitts' law). It also holds a press for a
// human 60-140 ms, settles briefly before pressing, and spaces consecutive key presses 30-110 ms apart.
//
// Off with OPENCODE_BROWSER_HUMAN_INPUT=0 (for example for fast test runs).
import type { JsonObject } from "./protocol.ts"
import { relayLog } from "./relay-log.ts"

type Point = { x: number; y: number }
type Send = (method: string, params: JsonObject) => Promise<unknown>

const enabled = !/^(0|false|off|no)$/i.test(process.env.OPENCODE_BROWSER_HUMAN_INPUT ?? "")

type TabState = { pointer?: Point; aim?: Point & { dx: number; dy: number }; arrivedAt: number; pressedAt?: number; lastKeyAt: number; queue: Promise<void> }
const tabs = new Map<number, TabState>()

function state(tabId: number): TabState {
  let value = tabs.get(tabId)
  if (!value) {
    value = { arrivedAt: 0, lastKeyAt: 0, queue: Promise.resolve() }
    tabs.set(tabId, value)
  }
  return value
}

export function forgetTab(tabId: number) {
  tabs.delete(tabId)
}

const sleep = (ms: number) => (ms > 0 ? new Promise((resolve) => setTimeout(resolve, ms)) : Promise.resolve())
const random = (min: number, max: number) => min + Math.random() * (max - min)
/** Normal-ish noise (sum of uniforms). */
const noise = (scale: number) => (Math.random() + Math.random() + Math.random() - 1.5) * scale

/** Minimum-jerk position profile: slow start, fast middle, slow arrival. */
const minimumJerk = (t: number) => t * t * t * (10 - 15 * t + 6 * t * t)

function bezier(p0: Point, p1: Point, p2: Point, p3: Point, t: number): Point {
  const u = 1 - t
  return {
    x: u * u * u * p0.x + 3 * u * u * t * p1.x + 3 * u * t * t * p2.x + t * t * t * p3.x,
    y: u * u * u * p0.y + 3 * u * u * t * p1.y + 3 * u * t * t * p2.y + t * t * t * p3.y,
  }
}

/** Points (with delays) for one human-looking movement from `from` to `to`. */
export function trajectory(from: Point, to: Point): { point: Point; delay: number }[] {
  const dx = to.x - from.x
  const dy = to.y - from.y
  const distance = Math.hypot(dx, dy)
  if (distance < 2) return []
  // Fitts' law with a ~40px target, plus personal variation.
  const duration = Math.min(1100, (90 + 110 * Math.log2(distance / 40 + 1)) * random(0.85, 1.25))
  // Bow the path to one side, more for longer moves, never past ~18% of the distance.
  const normal = { x: -dy / distance, y: dx / distance }
  const bow = (Math.random() < 0.5 ? -1 : 1) * random(0.04, 0.18) * distance
  const c1 = { x: from.x + dx * random(0.2, 0.35) + normal.x * bow, y: from.y + dy * random(0.2, 0.35) + normal.y * bow }
  const c2 = { x: from.x + dx * random(0.65, 0.8) + normal.x * bow * 0.6, y: from.y + dy * random(0.65, 0.8) + normal.y * bow * 0.6 }
  // Long moves sometimes overshoot slightly and come back.
  const overshoot = distance > 250 && Math.random() < 0.25
  const end = overshoot ? { x: to.x + (dx / distance) * random(4, 12), y: to.y + (dy / distance) * random(4, 12) } : to
  const points: { point: Point; delay: number }[] = []
  let elapsed = 0
  while (elapsed < duration) {
    const step = random(8, 17)
    elapsed = Math.min(duration, elapsed + step)
    const s = minimumJerk(elapsed / duration)
    const p = bezier(from, c1, c2, end, s)
    // Tremor fades out as the hand settles on the target.
    const tremor = (1 - s) * 0.9
    points.push({ point: { x: p.x + noise(tremor), y: p.y + noise(tremor) }, delay: step })
  }
  if (overshoot) {
    const back = Math.max(3, Math.round(random(4, 7)))
    for (let i = 1; i <= back; i++) {
      const s = minimumJerk(i / back)
      points.push({ point: { x: end.x + (to.x - end.x) * s, y: end.y + (to.y - end.y) * s }, delay: random(10, 18) })
    }
  }
  // The caller's own event lands exactly on the target; drop a final sample that duplicates it.
  points.pop()
  return points.map(({ point, delay }) => ({ point: { x: Math.round(point.x * 10) / 10, y: Math.round(point.y * 10) / 10 }, delay }))
}

/**
 * Runs before an Input.* command is forwarded: sends the movement leading up to it and paces it. The caller then
 * sends the command itself; only a mouse event's x/y are adjusted (a few pixels off center), so Playwright's own
 * semantics (buttons, modifiers, frames) are untouched.
 */
export function beforeInput(tabId: number, method: string, params: JsonObject, send: Send): Promise<void> {
  if (!enabled || (method !== "Input.dispatchKeyEvent" && method !== "Input.dispatchMouseEvent")) return Promise.resolve()
  // Playwright doesn't always wait for a move before pressing, so one tab's input runs in order: the press
  // waits for the movement before it to land.
  const tab = state(tabId)
  const run = tab.queue.then(() => (method === "Input.dispatchKeyEvent" ? paceKey(tab, params) : paceMouse(tabId, tab, params, send)))
  tab.queue = run.catch(() => undefined)
  return run
}

async function paceMouse(tabId: number, tab: TabState, params: JsonObject, send: Send): Promise<void> {
  const type = params.type
  if (typeof params.x !== "number" || typeof params.y !== "number" || type === "mouseWheel") return
  // Playwright aims at the exact center of an element every time; people land a few pixels off, the same way
  // for the move, press and release on one target. The offset stays well inside any clickable element.
  if (!tab.aim || Math.hypot(tab.aim.x - params.x, tab.aim.y - params.y) >= 1)
    tab.aim = { x: params.x, y: params.y, dx: noise(2.2), dy: noise(1.6) }
  const x = Math.round((params.x + tab.aim.dx) * 10) / 10
  const y = Math.round((params.y + tab.aim.dy) * 10) / 10
  // The relay forwards this same object, so the adjusted aim is what Chrome receives.
  const target = params as Record<string, unknown>
  target.x = x
  target.y = y
  if (type === "mouseMoved" || ((type === "mousePressed" || type === "mouseReleased") && tab.pointer && Math.hypot(tab.pointer.x - x, tab.pointer.y - y) >= 2)) {
    // The first movement on a page starts from somewhere plausible rather than the corner.
    const from = tab.pointer ?? { x: x + random(-260, 260), y: y + random(-180, 180) }
    const path = trajectory(from, { x, y })
    const started = Date.now()
    for (const { point, delay } of path) {
      // Each sample waits for the last to land so they don't arrive in bursts; the round trip counts toward the
      // gap so it doesn't slow the hand down.
      const sent = Date.now()
      await send("Input.dispatchMouseEvent", {
        type: "mouseMoved",
        x: point.x,
        y: point.y,
        ...(typeof params.button === "string" && type === "mouseMoved" ? { button: params.button } : {}),
        ...(typeof params.buttons === "number" ? { buttons: params.buttons } : {}),
        ...(typeof params.modifiers === "number" ? { modifiers: params.modifiers } : {}),
      }).catch(() => undefined)
      await sleep(delay - (Date.now() - sent))
    }
    tab.arrivedAt = Date.now()
    if (path.length)
      relayLog("input.move", { tabId, type, from: `${Math.round(from.x)},${Math.round(from.y)}`, to: `${Math.round(x)},${Math.round(y)}`, points: path.length, ms: tab.arrivedAt - started })
  }
  if (type === "mousePressed") {
    // People settle on a target for a moment before pressing.
    const settle = random(45, 130) - (Date.now() - tab.arrivedAt)
    if (settle > 0) await sleep(settle)
    tab.pressedAt = Date.now()
  }
  if (type === "mouseReleased" && tab.pressedAt !== undefined) {
    const hold = random(60, 140) - (Date.now() - tab.pressedAt)
    if (hold > 0) await sleep(hold)
    delete tab.pressedAt
  }
  tab.pointer = { x, y }
}

async function paceKey(tab: TabState, params: JsonObject) {
  if (params.type !== "keyDown" && params.type !== "rawKeyDown") return
  const gap = random(30, 110) - (Date.now() - tab.lastKeyAt)
  if (gap > 0 && tab.lastKeyAt > 0 && Date.now() - tab.lastKeyAt < 1000) await sleep(gap)
  tab.lastKeyAt = Date.now()
}
