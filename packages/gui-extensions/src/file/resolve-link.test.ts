import { describe, expect, test } from "bun:test"
import { parseFileLink, scoreWorkspaceCandidates, searchWorkspaceCandidates } from "./resolve-link"

const workspaceFiles = [
  "packages/app/src/app.tsx",
  "packages/app/src/index.ts",
  "packages/app/src/session/timeline/interaction.ts",
  "packages/app/src/workspaces/files/model.tsx",
  "packages/app/src/workspaces/files/path.ts",
  "packages/session-ui/src/index.ts",
  "packages/session-ui/src/components/markdown.tsx",
  "packages/session-ui/src/components/markdown-inline-code-kind.ts",
  "packages/session-ui/src/tools/tool-renderer.tsx",
  "packages/gui-extensions/src/file/renderer.tsx",
  "packages/gui-extensions/src/file/path.ts",
  "packages/core/src/filesystem/search.ts",
  "docs/README.md",
]

describe("parseFileLink", () => {
  test.each([
    ["packages/app/src/app.tsx", "packages/app/src/app.tsx", undefined],
    ["session/timeline/interaction.ts:74", "session/timeline/interaction.ts", { start: 74, end: 74 }],
    [
      "packages/app/src/workspaces/files/model.tsx:164:11",
      "packages/app/src/workspaces/files/model.tsx",
      { start: 164, end: 164 },
    ],
    ["src/components/markdown.tsx:398-410", "src/components/markdown.tsx", { start: 398, end: 410 }],
    ["src/components/markdown.tsx#L398", "src/components/markdown.tsx", { start: 398, end: 398 }],
    ["src/components/markdown.tsx#L398-L410", "src/components/markdown.tsx", { start: 398, end: 410 }],
    ["a/b.ts?x=1#L3", "a/b.ts", { start: 3, end: 3 }],
    ["foo.ts:0", "foo.ts", undefined],
    ["./a/../b.ts", "b.ts", undefined],
    ["..", "..", undefined],
    ["C:12", "C:12", undefined],
    ["../timeline/interaction.ts:74", "../timeline/interaction.ts", { start: 74, end: 74 }],
    ["src/C#/a.cs", "src/C#/a.cs", undefined],
    ["foo#bar.ts", "foo#bar.ts", undefined],
    ["docs/guide.md#usage", "docs/guide.md", undefined],
    ["foo.ts:12:", "foo.ts", { start: 12, end: 12 }],
    ["foo.ts:99999999999999999999", "foo.ts", undefined],
    ["\\\\server\\share\\x.ts", "//server/share/x.ts", undefined],
    ["file://server/share/x%20y.ts", "//server/share/x y.ts", undefined],
    ["a%2520b.ts", "a%2520b.ts", undefined],
    ["C:/foo/../../x.ts", "C:/x.ts", undefined],
    ["file:///C:/tmp/demo%20file.ts:12", "C:/tmp/demo file.ts", { start: 12, end: 12 }],
  ])("parses %s", (href, expectedPath, expectedSelection) => {
    const parsed = parseFileLink(href)
    expect(parsed.path).toBe(expectedPath)
    expect(parsed.selection).toEqual(expectedSelection)
  })
})

describe("scoreWorkspaceCandidates", () => {
  test("resolves exact paths, git diff prefixes, root folder prefixes, and scoped packages (Tier 1 & Tier 2)", () => {
    expect(scoreWorkspaceCandidates("packages/app/src/app.tsx", workspaceFiles)).toBe("packages/app/src/app.tsx")
    expect(scoreWorkspaceCandidates("b/packages/app/src/app.tsx#L42", workspaceFiles)).toBe("packages/app/src/app.tsx")
    expect(
      scoreWorkspaceCandidates("quiet-cactus/packages/app/src/app.tsx", workspaceFiles, { rootName: "quiet-cactus" }),
    ).toBe("packages/app/src/app.tsx")
    expect(scoreWorkspaceCandidates("packages/app/src/app.tsx", ["src/app.tsx"], { rootName: "app" })).toBe(
      "src/app.tsx",
    )
    expect(scoreWorkspaceCandidates("x/src/foo.ts", ["packages/x/src/foo.ts", "packages/y/x/src/foo.ts"])).toBe(
      "packages/x/src/foo.ts",
    )
    expect(
      scoreWorkspaceCandidates("quiet-cactus/src/x.ts", ["src/x.ts", "quiet-cactus/src/x.ts"], {
        rootName: "quiet-cactus",
      }),
    ).toBe("quiet-cactus/src/x.ts")
    expect(scoreWorkspaceCandidates("@opencode/session-ui/src/components/markdown.tsx", workspaceFiles)).toBe(
      "packages/session-ui/src/components/markdown.tsx",
    )
  })

  test("enforces strict tier priority so Tier 1 exact matches always beat deep or context-boosted Tier 2 suffix matches", () => {
    const deep = "a/b/c/d/e/f/g/h/i.ts"
    expect(scoreWorkspaceCandidates(deep, [deep, `packages/x/${deep}`])).toBe(deep)

    const target = "packages/app/src/session/timeline/interaction.ts"
    expect(
      scoreWorkspaceCandidates(target, [target, `fixtures/repo/${target}`], {
        activePath: "fixtures/repo/packages/app/src/session/timeline/screen.ts",
        openPaths: [`fixtures/repo/${target}`],
      }),
    ).toBe(target)
  })

  test("ranks literal a/src/index.ts suffix match above git-diff stripped src/index.ts", () => {
    expect(scoreWorkspaceCandidates("a/src/index.ts", ["packages/a/src/index.ts", "src/index.ts"])).toBe(
      "packages/a/src/index.ts",
    )
  })

  test("does not match unrelated external or node_modules prefixes via reverse suffix", () => {
    expect(scoreWorkspaceCandidates("node_modules/pkg/docs/README.md", ["docs/README.md"])).toBeUndefined()
    expect(scoreWorkspaceCandidates("../sibling/src/index.ts", ["src/index.ts"])).toBeUndefined()
  })

  test("resolves ../ relative paths against activePath or suffix-matches deeper workspace files", () => {
    expect(
      scoreWorkspaceCandidates("../timeline/interaction.ts:74", workspaceFiles, {
        activePath: "packages/app/src/session/screen.tsx",
      }),
    ).toBe("packages/app/src/session/timeline/interaction.ts")
    expect(scoreWorkspaceCandidates("../timeline/interaction.ts:74", workspaceFiles)).toBe(
      "packages/app/src/session/timeline/interaction.ts",
    )
  })

  test("resolves partial suffix paths, TypeScript .js import aliases, and extensionless doc stems", () => {
    expect(scoreWorkspaceCandidates("session/timeline/interaction.ts:74", workspaceFiles)).toBe(
      "packages/app/src/session/timeline/interaction.ts",
    )
    expect(scoreWorkspaceCandidates("src/components/markdown.tsx", workspaceFiles)).toBe(
      "packages/session-ui/src/components/markdown.tsx",
    )
    expect(scoreWorkspaceCandidates("src/filesystem/search.js", workspaceFiles)).toBe(
      "packages/core/src/filesystem/search.ts",
    )
    expect(scoreWorkspaceCandidates("src/foo.js", ["src/foo.ts", "packages/x/src/foo.ts"])).toBe("src/foo.ts")
    expect(scoreWorkspaceCandidates("src/foo.js", ["scripts/foo.js", "src/foo.ts"])).toBe("src/foo.ts")
    expect(scoreWorkspaceCandidates("src/foo.js", ["dist/foo.js", "packages/x/src/foo.ts"])).toBe(
      "packages/x/src/foo.ts",
    )
    expect(scoreWorkspaceCandidates("README", ["README.md", "docs/README.md"])).toBe("README.md")
    expect(scoreWorkspaceCandidates("README", workspaceFiles)).toBe("docs/README.md")
  })

  test("leaves equal-suffix matches at different depths unresolved unless context or case disambiguates them", () => {
    expect(
      scoreWorkspaceCandidates("src/index.ts", ["packages/a/src/index.ts", "packages/foo/bar/src/index.ts"]),
    ).toBeUndefined()
    expect(
      scoreWorkspaceCandidates("src/index.ts", ["packages/a/src/index.ts", "packages/foo/bar/src/index.ts"], {
        activePath: "packages/foo/bar/src/main.ts",
      }),
    ).toBe("packages/foo/bar/src/index.ts")
    expect(scoreWorkspaceCandidates("app.tsx", ["packages/a/App.tsx", "packages/b/app.tsx"])).toBe("packages/b/app.tsx")
  })

  test("resolves package-anchored directory segment subsequences when intermediate folders like src/ are omitted (Tier 3)", () => {
    expect(scoreWorkspaceCandidates("packages/session-ui/markdown.tsx", workspaceFiles)).toBe(
      "packages/session-ui/src/components/markdown.tsx",
    )
    expect(scoreWorkspaceCandidates("session-ui/markdown.tsx", workspaceFiles)).toBe(
      "packages/session-ui/src/components/markdown.tsx",
    )
    expect(scoreWorkspaceCandidates("src/utils.ts", ["packages/x/src/deep/nested/utils.ts"])).toBeUndefined()
  })

  test("resolves unique bare filenames and disambiguates duplicate basenames via active package context (Tier 4)", () => {
    expect(scoreWorkspaceCandidates("tool-renderer.tsx", workspaceFiles)).toBe(
      "packages/session-ui/src/tools/tool-renderer.tsx",
    )
    expect(
      scoreWorkspaceCandidates("path.ts", workspaceFiles, {
        activePath: "packages/app/src/session/timeline/interaction.ts",
      }),
    ).toBe("packages/app/src/workspaces/files/path.ts")
    expect(
      scoreWorkspaceCandidates("path.ts", workspaceFiles, {
        activePath: "packages/gui-extensions/src/file/renderer.tsx",
      }),
    ).toBe("packages/gui-extensions/src/file/path.ts")
  })

  test("leaves tied duplicate basenames unresolved when no context disambiguates them", () => {
    expect(scoreWorkspaceCandidates("index.ts", workspaceFiles)).toBeUndefined()
    expect(scoreWorkspaceCandidates("util.js", ["packages/a/util.ts", "packages/b/util.ts"])).toBeUndefined()
    expect(scoreWorkspaceCandidates("util.ts", ["p/util.ts", "p/q/r/s/t/u/v/w/x/util.ts"])).toBeUndefined()
  })

  test("returns undefined when no workspace file matches", () => {
    expect(scoreWorkspaceCandidates("nonexistent-widget.tsx", workspaceFiles)).toBeUndefined()
  })
})

describe("searchWorkspaceCandidates", () => {
  test("falls back across git-diff prefixes and .js import stems, and handles aborted signals", async () => {
    const queries: string[] = []

    const files = {
      root: "/repo/quiet-cactus",
      search: async (query: string, options?: { signal?: AbortSignal }) => {
        if (options?.signal?.aborted) throw new Error("Aborted")
        queries.push(query)

        if (query === "search") return ["packages/core/src/filesystem/search.ts"]

        return []
      },
    }

    const controller = new AbortController()

    const resolved = await searchWorkspaceCandidates({
      files,
      parsed: parseFileLink("src/filesystem/search.js"),
      signal: controller.signal,
    })

    expect(resolved).toBe("packages/core/src/filesystem/search.ts")
    expect(queries).toEqual(["src/filesystem/search.js", "search"])

    controller.abort()

    const aborted = await searchWorkspaceCandidates({
      files,
      parsed: parseFileLink("src/filesystem/search.js"),
      signal: controller.signal,
    })

    expect(aborted).toBeUndefined()
  })
})
