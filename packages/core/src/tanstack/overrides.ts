export * as TanStackOverrides from "./overrides.js"

import {
  AIError,
  InvalidProviderOutputError,
  InvalidRequestError,
  LLMClient,
  LLMEvent,
  LLMResponse,
  UnsupportedOperationError,
} from "@opencode/ai"
import type { FinishReasonDetails, LanguageModel, LLMClientShape, LLMRequest, Message } from "@opencode/ai"
import { makeGlobalNode, makeLocationNode } from "@opencode/util/effect/app-node"
import type { LayerNode } from "@opencode/util/effect/layer-node"
import { chat, EventType, fromSpecTokenUsage } from "@tanstack/ai"
import type { StreamChunk } from "@tanstack/ai"
import { Context, Effect, Layer, Stream } from "effect"
import { llmClient } from "../effect/app-node-platform.js"
import { Form } from "../form.js"
import { Instance } from "../instance.js"
import { Integration } from "../integration.js"
import { Job } from "../job.js"
import { Model } from "../model.js"
import { ModelResolver } from "../model-resolver.js"
import { Permission } from "../permission.js"
import { Plugin } from "../plugin.js"
import { PermissionSaved } from "../permission/saved.js"
import { Provider } from "../provider.js"
import { Session } from "../session.js"
import { SessionExecution } from "../session/execution.js"
import { TanStackAdapters } from "./adapters.js"
import { TanStackForm } from "./form-layer.js"
import { TanStackHarness } from "./harness.js"
import { TanStackHost } from "./host.js"
import { TanStackJob } from "./job-layer.js"
import { TanStackPermission } from "./permission-layer.js"
import { TanStackPluginCompat } from "./plugin-compat.js"
import { TanStackRecovery } from "./recovery.js"
import { TanStackSession } from "./session-layer.js"

type Adapter = Effect.Success<ReturnType<typeof TanStackAdapters.adapterFor>>

/**
 * The TanStack adapter of each model that opencode resolved, by its `LanguageModel`. The value builds the adapter
 * when a request needs it, with the services of the location that resolved the model.
 */
export class Adapters extends Context.Service<Adapters, WeakMap<LanguageModel, Effect.Effect<Adapter, AIError>>>()(
  "@opencode/TanStackOverrides/Adapters",
) {}

const adaptersNode = makeGlobalNode({ service: Adapters, layer: Layer.sync(Adapters, () => new WeakMap()), deps: [] })

/** opencode's own `ModelResolver` layer, with its dependencies. The TanStack resolver decorates it. */
const originalResolver = ModelResolver.node.mapLayer((implementation) => implementation)

/**
 * opencode's `ModelResolver`, which also keeps the TanStack adapter of each model that it resolves in `Adapters`.
 * An `LLMRequest` names only the resolved `LanguageModel`, so the TanStack `LLMClient` finds its adapter there.
 */
const resolverNode = makeLocationNode({
  service: ModelResolver.Service,
  layer: Layer.effect(
    ModelResolver.Service,
    Effect.gen(function* () {
      const base = yield* ModelResolver.Service
      const models = yield* Model.Service
      const providers = yield* Provider.Service
      const integrations = yield* Integration.Service
      const adapters = yield* Adapters
      const adapterOf = (ref: Model.Ref) =>
        Effect.gen(function* () {
          const info = yield* models.get(ref.providerID, ref.id)
          if (!info) return yield* invalidRequest(`Model unavailable: ${ref.providerID}/${ref.id}`)
          const provider = yield* providers.get(info.providerID)
          const connection = yield* integrations.connection.active(
            provider?.integrationID ?? Integration.ID.make(info.providerID),
          )
          const credential = connection ? yield* integrations.connection.resolve(connection) : undefined
          return yield* TanStackAdapters.adapterFor({ model: info, variant: ref.variant, provider, credential })
        }).pipe(
          Effect.mapError((error) =>
            error instanceof AIError
              ? error
              : error instanceof TanStackAdapters.UnsupportedProviderError
                ? unsupported("tanstack.adapter", error.message)
                : invalidRequest(error.message),
          ),
        )
      const remember = (resolved: ModelResolver.Resolved) => {
        adapters.set(resolved.model, adapterOf(resolved.ref))
        return resolved
      }
      return ModelResolver.Service.of({
        resolve: (requested) =>
          base.resolve(requested).pipe(Effect.map((resolved) => (resolved ? remember(resolved) : resolved))),
        resolveModel: (model, variant) => base.resolveModel(model, variant).pipe(Effect.map(remember)),
      })
    }),
  ),
  deps: [originalResolver, Model.node, Provider.node, Integration.node, adaptersNode],
})

/**
 * The `LLMClient` on TanStack AI, for the model calls outside a session turn: `Generate` (`/api/experimental/generate`)
 * and `SessionTitle`. It sends the system prompts and the text messages of the request with `chat()`, and maps the
 * TanStack chunks to `LLMEvent`s. A request with tools, or with a part that is not text, fails: the harness runs
 * the tool loop. `compact` is not supported.
 */
const clientLayer = Layer.effect(
  LLMClient.Service,
  Effect.gen(function* () {
    const adapters = yield* Adapters

    const stream: LLMClientShape["stream"] = (request) =>
      Stream.unwrap(
        Effect.gen(function* () {
          const adapter = adapters.get(request.model)
          if (adapter === undefined)
            return yield* invalidRequest(
              `The TanStack runtime has no adapter for ${request.model.provider}/${request.model.id}. Only a model that opencode resolved can send a request.`,
            )
          const resolved = yield* adapter
          const input = yield* chatInput(request)
          const controller = new AbortController()
          yield* Effect.addFinalizer(() => Effect.sync(() => controller.abort()))
          // The request's own headers, such as the `x-opencode-session` that `Generate` sets.
          const headers = request.http?.headers
          const outer = resolved.wrapFetch
          const wrapFetch =
            headers === undefined
              ? outer
              : (next: typeof fetch) => {
                  const inner = TanStackHarness.withHeaders(next, headers)
                  return outer ? outer(inner) : inner
                }
          const chunks = chat({
            adapter: resolved.adapter,
            wrapFetch,
            reasoning: resolved.reasoning,
            systemPrompts: input.system,
            messages: input.messages,
            abortController: controller,
            stream: true,
          })
          return Stream.fromAsyncIterable(chunks, (cause) => providerError(request, String(cause), cause)).pipe(
            Stream.flatMap((chunk) =>
              chunk.type === EventType.RUN_ERROR
                ? Stream.fail(providerError(request, chunk.message, chunk))
                : Stream.fromIterable(toEvents(chunk)),
            ),
          )
        }),
      )

    return LLMClient.Service.of({
      stream,
      generate: (request, options) =>
        stream(request, options).pipe(
          Stream.runCollect,
          Effect.flatMap((events) => {
            const response = LLMResponse.fromEvents(events)
            return response ? Effect.succeed(response) : Effect.fail(providerError(request, "The run did not finish."))
          }),
        ),
      compact: (request) =>
        Effect.fail(
          unsupported("compact", `${request.model.provider}/${request.model.id}: the harness compacts inside a turn.`),
        ),
    })
  }),
)

const clientNode = makeGlobalNode({ service: LLMClient.Service, layer: clientLayer, deps: [adaptersNode] })

/** The location's runtime slot on the TanStack runtime. It gives the location's `TanStackHost`, which runs the turns. */
const runtimeNode = makeLocationNode({
  name: "TanStackRuntime",
  layer: Layer.effect(
    TanStackHost.Service,
    Effect.gen(function* () {
      return yield* TanStackHost.Service
    }),
  ),
  deps: [TanStackHost.node],
})

/**
 * The node replacements of the TanStack runtime. Add them to the replacements of the app graph:
 * - `Session`, `Permission`, `PermissionSaved`, `Form`, and `Job` run on the harness.
 * - `SessionExecution` reports and controls the harness turns, and the location's runtime slot gives its
 *   `TanStackHost`.
 * - `llmClient` sends with TanStack AI, and `ModelResolver` keeps the TanStack adapter of each model it resolves.
 * - `Plugin` loads opencode's plugins with the TanStack plugin compatibility.
 *
 * @example
 * AppNodeBuilder.build(root, [...standard, ...TanStackOverrides.replacements])
 */
export const replacements: LayerNode.Replacements = [
  Session.node.replace(TanStackSession.node),
  Permission.node.replace(TanStackPermission.node),
  PermissionSaved.node.replace(TanStackPermission.savedNode),
  Form.node.replace(TanStackForm.node),
  Job.node.replace(TanStackJob.node),
  SessionExecution.node.replace(TanStackRecovery.executionNode),
  Instance.runtimeNode.replace(runtimeNode),
  ModelResolver.node.replace(resolverNode),
  llmClient.replace(clientNode),
  Plugin.node.replace(TanStackPluginCompat.pluginNode),
]

/** The system prompts and the messages of a request, as `chat()` options. */
const chatInput = Effect.fn("TanStackOverrides.chatInput")(function* (request: LLMRequest) {
  if (request.tools.length > 0)
    return yield* unsupported("tools", "The TanStack LLM client sends no tools. The harness runs the tool loop.")
  const system = request.messages.filter((message) => message.role === "system")
  const conversation = request.messages.filter((message) => message.role === "user" || message.role === "assistant")
  const isText = (message: Message) => message.content.every((part) => part.type === "text")
  const hasOther = [...system, ...conversation].some((message) => !isText(message))
  const hasTool = request.messages.some((message) => message.role === "tool")
  if (hasOther || hasTool) return yield* unsupported("content", "The TanStack LLM client sends only text messages.")
  return {
    system: [...request.system.map((part) => part.text), ...system.map(text)],
    messages: conversation.map((message) => ({
      role: message.role === "user" ? ("user" as const) : ("assistant" as const),
      content: text(message),
    })),
  }
})

function text(message: Message) {
  return message.content.flatMap((part) => (part.type === "text" ? [part.text] : [])).join("")
}

/** The `LLMEvent`s of one TanStack chunk. Other chunks, such as the run start, have no event. */
function toEvents(chunk: StreamChunk) {
  const events: LLMEvent[] = []
  switch (chunk.type) {
    case EventType.TEXT_MESSAGE_START:
      events.push(LLMEvent.textStart({ id: chunk.messageId }))
      break
    case EventType.TEXT_MESSAGE_CONTENT:
      events.push(LLMEvent.textDelta({ id: chunk.messageId, text: chunk.delta }))
      break
    case EventType.TEXT_MESSAGE_END:
      events.push(LLMEvent.textEnd({ id: chunk.messageId }))
      break
    case EventType.REASONING_MESSAGE_START:
      events.push(LLMEvent.reasoningStart({ id: chunk.messageId }))
      break
    case EventType.REASONING_MESSAGE_CONTENT:
      events.push(LLMEvent.reasoningDelta({ id: chunk.messageId, text: chunk.delta }))
      break
    case EventType.REASONING_MESSAGE_END:
      events.push(LLMEvent.reasoningEnd({ id: chunk.messageId }))
      break
    case EventType.RUN_FINISHED: {
      const raw = chunk.finishReason ?? chunk.metadata?.tanstack?.finishReason ?? undefined
      const reason: FinishReasonDetails = { normalized: raw === undefined ? "unknown" : FINISH_REASONS[raw], raw }
      const usage = usageOf(Array.isArray(chunk.usage) ? fromSpecTokenUsage(chunk.usage) : chunk.usage)
      events.push(LLMEvent.stepFinish({ index: 0, reason, usage }), LLMEvent.finish({ reason, usage }))
      break
    }
  }
  return events
}

// TanStack finish reasons, as opencode names them.
const FINISH_REASONS = {
  stop: "stop",
  length: "length",
  content_filter: "content-filter",
  tool_calls: "tool-calls",
} as const

function usageOf(usage: ReturnType<typeof fromSpecTokenUsage>) {
  if (usage === undefined) return undefined
  const cacheRead = usage.promptTokensDetails?.cachedTokens ?? 0
  const cacheWrite = usage.promptTokensDetails?.cacheWriteTokens ?? 0
  return {
    inputTokens: usage.promptTokens,
    outputTokens: usage.completionTokens,
    totalTokens: usage.totalTokens,
    nonCachedInputTokens: Math.max(0, usage.promptTokens - cacheRead - cacheWrite),
    cacheReadInputTokens: cacheRead,
    cacheWriteInputTokens: cacheWrite,
    reasoningTokens: usage.completionTokensDetails?.reasoningTokens,
  }
}

function invalidRequest(message: string) {
  return new AIError({ reason: new InvalidRequestError({ message }) })
}

function unsupported(operation: string, message: string) {
  return new AIError({ reason: new UnsupportedOperationError({ operation, message }) })
}

function providerError(request: LLMRequest, message: string, cause?: unknown) {
  return new AIError({
    reason: new InvalidProviderOutputError({ message, route: request.model.route.id, cause }),
  })
}
