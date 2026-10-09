import { describe, expect } from "bun:test"
import path from "node:path"
import { mkdir } from "node:fs/promises"
import { Location } from "@opencode/core/location"
import { Mcp } from "@opencode/core/mcp/index"
import { Model } from "@opencode/core/model"
import { Provider } from "@opencode/core/provider"
import { AbsolutePath } from "@opencode/core/schema"
import { Session } from "@opencode/core/session"
import { TanStackOpencodeTools } from "@opencode/core/tanstack/opencode-tools"
import { Tool } from "@opencode/core/tool"
import { McpResourceTools } from "@opencode/core/tool/plugin/mcp-resource"
import { OpenCodeTools } from "@opencode/core/tool/plugin/opencode"
import { definition } from "@opencode/core/tool/runtime"
import { AppNodeBuilder } from "@opencode/core/effect/app-node-builder"
import { SessionExecution } from "@opencode/core/session/execution"
import { Global } from "@opencode/util/global"
import { LayerNode } from "@opencode/util/effect/layer-node"
import { Effect } from "effect"
import { tempGlobalLayer } from "../fixture/global"
import { tempLocationLayer } from "../fixture/location"
import { emptyMcp, emptyMcpLayer } from "../fixture/mcp"
import { offlineModels } from "../fixture/models"
import { tmpdirScoped } from "../fixture/tmpdir"
import { testEffect } from "../lib/effect"
import { registerToolPlugin } from "../lib/tool"
import { PluginTestLayer } from "../plugin/fixture"

const it = testEffect(PluginTestLayer)

// A move runs the session in its new location, so the models catalog of every location must stay offline.
const itMoves = testEffect(
  AppNodeBuilder.build(
    LayerNode.group([Session.node, SessionExecution.node, Location.node, Provider.node, Model.node, Mcp.node]),
    [
      Global.node.replace(tempGlobalLayer),
      Location.node.replace(tempLocationLayer),
      Mcp.node.replace(emptyMcpLayer),
      offlineModels,
    ],
  ),
)

type Tools = Effect.Success<ReturnType<typeof TanStackOpencodeTools.make>>

/** Creates a session in the test location, on the `test/alpha` model. */
const createSession = Effect.gen(function* () {
  const sessions = yield* Session.Service
  const location = yield* Location.Service
  return yield* sessions.create({
    location: Location.Ref.make({ directory: location.directory }),
    model: Model.Ref.make({ providerID: Provider.ID.make("test"), id: Model.ID.make("alpha") }),
  })
})

/** Creates a session and the tools for it. */
const setup = Effect.gen(function* () {
  const session = yield* createSession
  const tools = yield* TanStackOpencodeTools.make({ sessionID: session.id })
  return { session, tools }
})

/** Runs the execute function of a tool, as the harness does. */
const call = (tools: Tools, name: string, args: unknown) =>
  Effect.tryPromise({
    try: async () => {
      const tool = tools.find((item) => item.name === name)
      if (!tool?.execute) throw new Error(`No tool ${name}`)
      return tool.execute(args)
    },
    catch: (error) => error,
  })

/** The message of the error that a tool call rejects with. */
const failure = (tools: Tools, name: string, args: unknown) =>
  call(tools, name, args).pipe(
    Effect.flip,
    Effect.map((error) => (error instanceof Tool.Error ? error.message : `not a Tool.Error: ${String(error)}`)),
  )

/** Runs `effect` with an MCP service whose resource methods are replaced. */
const withMcp = <A, E, R>(
  resources: Pick<Mcp.Interface, "resourceCatalog" | "resources" | "readResource">,
  effect: Effect.Effect<A, E, R>,
) => effect.pipe(Effect.provideService(Mcp.Service, Mcp.Service.of({ ...emptyMcp, ...resources })))

/** What the model sees of each tool, sorted by name. */
const describeTools = (
  tools: ReadonlyArray<{ name: string; description: string; inputSchema?: unknown; outputSchema?: unknown }>,
) =>
  tools
    .map((tool) => ({
      name: tool.name,
      description: tool.description,
      inputSchema: tool.inputSchema,
      outputSchema: tool.outputSchema,
    }))
    .toSorted((left, right) => left.name.localeCompare(right.name))

describe("TanStackOpencodeTools", () => {
  it.effect("has the names, descriptions, and schemas of the opencode tools", () =>
    Effect.gen(function* () {
      yield* registerToolPlugin(OpenCodeTools.Plugin)
      yield* registerToolPlugin(McpResourceTools.Plugin)
      const registry = yield* Tool.Service
      const registered = yield* registry.list()
      const originals = describeTools(registered.map(definition).filter((tool) => tool.name.startsWith("opencode_")))
      const { tools } = yield* setup

      expect(originals.map((tool) => tool.name)).toEqual([
        "opencode_list_mcp_resources",
        "opencode_models",
        "opencode_read_mcp_resource",
        "opencode_session_move",
        "opencode_session_rename",
      ])
      expect(describeTools(tools)).toEqual(originals)
    }),
  )

  describe("opencode_session_rename", () => {
    it.effect("renames the current session, or the session that the model names", () =>
      Effect.gen(function* () {
        const sessions = yield* Session.Service
        const { session, tools } = yield* setup
        const other = yield* createSession

        expect(yield* call(tools, "opencode_session_rename", { title: "  Fix the parser  " })).toEqual({
          sessionID: session.id,
          title: "Fix the parser",
        })
        expect((yield* sessions.get(session.id)).title).toBe("Fix the parser")

        expect(yield* call(tools, "opencode_session_rename", { sessionID: other.id, title: "Other work" })).toEqual({
          sessionID: other.id,
          title: "Other work",
        })
        expect((yield* sessions.get(other.id)).title).toBe("Other work")
        expect((yield* sessions.get(session.id)).title).toBe("Fix the parser")
      }),
    )

    it.effect("rejects a title of only spaces", () =>
      Effect.gen(function* () {
        const sessions = yield* Session.Service
        const { session, tools } = yield* setup
        const before = (yield* sessions.get(session.id)).title

        expect(yield* failure(tools, "opencode_session_rename", { title: "   " })).toBe(
          "Session title must not be empty",
        )
        expect((yield* sessions.get(session.id)).title).toBe(before)
      }),
    )

    it.effect("fails for a session that does not exist", () =>
      Effect.gen(function* () {
        const { tools } = yield* setup

        expect(yield* failure(tools, "opencode_session_rename", { sessionID: "ses_missing", title: "Lost" })).toBe(
          "Unable to rename session ses_missing",
        )
      }),
    )
  })

  describe("opencode_session_move", () => {
    itMoves.effect("moves the current session to another directory", () =>
      Effect.gen(function* () {
        const sessions = yield* Session.Service
        const tmp = yield* tmpdirScoped()
        const destination = AbsolutePath.make(path.join(tmp.path, "destination"))
        yield* Effect.promise(() => mkdir(destination))
        const { session, tools } = yield* setup

        expect(yield* call(tools, "opencode_session_move", { directory: destination })).toEqual({
          sessionID: session.id,
          directory: destination,
        })
        yield* sessions.wait(session.id)
        expect((yield* sessions.get(session.id)).location.directory).toBe(destination)
      }),
    )

    itMoves.effect("fails for a directory that does not exist", () =>
      Effect.gen(function* () {
        const sessions = yield* Session.Service
        const tmp = yield* tmpdirScoped()
        const missing = path.join(tmp.path, "missing")
        const { session, tools } = yield* setup

        expect(yield* failure(tools, "opencode_session_move", { directory: missing })).toBe(
          `Unable to move session to ${missing}`,
        )
        expect((yield* sessions.get(session.id)).location.directory).toBe(session.location.directory)
      }),
    )
  })

  describe("opencode_models", () => {
    const alpha = { id: "test/alpha", name: "Alpha", released: 300, variants: ["fast"], cost: [], status: "beta" }
    const beta = { id: "other/beta", name: "Beta", released: 200, variants: [], cost: [], status: "active" }
    const gamma = { id: "other/gamma", name: "Gamma Flash", released: 100, variants: [], cost: [], status: "active" }
    const gammaOld = {
      id: "other/gamma-old",
      name: "Gamma Flash Old",
      released: 50,
      variants: [],
      cost: [],
      status: "active",
    }

    // `test/alpha` is the model of the session. `gamma-old` is an older model of the `gamma` family.
    const catalog = Effect.gen(function* () {
      const providers = yield* Provider.Service
      yield* providers.transform((editor) => {
        editor.update(Provider.ID.make("other"), (provider) => {
          provider.name = "Other Provider"
        })
        editor.models.update(Provider.ID.make("test"), Model.ID.make("alpha"), (model) => {
          model.name = "Alpha"
          model.time.released = 300
          model.variants = [{ id: Model.VariantID.make("fast") }]
          model.status = "beta"
        })
        editor.models.update(Provider.ID.make("other"), Model.ID.make("beta"), (model) => {
          model.name = "Beta"
          model.time.released = 200
        })
        editor.models.update(Provider.ID.make("other"), Model.ID.make("gamma"), (model) => {
          model.name = "Gamma Flash"
          model.time.released = 100
          model.family = Model.Family.make("gamma")
        })
        editor.models.update(Provider.ID.make("other"), Model.ID.make("gamma-old"), (model) => {
          model.name = "Gamma Flash Old"
          model.time.released = 50
          model.family = Model.Family.make("gamma")
        })
        editor.models.update(Provider.ID.make("other"), Model.ID.make("disabled"), (model) => {
          model.time.released = 400
          model.enabled = false
        })
      })
    })

    it.effect("lists the newest model of each family, own provider first, without disabled models", () =>
      Effect.gen(function* () {
        yield* catalog
        const { tools } = yield* setup

        expect(yield* call(tools, "opencode_models", {})).toEqual({
          providers: [
            { id: "test", name: "test", models: [alpha] },
            { id: "other", name: "Other Provider", models: [beta, gamma] },
          ],
          total: 3,
          next: null,
        })
        expect(yield* call(tools, "opencode_models", { all: true })).toEqual({
          providers: [
            { id: "test", name: "test", models: [alpha] },
            { id: "other", name: "Other Provider", models: [beta, gamma, gammaOld] },
          ],
          total: 4,
          next: null,
        })
      }),
    )

    it.effect("pages through the models", () =>
      Effect.gen(function* () {
        yield* catalog
        const { tools } = yield* setup

        expect(yield* call(tools, "opencode_models", { limit: 2 })).toEqual({
          providers: [
            { id: "test", name: "test", models: [alpha] },
            { id: "other", name: "Other Provider", models: [beta] },
          ],
          total: 3,
          next: 2,
        })
        expect(yield* call(tools, "opencode_models", { limit: 2, offset: 2 })).toEqual({
          providers: [{ id: "other", name: "Other Provider", models: [gamma] }],
          total: 3,
          next: null,
        })
      }),
    )

    it.effect("filters by provider name and by every word of the query", () =>
      Effect.gen(function* () {
        yield* catalog
        const { tools } = yield* setup

        expect(yield* call(tools, "opencode_models", { provider: "other provider", query: "FLASH" })).toEqual({
          providers: [{ id: "other", name: "Other Provider", models: [gamma] }],
          total: 1,
          next: null,
        })
        expect(yield* call(tools, "opencode_models", { query: "gamma beta" })).toEqual({
          providers: [],
          total: 0,
          next: null,
        })
      }),
    )
  })

  describe("opencode_list_mcp_resources", () => {
    const everything = Mcp.ResourceCatalog.make({
      resources: [
        { server: "docs", name: "Readme", uri: "docs://readme" },
        { server: "issues", name: "Issue 1", uri: "issue://1" },
      ],
      templates: [{ server: "docs", name: "File", uriTemplate: "docs://{path}" }],
    })
    const docs = Mcp.ResourceCatalog.make({
      resources: [{ server: "docs", name: "Readme", uri: "docs://readme" }],
      templates: [{ server: "docs", name: "File", uriTemplate: "docs://{path}" }],
    })
    const resources = {
      resourceCatalog: () => Effect.succeed(everything),
      resources: (input: { readonly server: string }) =>
        input.server === "docs" ? Effect.succeed(docs) : Effect.fail(new Error(`server ${input.server} is offline`)),
      readResource: () => Effect.undefined,
    }

    it.effect("lists every server, or one server", () =>
      withMcp(
        resources,
        Effect.gen(function* () {
          const { tools } = yield* setup

          expect(yield* call(tools, "opencode_list_mcp_resources", {})).toEqual({
            resources: [
              { server: "docs", name: "Readme", uri: "docs://readme" },
              { server: "issues", name: "Issue 1", uri: "issue://1" },
            ],
            templates: [{ server: "docs", name: "File", uriTemplate: "docs://{path}" }],
          })
          expect(yield* call(tools, "opencode_list_mcp_resources", { server: "docs" })).toEqual({
            resources: [{ server: "docs", name: "Readme", uri: "docs://readme" }],
            templates: [{ server: "docs", name: "File", uriTemplate: "docs://{path}" }],
          })
        }),
      ),
    )

    it.effect("fails with the error of the server", () =>
      withMcp(
        resources,
        Effect.gen(function* () {
          const { tools } = yield* setup

          expect(yield* failure(tools, "opencode_list_mcp_resources", { server: "issues" })).toBe(
            "server issues is offline",
          )
        }),
      ),
    )
  })

  describe("opencode_read_mcp_resource", () => {
    const content = Mcp.ResourceContent.make({
      server: "docs",
      uri: "docs://readme",
      contents: [
        { type: "text", uri: "docs://readme", text: "hello", mimeType: "text/plain" },
        { type: "blob", uri: "docs://logo", blob: "aGVsbG8=", mimeType: "image/png" },
      ],
    })
    const resources = {
      resourceCatalog: () => Effect.succeed(Mcp.ResourceCatalog.make({ resources: [], templates: [] })),
      resources: () => Effect.succeed(Mcp.ResourceCatalog.make({ resources: [], templates: [] })),
      readResource: (input: { readonly server: string; readonly uri: string }) => {
        if (input.server === "offline") return Effect.undefined
        if (input.uri === "docs://missing") return Effect.fail(new Error("Resource not found"))
        return Effect.succeed(content)
      },
    }

    it.effect("reads a resource", () =>
      withMcp(
        resources,
        Effect.gen(function* () {
          const { tools } = yield* setup

          expect(yield* call(tools, "opencode_read_mcp_resource", { server: "docs", uri: "docs://readme" })).toEqual({
            server: "docs",
            uri: "docs://readme",
            contents: [
              { type: "text", uri: "docs://readme", text: "hello", mimeType: "text/plain" },
              { type: "blob", uri: "docs://logo", blob: "aGVsbG8=", mimeType: "image/png" },
            ],
          })
        }),
      ),
    )

    it.effect("fails when the server has no resources", () =>
      withMcp(
        resources,
        Effect.gen(function* () {
          const { tools } = yield* setup

          expect(yield* failure(tools, "opencode_read_mcp_resource", { server: "offline", uri: "docs://readme" })).toBe(
            'MCP server "offline" is not connected or does not expose resources',
          )
        }),
      ),
    )

    it.effect("fails with the server and the URI when the read fails", () =>
      withMcp(
        resources,
        Effect.gen(function* () {
          const { tools } = yield* setup

          expect(yield* failure(tools, "opencode_read_mcp_resource", { server: "docs", uri: "docs://missing" })).toBe(
            "Unable to read MCP resource docs:docs://missing: Resource not found",
          )
        }),
      ),
    )
  })
})
