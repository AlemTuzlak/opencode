import { makeGroqStructuredOutputCompatible } from "../utils/schema-converter.js";
//#region src/tools/function-tool.ts
/**
* Converts a standard Tool to Groq ChatCompletionTool format.
*
* Tool schemas are already converted to JSON Schema in the ai layer.
* We apply Groq-specific transformations for strict mode:
* - All properties in required array
* - Optional fields made nullable
* - additionalProperties: false
*/
function convertFunctionToolToAdapterFormat(tool) {
	const inputSchema = tool.inputSchema ?? {
		type: "object",
		properties: {},
		required: []
	};
	if (inputSchema.type === "object" && !inputSchema.properties) inputSchema.properties = {};
	const jsonSchema = makeGroqStructuredOutputCompatible(inputSchema, inputSchema.required || []);
	jsonSchema.additionalProperties = false;
	return {
		type: "function",
		function: {
			name: tool.name,
			description: tool.description,
			parameters: jsonSchema,
			strict: true
		}
	};
}
//#endregion
export { convertFunctionToolToAdapterFormat };

//# sourceMappingURL=function-tool.js.map