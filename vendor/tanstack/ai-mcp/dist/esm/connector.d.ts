import { AnyTool } from '@tanstack/ai';
import { MCPClientOptions } from './types.js';
export interface McpConnectorOptions {
    /** A short id, for example `'notion'`. Commands are `connect:<id>` and `disconnect:<id>`. */
    id: string;
    label: string;
    /** The MCP server URL (Streamable HTTP), for example `https://mcp.notion.com/mcp`. */
    url: string;
    /** Tool name prefix. Default: the id. Tools are named `<prefix>_<tool>` unless `toolName` is set. */
    prefix?: string;
    /**
     * The name the model sees for each tool. Wins over `prefix`.
     * See `MCPClientOptions.toolName`.
     */
    toolName?: MCPClientOptions['toolName'];
    /** Sent with the connect handshake, tool lists, tool calls, resources, and prompts. See `MCPClientOptions.requestOptions`. */
    requestOptions?: MCPClientOptions['requestOptions'];
    /** OAuth scopes to ask for. Default: what the server offers. */
    scopes?: ReadonlyArray<string>;
    /** The client name shown on the consent screen. Default `'TanStack AI Harness'`. */
    clientName?: string;
    /**
     * Ask for approval before tools that can change data. Default: every tool
     * the server does not mark `readOnlyHint`.
     */
    needsApproval?: (tool: {
        name: string;
        annotations?: {
            readOnlyHint?: boolean;
        };
    }) => boolean;
    /** Test hook for the OAuth and MCP requests. */
    fetch?: typeof fetch;
}
/**
 * A plugin that signs the user in to a remote MCP server (for example Notion
 * or Linear) and gives the model its tools, the way Claude Code connects to
 * MCP servers:
 *
 * - `/connect <id>` finds the server's OAuth settings, registers a client,
 *   and opens the browser (PKCE, loopback on `127.0.0.1`).
 * - The tokens stay in the credential store. The model never sees them.
 * - After sign-in, the next turn has the server's tools, named
 *   `<prefix>_<tool>` by default. `toolName` can change the names.
 *   Tools that can change data ask for approval.
 *
 * @example
 * ```ts
 * const notion = mcpConnector({ id: 'notion', label: 'Notion', url: 'https://mcp.notion.com/mcp' })
 * ```
 */
export declare function mcpConnector(options: McpConnectorOptions): import('@tanstack/ai-harness').HarnessPlugin<{
    readonly name: `connector/${string}`;
    readonly setup: (ctx: import('@tanstack/ai-harness').PluginSetupContext) => Promise<{
        prompts: {
            id: string;
            text: () => string;
        }[];
        discoverTools: () => Promise<readonly AnyTool[]>;
        commands: {
            [x: string]: import('@tanstack/ai-harness').CommandDefinition<any>;
        };
    }>;
}>;
