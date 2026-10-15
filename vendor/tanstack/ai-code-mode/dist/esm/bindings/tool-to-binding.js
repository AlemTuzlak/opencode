import { convertSchemaToJsonSchema, isStandardSchema, parseWithStandardSchema } from "@tanstack/ai";
//#region src/bindings/tool-to-binding.ts
/**
* Convert an array of TanStack AI tools to a Record of ToolBindings
*
* @param tools - Array of tools to convert
* @param prefix - Optional prefix to add to binding names (e.g., 'external_')
*/
function toolsToBindings(tools, prefix = "") {
	const bindings = {};
	for (const tool of tools) {
		const bindingName = `${prefix}${tool.name}`;
		bindings[bindingName] = toolToBinding(tool, prefix);
	}
	return bindings;
}
/**
* Convert a single TanStack AI tool to a ToolBinding
*
* @param tool - Tool to convert
* @param prefix - Optional prefix to add to binding name (e.g., 'external_')
* @throws Error if the tool doesn't have an execute function
*/
function toolToBinding(tool, prefix = "") {
	const inputSchema = convertSchemaToJsonSchema(tool.inputSchema) || {
		type: "object",
		properties: {}
	};
	const outputSchema = tool.outputSchema ? convertSchemaToJsonSchema(tool.outputSchema) : void 0;
	if (typeof tool.execute !== "function") throw new Error(`Tool "${tool.name}" does not have an execute function. Code Mode requires server tools with implementations.`);
	const toolExecute = tool.execute;
	const execute = async (args, context) => {
		let input = args;
		if (tool.inputSchema && isStandardSchema(tool.inputSchema)) try {
			input = parseWithStandardSchema(tool.inputSchema, args);
		} catch (error) {
			const message = error instanceof Error ? error.message : "Validation failed";
			throw new Error(`Input validation failed for tool ${tool.name}: ${message}`);
		}
		let result = await Promise.resolve(toolExecute(input, context));
		if (tool.outputSchema && isStandardSchema(tool.outputSchema)) try {
			result = parseWithStandardSchema(tool.outputSchema, result);
		} catch (error) {
			const message = error instanceof Error ? error.message : "Validation failed";
			throw new Error(`Output validation failed for tool ${tool.name}: ${message}`);
		}
		return result;
	};
	return {
		name: `${prefix}${tool.name}`,
		description: tool.description,
		inputSchema,
		outputSchema,
		execute
	};
}
/**
* Create event-aware bindings that emit custom events for each external function call.
* Wraps each binding's execute function to emit events before and after execution.
*
* Each call gets the parent tool's `abortSignal` and runtime `context`, so a tool
* can cancel in-flight work when the run aborts. `toolCallId` and `inputResponse` are not
* passed: they belong to the parent tool call, not to this nested call.
*
* @param bindings - Original tool bindings
* @param emitCustomEvent - Callback to emit custom events to the stream
* @param parentContext - Context of the tool that runs the code (e.g. `execute_typescript`)
*/
function createEventAwareBindings(bindings, emitCustomEvent, parentContext) {
	const toolContext = {
		context: parentContext?.context,
		abortSignal: parentContext?.abortSignal,
		emitCustomEvent
	};
	const wrapped = {};
	for (const [name, binding] of Object.entries(bindings)) wrapped[name] = {
		...binding,
		execute: async (args) => {
			emitCustomEvent("code_mode:external_call", {
				function: name,
				args,
				timestamp: Date.now()
			});
			const startTime = Date.now();
			try {
				toolContext.abortSignal?.throwIfAborted();
				const result = await binding.execute(args, toolContext);
				emitCustomEvent("code_mode:external_result", {
					function: name,
					result,
					duration: Date.now() - startTime
				});
				return result;
			} catch (error) {
				emitCustomEvent("code_mode:external_error", {
					function: name,
					error: error instanceof Error ? error.message : String(error),
					duration: Date.now() - startTime
				});
				throw error;
			}
		}
	};
	return wrapped;
}
//#endregion
export { createEventAwareBindings, toolToBinding, toolsToBindings };

//# sourceMappingURL=tool-to-binding.js.map