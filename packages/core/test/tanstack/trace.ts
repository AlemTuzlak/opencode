/**
 * Golden event traces.
 *
 * A trace is the ordered list of session-related events that the Bus publishes
 * during one scenario, with ids, times, hashes, and temp paths replaced by
 * stable placeholders. The traces in `traces/` were recorded on the old
 * runtime. They are the contract for the TanStack runtime: it must publish
 * the same events in the same order, because the projector drops events that
 * arrive out of order without an error.
 *
 * Use `recordTrace` before the scenario starts, run the scenario, then pass
 * the recorded events to `normalizeTrace` and compare the result with
 * `readTrace(name)`.
 */
import path from "path"
import { Effect } from "effect"
import { Bus } from "@opencode/core/bus"
import type { Event } from "@opencode/schema/event"

export type TraceValue = string | number | boolean | null | TraceValue[] | { [key: string]: TraceValue }

export type TraceEvent = {
  readonly id: string
  readonly type: string
  readonly durable?: TraceValue
  readonly location?: TraceValue
  readonly metadata?: TraceValue
  readonly data: TraceValue
}

export type Trace = TraceEvent[]

const TRACE_DIRECTORY = path.join(import.meta.dir, "traces")

// The event families that clients read for a session. Location catalog events
// such as `agent.updated` or `project.updated` are not part of a turn.
const SESSION_EVENT = /^(session|permission|form)\./

// opencode ids are `<prefix>_` plus 12 hex time digits and 14 random base62
// characters. A message id made with `SessionMessage.ID.fromEvent` shares its
// body with an event id, so placeholders are numbered by body, not by prefix.
const OPENCODE_ID = /\b([a-z]+)_([0-9a-f]{12}[0-9A-Za-z]{14})\b/g
// Git object ids (snapshots, project ids) and SHA-256 content hashes.
const HASH = /\b(?:[0-9a-f]{64}|[0-9a-f]{40})\b/g
// Clock values change on every run.
const TIME_KEYS = new Set(["created", "updated", "started", "ended", "completed", "active", "time"])

/**
 * Starts to record every session, permission, and form event that the Bus
 * publishes, in publish order. The listener is removed when the scope closes.
 *
 * ```ts
 * const recorder = yield* recordTrace()
 * // ...drive the scenario...
 * const trace = normalizeTrace(yield* recorder.events, { roots: [directory] })
 * ```
 */
export const recordTrace = Effect.fn("GoldenTrace.record")(function* () {
  const bus = yield* Bus.Service
  const events: Event.Payload[] = []
  // `listen` runs inside `Bus.publish`, so the recorded order is the publish
  // order and nothing is still in flight when the scenario returns.
  yield* Effect.acquireRelease(
    bus.listen((event) =>
      Effect.sync(() => {
        if (SESSION_EVENT.test(event.type)) events.push(event)
      }),
    ),
    (unsubscribe) => unsubscribe,
  )
  return { events: Effect.sync(() => events.slice()) }
})

/**
 * Turns raw Bus events into a deterministic trace.
 *
 * - Drops the event `created` time.
 * - Replaces opencode ids, including event ids with `<prefix>_<n>`, numbered by first appearance.
 * - Replaces git and SHA-256 hashes with `<hash:n>`, numbered by first appearance.
 * - Replaces clock values and slugs with `<time>` and `<slug>`.
 * - Replaces each root directory with `<root:n>` and uses `/` in those paths.
 */
export function normalizeTrace(events: ReadonlyArray<Event.Payload>, options: { readonly roots: readonly string[] }) {
  const ids = new Map<string, number>()
  const hashes = new Map<string, number>()
  // Longer roots first, so a root inside another root keeps its own placeholder.
  const roots = options.roots
    .map((root, index) => ({ root, placeholder: `<root:${index}>` }))
    .toSorted((a, b) => b.root.length - a.root.length)

  const normalizeString = (value: string) => {
    // A root can also appear JSON-escaped, for example in tool output that is JSON text.
    const rooted = roots.reduce(
      (text, item) =>
        text
          .replaceAll(item.root, item.placeholder)
          .replaceAll(JSON.stringify(item.root).slice(1, -1), item.placeholder),
      value,
    )
    // Rooted paths use `/`, so a trace recorded on Windows matches one recorded on Linux.
    const pathed = rooted === value ? rooted : rooted.replace(/\\\\|\\/g, "/")
    return pathed
      .replace(OPENCODE_ID, (_, prefix: string, body: string) => `${prefix}_${numbered(ids, body)}`)
      .replace(HASH, (hash) => `<hash:${numbered(hashes, hash)}>`)
  }

  const normalizeValue = (value: unknown, key?: string): TraceValue => {
    // `slug` is a random word pair.
    if (key === "slug") return "<slug>"
    if (key !== undefined && TIME_KEYS.has(key) && typeof value === "number") return "<time>"
    if (typeof value === "string") return normalizeString(value)
    if (typeof value === "number" || typeof value === "boolean" || value === null) return value
    if (Array.isArray(value)) return value.map((item) => normalizeValue(item))
    if (typeof value === "object") {
      return Object.fromEntries(
        Object.entries(value).map(([name, item]) => [normalizeString(name), normalizeValue(item, name)]),
      )
    }
    return null
  }

  // A JSON round trip gives the wire shape: branded values and class
  // instances become the plain JSON that the SSE feed sends.
  return events.map((event): TraceEvent => {
    const plain = JSON.parse(JSON.stringify(event))
    return {
      id: normalizeString(event.id),
      type: event.type,
      ...(plain.durable ? { durable: normalizeValue(plain.durable) } : {}),
      ...(plain.location ? { location: normalizeValue(plain.location) } : {}),
      ...(plain.metadata ? { metadata: normalizeValue(plain.metadata) } : {}),
      data: normalizeValue(plain.data),
    }
  })
}

/** Reads the saved golden trace `traces/<name>.json`. */
export function readTrace(name: string) {
  return Bun.file(path.join(TRACE_DIRECTORY, `${name}.json`)).json() as Promise<Trace>
}

function numbered(seen: Map<string, number>, value: string) {
  const existing = seen.get(value)
  if (existing !== undefined) return existing
  seen.set(value, seen.size + 1)
  return seen.size
}
