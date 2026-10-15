import { makeStructuredOutputCompatible } from "./schema-converter.js";
import { undoNullWidening } from "@tanstack/ai-utils";
//#region src/internal/responses-tool-converter.ts
/**
* Converts a standard Tool to the Responses API FunctionTool format.
*
* Tool schemas are already converted to JSON Schema in the ai layer.
* We apply OpenAI-compatible transformations for strict mode:
* - All properties in required array
* - Optional fields made nullable
* - additionalProperties: false
*
* This enables strict mode for all tools automatically.
*/
function convertFunctionToolToResponsesFormat(tool, schemaConverter = makeStructuredOutputCompatible) {
	const inputSchema = tool.inputSchema ?? {
		type: "object",
		properties: {},
		required: []
	};
	const jsonSchema = { ...schemaConverter(inputSchema, inputSchema.required || []) };
	jsonSchema.additionalProperties = false;
	return {
		type: "function",
		name: tool.name,
		description: tool.description,
		parameters: jsonSchema,
		strict: true
	};
}
function allowsNull(schema) {
	if (!schema || typeof schema !== "object") return false;
	if (schema.type === "null") return true;
	if (Array.isArray(schema.type) && schema.type.includes("null")) return true;
	if (Array.isArray(schema.enum) && schema.enum.includes(null)) return true;
	return Array.isArray(schema.anyOf) && schema.anyOf.some(allowsNull);
}
/**
* Diff the original tool schema against the strict wire schema and mark every
* position where the converter added `null`. Diffing the actual wire schema
* keeps the map aligned with a subclass-supplied `schemaConverter`. A field
* that already allowed `null` (`.nullable()`, `.nullish()`) is not marked, so
* its `null` survives.
*/
function diffNullWidening(original, wire) {
	if (!original || !wire || typeof original !== "object") return void 0;
	const map = {};
	if (allowsNull(wire) && !allowsNull(original)) map.widened = true;
	if (original.properties && wire.properties) {
		const properties = {};
		for (const key of Object.keys(wire.properties)) {
			const child = diffNullWidening(Object.hasOwn(original.properties, key) ? original.properties[key] : void 0, wire.properties[key]);
			if (child) Object.defineProperty(properties, key, {
				value: child,
				enumerable: true,
				writable: true,
				configurable: true
			});
		}
		if (Object.keys(properties).length > 0) map.properties = properties;
	}
	if (original.items && wire.items && !Array.isArray(original.items) && !Array.isArray(wire.items)) {
		const items = diffNullWidening(original.items, wire.items);
		if (items) map.items = items;
	}
	const nonNullVariants = (schema) => (schema.anyOf ?? []).filter((variant) => variant.type !== "null");
	const originalVariants = nonNullVariants(original);
	const wireVariants = nonNullVariants(wire);
	if (originalVariants.length === 1 && wireVariants.length === 1) {
		const inner = diffNullWidening(originalVariants[0], wireVariants[0]);
		if (inner?.properties) map.properties = inner.properties;
		if (inner?.items) map.items = inner.items;
	}
	return Object.keys(map).length > 0 ? map : void 0;
}
/**
* Build the inverse of the strict null-widening applied to the tools of one
* request. Strict tools reach the model with every optional field promoted to
* required + nullable, so the model sends `null` for an omitted optional. The
* returned function strips exactly those synthesized nulls, so the engine
* validates the input against the original schema and `execute` sees the
* field as absent. Pass the same converter the request used.
*/
function createToolInputNormalizer(tools, schemaConverter) {
	const maps = /* @__PURE__ */ new Map();
	for (const tool of tools ?? []) {
		const map = diffNullWidening(tool.inputSchema, convertFunctionToolToResponsesFormat(tool, schemaConverter).parameters ?? void 0);
		if (map) maps.set(tool.name, map);
	}
	return (toolName, input) => undoNullWidening(input, maps.get(toolName));
}
//#endregion
export { convertFunctionToolToResponsesFormat, createToolInputNormalizer };

//# sourceMappingURL=responses-tool-converter.js.map