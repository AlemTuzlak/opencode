import { SSEClientTransport, StreamableHTTPClientTransport } from "@modelcontextprotocol/client";
//#region src/transport.ts
/**
* Return true when `input` is already a Transport, not a config object.
*/
function isTransportInstance(input) {
	return "start" in input && typeof input.start === "function";
}
/**
* Build a Transport from HTTP config, SSE config, or an existing Transport.
*
* For stdio, build the Transport with `stdioTransport` and pass that instance.
* Throws an Error when the config type is `stdio` or is not a known type.
*/
async function resolveTransport(input) {
	if (isTransportInstance(input)) return input;
	switch (input.type) {
		case "http": return new StreamableHTTPClientTransport(new URL(input.url), {
			requestInit: { headers: input.headers },
			fetch: input.fetch,
			authProvider: input.authProvider
		});
		case "sse": return new SSEClientTransport(new URL(input.url), {
			requestInit: { headers: input.headers },
			fetch: input.fetch,
			authProvider: input.authProvider
		});
		case "stdio": throw new Error("stdio transport must be created via '@tanstack/ai-mcp/stdio': import { stdioTransport } from '@tanstack/ai-mcp/stdio' and pass the result as `transport`.");
		default: throw new Error(`Unknown MCP transport config: ${JSON.stringify(input)}`);
	}
}
//#endregion
export { isTransportInstance, resolveTransport };

//# sourceMappingURL=transport.js.map