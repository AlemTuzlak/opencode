//#region src/tools/custom-tool.ts
function convertCustomToolToAdapterFormat(tool) {
	const metadata = tool.metadata || {};
	const jsonSchema = tool.inputSchema ?? {
		type: "object",
		properties: {},
		required: []
	};
	const inputSchema = {
		type: "object",
		properties: jsonSchema.properties || null,
		required: jsonSchema.required || null
	};
	return {
		name: tool.name,
		type: "custom",
		description: tool.description,
		input_schema: inputSchema,
		cache_control: metadata.cacheControl || null
	};
}
function customTool(name, description, inputSchema, cacheControl) {
	return {
		name,
		description,
		inputSchema,
		metadata: { cacheControl }
	};
}
//#endregion
export { convertCustomToolToAdapterFormat, customTool };

//# sourceMappingURL=custom-tool.js.map