import { validateWithStandardSchema } from "@tanstack/ai";
//#region src/server/output.ts
/**
* Internal. Parses a tool output with its `outputSchema`, like chat() does,
* so the result matches the advertised output view. A result that fails
* the schema but that the tool built itself (`isOwnResult`) is kept.
* This module loads no MCP SDK, so the direct client can use it.
*/
async function parseToolOutput(tool, output, isOwnResult) {
	const parsed = await validateWithStandardSchema(tool.outputSchema, output);
	if (parsed.success) return parsed.data;
	if (isOwnResult(output)) return output;
	const issues = parsed.issues.map((issue) => issue.message).join(", ");
	throw new Error(`Tool ${tool.name} returned output that does not match its outputSchema: ${issues}`);
}
//#endregion
export { parseToolOutput };

//# sourceMappingURL=output.js.map