import { Client, ClientOptions, ElicitRequest, ElicitResult, GetPromptResult, Prompt, ReadResourceResult, Resource, ResourceTemplateType, Transport } from '@modelcontextprotocol/client';
import { DescriptorFromServer, DirectClientOptions, DirectMCPClient } from './direct-client.js';
import { MCPServer } from './server/create-server.js';
import { TransportConfig } from './transport.js';
import { AnyToolDefinition, AutomaticDescriptor, DescriptorTools, MCPClientOptions, MappedServerTools, McpServerTool, ServerDescriptor, ToolsOptions } from './types.js';
type CallToolResult = Awaited<ReturnType<Client['callTool']>>;
/**
 * The raw MCP result of `callTool`. When the tool output type is known,
 * `structuredContent` has that type. An untyped tool keeps the SDK type.
 */
export type TypedCallToolResult<TOutput> = unknown extends TOutput ? CallToolResult : Omit<CallToolResult, 'structuredContent'> & {
    structuredContent?: TOutput;
};
type ToolPolicy = Pick<MCPClientOptions, 'toolFilter' | 'needsApproval' | 'toolName' | 'requestOptions'>;
export interface MCPClient<TServer extends ServerDescriptor = AutomaticDescriptor> {
    readonly capabilities: TServer['capabilities'];
    /**
     * The server's instructions from the connect handshake: how to use its
     * tools, meant for the model's system prompt. `undefined` when the server
     * sends none.
     *
     * Optional so an existing hand-rolled `MCPClient` keeps compiling.
     */
    readonly instructions?: string;
    /**
     * Auto-discovery: every server tool as a ServerTool. With a generated
     * descriptor, tool names are typed as the descriptor's name literals;
     * args/results stay untyped — use the `tools(defs)` overload for typed args.
     *
     * Both overloads yield {@link McpServerTool}s, so `tool.metadata.mcp` (the
     * server's title / annotations) is typed without an annotation or a cast.
     */
    tools: {
        (options?: ToolsOptions): Promise<DescriptorTools<TServer>>;
        /**
         * Explicit: bind these TanStack toolDefinitions to the server (typed +
         * validated, allowlist). Note: the runtime tool name is `toolName(tool)`
         * when the client sets `toolName`, else `${prefix}_${def.name}` with a
         * `prefix`. The static `TName` stays the definition name.
         */
        <const TDefs extends ReadonlyArray<AnyToolDefinition>>(defs: TDefs, options?: ToolsOptions): Promise<MappedServerTools<TDefs>>;
    };
    resources: () => Promise<Array<Resource>>;
    /**
     * Reads one resource. With a typed server, `uri` is one of its resource URIs.
     */
    readResource: (uri: TServer['resources'][keyof TServer['resources']]['uri']) => Promise<ReadResourceResult>;
    resourceTemplates: () => Promise<Array<ResourceTemplateType>>;
    prompts: () => Promise<Array<Prompt>>;
    /**
     * Renders one prompt. With a typed server, `name` is one of its prompt
     * names and `args` has that prompt's argument type. MCP sends each
     * argument as a string.
     */
    getPrompt: <TName extends keyof TServer['prompts'] & string>(name: TName, args?: TServer['prompts'][TName]['args']) => Promise<GetPromptResult>;
    /**
     * Call a tool directly and return its raw MCP result. Tools declaring
     * `execution.taskSupport: 'required'` automatically use task execution when
     * the server declares the tasks capability for tools/call. Pass
     * `options.signal` to abort — an in-flight task is best-effort cancelled on
     * the server.
     *
     * With a typed server, `name` is one of its tool names and `args` has
     * that tool's input type. The result is the raw MCP result. For a tool
     * with an output schema, `structuredContent` has the tool output type.
     */
    callTool: <TName extends keyof TServer['tools'] & string>(name: TName, args?: TServer['tools'][TName]['input'], options?: {
        signal?: AbortSignal;
    }) => Promise<TypedCallToolResult<TServer['tools'][TName]['output']>>;
    /**
     * The ORIGINAL connection descriptor this client was created from — the
     * `transport` input and `prefix` passed to `createMCPClient`. Used by
     * `createMcpAppCallHandler` to reconnect per-call (serverless-safe) without
     * a separate transport-config map.
     *
     * `transport` is `undefined` when the client was built from a ready-made
     * `Transport` instance rather than a serializable config — either via
     * `createMCPClientFromTransport` (test-only) or `createMCPClient({ transport:
     * <instance> })`. A live `Transport` instance is single-use and cannot be
     * reconnected, so only serializable `TransportConfig`s are retained here.
     */
    getInfo: () => {
        transport: TransportConfig | undefined;
        prefix: string | undefined;
        /**
         * The options this client was built with, so a caller that reconstructs it
         * from this descriptor keeps them. Without it a rebuilt client silently
         * reverts to the SDK defaults — including the AJV validator that edge
         * runtimes cannot compile.
         *
         * Optional so an existing hand-rolled `MCPClient` keeps compiling.
         */
        clientOptions?: ClientOptions;
        toolFilter?: MCPClientOptions['toolFilter'];
        needsApproval?: MCPClientOptions['needsApproval'];
        toolName?: MCPClientOptions['toolName'];
        requestOptions?: MCPClientOptions['requestOptions'];
    };
    close: () => Promise<void>;
    [Symbol.asyncDispose]: () => Promise<void>;
}
declare class MCPClientImpl<TServer extends ServerDescriptor> implements MCPClient<TServer> {
    #private;
    capabilities: TServer['capabilities'];
    instructions: string | undefined;
    private readonly prefix?;
    constructor(prefix?: string, name?: string, version?: string, transport?: TransportConfig, clientOptions?: ClientOptions, policy?: ToolPolicy, onElicit?: OnElicit);
    getInfo(): {
        transport: TransportConfig | undefined;
        prefix: string | undefined;
        clientOptions?: ClientOptions;
        toolFilter?: MCPClientOptions['toolFilter'];
        needsApproval?: MCPClientOptions['needsApproval'];
        toolName?: MCPClientOptions['toolName'];
        requestOptions?: MCPClientOptions['requestOptions'];
    };
    connect(transport: Transport): Promise<void>;
    tools(defsOrOptions?: ReadonlyArray<AnyToolDefinition> | ToolsOptions, maybeOptions?: ToolsOptions): Promise<Array<McpServerTool>>;
    resources(): Promise<Array<Resource>>;
    readResource(uri: string): Promise<ReadResourceResult>;
    resourceTemplates(): Promise<Array<ResourceTemplateType>>;
    prompts(): Promise<Array<Prompt>>;
    getPrompt(name: string, args?: unknown): Promise<GetPromptResult>;
    callTool<TName extends keyof TServer['tools'] & string>(name: TName, args?: TServer['tools'][TName]['input'], options?: {
        signal?: AbortSignal;
    }): Promise<TypedCallToolResult<TServer['tools'][TName]['output']>>;
    close(): Promise<void>;
    [Symbol.asyncDispose](): Promise<void>;
}
/**
 * Connects to an MCP server.
 *
 * Pass `transport` for a server at a URL, on SSE, or on stdio.
 * The client speaks MCP over that transport, so server auth applies.
 *
 * To type a transport client from a TanStack server, pass `typeof server`
 * as the type argument. Import the server with `import type`.
 *
 * Pass `server` to call a `createMCPServer` result in this process.
 * That client calls the tool functions directly. It opens no connection,
 * and the server `auth` option does not run.
 *
 * @param options - A transport, or a TanStack MCP server in this process
 *
 * @example
 * ```ts
 * const remote = await createMCPClient<typeof server>({
 *   transport: { type: 'http', url: 'https://mcp.example.com/mcp' },
 * })
 * await remote.callTool('get_weather', { city: 'Paris' })
 *
 * const local = await createMCPClient({ server })
 * await local.callTool('get_weather', { city: 'Paris' })
 * ```
 */
export declare function createMCPClient<TDescriptor extends ServerDescriptor = AutomaticDescriptor>(options: MCPClientOptions): Promise<MCPClient<TDescriptor>>;
export declare function createMCPClient<TServer extends MCPServer>(options: MCPClientOptions): Promise<MCPClient<DescriptorFromServer<TServer>>>;
export declare function createMCPClient<TServer extends MCPServer>(options: DirectClientOptions<TServer>): Promise<DirectMCPClient<TServer>>;
/** Answers a spec 2025 `elicitation/create` request. */
export type OnElicit = (params: ElicitRequest['params']) => Promise<ElicitResult>;
/**
 * Connects a client to a transport. The harness passes `onElicit` to answer
 * the `elicitation/create` requests of spec 2025 servers.
 */
export declare function connectTransport<TServer extends ServerDescriptor = AutomaticDescriptor>(options: MCPClientOptions, onElicit?: OnElicit): Promise<MCPClientImpl<TServer>>;
/** Test-only: connect directly from a transport instance (skips resolveTransport). */
export declare function createMCPClientFromTransport<TServer extends ServerDescriptor = AutomaticDescriptor>(transport: Transport, prefix?: string, clientOptions?: ClientOptions): Promise<MCPClient<TServer>>;
export {};
