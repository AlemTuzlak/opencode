export * as TanStackHost from "./host.js"

import { Event } from "@opencode/schema/config"
import { makeLocationNode } from "@opencode/util/effect/app-node"
import { Global } from "@opencode/util/global"
import { COMPACTION_RECORD_TYPE, projectCompaction } from "@tanstack/ai-compaction"
import { createHarnessHost } from "@tanstack/ai-harness"
import type { HarnessHost, HarnessSession } from "@tanstack/ai-harness"
import { Cause, Context, Deferred, Effect, Exit, Layer, Option, PubSub, Schema, Stream } from "effect"
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
import { PluginHooks } from "../plugin/hooks.js"
import { Provider } from "../provider.js"
import { Session } from "../session.js"
import { Skill } from "../skill.js"
import { Tool } from "../tool.js"
import { TanStackHarness } from "./harness.js"
import { TanStackRecovery } from "./recovery.js"
import { TanstackStores } from "./stores.js"

type Built = Effect.Success<ReturnType<typeof TanStackHarness.make>>
type Overrides = ReturnType<Built["overrides"]>
export type Harness = Built["harness"]

// How long `compacted` waits for the log record of a compaction. The harness writes it right after its end event.
const COMPACTION_WAIT = "5 seconds"
// The run leases and work claims of the host: the TanStack default, which the package does not export. A host that
// crashed keeps its claims until they expire, so the late sweep waits this long after the boot sweep.
const LEASE = { ttlMs: 30_000 }
// `@tanstack/ai-compaction` puts its summary text in these tags. It does not export its reader.
const SUMMARY_OPEN = "<untrusted-conversation-summary>"
const SUMMARY_CLOSE = "</untrusted-conversation-summary>"

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
  /**
   * The current harness definition of the location. A config change replaces it. Call it after `open`: it throws
   * while the first build of the harness runs.
   */
  readonly harness: () => Harness
  /**
   * Opens the harness session of an opencode session, or returns the live one. Its thread id is the session id. It
   * waits for the first build of the harness, which waits for the plugins of the location.
   */
  readonly open: (sessionID: Session.ID) => Effect.Effect<HarnessSession<Harness>, OpenError>
  /**
   * The turn overrides for an opencode model: pass them to `session.prompt(text, { overrides })`. It waits for the
   * first build of the harness.
   */
  readonly overrides: (ref: Model.Ref) => Effect.Effect<Effect.Success<Overrides>, Effect.Error<Overrides>>
  /**
   * The compaction of the current harness definition, or `undefined` when no model of the location can write a
   * summary, or while the first build of the harness runs. `compactNext(sessionID)` compacts the session at its
   * next model call.
   */
  readonly compaction: () => TanStackHarness.Compaction | undefined
  /**
   * The summary text of the session's compaction that ended with `tokensAfter` tokens, from its log record. The
   * harness writes the record just after its `compaction:ended` event, so this waits for it, up to 5 seconds.
   * `undefined` when no such record comes.
   */
  readonly compacted: (sessionID: Session.ID, tokensAfter: number) => Effect.Effect<string | undefined>
  /**
   * Calls `listener` for each file that a file tool of any session changes. Returns a function that stops the
   * calls. The change names its tool call, not its session.
   */
  readonly onFileChange: (listener: (change: TanStackHarness.FileChange) => void) => () => void
  /**
   * @deprecated Always empty. The boot sweep runs after the first build of the harness, so it is not done when the
   * layer starts. The host gives each session that a sweep resumes to the session layer (`TanStackRecovery.Drivers`)
   * itself. Remove this field with its reader in `session-layer.ts`.
   */
  readonly resumed: ReadonlyArray<Session.ID>
}

export class Service extends Context.Service<Service, Interface>()("@opencode/TanStackHost") {}

/**
 * One TanStack `HarnessHost` for the location, with the harness from `TanStackHarness.make` and the stores on
 * opencode's SQLite database.
 *
 * - It builds the harness definition on its own fiber: the build waits for the plugins of the location, and the
 *   location does not wait for the build. `open` and `overrides` wait for it.
 * - After the build it calls `host.resumePending`, so a turn that a stopped host left runs again. A recovered turn
 *   runs on the model of its opencode session: the harness log keeps no turn overrides.
 * - A host that crashed keeps its claims for the lease time, so the boot sweep skips its work. One lease time after
 *   the boot sweep, a late sweep calls `host.resumePending` once more. The late sweep stops when the location scope
 *   closes. The session layer resumes the sessions of both sweeps, so their events reach the Bus.
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
    const location = yield* Location.Service
    const sessions = yield* Session.Service
    // The session layer's driver. A host without a session layer, as in a test, recovers swept sessions itself.
    const drivers = Option.getOrUndefined(yield* Effect.serviceOption(TanStackRecovery.Drivers))
    const build = TanStackHarness.make({ onFileChange: notify })
    // The harness build waits for the plugins of the location, and the location must not wait for them, as on
    // opencode's runtime. So the first build runs on its own fiber, and `open` and `overrides` wait for it.
    const state: { built: Built | undefined } = { built: undefined }
    const first = yield* Deferred.make<Built>()
    // The newest harness definition: the first build, or the build of the last config update.
    const current = Deferred.await(first).pipe(Effect.map((built) => state.built ?? built))
    const context = yield* Effect.context<Effect.Services<Overrides>>()
    // The overrides of a turn that recovery runs again: the model of its session. `undefined` keeps the default
    // model of the location, for a session with no model of its own.
    const recovered = (threadId: string) =>
      Effect.runPromise(
        sessions.get(Session.ID.make(threadId)).pipe(
          Effect.flatMap((info) => {
            const ref = TanStackRecovery.sessionModel(info)
            if (ref === undefined) return Effect.undefined
            return current.pipe(Effect.flatMap((built) => built.overrides(ref).pipe(Effect.provideContext(context))))
          }),
          Effect.catchCause((cause) =>
            Effect.logWarning("TanStack host: a recovered turn runs on the default model", { threadId, cause }).pipe(
              Effect.as(undefined),
            ),
          ),
        ),
      )
    const recoverable = (built: Built) => ({
      ...built,
      harness: TanStackRecovery.withRecovery(built.harness, recovered),
    })
    const make = build.pipe(Effect.map(recoverable))
    const stores = persistence.stores
    // A work claim names only the thread and the harness, and every location's harness is `opencode`. So the sweeps
    // resume only the sessions of this location, and a turn never runs in the folder of another location.
    // ponytail: filters after the store's `limit`, so many expired claims of other locations can delay a resume.
    const isHere = (threadId: string) =>
      Effect.runPromise(
        sessions.get(Session.ID.make(threadId)).pipe(
          Effect.map(
            (info) =>
              info.location.directory === location.directory && info.location.workspaceID === location.workspaceID,
          ),
          Effect.orElseSucceed(() => false),
        ),
      )
    const workClaims = {
      ...stores.workClaims,
      listExpired: async (input: Parameters<typeof stores.workClaims.listExpired>[0]) => {
        const expired = await stores.workClaims.listExpired(input)
        const here = await Promise.all(expired.map((claim) => isHere(claim.threadId)))
        return expired.filter((_, index) => here[index])
      },
    }
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
          workClaims,
          sessions: stores.sessions,
        },
      },
      // The harness compaction is durable: the log keeps its records, and the host folds them into the messages.
      project: { version: "v1", record: projectCompaction },
      lease: LEASE,
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
    const changes = yield* PubSub.sliding<void>(1)
    yield* Stream.fromSubscription(yield* PubSub.subscribe(changes)).pipe(
      Stream.debounce("100 millis"),
      Stream.runForEach(() => reload),
      Effect.forkScoped({ startImmediately: true }),
    )
    // The harness reads the agents, the skills, and the model catalog. Their owners rebuild them after a config
    // change and publish their own update, so each of these updates rebuilds the harness definition. Subscribe to
    // the bus at once, on its own fiber: the debounce opens its upstream one fiber hop later, so an update in that
    // hop would be lost. Only after the first build, which reads the newest values: an update before it would
    // rebuild the harness for nothing.
    const watchChanges = bus
      .subscribe([Event.Updated, Agent.Event.Updated, Skill.Event.Updated, Model.Event.Updated, Provider.Event.Updated])
      .pipe(
        Stream.runForEach(() => PubSub.publish(changes, undefined)),
        Effect.forkScoped({ startImmediately: true }),
      )

    // `resumePending` claims a thread that is open on this host already, but does not recover it. The session layer
    // has such a thread open when `SessionRestart` resumed it while the crashed host still held its lease. So the
    // session layer resumes each swept thread: it opens it, recovers it, and publishes its events. Without a session
    // layer, the host recovers it.
    const resume = (sessionID: Session.ID) => {
      const driver = drivers?.current
      if (driver === undefined) return Effect.promise(() => host.recover(sessionID))
      return driver.resume(sessionID)
    }
    const sweep = current.pipe(
      Effect.flatMap((built) => Effect.tryPromise(() => host.resumePending({ harnesses: [built.harness] }))),
      Effect.map((opened) => opened.map((entry) => Session.ID.make(entry.threadId))),
      Effect.tap((opened) =>
        opened.length > 0 ? Effect.logInfo("TanStack host: resumed pending sessions", { sessions: opened }) : Effect.void,
      ),
      Effect.catch((error) =>
        Effect.logError("TanStack host: resumePending failed", { error }).pipe(Effect.as([] as const)),
      ),
      Effect.flatMap((opened) =>
        Effect.forEach(
          opened,
          (sessionID) =>
            resume(sessionID).pipe(
              Effect.catchCause((cause) =>
                Effect.logWarning("TanStack host: could not resume a swept session", { sessionID, cause }),
              ),
            ),
          { concurrency: "unbounded", discard: true },
        ),
      ),
    )
    // The first build, the boot sweep, and one late sweep a lease time later. A host that crashed keeps its claims
    // for the lease time, so the boot sweep skips its work and the late sweep runs it.
    yield* Effect.gen(function* () {
      const exit = yield* Effect.exit(make)
      if (Exit.isSuccess(exit)) {
        state.built = exit.value
        // Before `open` goes on, so a config update after an open always rebuilds.
        yield* watchChanges
      }
      yield* Deferred.done(first, exit)
      if (Exit.isFailure(exit)) return yield* Effect.logError("TanStack host: the harness build failed", { cause: exit.cause })
      yield* sweep
      yield* Effect.sleep(LEASE.ttlMs)
      yield* sweep
    }).pipe(Effect.forkScoped({ startImmediately: true }))

    // The log position of the last compaction record that `compacted` found, by session. The next read starts there.
    // ponytail: the first read of a session reads its whole log.
    const cursors = new Map<string, number>()
    /** Reads the log of the session until the compaction record with `tokensAfter` comes, or `signal` aborts. */
    const findCompaction = async (sessionID: Session.ID, tokensAfter: number, signal: AbortSignal) => {
      while (!signal.aborted) {
        // Listen first, so an append between the read and the wait is not lost.
        const appended = Promise.withResolvers<void>()
        const wake = () => appended.resolve()
        const stop = stores.log.subscribe(sessionID, wake)
        signal.addEventListener("abort", wake, { once: true })
        try {
          const entries = await stores.log.read(sessionID, { after: cursors.get(sessionID) ?? 0 })
          const found = entries
            .flatMap((entry) => {
              const record = Option.getOrUndefined(decodeCompactionRecord(entry.record))
              return record?.tokensAfter === tokensAfter ? [{ seq: entry.seq, head: record.head }] : []
            })
            .at(-1)
          if (found) {
            cursors.set(sessionID, found.seq)
            return summaryText(found.head)
          }
          await appended.promise
        } finally {
          stop()
          signal.removeEventListener("abort", wake)
        }
      }
      return undefined
    }

    return Service.of({
      host,
      harness: () => {
        if (state.built === undefined) throw new Error("The TanStack harness is not built yet: open a session first.")
        return state.built.harness
      },
      open: (sessionID) =>
        current.pipe(
          Effect.catchCauseIf(
            (cause) => !Cause.hasInterrupts(cause),
            (cause) => Effect.fail(new OpenError({ sessionID, reason: Cause.pretty(cause) })),
          ),
          Effect.flatMap((built) =>
            Effect.tryPromise({
              try: () => host.open(built.harness, { threadId: sessionID }),
              catch: (cause) =>
                new OpenError({ sessionID, reason: cause instanceof Error ? cause.message : String(cause) }),
            }),
          ),
        ),
      overrides: (ref) => current.pipe(Effect.flatMap((built) => built.overrides(ref).pipe(Effect.provideContext(context)))),
      compaction: () => state.built?.compaction,
      compacted: (sessionID, tokensAfter) =>
        Effect.tryPromise((signal) => findCompaction(sessionID, tokensAfter, signal)).pipe(
          Effect.timeoutOrElse({ duration: COMPACTION_WAIT, orElse: () => Effect.succeed(undefined) }),
          Effect.catch((error) =>
            Effect.logWarning("TanStack host: could not read the compaction record", { sessionID, error }).pipe(
              Effect.as(undefined),
            ),
          ),
        ),
      onFileChange: (listener) => {
        listeners.add(listener)
        return () => {
          listeners.delete(listener)
        }
      },
      resumed: [],
    })
  }),
)

const decodeCompactionRecord = Schema.decodeUnknownOption(
  Schema.Struct({
    type: Schema.Literal(COMPACTION_RECORD_TYPE),
    tokensAfter: Schema.Finite,
    head: Schema.Array(Schema.Struct({ content: Schema.Unknown })),
  }),
)
const decodeParts = Schema.decodeUnknownOption(
  Schema.Array(Schema.Struct({ type: Schema.String, content: Schema.optionalKey(Schema.Unknown) })),
)

/**
 * The text of the messages that replace a compacted part, without the summary tags. A native compaction can give
 * messages with no text: then the text is empty.
 */
function summaryText(head: ReadonlyArray<{ readonly content: unknown }>) {
  return head
    .map((message) => {
      const text = contentText(message.content)
      const isSummary = text.startsWith(SUMMARY_OPEN) && text.endsWith(SUMMARY_CLOSE)
      return isSummary ? text.slice(SUMMARY_OPEN.length, -SUMMARY_CLOSE.length).trim() : text
    })
    .filter((text) => text !== "")
    .join("\n\n")
}

function contentText(content: unknown) {
  if (typeof content === "string") return content
  const parts = Option.getOrElse(decodeParts(content), () => [])
  return parts.flatMap((part) => (part.type === "text" && typeof part.content === "string" ? [part.content] : [])).join("")
}

export const node = makeLocationNode({
  service: Service,
  layer,
  deps: [
    Bus.node,
    Database.node,
    Global.node,
    Session.node,
    TanStackRecovery.driversNode,
    Location.node,
    Config.node,
    Plugin.node,
    PluginHooks.node,
    Agent.node,
    Skill.node,
    InstructionDiscovery.node,
    Integration.node,
    Model.node,
    Provider.node,
    Mcp.node,
    Tool.node,
  ],
})
