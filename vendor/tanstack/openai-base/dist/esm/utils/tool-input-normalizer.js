import { isStrictModeCompatible, makeStructuredOutputCompatibleWithMap } from "./schema-converter.js";
import { undoNullWidening } from "@tanstack/ai-utils";
//#region src/utils/tool-input-normalizer.ts
/**
* Build the inverse transform for the strict tool schemas sent in one request.
* Pass the same converter the request used so subclass schema tweaks stay
* aligned with undo. Non-strict tools are excluded because they were not
* null-widened on the wire.
*/
function createToolInputNormalizer(tools, convertSchema = makeStructuredOutputCompatibleWithMap) {
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
		if (!isStrictModeCompatible(inputSchema)) continue;
		const { nullWideningMap } = convertSchema(inputSchema, inputSchema.required || []);
		if (nullWideningMap) maps.set(tool.name, nullWideningMap);
	}
	return (toolName, input) => undoNullWidening(input, maps.get(toolName));
}
//#endregion
export { createToolInputNormalizer };

//# sourceMappingURL=tool-input-normalizer.js.map