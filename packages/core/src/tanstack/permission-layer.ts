export * as TanStackPermission from "./permission-layer.js"

import type { HarnessSession, PermissionRule } from "@tanstack/ai-harness"
import { deleteSavedPermission, listSavedPermissions } from "@tanstack/ai-harness/plugins"
import { makeGlobalNode, makeLocationNode } from "@opencode/util/effect/app-node"
import { Hash } from "@opencode/util/hash"
import { Context, DateTime, Deferred, Effect, Layer, Option } from "effect"
import { Agent } from "../agent.js"
import { Bus } from "../bus.js"
import { Database } from "../database/database.js"
import { Form } from "../form.js"
import { Location } from "../location.js"
import { Permission } from "../permission.js"
import { PermissionSaved } from "../permission/saved.js"
import { PluginHooks } from "../plugin/hooks.js"
import { SessionErrors } from "../session/error.js"
import { SessionSchema } from "../session/schema.js"
import { SessionStore } from "../session/store.js"
import { Wildcard } from "../util/wildcard.js"
import type { EventMapper, Output, Published } from "./events.js"
import { TanstackStores } from "./stores.js"
import { toOpencodeName } from "./tool-names.js"

/** What the facades use of a harness session. */
export type LiveSession = Pick<
  HarnessSession,
  "threadId" | "answer" | "snapshot" | "agentRuns" | "agentRun" | "background"
>

interface AskBase {
  /** The harness session that asked. A subagent asks on the session of its parent. */
  readonly session: LiveSession
  /** The harness `questionId`. Answer it with `session.answer`. */
  readonly questionId: string
  readonly location: Location.Ref | undefined
}

/** A harness `permissions()` question, as the mapper published it in `permission.asked`. */
export interface PermissionAsk extends AskBase {
  readonly kind: "permission"
  readonly request: Permission.Request
}

/** Another harness question, as the mapper published it in `form.created`. */
export interface FormAsk extends AskBase {
  readonly kind: "form"
  readonly form: Form.Info
}

export type Ask = PermissionAsk | FormAsk

export interface LiveInterface {
  /**
   * The session layer calls this with each batch of event mapper outputs of a harness session, before it
   * publishes them. Call it once with no outputs when the session opens, so the job facade finds the session.
   */
  readonly track: (input: {
    readonly session: LiveSession
    readonly mapper: EventMapper
    readonly outputs: ReadonlyArray<Output>
  }) => void
  /** The session layer calls this when a harness session closes. Its open asks go away with it. */
  readonly forget: (threadId: string) => void
  readonly sessions: () => ReadonlyArray<LiveSession>
  /** The open ask with a `per_` or `frm_` id. */
  readonly ask: (id: string) => Ask | undefined
  readonly asks: () => ReadonlyArray<Ask>
  /** Removes an ask that a facade answered or cancelled. */
  readonly settle: (id: string) => void
}

/**
 * The harness sessions of the process and their open questions. The session layer feeds it. The permission,
 * form, and job facades read it.
 */
export class Live extends Context.Service<Live, LiveInterface>()("@opencode/TanStackLive") {}

export const liveLayer = Layer.sync(Live, () => {
  const sessions = new Map<string, LiveSession>()
  const asks = new Map<string, Ask>()
  return Live.of({
    track: (input) => {
      sessions.set(input.session.threadId, input.session)
      for (const output of input.outputs) {
        const ask = askOf(input.session, input.mapper, output)
        if (ask) asks.set(ask.kind === "permission" ? ask.request.id : ask.form.id, ask)
      }
    },
    forget: (threadId) => {
      sessions.delete(threadId)
      for (const [id, ask] of asks) if (ask.session.threadId === threadId) asks.delete(id)
    },
    sessions: () => [...sessions.values()],
    ask: (id) => asks.get(id),
    asks: () => [...asks.values()],
    settle: (id) => {
      asks.delete(id)
    },
  })
})

export const liveNode = makeGlobalNode({ service: Live, layer: liveLayer, deps: [] })

function askOf(session: LiveSession, mapper: EventMapper, output: Output) {
  if (output.type !== "publish") return undefined
  const location = output.options.location
  if (isPublished(output, Permission.Event.Asked)) {
    const questionId = mapper.questionID(output.data.id)
    return questionId === undefined
      ? undefined
      : ({ kind: "permission", session, questionId, location, request: output.data } satisfies PermissionAsk)
  }
  if (isPublished(output, Form.Event.Created)) {
    const questionId = mapper.questionID(output.data.form.id)
    return questionId === undefined
      ? undefined
      : ({ kind: "form", session, questionId, location, form: output.data.form } satisfies FormAsk)
  }
  return undefined
}

function isPublished<D extends Published["definition"]>(output: Published, definition: D): output is Published<D> {
  return output.definition === definition
}

/** Is the ask from `location`? The facades of a location see only its asks. */
export function isAt(ask: Ask, location: Location.Interface) {
  return (
    ask.location === undefined ||
    (ask.location.directory === location.directory && ask.location.workspaceID === location.workspaceID)
  )
}

/** Is the harness question of `ask` still open? A closed session drops its questions without an event. */
function isOpen(ask: Ask) {
  return ask.session.snapshot().pendingQuestions.some((question) => question.questionId === ask.questionId)
}

const missingAgentPermissions: Permission.Ruleset = [{ action: "*", resource: "*", effect: "deny" }]

interface Pending {
  readonly request: Permission.Request
  readonly agent?: Agent.ID
  readonly deferred: Deferred.Deferred<void, Permission.DeclinedError | Permission.CorrectedError>
}

/**
 * opencode's `Permission.Service` for the TanStack runtime.
 *
 * - Asks of harness tool calls: the harness `permissions()` plugin asks, and the event mapper publishes
 *   `permission.asked`. `get`, `list`, and `forSession` show them. `reply` publishes `permission.replied` and
 *   answers the harness question with `session.answer(questionId, { answer, message })`.
 * - Asks from outside a harness turn (`ask` and `assert`, for example from the `session.permission.create`
 *   route or a plugin): the harness has no public API to ask the user from outside a plugin. So these use
 *   opencode's rules, as `Permission.layer` does, with the harness saved rules from `PermissionSaved`.
 *
 * A `reject` also rejects the other open asks of the session, with the same message, as opencode does.
 */
export const layer = Layer.effect(
  Permission.Service,
  Effect.gen(function* () {
    const bus = yield* Bus.Service
    const location = yield* Location.Service
    const agents = yield* Agent.Service
    const sessions = yield* SessionStore.Service
    const saved = yield* PermissionSaved.Service
    const hooks = yield* PluginHooks.Service
    const live = yield* Live
    const pending = new Map<Permission.ID, Pending>()
    const state = { closed: false }

    const harnessAsk = (id: Permission.ID) => {
      const ask = live.ask(id)
      return ask?.kind === "permission" && isAt(ask, location) ? ask : undefined
    }
    const harnessAsks = () =>
      live.asks().flatMap((ask) => (ask.kind === "permission" && isAt(ask, location) ? [ask] : []))
    const requests = () => [
      ...Array.from(pending.values(), (item) => item.request),
      ...harnessAsks().map((ask) => ask.request),
    ]

    const publishReplied = (request: Permission.Request, reply: Permission.Reply, at?: Location.Ref) =>
      bus.publish(
        Permission.Event.Replied,
        { sessionID: request.sessionID, requestID: request.id, reply },
        at ? { location: at } : undefined,
      )

    /** Publishes `permission.replied`, then answers the harness question. */
    const answer = Effect.fnUntraced(function* (ask: PermissionAsk, reply: Permission.Reply, message?: string) {
      live.settle(ask.request.id)
      if (!isOpen(ask)) return yield* new Permission.NotFoundError({ requestID: ask.request.id })
      yield* publishReplied(ask.request, reply, ask.location)
      const value = message === undefined ? { answer: reply } : { answer: reply, message }
      yield* Effect.promise(() => ask.session.answer(ask.questionId, value))
    })

    const close = Effect.gen(function* () {
      state.closed = true
      yield* Effect.forEach(Array.from(pending.values()), (item) =>
        publishReplied(item.request, "reject").pipe(
          Effect.ensuring(Deferred.fail(item.deferred, new Permission.DeclinedError())),
        ),
      )
      pending.clear()
      // The host closes the harness sessions of the location, and that drops their questions.
      yield* Effect.forEach(harnessAsks(), (ask) =>
        publishReplied(ask.request, "reject", ask.location).pipe(
          Effect.ensuring(Effect.sync(() => live.settle(ask.request.id))),
        ),
      )
    }).pipe(Effect.uninterruptible)
    yield* Effect.addFinalizer(() => close)

    const savedRules = Effect.fnUntraced(function* () {
      return (yield* saved.list({ projectID: location.project.id })).map(
        (item) => ({ action: item.action, resource: item.resource, effect: "allow" }) satisfies Permission.Rule,
      )
    })

    const configured = Effect.fnUntraced(function* (sessionID: SessionSchema.ID, agentID?: Agent.ID) {
      const session = yield* sessions.get(sessionID)
      if (!session) return yield* new SessionErrors.NotFoundError({ sessionID })
      const agent = yield* agents.resolve(agentID ?? session.agent)
      return Permission.merge(agent?.permissions ?? missingAgentPermissions, session.permissions ?? [])
    })

    const evaluateInput = Effect.fnUntraced(function* (input: Permission.AssertInput) {
      const rules = yield* configured(input.sessionID, input.agent)
      const isDenied = input.resources.some(
        (resource) => Permission.evaluate(input.action, resource, rules).effect === "deny",
      )
      if (isDenied) return { effect: "deny" as const, rules }
      const all = [...rules, ...(yield* savedRules())]
      const effects = input.resources.map((resource) => Permission.evaluate(input.action, resource, all).effect)
      const event = yield* hooks.trigger("permission", "evaluate", {
        sessionID: input.sessionID,
        agent: input.agent,
        action: input.action,
        resources: input.resources,
        metadata: input.metadata,
        source: input.source,
        effect: effects.includes("ask") ? "ask" : "allow",
      })
      return { effect: event.effect, message: event.message, rules: all }
    })

    const requestOf = (input: Permission.AssertInput, message?: string) =>
      ({
        id: input.id ?? Permission.ID.create(),
        sessionID: input.sessionID,
        action: input.action,
        resources: input.resources,
        save: input.save,
        metadata: input.metadata,
        source: input.source,
        message,
      }) satisfies Permission.Request

    const create = (request: Permission.Request, agent?: Agent.ID) =>
      Effect.uninterruptible(
        Effect.gen(function* () {
          const deferred = yield* Deferred.make<void, Permission.DeclinedError | Permission.CorrectedError>()
          const item = { request, agent, deferred }
          if (state.closed) {
            yield* Deferred.fail(deferred, new Permission.DeclinedError())
            return item
          }
          if (pending.has(request.id) || harnessAsk(request.id))
            return yield* Effect.die(new Error(`Duplicate pending permission ID: ${request.id}`))
          pending.set(request.id, item)
          yield* bus
            .publish(Permission.Event.Asked, request)
            .pipe(Effect.onError(() => Effect.sync(() => pending.delete(request.id))))
          return item
        }),
      )

    const ask = Effect.fn("TanStackPermission.ask")(function* (input: Permission.AssertInput) {
      if (state.closed) return { id: input.id ?? Permission.ID.create(), effect: "deny" as const }
      const result = yield* evaluateInput(input)
      const request = requestOf(input, result.message)
      if (result.effect === "ask") yield* create(request, input.agent)
      return { id: request.id, effect: result.effect }
    })

    const assert = Effect.fn("TanStackPermission.assert")((input: Permission.AssertInput) =>
      Effect.gen(function* () {
        if (state.closed) return yield* Effect.die(new Permission.DeclinedError())
        const result = yield* evaluateInput(input)
        return yield* Effect.uninterruptibleMask((restore) =>
          Effect.gen(function* () {
            if (result.effect === "deny")
              return yield* new Permission.BlockedError({
                rules: result.rules.filter((rule) => Wildcard.match(input.action, rule.action)),
                permission: input.action,
                resources: input.resources,
                reason: result.message,
              })
            if (result.effect === "allow") return
            const item = yield* create(requestOf(input, result.message), input.agent)
            return yield* restore(Deferred.await(item.deferred)).pipe(
              // As in `Permission.layer`: a decline travels as a defect, so a tool's `mapError` cannot turn it
              // into model-facing output. A decline with feedback stays typed.
              Effect.catchTag("Permission.DeclinedError", (error) => Effect.die(error)),
              Effect.ensuring(Effect.sync(() => pending.delete(item.request.id))),
            )
          }),
        )
      }),
    )

    /** Rejects the other open asks of the session. Feedback applies to the whole batch, as in opencode. */
    const rejectOthers = Effect.fnUntraced(function* (sessionID: SessionSchema.ID, message?: string) {
      for (const [id, item] of pending) {
        if (item.request.sessionID !== sessionID) continue
        yield* publishReplied(item.request, "reject")
        yield* Deferred.fail(item.deferred, declined(message))
        pending.delete(id)
      }
      const others = harnessAsks().filter((other) => other.request.sessionID === sessionID)
      yield* Effect.forEach(others, (other) => answer(other, "reject", message).pipe(Effect.ignore))
    })

    /** After an `always`, the other local asks that the saved rules now allow resolve too, as in opencode. */
    const allowCovered = Effect.fnUntraced(function* () {
      for (const [id, item] of pending) {
        const result = yield* evaluateInput({ ...item.request, agent: item.agent }).pipe(
          Effect.catchTag("Session.NotFoundError", () => Effect.undefined),
        )
        if (result?.effect !== "allow") continue
        yield* publishReplied(item.request, "always")
        yield* Deferred.succeed(item.deferred, undefined)
        pending.delete(id)
      }
    })

    const replyLocal = Effect.fnUntraced(function* (item: Pending, input: Permission.ReplyInput) {
      yield* publishReplied(item.request, input.reply)
      pending.delete(item.request.id)
      if (input.reply === "reject") return yield* Deferred.fail(item.deferred, declined(input.message))
      const isSaved = input.reply === "always" && (item.request.save?.length ?? 0) > 0
      if (isSaved)
        yield* saved.add({
          projectID: location.project.id,
          action: item.request.action,
          resources: item.request.save ?? [],
        })
      yield* Deferred.succeed(item.deferred, undefined)
      if (isSaved) yield* allowCovered()
    })

    const reply = Effect.fn("TanStackPermission.reply")((input: Permission.ReplyInput) =>
      Effect.uninterruptible(
        Effect.gen(function* () {
          const local = pending.get(input.requestID)
          const harness = harnessAsk(input.requestID)
          const request = local?.request ?? harness?.request
          if (!request) return yield* new Permission.NotFoundError({ requestID: input.requestID })
          // `create` refuses an id that the harness uses, so at most one of them is set.
          if (local) yield* replyLocal(local, input)
          if (harness) yield* answer(harness, input.reply, input.message)
          if (input.reply === "reject") yield* rejectOthers(request.sessionID, input.message)
        }),
      ),
    )

    const get = Effect.fn("TanStackPermission.get")(function* (id: Permission.ID) {
      return pending.get(id)?.request ?? harnessAsk(id)?.request
    })

    const list = Effect.fn("TanStackPermission.list")(function* () {
      return requests()
    })

    const forSession = Effect.fn("TanStackPermission.forSession")(function* (sessionID: SessionSchema.ID) {
      return requests().filter((request) => request.sessionID === sessionID)
    })

    return Permission.Service.of({ ask, assert, reply, get, forSession, list, close })
  }),
)

export const node = makeLocationNode({
  service: Permission.Service,
  layer,
  deps: [Bus.node, Location.node, Agent.node, SessionStore.node, PermissionSaved.node, PluginHooks.node, liveNode],
})

function declined(message: string | undefined) {
  return message ? new Permission.CorrectedError({ feedback: message }) : new Permission.DeclinedError()
}

// The harness tools that change files. opencode checks them with its one `edit` permission.
const EDIT_TOOLS = new Set(["write_file", "edit_file", "patch"])

/** The opencode permission action of a harness tool, as the event mapper names it in `permission.asked`. */
export function opencodeAction(tool: string) {
  return EDIT_TOOLS.has(tool) ? "edit" : toOpencodeName(tool)
}

/**
 * opencode's `PermissionSaved.Service` on the rules that `always` answers save in the harness. Keeps the
 * routes `GET /api/permission/saved` and `DELETE /api/permission/saved/:id` working.
 *
 * The harness saves the rules for each folder (the `root` of `permissions()`, the location directory), not
 * for each project. So `list` and `remove` read the location of the caller: a call outside a location sees
 * no rules, and `list` with the id of another project gives no rules.
 *
 * The ids come from the tool and the resource of a rule. The harness keeps no times, so `time` is zero.
 * `add` saves nothing: the harness has no API to add a saved rule.
 */
export const savedLayer = Layer.effect(
  PermissionSaved.Service,
  Effect.gen(function* () {
    const stores = (yield* TanstackStores.make).stores

    const savedHere = Effect.fnUntraced(function* () {
      const location = Option.getOrUndefined(yield* Effect.serviceOption(Location.Service))
      if (!location) return []
      const rules = yield* Effect.promise(() => listSavedPermissions(stores, location.directory))
      return rules.map((rule) => ({ location, rule, info: savedInfo(location, rule) }))
    })

    const list = Effect.fn("TanStackPermission.saved.list")(function* (input?: PermissionSaved.ListInput) {
      const entries = yield* savedHere()
      return entries
        .filter((entry) => input?.projectID === undefined || input.projectID === entry.location.project.id)
        .map((entry) => entry.info)
    })

    const remove = Effect.fn("TanStackPermission.saved.remove")(function* (id: PermissionSaved.ID) {
      const found = (yield* savedHere()).find((entry) => entry.info.id === id)
      if (!found) return
      yield* Effect.promise(() => deleteSavedPermission(stores, found.location.directory, found.rule))
    })

    const add = Effect.fn("TanStackPermission.saved.add")(function* (input: PermissionSaved.AddInput) {
      yield* Effect.logWarning("TanStack runtime: the harness has no API to add a saved permission rule", {
        action: input.action,
        resources: input.resources,
      })
    })

    return PermissionSaved.Service.of({ list, add, remove })
  }),
)

export const savedNode = makeGlobalNode({ service: PermissionSaved.Service, layer: savedLayer, deps: [Database.node] })

function savedInfo(location: Location.Interface, rule: PermissionRule) {
  const resource = rule.resource ?? "*"
  const time = DateTime.makeUnsafe(0)
  return {
    id: PermissionSaved.ID.make(`psv_${Hash.fast(`${rule.tool}\n${resource}`)}`),
    projectID: location.project.id,
    action: opencodeAction(rule.tool),
    resource,
    time: { created: time, updated: time },
  } satisfies PermissionSaved.Info
}
