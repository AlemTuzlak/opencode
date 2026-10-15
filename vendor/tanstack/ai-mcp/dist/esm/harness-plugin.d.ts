import { AnyTool } from '@tanstack/ai';
import { AnyCommand, PluginPrompt, PluginSessionApi } from '@tanstack/ai-harness';
import { OnElicit } from './client.js';
import { HttpTransportConfig, StdioTransportConfig } from './transport.js';
/** One server of {@link mcp}, keyed by its name. */
export type McpServerConfig = (StdioTransportConfig | (HttpTransportConfig & {
    /**
     * Sign in with OAuth, like `mcpConnector`. This adds `/connect <name>`
     * and `/disconnect <name>`. The tools of the server come after the
     * sign-in, and the tools that are not read-only ask for approval.
     * `headers` and `authProvider` do not apply then.
     */
    oauth?: boolean;
})) & {
    /**
     * The time in milliseconds that this server can take to connect, to send
     * its tool list, or to answer a tool call. Default: the MCP SDK default,
     * 60,000.
     */
    timeoutMs?: number;
    /**
     * Give the tools of this server to code mode: the `codeMode()` plugin of
     * `@tanstack/ai-code-mode` takes them out of the tool list and lets the
     * model call them from `execute_typescript`. Without that plugin, nothing
     * changes.
     */
    codeMode?: boolean;
};
/**
 * The status of one server. UIs read the list from
 * `snapshot().plugins['tanstack/mcp'].servers`.
 */
export type McpServerStatus = {
    name: string;
    /** How many tools the server gives the model. */
    toolCount: number;
} & ({
    status: 'connecting' | 'connected';
} | {
    status: 'failed';
    error: string;
});
/**
 * A harness plugin that connects MCP servers and gives the model their
 * tools, named `<server>_<tool>`.
 *
 * - Each server connects on its own. A server that fails does not stop the
 *   others: it gets the status `failed` with the error.
 * - The servers connect in the background. The first turn waits for them.
 * - `/mcp` lists the servers and their status. UIs read the same list from
 *   the plugin state.
 * - A `stdio` server runs as a child process (Node only). It stops when the
 *   session closes.
 * - An `http` server with `oauth: true` signs in through `/connect <name>`.
 *
 * @param options.servers - The servers, keyed by name. The name is the tool
 *   prefix.
 *
 * @example
 * ```ts
 * import { mcp } from '@tanstack/ai-mcp/harness'
 *
 * plugins: () => [
 *   mcp({
 *     servers: {
 *       files: { type: 'stdio', command: 'npx', args: ['-y', '@modelcontextprotocol/server-filesystem', '.'] },
 *       docs: { type: 'http', url: 'https://mcp.example.com/mcp', timeoutMs: 10_000 },
 *       notion: { type: 'http', url: 'https://mcp.notion.com/mcp', oauth: true },
 *     },
 *   }),
 * ]
 * ```
 */
export declare function mcp(options: {
    servers: Readonly<Record<string, McpServerConfig>>;
}): import('@tanstack/ai-harness').HarnessPlugin<{
    readonly name: "tanstack/mcp";
    readonly setup: (ctx: import('@tanstack/ai-harness').PluginSetupContext) => Promise<{
        commands: Record<string, AnyCommand>;
        prompts: PluginPrompt[];
        discoverTools: () => Promise<(AnyTool | {
            metadata: {
                codeMode: boolean;
            };
            description: string;
            name: any;
            inputSchema?: any;
            outputSchema?: any;
            needsApproval?: boolean | undefined;
            lazy?: boolean | undefined;
            replay?: "safe" | "never" | undefined;
            execute?: ((args: any, context?: any) => any) | undefined;
        })[]>;
    }>;
}>;
/**
 * The harness asks the user for form and URL elicitations, so its clients
 * declare both. `chat()` clients keep the default: form only.
 */
export declare const harnessClientOptions: {
    capabilities: {
        elicitation: {
            form: {};
            url: {};
        };
    };
};
/**
 * Ask the session user when an MCP tool asks for input (a form or a URL
 * elicitation). The tool call waits for the answer, then sends it to the
 * server. On spec 2026, a tool call can ask up to 5 times. The answer is the
 * form content, or an MCP result such as `{ action: 'decline' }` or
 * `{ action: 'cancel' }`.
 */
export declare function askForInput(tools: ReadonlyArray<AnyTool>, session: PluginSessionApi): AnyTool[];
/** Answers the `elicitation/create` requests of a spec 2025 server. */
export declare function elicitFor(session: PluginSessionApi): OnElicit;
