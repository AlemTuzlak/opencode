export declare class MCPConnectionError extends Error {
    readonly cause?: unknown | undefined;
    constructor(message: string, cause?: unknown | undefined);
}
export declare class DuplicateToolNameError extends Error {
    readonly toolName: string;
    constructor(toolName: string);
}
/**
 * Thrown when a task-required tool is explicitly bound via `mcp.tools([...])`,
 * called via `callTool()`, or named in a `toolFilter` list, but the server
 * does not declare the tasks capability for tools/call, so the call could
 * never execute. (Auto-discovery without a `toolFilter` list skips such tools.)
 */
export declare class MCPTaskRequiredToolError extends Error {
    readonly toolName: string;
    constructor(toolName: string);
}
export declare class MCPToolNotFoundError extends Error {
    readonly toolName: string;
    constructor(toolName: string);
}
type ToolFilterDetails = {
    /** Listed, but the server has no tool with this name. */
    missing: Array<string>;
    /** Listed more than once. */
    repeated: Array<string>;
    /** The server's tool names. */
    available: Array<string>;
};
/**
 * Thrown by `tools()` when a `toolFilter` list names a tool that the server
 * does not have, or names a tool more than once.
 */
export declare class MCPToolFilterError extends Error {
    /** Listed, but the server has no tool with this name. */
    readonly missing: Array<string>;
    /** Listed more than once. */
    readonly repeated: Array<string>;
    /** The server's tool names. */
    readonly available: Array<string>;
    constructor(details: ToolFilterDetails);
}
export {};
