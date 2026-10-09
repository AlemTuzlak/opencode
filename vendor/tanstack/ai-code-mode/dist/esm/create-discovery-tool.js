import { toolToBinding } from "./bindings/tool-to-binding.js";
import { generateTypeStubs } from "./type-generator/json-schema-to-ts.js";
import { z } from "zod";
import { renderLazyCatalogEntry, toolDefinition } from "@tanstack/ai";
//#region src/create-discovery-tool.ts
var discoverInputSchema = z.object({ toolNames: z.array(z.string()).describe("Names of tools to discover, exactly as shown in the Discoverable APIs catalog. The external_ prefix is optional — both \"external_fetchStocks\" and \"fetchStocks\" resolve.") });
var discoverOutputSchema = z.object({
	tools: z.array(z.object({
		name: z.string().describe("The sandbox function name, e.g. external_fetchStocks"),
		description: z.string(),
		typeStub: z.string().describe("TypeScript declaration for the function")
	})),
	errors: z.array(z.string()).optional()
});
var EXTERNAL_PREFIX = "external_";
/**
* Strip a single leading `external_` prefix so the model can pass either the
* catalog name (`external_fetchStocks`) or the bare name (`fetchStocks`).
*/
function stripExternalPrefix(name) {
	return name.startsWith(EXTERNAL_PREFIX) ? name.slice(9) : name;
}
/**
* Build the `discover_tools` sibling tool for Code Mode lazy tools. The model
* calls it with lazy tool names and receives each one's TypeScript type stub +
* description, which it can then use to write correctly-typed `external_*`
* calls inside `execute_typescript`. The bindings themselves are always present
* in the sandbox — this only reveals documentation.
*
* Tools are catalogued in `external_<name>` form to match the "Discoverable
* APIs" section of the Code Mode system prompt; lookups tolerate either form.
* `lazyToolsConfig.includeDescription` controls how much of each tool's
* description appears in this tool's own catalog (mirroring the system prompt).
*/
function createDiscoveryTool(lazyTools, lazyToolsConfig) {
	const lazyMap = new Map(lazyTools.map((t) => [t.name, t]));
	const include = lazyToolsConfig?.includeDescription ?? "none";
	const catalog = lazyTools.map((t) => renderLazyCatalogEntry(`${EXTERNAL_PREFIX}${t.name}`, t.description, include)).join(", ");
	return toolDefinition({
		name: "discover_tools",
		description: `Discover full TypeScript signatures for additional sandbox APIs before using them inside execute_typescript. Discoverable tools: [${catalog}]. Pass the names exactly as shown (the external_ prefix is optional).`,
		inputSchema: discoverInputSchema,
		outputSchema: discoverOutputSchema
	}).server(async ({ toolNames }) => {
		const tools = [];
		const errors = [];
		for (const name of toolNames) {
			const tool = lazyMap.get(stripExternalPrefix(name));
			if (!tool) {
				errors.push(`Unknown tool: '${name}'. Discoverable tools: [${catalog}]`);
				continue;
			}
			const binding = toolToBinding(tool, EXTERNAL_PREFIX);
			const typeStub = generateTypeStubs({ [binding.name]: binding });
			tools.push({
				name: binding.name,
				description: tool.description,
				typeStub
			});
		}
		return errors.length > 0 ? {
			tools,
			errors
		} : { tools };
	});
}
//#endregion
export { createDiscoveryTool };

//# sourceMappingURL=create-discovery-tool.js.map