import { createCodeMode } from "./create-code-mode.js";
import { PermissionDecisionCapability, PermissionResources, PermissionRules, decidePermission, definePlugin } from "@tanstack/ai-harness";
//#region src/harness.ts
/**
* A name that works as a JavaScript identifier. Code mode turns each tool
* into an `external_<name>` function, and MCP tool names often have `-`.
*/
function identifierOf(name) {
	const safe = name.replace(/[^A-Za-z0-9_$]/g, "_");
	return /^[0-9]/.test(safe) ? `_${safe}` : safe;
}
/** A tool that runs on the server: not a client tool, and it has `execute`. */
function isServerTool(tool) {
	return ("__toolSide" in tool ? tool.__toolSide : "server") === "server" && typeof tool.execute === "function";
}
/**
* A harness plugin that gives the model an `execute_typescript` tool. The
* model writes one TypeScript program that calls several tools, and the
* program runs in the isolate of `driver` (any `@tanstack/ai-isolate-*`
* driver). The tools it calls leave the model's tool list, including tools
* that plugins find at run time, such as MCP tools after `/connect`.
*
* Calls inside the isolate do not stop for approval, so by default only
* tools that are safe to run without a question move into code mode. The
* other tools stay normal tool calls. A tool with `metadata.codeMode: true`
* moves even when `include` does not pick it, but only when it is safe in
* the same way. Calls inside the isolate also skip the permission checks,
* so a tool that declares `PermissionResources` never moves. With
* `lazy: true`, the model gets only the names of the moved tools and asks
* `discover_tools` for the signatures.
*
* @example
* ```ts
* import { codeMode } from '@tanstack/ai-code-mode/harness'
* import { createQuickJSIsolateDriver } from '@tanstack/ai-isolate-quickjs'
*
* defineHarness({
*   name: 'acme/agent',
*   adapter,
*   plugins: () => [codeMode({ driver: createQuickJSIsolateDriver() })],
* })
* ```
*/
function codeMode(options) {
	const { include, lazy = false, ...config } = options;
	return definePlugin({
		name: "tanstack/code-mode",
		optionalRequires: [PermissionDecisionCapability],
		setup: (ctx) => {
			const rules = ctx.collect(PermissionRules);
			const resources = ctx.collect(PermissionResources);
			let prompt = "";
			return {
				prompts: [{
					id: "tanstack/code-mode",
					text: () => prompt
				}],
				prepareTools: ({ tools }) => {
					const decide = ctx.getOptional(PermissionDecisionCapability);
					const safe = (tool) => !tool.needsApproval && (decide?.(tool.name, "plan") ?? decidePermission(rules, tool.name, "plan")) === "allow";
					const moves = (tool) => {
						if (resources.some((map) => Object.hasOwn(map, tool.name))) return false;
						if (tool.metadata?.codeMode === true && safe(tool)) return true;
						return include ? include(tool) : safe(tool);
					};
					const byIdentifier = /* @__PURE__ */ new Map();
					for (const tool of tools.filter(isServerTool)) {
						if (!moves(tool)) continue;
						const identifier = identifierOf(tool.name);
						if (!byIdentifier.has(identifier)) byIdentifier.set(identifier, tool);
					}
					if (byIdentifier.size === 0) {
						prompt = "";
						return tools;
					}
					const created = createCodeMode({
						...config,
						tools: [...byIdentifier].map(([identifier, tool]) => identifier === tool.name && !lazy ? tool : {
							...tool,
							name: identifier,
							...lazy ? { lazy } : {}
						})
					});
					prompt = created.systemPrompt;
					const moved = new Set([...byIdentifier.values()].map((tool) => tool.name));
					return [...tools.filter((tool) => !moved.has(tool.name)), ...created.tools];
				}
			};
		}
	});
}
//#endregion
export { codeMode };

//# sourceMappingURL=harness.js.map