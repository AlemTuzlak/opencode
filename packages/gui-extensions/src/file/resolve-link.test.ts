import { describe, expect, test } from "bun:test"
import { parseFileLink, searchWorkspaceCandidates } from "./resolve-link"

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

function fuzzyMatches(query: string, target: string) {
  const q = query.toLowerCase()
  const t = target.toLowerCase()
  let qi = 0

  for (const ch of t) {
    if (ch === q[qi]) qi += 1
  }

  return qi === q.length
}

function resolve(href: string, candidates: readonly string[], options?: { rootName?: string; activePath?: string }) {
  return searchWorkspaceCandidates({
    files: {
      root: `/repo/${options?.rootName ?? "workspace"}`,
      search: async (query) => candidates.filter((item) => fuzzyMatches(query, item)),
    },
    parsed: parseFileLink(href),
    activePath: options?.activePath,
    signal: new AbortController().signal,
  })
}

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
    ["file:///C:/repo/a/b.ts?x=1#L3", "C:/repo/a/b.ts", { start: 3, end: 3 }],
    ["what?.md", "what?.md", undefined],
    ["a#b.md#L10", "a#b.md", { start: 10, end: 10 }],
    ["foo.ts:0", "foo.ts", undefined],
    ["./a/../b.ts", "b.ts", undefined],
    ["..", "..", undefined],
    ["C:12", "C:12", undefined],
    ["../timeline/interaction.ts:74", "../timeline/interaction.ts", { start: 74, end: 74 }],
    ["src/C#/a.cs", "src/C#/a.cs", undefined],
    ["foo#bar.ts", "foo#bar.ts", undefined],
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

describe("searchWorkspaceCandidates", () => {
  test("resolves exact paths, git diff prefixes, root folder prefixes, and scoped packages (Tier 1 & Tier 2)", async () => {
    expect(await resolve("packages/app/src/app.tsx", workspaceFiles)).toEqual({
      kind: "match",
      path: "packages/app/src/app.tsx",
    })
    expect(await resolve("b/packages/app/src/app.tsx#L42", workspaceFiles)).toEqual({
      kind: "match",
      path: "packages/app/src/app.tsx",
    })
    expect(
      await resolve("quiet-cactus/packages/app/src/app.tsx", workspaceFiles, { rootName: "quiet-cactus" }),
    ).toEqual({
      kind: "match",
      path: "packages/app/src/app.tsx",
    })
    expect(await resolve("x/src/foo.ts", ["packages/x/src/foo.ts", "packages/y/x/src/foo.ts"])).toEqual({
      kind: "match",
      path: "packages/x/src/foo.ts",
    })
    expect(
      await resolve("quiet-cactus/src/x.ts", ["src/x.ts", "quiet-cactus/src/x.ts"], {
        rootName: "quiet-cactus",
      }),
    ).toEqual({
      kind: "match",
      path: "quiet-cactus/src/x.ts",
    })
    expect(await resolve("@opencode/session-ui/src/components/markdown.tsx", workspaceFiles)).toEqual({
      kind: "match",
      path: "packages/session-ui/src/components/markdown.tsx",
    })
  })

  test("enforces strict tier priority so Tier 1 exact matches always beat deep Tier 2 suffix matches", async () => {
    const deep = "a/b/c/d/e/f/g/h/i.ts"
    expect(await resolve(deep, [deep, `packages/x/${deep}`])).toEqual({
      kind: "match",
      path: deep,
    })

    const target = "packages/app/src/session/timeline/interaction.ts"
    expect(
      await resolve(target, [target, `fixtures/repo/${target}`], {
        activePath: "fixtures/repo/packages/app/src/session/timeline/screen.ts",
      }),
    ).toEqual({
      kind: "match",
      path: target,
    })
  })

  test("ranks literal a/src/index.ts suffix match above git-diff stripped src/index.ts", async () => {
    expect(await resolve("a/src/index.ts", ["packages/a/src/index.ts", "src/index.ts"])).toEqual({
      kind: "match",
      path: "packages/a/src/index.ts",
    })
  })

  test("does not match unrelated external or node_modules prefixes via reverse suffix", async () => {
    expect(await resolve("node_modules/pkg/docs/README.md", ["docs/README.md"])).toEqual({
      kind: "none",
    })
    expect(await resolve("../sibling/src/index.ts", ["src/index.ts"])).toEqual({
      kind: "none",
    })
  })

  test("resolves ../ relative paths against activePath or suffix-matches deeper workspace files", async () => {
    expect(
      await resolve("../timeline/interaction.ts:74", workspaceFiles, {
        activePath: "packages/app/src/session/screen.tsx",
      }),
    ).toEqual({
      kind: "match",
      path: "packages/app/src/session/timeline/interaction.ts",
    })
    expect(await resolve("../timeline/interaction.ts:74", workspaceFiles)).toEqual({
      kind: "match",
      path: "packages/app/src/session/timeline/interaction.ts",
    })
  })

  test("resolves partial suffix paths, TypeScript .js import aliases, and extensionless doc stems", async () => {
    expect(await resolve("session/timeline/interaction.ts:74", workspaceFiles)).toEqual({
      kind: "match",
      path: "packages/app/src/session/timeline/interaction.ts",
    })
    expect(await resolve("src/components/markdown.tsx", workspaceFiles)).toEqual({
      kind: "match",
      path: "packages/session-ui/src/components/markdown.tsx",
    })
    expect(await resolve("src/filesystem/search.js", workspaceFiles)).toEqual({
      kind: "match",
      path: "packages/core/src/filesystem/search.ts",
    })
    expect(await resolve("src/foo.js", ["src/foo.ts", "packages/x/src/foo.ts"])).toEqual({
      kind: "match",
      path: "src/foo.ts",
    })
    expect(await resolve("src/foo.js", ["scripts/foo.js", "src/foo.ts"])).toEqual({
      kind: "match",
      path: "src/foo.ts",
    })
    expect(await resolve("src/foo.js", ["dist/foo.js", "packages/x/src/foo.ts"])).toEqual({
      kind: "match",
      path: "packages/x/src/foo.ts",
    })
    expect(await resolve("foo.js", ["src/foo.ts"])).toEqual({
      kind: "match",
      path: "src/foo.ts",
    })
    expect(await resolve("README", ["README.md", "docs/README.md"])).toEqual({
      kind: "match",
      path: "README.md",
    })
    expect(await resolve("README", workspaceFiles)).toEqual({
      kind: "match",
      path: "docs/README.md",
    })
  })

  test("marks equal-suffix matches at different depths as ambiguous unless case disambiguates them", async () => {
    expect(await resolve("src/index.ts", ["packages/a/src/index.ts", "packages/foo/bar/src/index.ts"])).toEqual({
      kind: "ambiguous",
      query: "src/index.ts",
    })
    expect(
      await resolve("src/index.ts", ["packages/a/src/index.ts", "packages/foo/bar/src/index.ts"], {
        activePath: "packages/foo/bar/src/main.ts",
      }),
    ).toEqual({
      kind: "ambiguous",
      query: "src/index.ts",
    })
    expect(await resolve("app.tsx", ["packages/a/App.tsx", "packages/b/app.tsx"])).toEqual({
      kind: "match",
      path: "packages/b/app.tsx",
    })
  })

  test("resolves package-anchored directory segment subsequences when intermediate folders like src/ are omitted (Tier 3)", async () => {
    expect(await resolve("packages/session-ui/markdown.tsx", workspaceFiles)).toEqual({
      kind: "match",
      path: "packages/session-ui/src/components/markdown.tsx",
    })
    expect(await resolve("session-ui/markdown.tsx", workspaceFiles)).toEqual({
      kind: "match",
      path: "packages/session-ui/src/components/markdown.tsx",
    })
    expect(await resolve("src/utils.ts", ["packages/x/src/deep/nested/utils.ts"])).toEqual({
      kind: "none",
    })
  })

  test("resolves unique bare filenames and marks duplicate basenames as ambiguous regardless of active tab (Tier 4)", async () => {
    expect(await resolve("tool-renderer.tsx", workspaceFiles)).toEqual({
      kind: "match",
      path: "packages/session-ui/src/tools/tool-renderer.tsx",
    })
    expect(
      await resolve("path.ts", workspaceFiles, {
        activePath: "packages/app/src/session/timeline/interaction.ts",
      }),
    ).toEqual({
      kind: "ambiguous",
      query: "path.ts",
    })
    expect(
      await resolve("path.ts", workspaceFiles, {
        activePath: "packages/gui-extensions/src/file/renderer.tsx",
      }),
    ).toEqual({
      kind: "ambiguous",
      query: "path.ts",
    })
  })

  test("marks tied duplicate basenames as ambiguous and normalizes .js alias picker queries", async () => {
    expect(await resolve("index.ts", workspaceFiles)).toEqual({
      kind: "ambiguous",
      query: "index.ts",
    })
    expect(await resolve("util.js", ["packages/a/util.ts", "packages/b/util.ts"])).toEqual({
      kind: "ambiguous",
      query: "util.ts",
    })
    expect(await resolve("util.ts", ["p/util.ts", "p/q/r/s/t/u/v/w/x/util.ts"])).toEqual({
      kind: "ambiguous",
      query: "util.ts",
    })
  })

  test("returns directory resolution when the link targets a folder with files", async () => {
    expect(await resolve("packages/session-ui/src/components", workspaceFiles)).toEqual({
      kind: "directory",
      query: "packages/session-ui/src/components/",
    })
  })

  test("returns none when no workspace file matches", async () => {
    expect(await resolve("nonexistent-widget.tsx", workspaceFiles)).toEqual({
      kind: "none",
    })
  })

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

    expect(resolved).toEqual({
      kind: "match",
      path: "packages/core/src/filesystem/search.ts",
    })
    expect(queries).toEqual(["src/filesystem/search.js", "search"])

    controller.abort()

    const aborted = await searchWorkspaceCandidates({
      files,
      parsed: parseFileLink("src/filesystem/search.js"),
      signal: controller.signal,
    })

    expect(aborted).toEqual({ kind: "none" })
  })
})
