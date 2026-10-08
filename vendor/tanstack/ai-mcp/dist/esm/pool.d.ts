import { MCPClient } from './client.js';
import { MCPClientOptions, McpServerTool, ServerDescriptor, ToolsOptions } from './types.js';
import { ClientOptions, ReadResourceResult } from '@modelcontextprotocol/client';
import { TransportConfig } from './transport.js';
export type MCPClientsConfig = Record<string, MCPClientOptions>;
export interface MCPClients<TServers extends Record<string, ServerDescriptor> = Record<string, ServerDescriptor>> {
    /** Typed per-server access (typed defs, resources, prompts on one server). */
    readonly clients: {
        [K in keyof TServers]: MCPClient<TServers[K]>;
    };
    /**
     * All servers' tools, flattened and auto-prefixed by config key.
     * `options` (including `lazy`) is forwarded to every client's `tools()`.
     */
    tools: (options?: ToolsOptions) => Promise<Array<McpServerTool>>;
    /**
     * Reads an MCP resource by URI, routing to the owning client. A `ui://`
     * resource read must hit the server that owns it; since the pool does not
     * track ownership, each underlying client is tried in turn and the first
     * success is returned. If every client fails, the last error is thrown.
     *
     * Required so a pool source emits `ui-resource` events for MCP Apps widgets
     * (the chat manager binds `readResource` only when the source exposes it).
     */
    readResource: (uri: string) => Promise<ReadResourceResult>;
    /**
     * The connection descriptors for every server in the pool, keyed by config
     * key (the serverId / default prefix). Used by `createMcpAppCallHandler` to
     * reconnect per-call (serverless-safe) without a separate transport-config
     * map. Each value mirrors the owning client's `getInfo()`.
     */
    getServers: () => Record<string, {
        transport: TransportConfig | undefined;
        prefix: string | undefined;
        clientOptions?: ClientOptions;
        toolFilter?: MCPClientOptions['toolFilter'];
        needsApproval?: MCPClientOptions['needsApproval'];
        toolName?: MCPClientOptions['toolName'];
        requestOptions?: MCPClientOptions['requestOptions'];
    }>;
    /** Close every client. */
    close: () => Promise<void>;
    [Symbol.asyncDispose]: () => Promise<void>;
}
export declare function createMCPClients<TServers extends Record<string, ServerDescriptor> = Record<string, ServerDescriptor>>(config: {
    [K in keyof TServers]: MCPClientOptions;
} & MCPClientsConfig): Promise<MCPClients<TServers>>;
