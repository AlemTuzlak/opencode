import { afterAll, beforeAll, describe, expect, test } from "bun:test"
import http2 from "node:http2"
import { chat } from "@tanstack/ai"
import { Effect, Schema } from "effect"
import type { Credential } from "@opencode/core/credential"
import { Integration } from "@opencode/core/integration"
import { Model } from "@opencode/core/model"
import { Provider } from "@opencode/core/provider"
import { TanStackAdapters } from "@opencode/core/tanstack/adapters"

interface ModelOptions {
  readonly modelID?: string
  readonly package?: string
  readonly settings?: Model.Info["settings"]
  readonly headers?: Model.Info["headers"]
  readonly body?: Model.Info["body"]
  readonly variants?: ReadonlyArray<{ readonly id: string; readonly settings?: Model.Info["settings"] }>
}

function model(providerID: string, id: string, options: ModelOptions = {}) {
  return Model.Info.make({
    ...Model.Info.default(Provider.ID.make(providerID), Model.ID.make(id)),
    modelID: Model.ID.make(options.modelID ?? id),
    package: options.package,
    settings: options.settings,
    headers: options.headers,
    body: options.body,
    variants: (options.variants ?? []).map((variant) => ({ ...variant, id: Model.VariantID.make(variant.id) })),
  })
}

function key(value: string): Credential.Value {
  return { type: "key", key: value }
}

function oauth(methodID: string, access: string): Credential.Value {
  return { type: "oauth", methodID: Integration.MethodID.make(methodID), refresh: access, access, expires: 0 }
}

function provider(id: string, activation: Provider.Info["activation"] = "auto"): Provider.Info {
  return { id: Provider.ID.make(id), name: id, activation, package: "@opencode/ai/providers/openai-compatible" }
}

/** A network that keeps each request and answers with a provider error, so no request leaves the machine. */
function network() {
  const requests: Request[] = []
  const send = Object.assign(
    async (input: string | URL | Request, init?: RequestInit) => {
      requests.push(input instanceof Request ? new Request(input, init) : new Request(String(input), init))
      return Response.json({ error: { message: "captured by the test" } }, { status: 400 })
    },
    { preconnect: fetch.preconnect },
  )
  return { requests, send }
}

const decodeBody = Schema.decodeUnknownSync(Schema.Record(Schema.String, Schema.Unknown))

/** Builds the adapter, runs one chat turn, and gives back the request that reached the network. */
async function send(input: Omit<TanStackAdapters.Input, "fetch">) {
  const wire = network()
  const resolved = await Effect.runPromise(TanStackAdapters.adapterFor({ ...input, fetch: wire.send }))
  await Array.fromAsync(
    chat({
      adapter: resolved.adapter,
      messages: [{ role: "user", content: "Hi" }],
      wrapFetch: resolved.wrapFetch,
      reasoning: resolved.reasoning,
    }),
  ).catch(() => [])
  const request = wire.requests[0]
  if (!request) throw new Error("no request reached the network")
  return { adapter: resolved.adapter, reasoning: resolved.reasoning, request, body: decodeBody(await request.clone().json()) }
}

function rejection(input: TanStackAdapters.Input) {
  return Effect.runPromise(Effect.flip(TanStackAdapters.adapterFor(input)))
}

function withEnv<A>(variables: Record<string, string>, run: () => Promise<A>) {
  const previous = Object.fromEntries(Object.keys(variables).map((name) => [name, process.env[name]]))
  Object.assign(process.env, variables)
  return run().finally(() =>
    Object.entries(previous).forEach(([name, value]) => {
      if (value === undefined) delete process.env[name]
      else process.env[name] = value
    }),
  )
}

describe("first-party providers", () => {
  test("OpenAI sends the key to the Responses API", async () => {
    const result = await send({
      model: model("openai", "gpt-5", { package: "@opencode/ai/providers/openai" }),
      credential: key("sk-openai"),
    })

    expect(result.adapter.name).toBe("openai")
    expect(result.request.url).toBe("https://api.openai.com/v1/responses")
    expect(result.request.headers.get("authorization")).toBe("Bearer sk-openai")
    expect(result.body.model).toBe("gpt-5")
  })

  test("Anthropic sends the key, the configured headers, and the configured body", async () => {
    const result = await send({
      model: model("anthropic", "claude-sonnet-4-5", {
        package: "@opencode/ai/providers/anthropic",
        headers: { "X-Gateway-Tenant": "engineering" },
        body: { metadata: { user_id: "opencode" } },
      }),
      credential: key("sk-ant-key"),
    })

    expect(result.adapter.name).toBe("anthropic")
    expect(result.request.url).toBe("https://api.anthropic.com/v1/messages?beta=true")
    expect(result.request.headers.get("x-api-key")).toBe("sk-ant-key")
    expect(result.request.headers.get("authorization")).toBeNull()
    expect(result.request.headers.get("x-gateway-tenant")).toBe("engineering")
    expect(result.body.model).toBe("claude-sonnet-4-5")
    expect(result.body.metadata).toEqual({ user_id: "opencode" })
  })

  test("Google sends the key to the Gemini API", async () => {
    const result = await send({
      model: model("google", "gemini-2.5-pro", { package: "@opencode/ai/providers/google" }),
      credential: key("google-key"),
    })

    expect(result.adapter.name).toBe("gemini")
    expect(result.request.url).toBe(
      "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-pro:streamGenerateContent?alt=sse",
    )
    expect(result.request.headers.get("x-goog-api-key")).toBe("google-key")
  })

  test("Vertex sends an express key to the Vertex API", async () => {
    const result = await send({
      model: model("google-vertex", "gemini-2.5-pro", { package: "@opencode/ai/providers/google-vertex" }),
      credential: key("vertex-key"),
    })

    expect(result.adapter.provider).toBe("google-vertex")
    expect(new URL(result.request.url).host).toBe("aiplatform.googleapis.com")
    expect(result.request.url).toContain("/publishers/google/models/gemini-2.5-pro:streamGenerateContent")
    expect(result.request.headers.get("x-goog-api-key")).toBe("vertex-key")
  })

  test("Azure sends the key to the deployment of the resource", async () => {
    const result = await send({
      model: model("azure", "gpt-5", {
        package: "@opencode/ai/providers/azure",
        modelID: "gpt-production",
        settings: { resourceName: "my-models" },
      }),
      credential: key("azure-key"),
    })

    expect(result.adapter.name).toBe("azure-openai-responses")
    expect(result.request.url).toBe("https://my-models.openai.azure.com/openai/v1/responses?api-version=v1")
    expect(result.request.headers.get("api-key")).toBe("azure-key")
    expect(result.body.model).toBe("gpt-production")
  })

  test("Bedrock Mantle signs with the Bedrock key", async () => {
    const result = await send({
      model: model("amazon-bedrock", "openai.gpt-oss-120b", {
        package: "@opencode/ai/providers/amazon-bedrock/mantle/chat",
        settings: { region: "us-west-2" },
      }),
      credential: key("bedrock-key"),
    })

    expect(result.request.url).toBe("https://bedrock-mantle.us-west-2.api.aws/v1/chat/completions")
    expect(result.request.headers.get("authorization")).toBe("Bearer bedrock-key")
    expect(result.body.model).toBe("openai.gpt-oss-120b")
  })
})

describe("Bedrock Converse", () => {
  // The AWS SDK sends Converse streams over HTTP/2, so a local h2c server takes the request.
  const received: http2.IncomingHttpHeaders[] = []
  const sessions = new Set<http2.ServerHttp2Session>()
  const server = http2.createServer()
  server.on("session", (session) => sessions.add(session))
  server.on("stream", (stream, headers) => {
    received.push(headers)
    stream.respond({ ":status": 400, "content-type": "application/json" })
    stream.end(JSON.stringify({ message: "captured by the test" }))
  })
  beforeAll(() => new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve)))
  afterAll(() => {
    sessions.forEach((session) => session.destroy())
    server.close()
  })

  test("sends the Bedrock key through the AWS SDK", async () => {
    const address = server.address()
    const port = typeof address === "object" && address !== null ? address.port : 0
    const resolved = await Effect.runPromise(
      TanStackAdapters.adapterFor({
        model: model("amazon-bedrock", "anthropic.claude-sonnet-4-5-v1:0", {
          package: "@opencode/ai/providers/amazon-bedrock",
          settings: { region: "us-west-2", baseURL: `http://127.0.0.1:${port}` },
        }),
        credential: key("bedrock-key"),
      }),
    )
    await Array.fromAsync(chat({ adapter: resolved.adapter, messages: [{ role: "user", content: "Hi" }] })).catch(
      () => [],
    )

    expect(resolved.adapter.name).toBe("bedrock-converse")
    expect(received[0]?.[":path"]).toBe("/model/anthropic.claude-sonnet-4-5-v1%3A0/converse-stream")
    expect(received[0]?.authorization).toBe("Bearer bedrock-key")
  })

  test("rejects an AWS profile, which the Converse adapter cannot use", async () => {
    const error = await rejection({
      model: model("amazon-bedrock", "anthropic.claude-sonnet-4-5-v1:0", {
        package: "@opencode/ai/providers/amazon-bedrock",
        settings: { region: "us-west-2", profile: "work" },
      }),
    })

    expect(error.message).toBe(
      "amazon-bedrock/anthropic.claude-sonnet-4-5-v1:0 does not work on the TanStack runtime (OPENCODE_RUNTIME=tanstack): the Bedrock Converse adapter signs with the default AWS credential chain and cannot use an AWS profile",
    )
  })
})

describe("gateways and hosted providers", () => {
  test("OpenRouter sends the key and its attribution headers", async () => {
    const result = await send({
      model: model("openrouter", "anthropic/claude-sonnet-4", {
        package: "@opencode/ai/providers/openrouter",
        // The OpenRouter plugin puts these headers on the provider; the catalog copies them to each model.
        headers: { "HTTP-Referer": "https://opencode.ai/", "X-Title": "opencode" },
      }),
      credential: key("or-key"),
    })

    expect(result.adapter.name).toBe("openrouter")
    expect(result.request.url).toBe("https://openrouter.ai/api/v1/chat/completions")
    expect(result.request.headers.get("authorization")).toBe("Bearer or-key")
    expect(result.request.headers.get("x-title")).toBe("opencode")
    expect(result.body.model).toBe("anthropic/claude-sonnet-4")
  })

  test("xAI sends the key to the Responses API", async () => {
    const result = await send({
      model: model("xai", "grok-4.5", { package: "@opencode/ai/providers/xai" }),
      credential: key("xai-key"),
    })

    expect(result.adapter.name).toBe("grok")
    expect(result.request.url).toBe("https://api.x.ai/v1/responses")
    expect(result.request.headers.get("authorization")).toBe("Bearer xai-key")
  })

  test("Groq sends the key to Chat Completions", async () => {
    const result = await send({
      model: model("groq", "llama-3.3-70b-versatile", { package: "@opencode/ai/providers/groq" }),
      credential: key("groq-key"),
    })

    expect(result.adapter.name).toBe("groq")
    expect(result.request.url).toBe("https://api.groq.com/openai/v1/chat/completions")
    expect(result.request.headers.get("authorization")).toBe("Bearer groq-key")
  })

  test("a Groq model that TanStack AI does not list uses the OpenAI-compatible adapter", async () => {
    const result = await send({
      model: model("groq", "groq-next-preview", { package: "@opencode/ai/providers/groq" }),
      credential: key("groq-key"),
    })

    expect(result.adapter.name).toBe("groq")
    expect(result.adapter.api).toBe("openai-completions")
    expect(result.request.url).toBe("https://api.groq.com/openai/v1/chat/completions")
    expect(result.body.model).toBe("groq-next-preview")
  })

  test("Mistral sends the key through wrapFetch", async () => {
    const result = await send({
      model: model("mistral", "mistral-large-latest", { package: "@opencode/ai/providers/mistral" }),
      credential: key("mistral-key"),
    })

    expect(result.adapter.api).toBe("mistral-conversations")
    expect(result.request.url).toBe("https://api.mistral.ai/v1/chat/completions")
    expect(result.request.headers.get("authorization")).toBe("Bearer mistral-key")
  })

  test("Ollama uses its native API at the root of the configured server", async () => {
    const result = await send({
      model: model("ollama", "qwen3:8b", {
        package: "@opencode/ai/providers/openai-compatible",
        settings: { baseURL: "http://127.0.0.1:11434/v1" },
      }),
      provider: provider("ollama", "enabled"),
    })

    expect(result.adapter.name).toBe("ollama")
    expect(result.request.url).toBe("http://127.0.0.1:11434/api/chat")
    expect(result.request.headers.get("authorization")).toBeNull()
  })

  test("Cloudflare Workers AI sends the token to the account", async () => {
    const result = await send({
      model: model("cloudflare-workers-ai", "@cf/meta/llama-3.3-70b-instruct-fp8-fast", {
        package: "@opencode/ai/providers/cloudflare-workers-ai",
        settings: { accountId: "acc123" },
      }),
      credential: key("cf-token"),
    })

    expect(result.adapter.name).toBe("cloudflare")
    expect(result.request.url).toBe("https://api.cloudflare.com/client/v4/accounts/acc123/ai/v1/chat/completions")
    expect(result.request.headers.get("authorization")).toBe("Bearer cf-token")
  })

  test("Vercel AI Gateway sends an OpenAI model to the gateway's Responses API", async () => {
    const result = await send({
      model: model("vercel", "openai/gpt-5", { package: "@opencode/ai/providers/vercel-ai-gateway" }),
      credential: key("vercel-key"),
    })

    expect(result.adapter.name).toBe("vercel-gateway")
    expect(result.request.url).toBe("https://ai-gateway.vercel.sh/v1/responses")
    expect(result.request.headers.get("authorization")).toBe("Bearer vercel-key")
  })

  test("Vercel AI Gateway sends a Claude model to the gateway's Messages API", async () => {
    const result = await send({
      model: model("vercel", "anthropic/claude-sonnet-4", { package: "@opencode/ai/providers/vercel-ai-gateway" }),
      credential: key("vercel-key"),
    })

    expect(result.adapter.name).toBe("anthropic")
    expect(result.request.url).toBe("https://ai-gateway.vercel.sh/v1/messages?beta=true")
    expect(result.request.headers.get("authorization")).toBe("Bearer vercel-key")
  })

  test("LLMGateway sends the key to the gateway", async () => {
    const result = await send({
      model: model("llmgateway", "gpt-5", {
        package: "@opencode/ai/providers/openai-compatible",
        settings: { baseURL: "https://api.llmgateway.io/v1" },
      }),
      credential: key("llm-key"),
    })

    expect(result.adapter.name).toBe("llmgateway")
    expect(result.request.url).toBe("https://api.llmgateway.io/v1/chat/completions")
    expect(result.request.headers.get("authorization")).toBe("Bearer llm-key")
  })

  test("Perplexity Sonar uses the OpenAI-compatible adapter", async () => {
    const result = await send({
      model: model("perplexity", "sonar-pro", { package: "aisdk:@ai-sdk/perplexity" }),
      credential: key("pplx-key"),
    })

    expect(result.adapter.name).toBe("perplexity")
    expect(result.request.url).toBe("https://api.perplexity.ai/chat/completions")
    expect(result.request.headers.get("authorization")).toBe("Bearer pplx-key")
  })
})

describe("OpenAI-compatible providers", () => {
  const family = [
    ["kilo", "https://api.kilo.ai/api/gateway"],
    ["nvidia", "https://integrate.api.nvidia.com/v1"],
    ["zenmux", "https://zenmux.ai/api/v1"],
    ["modal", "https://inference.us-west.modal.direct/v1"],
    ["poe", "https://api.poe.com/v1"],
    ["snowflake-cortex", "https://acme.snowflakecomputing.com/api/v2/cortex/v1"],
    ["opencode", "https://opencode.ai/zen/v1"],
    ["acme", "https://llm.acme.example/v1"],
  ] as const

  test.each(family)("%s sends the key to its base URL", async (providerID, baseURL) => {
    const result = await send({
      model: model(providerID, "coder", {
        package: "@opencode/ai/providers/openai-compatible",
        settings: { baseURL },
      }),
      credential: key(`${providerID}-key`),
    })

    expect(result.adapter.name).toBe(providerID)
    expect(result.request.url).toBe(`${baseURL}/chat/completions`)
    expect(result.request.headers.get("authorization")).toBe(`Bearer ${providerID}-key`)
    expect(result.body.model).toBe("coder")
  })

  test.each([
    ["cerebras", "@opencode/ai/providers/cerebras", "https://api.cerebras.ai/v1/chat/completions"],
    ["digitalocean", "@opencode/ai/providers/digitalocean", "https://inference.do-ai.run/v1/chat/completions"],
  ] as const)("%s uses the URL of its opencode package", async (providerID, packageName, url) => {
    const result = await send({
      model: model(providerID, "coder", { package: packageName }),
      credential: key(`${providerID}-key`),
    })

    expect(result.request.url).toBe(url)
    expect(result.request.headers.get("authorization")).toBe(`Bearer ${providerID}-key`)
  })

  test.each([
    ["lmstudio", "http://127.0.0.1:1234/v1"],
    ["vllm", "http://127.0.0.1:8000/v1"],
  ] as const)("a local %s server needs no key", async (providerID, baseURL) => {
    const result = await send({
      model: model(providerID, "local-model", {
        package: "@opencode/ai/providers/openai-compatible",
        settings: { baseURL },
      }),
      provider: provider(providerID, "enabled"),
    })

    expect(result.request.url).toBe(`${baseURL}/chat/completions`)
    expect(result.request.headers.get("authorization")).toBeNull()
  })

  test("a ${VAR} placeholder in the base URL comes from the environment", async () => {
    const result = await withEnv({ OPENCODE_TEST_ACME_HOST: "llm.acme.example" }, () =>
      send({
        model: model("acme", "coder", {
          package: "@opencode/ai/providers/openai-compatible",
          settings: { baseURL: "https://${OPENCODE_TEST_ACME_HOST}/v1" },
        }),
        credential: key("acme-key"),
      }),
    )

    expect(result.request.url).toBe("https://llm.acme.example/v1/chat/completions")
  })
})

describe("sign-in providers", () => {
  test("Copilot sends Claude models to /v1/messages with the Copilot headers", async () => {
    const result = await send({
      model: model("github-copilot", "claude-sonnet-4.5", {
        package: "@opencode/ai/providers/anthropic",
        settings: { baseURL: "https://api.githubcopilot.com/v1", endpoint: "messages" },
      }),
      credential: oauth("oauth", "gho_token"),
    })

    expect(result.adapter.name).toBe("anthropic")
    expect(result.request.url).toBe("https://api.githubcopilot.com/v1/messages?beta=true")
    expect(result.request.headers.get("authorization")).toBe("Bearer gho_token")
    expect(result.request.headers.get("x-api-key")).toBeNull()
    expect(result.request.headers.get("openai-intent")).toBe("conversation-edits")
    expect(result.request.headers.get("x-initiator")).toBe("user")
    expect(result.request.headers.get("anthropic-beta")).toBe("interleaved-thinking-2025-05-14")
  })

  test("Copilot sends a /responses model to the Responses API with the Copilot headers", async () => {
    const result = await send({
      model: model("github-copilot", "gpt-5.5", {
        package: "aisdk:@ai-sdk/github-copilot",
        settings: { baseURL: "https://api.githubcopilot.com", endpoint: "responses" },
      }),
      credential: oauth("oauth", "gho_token"),
    })

    expect(result.adapter.api).toBe("openai-responses")
    expect(result.request.url).toBe("https://api.githubcopilot.com/responses")
    expect(result.request.headers.get("authorization")).toBe("Bearer gho_token")
    expect(result.request.headers.get("openai-intent")).toBe("conversation-edits")
    expect(result.request.headers.get("anthropic-beta")).toBeNull()
  })

  test("Copilot sends a /chat/completions model to Chat Completions", async () => {
    const result = await send({
      model: model("github-copilot", "gpt-4.1", {
        package: "aisdk:@ai-sdk/github-copilot",
        settings: { baseURL: "https://api.githubcopilot.com", endpoint: "chat" },
      }),
      credential: oauth("oauth", "gho_token"),
    })

    expect(result.request.url).toBe("https://api.githubcopilot.com/chat/completions")
    expect(result.request.headers.get("x-github-api-version")).not.toBeNull()
  })

  test("a ChatGPT token goes to the OpenAI API", async () => {
    const result = await send({
      model: model("openai", "gpt-5.5", { package: "@opencode/ai/providers/openai" }),
      credential: oauth("chatgpt-token-sharing", "chatgpt-access"),
    })

    expect(result.adapter.name).toBe("openai")
    expect(result.request.url).toBe("https://api.openai.com/v1/responses")
    expect(result.request.headers.get("authorization")).toBe("Bearer chatgpt-access")
  })

  test("the opencode placeholder key never reaches the wire", async () => {
    const result = await send({
      model: model("anthropic", "claude-sonnet-4-5", { package: "@opencode/ai/providers/anthropic" }),
      credential: key("sk-ant-key"),
    })

    expect([...result.request.headers.values()].join(" ")).not.toContain("opencode-route-auth")
  })
})

describe("variants", () => {
  test("an effort variant becomes the reasoning level on the wire", async () => {
    const result = await send({
      model: model("acme", "coder", {
        package: "@opencode/ai/providers/openai-compatible",
        settings: { baseURL: "https://llm.acme.example/v1" },
        variants: [{ id: "high", settings: { reasoningEffort: "high" } }],
      }),
      variant: Model.VariantID.make("high"),
      credential: key("acme-key"),
    })

    expect(result.reasoning).toEqual({ level: "high" })
    expect(result.body.reasoning_effort).toBe("high")
  })

  test("a budget variant becomes a thinking budget on the wire", async () => {
    const result = await send({
      model: model("anthropic", "claude-sonnet-4-5", {
        package: "@opencode/ai/providers/anthropic",
        variants: [{ id: "high", settings: { thinking: { type: "enabled", budgetTokens: 16000 } } }],
      }),
      variant: Model.VariantID.make("high"),
      credential: key("sk-ant-key"),
    })

    expect(result.reasoning).toEqual({ level: "high", budgetTokens: 16000 })
    expect(result.body.thinking).toEqual({ type: "enabled", budget_tokens: 16000 })
  })

  test("the none variant turns reasoning off", async () => {
    const result = await send({
      model: model("openai", "gpt-5", {
        package: "@opencode/ai/providers/openai",
        variants: [{ id: "none", settings: { reasoningEffort: "none" } }],
      }),
      variant: Model.VariantID.make("none"),
      credential: key("sk-openai"),
    })

    expect(result.reasoning).toEqual({ level: "off" })
    expect(result.body.reasoning).toEqual({ effort: "none" })
  })
})

describe("not supported on the TanStack runtime", () => {
  test.each([
    [
      "GitLab Duo",
      model("gitlab", "duo-chat", { package: "aisdk:gitlab-ai-provider" }),
      undefined,
      "gitlab/duo-chat does not work on the TanStack runtime (OPENCODE_RUNTIME=tanstack): GitLab Duo has no TanStack AI adapter",
    ],
    [
      "SAP AI Core",
      model("sap-ai-core", "gpt-5", { package: "aisdk:@jerome-benoit/sap-ai-provider-v2" }),
      undefined,
      "sap-ai-core/gpt-5 does not work on the TanStack runtime (OPENCODE_RUNTIME=tanstack): SAP AI Core has no TanStack AI adapter",
    ],
    [
      "the ChatGPT Codex backend",
      model("openai", "gpt-5.5", { package: "@opencode/ai/providers/openai" }),
      oauth("chatgpt-browser", "codex-access"),
      'openai/gpt-5.5 does not work on the TanStack runtime (OPENCODE_RUNTIME=tanstack): the ChatGPT Codex backend has no TanStack AI adapter. Run /connect, choose OpenAI, and select "Sign in with ChatGPT"',
    ],
    [
      "Cohere chat",
      model("cohere", "command-a-03-2025", { package: "@opencode/ai/providers/cohere" }),
      key("cohere-key"),
      "cohere/command-a-03-2025 does not work on the TanStack runtime (OPENCODE_RUNTIME=tanstack): TanStack AI has no adapter for the cohere-chat API",
    ],
    [
      "another AI SDK package",
      model("acme", "coder", { package: "aisdk:@acme/ai-sdk-provider" }),
      key("acme-key"),
      "acme/coder does not work on the TanStack runtime (OPENCODE_RUNTIME=tanstack): the AI SDK package @acme/ai-sdk-provider has no TanStack AI adapter",
    ],
  ] as const)("%s fails with a typed error that names the provider", async (_name, selected, credential, message) => {
    const error = await rejection({ model: selected, credential })

    expect(error._tag).toBe("TanStackAdapters.UnsupportedProviderError")
    expect(error.message).toBe(message)
  })
})
