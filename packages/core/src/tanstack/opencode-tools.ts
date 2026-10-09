export * as TanStackOpencodeTools from "./opencode-tools.js"

import { toolDefinition } from "@tanstack/ai"
import type { AnyTool, ContentPart } from "@tanstack/ai"
import { Effect, Schema } from "effect"
import { Agent } from "../agent.js"
import { Mcp } from "../mcp/index.js"
import { Model } from "../model.js"
import { Permission } from "../permission.js"
import { Provider } from "../provider.js"
import { AbsolutePath } from "../schema.js"
import { Session } from "../session.js"
import { SessionMessage } from "../session/message.js"
import { Tool } from "../tool.js"
import { OpenCodeTools } from "../tool/plugin/opencode.js"
import { definition, execute } from "../tool/runtime.js"
import { Wildcard } from "../util/wildcard.js"
import { harnessToolNames, toOpencodeName } from "./tool-names.js"

// The registry tools that the harness has its own tool for: `read` is `read_file`, `shell` is `bash`, and so on.
const REPLACED: ReadonlySet<string> = new Set(harnessToolNames.map(toOpencodeName))

// The output schemas of `tool/plugin/opencode.ts`, which does not export them.
const RenameOutput = Schema.Struct({ sessionID: Session.ID, title: Schema.String })

const MoveOutput = Schema.Struct({ sessionID: Session.ID, directory: AbsolutePath })

const ModelEntry = Schema.Struct({
  id: Schema.String.annotate({ description: "providerID/modelID" }),
  name: Schema.String,
  released: Model.Info.fields.time.fields.released.annotate({
    description: "Release date as a Unix timestamp in milliseconds, or 0 when unknown.",
  }),
  variants: Schema.Array(Model.VariantID),
  cost: Model.Info.fields.cost.annotate({ description: "Pricing in USD per million tokens." }),
  status: Model.Info.fields.status,
})

const ModelsOutput = Schema.Struct({
  providers: Schema.Array(
    Schema.Struct({
      id: Schema.String,
      name: Schema.String,
      models: Schema.Array(ModelEntry).annotate({ description: "Newest first." }),
    }),
  ).annotate({ description: "Matching models grouped by provider. Your own provider comes first." }),
  total: Schema.Int.annotate({ description: "Number of matching models across all pages." }),
  next: Schema.NullOr(Schema.Int).annotate({ description: "Offset of the next page, or null on the last page." }),
})

// The input and output schemas of `tool/plugin/mcp-resource.ts`, which declares them inline.
const ListMcpResourcesInput = Schema.Struct({
  server: Schema.optionalKey(
    Schema.String.annotate({ description: "MCP server name as configured. Omit to list every server." }),
  ),
})

const ListMcpResourcesOutput = Schema.Struct({
  resources: Schema.Array(Mcp.Resource),
  templates: Schema.Array(Mcp.ResourceTemplate),
})

const ReadMcpResourceInput = Schema.Struct({
  server: Schema.String.annotate({
    description: "The server field of the discovered resource.",
  }),
  uri: Schema.String.annotate({
    description: "Exact resource URI from discovery, an expanded uriTemplate, or the user.",
  }),
})

/**
 * Builds opencode's own tools as TanStack server tools, for the harness of one location:
 * `opencode_session_rename`, `opencode_session_move`, `opencode_models`,
 * `opencode_list_mcp_resources`, and `opencode_read_mcp_resource`.
 *
 * The names, descriptions, input schemas, and outputs are the same as in
 * `tool/plugin/opencode.ts` and `tool/plugin/mcp-resource.ts`. Each tool returns its structured
 * output, which is what Code Mode gives to the code. A failure rejects with a `Tool.Error` that
 * has the message of the original tool.
 *
 * Run it in the Effect context of the location: it uses `Session.Service`, `Provider.Service`,
 * `Model.Service`, and `Mcp.Service`, and the tools run their effects in that context.
 *
 * `sessionID` is the opencode session of the harness session. The session tools use it when
 * the model omits `sessionID`, and `opencode_models` lists the provider of its model first.
 *
 * The MCP tools do not call `Permission.Service`. The harness `permissions()` plugin checks
 * them by tool name.
 *
 * @example
 * const tools = yield* TanStackOpencodeTools.make({ sessionID: session.id })
 * definePlugin({ name: "opencode/tools", setup: () => ({ tools }) })
 */
export const make = Effect.fn("TanStackOpencodeTools.make")(function* (input: { readonly sessionID: Session.ID }) {
  const sessions = yield* Session.Service
  const providers = yield* Provider.Service
  const models = yield* Model.Service
  const mcp = yield* Mcp.Service
  const runPromise = Effect.runPromiseWith(yield* Effect.context<never>())

  return [
    serverTool(runPromise, {
      name: "session_rename",
      description:
        "Rename a session, or omit sessionID to rename the current session. Use a short, specific title that summarizes the work being done.",
      input: OpenCodeTools.RenameInput,
      output: RenameOutput,
      execute: (args) => {
        const sessionID = args.sessionID ?? input.sessionID
        const title = args.title.trim()
        if (!title) return Effect.fail(new Tool.Error({ message: "Session title must not be empty" }))
        return sessions.rename({ sessionID, title }).pipe(
          Effect.as({ sessionID, title }),
          Effect.mapError((error) => new Tool.Error({ message: `Unable to rename session ${sessionID}`, error })),
        )
      },
    }),
    serverTool(runPromise, {
      name: "session_move",
      description:
        "Move a session to another directory, or omit sessionID to move the current session. The current session moves at the next safe boundary; do not run destination-dependent tools in the same execute call.",
      input: OpenCodeTools.MoveInput,
      output: MoveOutput,
      execute: (args) => {
        const sessionID = args.sessionID ?? input.sessionID
        return sessions.move({ sessionID, directory: args.directory, delivery: "steer" }).pipe(
          Effect.as({ sessionID, directory: args.directory }),
          Effect.mapError((error) => new Tool.Error({ message: `Unable to move session to ${args.directory}`, error })),
        )
      },
    }),
    serverTool(runPromise, {
      name: "models",
      description:
        "Search the models available to use. Use this to turn a model name the user mentions into an exact reference before running a subagent on it. Check your own provider first.",
      input: OpenCodeTools.ModelsInput,
      output: ModelsOutput,
      execute: (args) =>
        Effect.gen(function* () {
          const offset = args.offset ?? 0
          const limit = args.limit ?? 20
          const own = (yield* sessions.get(input.sessionID)).model?.providerID
          const terms = args.query?.toLowerCase().split(/\s+/).filter(Boolean) ?? []
          const names = new Map((yield* providers.available()).map((provider) => [provider.id, provider.name]))
          const provider = args.provider?.toLowerCase()
          const matching = (yield* models.available())
            .filter(
              (model) =>
                provider === undefined ||
                model.providerID.toLowerCase() === provider ||
                names.get(model.providerID)?.toLowerCase() === provider,
            )
            .filter((model) => {
              const text = `${model.providerID}/${model.id} ${model.name}`.toLowerCase()
              return terms.every((term) => text.includes(term))
            })
            .toSorted(
              (left, right) =>
                Number(right.providerID === own) - Number(left.providerID === own) ||
                left.providerID.localeCompare(right.providerID) ||
                right.time.released - left.time.released,
            )
            // Only the newest model of each family, unless `all` is set.
            .filter((model, index, sorted) => {
              if (args.all || model.family === undefined) return true
              return (
                sorted.findIndex((other) => other.providerID === model.providerID && other.family === model.family) ===
                index
              )
            })
          const page = matching.slice(offset, offset + limit)
          const pageProviders = Array.from(new Set(page.map((model) => model.providerID)))
          return {
            providers: pageProviders.map((id) => ({
              id,
              name: names.get(id) ?? id,
              models: page
                .filter((model) => model.providerID === id)
                .map((model) => ({
                  id: `${model.providerID}/${model.id}`,
                  name: model.name,
                  released: model.time.released,
                  variants: model.variants.map((variant) => variant.id),
                  cost: model.cost,
                  status: model.status,
                })),
            })),
            total: matching.length,
            next: offset + limit < matching.length ? offset + limit : null,
          }
        }).pipe(Effect.mapError((error) => new Tool.Error({ message: "Unable to list models", error }))),
    }),
    serverTool(runPromise, {
      name: "list_mcp_resources",
      description:
        "List documents, records, and other data exposed by MCP servers. Use this when the user refers to something that is not a local file, such as a URI with a custom scheme, then load a match with read_mcp_resource. Each entry names the server to read it from. Templates are resources addressed by a parameter such as a record ID; fill in the uriTemplate placeholders before reading.",
      input: ListMcpResourcesInput,
      output: ListMcpResourcesOutput,
      execute: (args) => {
        if (args.server === undefined) return mcp.resourceCatalog()
        return mcp
          .resources({ server: args.server })
          .pipe(Effect.mapError((error) => new Tool.Error({ message: error.message, error })))
      },
    }),
    serverTool(runPromise, {
      name: "read_mcp_resource",
      description:
        "Read one MCP resource by server and URI. Not for local files. Always return the full contents rather than slicing or filtering them; oversized output is truncated automatically and the full content is saved to a file you can read. Images and PDFs are shown to you directly.",
      input: ReadMcpResourceInput,
      output: Mcp.ResourceContent,
      execute: (args) =>
        mcp.readResource(args).pipe(
          Effect.mapError(
            (error) =>
              new Tool.Error({
                message: `Unable to read MCP resource ${args.server}:${args.uri}: ${error.message}`,
                error,
              }),
          ),
          Effect.flatMap((resource) =>
            resource
              ? Effect.succeed(resource)
              : Effect.fail(
                  new Tool.Error({
                    message: `MCP server "${args.server}" is not connected or does not expose resources`,
                  }),
                ),
          ),
        ),
    }),
  ]
})

/**
 * A TanStack server tool for a tool in the `opencode` namespace. The name and the JSON Schemas come
 * from `definition` of the opencode tool runtime, so the model sees the same tool as before. The
 * call decodes its arguments with `input`, and encodes the result with `output`, as that runtime
 * does.
 */
function serverTool<Input extends Schema.Codec<unknown, unknown>, Output extends Schema.Codec<unknown, unknown>>(
  runPromise: <A, E>(effect: Effect.Effect<A, E>, options?: Effect.RunOptions) => Promise<A>,
  tool: {
    readonly name: string
    readonly description: string
    readonly input: Input
    readonly output: Output
    readonly execute: (input: Input["Type"]) => Effect.Effect<Output["Type"], Tool.Error>
  },
) {
  const run = (input: Input["Type"]) =>
    tool
      .execute(input)
      .pipe(
        Effect.flatMap((result) =>
          Schema.encodeEffect(tool.output)(result).pipe(
            Effect.mapError(
              (error) =>
                new Tool.Error({
                  message: `Tool returned an invalid value for its output schema: ${error.message}`,
                  error,
                }),
            ),
          ),
        ),
      )
  const described = definition({
    name: tool.name,
    description: tool.description,
    input: tool.input,
    output: tool.output,
    options: { namespace: "opencode" },
    execute: (input) => run(input).pipe(Effect.map((output) => ({ output }))),
  })
  return toolDefinition({
    name: described.name,
    description: described.description,
    inputSchema: described.inputSchema,
    outputSchema: described.outputSchema,
  }).server((args, context) =>
    runPromise(
      Schema.decodeUnknownEffect(tool.input)(args).pipe(
        Effect.mapError(
          (error) =>
            new Tool.Error({ message: `Invalid arguments for tool "${described.name}": ${error.message}`, error }),
        ),
        Effect.flatMap(run),
      ),
      { signal: context?.abortSignal },
    ),
  )
}

/**
 * The tools that plugins add to opencode's tool registry with `ctx.tool.transform`, as TanStack server tools for one
 * session. These are the `browser.*` tools of the browser plugin and the tools of other plugins. The harness has its
 * own tool for each opencode built-in tool, so those are left out.
 *
 * Each tool has the name, description, and schemas that opencode gives the model (`browser_tabs_open`). A tool that
 * opencode runs in Code Mode goes into Code Mode (`metadata.codeMode`) and gives its declared output, as in opencode's
 * Code Mode. A tool with `codemode: false` stays a tool call and gives the model its content: text, images, and files.
 * A failure rejects with the `Tool.Error` of the tool.
 *
 * The list follows opencode's catalog rule: a tool whose permission action the rules of the session's agent and of
 * the session deny for every resource is left out. The browser plugin denies `browser` until a desktop browser
 * attaches to the session, so call it again for each turn.
 *
 * Run it in the Effect context of the location: the tools run their effects in that context.
 *
 * @example
 * const tools = yield* TanStackOpencodeTools.registered({ sessionID: session.id })
 * definePlugin({ name: "opencode/registered-tools", setup: () => ({ discoverTools: () => tools }) })
 */
export const registered = Effect.fn("TanStackOpencodeTools.registered")(function* (input: {
  readonly sessionID: Session.ID
}) {
  const registry = yield* Tool.Service
  const sessions = yield* Session.Service
  const agents = yield* Agent.Service
  const runPromise = Effect.runPromiseWith(yield* Effect.context<never>())
  const session = yield* sessions.get(input.sessionID)
  const agent = yield* agents.select(session.agent)
  const rules = Permission.merge(agent.info?.permissions ?? [], session.permissions ?? [])
  const tools = yield* registry.list()
  return tools
    .filter((tool) => !REPLACED.has(tool.id) && !isWhollyDenied(tool.options?.permission ?? tool.id, rules))
    .map((tool) => registeredTool(runPromise, tool, { sessionID: input.sessionID, agent: agent.id }))
})

type Registered = Effect.Success<ReturnType<Tool.Interface["list"]>>[number]

/** A registry tool as a TanStack server tool. */
function registeredTool(
  runPromise: <A, E>(effect: Effect.Effect<A, E>, options?: Effect.RunOptions) => Promise<A>,
  tool: Registered,
  scope: { readonly sessionID: Session.ID; readonly agent: Agent.ID },
) {
  const described = definition(tool)
  const isCodeMode = tool.options?.codemode !== false
  const server = toolDefinition({
    name: described.name,
    description: described.description,
    inputSchema: described.inputSchema,
    ...(described.outputSchema ? { outputSchema: described.outputSchema } : {}),
  }).server(async (args, context) => {
    const callID = context?.toolCallId ?? crypto.randomUUID()
    const result = await runPromise(
      execute(tool, args, {
        ...scope,
        // The harness message id is not an opencode one, so the call id names the message.
        messageID: SessionMessage.ID.make(`msg_${callID}`),
        id: Tool.CallID.make(callID),
        progress: (metadata) =>
          Effect.sync(() => context?.emitCustomEvent("tool:progress", { ...metadata, toolCallId: callID })),
      }),
      { signal: context?.abortSignal },
    )
    return isCodeMode ? codeModeValue(result) : modelResult(result)
  })
  return isCodeMode ? inCodeMode(server) : server
}

/** The value that opencode's Code Mode gives the code for a result: the declared output, else the text. */
function codeModeValue(result: Tool.NormalizedResult) {
  if (result.output !== undefined) return result.output
  const text = result.content.flatMap((part) => (part.type === "text" ? [part.text] : [])).join("\n")
  return text === "" ? null : text
}

/** opencode's catalog rule: the last rule for the action denies every resource. */
function isWhollyDenied(action: string, rules: Permission.Ruleset) {
  const rule = rules.findLast((item) => Wildcard.match(action, item.action))
  return rule?.resource === "*" && rule.effect === "deny"
}

/** A tool that Code Mode takes when it is safe to run without a question. */
export function inCodeMode<Server extends AnyTool>(tool: Server) {
  return { ...tool, metadata: { ...tool.metadata, codeMode: true } }
}

/** The result that the model gets for an opencode tool result: its text, or its text and files. */
export function modelResult(result: Tool.Result) {
  if (typeof result.content === "string") return result.content
  const content = result.content ?? []
  if (content.length === 0) return JSON.stringify(result.output ?? null)
  if (content.every((part) => part.type === "text")) return content.map((part) => part.text).join("\n")
  return content.map(contentPart)
}

function contentPart(part: Tool.Content): ContentPart {
  if (part.type === "text") return { type: "text", content: part.text }
  const data = /^data:[^,]*;base64,(.*)$/s.exec(part.uri)?.[1]
  const source =
    data === undefined
      ? { type: "url" as const, value: part.uri }
      : { type: "data" as const, value: data, mimeType: part.mime }
  return part.mime.startsWith("image/") ? { type: "image", source } : { type: "document", source }
}
