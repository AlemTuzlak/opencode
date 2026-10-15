import { makeStructuredOutputCompatibleWithMap } from "@tanstack/openai-base";
//#region src/utils/schema-converter.ts
/**
* Recursively removes `required: []` from a schema object.
* Groq rejects `required` when it is an empty array, even though
* OpenAI-compatible schemas allow it.
*/
function removeEmptyRequired(schema) {
	const result = { ...schema };
	if (Array.isArray(result.required) && result.required.length === 0) delete result.required;
	if (result.properties && typeof result.properties === "object") {
		const properties = {};
		for (const [key, value] of Object.entries(result.properties)) properties[key] = typeof value === "object" && value !== null && !Array.isArray(value) ? removeEmptyRequired(value) : value;
		result.properties = properties;
	}
	if (result.items && typeof result.items === "object" && !Array.isArray(result.items)) result.items = removeEmptyRequired(result.items);
	for (const keyword of [
		"anyOf",
		"oneOf",
		"allOf"
	]) if (Array.isArray(result[keyword])) result[keyword] = result[keyword].map((entry) => removeEmptyRequired(entry));
	if (result.additionalProperties && typeof result.additionalProperties === "object" && !Array.isArray(result.additionalProperties)) result.additionalProperties = removeEmptyRequired(result.additionalProperties);
	return result;
}
/**
* Recursively normalise object schemas so any `{ type: 'object' }` node
* without `properties` gets an empty `properties: {}` object. The
* ai-openai-base transformer only descends into objects that already have
* `properties` set, so a Zod `z.object({})` nested inside `properties`,
* `items`, `additionalProperties`, or a combinator branch would otherwise
* skip the strict-mode rewrite and fail Groq validation.
*/
function normalizeObjectSchemas(schema) {
	const result = schema.type === "object" && !schema.properties ? {
		...schema,
		properties: {}
	} : { ...schema };
	if (result.properties && typeof result.properties === "object") result.properties = Object.fromEntries(Object.entries(result.properties).map(([key, value]) => [key, typeof value === "object" && value !== null && !Array.isArray(value) ? normalizeObjectSchemas(value) : value]));
	if (result.items && typeof result.items === "object" && !Array.isArray(result.items)) result.items = normalizeObjectSchemas(result.items);
	for (const keyword of [
		"anyOf",
		"oneOf",
		"allOf"
	]) {
		const branch = result[keyword];
		if (Array.isArray(branch)) result[keyword] = branch.map((entry) => typeof entry === "object" && entry !== null ? normalizeObjectSchemas(entry) : entry);
	}
	if (result.additionalProperties && typeof result.additionalProperties === "object" && !Array.isArray(result.additionalProperties)) result.additionalProperties = normalizeObjectSchemas(result.additionalProperties);
	return result;
}
/**
* Transform a JSON schema to be compatible with Groq's structured output requirements.
*
* Groq requires:
* - All properties must be in the `required` array
* - Optional fields should have null added to their type union
* - additionalProperties must be false for objects
* - `required` must be omitted (not empty array) when there are no properties
*
* Delegates to the shared OpenAI-compatible transformer and applies the
* Groq-specific quirk of removing empty `required` arrays.
*
* @param schema - JSON schema to transform
* @param originalRequired - Original required array (to know which fields were optional)
* @returns Transformed schema compatible with Groq structured output
*/
function makeGroqStructuredOutputCompatibleWithMap(schema, originalRequired = []) {
	const normalised = normalizeObjectSchemas(schema);
	const { schema: converted, nullWideningMap } = makeStructuredOutputCompatibleWithMap(normalised, originalRequired);
	return {
		schema: removeEmptyRequired(converted),
		nullWideningMap
	};
}
function makeGroqStructuredOutputCompatible(schema, originalRequired = []) {
	return makeGroqStructuredOutputCompatibleWithMap(schema, originalRequired).schema;
}
//#endregion
export { makeGroqStructuredOutputCompatible, makeGroqStructuredOutputCompatibleWithMap };

//# sourceMappingURL=schema-converter.js.map