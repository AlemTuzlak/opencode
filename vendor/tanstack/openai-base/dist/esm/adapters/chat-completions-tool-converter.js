import { isStrictModeCompatible, makeStructuredOutputCompatible, stripUnsupportedFormats } from "../utils/schema-converter.js";
//#region src/adapters/chat-completions-tool-converter.ts
/**
* Converts a standard Tool to OpenAI Chat Completions ChatCompletionTool format.
*
* Tool schemas are already converted to JSON Schema in the ai layer.
* We apply OpenAI-compatible transformations for strict mode:
* - All properties in required array
* - Optional fields made nullable
* - additionalProperties: false
*
* This enables strict mode for tools whose schemas fit OpenAI's strict subset.
*
* Schemas using keywords outside that subset (`oneOf`/`allOf`/`not`/`$ref`/
* `$defs` — common with MCP servers like Notion) can't be coerced to a
* strict-valid shape, and `strict: true` would make the API reject the ENTIRE
* request with a 400. Such tools are emitted with `strict: false` (their schema
* passed through, only unsupported `format` keywords stripped) so they stay
* callable.
*/
function convertFunctionToolToChatCompletionsFormat(tool, schemaConverter = makeStructuredOutputCompatible) {
	const inputSchema = tool.inputSchema ?? {
		type: "object",
		properties: {},
		required: []
	};
	if (!isStrictModeCompatible(inputSchema)) return {
		type: "function",
		function: {
			name: tool.name,
			description: tool.description,
			parameters: stripUnsupportedFormats(inputSchema),
			strict: false
		}
	};
	const jsonSchema = { ...schemaConverter(inputSchema, inputSchema.required || []) };
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
/**
* Converts an array of standard Tools to Chat Completions format.
* Chat Completions API primarily supports function tools.
*/
function convertToolsToChatCompletionsFormat(tools, schemaConverter) {
	return tools.map((tool) => convertFunctionToolToChatCompletionsFormat(tool, schemaConverter));
}
//#endregion
export { convertFunctionToolToChatCompletionsFormat, convertToolsToChatCompletionsFormat };

//# sourceMappingURL=chat-completions-tool-converter.js.map