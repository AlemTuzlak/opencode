export * as TanStackJob from "./job-layer.js"

import { makeGlobalNode } from "@opencode/util/effect/app-node"
import { Effect, Layer, Option } from "effect"
import { Job } from "../job.js"
import { KV } from "../kv.js"
import { Live, liveNode } from "./permission-layer.js"
import type { LiveSession } from "./permission-layer.js"

type RunInfo = ReturnType<LiveSession["agentRuns"]>[number]

interface Found {
  readonly session: LiveSession
  readonly info: RunInfo
}

/** What the facade notes of a harness agent run. `agentRuns()` has no times and no result. */
interface Watched {
  readonly started_at: number
  /** Settles when the run ends. */
  done: Promise<void>
  result: { readonly completed_at: number; readonly output?: string; readonly error?: string } | undefined
}

/**
 * opencode's `Job.Service` for the TanStack runtime.
 *
 * - Harness agent runs (a background `subagent` call, or `session.agent(name).start`) are jobs of type
 *   `subagent`. Their id is the harness `operationId` of the run, as `session.agentRuns()` lists it. `get`,
 *   `wait`, `block`, and `cancel` work on them.
 * - `background(id)` moves a running harness tool call (for example `bash`) to the background with
 *   `session.background(id)`. `backgroundAll` moves every such call of the session.
 * - Jobs that opencode code starts (`start`) and the background recovery markers stay in opencode's own
 *   `Job.make` registry.
 *
 * The facade finds the harness sessions in `Live`, which the session layer feeds.
 */
export const layer = Layer.effect(
  Job.Service,
  Effect.gen(function* () {
    const local = yield* Job.Service
    const live = yield* Live
    const watched = new Map<string, Watched>()

    const find = (id: string) =>
      live
        .sessions()
        .flatMap((session) =>
          session
            .agentRuns()
            .filter((info) => info.operationId === id)
            .map((info) => ({ session, info })),
        )
        .at(0)

    const watch = (found: Found) => {
      const known = watched.get(found.info.operationId)
      if (known) return known
      const entry: Watched = { started_at: Date.now(), done: Promise.resolve(), result: undefined }
      const run = found.session.agentRun(found.info.operationId)
      if (run)
        entry.done = Promise.resolve(run).then(
          (value) => {
            entry.result = {
              completed_at: Date.now(),
              output: typeof value === "string" ? value : JSON.stringify(value),
            }
          },
          (error: unknown) => {
            entry.result = { completed_at: Date.now(), error: error instanceof Error ? error.message : String(error) }
          },
        )
      watched.set(found.info.operationId, entry)
      return entry
    }

    /** The job info of a harness agent run, or `undefined` when no tracked session has it. */
    const harnessInfo = (id: string) => {
      const found = find(id)
      if (!found) return undefined
      const entry = watch(found)
      return {
        id,
        type: "subagent",
        title: found.info.agent,
        status: statusOf(found.info.status),
        started_at: entry.started_at,
        metadata: { sessionID: found.session.threadId },
        ...entry.result,
      } satisfies Job.Info
    }

    /** Waits for a harness agent run to end. `true` when it ended before `timeout`. */
    const settled = (entry: Watched, timeout?: number) => {
      const done = Effect.promise(() => entry.done)
      if (timeout === undefined) return done.pipe(Effect.as(true))
      return done.pipe(Effect.timeoutOption(timeout), Effect.map(Option.isSome))
    }

    const get = Effect.fn("TanStackJob.get")(function* (id: string) {
      return (yield* local.get(id)) ?? harnessInfo(id)
    })

    const wait = Effect.fn("TanStackJob.wait")(function* (input: Job.WaitInput) {
      const result = yield* local.wait(input)
      const found = result.info ? undefined : find(input.id)
      if (!found) return result
      const isDone = yield* settled(watch(found), input.timeout)
      return { info: harnessInfo(input.id), timedOut: !isDone }
    })

    const block = Effect.fn("TanStackJob.block")(function* (input: Job.BlockInput) {
      const result = yield* local.block(input)
      const found = result ? undefined : find(input.id)
      if (!found) return result
      yield* settled(watch(found))
      const info = harnessInfo(input.id)
      return info && { type: "finished" as const, info }
    })

    const background = Effect.fn("TanStackJob.background")(function* (id: string) {
      const moved = yield* local.background(id)
      if (moved) return moved
      const receipts = yield* Effect.promise(() =>
        Promise.all(live.sessions().map(async (session) => ({ session, receipt: await session.background(id) }))),
      )
      const accepted = receipts.find((item) => item.receipt.status === "accepted")
      if (!accepted) return undefined
      // The harness tells nothing about the moved call but its id.
      return {
        id,
        type: "tool",
        status: "running",
        started_at: Date.now(),
        metadata: { sessionID: accepted.session.threadId },
      } satisfies Job.Info
    })

    const backgroundAll = Effect.fn("TanStackJob.backgroundAll")(function* (input: Job.BackgroundAllInput) {
      const moved = yield* local.backgroundAll(input)
      const session = live.sessions().find((item) => item.threadId === input.sessionID)
      // The receipt names no job, so the harness calls are not in the result.
      if (session && input.type === undefined) yield* Effect.promise(() => session.background())
      return moved
    })

    const cancel = Effect.fn("TanStackJob.cancel")(function* (id: string) {
      const cancelled = yield* local.cancel(id)
      const found = cancelled ? undefined : find(id)
      const run = found?.session.agentRun(id)
      if (!found || !run) return cancelled
      const entry = watch(found)
      yield* Effect.promise(() => run.cancel())
      yield* settled(entry)
      return harnessInfo(id)
    })

    return Job.Service.of({
      get,
      start: local.start,
      wait,
      block,
      background,
      backgroundAll,
      cancel,
      pendingBackground: local.pendingBackground,
      completeBackground: local.completeBackground,
    })
  }),
).pipe(Layer.provide(Layer.effect(Job.Service, Job.make)))

export const node = makeGlobalNode({ service: Job.Service, layer, deps: [KV.node, liveNode] })

function statusOf(status: RunInfo["status"]) {
  switch (status) {
    case "running":
    case "queued":
      return "running"
    case "completed":
      return "completed"
    case "failed":
      return "error"
    case "cancelled":
      return "cancelled"
  }
}
