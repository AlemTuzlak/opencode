import { MCPClient } from '../client.js';
import { MCPClients } from '../pool.js';
import { McpAppCallRequest, McpSessionStore } from './session-store.js';
/**
 * A single MCP client or a pool of clients (or an array of either). These are
 * the same client/pool instances created with `createMCPClient` /
 * `createMCPClients` and passed to `chat({ mcp: { clients: [...] } })`. The
 * handler reads each client's connection descriptor via `getInfo()` /
 * `getServers()` so it can reconnect per-call without a separate config map.
 */
export type McpAppClientsInput = MCPClient | MCPClients | Array<MCPClient | MCPClients>;
export interface McpAppCallHandlerOptions {
    /**
     * The MCP client(s) to serve widget tool calls for — the same instances you
     * pass to `chat({ mcp: { clients } })`. Accepts a single client, a pool, or
     * an array of either. The handler reads each one's connection descriptor and
     * reconnects per-call (stateless/serverless-safe).
     */
    clients: McpAppClientsInput;
    /**
     * Opt-in dynamic/stateful resolution (e.g. inMemoryMcpSessionStore). When
     * provided, the store WINS for any thread+serverId it has an entry for; on a
     * store miss (null) the handler falls back to the static `clients` registry.
     * So `clients` is always the base and the store is an override on top.
     */
    store?: McpSessionStore;
    /**
     * Additional per-call authorizer. The server-exposure check is ALWAYS
     * enforced first (any tool the server does not expose is rejected). When
     * `allowTool` is provided, a request must satisfy BOTH — it is AND-ed on
     * top of the server-exposure check, not a replacement for it.
     */
    allowTool?: (req: McpAppCallRequest) => boolean | Promise<boolean>;
    /**
     * Optional server-side observability hook. The handler is otherwise opaque on
     * failure — it returns a fail-soft `{ ok: false, error }` to the (untrusted)
     * widget and logs nothing, so on a serverless backend there is no trace of
     * WHY a proxied call failed. `onError` is invoked (and awaited if async) with
     * the caught error and the originating request before that result is
     * returned. `phase` distinguishes a `'call'` failure (connect/exposure
     * lookup/execution/serialization) from a `'close'` failure (per-call client
     * cleanup, which is swallowed and never affects the result). This library
     * never writes to `console`; wire your logger here to capture failures.
     */
    onError?: (error: unknown, info: {
        phase: 'call' | 'close';
        req: McpAppCallRequest;
    }) => void | Promise<void>;
}
/**
 * Creates a server-side handler that resolves an MCP server descriptor from the
 * provided client(s), reconnects per-call (stateless/serverless-safe), enforces
 * a same-server allowlist, and proxies `callTool` to the underlying MCP server.
 *
 * Always closes the per-call client in `finally`. Never returns transport config.
 */
export declare function createMcpAppCallHandler(opts: McpAppCallHandlerOptions): (req: McpAppCallRequest) => Promise<{
    ok: true;
    result: unknown;
} | {
    ok: false;
    error: string;
}>;
