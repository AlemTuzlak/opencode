import { describe, expect, test } from "bun:test"
import { decidePermission } from "@tanstack/ai-harness"
import type { CallResources, PermissionRule } from "@tanstack/ai-harness"
import { Agent } from "@opencode/schema/agent"
import { Permission } from "@opencode/core/permission"
import { TanStackRules } from "@opencode/core/tanstack/rules"

const root = "/repo"

// The rules that workspaceTools() adds before the user's rules
// (vendor/tanstack/ai-harness/src/first-party/coding/workspace.ts).
const workspace: PermissionRule[] = [
  { tool: "read_file", decision: "allow", kind: "read" },
  { tool: "list_files", decision: "allow", kind: "read" },
  { tool: "grep", decision: "allow", kind: "read" },
  { tool: "write_file", decision: "ask", kind: "edit" },
  { tool: "edit_file", decision: "ask", kind: "edit" },
  { tool: "patch", decision: "ask", kind: "edit" },
  { tool: "bash", decision: "ask", kind: "execute" },
  { tool: "webfetch", decision: "ask" },
]

const defaults = Agent.Info.default(Agent.ID.make("build")).permissions

const readOnly: Permission.Ruleset = [
  { action: "*", resource: "*", effect: "deny" },
  { action: "shell", resource: "*", effect: "allow" },
  { action: "glob", resource: "*", effect: "allow" },
  { action: "read", resource: "*", effect: "allow" },
  { action: "read", resource: "*.env", effect: "ask" },
  { action: "external_directory", resource: "*", effect: "allow" },
]

const shell: Permission.Ruleset = [
  { action: "*", resource: "*", effect: "allow" },
  { action: "shell", resource: "*", effect: "ask" },
  { action: "shell", resource: "git *", effect: "allow" },
  { action: "shell", resource: "git push *", effect: "deny" },
]

const paths: Permission.Ruleset = [
  { action: "*", resource: "*", effect: "ask" },
  { action: "edit", resource: "src/*", effect: "allow" },
  { action: "edit", resource: "src/generated/*", effect: "deny" },
  { action: "read", resource: "*/secret/*", effect: "deny" },
]

const noMatch: Permission.Ruleset = [{ action: "read", resource: "src/*", effect: "allow" }]

const prefix: Permission.Ruleset = [
  { action: "*", resource: "*", effect: "allow" },
  { action: "list*", resource: "*", effect: "deny" },
]

const wildcardAction: Permission.Ruleset = [
  { action: "*", resource: "*", effect: "allow" },
  { action: "re?d", resource: "*", effect: "deny" },
]

interface Call {
  readonly tool: string
  readonly action: string
  readonly resource: string
  readonly resources?: CallResources
}

function path(tool: string, action: string, resource: string): Call {
  return { tool, action, resource, resources: { paths: [resource] } }
}

function command(resource: string): Call {
  return { tool: "bash", action: "shell", resource, resources: { commands: [resource] } }
}

/** A tool that declares no resources to the harness, like an MCP tool. */
function opaque(tool: string, resource: string): Call {
  return { tool, action: tool, resource }
}

const cases = [
  {
    name: "defaults allow a normal read",
    rules: defaults,
    call: path("read_file", "read", "src/index.ts"),
    expected: "allow",
  },
  { name: "defaults ask to read .env", rules: defaults, call: path("read_file", "read", ".env"), expected: "ask" },
  {
    name: "defaults ask to read .env.local",
    rules: defaults,
    call: path("read_file", "read", "config/.env.local"),
    expected: "ask",
  },
  {
    name: "defaults allow .env.example",
    rules: defaults,
    call: path("read_file", "read", ".env.example"),
    expected: "allow",
  },
  { name: "defaults allow writing .env", rules: defaults, call: path("write_file", "edit", ".env"), expected: "allow" },
  {
    name: "defaults allow a read outside the root",
    rules: defaults,
    call: path("read_file", "read", "/etc/hosts"),
    expected: "allow",
  },
  { name: "defaults allow a command", rules: defaults, call: command("git status"), expected: "allow" },
  { name: "defaults allow an MCP tool", rules: defaults, call: opaque("github_create_issue", "*"), expected: "allow" },
  {
    name: "defaults allow webfetch",
    rules: defaults,
    call: opaque("webfetch", "https://example.com"),
    expected: "allow",
  },
  {
    name: "read-only denies edit_file",
    rules: readOnly,
    call: path("edit_file", "edit", "src/a.ts"),
    expected: "deny",
  },
  { name: "read-only denies patch", rules: readOnly, call: path("patch", "edit", "src/a.ts"), expected: "deny" },
  {
    name: "read-only allows list_files as glob",
    rules: readOnly,
    call: path("list_files", "glob", "src"),
    expected: "allow",
  },
  { name: "read-only asks to read .env", rules: readOnly, call: path("read_file", "read", ".env"), expected: "ask" },
  { name: "read-only allows bash as shell", rules: readOnly, call: command("rm -rf build"), expected: "allow" },
  { name: "read-only denies an MCP tool", rules: readOnly, call: opaque("github_create_issue", "*"), expected: "deny" },
  { name: "`git *` matches `git` alone", rules: shell, call: command("git"), expected: "allow" },
  { name: "`git *` allows git log", rules: shell, call: command("git log -5"), expected: "allow" },
  { name: "a later deny wins for git push", rules: shell, call: command("git push origin main"), expected: "deny" },
  { name: "other commands ask", rules: shell, call: command("npm install"), expected: "ask" },
  {
    name: "`src/*` matches nested folders",
    rules: paths,
    call: path("edit_file", "edit", "src/app/main.ts"),
    expected: "allow",
  },
  {
    name: "a later deny wins for a folder",
    rules: paths,
    call: path("write_file", "edit", "src/generated/api.ts"),
    expected: "deny",
  },
  {
    name: "an edit outside the allowed folder asks",
    rules: paths,
    call: path("edit_file", "edit", "docs/guide.md"),
    expected: "ask",
  },
  {
    name: "`*/secret/*` matches a nested secret",
    rules: paths,
    call: path("read_file", "read", "a/b/secret/key"),
    expected: "deny",
  },
  {
    name: "`*/secret/*` needs a folder before secret",
    rules: paths,
    call: path("read_file", "read", "secret/key"),
    expected: "ask",
  },
  {
    name: "no matching rule asks for read_file",
    rules: noMatch,
    call: path("read_file", "read", "docs/a.md"),
    expected: "ask",
  },
  {
    name: "no matching rule asks for write_file",
    rules: noMatch,
    call: path("write_file", "edit", "src/a.ts"),
    expected: "ask",
  },
  {
    name: "no matching rule asks for websearch",
    rules: noMatch,
    call: opaque("websearch", "tanstack"),
    expected: "ask",
  },
  {
    name: "`list*` does not match list_files (glob)",
    rules: prefix,
    call: path("list_files", "glob", "src"),
    expected: "allow",
  },
  { name: "`list*` matches an MCP tool", rules: prefix, call: opaque("list_issues", "*"), expected: "deny" },
  {
    name: "a missing agent denies all",
    rules: [{ action: "*", resource: "*", effect: "deny" }],
    call: path("read_file", "read", "src/a.ts"),
    expected: "deny",
  },
  {
    name: "`re?d` matches read_file",
    rules: wildcardAction,
    call: path("read_file", "read", "src/a.ts"),
    expected: "deny",
  },
] satisfies ReadonlyArray<{ name: string; rules: Permission.Ruleset; call: Call; expected: Permission.Rule["effect"] }>

describe("harnessRules", () => {
  for (const item of cases) {
    test(`${item.name}: ${item.expected}`, () => {
      const harness = decidePermission(
        [...workspace, ...TanStackRules.harnessRules(item.rules).rules],
        item.call.tool,
        "default",
        { resources: item.call.resources, root },
      )
      const opencode = Permission.evaluate(item.call.action, item.call.resource, item.rules).effect
      expect({ opencode, harness }).toEqual({ opencode: item.expected, harness: item.expected })
    })
  }

  test("lists action patterns that only the known tools get", () => {
    expect(TanStackRules.harnessRules(wildcardAction).inexact).toEqual([
      { action: "re?d", resource: "*", effect: "deny" },
    ])
  })

  test("keeps external_directory out of the tool rules", () => {
    const tools = TanStackRules.harnessRules([
      { action: "external_directory", resource: "*", effect: "deny" },
    ]).rules.map((rule) => rule.tool)
    expect(tools).not.toContain("external_directory")
  })
})

describe("workspaceOutside", () => {
  const outside = [
    { name: "defaults", rules: defaults, expected: "ask" },
    { name: "no rules", rules: [], expected: "ask" },
    { name: "a missing agent", rules: [{ action: "*", resource: "*", effect: "deny" }], expected: "deny" },
    {
      name: "a deny for every path",
      rules: [
        { action: "*", resource: "*", effect: "allow" },
        { action: "external_directory", resource: "*", effect: "deny" },
      ],
      expected: "deny",
    },
    {
      name: "a later allow for one folder",
      rules: [
        { action: "external_directory", resource: "*", effect: "deny" },
        { action: "external_directory", resource: "/shared/*", effect: "allow" },
      ],
      expected: "ask",
    },
  ] satisfies ReadonlyArray<{ name: string; rules: Permission.Ruleset; expected: "ask" | "deny" }>

  for (const item of outside) {
    test(`${item.name}: ${item.expected}`, () => {
      expect(TanStackRules.workspaceOutside(item.rules)).toBe(item.expected)
    })
  }
})
