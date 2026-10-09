import { makeMistralStructuredOutputCompatibleWithMap } from "../utils/schema-converter.js";
//#region src/tools/function-tool.ts
/**
* Converts a standard Tool to Mistral ChatCompletionTool format.
*
* Tool schemas are already JSON Schema in the ai layer. When the schema can
* be inverted, rewrite it for strict mode (required, nullable optionals,
* `additionalProperties: false`) and set `strict: true`. Otherwise leave the
* schema intact and set `strict: false`.
*/
function convertFunctionToolToAdapterFormat(tool) {
	const baseSchema = tool.inputSchema ?? {
		type: "object",
		properties: {},
		required: []
	};
	const inputSchema = baseSchema.type === "object" && !baseSchema.properties ? {
		...baseSchema,
		properties: {}
	} : { ...baseSchema };
	const { schema: jsonSchema, strict } = makeMistralStructuredOutputCompatibleWithMap(inputSchema, inputSchema.required || []);
	return {
		type: "function",
		function: {
			name: tool.name,
			description: tool.description,
			parameters: jsonSchema,
			strict
		}
	};
}
//#endregion
export { convertFunctionToolToAdapterFormat };

//# sourceMappingURL=function-tool.js.map