export * as SessionExecution from "./execution.js"

import type { AIError } from "@opencode/ai"
import { makeGlobalNode } from "@opencode/util/effect/app-node"
import { Context, Effect, Layer } from "effect"
import type { FileSystem } from "../filesystem.js"
import type { Instructions } from "../instructions/index.js"
import type { AgentNotFoundError, MessageDecodeError, StepFailedError } from "./error.js"
import type { SessionRunnerModel } from "./runner-model.js"
import { SessionSchema } from "./schema.js"

/** The errors of a session turn. */
export type RunError =
  | AIError
  | SessionRunnerModel.Error
  | MessageDecodeError
  | AgentNotFoundError
  | StepFailedError
  | Instructions.InitializationBlocked
  | FileSystem.DirectoryNotFoundError

export interface Interface {
  /** Snapshots active execution owned by this process. */
  readonly active: Effect.Effect<ReadonlySet<SessionSchema.ID>>
  /** Checks process-local ownership, including interruption cleanup and terminal settlement. */
  readonly isActive: (sessionID: SessionSchema.ID) => Effect.Effect<boolean>
  /** Starts execution while idle or joins the active execution. */
  readonly resume: (sessionID: SessionSchema.ID) => Effect.Effect<void, RunError>
  /** Registers newly recorded work. Repeated wakeups may coalesce. */
  readonly wake: (sessionID: SessionSchema.ID) => Effect.Effect<void>
  /**
   * Interrupt active work owned by this process. Idle interruption is a no-op. Resolves once
   * the interruption is accepted; cleanup settles asynchronously in the execution fiber.
   * Returns whether an active execution was interrupted. Compose with `awaitIdle` when
   * settlement matters. `awaitSettlement` waits only for the interrupted execution,
   * rather than fresh work admitted during its cleanup.
   */
  readonly interrupt: (
    sessionID: SessionSchema.ID,
    options?: {
      readonly resume?: boolean
      readonly reason?: "user" | "inactivity"
      readonly awaitSettlement?: boolean
    },
  ) => Effect.Effect<boolean>
  /** Resolves once this process owns no active execution for the Session. Returns immediately when idle and never starts work. */
  readonly awaitIdle: (sessionID: SessionSchema.ID) => Effect.Effect<void>
}

/** Reports and controls the session turns of this process. */
export class Service extends Context.Service<Service, Interface>()("@opencode/SessionExecution") {}

/** An execution that runs no work. Use it in a graph that only records sessions. */
export const noopLayer = Layer.succeed(
  Service,
  Service.of({
    active: Effect.succeed(new Set()),
    isActive: () => Effect.succeed(false),
    resume: () => Effect.void,
    wake: () => Effect.void,
    interrupt: () => Effect.succeed(false),
    awaitIdle: () => Effect.void,
  }),
)

/**
 * The execution slot of the app graph. By default it runs no work: `TanStackOverrides.replacements` puts the
 * execution of the TanStack harness in it.
 */
export const node = makeGlobalNode({ service: Service, layer: noopLayer, deps: [] })
