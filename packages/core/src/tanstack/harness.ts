export * as TanStackHarness from "./harness.js"

import { AsyncLocalStorage } from "node:async_hooks"
import path from "node:path"
import { isRecord } from "@opencode/ai/utils/record"
import type { FileDiff } from "@opencode/schema/file-diff"
import { Global } from "@opencode/util/global"
import { toolDefinition } from "@tanstack/ai"
import type { AnyTool, ChatMiddleware, ContentPart } from "@tanstack/ai"
import { codeMode } from "@tanstack/ai-code-mode/harness"
import { conversationSummarizer, summarizeOldest, withCompaction } from "@tanstack/ai-compaction"
import { defineHarness, definePlugin, retryTransientErrors } from "@tanstack/ai-harness"
import {
  agents,
  boundToolOutput,
  permissions,
  projectInstructions,
  question,
  title,
  usage,
} from "@tanstack/ai-harness/plugins"
import type { AgentProfile } from "@tanstack/ai-harness/plugins"
import { WorkspaceHooks, formatter, hostBackend, snapshots, workspaceTools } from "@tanstack/ai-harness/plugins/coding"
import type { WorkspaceBackend } from "@tanstack/ai-harness/plugins/coding"
import { createQuickJSIsolateDriver } from "@tanstack/ai-isolate-quickjs"
import { skills } from "@tanstack/ai-skills/harness"
import { Effect, Option, Result, Schema } from "effect"
import type { JsonSchema } from "effect"
import { Agent } from "../agent.js"
import { Config } from "../config.js"
import { InstructionDiscovery } from "../instruction-discovery.js"
import { Integration } from "../integration.js"
import { Location } from "../location.js"
import { Mcp } from "../mcp/index.js"
import { Model } from "../model.js"
import { Plugin } from "../plugin.js"
import { Provider } from "../provider.js"
import { Session } from "../session.js"
import { Skill } from "../skill.js"
import { ToolOutput } from "../tool-output.js"
import { McpTool } from "../tool/mcp.js"
import { TanStackAdapters } from "./adapters.js"
import { TanStackOpencodeTools } from "./opencode-tools.js"
import { TanStackRules } from "./rules.js"

/** The model is not in the model catalog of the location. */
export class ModelNotFoundError extends Schema.TaggedError<ModelNotFoundError>()("TanStackHarness.ModelNotFoundError", {
  providerID: Provider.ID,
  modelID: Model.ID,
}) {
  override get message() {
    return `Model unavailable: ${this.providerID}/${this.modelID}`
  }
}

/**
 * One file that one tool call changed, with its text before and after the call. `before` is empty for an added
 * file, and `after` is empty for a deleted file. `after` is the text after the formatter ran. The values fit
 * `fileDiff(path, before, after, status)` of the opencode tools.
 */
export interface FileChange {
  readonly toolCallId: string
  /** The absolute path of the file. */
  readonly path: string
  readonly before: string
  readonly after: string
  readonly status: FileDiff.Info["status"]
}

export interface Options {
  /**
   * Called for each file that a `write_file`, `edit_file`, or `patch` call adds, changes, or deletes, after the
   * file is written. The harness results of these tools have no file text, so the event mapper builds
   * `metadata.files` from these changes.
   */
  readonly onFileChange?: (change: FileChange) => void
}

const FILE_TOOLS = new Set(["write_file", "edit_file", "patch"])
// opencode keeps this many tokens of recent conversation beside a compaction summary.
const KEEP_TOKENS = 15_000
// opencode's window for a model with an unknown context size.
const UNKNOWN_WINDOW = 200_000

type Resolved = Effect.Success<ReturnType<typeof TanStackAdapters.adapterFor>> & {
  readonly info: Model.Info
  readonly compaction: Provider.Compaction | undefined
}

/**
 * Builds the TanStack harness of one opencode location (directory instance) from opencode's config. Run it in
 * the Effect context of the location.
 *
 * The harness has:
 * - the location's default model as its adapter. The model of each turn comes from `overrides(ref)`: pass the
 *   session model, or the model of a model switch, as the turn `overrides`.
 * - opencode's agents as `agents()` profiles, with their permission rules, prompts, and steps.
 * - the workspace tools in the location folder, with `boundToolOutput`, `formatter`, `snapshots`, `question`,
 *   `title`, `usage`, and `projectInstructions` from opencode's instruction files.
 * - opencode's skill folders, plus the `skills` folders of `.claude` and `.agents`.
 * - opencode's MCP tools and the `opencode_*` tools, in Code Mode.
 * - compaction that keeps 15,000 tokens, natively when the model has native compaction, and
 *   `retryTransientErrors()` for model errors.
 *
 * The thread id of each harness session must be its opencode session id: the `opencode_*` tools and the MCP
 * tools use it. Give the host `projectCompaction` from `@tanstack/ai-compaction`, because the compaction is
 * durable.
 *
 * @example
 * const built = yield* TanStackHarness.make({ onFileChange: (change) => files.push(change) })
 * const session = await host.open(built.harness, { threadId: sessionID })
 * const overrides = yield* built.overrides(session.model)
 * await session.prompt("Fix the build", { overrides })
 */
export const make = Effect.fn("TanStackHarness.make")(function* (options: Options = {}) {
  // The location plugins fill the model catalog, the agents, and the skills after the location starts.
  yield* Plugin.awaitActivation
  const location = yield* Location.Service
  const global = yield* Global.Service
  const config = yield* Config.Service
  const agentService = yield* Agent.Service
  const skillService = yield* Skill.Service
  const discovery = yield* InstructionDiscovery.Service
  const models = yield* Model.Service
  const providers = yield* Provider.Service
  const integrations = yield* Integration.Service
  const mcp = yield* Mcp.Service
  const run = Effect.runPromiseWith(
    yield* Effect.context<Session.Service | Provider.Service | Model.Service | Mcp.Service>(),
  )
  const root = location.directory
  // The model of each resolved adapter, by `provider/model#variant` and by the adapter's model id.
  const resolved = new Map<string, Resolved>()
  const failed = new Map<string, string>()

  const resolve = Effect.fn("TanStackHarness.resolve")(function* (ref: Model.Ref) {
    const info = yield* models.get(ref.providerID, ref.id)
    if (!info) return yield* new ModelNotFoundError({ providerID: ref.providerID, modelID: ref.id })
    const provider = yield* providers.get(info.providerID)
    const connection = yield* integrations.connection.active(
      provider?.integrationID ?? Integration.ID.make(info.providerID),
    )
    const credential = connection ? yield* integrations.connection.resolve(connection) : undefined
    const adapter = yield* TanStackAdapters.adapterFor({ model: info, variant: ref.variant, provider, credential })
    const entry = { ...adapter, info, compaction: info.settings?.compaction ?? provider?.settings?.compaction }
    resolved.set(refKey(ref), entry)
    resolved.set(adapter.adapter.model, entry)
    return entry
  })

  // A model that does not resolve leaves its part out, with a warning. A turn still gets its model from `overrides`.
  const tryResolve = Effect.fn("TanStackHarness.tryResolve")(function* (ref: Model.Ref | undefined) {
    if (ref === undefined) return undefined
    const result = yield* Effect.result(resolve(ref))
    if (Result.isSuccess(result)) return result.success
    failed.set(refKey(ref), result.failure.message)
    yield* Effect.logWarning("TanStack harness: model unavailable", {
      model: refKey(ref),
      error: result.failure.message,
    })
    return undefined
  })

  const defaultInfo = yield* models.default()
  const fallback = yield* tryResolve(
    defaultInfo && Model.Ref.make({ providerID: defaultInfo.providerID, id: defaultInfo.id }),
  )
  const opencodeAgents = yield* agentService.list()
  const selected = yield* agentService.select()
  const titleAgent = opencodeAgents.find((agent) => agent.id === "title")
  const compactionAgent = opencodeAgents.find((agent) => agent.id === "compaction")
  const smallInfo = defaultInfo && (yield* models.small(defaultInfo.providerID))
  const titleModel =
    (yield* tryResolve(titleAgent?.model)) ??
    (yield* tryResolve(smallInfo && Model.Ref.make({ providerID: smallInfo.providerID, id: smallInfo.id }))) ??
    fallback
  const summaryModel = (yield* tryResolve(compactionAgent?.model)) ?? fallback
  // Subagents run with their own model. Primary agents use the model of the turn, as on the opencode runtime.
  yield* Effect.forEach(
    opencodeAgents.filter((agent) => agent.mode === "subagent"),
    (agent) => tryResolve(agent.model),
  )
  const profiles = opencodeAgents
    .filter((agent) => !(agent.hidden && agent.mode === "primary"))
    .map((agent) => agentProfile(agent))
  const defaultProfile = profiles.find((profile) => profile.name === selected.id && profile.mode !== "subagent")

  const skillDirs = (yield* skillService.list())
    .filter((skill) => path.basename(skill.path) === "SKILL.md")
    .map((skill) => path.dirname(path.dirname(skill.path)))
  const compatibility = config.compatibility ? yield* config.compatibility() : { claude: [], agents: [] }
  const skillFolders = [
    ...new Set([
      ...skillDirs,
      ...[...compatibility.claude, ...compatibility.agents].map((folder) => path.join(folder, "skills")),
    ]),
  ]
  const instructionFiles = yield* discovery.list()
  const globalInstructions = Array.isArray(instructionFiles) ? instructionFiles.map((file) => file.path) : []
  const isSnapshotsOn = Config.latest(yield* config.entries(), "snapshots") !== false
  const prices = new Map(
    (yield* models.available()).flatMap((info) => {
      const cost = info.cost.find((item) => item.tier === undefined) ?? info.cost[0]
      if (!cost) return []
      return [
        [
          info.modelID,
          {
            cost: { input: cost.input, output: cost.output, cacheRead: cost.cache.read, cacheWrite: cost.cache.write },
          },
        ] as const,
      ]
    }),
  )
  const spillDir = path.join(global.data, ToolOutput.DIRECTORY)
  const compaction = summaryModel && compactionMiddleware(summaryModel, fallback)

  /** The adapter for a model id of `agents()`: a subagent's `provider/model`, or the model id of the main turn. */
  const adapterOf = (model: string) => {
    const entry = resolved.get(model)
    if (entry) return entry.adapter
    throw new Error(failed.get(model) ?? `The TanStack runtime has no adapter for the model ${model}.`)
  }

  // Mistral, Ollama, and OpenRouter take no fetch, so their requests go through the opencode route here.
  // ponytail: by model id, so two providers with the same model id share the last resolved wrapper.
  const wrapFetch: ChatMiddleware = {
    name: "opencode/wrap-fetch",
    onConfig: (context) => {
      if (context.phase !== "init") return
      const wrapper = resolved.get(context.model)?.wrapFetch
      return wrapper ? { wrapFetch: wrapper } : undefined
    },
  }

  const wrapFetchPlugin = definePlugin({
    name: "opencode/wrap-fetch",
    setup: () => ({ middleware: [wrapFetch], agentMiddleware: [wrapFetch] }),
  })

  const opencodeTools = definePlugin({
    name: "opencode/tools",
    setup: async (ctx) => ({
      tools: (await run(TanStackOpencodeTools.make({ sessionID: Session.ID.make(ctx.session.threadId) }))).map(
        inCodeMode,
      ),
    }),
  })

  const mcpTools = definePlugin({
    name: "opencode/mcp",
    setup: (ctx) => {
      const sessionID = Session.ID.make(ctx.session.threadId)
      return {
        // opencode connects the servers, so each turn gets the tools of the servers that are connected now.
        discoverTools: async () =>
          (await run(mcp.tools())).map((tool) =>
            mcpTool(tool, (args, signal) =>
              run(mcp.callTool({ server: tool.server, name: tool.name, args, sessionID }), { signal }),
            ),
          ),
      }
    },
  })

  const outside = TanStackRules.workspaceOutside(
    opencodeAgents.find((agent) => agent.id === selected.id)?.permissions ?? [],
  )

  const harness = defineHarness({
    name: "opencode",
    ...(fallback ? { adapter: fallback.adapter } : {}),
    ...(fallback?.reasoning ? { reasoning: fallback.reasoning } : {}),
    ...(compaction ? { middleware: [compaction] } : {}),
    // One `subagent` tool for every subagent, as opencode has.
    subagents: { agents: [], tool: "single" },
    turn: { onModelError: retryTransientErrors() },
    plugins: () => {
      const changes = options.onFileChange && trackFileChanges(options.onFileChange)
      return [
        wrapFetchPlugin,
        permissions({ root }),
        workspaceTools({
          root,
          editStyle: "auto",
          outside,
          spillDir,
          ...(changes ? { backend: changes.backend } : {}),
        }),
        formatter({ root }),
        // After `formatter`, so a change has the formatted text. Before `agents`, so subagents get the tracked tools.
        ...(changes ? [changes.plugin] : []),
        ...(isSnapshotsOn ? [snapshots({ root, dataDir: path.join(global.data, "snapshot", "tanstack") })] : []),
        boundToolOutput({ dir: spillDir, maxLines: 2000, maxBytes: 50 * 1024 }),
        question(),
        opencodeTools,
        mcpTools,
        skills({ dirs: skillFolders }),
        // Only the marked tools move: MCP tools and the `opencode_*` tools. The other tools stay tool calls.
        codeMode({ driver: createQuickJSIsolateDriver(), include: () => false }),
        ...(titleModel ? [title({ adapter: titleModel.adapter })] : []),
        usage({ model: (id) => prices.get(Model.ID.make(id)) }),
        // After the tool plugins, so the agent rules come after their default rules and win.
        agents({
          adapter: adapterOf,
          agents: profiles,
          builtIns: false,
          ...(defaultProfile ? { default: defaultProfile.name } : {}),
        }),
        // Last, so a changed instruction file keeps the prompt cache.
        projectInstructions({ root, global: globalInstructions, files: [] }),
      ]
    },
  })

  /**
   * The turn overrides for an opencode model: the session model, or the model of a model switch. Pass them to
   * `session.prompt(text, { overrides })`. Fails with `ModelNotFoundError`, `UnsupportedProviderError`, and the
   * `ModelResolver` and credential errors.
   */
  const overrides = Effect.fn("TanStackHarness.overrides")(function* (ref: Model.Ref) {
    const entry = yield* resolve(ref)
    return { adapter: entry.adapter, ...(entry.reasoning ? { reasoning: entry.reasoning } : {}) }
  })

  return { harness, overrides }
})

function refKey(ref: Model.Ref) {
  return `${ref.providerID}/${ref.id}${ref.variant === undefined ? "" : `#${ref.variant}`}`
}

function agentProfile(agent: Agent.Info) {
  const model = agent.mode === "subagent" && agent.model ? refKey(agent.model) : undefined
  return {
    name: agent.id,
    description: agent.description ?? `The ${agent.name} agent.`,
    mode: agent.mode,
    permissions: TanStackRules.harnessRules(agent.permissions).rules,
    ...(model === undefined ? {} : { model }),
    ...(agent.system === undefined ? {} : { system: agent.system }),
    ...(agent.steps === undefined ? {} : { steps: agent.steps }),
    ...(agent.hidden ? { hidden: true } : {}),
  } satisfies AgentProfile
}

/**
 * opencode's compaction: summarize all but the newest 15,000 tokens before the context of the default model is
 * full. With native compaction on the default model, its endpoint compacts.
 */
function compactionMiddleware(summary: Resolved, fallback: Resolved | undefined) {
  const limit = (fallback ?? summary).info.limit
  const window = limit.input || limit.context || UNKNOWN_WINDOW
  const isNative = fallback?.compaction?.type === "native"
  return withCompaction({
    // opencode keeps 10% of the window free for the reply.
    maxTokens: Math.floor(window * 0.9),
    contextWindow: window,
    countTokens: "usage",
    durable: true,
    strategy: summarizeOldest({
      cut: "turn",
      keepRecentTokens: KEEP_TOKENS,
      summarize: conversationSummarizer({ adapter: summary.adapter }),
    }),
    ...(isNative && fallback ? { native: fallback.adapter } : {}),
  })
}

/** A tool that Code Mode takes when it is safe to run without a question. */
function inCodeMode<Tool extends AnyTool>(tool: Tool) {
  return { ...tool, metadata: { ...tool.metadata, codeMode: true } }
}

const decodeJson = Schema.decodeUnknownOption(Schema.fromJsonString(Schema.Unknown))

/** An opencode MCP tool as a TanStack server tool, with the name, input, and output of opencode's MCP tool. */
function mcpTool(
  tool: Mcp.Tool,
  call: (args: Record<string, unknown>, signal?: AbortSignal) => Promise<Mcp.ToolResult>,
) {
  // The MCP SDK checks the schemas when it lists the tools. Both sides take any JSON Schema object.
  const input: JsonSchema.JsonSchema = tool.inputSchema ?? { type: "object", properties: {} }
  const output: JsonSchema.JsonSchema | undefined = tool.outputSchema
  const definition = toolDefinition({
    name: McpTool.name(tool.server, tool.name),
    description: tool.description ?? "",
    inputSchema: input,
    ...(output ? { outputSchema: output } : {}),
  }).server(async (args, context) => mcpOutput(tool, await call(isRecord(args) ? args : {}, context?.abortSignal)))
  return tool.codemode === false ? definition : inCodeMode(definition)
}

/** The value of an MCP result, as opencode's MCP tool gives it. A failed result throws its text. */
function mcpOutput(tool: Mcp.Tool, result: Mcp.ToolResult) {
  const text = result.content.flatMap((part) => (part.type === "text" ? [part.text] : [])).join("\n")
  if (result.isError) throw new Error(text.trim() || "MCP tool returned an error")
  if (result.content.some((part) => part.type === "media")) return result.content.map(contentPart)
  if (result.structured !== undefined) return result.structured
  if (text === "") return null
  // Agents expect JSON sent as text to be an object, when the server declares no output schema.
  const isJson = tool.outputSchema === undefined && (text.startsWith("{") || text.startsWith("["))
  return isJson ? Option.getOrElse(decodeJson(text), () => text) : text
}

function contentPart(part: Mcp.ToolResultContent): ContentPart {
  if (part.type === "text") return { type: "text", content: part.text }
  const source = { type: "data" as const, value: part.data, mimeType: part.mimeType }
  return part.mimeType.startsWith("image/") ? { type: "image", source } : { type: "document", source }
}

/**
 * A workspace backend and a plugin that report each file change of a tool call. The backend keeps the text of a
 * file before the first write of a call. The `afterWrite` hook, after the formatter, reads the new text. The
 * tool call id comes from the call that runs: the plugin runs each file tool inside it.
 */
function trackFileChanges(onFileChange: (change: FileChange) => void) {
  const call = new AsyncLocalStorage<string | undefined>()
  // The text before the call, by tool call and path. `undefined` for a file that the call added.
  const before = new Map<string, { readonly toolCallId: string; readonly text: string | undefined }>()
  const decoder = new TextDecoder("utf-8", { ignoreBOM: true })
  const read = async (file: string) => {
    const stat = await hostBackend.stat(file)
    return stat?.type === "file" ? decoder.decode(await hostBackend.readFile(file)) : undefined
  }
  const key = (toolCallId: string, file: string) => `${toolCallId}\n${file}`

  const backend: WorkspaceBackend = {
    ...hostBackend,
    writeFile: async (file, data) => {
      const toolCallId = call.getStore()
      if (toolCallId !== undefined && !before.has(key(toolCallId, file)))
        before.set(key(toolCallId, file), { toolCallId, text: await read(file) })
      await hostBackend.writeFile(file, data)
    },
    remove: async (file) => {
      const toolCallId = call.getStore()
      const text = toolCallId === undefined ? undefined : await read(file)
      await hostBackend.remove(file)
      if (toolCallId === undefined) return
      onFileChange({ toolCallId, path: file, before: text ?? "", after: "", status: "deleted" })
    },
  }

  const plugin = definePlugin({
    name: "opencode/file-changes",
    setup: () => ({
      prepareTools: ({ tools }) =>
        tools.map((tool) => {
          const execute = tool.execute
          if (!FILE_TOOLS.has(tool.name) || execute === undefined) return tool
          return {
            ...tool,
            execute: (args: unknown, context?: { toolCallId?: string }) =>
              call.run(context?.toolCallId, () => execute(args, context)),
          }
        }),
      contribute: [
        WorkspaceHooks.item({
          afterWrite: async (file) => {
            const toolCallId = call.getStore()
            const entry = toolCallId === undefined ? undefined : before.get(key(toolCallId, file))
            if (toolCallId === undefined || entry === undefined) return undefined
            before.delete(key(toolCallId, file))
            onFileChange({
              toolCallId,
              path: file,
              before: entry.text ?? "",
              after: (await read(file)) ?? "",
              status: entry.text === undefined ? "added" : "modified",
            })
            return undefined
          },
        }),
      ],
    }),
  })

  return { backend, plugin }
}
