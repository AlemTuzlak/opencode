import { AnyServerTool } from '@tanstack/ai';
import { AuthInfo, BearerAuthOptions, Variables } from '@modelcontextprotocol/server';
import { SampleRequest } from './context.js';
import { MCPResourceContext, MCPResourceList } from './definitions.js';
import { TaskStore } from './stores.js';
type McpResource = {
    name: string;
    mimeType: string;
    uri?: string;
    uriTemplate?: string;
    list?: MCPResourceList;
    read: BivariantResourceRead;
};
type BivariantResourceRead = BivariantResourceReadSignature['bivarianceHack'];
declare abstract class BivariantResourceReadSignature {
    abstract bivarianceHack(uri: URL, variables: Variables, ctx: MCPResourceContext): unknown;
}
type BivariantCallback<TInput, TOutput> = BivariantCallbackSignature<TInput, TOutput>['bivarianceHack'];
declare abstract class BivariantCallbackSignature<TInput, TOutput> {
    abstract bivarianceHack(input: TInput): TOutput;
}
type McpPrompt = {
    name: string;
    description: string;
    argsSchema: {
        parse: (input: unknown) => unknown;
    };
    render: BivariantCallback<unknown, unknown>;
};
export type MCPServerOptions = {
    name: string;
    version: string;
    tools?: ReadonlyArray<AnyServerTool>;
    resources?: ReadonlyArray<McpResource>;
    prompts?: ReadonlyArray<McpPrompt>;
    taskStore?: TaskStore;
    /**
     * Bearer-token auth, in the shape the MCP SDK uses.
     * `verifier` is an `OAuthTokenVerifier`. See `jwtVerifier` and
     * `introspectionVerifier`. `requiredScopes` and `resourceMetadataUrl`
     * are optional.
     */
    auth?: BearerAuthOptions;
    /**
     * How to serve a spec 2025 client. `'stateless'` (the default) serves
     * each spec 2025 request with a new server and keeps no session, so it
     * works on a host with many instances. `'memory'` keeps sessions in this
     * process for 30 idle minutes. `'reject'` answers every spec 2025 request
     * with the SDK rejection. Under `serveMCPStdio`, the default is
     * `'memory'`. Elicitation and client sampling need a
     * session: in that mode `ctx.context.requestInput` throws, and
     * `ctx.context.sample` calls `sample` or throws.
     */
    sessions?: 'memory' | 'reject' | 'stateless';
    /**
     * Receives errors that the SDK does not send to a tool: transport and
     * protocol errors, and rejected requests. `serveMCPStdio` also sends its
     * transport errors here instead of to stderr. It only reports. It does
     * not change the response.
     */
    onerror?: (error: Error) => void;
    sample?: (request: SampleRequest) => Promise<unknown>;
    waitUntil?: (promise: Promise<unknown>) => void;
};
/**
 * Per-request options for `server.handle`.
 *
 * `authInfo` is a token your own middleware already verified. The server
 * skips its `auth` gate for that request.
 * `context` is merged into `ctx.context` for every tool call, resource read,
 * and resource list of that request.
 */
export type MCPHandleOptions = {
    authInfo?: AuthInfo;
    context?: Record<string, unknown>;
};
/**
 * One MCP server and the definitions it serves.
 *
 * `tools`, `resources`, and `prompts` keep the types from the arguments.
 * Export this object from one package and import it in another.
 * `createMCPClient({ server })` then uses those types.
 */
export type MCPServer<TTools extends ReadonlyArray<AnyServerTool> = ReadonlyArray<AnyServerTool>, TResources extends ReadonlyArray<McpResource> = ReadonlyArray<McpResource>, TPrompts extends ReadonlyArray<McpPrompt> = ReadonlyArray<McpPrompt>> = {
    readonly name: string;
    readonly version: string;
    readonly tools: TTools;
    readonly resources: TResources;
    readonly prompts: TPrompts;
    fetch: (request: Request) => Promise<Response>;
    handle: (request: Request, options?: MCPHandleOptions) => Promise<Response>;
};
/**
 * Builds an MCP HTTP server.
 *
 * `options.name` and `options.version` name the server.
 * `options.tools` is a list of `toolDefinition().server()` tools.
 * `options.resources` uses `resourceDefinition().read()`.
 * `options.prompts` uses `promptDefinition().render()`.
 * `options.taskStore` keeps task records. The default store is in memory.
 * `options.auth` checks the bearer token with the SDK gate.
 * A missing or bad token gets a 401. A token without a required scope gets a 403.
 * Spec 2025 sessions and tasks belong to the caller: the `clientId` of the
 * token plus its `sub` claim. A tool reads the token as `ctx.context.authInfo`.
 * A spec 2025 client gets no session unless `options.sessions` is `'memory'`.
 * `options.sample` is the model adapter for `ctx.context.sample` on spec 2026.
 * `options.waitUntil` receives the task promise so a worker can stay alive.
 *
 * The result has `fetch(request)`, `handle(request, options)`, `tools`,
 * `resources`, and `prompts`. `handle` takes a token your own middleware
 * verified and values for `ctx.context`.
 * Those three lists keep the types you passed in.
 * Export the result from one package and pass it to `createMCPClient({ server })` in another.
 * `fetch` serves tools, resources, and prompts.
 * It speaks spec `2026-07-28` and spec 2025.
 * It does not serve the OAuth discovery documents. Mount
 * `oauthMetadataResponse` at the app root for them.
 *
 * On spec 2025, a tool with `execution: 'task'` returns a task handle before
 * the work ends. Spec 2026-07-28 has no tasks, so that tool runs inline there.
 * A tool reads its hooks on `ctx.context`. Type it with `MCPToolContext`.
 * On spec 2026, `ctx.context.sample` calls `options.sample` and does not ask the client.
 * On spec 2025 with `sessions: 'memory'`, `ctx.context.sample` asks the MCP client.
 * On spec 2026, `ctx.context.requestInput` stops the call until the client sends the answer.
 * On spec 2025 with `sessions: 'memory'`, `ctx.context.requestInput` waits on the open session.
 *
 * @param options - Server name, version, tools, and the optional stores
 *
 * @example
 * ```ts
 * const server = createMCPServer({
 *   name: 'weather',
 *   version: '1.0.0',
 *   tools: [getWeather],
 * })
 *
 * return server.fetch(request)
 * ```
 */
export declare function createMCPServer<const TTools extends ReadonlyArray<AnyServerTool> = [], const TResources extends ReadonlyArray<McpResource> = [], const TPrompts extends ReadonlyArray<McpPrompt> = []>(options: Omit<MCPServerOptions, 'tools' | 'resources' | 'prompts'> & {
    tools?: TTools;
    resources?: TResources;
    prompts?: TPrompts;
}): {
    name: string;
    version: string;
    tools: TTools | readonly [];
    resources: TResources | readonly [];
    prompts: TPrompts | readonly [];
    /**
     * Serves one MCP HTTP request. This is a plain Fetch handler.
     *
     * @param request - The HTTP request to the MCP route
     */
    fetch: (request: Request) => Promise<Response>;
    /**
     * Serves one MCP HTTP request with values from your own middleware.
     *
     * A spec 2026 request uses the per-request envelope.
     * A spec 2025 request uses the session id header.
     * When `auth` is set, a missing or invalid bearer token returns 401,
     * and a token without a required scope returns 403.
     * `handleOptions.authInfo` skips that gate. `handleOptions.context` reaches
     * `ctx.context` of every tool call, resource read, and resource list of
     * this request.
     *
     * @param request - The HTTP request to the MCP route
     * @param handleOptions - A verified token and values for `ctx.context`
     */
    handle(request: Request, handleOptions?: MCPHandleOptions): Promise<Response>;
};
export {};
