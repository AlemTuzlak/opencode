export * as TanStackPluginCompat from "./plugin-compat.js"

import { AsyncLocalStorage } from "node:async_hooks"
import path from "node:path"
import { isRecord } from "@opencode/ai/utils/record"
import type { SessionModelRequest } from "@opencode/plugin/effect/session"
import type { ShellCreateBefore } from "@opencode/plugin/effect/shell"
import { makeLocationNode } from "@opencode/util/effect/app-node"
import { FSUtil } from "@opencode/util/fs-util"
import type {
  AfterToolCallInfo,
  AnyTool,
  ChatMiddleware,
  ChatMiddlewareContext,
  ContentPart,
  ToolCallHookContext,
} from "@tanstack/ai"
import { definePlugin, isTransientModelError, retryTransientErrors } from "@tanstack/ai-harness"
import type { ModelErrorContext } from "@tanstack/ai-harness"
import { PermissionDecisionCapability, PermissionResources } from "@tanstack/ai-harness/plugins"
import type { ToolResources } from "@tanstack/ai-harness/plugins"
import type { WorkspaceBackend } from "@tanstack/ai-harness/plugins/coding"
import { Effect, Layer, Option, Result, Schema } from "effect"
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
import { permissionAction, toHarnessInput, toOpencodeInput, toOpencodeName, toOpencodeResult } from "./tool-names.js"

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

  return { requests, network, permissions, shell, backend, tools, onModelError }
})

/** opencode's `Plugin` service, as the original layer builds it. The TanStack layer wraps it. */
const originalPlugin = Plugin.node.mapLayer((implementation) => implementation)

/**
 * opencode's `Plugin` service, where a plugin that is not built in fails to load when it registers an `aisdk.sdk`
 * or `aisdk.language` hook. The TanStack runtime has no Vercel AI SDK, so these hooks would never run (D10). The
 * built-in provider plugins keep their hooks: they only serve the opencode runtime.
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
        activate: (plugins, failures) => base.activate(plugins.map(withoutAISDKHooks), failures),
      })
    }),
  ),
  deps: [originalPlugin],
})

/** The error of a plugin that registers an `aisdk` hook on the TanStack runtime. */
export function unsupportedHookMessage(pluginID: string, hook: string) {
  return `Plugin ${pluginID} uses the ${hook} hook. The TanStack runtime (OPENCODE_RUNTIME=tanstack) has no Vercel AI SDK, so it does not run aisdk hooks. Remove the hook from the plugin, or run opencode without OPENCODE_RUNTIME=tanstack.`
}

function withoutAISDKHooks(plugin: Plugin.Generation) {
  const isBuiltIn = plugin.source === undefined || plugin.source.type === "builtin"
  if (isBuiltIn) return plugin
  return {
    ...plugin,
    effect: (context: Parameters<Plugin.Generation["effect"]>[0]) =>
      plugin.effect({
        ...context,
        aisdk: { hook: (name) => Effect.die(new Error(unsupportedHookMessage(plugin.id, `aisdk.${name}`))) },
      }),
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

/** The result that the model gets for an opencode tool result: its text, or its text and files. */
function modelResult(result: Tool.Result) {
  if (typeof result.content === "string") return result.content
  const content = result.content ?? []
  if (content.length === 0) return JSON.stringify(result.output ?? null)
  if (content.every((part) => part.type === "text")) return content.map((part) => part.text).join("\n")
  return content.map(contentPart)
}

function contentPart(part: Tool.Content): ContentPart {
  if (part.type === "text") return { type: "text", content: part.text }
  const data = /^data:[^,]*;base64,(.*)$/s.exec(part.uri)?.[1]
  const source = data === undefined ? { type: "url" as const, value: part.uri } : { type: "data" as const, value: data, mimeType: part.mime }
  return part.mime.startsWith("image/") ? { type: "image", source } : { type: "document", source }
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
