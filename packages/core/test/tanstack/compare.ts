/**
 * Compares a recorded TanStack trace with a golden trace of the old runtime.
 *
 * The golden traces are the contract (see `trace.ts`). The TanStack runtime has documented differences: it has no
 * step snapshots, its fake models stream the raw tool input, and its tools write other result texts. A test drops
 * the events that its runtime does not publish, applies the patches of its scenario, and compares both sides with
 * `comparable`.
 */
import { Effect } from "effect"
import { readTrace } from "./trace"
import type { Trace, TraceEvent, TraceValue } from "./trace"

/** The events of one type, or the ones of that type that `where` picks. */
export interface Selector {
  readonly type: string
  /** Data fields that pick the event. Without it, every event of the type. */
  readonly where?: Readonly<Record<string, string>>
}

/** A change to the golden events of one type. */
export interface Patch extends Selector {
  readonly set?: Readonly<Record<string, TraceValue>>
  readonly unset?: ReadonlyArray<string>
}

/**
 * The golden trace `traces/<name>.json` as the TanStack runtime must publish it: without the `drop` event types,
 * without the `omit` events (events that the TanStack runtime cannot publish), without step snapshots (the harness
 * has no snapshot ids), and with the patches. `select` keeps a part of the trace, for example `compactionSlice`.
 * Compare it with `comparable(normalizeTrace(...))` of the recorded events.
 */
export const expectedTrace = (
  name: string,
  input: {
    readonly drop: ReadonlySet<string>
    readonly omit?: ReadonlyArray<Selector>
    readonly patches?: ReadonlyArray<Patch>
    readonly select?: (trace: Trace) => Trace
  },
) =>
  Effect.promise(() => readTrace(name)).pipe(
    Effect.map((golden) =>
      comparable(
        (input.select ?? everything)(without(golden, input.omit ?? []))
          .filter((event) => !input.drop.has(event.type))
          .map((event) =>
            [
              { type: event.type, unset: event.type.startsWith("session.step.") ? ["snapshot"] : [] },
              ...(input.patches ?? []),
            ].reduce(patchEvent, event),
          ),
      ),
    ),
  )

/** `trace` without the events that a selector picks. */
export function without(trace: Trace, selectors: ReadonlyArray<Selector>) {
  return trace.filter((event) => !selectors.some((selector) => isSelected(event, selector)))
}

/**
 * The events of the manual compaction of a trace: its inbox item, its compaction events, and its usage. The
 * projector publishes `session.usage.updated` from the usage at its own time, so it is left out.
 */
export function compactionSlice(trace: Trace) {
  const inboxID = trace.flatMap((event) => {
    const data = event.data
    const isCompaction =
      event.type === "session.inbox.enqueued" && isObject(data) && isObject(data.item) && data.item.type === "compaction"
    return isCompaction ? [data.inboxID] : []
  })[0]
  return trace.filter((event) => {
    const data = event.data
    if (!isObject(data)) return false
    if (event.type.startsWith("session.inbox.")) return data.inboxID === inboxID
    if (event.type === "session.usage.recorded") return data.source === "compaction"
    return event.type.startsWith("session.compaction.")
  })
}

/** The events from the first event of type `type` to the end. */
export const from = (type: string) => (trace: Trace) => trace.slice(Math.max(0, trace.findIndex((event) => event.type === type)))

function everything(trace: Trace) {
  return trace
}

/**
 * Renumbers the id and hash placeholders by first appearance, and drops the durable `seq`. Both sides have events
 * that the other side lacks, so the numbers and the Bus sequence differ, while the order and the id relations stay
 * the same.
 */
export function comparable(trace: Trace) {
  const ids = new Map<string, number>()
  const hashes = new Map<string, number>()
  const renumber = (text: string) =>
    text
      .replace(PLACEHOLDER, (_, prefix: string, n: string) => `${prefix}_${numbered(ids, n)}`)
      .replace(HASH_PLACEHOLDER, (_, n: string) => `<hash:${numbered(hashes, n)}>`)
  const walk = (value: TraceValue): TraceValue => {
    if (typeof value === "string") return renumber(value)
    if (Array.isArray(value)) return value.map(walk)
    if (!isObject(value)) return value
    const keys = Object.keys(value)
      .filter((key) => key !== "seq")
      .toSorted()
    return Object.fromEntries(keys.map((key) => [renumber(key), walk(value[key])]))
  }
  return trace.map((event) => walk(event))
}

/** The raw tool input that the fake model streams. The old scripted model sent none, so its traces have "". */
export const rawInput = (toolCall: string, input: string): Patch => ({
  type: "session.tool.input.ended",
  where: { id: toolCall },
  set: { text: input },
})

/** The harness tool writes another result text than opencode's own tool. */
export const harnessResult = (toolCall: string, text: string): Patch => ({
  type: "session.tool.success",
  where: { id: toolCall },
  set: { content: [{ type: "text", text }] },
})

const PLACEHOLDER = /\b([a-z]+)_(\d+)\b/g
const HASH_PLACEHOLDER = /<hash:(\d+)>/g

function patchEvent(event: TraceEvent, patch: Patch): TraceEvent {
  const data = event.data
  if (!isSelected(event, patch) || !isObject(data)) return event
  const kept = Object.entries(data).filter(([key]) => !(patch.unset ?? []).includes(key))
  return { ...event, data: { ...Object.fromEntries(kept), ...patch.set } }
}

function isSelected(event: TraceEvent, selector: Selector) {
  const data = event.data
  if (event.type !== selector.type || !isObject(data)) return false
  return Object.entries(selector.where ?? {}).every(([key, value]) => data[key] === value)
}

function isObject(value: TraceValue | undefined): value is { [key: string]: TraceValue } {
  return typeof value === "object" && value !== null && !Array.isArray(value)
}

function numbered(seen: Map<string, number>, value: string) {
  const existing = seen.get(value)
  if (existing !== undefined) return existing
  seen.set(value, seen.size + 1)
  return seen.size
}
