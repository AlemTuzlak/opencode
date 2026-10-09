export * as TanStackHost from "./host.js"

import { Event } from "@opencode/schema/config"
import { makeLocationNode } from "@opencode/util/effect/app-node"
import { Global } from "@opencode/util/global"
import { projectCompaction } from "@tanstack/ai-compaction"
import { createHarnessHost } from "@tanstack/ai-harness"
import type { HarnessHost, HarnessSession } from "@tanstack/ai-harness"
import { Context, Effect, Layer, PubSub, Schema, Stream } from "effect"
import { Agent } from "../agent.js"
import { Bus } from "../bus.js"
import { Config } from "../config.js"
import { Database } from "../database/database.js"
import { InstructionDiscovery } from "../instruction-discovery.js"
import { Integration } from "../integration.js"
import { Location } from "../location.js"
import { Mcp } from "../mcp/index.js"
import { Model } from "../model.js"
import { Plugin } from "../plugin.js"
import { Provider } from "../provider.js"
import { Session } from "../session.js"
import { Skill } from "../skill.js"
import { TanStackHarness } from "./harness.js"
import { TanstackStores } from "./stores.js"

type Built = Effect.Success<ReturnType<typeof TanStackHarness.make>>
type Overrides = ReturnType<Built["overrides"]>
export type Harness = Built["harness"]

/** The harness host could not open the session, for example because a harness plugin failed to set up. */
export class OpenError extends Schema.TaggedError<OpenError>()("TanStackHost.OpenError", {
  sessionID: Session.ID,
  reason: Schema.String,
}) {
  override get message() {
    return `The TanStack runtime could not open session ${this.sessionID}: ${this.reason}`
  }
}

export interface Interface {
  /**
   * The harness host of the location. Its sessions keep their state in opencode's SQLite database. Use
   * `host.events()` for the status of each open session and the changes of the session index.
   */
  readonly host: HarnessHost
  /** The current harness definition of the location. A config change replaces it. */
  readonly harness: () => Harness
  /** Opens the harness session of an opencode session, or returns the live one. Its thread id is the session id. */
  readonly open: (sessionID: Session.ID) => Effect.Effect<HarnessSession<Harness>, OpenError>
  /** The turn overrides for an opencode model: pass them to `session.prompt(text, { overrides })`. */
  readonly overrides: (ref: Model.Ref) => Effect.Effect<Effect.Success<Overrides>, Effect.Error<Overrides>>
  /**
   * Calls `listener` for each file that a file tool of any session changes. Returns a function that stops the
   * calls. The change names its tool call, not its session.
   */
  readonly onFileChange: (listener: (change: TanStackHarness.FileChange) => void) => () => void
}

export class Service extends Context.Service<Service, Interface>()("@opencode/TanStackHost") {}

/**
 * One TanStack `HarnessHost` for the location, with the harness from `TanStackHarness.make` and the stores on
 * opencode's SQLite database.
 *
 * - At boot it calls `host.resumePending`, so a turn that a stopped host left runs again.
 * - On a config update of the location it builds the harness definition again and calls `host.reload`.
 * - When the location scope closes it closes the host with `recoverable: true`, so the next host runs the
 *   running turns again.
 */
export const layer = Layer.effect(
  Service,
  Effect.gen(function* () {
    const bus = yield* Bus.Service
    const persistence = yield* TanstackStores.make
    const listeners = new Set<(change: TanStackHarness.FileChange) => void>()
    const notify = (change: TanStackHarness.FileChange) => [...listeners].forEach((listener) => listener(change))
    const make = TanStackHarness.make({ onFileChange: notify })
    const state = { built: yield* make }
    const context = yield* Effect.context<Effect.Services<Overrides>>()
    const stores = persistence.stores
    // A durable host: the log keeps the transcript and the inputs, so the host gets no `messages` and no `inbox`.
    const host = createHarnessHost({
      persistence: {
        stores: {
          log: stores.log,
          runs: stores.runs,
          leases: stores.leases,
          interrupts: stores.interrupts,
          metadata: stores.metadata,
          credentials: stores.credentials,
          artifacts: stores.artifacts,
          blobs: stores.blobs,
          generationRuns: stores.generationRuns,
          workClaims: stores.workClaims,
          sessions: stores.sessions,
        },
      },
      // The harness compaction is durable: the log keeps its records, and the host folds them into the messages.
      project: { version: "v1", record: projectCompaction },
    })
    yield* Effect.addFinalizer(() =>
      Effect.tryPromise(() => host.close({ recoverable: true })).pipe(
        Effect.catch((error) => Effect.logError("TanStack host: close failed", { error })),
      ),
    )

    const reload = make.pipe(
      Effect.tap((built) => Effect.sync(() => (state.built = built))),
      Effect.flatMap((built) => Effect.tryPromise(() => host.reload(built.harness))),
      Effect.catchCause((cause) => Effect.logError("TanStack host: reload failed", { cause })),
    )
    // Subscribe to the bus at once, on its own fiber: the debounce opens its upstream one fiber hop later, so an
    // update in that hop would be lost.
    const changes = yield* PubSub.sliding<void>(1)
    // The harness reads the agents, the skills, and the model catalog. Their owners rebuild them after a config
    // change and publish their own update, so each of these updates rebuilds the harness definition.
    yield* bus
      .subscribe([Event.Updated, Agent.Event.Updated, Skill.Event.Updated, Model.Event.Updated, Provider.Event.Updated])
      .pipe(
        Stream.runForEach(() => PubSub.publish(changes, undefined)),
        Effect.forkScoped({ startImmediately: true }),
      )
    yield* Stream.fromSubscription(yield* PubSub.subscribe(changes)).pipe(
      Stream.debounce("100 millis"),
      Stream.runForEach(() => reload),
      Effect.forkScoped({ startImmediately: true }),
    )

    const resumed = yield* Effect.tryPromise(() => host.resumePending({ harnesses: [state.built.harness] })).pipe(
      Effect.catch((error) =>
        Effect.logError("TanStack host: resumePending failed", { error }).pipe(Effect.as([] as const)),
      ),
    )
    if (resumed.length > 0)
      yield* Effect.logInfo("TanStack host: resumed pending sessions", {
        sessions: resumed.map((entry) => entry.threadId),
      })

    return Service.of({
      host,
      harness: () => state.built.harness,
      open: (sessionID) =>
        Effect.tryPromise({
          try: () => host.open(state.built.harness, { threadId: sessionID }),
          catch: (cause) => new OpenError({ sessionID, reason: cause instanceof Error ? cause.message : String(cause) }),
        }),
      overrides: (ref) => state.built.overrides(ref).pipe(Effect.provideContext(context)),
      onFileChange: (listener) => {
        listeners.add(listener)
        return () => {
          listeners.delete(listener)
        }
      },
    })
  }),
)

export const node = makeLocationNode({
  service: Service,
  layer,
  deps: [
    Bus.node,
    Database.node,
    Global.node,
    Session.node,
    Location.node,
    Config.node,
    Plugin.node,
    Agent.node,
    Skill.node,
    InstructionDiscovery.node,
    Integration.node,
    Model.node,
    Provider.node,
    Mcp.node,
  ],
})
