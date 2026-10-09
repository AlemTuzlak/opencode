export * as TanStackRecovery from "./recovery.js"

import { makeGlobalNode } from "@opencode/util/effect/app-node"
import { EventType } from "@tanstack/ai"
import type { AnyTextAdapter, StreamChunk } from "@tanstack/ai"
import { defineHarness } from "@tanstack/ai-harness"
import type { AnyAgent, HarnessDefinition, RecoverHook, TurnOverrides } from "@tanstack/ai-harness"
import { Context, Effect, Layer, Option, Schema } from "effect"
import { Model } from "../model.js"
import { SessionExecution } from "../session/execution.js"
import type { SessionSchema } from "../session/schema.js"

// The tool result that the harness `permissions()` plugin gives a call when the user rejects it with no message.
const DECLINED = "The user denied this tool call."

/** The model of a session as a `Model.Ref`, or `undefined` when the session has none. */
export function sessionModel(info: Pick<SessionSchema.Info, "model">) {
  if (info.model === undefined) return undefined
  // opencode names the default variant by leaving it out.
  const isDefault = info.model.variant === undefined || info.model.variant === "default"
  return Model.Ref.make({
    providerID: info.model.providerID,
    id: info.model.id,
    ...(isDefault ? {} : { variant: info.model.variant }),
  })
}

/**
 * The harness with a `durability.recover` hook that gives a recovered turn the turn overrides of its session. The
 * harness log keeps no turn overrides, so without the hook a turn that a crash stopped runs again on the default
 * model of the location.
 *
 * `overrides(threadId)` gives the overrides of the session, or `undefined` to keep the defaults. A `recover` hook
 * that the harness already has decides first.
 *
 * @example
 * const harness = TanStackRecovery.withRecovery(built.harness, (threadId) => overridesOf(threadId))
 */
export function withRecovery<
  TAdapter extends AnyTextAdapter,
  TAgents extends ReadonlyArray<AnyAgent>,
  TSubagents extends ReadonlyArray<AnyAgent>,
>(
  harness: HarnessDefinition<TAdapter, TAgents, TSubagents>,
  overrides: (threadId: string) => Promise<TurnOverrides | undefined>,
) {
  const inner = harness.durability?.recover
  const recover: RecoverHook = async (context) => {
    const decided = (await inner?.(context)) ?? context.decision
    const isRunWithDefaults = decided.action === "run" && decided.overrides === undefined
    if (!isRunWithDefaults) return decided
    const found = await overrides(context.session.threadId)
    return found === undefined ? decided : { action: "run", overrides: found }
  }
  return defineHarness({ ...harness, durability: { ...harness.durability, recover } })
}

/**
 * Is `chunk` the tool result of a call that the user rejected with no message? On opencode's runtime such a
 * decline ends the turn. With a message, the model gets the message and goes on, on both runtimes.
 *
 * The `permissions()` plugin skips a rejected call with the result `{ error }`, and the harness marks it as a
 * normal result. So only the text of the error tells a decline with no message.
 */
export function isDeclined(chunk: StreamChunk) {
  if (chunk.type !== EventType.TOOL_CALL_RESULT) return false
  return Option.getOrUndefined(decodeDeclined(chunk.content))?.error === DECLINED
}

const decodeDeclined = Schema.decodeUnknownOption(Schema.fromJsonString(Schema.Struct({ error: Schema.String })))

/** What `SessionExecution` uses of the TanStack session layer. */
export interface Driver {
  /** The sessions with a running or a queued harness turn. */
  readonly active: Effect.Effect<ReadonlySet<SessionSchema.ID>>
  /** Opens the session, runs the work that a stopped host left, and waits until the session is idle. */
  readonly resume: (sessionID: SessionSchema.ID) => Effect.Effect<void>
  /**
   * Interrupts the busy period of the session: the harness cancels its turn, and the final tool, step, and
   * execution events go out. `false` when the session is idle.
   */
  readonly interrupt: (
    sessionID: SessionSchema.ID,
    options: { readonly awaitSettlement: boolean; readonly reason?: "user" | "inactivity" },
  ) => Effect.Effect<boolean>
  /** Waits until the session is idle. Starts no work. */
  readonly awaitIdle: (sessionID: SessionSchema.ID) => Effect.Effect<void>
}

/**
 * Where the TanStack session layer puts its `Driver` when it starts. `SessionExecution` cannot depend on the
 * `Session` service, because the `Session` node depends on `SessionExecution`, so it reads the driver here.
 */
export class Drivers extends Context.Service<Drivers, { current: Driver | undefined }>()(
  "@opencode/TanStackRecovery/Drivers",
) {}

export const driversNode = makeGlobalNode({
  service: Drivers,
  layer: Layer.sync(Drivers, () => ({ current: undefined })),
  deps: [],
})

/**
 * `SessionExecution` on the TanStack runtime. The harness runs the turns, so this layer only reports and controls
 * them through the session layer's `Driver`:
 *
 * - `active` and `isActive` show the sessions with a running or a queued harness turn. `LocationActivity` reads
 *   them before it evicts a location.
 * - `interrupt` cancels the harness turn, as a fiber interruption stops a turn on opencode's runtime.
 * - `resume` opens the session on its host, which runs the work that a stopped host left. `SessionRestart` calls
 *   it at boot for each session that kept its execution claim.
 * - `wake` does nothing: the session layer gives each input to the harness at once.
 *
 * Before the session layer starts, every session is idle.
 */
export const executionLayer = Layer.effect(
  SessionExecution.Service,
  Effect.gen(function* () {
    const drivers = yield* Drivers
    const active = Effect.suspend(() => drivers.current?.active ?? Effect.succeed(new Set<SessionSchema.ID>()))
    return SessionExecution.Service.of({
      active,
      isActive: (sessionID) => active.pipe(Effect.map((sessions) => sessions.has(sessionID))),
      resume: (sessionID) => Effect.suspend(() => drivers.current?.resume(sessionID) ?? Effect.void),
      wake: () => Effect.void,
      interrupt: (sessionID, options) =>
        Effect.suspend(
          () =>
            drivers.current?.interrupt(sessionID, {
              awaitSettlement: options?.awaitSettlement === true,
              ...(options?.reason ? { reason: options.reason } : {}),
            }) ?? Effect.succeed(false),
        ),
      awaitIdle: (sessionID) => Effect.suspend(() => drivers.current?.awaitIdle(sessionID) ?? Effect.void),
    })
  }),
)

export const executionNode = makeGlobalNode({
  service: SessionExecution.Service,
  layer: executionLayer,
  deps: [driversNode],
})
