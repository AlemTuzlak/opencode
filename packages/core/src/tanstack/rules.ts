export * as TanStackRules from "./rules.js"

import type { PermissionRule } from "@tanstack/ai-harness"
import type { Permission } from "@opencode/schema/permission"
import { Wildcard } from "../util/wildcard.js"
import { harnessToolNames, permissionAction } from "./tool-names.js"

const EXTERNAL_DIRECTORY = "external_directory"

// Harness tool -> the opencode permission action that its opencode tool asserts.
const actions = Object.fromEntries(harnessToolNames.map((tool) => [tool, permissionAction(tool)]))

/**
 * Translate opencode permission rules into rules for the harness `permissions()` plugin.
 *
 * The harness decides the same as `Permission.evaluate`: the last matching rule wins, and a call
 * that no rule matches asks. Give the result to `permissions({ rules })`. Its rules come after the
 * rules that tool plugins add, so they replace the tool plugin defaults.
 *
 * `external_directory` rules do not become tool rules. Use `workspaceOutside` for them.
 *
 * `inexact` lists the rules whose action pattern the harness cannot match for tools outside the
 * D2 table, such as MCP tools. A harness tool rule only takes an exact name or a trailing `*`.
 * The rules still apply exactly to the tools in the D2 table.
 *
 * @example
 * const translated = harnessRules(agent.permissions)
 * permissions({ rules: translated.rules })
 */
export function harnessRules(rules: Permission.Ruleset) {
  const toolRules = rules.filter((rule) => rule.action !== EXTERNAL_DIRECTORY)
  // Tools outside the table keep their opencode name, so the action is the harness tool pattern.
  const passthrough = toolRules.flatMap((rule) => (isToolPattern(rule.action) ? translate(rule.action, rule) : []))
  // The known tools come last, so a passthrough pattern like `list*` cannot change `list_files` (action `glob`).
  // Each one starts with `ask`, the decision of opencode when no rule matches.
  const known = Object.entries(actions).flatMap(([tool, action]) => [
    { tool, decision: "ask" } satisfies PermissionRule,
    ...toolRules.filter((rule) => Wildcard.match(action, rule.action)).flatMap((rule) => translate(tool, rule)),
  ])
  return {
    rules: [{ tool: "*", decision: "ask" } satisfies PermissionRule, ...passthrough, ...known],
    inexact: toolRules.filter((rule) => !isToolPattern(rule.action)),
  }
}

/**
 * The `outside` option of `workspaceTools()` for opencode rules.
 *
 * It is `deny` when the rules deny `external_directory` for every path. Else it is `ask`.
 * The harness has no `outside: "allow"` and no rules for each folder, so an opencode allow or a
 * rule for one folder also asks.
 *
 * @example
 * workspaceTools({ root: location.directory, outside: workspaceOutside(agent.permissions) })
 */
export function workspaceOutside(rules: Permission.Ruleset) {
  const matching = rules.filter((rule) => Wildcard.match(EXTERNAL_DIRECTORY, rule.action))
  const lastAny = matching.findLastIndex((rule) => isAny(rule.resource))
  const deniesAll = lastAny !== -1 && matching.slice(lastAny).every((rule) => rule.effect === "deny")
  return deniesAll ? "deny" : "ask"
}

/** The harness rules for one opencode rule, on `tool`. */
function translate(tool: string, rule: Permission.Rule) {
  return resources(rule).map((resource) => ({ tool, resource, decision: rule.effect }) satisfies PermissionRule)
}

/** The harness resources for one opencode rule. `undefined` is a rule for every call of the tool. */
function resources(rule: Permission.Rule) {
  // A harness rule without a resource still asks for a path outside the root or a `.env` file.
  // opencode allows them, so an allow also gets a resource that matches every path and command.
  if (isAny(rule.resource)) return rule.effect === "allow" ? [undefined, "**"] : [undefined]
  // opencode lets `git *` match `git` too.
  if (rule.resource.endsWith(" *")) return [glob(rule.resource), glob(rule.resource.slice(0, -2))]
  return [glob(rule.resource)]
}

// The harness glob for an opencode resource pattern. In opencode, `*` matches any text, `/` too.
// In the harness, `**` does that, but the harness drops the `/` after `**`. Three stars and the `/`
// keep it: the harness reads them as `**`, then `*`, then `/`.
// The harness `?` does not match `/`, but the opencode `?` does.
function glob(resource: string) {
  return resource.replaceAll("\\", "/").replace(/\*+(\/?)/g, (_match, slash: string) => (slash === "/" ? "***/" : "**"))
}

/** A resource pattern that matches everything. */
function isAny(resource: string) {
  return /^\*+$/.test(resource)
}

/** An action pattern that a harness tool rule can match: an exact name, or a trailing `*`. */
function isToolPattern(action: string) {
  return /^[^*?]*\*?$/.test(action)
}
