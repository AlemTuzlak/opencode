/**
 * Internal. Parses a tool output with its `outputSchema`, like chat() does,
 * so the result matches the advertised output view. A result that fails
 * the schema but that the tool built itself (`isOwnResult`) is kept.
 * This module loads no MCP SDK, so the direct client can use it.
 */
export declare function parseToolOutput(tool: {
    name: string;
    outputSchema?: unknown;
}, output: unknown, isOwnResult: (value: unknown) => boolean): Promise<unknown>;
