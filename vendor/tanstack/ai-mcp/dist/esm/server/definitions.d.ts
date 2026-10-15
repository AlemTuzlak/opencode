import { AuthInfo, ListResourcesResult, Variables } from '@modelcontextprotocol/server';
/**
 * What a resource `read` and `list` receive. `context` holds the values
 * from `handle(request, { context })` and the verified `authInfo`.
 */
export type MCPResourceContext = {
    context: Record<string, unknown> & {
        authInfo?: AuthInfo;
    };
};
/** Lists the concrete resources of a template for `resources/list`. */
export type MCPResourceList = (ctx: MCPResourceContext) => ListResourcesResult | Promise<ListResourcesResult>;
/** Reads one resource. `variables` is `{}` for a resource with `uri`. */
export type MCPResourceRead<TContents = unknown> = (uri: URL, variables: Variables, ctx: MCPResourceContext) => TContents | Promise<TContents>;
type PromptMessage = {
    role: string;
    content: string;
};
type PromptArgsSchema<TArgs> = {
    parse: (input: unknown) => TArgs;
};
/**
 * The `variables` that `read` gets: the result of `argsSchema.parse` when the
 * resource has an `argsSchema`, else the template variables as matched.
 */
type ResourceArgsOf<TConfig> = TConfig extends {
    argsSchema: PromptArgsSchema<infer TArgs>;
} ? TArgs : Variables;
/**
 * Builds a resource definition for the MCP server.
 *
 * `config` takes `name`, `mimeType`, and one of `uri` or `uriTemplate`.
 * If `uri` and `uriTemplate` are both missing, this function throws a TypeError.
 * Only a template can take `list(ctx)`. It returns the concrete resources
 * for `resources/list`.
 * Call `.read` with a function that returns the resource contents.
 * It gets the requested `uri`, the template `variables`, and `ctx`.
 * `ctx.context` holds the values from `handle(request, { context })` and
 * the verified `authInfo`. A tool gets the same values on its `ctx.context`.
 *
 * A template can also take `argsSchema`. Its `parse` runs on the variables
 * before `read` gets them. A body `{ text | blob, mimeType }` sets the MIME
 * type of that answer, for a template whose files have different types.
 *
 * @param config - The resource `name`, `mimeType`, `uri` or `uriTemplate`, `list`, and `argsSchema`.
 * @throws {TypeError} When `uri` and `uriTemplate` are both missing.
 *
 * @example
 * ```ts
 * const readme = resourceDefinition({
 *   uri: 'file:///readme.md',
 *   name: 'readme',
 *   mimeType: 'text/markdown',
 * }).read(async () => ({ text: '# Hello' }))
 *
 * const summary = resourceDefinition({
 *   uriTemplate: 'myapp://items/{itemId}/summary',
 *   name: 'item-summary',
 *   mimeType: 'text/plain',
 * }).read(async (_uri, { itemId }) => ({ text: `Summary of ${String(itemId)}` }))
 *
 * const user = resourceDefinition({
 *   uriTemplate: 'users://{id}',
 *   name: 'user',
 *   mimeType: 'application/json',
 *   argsSchema: z.object({ id: z.string() }),
 * }).read(async (_uri, { id }) => ({ text: JSON.stringify(await loadUser(id)) }))
 * ```
 */
export declare function resourceDefinition<const TConfig extends {
    name: string;
    mimeType: string;
    uri: string;
    uriTemplate?: never;
    list?: never;
    argsSchema?: never;
} | {
    name: string;
    mimeType: string;
    uriTemplate: string;
    uri?: never;
    list?: MCPResourceList;
    argsSchema?: PromptArgsSchema<unknown>;
}>(config: TConfig): TConfig & {
    read<TContents>(readContents: (uri: URL, variables: ResourceArgsOf<TConfig>, ctx: MCPResourceContext) => TContents | Promise<TContents>): TConfig & {
        read: (uri: URL, variables: Variables, ctx: MCPResourceContext) => TContents | Promise<TContents>;
    };
};
/**
 * Builds a prompt definition for the MCP server.
 *
 * `config` takes `name`, `description`, and `argsSchema`.
 * `argsSchema.parse` runs before the render function receives the arguments.
 * Call `.render` with a function that returns an array of messages.
 * Each message has `role` and `content`.
 *
 * @param config - The prompt `name`, `description`, and `argsSchema`.
 *
 * @example
 * ```ts
 * const summarize = promptDefinition({
 *   name: 'summarize',
 *   description: 'Summarize a topic',
 *   argsSchema: z.object({ topic: z.string() }),
 * }).render(async (args) => [{ role: 'user', content: args.topic }])
 * ```
 */
export declare function promptDefinition<const TName extends string, TArgs>(config: {
    name: TName;
    description: string;
    argsSchema: PromptArgsSchema<TArgs>;
}): {
    render(renderPrompt: (args: TArgs) => ReadonlyArray<PromptMessage> | Promise<ReadonlyArray<PromptMessage>>): {
        render(input: TArgs): Promise<readonly PromptMessage[]>;
        name: TName;
        description: string;
        argsSchema: PromptArgsSchema<TArgs>;
    };
    name: TName;
    description: string;
    argsSchema: PromptArgsSchema<TArgs>;
};
export {};
