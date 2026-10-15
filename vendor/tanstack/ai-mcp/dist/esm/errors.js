//#region src/errors.ts
var MCPConnectionError = class extends Error {
	cause;
	constructor(message, cause) {
		super(message);
		this.cause = cause;
		this.name = "MCPConnectionError";
	}
};
var DuplicateToolNameError = class extends Error {
	toolName;
	constructor(toolName) {
		super(`Duplicate MCP tool name "${toolName}". Set a unique \`prefix\` on one of the MCP clients (createMCPClient({ transport, prefix: '...' })) to disambiguate.`);
		this.toolName = toolName;
		this.name = "DuplicateToolNameError";
	}
};
/**
* Thrown when a task-required tool is explicitly bound via `mcp.tools([...])`,
* called via `callTool()`, or named in a `toolFilter` list, but the server
* does not declare the tasks capability for tools/call, so the call could
* never execute. (Auto-discovery without a `toolFilter` list skips such tools.)
*/
var MCPTaskRequiredToolError = class extends Error {
	toolName;
	constructor(toolName) {
		super(`MCP tool "${toolName}" requires task-based execution, but the server does not declare the tasks capability for tools/call`);
		this.toolName = toolName;
		this.name = "MCPTaskRequiredToolError";
	}
};
var MCPToolNotFoundError = class extends Error {
	toolName;
	constructor(toolName) {
		super(`toolDefinition name "${toolName}" was passed to mcp.tools([...]) but the MCP server exposes no tool with that name, or the client's \`toolFilter\` hides it. Check the name or run mcp.tools() to list.`);
		this.toolName = toolName;
		this.name = "MCPToolNotFoundError";
	}
};
function toolFilterMessage(details) {
	const names = (list) => list.map((name) => `"${name}"`).join(", ");
	const parts = ["The MCP client `toolFilter` list does not match the server."];
	if (details.missing.length > 0) parts.push(`The server has no tool named ${names(details.missing)}.`);
	if (details.repeated.length > 0) parts.push(`The list repeats ${names(details.repeated)}.`);
	const available = details.available.length > 0 ? names(details.available) : "(none)";
	parts.push(`Available tools: ${available}.`);
	return parts.join(" ");
}
/**
* Thrown by `tools()` when a `toolFilter` list names a tool that the server
* does not have, or names a tool more than once.
*/
var MCPToolFilterError = class extends Error {
	/** Listed, but the server has no tool with this name. */
	missing;
	/** Listed more than once. */
	repeated;
	/** The server's tool names. */
	available;
	constructor(details) {
		super(toolFilterMessage(details));
		this.name = "MCPToolFilterError";
		this.missing = details.missing;
		this.repeated = details.repeated;
		this.available = details.available;
	}
};
//#endregion
export { DuplicateToolNameError, MCPConnectionError, MCPTaskRequiredToolError, MCPToolFilterError, MCPToolNotFoundError };

//# sourceMappingURL=errors.js.map