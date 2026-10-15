//#region src/converse/structured-output.ts
var STRUCTURED_TOOL_NAME = "structured_output";
/**
* Structured output with a forced tool: a single tool whose input schema is
* the requested output schema. The model's tool-use `input` is the
* structured result.
*/
function buildStructuredToolConfig(schema) {
	return {
		tools: [{ toolSpec: {
			name: STRUCTURED_TOOL_NAME,
			description: "Return the final answer as structured JSON.",
			inputSchema: { json: schema }
		} }],
		toolChoice: { tool: { name: STRUCTURED_TOOL_NAME } }
	};
}
/**
* Structured output with Converse's native JSON schema output
* (`outputConfig.textFormat`). The model's text answer is the structured
* result as JSON. For the models that reject a forced tool.
*/
function buildStructuredOutputConfig(schema) {
	return { textFormat: {
		type: "json_schema",
		structure: { jsonSchema: {
			schema: JSON.stringify(schema),
			name: STRUCTURED_TOOL_NAME
		} }
	} };
}
//#endregion
export { STRUCTURED_TOOL_NAME, buildStructuredOutputConfig, buildStructuredToolConfig };

//# sourceMappingURL=structured-output.js.map