import { createServerToolContext } from "./server/context.js";
import { optionsOfServer } from "./server/registry.js";
import { parseToolOutput } from "./server/output.js";
import { isCallToolResult } from "@modelcontextprotocol/client";
import { parseWithStandardSchema } from "@tanstack/ai";
//#region src/direct-client.ts
function directToolContext(server, signal) {
	return {
		context: createServerToolContext({
			era: "2026",
			sample: optionsOfServer(server)?.sample
		}),
		abortSignal: signal ?? new AbortController().signal,
		emitCustomEvent() {}
	};
}
/**
* Calls the tools, resources, and prompts on one TanStack MCP server.
*
* `server` is the object from `createMCPServer`.
* The tool names, resource URIs, and prompt arguments stay typed.
* This client does not open a network connection.
* `callTool` checks `args` with the tool input schema and parses the output
* with its output schema, like the HTTP server.
* The tool gets the spec 2026 context: `ctx.context.requestInput` throws
* `ToolInputRequiredError`, and `ctx.context.sample` uses the server
* `sample` option.
*
* @param server - The server object to call
*
* @example
* ```ts
* const client = directMCPClient(server)
* await client.callTool('get_weather', { city: 'Paris' })
* ```
*/
function directMCPClient(server) {
	const tools = server.tools;
	const resources = server.resources;
	const prompts = server.prompts;
	return {
		server,
		async callTool(name, args, options) {
			const tool = tools.find((item) => item.name === name);
			if (tool === void 0 || tool.execute === void 0) throw new Error(`The MCP server has no tool ${name}.`);
			const execute = tool.execute;
			const output = await execute(parseWithStandardSchema(tool.inputSchema, args), directToolContext(server, options?.signal));
			return await parseToolOutput(tool, output, isCallToolResult);
		},
		/**
		* Reads a resource with a fixed `uri`. `context` reaches the resource
		* on `ctx.context`. It is empty when you leave it out.
		*/
		async readResource(uri, context = {}) {
			const resource = resources.find((item) => item.uri === uri);
			if (resource === void 0) throw new Error(`The MCP server has no resource ${uri}.`);
			const read = resource.read;
			return read(new URL(uri), {}, { context });
		},
		async getPrompt(name, args) {
			const prompt = prompts.find((item) => item.name === name);
			if (prompt === void 0) throw new Error(`The MCP server has no prompt ${name}.`);
			const render = prompt.render;
			return render(args);
		}
	};
}
//#endregion
export { directMCPClient };

//# sourceMappingURL=direct-client.js.map