export * as TanStackAdapters from "./adapters.js"

import { mergeHttpOptions, mergeJsonRecords, type HttpOptions, type LanguageModel } from "@opencode/ai"
import { GoogleVertexShared } from "@opencode/ai/providers/google-vertex-shared"
import { MissingCredentialError } from "@opencode/ai/route/auth"
import { isRecord } from "@opencode/ai/utils/record"
import type { AnyTextAdapter, FetchWrapper, ModelReasoning, ReasoningLevel, ReasoningOption } from "@tanstack/ai"
import { anthropicText } from "@tanstack/ai-anthropic"
import { BedrockConverseTextAdapter } from "@tanstack/ai-bedrock"
import { createCloudflareText } from "@tanstack/ai-cloudflare"
import { GeminiTextAdapter, createGeminiChat } from "@tanstack/ai-gemini"
import { GROK_CHAT_MODELS, createGrokText } from "@tanstack/ai-grok"
import { GROQ_CHAT_MODELS, createGroqText } from "@tanstack/ai-groq"
import { createLLMGatewayText } from "@tanstack/ai-llmgateway"
import { createMistralText } from "@tanstack/ai-mistral"
import { createOllamaChat } from "@tanstack/ai-ollama"
import { azureOpenaiText, createOpenaiChat } from "@tanstack/ai-openai"
import { openaiCompatibleText } from "@tanstack/ai-openai/compatible"
import { createOpenRouterText } from "@tanstack/ai-openrouter"
import { OPENROUTER_CHAT_MODELS } from "@tanstack/ai-openrouter/model-meta"
import { VERCEL_GATEWAY_CHAT_MODELS, createVercelGatewayText } from "@tanstack/ai-vercel-gateway"
import { Effect, Schema } from "effect"
import { Headers } from "effect/unstable/http"
import { App } from "../app.js"
import type { Credential } from "../credential.js"
import { Model } from "../model.js"
import type { RuntimeInfo } from "../model.js"
import { ModelResolver } from "../model-resolver.js"
import { copilotFetch } from "../plugin/provider/github-copilot.js"
import { Provider } from "../provider.js"

/** The provider or the model has no TanStack adapter. The message names the provider and the reason. */
export class UnsupportedProviderError extends Schema.TaggedError<UnsupportedProviderError>()(
  "TanStackAdapters.UnsupportedProviderError",
  {
    providerID: Provider.ID,
    modelID: Model.ID,
    reason: Schema.String,
  },
) {
  override get message() {
    return `${this.providerID}/${this.modelID} does not work on the TanStack runtime (OPENCODE_RUNTIME=tanstack): ${this.reason}`
  }
}

export interface Input {
  /** The selected catalog model. */
  readonly model: Model.Info
  /** The selected variant. Omitted or `default` uses the model as it is. */
  readonly variant?: Model.VariantID
  /** The provider of the model, with its settings. */
  readonly provider?: Provider.Info
  /** The credential of the provider's active Integration connection. */
  readonly credential?: Credential.Value
  /** The network under the opencode request wiring. Defaults to the global `fetch`. */
  readonly fetch?: typeof fetch
}

/**
 * Builds the TanStack text adapter for an opencode model.
 *
 * `ModelResolver` resolves the settings, the headers, the body, the `${VAR}` placeholders, and the
 * credential, as for the opencode runtime. Each request of the adapter then goes through that
 * resolved route: the configured headers and body are added, and the route's auth signs it. So
 * key, OAuth, SigV4, and Google ADC credentials all come from opencode.
 *
 * The result has:
 * - `adapter`: the TanStack text adapter.
 * - `wrapFetch`: set for adapters that take no `fetch` in their config (Mistral, Ollama,
 *   OpenRouter). Pass it to `chat({ wrapFetch })` or return it from a middleware `onConfig`.
 * - `reasoning`: the selected variant as a `chat({ reasoning })` option, when it sets reasoning.
 *
 * Fails with `UnsupportedProviderError` for GitLab Duo, SAP AI Core, the ChatGPT Codex backend, and
 * other models that no TanStack adapter can serve, and with the `ModelResolver` errors.
 *
 * @example
 * const resolved = yield* TanStackAdapters.adapterFor({ model, variant, provider, credential })
 * chat({ adapter: resolved.adapter, wrapFetch: resolved.wrapFetch, reasoning: resolved.reasoning, messages })
 */
export const adapterFor = Effect.fn("TanStackAdapters.adapterFor")(function* (input: Input) {
  const selected = yield* ModelResolver.withVariant(input.model, input.variant)
  const runtime: RuntimeInfo = {
    ...selected,
    settings: Provider.mergeOverlay(input.provider?.settings, Provider.modelSettings(selected.settings)),
  }
  const rejected = unsupported(runtime, input.credential)
  if (rejected) return yield* rejected
  const resolved = yield* ModelResolver.fromCatalogModel(nativeRuntime(runtime), input.credential)
  const app = yield* App.Metadata
  const reasoning = variantReasoning(input.model, input.variant)
  const isCopilot = runtime.providerID === Provider.ID.githubCopilot
  // A provider without a credential can be enabled by ambient setup, such as a local runtime. Its
  // requests then go out without auth, as on the opencode runtime.
  const optionalAuth = input.provider?.activation === "enabled" && input.credential === undefined
  const built = build({
    runtime,
    resolved,
    credential: input.credential,
    reasoning: reasoning?.model,
    send: (fallback) => {
      const network = input.fetch ?? fallback
      return routeFetch(resolved, isCopilot ? copilot(network, app) : network, optionalAuth)
    },
  })
  if (built instanceof UnsupportedProviderError) return yield* built
  return { adapter: built.adapter, wrapFetch: built.wrapFetch, reasoning: reasoning?.option }
})

type Fetch = (input: string | URL | Request, init?: RequestInit) => Promise<Response>

interface Wire {
  readonly runtime: RuntimeInfo
  readonly resolved: LanguageModel
  readonly credential: Credential.Value | undefined
  readonly reasoning: ModelReasoning | undefined
  /** A fetch that sends through the opencode route (headers, body, auth), over `fallback` when no network was given. */
  readonly send: (fallback: Fetch) => Fetch
}

interface Built {
  readonly adapter: AnyTextAdapter
  readonly wrapFetch?: FetchWrapper
}

// SDK clients need a key to start. The route's auth replaces every auth header in `routeFetch`,
// so this value never reaches the wire.
const ROUTE_AUTH = "opencode-route-auth"
const SDK_AUTH_HEADERS = ["authorization", "x-api-key", "api-key", "x-goog-api-key"]
const CODEX_METHODS = new Set(["chatgpt-browser", "chatgpt-headless"])
const CODEX_BASE_URL = "https://chatgpt.com/backend-api/codex"
const COPILOT = Provider.aisdk("@ai-sdk/github-copilot")
const PERPLEXITY = Provider.aisdk("@ai-sdk/perplexity")

function unsupported(model: RuntimeInfo, credential: Credential.Value | undefined) {
  const reject = (reason: string) =>
    new UnsupportedProviderError({ providerID: model.providerID, modelID: model.id, reason })
  if (model.providerID === Provider.ID.gitlab) return reject("GitLab Duo has no TanStack AI adapter")
  if (model.providerID === Provider.ID.make("sap-ai-core")) return reject("SAP AI Core has no TanStack AI adapter")
  const codexCredential = credential?.type === "oauth" && CODEX_METHODS.has(credential.methodID)
  const codexURL = model.settings?.baseURL === CODEX_BASE_URL
  if (model.providerID === Provider.ID.openai && (codexCredential || codexURL))
    return reject(
      'the ChatGPT Codex backend has no TanStack AI adapter. Run /connect, choose OpenAI, and select "Sign in with ChatGPT"',
    )
  if (model.package === COPILOT || model.package === PERPLEXITY || !Provider.isAISDK(model.package)) return
  return reject(`the AI SDK package ${Provider.packageName(model.package)} has no TanStack AI adapter`)
}

// The two AI SDK packages with a TanStack adapter speak the OpenAI API, so the native OpenAI-compatible
// packages resolve their route.
function nativeRuntime(model: RuntimeInfo) {
  if (model.package === COPILOT)
    return {
      ...model,
      package:
        model.settings?.endpoint === "responses"
          ? "@opencode/ai/providers/openai-compatible/responses"
          : "@opencode/ai/providers/openai-compatible",
    }
  if (model.package === PERPLEXITY)
    return {
      ...model,
      package: "@opencode/ai/providers/openai-compatible",
      settings: { baseURL: "https://api.perplexity.ai", ...model.settings },
    }
  return model
}

// The result is typed as `Built` so that every adapter widens to `AnyTextAdapter` for the callers.
function build(wire: Wire): Built | UnsupportedProviderError {
  const model = wire.runtime
  const id = wire.resolved.id
  const baseURL = wire.resolved.route.endpoint.baseURL
  const fetch = wire.send(globalThis.fetch)
  const reject = (reason: string) =>
    new UnsupportedProviderError({ providerID: model.providerID, modelID: model.id, reason })
  // These adapters take no fetch in their config. They call `wrapFetch` with their own fetch.
  const wrap = (adapter: AnyTextAdapter): Built => ({ adapter, wrapFetch: (next) => asFetch(wire.send(next), next) })
  if (Provider.packageName(model.package) === "@opencode/ai/providers/google-vertex/messages")
    return reject("Claude on Vertex needs the @anthropic-ai/vertex-sdk package, which is not installed")
  switch (wireAPI(wire.resolved)) {
    case "messages":
      return {
        adapter: anthropicText(id, {
          apiKey: ROUTE_AUTH,
          // The Anthropic SDK adds `/v1/messages` to its base URL.
          baseURL: baseURL?.replace(/\/v1\/?$/, ""),
          fetch,
          provider: model.providerID,
          reasoning: wire.reasoning,
        }),
      }
    case "chat":
      return chatCompletions(wire, id, baseURL, fetch, wrap) ?? reject(NO_BASE_URL)
    case "responses":
      return responses(wire, id, baseURL, fetch) ?? reject(NO_BASE_URL)
    case "gemini":
      return { adapter: gemini(id, model, baseURL, fetch, wire.reasoning) }
    case "bedrock-converse":
      return bedrock(id, wire, baseURL) ?? reject(BEDROCK_PROFILE)
    default:
      return reject(`TanStack AI has no adapter for the ${wire.resolved.route.protocol} API`)
  }
}

/**
 * The wire API of a resolved route. Providers give their own protocol ids to the shared APIs (for
 * example `groq-chat`), so the endpoint path decides when it is fixed.
 */
function wireAPI(model: LanguageModel) {
  const path = model.route.endpoint.path
  if (path === "/chat/completions") return "chat"
  if (path === "/responses") return "responses"
  if (path === "/messages" || model.route.protocol === "anthropic-messages") return "messages"
  return model.route.protocol
}

const NO_BASE_URL = "the provider has no base URL"
const BEDROCK_PROFILE =
  "the Bedrock Converse adapter signs with the default AWS credential chain and cannot use an AWS profile"

function responses(wire: Wire, id: string, baseURL: string | undefined, fetch: Fetch): Built | undefined {
  const model = wire.runtime
  switch (model.providerID) {
    case Provider.ID.openai:
      return { adapter: createOpenaiChat(id, ROUTE_AUTH, { baseURL, fetch, reasoning: wire.reasoning }) }
    case Provider.ID.azure:
      return { adapter: azureOpenaiText(id, { apiKey: ROUTE_AUTH, baseURL, fetch, reasoning: wire.reasoning }) }
    case Provider.ID.make("xai"):
      if (known(GROK_CHAT_MODELS, id)) return { adapter: createGrokText(id, ROUTE_AUTH, { baseURL, fetch }) }
      break
    case Provider.ID.make("vercel"):
      if (known(VERCEL_GATEWAY_CHAT_MODELS, id))
        return { adapter: createVercelGatewayText(id, ROUTE_AUTH, { baseURL, fetch }) }
      break
  }
  return compatible(id, model, baseURL, fetch, wire.reasoning, "responses")
}

function chatCompletions(
  wire: Wire,
  id: string,
  baseURL: string | undefined,
  fetch: Fetch,
  wrap: (adapter: AnyTextAdapter) => Built,
): Built | undefined {
  const model = wire.runtime
  switch (model.providerID) {
    case Provider.ID.make("groq"):
      if (known(GROQ_CHAT_MODELS, id)) return { adapter: createGroqText(id, ROUTE_AUTH, { baseURL, fetch }) }
      break
    case Provider.ID.openrouter:
      if (known(OPENROUTER_CHAT_MODELS, id))
        return wrap(createOpenRouterText(id, ROUTE_AUTH, { serverURL: baseURL }))
      break
    case Provider.ID.mistral:
      return wrap(createMistralText(id, ROUTE_AUTH, { baseURL, reasoning: wire.reasoning }))
    case Provider.ID.make("llmgateway"):
      return { adapter: createLLMGatewayText(id, ROUTE_AUTH, { baseURL, fetch }) }
    case Provider.ID.make("ollama"):
      // opencode keeps the OpenAI-compatible `/v1` URL; the native Ollama API is at the root.
      return wrap(createOllamaChat(id, { baseURL: baseURL?.replace(/\/v1\/?$/, "") }))
    case Provider.ID.make("cloudflare-workers-ai"): {
      const account = baseURL?.match(/\/accounts\/([^/]+)\//)?.[1]
      if (account === undefined) break
      return {
        adapter: createCloudflareText(id, {
          accountId: account,
          apiKey: ROUTE_AUTH,
          baseURL,
          fetch,
          reasoning: wire.reasoning,
        }),
      }
    }
    case Provider.ID.make("vercel"):
      if (known(VERCEL_GATEWAY_CHAT_MODELS, id))
        return { adapter: createVercelGatewayText(id, ROUTE_AUTH, { api: "chat", baseURL, fetch }) }
      break
  }
  return compatible(id, model, baseURL, fetch, wire.reasoning, "chat-completions")
}

/** Any OpenAI-compatible endpoint, including the dedicated providers' models that TanStack AI does not list. */
function compatible(
  id: string,
  model: RuntimeInfo,
  baseURL: string | undefined,
  fetch: Fetch,
  reasoning: ModelReasoning | undefined,
  api: "chat-completions" | "responses",
) {
  if (baseURL === undefined) return
  return {
    adapter: openaiCompatibleText(id, {
      name: model.providerID,
      baseURL,
      apiKey: ROUTE_AUTH,
      api,
      fetch,
      ...(reasoning === undefined || reasoning === false ? {} : { reasoning: reasoning.map ?? true }),
    }),
  }
}

function gemini(id: string, model: RuntimeInfo, baseURL: string | undefined, fetch: Fetch, reasoning: ModelReasoning | undefined) {
  if (model.providerID === Provider.ID.googleVertex) {
    // opencode uses an express URL, with no project, when the credential is a Vertex API key.
    const express = baseURL !== undefined && !baseURL.includes("/projects/")
    if (express) return createGeminiChat(id, ROUTE_AUTH, { vertexai: true, httpOptions: { fetch }, reasoning })
    return new GeminiTextAdapter(
      {
        vertexai: true,
        project: GoogleVertexShared.project(text(model.settings?.project)),
        location: GoogleVertexShared.location(text(model.settings?.location), "global"),
        httpOptions: { fetch },
        reasoning,
      },
      id,
    )
  }
  // opencode's Gemini base URL ends with the API version; the Google SDK takes them apart.
  const version = baseURL?.match(/^(.*)\/(v\d[^/]*)\/?$/)
  return createGeminiChat(id, ROUTE_AUTH, {
    httpOptions: { fetch, ...(version ? { baseUrl: version[1], apiVersion: version[2] } : {}) },
    reasoning,
  })
}

// The Converse adapter calls Bedrock through the AWS SDK, which takes no fetch. It gets the
// opencode credential itself: a key as bearer auth, else SigV4 from the default AWS chain.
function bedrock(id: string, wire: Wire, baseURL: string | undefined) {
  const settings = wire.runtime.settings
  const credential = wire.credential
  if (text(settings?.profile) !== undefined || text(credential?.metadata?.profile) !== undefined) return
  const key = credential?.type === "key" ? credential.key : text(settings?.apiKey)
  return {
    adapter: new BedrockConverseTextAdapter(
      {
        ...(key === undefined ? {} : { apiKey: key }),
        region: text(settings?.region),
        auth: credential?.type === "external" ? "sigv4" : key === undefined ? "auto" : "apikey",
        baseURL,
        reasoning: wire.reasoning,
      },
      id,
    ),
  }
}

function text(value: unknown) {
  return typeof value === "string" ? value : undefined
}

function known<const Name extends string>(names: ReadonlyArray<Name>, id: string): id is Name {
  return names.some((name) => name === id)
}

// Copilot reads its headers on every request; the Copilot plugin owns them. The Anthropic route also
// needs the interleaved-thinking beta.
function copilot(network: Fetch, app: App.Info): Fetch {
  const send = copilotFetch(undefined, network, app)
  return (input, init) => {
    const url = input instanceof Request ? input.url : String(input)
    if (!url.includes("/v1/messages")) return send(input, init)
    const headers = new globalThis.Headers(init?.headers)
    headers.set("anthropic-beta", "interleaved-thinking-2025-05-14")
    return send(input, { ...init, headers })
  }
}

/**
 * Sends one SDK request through the resolved opencode route: the configured headers and body are
 * added, the SDK's auth headers are removed, and the route's auth signs the final request.
 */
function routeFetch(model: LanguageModel, next: Fetch, optionalAuth: boolean): Fetch {
  const http = mergeHttpOptions(model.route.defaults.http, model.defaults?.http)
  return async (input, init) => {
    const request = input instanceof Request ? new Request(input, init) : new Request(String(input), init)
    const body = mergeBody(request.body === null ? undefined : await request.text(), http)
    const headers = SDK_AUTH_HEADERS.reduce(
      (result, name) => Headers.remove(result, name),
      Headers.setAll(Headers.fromInput(request.headers), http?.headers ?? {}),
    )
    const signed = await Effect.runPromise(
      model.route.auth
        .apply({ request: { http }, method: method(request.method), url: request.url, body: body ?? "", headers })
        .pipe(
          Effect.catchIf(
            (error) => optionalAuth && error instanceof MissingCredentialError,
            () => Effect.succeed(headers),
          ),
        ),
    )
    return next(request.url, {
      method: request.method,
      headers: Object.fromEntries(Object.entries(signed)),
      body,
      signal: init?.signal ?? request.signal,
    })
  }
}

const decodeJson = Schema.decodeUnknownOption(Schema.fromJsonString(Schema.Unknown))

function mergeBody(body: string | undefined, http: HttpOptions | undefined) {
  if (body === undefined || http?.body === undefined) return body
  const parsed = decodeJson(body)
  if (parsed._tag === "None" || !isRecord(parsed.value)) return body
  return JSON.stringify(mergeJsonRecords(parsed.value, http.body))
}

const METHODS = ["POST", "GET", "PUT", "DELETE"] as const

function method(value: string) {
  return METHODS.find((item) => item === value) ?? "POST"
}

function asFetch(handler: Fetch, base: typeof fetch): typeof fetch {
  return Object.assign(handler, { preconnect: base.preconnect })
}

/**
 * The selected variant as TanStack reasoning: the `chat()` option, and the model data that lets the
 * adapter send it for a model that TanStack AI does not list.
 */
function variantReasoning(model: Model.Info, variantID: Model.VariantID | undefined) {
  const variant = model.variants.find((item) => item.id === variantID)
  if (!variant) return
  const settings = variant.settings
  const effort = text(settings?.reasoningEffort)
  const level = reasoningLevel(variant.id) ?? reasoningLevel(effort)
  if (level === undefined) return
  const budget = budgetTokens(settings)
  const map = effort !== undefined ? { [level]: effort } : level === "off" ? { off: null } : { [level]: level }
  const option: ReasoningOption = budget === undefined ? { level } : { level, budgetTokens: budget }
  const reasoning: ModelReasoning = { map, budget: budget !== undefined }
  return { option, model: reasoning }
}

const LEVELS: ReadonlyArray<ReasoningLevel> = ["off", "minimal", "low", "medium", "high", "xhigh", "max"]

// opencode names a variant after its effort. `none` turns thinking off, and the `thinking` toggle
// turns it on at the provider's usual effort.
function reasoningLevel(value: string | undefined) {
  if (value === "none") return "off"
  if (value === "thinking") return "medium"
  return LEVELS.find((level) => level === value)
}

function budgetTokens(settings: Model.Info["settings"]) {
  const thinking = settings?.thinking
  if (isRecord(thinking) && typeof thinking.budgetTokens === "number") return thinking.budgetTokens
  const config = settings?.thinkingConfig
  if (isRecord(config) && typeof config.thinkingBudget === "number") return config.thinkingBudget
  return undefined
}
