import { InferToolInput, InferToolOutput } from '@tanstack/ai';
import { MCPServer } from './server/create-server.js';
import { MCPResourceContext } from './server/definitions.js';
type Named = {
    name: string;
};
type ToolNames<TTools extends ReadonlyArray<Named>> = TTools[number]['name'];
type ToolByName<TTools extends ReadonlyArray<Named>, TName extends string> = Extract<TTools[number], {
    name: TName;
}>;
type ResourceUris<TResources extends ReadonlyArray<{
    uri?: string;
}>> = Extract<TResources[number], {
    uri: string;
}>['uri'];
type PromptNames<TPrompts extends ReadonlyArray<Named>> = TPrompts[number]['name'];
type PromptByName<TPrompts extends ReadonlyArray<Named>, TName extends string> = Extract<TPrompts[number], {
    name: TName;
}>;
type ResourceContents<TResource> = TResource extends {
    read: (...args: never) => infer TResult;
} ? Awaited<TResult> : never;
type PromptArgs<TPrompt> = TPrompt extends {
    render: (input: infer TArgs) => unknown;
} ? TArgs : never;
type PromptMessages<TPrompt> = TPrompt extends {
    render: (input: never) => infer TResult;
} ? Awaited<TResult> : never;
/**
 * The client types of a `createMCPServer` server, for a client that
 * connects over a transport.
 *
 * Pass `typeof server` to `createMCPClient` with a `transport`.
 * Import the server with `import type`, so its code stays out of the client.
 *
 * @example
 * ```ts
 * import type { server } from './mcp-server.js'
 *
 * const client = await createMCPClient<typeof server>({
 *   transport: { type: 'http', url: 'https://mcp.example.com/mcp' },
 * })
 * await client.callTool('get_weather', { city: 'Paris' })
 * ```
 */
export type DescriptorFromServer<TServer extends MCPServer> = {
    tools: {
        [TTool in TServer['tools'][number] as TTool['name']]: {
            input: InferToolInput<TTool>;
            output: InferToolOutput<TTool>;
        };
    };
    resources: {
        [TResource in Extract<TServer['resources'][number], {
            uri: string;
        }> as TResource['uri']]: {
            uri: TResource['uri'];
            data: ResourceContents<TResource>;
        };
    };
    prompts: {
        [TPrompt in TServer['prompts'][number] as TPrompt['name']]: {
            args: PromptArgs<TPrompt>;
            messages: PromptMessages<TPrompt>;
        };
    };
    capabilities: Record<string, unknown>;
};
/**
 * Calls the tools, resources, and prompts on one TanStack MCP server.
 *
 * `server` is the object from `createMCPServer`.
 * The tool names, resource URIs, and prompt arguments stay typed.
 * This client does not open a network connection.
 * `callTool` checks `args` with the tool input schema and parses the output
 * with its output schema, like the HTTP server.
 * The tool gets the spec 2026 context: `ctx.context.requestInput` throws
 * `ToolInputRequiredError`, and `ctx.context.sample` uses the server
 * `sample` option.
 *
 * @param server - The server object to call
 *
 * @example
 * ```ts
 * const client = directMCPClient(server)
 * await client.callTool('get_weather', { city: 'Paris' })
 * ```
 */
export declare function directMCPClient<const TServer extends MCPServer>(server: TServer): {
    server: TServer;
    callTool<const TName extends ToolNames<TServer["tools"]>>(name: TName, args: InferToolInput<ToolByName<TServer["tools"], TName>>, options?: {
        signal?: AbortSignal;
    }): Promise<InferToolOutput<Extract<TServer["tools"][number], {
        name: TName;
    }>>>;
    /**
     * Reads a resource with a fixed `uri`. `context` reaches the resource
     * on `ctx.context`. It is empty when you leave it out.
     */
    readResource<const TUri extends ResourceUris<TServer["resources"]>>(uri: TUri, context?: MCPResourceContext["context"]): Promise<ResourceContents<Extract<TServer["resources"][number], {
        uri: TUri;
    }>>>;
    getPrompt<const TName extends PromptNames<TServer["prompts"]>>(name: TName, args: PromptArgs<PromptByName<TServer["prompts"], TName>>): Promise<PromptMessages<Extract<TServer["prompts"][number], {
        name: TName;
    }>>>;
};
export type DirectMCPClient<TServer extends MCPServer> = ReturnType<typeof directMCPClient<TServer>>;
export type DirectClientOptions<TServer extends MCPServer = MCPServer> = {
    server: TServer;
};
export {};
