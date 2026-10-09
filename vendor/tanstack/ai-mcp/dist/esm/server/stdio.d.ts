/**
 * Serves one MCP server on stdin and stdout.
 *
 * `server` is the object that `createMCPServer` returns.
 * A host starts this process and sends JSON-RPC on stdin.
 * This function sends each message to `server.fetch`.
 * Then it writes each JSON-RPC answer on stdout.
 * stdout carries only protocol messages. Write logs with `console.error`.
 *
 * Call `close()` on the result to stop reading stdin.
 *
 * @param server - The server from `createMCPServer`
 *
 * @example
 * ```ts
 * const server = createMCPServer({
 *   name: 'weather',
 *   version: '1.0.0',
 *   tools: [getWeather],
 * })
 *
 * const handle = serveMCPStdio(server)
 * ```
 */
export declare function serveMCPStdio(server: {
    fetch: (request: Request) => Promise<Response>;
}): {
    close: () => Promise<void>;
};
