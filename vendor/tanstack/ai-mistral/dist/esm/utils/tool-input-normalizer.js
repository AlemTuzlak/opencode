import { makeMistralStructuredOutputCompatibleWithMap } from "./schema-converter.js";
import { undoNullWidening } from "@tanstack/ai-utils";
//#region src/utils/tool-input-normalizer.ts
/**
* Per-request inverse of Mistral optional-null widening. Recomputes maps from
* each tool's input schema; duplicate names and non-strict schemas are left
* untouched so we never guess.
*/
function createToolInputNormalizer(tools) {
	const maps = /* @__PURE__ */ new Map();
	const seenNames = /* @__PURE__ */ new Set();
	const ambiguousNames = /* @__PURE__ */ new Set();
	for (const tool of tools ?? []) {
		if (ambiguousNames.has(tool.name)) continue;
		if (seenNames.has(tool.name)) {
			maps.delete(tool.name);
			ambiguousNames.add(tool.name);
			continue;
		}
		seenNames.add(tool.name);
		const inputSchema = tool.inputSchema ?? {
			type: "object",
			properties: {},
			required: []
		};
		const { nullWideningMap } = makeMistralStructuredOutputCompatibleWithMap(inputSchema, inputSchema.required || []);
		if (nullWideningMap) maps.set(tool.name, nullWideningMap);
	}
	return (toolName, input) => undoNullWidening(input, maps.get(toolName));
}
//#endregion
export { createToolInputNormalizer };

//# sourceMappingURL=tool-input-normalizer.js.map