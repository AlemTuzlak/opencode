export * as TanStackPluginCompat from "./plugin-compat.js"

import { AsyncLocalStorage } from "node:async_hooks"
import path from "node:path"
import { isRecord } from "@opencode/ai/utils/record"
import { Media, Message, SystemPart, ToolCallPart } from "@opencode/ai"
import type { ToolResultValue } from "@opencode/ai"
import type {
  SessionContext,
  SessionModelRequest,
  SessionRequest,
} from "@opencode/plugin/effect/session"
import type { ShellCreateBefore } from "@opencode/plugin/effect/shell"
import { makeLocationNode } from "@opencode/util/effect/app-node"
import { FSUtil } from "@opencode/util/fs-util"
import { convertSchemaToJsonSchema, EventType } from "@tanstack/ai"
import type {
  AdapterYieldChunk,
  AfterToolCallInfo,
  AnyTextAdapter,
  AnyTool,
  ChatMiddleware,
  ChatMiddlewareConfig,
  ChatMiddlewareContext,
  ContentPart,
  ModelMessage,
  SystemPrompt,
  TextOptions,
  ToolCallHookContext,
} from "@tanstack/ai"
import { definePlugin, isTransientModelError, retryTransientErrors } from "@tanstack/ai-harness"
import type { ModelErrorContext } from "@tanstack/ai-harness"
import { PermissionDecisionCapability, PermissionResources, title } from "@tanstack/ai-harness/plugins"
import type { ToolResources } from "@tanstack/ai-harness/plugins"
import type { WorkspaceBackend } from "@tanstack/ai-harness/plugins/coding"
import { Effect, Layer, Option, Result, Schema } from "effect"
import type { JsonSchema } from "effect"
import { Agent } from "../agent.js"
import { App } from "../app.js"
import type { Model } from "../model.js"
import { Plugin } from "../plugin.js"
import { PluginHooks } from "../plugin/hooks.js"
import { Session } from "../session.js"
import { SessionAffinity } from "../session/affinity.js"
import { SessionMessage } from "../session/message.js"
import { Tool } from "../tool.js"
import { definition } from "../tool/runtime.js"
import { modelResult } from "./opencode-tools.js"
import {
  permissionAction,
  toHarnessInput,
  toHarnessName,
  toOpencodeInput,
  toOpencodeName,
  toOpencodeResult,
} from "./tool-names.js"

/** What the hooks need from the harness builder. */
export interface Options {
  /** The folder of the location. */
  readonly root: string
  /** The agent of a session that names none: the default agent of the location. */
  readonly agent: Agent.ID
  /** The model of a session that names none: the default model of the location. */
  readonly model: Model.Ref | undefined
  /**
   * The opencode model of an adapter model id (`ChatMiddlewareContext.model`), and the base URL of its requests.
   * `undefined` for a model that the harness builder did not resolve.
   */
  readonly resolve: (adapterModel: string) => { readonly ref: Model.Ref; readonly baseURL: string | undefined } | undefined
}

type RequestScope = Pick<SessionModelRequest, "sessionID" | "agent" | "model" | "kind">

// The defaults of `retryTransientErrors()`, so a `session.retry` hook sees the decision that the harness would take.
const MAX_RETRIES = 3
const BASE_DELAY_MS = 2_000
const MAX_RETRY_AFTER_MS = 15 * 60_000

/**
 * opencode's plugin hooks on the TanStack harness. Run it in the Effect context of the location, then put the parts
 * into `defineHarness`:
 *
 * - `requests`: `session.model.request` for each model call, with the session headers of the opencode runtime. Put
 *   it before the other plugins that wrap the fetch.
 * - `network`: `session.http.request` and `session.http.response`, under the opencode request wiring. Give it to
 *   `TanStackAdapters.adapterFor({ fetch })`.
 * - `permissions`: `permission.evaluate` for each tool call. Put it just before `permissions()`.
 * - `shell`: marks the `bash` calls for `backend`. Put it before `agents()`, so subagent calls are marked too.
 * - `backend(base, root)`: `shell.create.before` for each command of a `bash` call.
 * - `tools`: `tool.execute.before` and `tool.execute.after`, with opencode tool names and inputs. Put it last.
 * - `onModelError`: `session.retry`, for `turn.onModelError`.
 * - `context`: `session.context` before each model call. Put it after the plugins that build the request.
 * - `title(adapter)`: the harness `title()` plugin, with `session.title`.
 * - `compaction(middleware)` and `summaryAdapter(adapter)`: the compaction middleware and the adapter of its
 *   summaries, with `session.compaction`.
 *
 * The `session.context`, `session.compaction`, and `session.title` hooks run only for plugins that are not built in
 * (`PluginHooks.ExternalOnly`). The built-in plugins use them to change opencode's own system prompt and tools, which
 * the harness does not have. `session.generate` does not run: `Session.generate` of the TanStack runtime calls the
 * model without these parts.
 *
 * `session.prompt` runs in the session layer, before the harness admits the prompt.
 *
 * @example
 * const compat = yield* TanStackPluginCompat.make({ agent, model, resolve: (id) => resolved.get(id) })
 * defineHarness({ turn: { onModelError: compat.onModelError }, plugins: () => [compat.requests, ..., compat.tools] })
 */
export const make = Effect.fn("TanStackPluginCompat.make")(function* (options: Options) {
  const hooks = yield* PluginHooks.Service
  const sessions = yield* Session.Service
  const registry = yield* Tool.Service
  const app = yield* App.Metadata
  // The scope of the model call that sends a request. `network` reads it under the opencode request wiring.
  const calls = new AsyncLocalStorage<RequestScope>()
  // Set while a `bash` call runs, so `backend` runs `shell.create.before` for its commands only.
  const shellCalls = new AsyncLocalStorage<true>()
  // The harness input of each call after `tool.execute.before`, for `tool.execute.after`.
  const inputs = new Map<string, unknown>()
  const fallback = retryTransientErrors()

  const sessionOf = (sessionID: Session.ID) => Effect.runPromise(sessions.get(sessionID).pipe(Effect.orDie))

  /** The agent of a call: the subagent of an agent run, else the agent of the session. */
  const agentOf = async (sessionID: Session.ID, run: Pick<ChatMiddlewareContext, "subagentName">) => {
    if (run.subagentName !== undefined) return Agent.ID.make(run.subagentName)
    return (await sessionOf(sessionID)).agent ?? options.agent
  }

  const requests = definePlugin({
    name: "opencode/model-request",
    setup: async (ctx) => {
      // ponytail: a subagent's requests carry its parent session's headers, because its child session is made later.
      const sessionID = Session.ID.make(ctx.session.threadId)
      const headers = sessionHeaders(await sessionOf(sessionID), app)
      const middleware: ChatMiddleware = {
        name: "opencode/model-request",
        // Every phase: before each model call the chat config starts again from the `chat()` options.
        onConfig: async (run) => {
          const model = options.resolve(run.model)
          if (model === undefined) return { wrapFetch: (next) => send(next, headers, undefined) }
          const scope = { sessionID, agent: await agentOf(sessionID, run), model: model.ref, kind: "primary" as const }
          return { wrapFetch: (next) => send(next, headers, { scope, baseURL: model.baseURL }) }
        },
      }
      return { middleware: [middleware], agentMiddleware: [middleware] }
    },
  })

  /** `next` with the session headers, after `session.model.request` changed them. */
  const send = (
    next: typeof fetch,
    headers: Record<string, string>,
    call: { readonly scope: RequestScope; readonly baseURL: string | undefined } | undefined,
  ) => {
    const sendOne = async (input: Parameters<typeof fetch>[0], init?: Parameters<typeof fetch>[1]) => {
      if (call === undefined) return next(input, { ...init, headers: withHeaders(input, init, headers, headers) })
      const event = await Effect.runPromise(
        hooks.trigger("session", "model.request", { ...call.scope, baseURL: call.baseURL, headers: { ...headers } }),
      )
      const target = rebase(input, call.baseURL, event.baseURL)
      const merged = withHeaders(input, init, headers, event.headers)
      return calls.run(call.scope, () => next(target, { ...init, headers: merged }))
    }
    return Object.assign(sendOne, { preconnect: next.preconnect })
  }

  const network = Object.assign(
    async (input: Parameters<typeof fetch>[0], init?: Parameters<typeof fetch>[1]) => {
      const scope = calls.getStore()
      if (scope === undefined) return fetch(input, init)
      const isHooked = await Effect.runPromise(
        Effect.all([
          hooks.has("session", "http.request", scope.model.providerID),
          hooks.has("session", "http.response", scope.model.providerID),
        ]).pipe(Effect.map((found) => found.includes(true))),
      )
      if (!isHooked) return fetch(input, init)
      const before = await Effect.runPromise(
        hooks.trigger("session", "http.request", {
          ...scope,
          request: input instanceof Request ? new Request(input, init) : new Request(String(input), init),
        }),
      )
      const response = await fetch(before.request)
      const after = await Effect.runPromise(
        hooks.trigger("session", "http.response", { ...scope, request: before.request, response }),
      )
      return after.response
    },
    { preconnect: fetch.preconnect },
  )

  /**
   * `tool.execute.before` for a harness tool call. The hook sees the opencode tool name and input. Its input change
   * goes back with harness field names. A `Tool.Error` refuses the call, and the model gets its message.
   */
  const beforeTool = async (sessionID: Session.ID, run: ChatMiddlewareContext, hook: ToolCallHookContext) => {
    const name = toOpencodeName(hook.toolName)
    const input = isRecord(hook.args) ? toOpencodeInput(hook.toolName, hook.args) : hook.args
    const event = {
      tool: name,
      sessionID,
      agent: await agentOf(sessionID, run),
      messageID: messageOf(run, hook.toolCallId),
      id: Tool.CallID.make(hook.toolCallId),
      input,
    }
    const result = await Effect.runPromise(Effect.result(hooks.trigger("tool", "execute.before", event)))
    if (Result.isFailure(result)) return { type: "skip" as const, result: { error: result.failure.message } }
    const declared = await Effect.runPromise(declaredFields(name))
    const args = harnessArgs(name, input, event.input, declared)
    inputs.set(hook.toolCallId, args)
    if (JSON.stringify(args) === JSON.stringify(hook.args)) return undefined
    return { type: "transformArgs" as const, args }
  }

  /** The input fields of an opencode tool. `undefined` for a tool that opencode does not have, such as `list_files`. */
  const declaredFields = (name: string) =>
    registry.list().pipe(
      Effect.map((tools) => {
        const tool = tools.find((item) => item.id === name)
        if (tool === undefined) return undefined
        const properties = definition(tool).inputSchema.properties
        return new Set(isRecord(properties) ? Object.keys(properties) : [])
      }),
    )

  /**
   * `tool.execute.after` for a harness tool call. The hook sees the result as opencode's tool gives it. A changed
   * result goes to the model: its text, or its text and files.
   */
  const afterTool = async (sessionID: Session.ID, run: ChatMiddlewareContext, info: AfterToolCallInfo) => {
    const name = toOpencodeName(info.toolName)
    const args = inputs.get(info.toolCallId) ?? parseArguments(info.toolCall.function.arguments)
    inputs.delete(info.toolCallId)
    const base = {
      tool: name,
      sessionID,
      agent: await agentOf(sessionID, run),
      messageID: messageOf(run, info.toolCallId),
      id: Tool.CallID.make(info.toolCallId),
      input: isRecord(args) ? toOpencodeInput(info.toolName, args) : args,
    }
    if (!info.ok) {
      const message = info.error instanceof Error ? info.error.message : String(info.error)
      const failed: PluginHooks.Domains["tool"]["execute.after"] = {
        ...base,
        status: "error",
        error: new Tool.Error({ message }),
      }
      await Effect.runPromise(hooks.trigger("tool", "execute.after", failed))
      if (failed.error.message === message) return undefined
      return { type: "replaceResult" as const, result: { error: failed.error.message } }
    }
    const text = typeof info.result === "string" ? info.result : JSON.stringify(info.result ?? null)
    const opencode = toOpencodeResult({ name: info.toolName, input: isRecord(args) ? args : {}, result: text })
    const completed: PluginHooks.Domains["tool"]["execute.after"] = {
      ...base,
      status: "completed",
      result: { content: opencode.content, metadata: opencode.metadata },
    }
    const before = JSON.stringify(completed.result)
    await Effect.runPromise(hooks.trigger("tool", "execute.after", completed))
    if (JSON.stringify(completed.result) === before) return undefined
    return { type: "replaceResult" as const, result: modelResult(completed.result) }
  }

  const tools = definePlugin({
    name: "opencode/tool-hooks",
    setup: (ctx) => {
      const sessionID = Session.ID.make(ctx.session.threadId)
      const middleware: ChatMiddleware = {
        name: "opencode/tool-hooks",
        onBeforeToolCall: (run, hook) => beforeTool(sessionID, run, hook),
        onAfterToolCall: (run, info) => afterTool(sessionID, run, info),
      }
      return { middleware: [middleware], agentMiddleware: [middleware] }
    },
  })

  /**
   * `permission.evaluate` for a harness tool call, before the `permissions()` plugin checks it. The hook gets the
   * decision of the shared rules, `allow` or `ask`. A rule that denies the call ends it before the hook, as on the
   * opencode runtime. The hook can deny the call, or allow a call that would ask. It cannot make an allowed call ask:
   * the harness asks only for a call that its rules ask for.
   */
  const permissions = definePlugin({
    name: "opencode/permission-evaluate",
    setup: (ctx) => {
      const sessionID = Session.ID.make(ctx.session.threadId)
      const middleware: ChatMiddleware = {
        name: "opencode/permission-evaluate",
        onBeforeToolCall: async (run, hook) => {
          // `permissions()` comes after this plugin, so its decision is read when the call runs.
          const decide = ctx.getOptional(PermissionDecisionCapability)
          const resources = callResources(ctx.collect(PermissionResources), hook.toolName, hook.args)
          if (decide === undefined || resources === "invalid") return undefined
          const decision = decide(hook.toolName, "default", resources)
          if (decision === "deny") return undefined
          const event: PluginHooks.Domains["permission"]["evaluate"] = {
            sessionID,
            agent: await agentOf(sessionID, run),
            action: permissionAction(hook.toolName),
            resources: [
              ...(resources?.paths ?? []).map((file) => permissionPath(options.root, file)),
              ...(resources?.commands ?? []),
            ],
            source: { type: "tool", messageID: messageOf(run, hook.toolCallId), id: hook.toolCallId },
            effect: decision,
          }
          await Effect.runPromise(hooks.trigger("permission", "evaluate", event))
          if (event.effect === "deny")
            return { type: "skip" as const, result: { error: event.message ?? "A plugin denied this tool call." } }
          const isAllowedNow = decision === "ask" && event.effect === "allow"
          if (!isAllowedNow) return undefined
          // A decision ends the `onBeforeToolCall` chain, so `permissions()` does not ask. `tool.execute.before` is
          // later in that chain, so it runs here.
          return (await beforeTool(sessionID, run, hook)) ?? { type: "transformArgs" as const, args: hook.args }
        },
      }
      return { middleware: [middleware], agentMiddleware: [middleware] }
    },
  })

  const shell = definePlugin({
    name: "opencode/shell-hooks",
    setup: () => ({
      prepareTools: ({ tools }) => tools.map((tool) => (tool.name === "bash" ? markShell(tool, shellCalls) : tool)),
    }),
  })

  /**
   * `base` with `shell.create.before` for each command of a `bash` call. The hook can change the command, the
   * folder, the timeout, and the environment. The harness adds the environment to the environment of this process,
   * so a variable that the hook deletes stays set, and the shell stays the shell of the backend.
   */
  const backend = (base: WorkspaceBackend, root: string) => {
    const shellOf = base.shell ?? (process.platform === "win32" ? "cmd" : "sh")
    const before = (
      command: string,
      cwd: string | undefined,
      timeoutMs: number | undefined,
      env: Record<string, string> | undefined,
    ) =>
      Effect.runPromise(
        hooks.trigger("shell", "create.before", {
          command,
          cwd: cwd ?? root,
          timeout: timeoutMs ?? 0,
          shell: shellOf,
          env: { ...process.env, ...env },
        } satisfies ShellCreateBefore),
      )
    const exec: WorkspaceBackend["exec"] = async (command, options) => {
      if (shellCalls.getStore() === undefined) return base.exec(command, options)
      const event = await before(command, options?.cwd, options?.timeoutMs, options?.env)
      return base.exec(event.command, {
        ...options,
        cwd: event.cwd,
        env: addedEnv(event.env, options?.env),
        // A timeout of 0 turns the timeout off on the opencode runtime. The harness then keeps its own timeout.
        ...(event.timeout > 0 ? { timeoutMs: event.timeout } : {}),
      })
    }
    const spawn = base.spawn
    if (spawn === undefined) return { ...base, exec }
    return {
      ...base,
      exec,
      spawn: (command: string, options?: { cwd?: string; env?: Record<string, string> }) => {
        if (shellCalls.getStore() === undefined) return spawn(command, options)
        // `spawn` gives the job at once, and the hook is async: the job starts when the hook ends.
        const started = before(command, options?.cwd, undefined, options?.env).then((event) =>
          spawn(event.command, { cwd: event.cwd, env: addedEnv(event.env, options?.env) }),
        )
        const state: { job?: ReturnType<typeof spawn>; killed: boolean } = { killed: false }
        void started.then(
          (job) => {
            state.job = job
            if (state.killed) job.kill()
          },
          () => undefined,
        )
        return {
          wait: async () => (await started).wait(),
          kill: () => {
            state.killed = true
            state.job?.kill()
          },
          output: () => state.job?.output() ?? "",
        }
      },
    } satisfies WorkspaceBackend
  }

  /**
   * `turn.onModelError` with `session.retry`. The hook gets the decision of `retryTransientErrors()` and can change
   * it. Without a hook for the model's provider, it is `retryTransientErrors()`.
   */
  const onModelError = async (ctx: ModelErrorContext) => {
    const sessionID = Session.ID.make(ctx.session.threadId)
    const session = await sessionOf(sessionID)
    const model = session.model ?? options.model
    const isHooked =
      model !== undefined && (await Effect.runPromise(hooks.has("session", "retry", model.providerID)))
    if (!isHooked || ctx.retries >= MAX_RETRIES) return fallback(ctx)
    const delay = ctx.error.retryAfterMs ?? Math.round(BASE_DELAY_MS * 2 ** ctx.retries * (0.75 + Math.random() * 0.25))
    const isRetried =
      isTransientModelError(ctx.error) &&
      (ctx.error.retryAfterMs === undefined || ctx.error.retryAfterMs <= MAX_RETRY_AFTER_MS)
    const event = await Effect.runPromise(
      hooks.trigger("session", "retry", {
        sessionID,
        agent: session.agent ?? options.agent,
        model,
        error: sessionError(ctx.error),
        // The opencode runtime counts the failed call as attempt 1, so its first retry is attempt 2.
        attempt: ctx.retries + 2,
        decision: isRetried ? { retry: true, delay } : { retry: false },
      }),
    )
    if (!event.decision.retry) return undefined
    const wanted = event.decision.delay
    await wait(Number.isFinite(wanted) && wanted >= 0 ? Math.ceil(wanted) : delay, ctx.signal)
    if (ctx.signal.aborted) return undefined
    return ctx.partial ? ("continue" as const) : ("retry" as const)
  }

  // Only the hooks of plugins that are not built in. The built-in plugins use the `session.*` request hooks to shape
  // opencode's own system prompt and tools by opencode tool names. The harness builds its prompt and tools itself.
  const external = <A, E>(effect: Effect.Effect<A, E>) =>
    Effect.runPromise(effect.pipe(Effect.provideService(PluginHooks.ExternalOnly, true)))
  const isHooked = (name: "context" | "compaction" | "title", model: Model.Ref) =>
    external(hooks.has("session", name, model.providerID))
  // The session of a compaction that runs. Its summary model call runs inside the `onConfig` of the compaction.
  const compacting = new AsyncLocalStorage<Session.ID>()

  /**
   * `session.context` before each model call of a session and of its agent runs. The hook sees the request with
   * opencode names: the system prompts, the messages, the provider options, and the tools. Its changes apply to that
   * model call only.
   */
  const context = definePlugin({
    name: "opencode/session-context",
    setup: (ctx) => {
      const sessionID = Session.ID.make(ctx.session.threadId)
      // The system prompts of a run before the hook changed them. A run keeps the changed prompts between its model
      // calls, so the next call starts again from the prompts before the change.
      const bases = new WeakMap<ChatMiddlewareContext, { readonly base: Array<SystemPrompt>; readonly applied: string }>()
      const middleware: ChatMiddleware = {
        name: "opencode/session-context",
        onConfig: async (run, config) => {
          const model = options.resolve(run.model)?.ref
          if (run.phase !== "beforeModel" || model === undefined || !(await isHooked("context", model))) return undefined
          const prior = bases.get(run)
          const isApplied = prior !== undefined && JSON.stringify(config.systemPrompts) === prior.applied
          const base = isApplied ? prior.base : config.systemPrompts
          const request = requestView({
            systemPrompts: base,
            messages: config.providerMessages ?? config.messages,
            modelOptions: config.modelOptions,
          })
          const tools = toolView(config.tools)
          const event: PluginHooks.Domains["session"]["context"] = {
            ...request.event,
            sessionID,
            agent: await agentOf(sessionID, run),
            model,
            tools: tools.definitions,
          }
          await external(hooks.trigger("session", "context", event))
          const changed = request.read(event)
          const hookedTools = tools.read(event.tools)
          bases.set(run, { base, applied: JSON.stringify(changed.systemPrompts) })
          return {
            systemPrompts: changed.systemPrompts,
            ...(changed.messages ? { providerMessages: changed.messages } : {}),
            ...(changed.modelOptions ? { modelOptions: changed.modelOptions } : {}),
            ...(hookedTools ? { tools: hookedTools } : {}),
          }
        },
      }
      return { middleware: [middleware], agentMiddleware: [middleware] }
    },
  })

  /**
   * `adapter` with a `session.title` or `session.compaction` hook before each model call. The hook sees the request
   * with opencode names and can change it. A `result` that the hook sets is the answer, and no model call runs.
   */
  const hookedAdapter = (
    adapter: AnyTextAdapter,
    kind: "title" | "compaction",
    sessionOf: () => Session.ID | undefined,
  ) => {
    async function* chatStream(request: TextOptions) {
      const sessionID = sessionOf()
      const model = options.resolve(adapter.model)?.ref
      if (sessionID === undefined || model === undefined || !(await isHooked(kind, model)))
        return yield* adapter.chatStream(request)
      const view = requestView(request)
      if (kind === "title") {
        const event: PluginHooks.Domains["session"]["title"] = { ...view.event, sessionID, model }
        await external(hooks.trigger("session", "title", event))
        if (event.result !== undefined) return yield* answer(adapter.model, request, event.result)
        return yield* adapter.chatStream(withRequest(request, view.read(event)))
      }
      const event: PluginHooks.Domains["session"]["compaction"] = {
        ...view.event,
        sessionID,
        agent: await agentOf(sessionID, {}),
        model,
        tools: {},
      }
      await external(hooks.trigger("session", "compaction", event))
      if (event.result !== undefined) return yield* answer(adapter.model, request, event.result.summary)
      return yield* adapter.chatStream(withRequest(request, view.read(event)))
    }
    return new Proxy(adapter, {
      get: (target, key) => {
        if (key === "chatStream") return chatStream
        const value = target[key as keyof AnyTextAdapter]
        // Bound, so an adapter with private fields still reads them.
        return typeof value === "function" ? value.bind(target) : value
      },
    })
  }

  /** The harness `title()` plugin, with `session.title` on its model call. */
  const titlePlugin = (adapter: AnyTextAdapter) =>
    definePlugin({
      name: "tanstack/title",
      setup: (ctx) => {
        const sessionID = Session.ID.make(ctx.session.threadId)
        return title({ adapter: hookedAdapter(adapter, "title", () => sessionID) }).setup?.(ctx)
      },
    })

  /**
   * The compaction middleware, run with the session of each run, so that the summary model call of `summaryAdapter`
   * runs `session.compaction` for that session.
   */
  const compaction = (middleware: ChatMiddleware) => {
    const onConfig = middleware.onConfig
    const onFinish = middleware.onFinish
    const scoped: ChatMiddleware = {
      ...middleware,
      onConfig: (run, config) =>
        onConfig && compacting.run(Session.ID.make(run.threadId), () => onConfig(run, config)),
      onFinish: (run, info) => onFinish && compacting.run(Session.ID.make(run.threadId), () => onFinish(run, info)),
    }
    return scoped
  }

  /** The adapter of the compaction summaries, with `session.compaction`. Use it with `compaction`. */
  const summaryAdapter = (adapter: AnyTextAdapter) => hookedAdapter(adapter, "compaction", () => compacting.getStore())

  return {
    requests,
    network,
    permissions,
    shell,
    backend,
    tools,
    onModelError,
    context,
    title: titlePlugin,
    compaction,
    summaryAdapter,
  }
})

/** opencode's `Plugin` service, as the original layer builds it. The TanStack layer wraps it. */
const originalPlugin = Plugin.node.mapLayer((implementation) => implementation)

/**
 * opencode's `Plugin` service, where a plugin that is not built in fails to load when it registers an `aisdk.sdk`
 * or `aisdk.language` hook. The TanStack runtime has no Vercel AI SDK, so these hooks would never run (D10). The
 * built-in provider plugins keep their hooks: they only serve the opencode runtime.
 *
 * The other hooks of a plugin that is not built in are `external` (`PluginHooks.CurrentOrigin`), so the harness runs
 * its `session.context`, `session.compaction`, and `session.title` hooks, and not the ones of the built-in plugins.
 *
 * @example
 * Plugin.node.replace(TanStackPluginCompat.pluginNode)
 */
export const pluginNode = makeLocationNode({
  service: Plugin.Service,
  layer: Layer.effect(
    Plugin.Service,
    Effect.gen(function* () {
      const base = yield* Plugin.Service
      return Plugin.Service.of({
        ...base,
        activate: (plugins, failures) => base.activate(plugins.map(withTanStackHooks), failures),
      })
    }),
  ),
  deps: [originalPlugin],
})

/** The error of a plugin that registers an `aisdk` hook on the TanStack runtime. */
export function unsupportedHookMessage(pluginID: string, hook: string) {
  return `Plugin ${pluginID} uses the ${hook} hook. The TanStack runtime has no Vercel AI SDK, so it does not run aisdk hooks. Remove the hook from the plugin.`
}

/** A plugin that is not built in: its `aisdk` hooks fail to load, and its other hooks are `external`. */
function withTanStackHooks(plugin: Plugin.Generation) {
  const isBuiltIn = plugin.source === undefined || plugin.source.type === "builtin"
  if (isBuiltIn) return plugin
  return {
    ...plugin,
    effect: (context: Parameters<Plugin.Generation["effect"]>[0]) =>
      plugin
        .effect({
          ...context,
          aisdk: { hook: (name) => Effect.die(new Error(unsupportedHookMessage(plugin.id, `aisdk.${name}`))) },
        })
        .pipe(Effect.provideService(PluginHooks.CurrentOrigin, "external")),
  }
}

/**
 * The headers that the opencode runtime sends with each model request (`session/model-request.ts`). OpenCode Zen and
 * Go route on them, and providers use the affinity for their prompt cache.
 */
function sessionHeaders(session: Session.Info, app: App.Info) {
  const affinity = SessionAffinity.get(session)
  return {
    "x-opencode-session-id": session.id,
    ...(session.parentID ? { "x-opencode-parent-session-id": session.parentID } : {}),
    "x-session-affinity": affinity,
    "X-Session-Id": affinity,
    ...(session.parentID ? { "x-parent-session-id": session.parentID } : {}),
    "User-Agent": App.useragent(app),
    "x-opencode-project": session.projectID,
    "x-opencode-session": affinity,
    "x-opencode-client": app.name,
  }
}

/**
 * The headers of a request, with the session headers after `session.model.request`. A header that the hook changed
 * or added replaces the header of the request. A session header that the hook kept is added only when the request
 * does not set it. A session header that the hook deleted is not added.
 */
function withHeaders(
  input: Parameters<typeof fetch>[0],
  init: Parameters<typeof fetch>[1],
  session: Record<string, string>,
  hooked: Record<string, string>,
) {
  const headers = new Headers(input instanceof Request ? input.headers : undefined)
  new Headers(init?.headers).forEach((value, key) => headers.set(key, value))
  for (const [key, value] of Object.entries(hooked)) {
    const isChanged = session[key] !== value
    if (isChanged || !headers.has(key)) headers.set(key, value)
  }
  return headers
}

/** `input` sent to `to` instead of `from`, when `session.model.request` changed the base URL. */
function rebase(input: Parameters<typeof fetch>[0], from: string | undefined, to: string | undefined) {
  if (from === undefined || to === undefined || from === to) return input
  const url = input instanceof Request ? input.url : String(input)
  const prefix = from.replace(/\/+$/, "")
  if (!url.startsWith(prefix)) return input
  const target = `${to.replace(/\/+$/, "")}${url.slice(prefix.length)}`
  return input instanceof Request ? new Request(target, input) : target
}

/** A path as opencode's file tools name it in a permission: relative to the location, else absolute. */
function permissionPath(root: string, file: string) {
  const absolute = path.resolve(root, file)
  const resource = FSUtil.contains(root, absolute) ? path.relative(root, absolute) || "." : absolute
  return resource.replaceAll("\\", "/")
}

/** The opencode message id of a call. The harness message id is not the opencode one, so it is made from it. */
function messageOf(run: Pick<ChatMiddlewareContext, "currentMessageId">, toolCallId: string) {
  return SessionMessage.ID.make(`msg_${run.currentMessageId ?? toolCallId}`)
}

/**
 * The harness input after `tool.execute.before`. opencode's input repair drops the fields that the opencode tool
 * does not declare, such as `background` of `bash`. The harness tool still needs them, so they keep their value.
 */
function harnessArgs(name: string, before: unknown, after: unknown, declared: ReadonlySet<string> | undefined) {
  if (!isRecord(after)) return after
  const kept =
    isRecord(before) && declared !== undefined
      ? Object.fromEntries(Object.entries(before).filter(([key]) => !declared.has(key) && !Object.hasOwn(after, key)))
      : {}
  return toHarnessInput(name, { ...kept, ...after })
}

const decodeJson = Schema.decodeUnknownOption(Schema.fromJsonString(Schema.Unknown))

/** The arguments of a tool call, as the model sent them. */
function parseArguments(text: string) {
  return Option.getOrElse(decodeJson(text), () => text)
}

/**
 * What a call touches, as the tool plugins tell `permissions()`. `undefined` for a tool that declares nothing.
 * `"invalid"` when the input does not give its resources: `permissions()` then refuses the call.
 */
function callResources(declared: ReadonlyArray<Readonly<Record<string, ToolResources>>>, tool: string, input: unknown) {
  const entry = declared.findLast((item) => Object.hasOwn(item, tool))?.[tool]
  if (entry === undefined) return undefined
  const read = Result.try(() => ({ paths: entry.paths?.(input) ?? [], commands: entry.commands?.(input) ?? [] }))
  return Result.isSuccess(read) ? read.success : "invalid"
}

/** The environment that `exec` adds: the variables that the hook added or changed, and the ones the tool set. */
function addedEnv(env: Record<string, string | undefined>, given: Record<string, string> | undefined) {
  return Object.fromEntries(
    Object.entries(env).flatMap(([key, value]) =>
      value !== undefined && (process.env[key] !== value || (given !== undefined && Object.hasOwn(given, key)))
        ? [[key, value]]
        : [],
    ),
  )
}

/** A `bash` tool whose calls run inside `calls`. */
function markShell(tool: AnyTool, calls: AsyncLocalStorage<true>) {
  const execute = tool.execute
  if (execute === undefined) return tool
  return { ...tool, execute: (...args: Parameters<typeof execute>) => calls.run(true, () => execute(...args)) }
}

/** The opencode session error of a harness model error. */
function sessionError(error: ModelErrorContext["error"]) {
  const status = /^(\d{3})\b/.exec(error.code ?? error.message)?.[1]
  const code = status === undefined ? undefined : Number(status)
  const isStatus = code !== undefined && code >= 100 && code <= 599
  return { type: "provider.unknown", message: error.message, ...(isStatus ? { status: code } : {}) }
}

/** Resolves after `ms`, or at once when `signal` aborts. */
function wait(ms: number, signal: AbortSignal) {
  return new Promise<void>((resolve) => {
    if (signal.aborted) return resolve()
    const done = () => {
      clearTimeout(timer)
      resolve()
    }
    const timer = setTimeout(done, ms)
    signal.addEventListener("abort", done, { once: true })
  })
}

type RequestInput = {
  readonly systemPrompts?: ReadonlyArray<SystemPrompt> | undefined
  readonly messages: ReadonlyArray<ModelMessage>
  readonly modelOptions?: Record<string, unknown> | undefined
}

/**
 * The opencode view of a harness model request, for a `session.*` request hook, and `read` to take the changes of the
 * hook back. A system prompt or a message that the hook kept stays the harness one. `read` gives `undefined` for the
 * messages and the options when the hook did not change them.
 */
function requestView(request: RequestInput) {
  const prompts = new Map(
    (request.systemPrompts ?? []).map((prompt) => [SystemPart.make(promptText(prompt)), prompt] as const),
  )
  // The harness tool name of each call, for the tool results after it.
  const names = new Map<string, string>()
  const messages = new Map(
    request.messages.map((message) => {
      const converted = opencodeMessage(message, names)
      return [converted, { message, json: JSON.stringify(converted) }] as const
    }),
  )
  const options = JSON.stringify(request.modelOptions ?? {})
  return {
    // The hooks get the provider options: the harness request has no generation options.
    event: { system: [...prompts.keys()], messages: [...messages.keys()], options: { ...request.modelOptions } },
    read: (event: SessionRequest) => {
      const kept = (message: Message) => {
        const entry = messages.get(message)
        return entry !== undefined && JSON.stringify(message) === entry.json ? entry.message : undefined
      }
      const isSameMessages =
        event.messages.length === request.messages.length &&
        event.messages.every((message, index) => kept(message) === request.messages[index])
      return {
        systemPrompts: event.system.map((part) => {
          const prompt = prompts.get(part)
          return prompt !== undefined && promptText(prompt) === part.text ? prompt : part.text
        }),
        messages: isSameMessages
          ? undefined
          : event.messages.flatMap((message) => {
              const original = kept(message)
              return original === undefined ? modelMessages(message) : [original]
            }),
        modelOptions: JSON.stringify(event.options) === options ? undefined : { ...event.options },
      }
    },
  }
}

/** The tools of a model call by opencode name, for `session.context`, and `read` to take the changes back. */
function toolView(tools: ChatMiddlewareConfig["tools"]) {
  const entries = tools.map((tool) => ({
    tool,
    definition: { description: tool.description, input: inputSchema(tool.inputSchema) },
  }))
  const byDefinition = new Map(entries.map((entry) => [entry.definition, entry] as const))
  const byName = new Map(entries.map((entry) => [entry.tool.name, entry] as const))
  return {
    definitions: Object.fromEntries(entries.map((entry) => [toOpencodeName(entry.tool.name), entry.definition])),
    /**
     * The tools after the hook: a tool that the hook removed is left out, and a tool that it renamed or described
     * again is a copy with the new name or description. `undefined` when nothing changed.
     */
    read: (hooked: SessionContext["tools"]) => {
      const next = Object.entries(hooked).flatMap(([name, definition]) => {
        // As on the opencode runtime: the definition object first, so a hook can rename a tool by moving it.
        const entry = byDefinition.get(definition) ?? byName.get(toHarnessName(name))
        if (entry === undefined) return []
        const harnessName = toHarnessName(name)
        const isInputChanged = JSON.stringify(definition.input) !== JSON.stringify(entry.definition.input)
        const isSame =
          harnessName === entry.tool.name && definition.description === entry.tool.description && !isInputChanged
        if (isSame) return [entry.tool]
        return [
          {
            ...entry.tool,
            name: harnessName,
            description: definition.description,
            ...(isInputChanged ? { inputSchema: definition.input } : {}),
          },
        ]
      })
      const isSame = next.length === tools.length && next.every((tool, index) => tool === tools[index])
      return isSame ? undefined : next
    },
  }
}

/** The JSON Schema of a tool input, as opencode gives it to the hooks. */
function inputSchema(schema: ChatMiddlewareConfig["tools"][number]["inputSchema"]) {
  return { ...(convertSchemaToJsonSchema(schema) ?? { type: "object", properties: {} }) } satisfies JsonSchema.JsonSchema
}

function promptText(prompt: SystemPrompt) {
  return typeof prompt === "string" ? prompt : prompt.content
}

/** `request` with the changes that a hook made. */
function withRequest(request: TextOptions, changed: ReturnType<ReturnType<typeof requestView>["read"]>) {
  return {
    ...request,
    systemPrompts: changed.systemPrompts,
    ...(changed.messages ? { messages: changed.messages } : {}),
    ...(changed.modelOptions ? { modelOptions: changed.modelOptions } : {}),
  }
}

/** A harness message as an opencode message, with opencode tool names and inputs. */
function opencodeMessage(message: ModelMessage, names: Map<string, string>) {
  switch (message.role) {
    case "user":
      return Message.user(opencodeParts(message.content))
    case "assistant": {
      const calls = message.toolCalls ?? []
      calls.forEach((call) => names.set(call.id, call.function.name))
      return Message.assistant([
        ...(message.thinking ?? []).map((thinking) => ({
          type: "reasoning" as const,
          text: thinking.content,
          ...(thinking.signature === undefined ? {} : { encrypted: thinking.signature }),
        })),
        ...opencodeParts(message.content).filter((part) => part.type === "text"),
        ...calls.map((call) => {
          const input = parseArguments(call.function.arguments)
          return ToolCallPart.make({
            id: call.id,
            name: toOpencodeName(call.function.name),
            input: isRecord(input) ? toOpencodeInput(call.function.name, input) : input,
          })
        }),
      ])
    }
    case "tool": {
      const id = message.toolCallId ?? ""
      return Message.tool({
        id,
        name: toOpencodeName(names.get(id) ?? ""),
        result: harnessText(message.content),
        resultType: message.error === undefined ? "text" : "error",
      })
    }
  }
}

/** The opencode parts of harness content: text, and media with inline data or a URL. */
function opencodeParts(content: ModelMessage["content"]) {
  if (content === null) return []
  if (typeof content === "string") return content === "" ? [] : [Message.text(content)]
  return content.flatMap((part) => {
    if (part.type === "text") return [Message.text(part.content)]
    const source = part.source
    if (source.type === "data")
      return [
        Message.media(new Media.Asset({ source: { type: "base64", data: source.value, mediaType: source.mimeType } })),
      ]
    if (source.type === "url")
      return [
        Message.media(
          new Media.Asset({
            source: { type: "url", url: source.value, ...(source.mimeType ? { mediaType: source.mimeType } : {}) },
          }),
        ),
      ]
    return []
  })
}

/**
 * An opencode message that a hook added or changed, as harness messages. The harness keeps no system message in the
 * history, so a system message goes to the model as a user message.
 */
function modelMessages(message: Message) {
  const text = message.content.flatMap((part) => (part.type === "text" ? [part.text] : [])).join("\n")
  switch (message.role) {
    case "system":
      return [{ role: "user", content: text }] satisfies Array<ModelMessage>
    case "user":
      return [{ role: "user", content: message.content.flatMap(harnessPart) }] satisfies Array<ModelMessage>
    case "assistant": {
      const toolCalls = message.content.flatMap((part) => {
        if (part.type !== "tool-call") return []
        const name = toHarnessName(part.name)
        const input = isRecord(part.input) ? toHarnessInput(name, part.input) : (part.input ?? {})
        return [{ id: part.id, type: "function" as const, function: { name, arguments: JSON.stringify(input) } }]
      })
      const thinking = message.content.flatMap((part) =>
        part.type === "reasoning"
          ? [{ content: part.text, ...(part.encrypted === undefined ? {} : { signature: part.encrypted }) }]
          : [],
      )
      return [
        {
          role: "assistant",
          content: text === "" ? null : text,
          ...(toolCalls.length > 0 ? { toolCalls } : {}),
          ...(thinking.length > 0 ? { thinking } : {}),
        },
      ] satisfies Array<ModelMessage>
    }
    case "tool":
      return message.content.flatMap((part) =>
        part.type === "tool-result"
          ? ([{ role: "tool", toolCallId: part.id, content: resultText(part.result) }] satisfies Array<ModelMessage>)
          : [],
      )
  }
}

/** A harness content part for an opencode part: text, or media with inline data or a URL. */
function harnessPart(part: Message["content"][number]) {
  const parts: Array<ContentPart> = []
  if (part.type === "text") parts.push({ type: "text", content: part.text })
  const source = part.type === "media" ? mediaSource(part.media) : undefined
  if (part.type !== "media" || source === undefined) return parts
  switch (part.media.kind) {
    case "image":
      parts.push({ type: "image", source })
      break
    case "audio":
      parts.push({ type: "audio", source })
      break
    case "video":
      parts.push({ type: "video", source })
      break
    case "document":
    case "other":
      parts.push({ type: "document", source })
  }
  return parts
}

/** The harness source of an opencode media asset: inline data or a URL. `undefined` for a provider reference. */
function mediaSource(asset: Media.Asset) {
  switch (asset.source.type) {
    case "base64":
      return { type: "data" as const, value: asset.source.data, mimeType: asset.mediaType }
    case "bytes":
      return { type: "data" as const, value: Buffer.from(asset.source.data).toString("base64"), mimeType: asset.mediaType }
    case "url":
      return { type: "url" as const, value: asset.source.url, mimeType: asset.mediaType }
    case "ref":
      return undefined
  }
}

/** The text of harness content. */
function harnessText(content: ModelMessage["content"]) {
  if (content === null) return ""
  if (typeof content === "string") return content
  return content.flatMap((part) => (part.type === "text" ? [part.content] : [])).join("\n")
}

/** The text that the model gets for an opencode tool result. */
function resultText(result: ToolResultValue) {
  if (result.type === "content")
    return result.value.flatMap((part) => (part.type === "text" ? [part.text] : [])).join("\n")
  return typeof result.value === "string" ? result.value : JSON.stringify(result.value ?? null)
}

/** The stream of a model call whose answer a hook gave: one text message. */
async function* answer(model: string, request: TextOptions, text: string) {
  const runId = request.runId ?? crypto.randomUUID()
  const threadId = request.threadId ?? runId
  const messageId = crypto.randomUUID()
  const timestamp = Date.now()
  yield { type: EventType.RUN_STARTED, runId, threadId, model, timestamp } satisfies AdapterYieldChunk
  yield {
    type: EventType.TEXT_MESSAGE_START,
    messageId,
    role: "assistant",
    model,
    timestamp,
  } satisfies AdapterYieldChunk
  yield { type: EventType.TEXT_MESSAGE_CONTENT, messageId, delta: text, model, timestamp } satisfies AdapterYieldChunk
  yield { type: EventType.TEXT_MESSAGE_END, messageId, model, timestamp } satisfies AdapterYieldChunk
  yield {
    type: EventType.RUN_FINISHED,
    runId,
    threadId,
    model,
    timestamp,
    finishReason: "stop",
  } satisfies AdapterYieldChunk
}
