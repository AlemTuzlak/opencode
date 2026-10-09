export * as TanStackSession from "./session-layer.js"

import path from "path"
import { asc, eq } from "drizzle-orm"
import { Context, DateTime, Effect, Fiber, Layer, Option, Schema, Scope } from "effect"
import { chat, EventType } from "@tanstack/ai"
import type { ContentPart } from "@tanstack/ai"
import { HARNESS_EVENTS } from "@tanstack/ai-harness"
import type { HarnessSession, Receipt, UserInput } from "@tanstack/ai-harness"
import { Event } from "@opencode/schema/event"
import { makeGlobalNode } from "@opencode/util/effect/app-node"
import { FSUtil } from "@opencode/util/fs-util"
import { Global } from "@opencode/util/global"
import { Agent } from "../agent.js"
import { Bus } from "../bus.js"
import { Database } from "../database/database.js"
import { KeyedMutex } from "../effect/keyed-mutex.js"
import { Instance } from "../instance/service.js"
import { Location } from "../location.js"
import { LocationServiceMap } from "../location-service-map.js"
import { Model } from "../model.js"
import { Project } from "../project.js"
import { AbsolutePath, RelativePath } from "../schema.js"
import { Session } from "../session.js"
import {
  BusyError,
  CompactionConflictError,
  InboxConflictError,
  MessageNotFoundError,
  PromptConflictError,
  SyntheticConflictError,
} from "../session/error.js"
import { SessionEvent } from "../session/event.js"
import { SessionInbox } from "../session/inbox.js"
import { SessionMessage } from "../session/message.js"
import { SessionPrompt } from "../session/prompt.js"
import { SessionRevert } from "../session/revert.js"
import { SessionShell } from "../session/shell.js"
import { SessionSkill } from "../session/skill.js"
import { SessionSchema } from "../session/schema.js"
import { SessionMessageTable } from "../session/sql.js"
import { ShellResult } from "../shell/result.js"
import { fileDiff } from "../tool/plugin/file-diff.js"
import { createEventMapper } from "./events.js"
import type { EventMapper, HarnessEvent, Link, Output } from "./events.js"
import type { TanStackHarness } from "./harness.js"
import { TanStackHost } from "./host.js"
import { TanStackPermission } from "./permission-layer.js"
import { TanstackStores } from "./stores.js"

/**
 * A `Session` method that the TanStack runtime cannot run. The method dies with it, because the `Session`
 * interface has no error for it.
 */
export class NotSupportedError extends Schema.TaggedError<NotSupportedError>()("TanStackSession.NotSupportedError", {
  method: Schema.String,
  reason: Schema.String,
}) {
  override get message() {
    return `Session.${this.method} is not supported on the TanStack runtime: ${this.reason}`
  }
}

export interface HostsInterface {
  /** The TanStack host of a location. */
  readonly get: (location: Location.Ref) => Effect.Effect<TanStackHost.Interface>
}

/** Finds the `TanStackHost` of a location. The session layer runs each session on the host of its location. */
export class Hosts extends Context.Service<Hosts, HostsInterface>()("@opencode/TanStackSession/Hosts") {}

/**
 * The hosts from the location graph: the `TanStackHost.node` of each location. It dies when the location graph
 * has no `TanStackHost.node`. The layer keeps each location it used open until it closes.
 */
export const locatedHosts = Layer.effect(
  Hosts,
  Effect.gen(function* () {
    const locations = yield* LocationServiceMap.Service
    const scope = yield* Scope.Scope
    const cache = new Map<string, TanStackHost.Interface>()
    return Hosts.of({
      get: Effect.fn("TanStackSession.Hosts.get")(function* (location) {
        const key = locationKey(location)
        const cached = cache.get(key)
        if (cached) return cached
        const context = yield* locations
          .contextEffect(LocationServiceMap.canonical(location))
          .pipe(Effect.provideService(Scope.Scope, scope), Effect.orDie)
        const found = Context.getOption(context, TanStackHost.Service)
        if (Option.isNone(found))
          return yield* Effect.die(new Error(`The location ${location.directory} has no TanStackHost.node.`))
        cache.set(key, found.value)
        return found.value
      }),
    })
  }),
)

export const hostsNode = makeGlobalNode({ service: Hosts, layer: locatedHosts, deps: [LocationServiceMap.node] })

// The metadata namespace of the saved id links of each session.
const LINKS = "opencode/tanstack-links"
// How many milliseconds a wait sleeps between checks of the harness status when no event comes.
const IDLE_POLL = 50
// How long an inbox change waits for its event before it gives up.
const PUBLISH_WAIT = "5 seconds"

/** A held input: admitted to the inbox, and sent to the harness with the next input. */
interface Held {
  readonly inboxID: SessionMessage.ID | undefined
  readonly text: string
}

/** One open harness session, its mapper, and its event pump. */
interface Entry {
  readonly sessionID: SessionSchema.ID
  readonly location: Location.Ref
  readonly host: TanStackHost.Interface
  readonly session: HarnessSession<TanStackHost.Harness>
  readonly mapper: EventMapper
  readonly links: Link[]
  readonly held: Held[]
  readonly waiters: Set<() => void>
  /** The operations that the pump saw start and not end yet. */
  readonly running: Set<string>
  /** The operations that the pump saw end. */
  readonly finished: Set<string>
  /** The operations that this layer started, until the pump sees them end. */
  readonly expected: Set<string>
  /** The inbox events that the pump published, as `<event type> <inbox id>`. */
  readonly published: Set<string>
  saving: Promise<void>
  fiber: Fiber.Fiber<void> | undefined
}

/**
 * The `Session` service on the TanStack harness. It decorates opencode's own `Session` layer:
 *
 * - The database methods (list, get, create, rename, metadata, permissions, view, environment, messages, message,
 *   context, diff, inbox, log, command, remove) go to opencode's layer.
 * - The runtime methods (prompt, synthetic, shell, skill, compact, wait, active, background, resume, interrupt, the
 *   inbox changes, fork, revert, switchAgent, switchModel, move, generate) run on the harness session of the same
 *   id, on the host of the session's location.
 * - One event pump for each open harness session maps its events with `createEventMapper` and publishes them on
 *   the Bus, in order. File changes go to the mapper of the session whose tool call made them. The summary of a
 *   compaction comes from the harness log.
 * - `compact` admits a compaction inbox item and forces a compaction at the next model call of the session. An idle
 *   session compacts at the start of its next turn: the harness cannot compact outside a model call. It dies with
 *   `NotSupportedError` when no model of the location can write a summary.
 *
 * Provide `Session.Service` (opencode's layer) and `Hosts` to it. `node` does that.
 */
export const layer = Layer.effect(
  Session.Service,
  Effect.gen(function* () {
    const base = yield* Session.Service
    const bus = yield* Bus.Service
    const hosts = yield* Hosts
    const live = yield* TanStackPermission.Live
    const database = yield* Database.Service
    const admission = yield* SessionInbox.Service
    const instances = yield* Instance.Service
    const fs = yield* FSUtil.Service
    const global = yield* Global.Service
    const projects = yield* Project.Service
    const locations = yield* LocationServiceMap.Service
    const scope = yield* Scope.Scope
    const metadata = (yield* TanstackStores.make).stores.metadata
    const run = Effect.runPromiseWith(yield* Effect.context<never>())
    const entries = new Map<SessionSchema.ID, Entry>()
    const opening = KeyedMutex.makeUnsafe<SessionSchema.ID>()
    // File changes by tool call id. The pump of the session that gets the tool result takes them.
    const changes = new Map<string, TanStackHarness.FileChange[]>()
    const watched = new Set<TanStackHost.Interface>()
    const unwatch: Array<() => void> = []
    yield* Effect.addFinalizer(() => Effect.sync(() => unwatch.forEach((stop) => stop())))

    const watch = (host: TanStackHost.Interface) => {
      if (watched.has(host)) return
      watched.add(host)
      unwatch.push(
        host.onFileChange((change) =>
          changes.set(change.toolCallId, [...(changes.get(change.toolCallId) ?? []), change]),
        ),
      )
    }

    /** The agent and the model of the next turn: the session's own, else the defaults of its location. */
    const selection = Effect.fn("TanStackSession.selection")(function* (info: SessionSchema.Info) {
      const defaults = yield* Effect.gen(function* () {
        const agents = yield* Agent.Service
        const models = yield* Model.Service
        const agent = info.agent ?? (yield* agents.select()).id
        const fallback = info.model ? undefined : yield* models.default()
        return { agent, fallback }
      }).pipe(
        Effect.provide(LocationServiceMap.Service.get(info.location)),
        Effect.provideService(LocationServiceMap.Service, locations),
        Effect.orDie,
      )
      // opencode names the default variant by leaving it out.
      const model = info.model
        ? Model.Ref.make({
            providerID: info.model.providerID,
            id: info.model.id,
            ...(info.model.variant === undefined || info.model.variant === "default"
              ? {}
              : { variant: info.model.variant }),
          })
        : defaults.fallback && Model.Ref.make({ providerID: defaults.fallback.providerID, id: defaults.fallback.id })
      if (model === undefined)
        return yield* Effect.die(new Error(`The session ${info.id} has no model, and its location has no default.`))
      return { agent: defaults.agent, model }
    })

    const open = Effect.fn("TanStackSession.open")(function* (info: SessionSchema.Info) {
      return yield* opening.withLock(info.id)(
        Effect.gen(function* () {
          const existing = entries.get(info.id)
          if (existing) return existing
          const host = yield* hosts.get(info.location)
          watch(host)
          const session = yield* host.open(info.id).pipe(Effect.orDie)
          const saved = decodeLinks(yield* Effect.promise(() => metadata.get(LINKS, info.id)))
          const selected = yield* selection(info)
          const links = [...saved]
          const entry: Entry = {
            sessionID: info.id,
            location: info.location,
            host,
            session,
            mapper: createEventMapper({
              sessionID: info.id,
              location: info.location,
              agent: selected.agent,
              model: selected.model,
              links: saved,
              onLink: (link) => {
                links.push(link)
                save(entry)
              },
            }),
            links,
            held: [],
            waiters: new Set(),
            running: new Set(),
            finished: new Set(),
            expected: new Set(),
            published: new Set(),
            saving: Promise.resolve(),
            fiber: undefined,
          }
          // Only new events map: the mapper has no state for the events before the head.
          const from = session.snapshot().cursor
          entry.fiber = yield* Effect.promise((signal) => pump(entry, from, signal)).pipe(
            Effect.forkIn(scope, { startImmediately: true }),
          )
          entries.set(info.id, entry)
          live.track({ session, mapper: entry.mapper, outputs: [] })
          return entry
        }),
      )
    })

    const save = (entry: Entry) => {
      entry.saving = entry.saving
        .then(() => metadata.set(LINKS, entry.sessionID, entry.links))
        .then(undefined, (error: unknown) =>
          run(
            Effect.logWarning("TanStack session: could not save the id links", { sessionID: entry.sessionID, error }),
          ),
        )
    }

    /** Reads the harness events of the session after `from`, and publishes the mapped events until `signal` aborts. */
    async function pump(entry: Entry, from: string, signal: AbortSignal) {
      for await (const event of entry.session.events({ from, signal })) {
        await run(publishEvent(entry, event))
        track(entry, event)
        entry.waiters.forEach((wake) => wake())
      }
    }

    const publishEvent = (entry: Entry, event: HarnessEvent) =>
      Effect.gen(function* () {
        // The diffs of an edit go to the mapper before its result, so the result gets them as `metadata.files`.
        if (event.event.type === EventType.TOOL_CALL_RESULT) applyChanges(entry, event.event.toolCallId)
        const tokensAfter = entry.mapper.compactionEnd(event)
        if (tokensAfter !== undefined) yield* summarize(entry, event.operationId, tokensAfter)
        const outputs = entry.mapper.map({ operationId: event.operationId, event: event.event })
        // The permission, form, and job facades read the asks of the outputs before clients see them.
        live.track({ session: entry.session, mapper: entry.mapper, outputs })
        yield* Effect.forEach(outputs, (output) => publishOutput(entry, output), { discard: true })
      }).pipe(
        Effect.catchCause((cause) =>
          Effect.logError("TanStack session: could not publish a harness event", { sessionID: entry.sessionID, cause }),
        ),
      )

    /** Gives the mapper the summary of the compaction that ends now, from the harness log. */
    const summarize = Effect.fn("TanStackSession.summarize")(function* (
      entry: Entry,
      operationId: string,
      tokensAfter: number,
    ) {
      const compaction = entry.host.compaction()
      const text = yield* entry.host.compacted(entry.sessionID, tokensAfter)
      if (text === undefined || compaction === undefined)
        return yield* Effect.logWarning("TanStack session: no summary for the compaction", {
          sessionID: entry.sessionID,
        })
      entry.mapper.compacted(operationId, { text, model: compaction.model })
    })

    const applyChanges = (entry: Entry, toolCallId: string) => {
      const found = changes.get(toolCallId) ?? []
      changes.delete(toolCallId)
      found.forEach((change) =>
        entry.mapper.fileChanged(
          fileDiff(
            path.relative(entry.location.directory, change.path).replaceAll("\\", "/"),
            change.before,
            change.after,
            change.status,
          ),
        ),
      )
    }

    const publishOutput = (entry: Entry, output: Output) => {
      if (output.type === "child")
        return base
          .create({ id: output.sessionID, parentID: output.parentID, agent: output.agent, title: output.title })
          .pipe(Effect.asVoid, Effect.orDie)
      // The session layer publishes the revert events. The mapper cannot name the reverted message: see `boundary`.
      const isRevert =
        output.definition.type === SessionEvent.RevertEvent.Staged.type ||
        output.definition.type === SessionEvent.RevertEvent.Cleared.type
      if (isRevert) return Effect.void
      return bus.publish(output.definition, output.data, output.options).pipe(
        Effect.tap(() =>
          Effect.sync(() => {
            const inboxID = Option.getOrUndefined(decodeInboxID(output.data))?.inboxID
            if (inboxID !== undefined) entry.published.add(mark(output.definition.type, inboxID))
          }),
        ),
        Effect.asVoid,
      )
    }

    /** Waits for the next event that the pump publishes, or for `IDLE_POLL` milliseconds. */
    const next = (entry: Entry) =>
      Effect.promise(
        () =>
          new Promise<void>((resolve) => {
            const done = () => {
              clearTimeout(timer)
              entry.waiters.delete(done)
              resolve()
            }
            const timer = setTimeout(done, IDLE_POLL)
            entry.waiters.add(done)
          }),
      )

    /**
     * Waits until the pump published the inbox event `type` of `inboxID`. It gives up after `PUBLISH_WAIT` with a
     * warning: the mapper maps no inbox event for an input that it did not admit, for example after a restart.
     */
    const published = Effect.fn("TanStackSession.published")(function* (
      entry: Entry,
      type: string,
      inboxID: SessionMessage.ID,
    ) {
      const isPublished = () => entry.published.has(mark(type, inboxID))
      const wait = Effect.gen(function* () {
        while (!isPublished()) yield* next(entry)
      })
      yield* wait.pipe(
        Effect.timeoutOrElse({
          duration: PUBLISH_WAIT,
          orElse: () => Effect.logWarning("TanStack session: no inbox event came", { type, inboxID }),
        }),
      )
    })

    /** Waits until the harness session is idle and the pump published the end of each operation. */
    const settle = Effect.fn("TanStackSession.settle")(function* (entry: Entry) {
      const isSettled = () => !isBusy(entry) && entry.running.size === 0 && entry.expected.size === 0
      while (!isSettled()) yield* next(entry)
    })

    /** Expects the end of `operationId` from the pump, so `wait` waits for it. */
    const expect = (entry: Entry, operationId: string | undefined) => {
      if (operationId === undefined || entry.finished.has(operationId)) return
      const status = entry.session.operation(operationId)?.status()
      const isOver = status === "completed" || status === "failed" || status === "cancelled"
      if (!isOver) entry.expected.add(operationId)
    }

    /** The overrides of the next turn, with the session model. It tells the mapper the agent and the model too. */
    const turn = Effect.fn("TanStackSession.turn")(function* (entry: Entry, info: SessionSchema.Info) {
      const selected = yield* selection(info)
      entry.mapper.select(selected)
      const config = entry.session.config()
      if (info.agent !== undefined && config.agent !== undefined && config.agent.value !== info.agent)
        yield* receive(entry.session.setConfig("agent", info.agent))
      return yield* entry.host.overrides(selected.model).pipe(Effect.orDie)
    })

    /**
     * Gives one inbox item to the harness. With `resume: false` on an idle session, it waits in the inbox, and goes
     * to the harness with the next input, as on opencode's runtime.
     */
    const admit = Effect.fn("TanStackSession.admit")(function* (
      entry: Entry,
      info: SessionSchema.Info,
      input: {
        readonly inboxID: SessionMessage.ID
        readonly item: SessionInbox.Item
        readonly text: string
        readonly message: UserInput
        readonly resume: boolean
      },
    ) {
      const isHeld = !input.resume && !isBusy(entry)
      if (isHeld) {
        yield* bus.publish(SessionEvent.InboxEnqueued, {
          sessionID: info.id,
          inboxID: input.inboxID,
          item: input.item,
        })
        entry.held.push({ inboxID: input.inboxID, text: input.text })
        return "accepted"
      }
      const message = yield* release(entry, info, input.message)
      const overrides = yield* turn(entry, info)
      entry.mapper.admit({ inboxID: input.inboxID, item: input.item })
      const operation = entry.session.prompt(message, {
        inputId: input.inboxID,
        busy: input.item.delivery === "queue" ? "queue" : "steer",
        overrides,
      })
      const receipt = yield* Effect.promise(() => operation.receipt)
      if (receipt.status === "rejected") return receipt.status
      expect(entry, receipt.operationId)
      // opencode's prompt returns after the inbox has the item.
      yield* published(entry, SessionEvent.InboxEnqueued.type, input.inboxID)
      return receipt.status
    })

    /** The held inputs go in front of `message`. Their inbox items are delivered now. */
    const release = Effect.fn("TanStackSession.release")(function* (
      entry: Entry,
      info: SessionSchema.Info,
      message: UserInput,
    ) {
      const held = entry.held.splice(0)
      if (held.length === 0) return message
      yield* Effect.forEach(
        held.flatMap((item) => (item.inboxID === undefined ? [] : [item.inboxID])),
        (inboxID) =>
          bus.publish(SessionEvent.InboxDelivered, { sessionID: info.id, inboxID }, { location: info.location }),
        { discard: true },
      )
      const parts: ContentPart[] = [
        ...held.map((item) => ({ type: "text" as const, content: item.text })),
        ...(typeof message === "string" ? [{ type: "text" as const, content: message }] : message),
      ]
      return parts
    })

    /** Sends a turn with no inbox item, for example a skill. */
    const continueWith = Effect.fn("TanStackSession.continueWith")(function* (
      entry: Entry,
      info: SessionSchema.Info,
      text: string,
    ) {
      const message = yield* release(entry, info, text)
      const overrides = yield* turn(entry, info)
      const operation = entry.session.prompt(message, { busy: "steer", overrides })
      expect(entry, (yield* Effect.promise(() => operation.receipt)).operationId)
    })

    const synthetic: Session.Interface["synthetic"] = Effect.fn("TanStackSession.synthetic")(function* (input) {
      const info = yield* base.get(input.sessionID)
      const inboxID = input.id ?? SessionMessage.ID.create()
      const item = {
        type: "synthetic",
        payload: SessionInbox.SyntheticPayload.make({
          text: input.text,
          description: input.description,
          metadata: input.metadata,
        }),
        delivery: SessionInbox.Delivery.make(input.delivery ?? "steer"),
      } satisfies SessionInbox.Item
      const existing = yield* admission
        .reconcile({ id: inboxID, sessionID: info.id, type: "synthetic", delivery: item.delivery })
        .pipe(
          Effect.catchTag(
            "SessionInbox.LifecycleConflict",
            () => new SyntheticConflictError({ sessionID: info.id, inputID: inboxID }),
          ),
        )
      if (existing) return existing
      const entry = yield* open(info)
      const status = yield* admit(entry, info, {
        inboxID,
        item,
        text: input.text,
        message: input.text,
        resume: input.resume !== false && info.revert === undefined,
      })
      if (status === "rejected") return yield* new SyntheticConflictError({ sessionID: info.id, inputID: inboxID })
      return SessionInbox.Synthetic.make({ id: inboxID, sessionID: info.id, time: now(), ...item })
    })

    /** Runs an inbox change on the harness. The harness refuses an input that does not wait. */
    const changeInbox = Effect.fn("TanStackSession.changeInbox")(function* (
      input: { readonly sessionID: SessionSchema.ID; readonly inboxID: SessionMessage.ID },
      change: {
        /** The inbox event that the change publishes. */
        readonly event: string
        readonly harness: (session: Entry["session"]) => Promise<Receipt>
        readonly held: (item: Held, info: SessionSchema.Info) => Effect.Effect<void>
      },
    ) {
      const info = yield* base.get(input.sessionID)
      const entry = yield* open(info)
      const held = entry.held.find((item) => item.inboxID === input.inboxID)
      if (held) return yield* change.held(held, info)
      const receipt = yield* Effect.promise(() => change.harness(entry.session))
      if (receipt.status === "rejected")
        return yield* new InboxConflictError({ sessionID: info.id, inboxID: input.inboxID })
      yield* published(entry, change.event, input.inboxID)
    })

    const moveHeld = (delivery: SessionInbox.Delivery) => (item: Held, info: SessionSchema.Info) =>
      item.inboxID === undefined
        ? Effect.void
        : bus
            .publish(
              SessionEvent.InboxDeliveryChanged,
              { sessionID: info.id, inboxID: item.inboxID, delivery },
              { location: info.location },
            )
            .pipe(Effect.asVoid)

    /**
     * The harness message to keep for an opencode message boundary: the harness transcript message just before
     * `messageID`. A harness revert keeps its message, and opencode's revert removes its message. `null` when no
     * message comes before it.
     */
    const boundary = Effect.fn("TanStackSession.boundary")(function* (entry: Entry, messageID: SessionMessage.ID) {
      const rows = yield* database.db
        .select({ id: SessionMessageTable.id, type: SessionMessageTable.type })
        .from(SessionMessageTable)
        .where(eq(SessionMessageTable.session_id, entry.sessionID))
        .orderBy(asc(SessionMessageTable.seq))
        .all()
        .pipe(Effect.orDie)
      const index = rows.findIndex((row) => row.id === messageID)
      if (index < 0) return yield* new MessageNotFoundError({ sessionID: entry.sessionID, messageID })
      const transcript = yield* Effect.promise(() => entry.session.transcript())
      const position = new Map(transcript.map((message, at) => [message.id, at]))
      const linked = (opencodeID: string) =>
        entry.links
          .filter((link) => link.kind === "message" && link.opencodeID === opencodeID)
          .flatMap((link) => {
            const at = position.get(link.harnessID)
            return at === undefined ? [] : [at]
          })
      // Walk back to the nearest linked message. The user messages between it and the boundary come right after it.
      const before = rows.slice(0, index).toReversed()
      const users = before.findIndex((row) => linked(row.id).length > 0)
      const between = (users < 0 ? before : before.slice(0, users)).filter(
        (row) => row.type === "user" || row.type === "synthetic",
      ).length
      const anchor = users < 0 ? -1 : Math.max(...linked(before[users].id))
      const keep = anchor + between
      if (keep < 0) return null
      const kept = transcript[keep]?.id
      if (kept === undefined) return yield* new MessageNotFoundError({ sessionID: entry.sessionID, messageID })
      return kept
    })

    const close = Effect.fn("TanStackSession.close")(function* (sessionID: SessionSchema.ID) {
      const entry = entries.get(sessionID)
      if (entry === undefined) return
      entries.delete(sessionID)
      live.forget(sessionID)
      if (entry.fiber) yield* Fiber.interrupt(entry.fiber)
      yield* Effect.promise(() => entry.session.close())
    })

    yield* Effect.addFinalizer(() =>
      Effect.forEach([...entries.values()], (entry) => (entry.fiber ? Fiber.interrupt(entry.fiber) : Effect.void), {
        discard: true,
      }),
    )

    const result: Session.Interface = Session.Service.of({
      list: base.list,
      create: base.create,
      get: base.get,
      environment: base.environment,
      view: base.view,
      messages: base.messages,
      message: base.message,
      context: base.context,
      diff: base.diff,
      inbox: base.inbox,
      log: base.log,
      rename: base.rename,
      setMetadata: base.setMetadata,
      setPermissions: base.setPermissions,
      // A command runs a plugin command, which sends its prompt through this service.
      command: base.command,
      remove: Effect.fn("TanStackSession.remove")(function* (sessionID) {
        const info = yield* base.get(sessionID)
        yield* close(sessionID)
        yield* base.remove(sessionID)
        const host = yield* hosts.get(info.location)
        yield* Effect.promise(() => host.host.sessions.delete(sessionID))
        yield* Effect.promise(() => metadata.delete(LINKS, sessionID))
      }),
      fork: Effect.fn("TanStackSession.fork")(function* (input) {
        const info = yield* base.get(input.sessionID)
        const entry = yield* open(info)
        const at = input.before === undefined ? undefined : yield* boundary(entry, input.before)
        const forked = yield* base.fork(input)
        yield* Effect.promise(() =>
          entry.host.host.fork(entry.host.harness(), {
            threadId: info.id,
            newThreadId: forked.id,
            ...(at === undefined ? {} : { at }),
          }),
        )
        // The fork copies the messages with new ids and the same `seq`, and the harness messages with the same ids.
        const rows = yield* database.db
          .select({ id: SessionMessageTable.id, session: SessionMessageTable.session_id, seq: SessionMessageTable.seq })
          .from(SessionMessageTable)
          .where(eq(SessionMessageTable.session_id, forked.id))
          .all()
          .pipe(Effect.orDie)
        const parent = yield* database.db
          .select({ id: SessionMessageTable.id, seq: SessionMessageTable.seq })
          .from(SessionMessageTable)
          .where(eq(SessionMessageTable.session_id, info.id))
          .all()
          .pipe(Effect.orDie)
        const copies = new Map(rows.map((row) => [row.seq, row.id]))
        const renamed = new Map<string, string>(
          parent.flatMap((row) => {
            const copy = copies.get(row.seq)
            return copy === undefined ? [] : [[row.id, copy] as const]
          }),
        )
        const links = entry.links.flatMap((link) => {
          const copy = link.kind === "message" ? renamed.get(link.opencodeID) : undefined
          return copy === undefined ? [] : [{ ...link, opencodeID: copy }]
        })
        yield* Effect.promise(() => metadata.set(LINKS, forked.id, links))
        return forked
      }),
      prompt: Effect.fn("TanStackSession.prompt")(function* (input) {
        const info = yield* base.get(input.sessionID)
        const messageID = input.id ?? SessionMessage.ID.create()
        const delivery = SessionInbox.Delivery.make(input.delivery ?? "steer")
        const existing = yield* admission
          .reconcile({ id: messageID, sessionID: info.id, type: "user", delivery })
          .pipe(
            Effect.catchTag(
              "SessionInbox.LifecycleConflict",
              () => new PromptConflictError({ sessionID: info.id, messageID }),
            ),
          )
        if (existing) return existing
        const item = yield* SessionPrompt.prepare({ session: info, messageID, input }).pipe(
          Effect.provideService(Instance.Service, instances),
          Effect.provideService(FSUtil.Service, fs),
        )
        // A new prompt commits a staged revert. The harness drops the hidden messages at its next turn.
        if (info.revert) yield* SessionRevert.commit(bus, info)
        const entry = yield* open(info)
        const status = yield* admit(entry, info, {
          inboxID: messageID,
          item,
          text: item.payload.text,
          message: userMessage(item.payload),
          resume: input.resume !== false,
        })
        if (status === "rejected") return yield* new PromptConflictError({ sessionID: info.id, messageID })
        return SessionInbox.User.make({ id: messageID, sessionID: info.id, time: now(), ...item })
      }),
      generate: Effect.fn("TanStackSession.generate")(function* (input) {
        const info = yield* base.get(input.sessionID)
        const entry = yield* open(info)
        const overrides = yield* turn(entry, info)
        const transcript = yield* Effect.promise(() => entry.session.transcript())
        const generated = yield* Effect.tryPromise(() =>
          chat({
            adapter: overrides.adapter,
            messages: [...transcript, { role: "user", content: input.prompt }],
            stream: false,
          }),
        ).pipe(Effect.orDie)
        return generated.text
      }),
      shell: Effect.fn("TanStackSession.shell")(function* (input) {
        const info = yield* base.get(input.sessionID)
        // The server owns completion recording even if the submitting client disconnects.
        const running = yield* Effect.gen(function* () {
          const started = yield* SessionShell.start({ session: info, command: input.command }).pipe(
            Effect.provideService(Instance.Service, instances),
            Effect.tapError((error) =>
              synthetic({
                sessionID: info.id,
                text: `User shell command failed to start:\n${input.command}\n\n${error.message}`,
                description: input.command,
                metadata: { source: "shell", state: "error" },
                resume: false,
              }),
            ),
            Effect.orDie,
          )
          yield* bus.publish(
            SessionEvent.Shell.Started,
            { sessionID: info.id, shell: started.info },
            { id: input.id ? Event.ID.make(input.id.replace(/^msg_/, "evt_")) : undefined },
          )
          const terminal = yield* started.result
          const preview = yield* started.output
          yield* bus.publish(SessionEvent.Shell.Ended, { sessionID: info.id, shell: terminal.info, output: preview })
          yield* synthetic({ sessionID: info.id, ...ShellResult.userNotification(terminal), resume: false }).pipe(
            Effect.catchTag("Session.NotFoundError", () => Effect.void),
            Effect.orDie,
          )
        }).pipe(Effect.forkIn(scope, { startImmediately: true }))
        yield* Fiber.join(running)
      }),
      skill: Effect.fn("TanStackSession.skill")(function* (input) {
        const info = yield* base.get(input.sessionID)
        const skill = yield* SessionSkill.get({ session: info, skill: input.skill }).pipe(
          Effect.provideService(Instance.Service, instances),
        )
        yield* bus.publish(
          SessionEvent.Skill.Activated,
          { sessionID: info.id, id: skill.id, name: skill.name, text: skill.content },
          { id: input.messageID ? Event.ID.make(input.messageID.replace(/^msg_/, "evt_")) : undefined },
        )
        // The harness transcript is the model context, so the skill text goes to the harness too.
        const entry = yield* open(info)
        if (input.resume === false) {
          entry.held.push({ inboxID: undefined, text: skill.content })
          return
        }
        yield* continueWith(entry, info, skill.content)
      }),
      synthetic,
      // The harness compacts only at a model call. So a running turn compacts at its next model call, and an idle
      // session compacts at the first model call of its next turn. That compaction delivers the inbox item.
      compact: Effect.fn("TanStackSession.compact")(function* (input) {
        const info = yield* base.get(input.sessionID)
        const entry = yield* open(info)
        const compaction = entry.host.compaction()
        if (compaction === undefined)
          return yield* Effect.die(
            new NotSupportedError({ method: "compact", reason: "no model of the location can write a summary." }),
          )
        if (info.revert) yield* SessionRevert.commit(bus, info)
        const inputID = input.id ?? SessionMessage.ID.create()
        // It returns the compaction that already waits, if there is one.
        const admitted = yield* admission
          .admitCompaction({ id: inputID, sessionID: info.id, delivery: input.delivery ?? "steer" })
          .pipe(
            Effect.catchTag(
              "SessionInbox.LifecycleConflict",
              () => new CompactionConflictError({ sessionID: info.id, inputID }),
            ),
          )
        entry.mapper.compacting(admitted.id)
        compaction.compactNext(info.id)
        return admitted
      }),
      wait: Effect.fn("TanStackSession.wait")(function* (sessionID) {
        yield* base.get(sessionID)
        const entry = entries.get(sessionID)
        if (entry) yield* settle(entry)
      }),
      active: Effect.sync(() => new Set([...entries.values()].filter(isBusy).map((entry) => entry.sessionID))),
      background: Effect.fn("TanStackSession.background")(function* (sessionID) {
        yield* base.get(sessionID)
        const entry = entries.get(sessionID)
        // The harness tells the model about the moved calls, and wakes the session when they end.
        if (entry) yield* Effect.promise(() => entry.session.background())
      }),
      resume: Effect.fn("TanStackSession.resume")(function* (sessionID) {
        const info = yield* base.get(sessionID)
        const entry = yield* open(info)
        yield* Effect.promise(() => entry.session.recover())
        yield* settle(entry)
      }),
      interrupt: (sessionID) =>
        Effect.gen(function* () {
          const entry = entries.get(sessionID)
          if (entry === undefined || entry.session.snapshot().status !== "running") return false
          const receipt = yield* Effect.promise(() => entry.session.cancel())
          return receipt.status !== "rejected"
        }),
      cancelInbox: (input) =>
        changeInbox(input, {
          event: SessionEvent.InboxCancelled.type,
          harness: (session) => session.cancelInput(input.inboxID),
          held: (item, info) =>
            Effect.gen(function* () {
              const entry = entries.get(info.id)
              if (entry) entry.held.splice(entry.held.indexOf(item), 1)
              yield* bus.publish(SessionEvent.InboxCancelled, { sessionID: info.id, inboxID: input.inboxID })
            }),
        }),
      steerInbox: (input) =>
        changeInbox(input, {
          event: SessionEvent.InboxDeliveryChanged.type,
          harness: (session) => session.setDelivery(input.inboxID, "steer"),
          held: moveHeld("steer"),
        }),
      queueInbox: (input) =>
        changeInbox(input, {
          event: SessionEvent.InboxDeliveryChanged.type,
          harness: (session) => session.setDelivery(input.inboxID, "queue"),
          held: moveHeld("queue"),
        }),
      switchAgent: Effect.fn("TanStackSession.switchAgent")(function* (input) {
        yield* base.switchAgent(input)
        const entry = entries.get(input.sessionID)
        if (entry === undefined) return
        entry.mapper.select({ agent: input.agent })
        yield* receive(entry.session.setConfig("agent", input.agent))
      }),
      // The model of a turn is a turn override from the session model, so the next prompt uses the new model.
      switchModel: Effect.fn("TanStackSession.switchModel")(function* (input) {
        yield* base.switchModel(input)
        entries.get(input.sessionID)?.mapper.select({ model: input.model })
      }),
      move: Effect.fn("TanStackSession.move")(function* (input) {
        const info = yield* base.get(input.sessionID)
        const value = input.directory.trim()
        const expanded =
          value === "~" ? global.home : value.startsWith("~/") ? path.join(global.home, value.slice(2)) : value
        const directory = AbsolutePath.make(path.resolve(info.location.directory, expanded))
        const stat = yield* fs.stat(directory).pipe(Effect.orElseSucceed(() => undefined))
        if (!stat) return yield* new Session.DestinationNotFoundError({ directory })
        if (stat.type !== "Directory") return yield* new Session.DestinationNotDirectoryError({ directory })
        const project = yield* projects.resolve(directory)
        const location = Location.Ref.make({ directory, workspaceID: input.workspaceID })
        yield* locations.contextEffect(location).pipe(
          Effect.scoped,
          Effect.catchCause(() => Effect.fail(new Session.DestinationUnavailableError({ directory }))),
        )
        // The thread moves to the host of the new location at the next turn, so the turn that runs ends first.
        const entry = entries.get(info.id)
        if (entry) yield* settle(entry)
        yield* close(info.id)
        yield* bus.publish(SessionEvent.Moved, {
          sessionID: info.id,
          location,
          projectID: project.id,
          subpath: RelativePath.make(path.relative(project.directory, directory).replaceAll("\\", "/")),
        })
      }),
      revert: {
        stage: Effect.fn("TanStackSession.revert.stage")(function* (input) {
          const info = yield* base.get(input.sessionID)
          const entry = yield* open(info)
          if (isBusy(entry)) return yield* new BusyError({ sessionID: info.id })
          const kept = yield* boundary(entry, input.messageID)
          if (kept === null)
            return yield* Effect.die(
              new NotSupportedError({
                method: "revert.stage",
                reason: "the harness keeps the message it reverts to, so it cannot revert the first message.",
              }),
            )
          const receipt = yield* Effect.promise(() => entry.session.revert(kept))
          if (receipt.status === "rejected" && receipt.reason === "busy")
            return yield* new BusyError({ sessionID: info.id })
          if (receipt.status === "rejected")
            return yield* new MessageNotFoundError({ sessionID: info.id, messageID: input.messageID })
          const revert = { messageID: input.messageID }
          yield* bus.publish(
            SessionEvent.RevertEvent.Staged,
            { sessionID: info.id, revert },
            { location: info.location },
          )
          return revert
        }),
        clear: Effect.fn("TanStackSession.revert.clear")(function* (sessionID) {
          const info = yield* base.get(sessionID)
          const entry = yield* open(info)
          if (isBusy(entry)) return yield* new BusyError({ sessionID })
          const receipt = yield* Effect.promise(() => entry.session.unrevert())
          if (receipt.status === "rejected") return yield* new BusyError({ sessionID })
          if (info.revert)
            yield* bus.publish(SessionEvent.RevertEvent.Cleared, { sessionID }, { location: info.location })
        }),
        // The harness drops the hidden messages at its next turn. opencode drops its rows now.
        commit: Effect.fn("TanStackSession.revert.commit")(function* (sessionID) {
          const info = yield* base.get(sessionID)
          const entry = entries.get(sessionID)
          if (entry && isBusy(entry)) return yield* new BusyError({ sessionID })
          yield* SessionRevert.commit(bus, info)
        }),
      },
    })

    return result
  }),
)

/** opencode's own `Session` layer, with its dependencies. The TanStack layer decorates it. */
const original = Session.node.mapLayer((implementation) => implementation)

/**
 * The TanStack `Session` node. Replace `Session.node` with it: `Session.node.replace(TanStackSession.node)`.
 * Its `Hosts` come from `hostsNode`, so the location graph needs `TanStackHost.node`.
 */
export const node = makeGlobalNode({
  service: Session.Service,
  layer,
  deps: [
    original,
    hostsNode,
    TanStackPermission.liveNode,
    Bus.node,
    Database.node,
    SessionInbox.node,
    Instance.node,
    FSUtil.node,
    Global.node,
    Project.node,
    LocationServiceMap.node,
  ],
})

/** A turn or a control input runs while the harness has a running or a queued operation. */
function isBusy(entry: Entry) {
  const snapshot = entry.session.snapshot()
  return snapshot.activeOperations.length > 0 || snapshot.queuedTurns > 0
}

/** Runs a harness control input. A refused one only logs: opencode applies the change at the next turn. */
function receive(receipt: Promise<Receipt>) {
  return Effect.promise(() => receipt).pipe(
    Effect.flatMap((answer) =>
      answer.status === "rejected"
        ? Effect.logWarning("TanStack session: the harness refused a setting", { reason: answer.reason })
        : Effect.void,
    ),
  )
}

/** The harness message of an opencode prompt: its text, the texts of its skills, and its files. */
function userMessage(payload: SessionInbox.UserPayload): UserInput {
  const skills = (payload.skills ?? []).flatMap((skill) =>
    skill.text === undefined ? [] : [{ type: "text" as const, content: skill.text }],
  )
  const files = (payload.files ?? []).map((file): ContentPart => {
    const source = { type: "data" as const, value: file.data, mimeType: file.mime }
    return file.mime.startsWith("image/") ? { type: "image", source } : { type: "document", source }
  })
  if (skills.length === 0 && files.length === 0) return payload.text
  return [{ type: "text", content: payload.text }, ...skills, ...files]
}

/** Keeps the operations that start and end, from the harness lifecycle events. */
function track(entry: Entry, event: HarnessEvent) {
  const chunk = event.event
  if (chunk.type !== EventType.CUSTOM) return
  const operationId = Option.getOrUndefined(decodeOperationID(chunk.value))?.operationId
  if (operationId === undefined) return
  if (chunk.name === HARNESS_EVENTS.operationStarted) entry.running.add(operationId)
  if (chunk.name !== HARNESS_EVENTS.operationFinished) return
  entry.running.delete(operationId)
  entry.expected.delete(operationId)
  entry.finished.add(operationId)
}

function mark(type: string, inboxID: string) {
  return `${type} ${inboxID}`
}

function now() {
  return { created: DateTime.makeUnsafe(Date.now()) }
}

const decodeOperationID = Schema.decodeUnknownOption(Schema.Struct({ operationId: Schema.String }))
const decodeInboxID = Schema.decodeUnknownOption(Schema.Struct({ inboxID: Schema.String }))

function locationKey(location: Location.Ref) {
  return `${location.workspaceID ?? ""}\n${LocationServiceMap.canonical(location).directory}`
}

const decodeLinks = (value: unknown) =>
  Option.getOrElse(
    Schema.decodeUnknownOption(
      Schema.Array(
        Schema.Struct({
          kind: Schema.Literals(["message", "session"]),
          harnessID: Schema.String,
          opencodeID: Schema.String,
        }),
      ),
    )(value),
    () => [],
  )
