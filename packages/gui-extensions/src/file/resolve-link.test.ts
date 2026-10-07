import { describe, expect, test } from "bun:test"
import { parseFileLink, scoreWorkspaceCandidates } from "./resolve-link"

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
]

describe("parseFileLink", () => {
  test.each([
    ["packages/app/src/app.tsx", "packages/app/src/app.tsx", undefined],
    ["session/timeline/interaction.ts:74", "session/timeline/interaction.ts", { start: 74, end: 74 }],
    ["packages/app/src/workspaces/files/model.tsx:164:11", "packages/app/src/workspaces/files/model.tsx", { start: 164, end: 164 }],
    ["src/components/markdown.tsx:398-410", "src/components/markdown.tsx", { start: 398, end: 410 }],
    ["src/components/markdown.tsx#L398", "src/components/markdown.tsx", { start: 398, end: 398 }],
    ["src/components/markdown.tsx#L398-L410", "src/components/markdown.tsx", { start: 398, end: 410 }],
    ["file:///C:/tmp/demo%20file.ts:12", "C:/tmp/demo file.ts", { start: 12, end: 12 }],
  ])("parses %s", (href, expectedPath, expectedSelection) => {
    const parsed = parseFileLink(href)
    expect(parsed.path).toBe(expectedPath)
    expect(parsed.selection).toEqual(expectedSelection)
  })
})

describe("scoreWorkspaceCandidates", () => {
  test("resolves exact paths, git diff prefixes, root folder prefixes, and scoped packages (Tier 1)", () => {
    expect(scoreWorkspaceCandidates("packages/app/src/app.tsx", workspaceFiles)).toEqual({
      kind: "match",
      path: "packages/app/src/app.tsx",
    })
    expect(scoreWorkspaceCandidates("b/packages/app/src/app.tsx#L42", workspaceFiles)).toEqual({
      kind: "match",
      path: "packages/app/src/app.tsx",
    })
    expect(
      scoreWorkspaceCandidates("quiet-cactus/packages/app/src/app.tsx", workspaceFiles, { rootName: "quiet-cactus" }),
    ).toEqual({
      kind: "match",
      path: "packages/app/src/app.tsx",
    })
    expect(scoreWorkspaceCandidates("@opencode/session-ui/src/components/markdown.tsx", workspaceFiles)).toEqual({
      kind: "match",
      path: "packages/session-ui/src/components/markdown.tsx",
    })
  })

  test("resolves partial suffix paths and TypeScript .js import aliases (Tier 2)", () => {
    expect(scoreWorkspaceCandidates("session/timeline/interaction.ts:74", workspaceFiles)).toEqual({
      kind: "match",
      path: "packages/app/src/session/timeline/interaction.ts",
    })
    expect(scoreWorkspaceCandidates("src/components/markdown.tsx", workspaceFiles)).toEqual({
      kind: "match",
      path: "packages/session-ui/src/components/markdown.tsx",
    })
    expect(scoreWorkspaceCandidates("src/filesystem/search.js", workspaceFiles)).toEqual({
      kind: "match",
      path: "packages/core/src/filesystem/search.ts",
    })
  })

  test("resolves ordered directory segment subsequences when intermediate folders like src/ are omitted (Tier 3)", () => {
    expect(scoreWorkspaceCandidates("packages/session-ui/markdown.tsx", workspaceFiles)).toEqual({
      kind: "match",
      path: "packages/session-ui/src/components/markdown.tsx",
    })
  })

  test("resolves unique bare filenames and disambiguates duplicate basenames via active package context (Tier 4)", () => {
    expect(scoreWorkspaceCandidates("tool-renderer.tsx", workspaceFiles)).toEqual({
      kind: "match",
      path: "packages/session-ui/src/tools/tool-renderer.tsx",
    })
    expect(
      scoreWorkspaceCandidates("path.ts", workspaceFiles, {
        activePath: "packages/app/src/session/timeline/interaction.ts",
      }),
    ).toEqual({
      kind: "match",
      path: "packages/app/src/workspaces/files/path.ts",
    })
    expect(
      scoreWorkspaceCandidates("path.ts", workspaceFiles, {
        activePath: "packages/gui-extensions/src/file/renderer.tsx",
      }),
    ).toEqual({
      kind: "match",
      path: "packages/gui-extensions/src/file/path.ts",
    })
  })

  test("marks tied duplicate basenames as ambiguous when no context disambiguates them", () => {
    expect(scoreWorkspaceCandidates("index.ts", workspaceFiles)).toEqual({
      kind: "ambiguous",
      path: "packages/app/src/index.ts",
      query: "index.ts",
      matches: ["packages/app/src/index.ts", "packages/session-ui/src/index.ts"],
    })
  })

  test("returns directory resolution when the link targets a folder with multiple files", () => {
    expect(scoreWorkspaceCandidates("packages/session-ui/src/components", workspaceFiles)).toEqual({
      kind: "directory",
      query: "packages/session-ui/src/components/",
      matches: [
        "packages/session-ui/src/components/markdown.tsx",
        "packages/session-ui/src/components/markdown-inline-code-kind.ts",
      ],
    })
  })

  test("returns none when no workspace file matches", () => {
    expect(scoreWorkspaceCandidates("nonexistent-widget.tsx", workspaceFiles)).toEqual({
      kind: "none",
    })
  })
})
