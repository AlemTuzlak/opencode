import { makeStructuredOutputCompatible } from "@tanstack/openai-base";
//#region src/tools/function-tool.ts
/**
* Converts a standard Tool to Vercel AI Gateway Chat Completions tool format.
*
* Tool schemas are already converted to JSON Schema in the ai layer.
*/
function convertFunctionToolToAdapterFormat(tool) {
	const inputSchema = tool.inputSchema ?? {
		type: "object",
		properties: {},
		required: []
	};
	if (inputSchema.type === "object" && !inputSchema.properties) inputSchema.properties = {};
	const jsonSchema = makeStructuredOutputCompatible(inputSchema, inputSchema.required || []);
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