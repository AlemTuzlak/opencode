//#region src/utils/schema-converter.ts
/**
* Convert a schema for Mistral strict mode and record how to invert it.
*
* Outcomes:
* - `strict: true` — rewritten schema (`required` closed, optionals null-widened).
*   `nullWideningMap` marks synthesized optional nulls only; already-nullable
*   fields and enum/const repairs on required nodes are unmarked.
* - `strict: false` — original schema, no map. Used when `oneOf`/`allOf`/`not`/
*   `$ref`/`$defs` appear, or an `anyOf` branch would need a branch-dependent map.
*/
function makeMistralStructuredOutputCompatibleWithMap(schema, originalRequired = []) {
	if (containsUnsupportedStrictKeyword(schema)) return {
		schema,
		nullWideningMap: void 0,
		strict: false
	};
	const converted = coerceMistralStrictSchema(schema, originalRequired);
	if (converted.hasUntrackableAnyOfWidening) return {
		schema,
		nullWideningMap: void 0,
		strict: false
	};
	return {
		schema: converted.schema,
		nullWideningMap: converted.nullWideningMap,
		strict: true
	};
}
var UNSUPPORTED_STRICT_KEYWORDS = [
	"oneOf",
	"allOf",
	"not",
	"$ref",
	"$defs",
	"definitions"
];
/**
* Tree-wide key scan for `oneOf`/`allOf`/`not`/`$ref`/`$defs`/`definitions`.
* Conservative: a property literally named e.g. `oneOf` also trips fallback.
* `anyOf` is handled separately in the coerce walk.
*/
function containsUnsupportedStrictKeyword(node) {
	if (Array.isArray(node)) return node.some(containsUnsupportedStrictKeyword);
	if (!isSchemaObject(node)) return false;
	return Object.entries(node).some(([key, value]) => UNSUPPORTED_STRICT_KEYWORDS.includes(key) || containsUnsupportedStrictKeyword(value));
}
function pruneMap(map) {
	return Object.keys(map).length > 0 ? map : void 0;
}
function isSchemaObject(schema) {
	return typeof schema === "object" && schema !== null && !Array.isArray(schema);
}
function coerceArrayItems(items) {
	if (Array.isArray(items)) {
		const converted = items.map((item) => isSchemaObject(item) ? coerceMistralStrictSchema(item, item.required || []) : {
			schema: item,
			nullWideningMap: void 0,
			hasUntrackableAnyOfWidening: false
		});
		const itemMaps = converted.map((item) => item.nullWideningMap);
		return {
			schema: converted.map((item) => item.schema),
			itemMap: itemMaps.some(Boolean) ? itemMaps.map((map) => map ?? {}) : void 0,
			hasUntrackableAnyOfWidening: converted.some((item) => item.hasUntrackableAnyOfWidening)
		};
	}
	if (isSchemaObject(items)) {
		const converted = coerceMistralStrictSchema(items, items.required || []);
		return {
			schema: converted.schema,
			itemMap: converted.nullWideningMap,
			hasUntrackableAnyOfWidening: converted.hasUntrackableAnyOfWidening
		};
	}
	return {
		schema: items,
		itemMap: void 0,
		hasUntrackableAnyOfWidening: false
	};
}
function schemaTypeIncludes(schema, typeName) {
	return schema.type === typeName || Array.isArray(schema.type) && schema.type.includes(typeName);
}
function admitNullInEnumOrConst(prop) {
	if ("const" in prop && prop.const !== null) {
		const { const: constValue, ...withoutConst } = prop;
		return {
			...withoutConst,
			enum: [constValue, null]
		};
	}
	if (Array.isArray(prop.enum) && !prop.enum.includes(null)) return {
		...prop,
		enum: [...prop.enum, null]
	};
	return prop;
}
/**
* True when `type`/`enum`/`const`/`anyOf` already admit null. `oneOf`/`allOf`/
* `not` are not inspected — callers must reject those first.
*/
function acceptsNull(schema) {
	if (schema === true) return true;
	if (!isSchemaObject(schema)) return false;
	if ("const" in schema && schema.const !== null) return false;
	if (Array.isArray(schema.enum) && !schema.enum.includes(null)) return false;
	if (typeof schema.type === "string" && schema.type !== "null") return false;
	if (Array.isArray(schema.type) && !schema.type.includes("null")) return false;
	if (Array.isArray(schema.anyOf) && !schema.anyOf.some((variant) => acceptsNull(variant))) return false;
	return true;
}
function coerceMistralStrictSchema(schema, originalRequired) {
	const result = { ...schema };
	const nullWideningMap = {};
	let hasUntrackableAnyOfWidening = false;
	if (schemaTypeIncludes(result, "object")) {
		if (!result.properties) result.properties = {};
		const properties = { ...result.properties };
		const allPropertyNames = Object.keys(properties);
		const propertyMaps = {};
		for (const propName of allPropertyNames) {
			let prop = properties[propName];
			const wasOptional = !originalRequired.includes(propName);
			let childMap;
			let widenedHere = false;
			if (isSchemaObject(prop) && schemaTypeIncludes(prop, "object") && prop.properties) {
				const converted = coerceMistralStrictSchema(prop, prop.required || []);
				prop = converted.schema;
				childMap = converted.nullWideningMap;
				hasUntrackableAnyOfWidening ||= converted.hasUntrackableAnyOfWidening;
			} else if (isSchemaObject(prop) && schemaTypeIncludes(prop, "array") && prop.items != null) {
				const convertedItems = coerceArrayItems(prop.items);
				prop = {
					...prop,
					items: convertedItems.schema
				};
				if (convertedItems.itemMap) childMap = { items: convertedItems.itemMap };
				hasUntrackableAnyOfWidening ||= convertedItems.hasUntrackableAnyOfWidening;
			} else if (isSchemaObject(prop) && Array.isArray(prop.anyOf)) {
				const converted = coerceMistralStrictSchema(prop, prop.required || []);
				prop = converted.schema;
				childMap = converted.nullWideningMap;
				hasUntrackableAnyOfWidening ||= converted.hasUntrackableAnyOfWidening;
			}
			if (!acceptsNull(prop)) {
				if (wasOptional) {
					if (isSchemaObject(prop)) prop = admitNullInEnumOrConst(prop);
					if (isSchemaObject(prop) && prop.type && !Array.isArray(prop.type)) prop = {
						...prop,
						type: [prop.type, "null"]
					};
					else if (isSchemaObject(prop) && Array.isArray(prop.type) && !prop.type.includes("null")) prop = {
						...prop,
						type: [...prop.type, "null"]
					};
					else if (!isSchemaObject(prop) || !prop.type) prop = { anyOf: [prop, { type: "null" }] };
					widenedHere = true;
				} else if (isSchemaObject(prop) && schemaTypeIncludes(prop, "null")) prop = admitNullInEnumOrConst(prop);
			}
			properties[propName] = prop;
			if (childMap || widenedHere) Object.defineProperty(propertyMaps, propName, {
				value: {
					...childMap ?? {},
					...widenedHere ? { widened: true } : {}
				},
				enumerable: true,
				writable: true,
				configurable: true
			});
		}
		result.properties = properties;
		if (allPropertyNames.length > 0) result.required = allPropertyNames;
		else delete result.required;
		result.additionalProperties = false;
		if (Object.keys(propertyMaps).length > 0) nullWideningMap.properties = propertyMaps;
	}
	if (schemaTypeIncludes(result, "array") && result.items != null) {
		const convertedItems = coerceArrayItems(result.items);
		result.items = convertedItems.schema;
		if (convertedItems.itemMap) nullWideningMap.items = convertedItems.itemMap;
		hasUntrackableAnyOfWidening ||= convertedItems.hasUntrackableAnyOfWidening;
	}
	if (Array.isArray(result.anyOf)) {
		const variants = result.anyOf.map((variant) => {
			if (!isSchemaObject(variant)) return {
				schema: variant,
				nullWideningMap: void 0,
				hasUntrackableAnyOfWidening: false
			};
			return coerceMistralStrictSchema(variant, variant.required || []);
		});
		result.anyOf = variants.map((variant) => variant.schema);
		hasUntrackableAnyOfWidening ||= variants.some((variant) => variant.nullWideningMap !== void 0 || variant.hasUntrackableAnyOfWidening);
	}
	return {
		schema: result,
		nullWideningMap: pruneMap(nullWideningMap),
		hasUntrackableAnyOfWidening
	};
}
//#endregion
export { makeMistralStructuredOutputCompatibleWithMap };

//# sourceMappingURL=schema-converter.js.map