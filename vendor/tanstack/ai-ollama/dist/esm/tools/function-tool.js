//#region src/tools/function-tool.ts
/**
* Converts a standard Tool to Ollama's function-tool format.
*
* Tool schemas are already converted to JSON Schema in the ai layer. We
* accept any JSONSchema and hand it to Ollama via a local type cast because
* our JSONSchema type is broader than Ollama's (e.g. `type` can be a union
* or array of strings).
*/
function convertFunctionToolToAdapterFormat(tool) {
	const inputSchema = tool.inputSchema ?? {
		type: "object",
		properties: {},
		required: []
	};
	return {
		type: "function",
		function: {
			name: tool.name,
			description: tool.description,
			parameters: inputSchema
		}
	};
}
//#endregion
export { convertFunctionToolToAdapterFormat };

//# sourceMappingURL=function-tool.js.map