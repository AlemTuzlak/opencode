//#region src/type-generator/json-schema-to-ts.ts
/**
* Generate TypeScript type stubs for all tool bindings
*
* These stubs are included in the LLM system prompt so it knows
* the exact type signatures of available tools.
*
* Tool names match the actual function names injected into the sandbox.
*/
function generateTypeStubs(bindings, options = {}) {
	const { includeDescriptions = true } = options;
	const declarations = [];
	for (const [name, binding] of Object.entries(bindings)) {
		const inputTypeName = `${capitalize(name)}Input`;
		const outputTypeName = `${capitalize(name)}Output`;
		const inputType = jsonSchemaToTypeScript(binding.inputSchema, inputTypeName, includeDescriptions);
		if (inputType.declaration) declarations.push(inputType.declaration);
		let outputTypeRef = "unknown";
		if (binding.outputSchema) {
			const outputType = jsonSchemaToTypeScript(binding.outputSchema, outputTypeName, includeDescriptions);
			if (outputType.declaration) declarations.push(outputType.declaration);
			outputTypeRef = outputType.name;
		}
		const description = includeDescriptions && binding.description ? `/** ${binding.description} */\n` : "";
		declarations.push(`${description}declare function ${name}(input: ${inputType.name}): Promise<${outputTypeRef}>;`);
	}
	return declarations.join("\n\n");
}
/**
* Convert a JSON Schema to a TypeScript type
*
* Supports basic types: string, number, boolean, object, array
*/
function jsonSchemaToTypeScript(schema, typeName, includeDescriptions = true) {
	const type = schemaToType(schema, includeDescriptions);
	if (schema.type === "object" && schema.properties && Object.keys(schema.properties).length > 0 && !Array.isArray(schema.enum) && !("const" in schema)) return {
		name: typeName,
		declaration: `interface ${typeName} ${type}`
	};
	return {
		name: type,
		declaration: ""
	};
}
/**
* Convert a JSON Schema to a TypeScript type string
*/
function schemaToType(schema, includeDescriptions) {
	if (typeof schema !== "object") return "unknown";
	if ("const" in schema) return JSON.stringify(schema.const);
	if (Array.isArray(schema.enum)) return schema.enum.map((v) => JSON.stringify(v)).join(" | ");
	const schemaType = schema.type;
	if (schemaType === "string") return "string";
	if (schemaType === "number" || schemaType === "integer") return "number";
	if (schemaType === "boolean") return "boolean";
	if (schemaType === "null") return "null";
	if (schemaType === "array") {
		const items = schema.items;
		return `Array<${items ? schemaToType(items, includeDescriptions) : "unknown"}>`;
	}
	if (schemaType === "object" && schema.properties) {
		const properties = schema.properties;
		const required = new Set(schema.required ?? []);
		return `{\n${Object.entries(properties).map(([key, propSchema]) => {
			const optional = required.has(key) ? "" : "?";
			const propType = schemaToType(propSchema, includeDescriptions);
			const safeName = /^[a-zA-Z_$][a-zA-Z0-9_$]*$/.test(key) ? key : `"${key}"`;
			return `${includeDescriptions && typeof propSchema.description === "string" ? `  /** ${propSchema.description.replace(/\*\//g, "*\\/")} */\n` : ""}  ${safeName}${optional}: ${propType};`;
		}).join("\n")}\n}`;
	}
	if (schema.anyOf || schema.oneOf) return (schema.anyOf || schema.oneOf).map((v) => schemaToType(v, includeDescriptions)).join(" | ");
	if (Array.isArray(schemaType)) return schemaType.map((t) => {
		if (t === "string") return "string";
		if (t === "number" || t === "integer") return "number";
		if (t === "boolean") return "boolean";
		if (t === "null") return "null";
		if (t === "array") return "Array<unknown>";
		if (t === "object") return "object";
		return "unknown";
	}).join(" | ");
	return "unknown";
}
/**
* Capitalize the first letter of a string
*/
function capitalize(str) {
	return str.charAt(0).toUpperCase() + str.slice(1);
}
//#endregion
export { generateTypeStubs, jsonSchemaToTypeScript };

//# sourceMappingURL=json-schema-to-ts.js.map