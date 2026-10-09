import { JSONSchema } from '@tanstack/ai';
import { AnyHarness, HarnessHost } from '@tanstack/ai-harness';
import { MCPToolContext } from './server/context.js';
export { mcp } from './harness-plugin.js';
export type { McpServerConfig, McpServerStatus } from './harness-plugin.js';
/** Options for {@link createHarnessMcpServer}. */
export interface HarnessMcpServerOptions {
    /** The host that runs the sessions, from `createHarnessHost`. */
    host: HarnessHost;
    /** The harness to serve. */
    harness: AnyHarness;
    /** The conversation of a tool call that names no `threadId`. Default `'main'`. */
    threadId?: string;
    /**
     * What happens when a turn stops for a tool call that needs approval.
     * - `'ask'` (default): ask the user in the MCP client (elicitation). A
     *   client without elicitation gets the approvals in the result. It answers
     *   them with `approve`, `reject`, or `resolve`.
     * - `'auto'`: approve every tool call.
     *
     * Both modes answer tool approvals only. When the turn also waits for
     * another kind of interrupt, every interrupt comes back in the result. The
     * client answers them all with one `resolve`.
     */
    approvals?: 'ask' | 'auto';
    /**
     * The folders that a `path` attachment of `chat` can read from. A path must
     * resolve, after every symlink, to a file inside one of them. Leave it out,
     * and every `path` attachment is refused.
     *
     * The stdio CLI (`--mcp`) passes the working folder. An HTTP server should
     * pass none, because a remote client must not read files on the server.
     */
    filePaths?: ReadonlyArray<string>;
    /** The MCP server name. Default: the harness name. */
    name?: string;
    /** The MCP server version. Default `'1.0.0'`. */
    version?: string;
}
/**
 * Serves a harness as an MCP server, so any MCP client (Claude Code, Claude
 * Desktop, Cursor, another agent) can use it.
 *
 * The tools are `chat`, `steer`, `cancel`, `approve`, `reject`, `resolve`,
 * `answer`, and `status`, plus `agent_<name>` for each agent in
 * `harness.expose.agents` and `command_<name>` for each plugin command in
 * `harness.expose.commands`.
 * Every tool takes an optional `threadId`. Sessions open with
 * `host.open(harness, { threadId })`.
 *
 * Each interrupt in a result has a `kind`: `approval`, `client-tool`, or
 * `generic`. `approve` and `reject` answer approvals only. `resolve` answers
 * every kind: `approved` for an approval, and `payload` for the others.
 *
 * `chat` takes `attachments`: `{ path }` (only inside `filePaths`),
 * `{ url, mimeType? }` (the model reads the URL, the server does not fetch
 * it), or `{ data, mimeType }` (base64). A result lists the media that the
 * work made in `media`. An image or audio file up to 5 MB comes back inline.
 * Any other file comes back as a `resource_link` to
 * `harness-media://<threadId>/<id>`, which `resources/read` returns.
 *
 * The result is the server from `createMCPServer`. Mount `server.fetch` on
 * an HTTP route, or pass the server to `serveMCPStdio`.
 *
 * @param options - The host, the harness, the default thread, the approval mode, and the folders for `path` attachments
 *
 * @example
 * ```ts
 * const server = await createHarnessMcpServer({ host, harness: assistant })
 * serveMCPStdio(server)
 * ```
 */
export declare function createHarnessMcpServer(options: HarnessMcpServerOptions): Promise<{
    name: string;
    version: string;
    tools: readonly [] | readonly [import('@tanstack/ai').ServerTool<{
        type: string;
        properties: {
            threadId: JSONSchema;
        };
        items?: JSONSchema | Array<JSONSchema>;
        required?: Array<string>;
        enum?: Array<unknown>;
        const?: unknown;
        description?: string;
        default?: unknown;
        $ref?: string;
        $defs?: Record<string, JSONSchema>;
        definitions?: Record<string, JSONSchema>;
        allOf?: Array<JSONSchema>;
        anyOf?: Array<JSONSchema>;
        oneOf?: Array<JSONSchema>;
        not?: JSONSchema;
        if?: JSONSchema;
        then?: JSONSchema;
        else?: JSONSchema;
        minimum?: number;
        maximum?: number;
        exclusiveMinimum?: number;
        exclusiveMaximum?: number;
        minLength?: number;
        maxLength?: number;
        pattern?: string;
        format?: string;
        minItems?: number;
        maxItems?: number;
        uniqueItems?: boolean;
        additionalProperties?: boolean | JSONSchema;
        additionalItems?: boolean | JSONSchema;
        patternProperties?: Record<string, JSONSchema>;
        propertyNames?: JSONSchema;
        minProperties?: number;
        maxProperties?: number;
        title?: string;
        examples?: Array<unknown>;
    }, undefined, "chat", MCPToolContext, false, undefined> & {
        inputSchema: {
            type: string;
            properties: {
                threadId: JSONSchema;
            };
            items?: JSONSchema | Array<JSONSchema>;
            required?: Array<string>;
            enum?: Array<unknown>;
            const?: unknown;
            description?: string;
            default?: unknown;
            $ref?: string;
            $defs?: Record<string, JSONSchema>;
            definitions?: Record<string, JSONSchema>;
            allOf?: Array<JSONSchema>;
            anyOf?: Array<JSONSchema>;
            oneOf?: Array<JSONSchema>;
            not?: JSONSchema;
            if?: JSONSchema;
            then?: JSONSchema;
            else?: JSONSchema;
            minimum?: number;
            maximum?: number;
            exclusiveMinimum?: number;
            exclusiveMaximum?: number;
            minLength?: number;
            maxLength?: number;
            pattern?: string;
            format?: string;
            minItems?: number;
            maxItems?: number;
            uniqueItems?: boolean;
            additionalProperties?: boolean | JSONSchema;
            additionalItems?: boolean | JSONSchema;
            patternProperties?: Record<string, JSONSchema>;
            propertyNames?: JSONSchema;
            minProperties?: number;
            maxProperties?: number;
            title?: string;
            examples?: Array<unknown>;
        };
        outputSchema: undefined;
        approvalSchema: undefined;
    }, import('@tanstack/ai').ServerTool<{
        type: string;
        properties: {
            threadId: JSONSchema;
        };
        items?: JSONSchema | Array<JSONSchema>;
        required?: Array<string>;
        enum?: Array<unknown>;
        const?: unknown;
        description?: string;
        default?: unknown;
        $ref?: string;
        $defs?: Record<string, JSONSchema>;
        definitions?: Record<string, JSONSchema>;
        allOf?: Array<JSONSchema>;
        anyOf?: Array<JSONSchema>;
        oneOf?: Array<JSONSchema>;
        not?: JSONSchema;
        if?: JSONSchema;
        then?: JSONSchema;
        else?: JSONSchema;
        minimum?: number;
        maximum?: number;
        exclusiveMinimum?: number;
        exclusiveMaximum?: number;
        minLength?: number;
        maxLength?: number;
        pattern?: string;
        format?: string;
        minItems?: number;
        maxItems?: number;
        uniqueItems?: boolean;
        additionalProperties?: boolean | JSONSchema;
        additionalItems?: boolean | JSONSchema;
        patternProperties?: Record<string, JSONSchema>;
        propertyNames?: JSONSchema;
        minProperties?: number;
        maxProperties?: number;
        title?: string;
        examples?: Array<unknown>;
    }, undefined, "steer", unknown, false, undefined> & {
        inputSchema: {
            type: string;
            properties: {
                threadId: JSONSchema;
            };
            items?: JSONSchema | Array<JSONSchema>;
            required?: Array<string>;
            enum?: Array<unknown>;
            const?: unknown;
            description?: string;
            default?: unknown;
            $ref?: string;
            $defs?: Record<string, JSONSchema>;
            definitions?: Record<string, JSONSchema>;
            allOf?: Array<JSONSchema>;
            anyOf?: Array<JSONSchema>;
            oneOf?: Array<JSONSchema>;
            not?: JSONSchema;
            if?: JSONSchema;
            then?: JSONSchema;
            else?: JSONSchema;
            minimum?: number;
            maximum?: number;
            exclusiveMinimum?: number;
            exclusiveMaximum?: number;
            minLength?: number;
            maxLength?: number;
            pattern?: string;
            format?: string;
            minItems?: number;
            maxItems?: number;
            uniqueItems?: boolean;
            additionalProperties?: boolean | JSONSchema;
            additionalItems?: boolean | JSONSchema;
            patternProperties?: Record<string, JSONSchema>;
            propertyNames?: JSONSchema;
            minProperties?: number;
            maxProperties?: number;
            title?: string;
            examples?: Array<unknown>;
        };
        outputSchema: undefined;
        approvalSchema: undefined;
    }, import('@tanstack/ai').ServerTool<{
        type: string;
        properties: {
            threadId: JSONSchema;
        };
        items?: JSONSchema | Array<JSONSchema>;
        required?: Array<string>;
        enum?: Array<unknown>;
        const?: unknown;
        description?: string;
        default?: unknown;
        $ref?: string;
        $defs?: Record<string, JSONSchema>;
        definitions?: Record<string, JSONSchema>;
        allOf?: Array<JSONSchema>;
        anyOf?: Array<JSONSchema>;
        oneOf?: Array<JSONSchema>;
        not?: JSONSchema;
        if?: JSONSchema;
        then?: JSONSchema;
        else?: JSONSchema;
        minimum?: number;
        maximum?: number;
        exclusiveMinimum?: number;
        exclusiveMaximum?: number;
        minLength?: number;
        maxLength?: number;
        pattern?: string;
        format?: string;
        minItems?: number;
        maxItems?: number;
        uniqueItems?: boolean;
        additionalProperties?: boolean | JSONSchema;
        additionalItems?: boolean | JSONSchema;
        patternProperties?: Record<string, JSONSchema>;
        propertyNames?: JSONSchema;
        minProperties?: number;
        maxProperties?: number;
        title?: string;
        examples?: Array<unknown>;
    }, undefined, "cancel", unknown, false, undefined> & {
        inputSchema: {
            type: string;
            properties: {
                threadId: JSONSchema;
            };
            items?: JSONSchema | Array<JSONSchema>;
            required?: Array<string>;
            enum?: Array<unknown>;
            const?: unknown;
            description?: string;
            default?: unknown;
            $ref?: string;
            $defs?: Record<string, JSONSchema>;
            definitions?: Record<string, JSONSchema>;
            allOf?: Array<JSONSchema>;
            anyOf?: Array<JSONSchema>;
            oneOf?: Array<JSONSchema>;
            not?: JSONSchema;
            if?: JSONSchema;
            then?: JSONSchema;
            else?: JSONSchema;
            minimum?: number;
            maximum?: number;
            exclusiveMinimum?: number;
            exclusiveMaximum?: number;
            minLength?: number;
            maxLength?: number;
            pattern?: string;
            format?: string;
            minItems?: number;
            maxItems?: number;
            uniqueItems?: boolean;
            additionalProperties?: boolean | JSONSchema;
            additionalItems?: boolean | JSONSchema;
            patternProperties?: Record<string, JSONSchema>;
            propertyNames?: JSONSchema;
            minProperties?: number;
            maxProperties?: number;
            title?: string;
            examples?: Array<unknown>;
        };
        outputSchema: undefined;
        approvalSchema: undefined;
    }, import('@tanstack/ai').ServerTool<{
        type: string;
        properties: {
            threadId: JSONSchema;
        };
        items?: JSONSchema | Array<JSONSchema>;
        required?: Array<string>;
        enum?: Array<unknown>;
        const?: unknown;
        description?: string;
        default?: unknown;
        $ref?: string;
        $defs?: Record<string, JSONSchema>;
        definitions?: Record<string, JSONSchema>;
        allOf?: Array<JSONSchema>;
        anyOf?: Array<JSONSchema>;
        oneOf?: Array<JSONSchema>;
        not?: JSONSchema;
        if?: JSONSchema;
        then?: JSONSchema;
        else?: JSONSchema;
        minimum?: number;
        maximum?: number;
        exclusiveMinimum?: number;
        exclusiveMaximum?: number;
        minLength?: number;
        maxLength?: number;
        pattern?: string;
        format?: string;
        minItems?: number;
        maxItems?: number;
        uniqueItems?: boolean;
        additionalProperties?: boolean | JSONSchema;
        additionalItems?: boolean | JSONSchema;
        patternProperties?: Record<string, JSONSchema>;
        propertyNames?: JSONSchema;
        minProperties?: number;
        maxProperties?: number;
        title?: string;
        examples?: Array<unknown>;
    }, undefined, "approve", MCPToolContext, false, undefined> & {
        inputSchema: {
            type: string;
            properties: {
                threadId: JSONSchema;
            };
            items?: JSONSchema | Array<JSONSchema>;
            required?: Array<string>;
            enum?: Array<unknown>;
            const?: unknown;
            description?: string;
            default?: unknown;
            $ref?: string;
            $defs?: Record<string, JSONSchema>;
            definitions?: Record<string, JSONSchema>;
            allOf?: Array<JSONSchema>;
            anyOf?: Array<JSONSchema>;
            oneOf?: Array<JSONSchema>;
            not?: JSONSchema;
            if?: JSONSchema;
            then?: JSONSchema;
            else?: JSONSchema;
            minimum?: number;
            maximum?: number;
            exclusiveMinimum?: number;
            exclusiveMaximum?: number;
            minLength?: number;
            maxLength?: number;
            pattern?: string;
            format?: string;
            minItems?: number;
            maxItems?: number;
            uniqueItems?: boolean;
            additionalProperties?: boolean | JSONSchema;
            additionalItems?: boolean | JSONSchema;
            patternProperties?: Record<string, JSONSchema>;
            propertyNames?: JSONSchema;
            minProperties?: number;
            maxProperties?: number;
            title?: string;
            examples?: Array<unknown>;
        };
        outputSchema: undefined;
        approvalSchema: undefined;
    }, import('@tanstack/ai').ServerTool<{
        type: string;
        properties: {
            threadId: JSONSchema;
        };
        items?: JSONSchema | Array<JSONSchema>;
        required?: Array<string>;
        enum?: Array<unknown>;
        const?: unknown;
        description?: string;
        default?: unknown;
        $ref?: string;
        $defs?: Record<string, JSONSchema>;
        definitions?: Record<string, JSONSchema>;
        allOf?: Array<JSONSchema>;
        anyOf?: Array<JSONSchema>;
        oneOf?: Array<JSONSchema>;
        not?: JSONSchema;
        if?: JSONSchema;
        then?: JSONSchema;
        else?: JSONSchema;
        minimum?: number;
        maximum?: number;
        exclusiveMinimum?: number;
        exclusiveMaximum?: number;
        minLength?: number;
        maxLength?: number;
        pattern?: string;
        format?: string;
        minItems?: number;
        maxItems?: number;
        uniqueItems?: boolean;
        additionalProperties?: boolean | JSONSchema;
        additionalItems?: boolean | JSONSchema;
        patternProperties?: Record<string, JSONSchema>;
        propertyNames?: JSONSchema;
        minProperties?: number;
        maxProperties?: number;
        title?: string;
        examples?: Array<unknown>;
    }, undefined, "reject", MCPToolContext, false, undefined> & {
        inputSchema: {
            type: string;
            properties: {
                threadId: JSONSchema;
            };
            items?: JSONSchema | Array<JSONSchema>;
            required?: Array<string>;
            enum?: Array<unknown>;
            const?: unknown;
            description?: string;
            default?: unknown;
            $ref?: string;
            $defs?: Record<string, JSONSchema>;
            definitions?: Record<string, JSONSchema>;
            allOf?: Array<JSONSchema>;
            anyOf?: Array<JSONSchema>;
            oneOf?: Array<JSONSchema>;
            not?: JSONSchema;
            if?: JSONSchema;
            then?: JSONSchema;
            else?: JSONSchema;
            minimum?: number;
            maximum?: number;
            exclusiveMinimum?: number;
            exclusiveMaximum?: number;
            minLength?: number;
            maxLength?: number;
            pattern?: string;
            format?: string;
            minItems?: number;
            maxItems?: number;
            uniqueItems?: boolean;
            additionalProperties?: boolean | JSONSchema;
            additionalItems?: boolean | JSONSchema;
            patternProperties?: Record<string, JSONSchema>;
            propertyNames?: JSONSchema;
            minProperties?: number;
            maxProperties?: number;
            title?: string;
            examples?: Array<unknown>;
        };
        outputSchema: undefined;
        approvalSchema: undefined;
    }, import('@tanstack/ai').ServerTool<{
        type: string;
        properties: {
            threadId: JSONSchema;
        };
        items?: JSONSchema | Array<JSONSchema>;
        required?: Array<string>;
        enum?: Array<unknown>;
        const?: unknown;
        description?: string;
        default?: unknown;
        $ref?: string;
        $defs?: Record<string, JSONSchema>;
        definitions?: Record<string, JSONSchema>;
        allOf?: Array<JSONSchema>;
        anyOf?: Array<JSONSchema>;
        oneOf?: Array<JSONSchema>;
        not?: JSONSchema;
        if?: JSONSchema;
        then?: JSONSchema;
        else?: JSONSchema;
        minimum?: number;
        maximum?: number;
        exclusiveMinimum?: number;
        exclusiveMaximum?: number;
        minLength?: number;
        maxLength?: number;
        pattern?: string;
        format?: string;
        minItems?: number;
        maxItems?: number;
        uniqueItems?: boolean;
        additionalProperties?: boolean | JSONSchema;
        additionalItems?: boolean | JSONSchema;
        patternProperties?: Record<string, JSONSchema>;
        propertyNames?: JSONSchema;
        minProperties?: number;
        maxProperties?: number;
        title?: string;
        examples?: Array<unknown>;
    }, undefined, "resolve", MCPToolContext, false, undefined> & {
        inputSchema: {
            type: string;
            properties: {
                threadId: JSONSchema;
            };
            items?: JSONSchema | Array<JSONSchema>;
            required?: Array<string>;
            enum?: Array<unknown>;
            const?: unknown;
            description?: string;
            default?: unknown;
            $ref?: string;
            $defs?: Record<string, JSONSchema>;
            definitions?: Record<string, JSONSchema>;
            allOf?: Array<JSONSchema>;
            anyOf?: Array<JSONSchema>;
            oneOf?: Array<JSONSchema>;
            not?: JSONSchema;
            if?: JSONSchema;
            then?: JSONSchema;
            else?: JSONSchema;
            minimum?: number;
            maximum?: number;
            exclusiveMinimum?: number;
            exclusiveMaximum?: number;
            minLength?: number;
            maxLength?: number;
            pattern?: string;
            format?: string;
            minItems?: number;
            maxItems?: number;
            uniqueItems?: boolean;
            additionalProperties?: boolean | JSONSchema;
            additionalItems?: boolean | JSONSchema;
            patternProperties?: Record<string, JSONSchema>;
            propertyNames?: JSONSchema;
            minProperties?: number;
            maxProperties?: number;
            title?: string;
            examples?: Array<unknown>;
        };
        outputSchema: undefined;
        approvalSchema: undefined;
    }, import('@tanstack/ai').ServerTool<{
        type: string;
        properties: {
            threadId: JSONSchema;
        };
        items?: JSONSchema | Array<JSONSchema>;
        required?: Array<string>;
        enum?: Array<unknown>;
        const?: unknown;
        description?: string;
        default?: unknown;
        $ref?: string;
        $defs?: Record<string, JSONSchema>;
        definitions?: Record<string, JSONSchema>;
        allOf?: Array<JSONSchema>;
        anyOf?: Array<JSONSchema>;
        oneOf?: Array<JSONSchema>;
        not?: JSONSchema;
        if?: JSONSchema;
        then?: JSONSchema;
        else?: JSONSchema;
        minimum?: number;
        maximum?: number;
        exclusiveMinimum?: number;
        exclusiveMaximum?: number;
        minLength?: number;
        maxLength?: number;
        pattern?: string;
        format?: string;
        minItems?: number;
        maxItems?: number;
        uniqueItems?: boolean;
        additionalProperties?: boolean | JSONSchema;
        additionalItems?: boolean | JSONSchema;
        patternProperties?: Record<string, JSONSchema>;
        propertyNames?: JSONSchema;
        minProperties?: number;
        maxProperties?: number;
        title?: string;
        examples?: Array<unknown>;
    }, undefined, "answer", MCPToolContext, false, undefined> & {
        inputSchema: {
            type: string;
            properties: {
                threadId: JSONSchema;
            };
            items?: JSONSchema | Array<JSONSchema>;
            required?: Array<string>;
            enum?: Array<unknown>;
            const?: unknown;
            description?: string;
            default?: unknown;
            $ref?: string;
            $defs?: Record<string, JSONSchema>;
            definitions?: Record<string, JSONSchema>;
            allOf?: Array<JSONSchema>;
            anyOf?: Array<JSONSchema>;
            oneOf?: Array<JSONSchema>;
            not?: JSONSchema;
            if?: JSONSchema;
            then?: JSONSchema;
            else?: JSONSchema;
            minimum?: number;
            maximum?: number;
            exclusiveMinimum?: number;
            exclusiveMaximum?: number;
            minLength?: number;
            maxLength?: number;
            pattern?: string;
            format?: string;
            minItems?: number;
            maxItems?: number;
            uniqueItems?: boolean;
            additionalProperties?: boolean | JSONSchema;
            additionalItems?: boolean | JSONSchema;
            patternProperties?: Record<string, JSONSchema>;
            propertyNames?: JSONSchema;
            minProperties?: number;
            maxProperties?: number;
            title?: string;
            examples?: Array<unknown>;
        };
        outputSchema: undefined;
        approvalSchema: undefined;
    }, import('@tanstack/ai').ServerTool<{
        type: string;
        properties: {
            threadId: JSONSchema;
        };
        items?: JSONSchema | Array<JSONSchema>;
        required?: Array<string>;
        enum?: Array<unknown>;
        const?: unknown;
        description?: string;
        default?: unknown;
        $ref?: string;
        $defs?: Record<string, JSONSchema>;
        definitions?: Record<string, JSONSchema>;
        allOf?: Array<JSONSchema>;
        anyOf?: Array<JSONSchema>;
        oneOf?: Array<JSONSchema>;
        not?: JSONSchema;
        if?: JSONSchema;
        then?: JSONSchema;
        else?: JSONSchema;
        minimum?: number;
        maximum?: number;
        exclusiveMinimum?: number;
        exclusiveMaximum?: number;
        minLength?: number;
        maxLength?: number;
        pattern?: string;
        format?: string;
        minItems?: number;
        maxItems?: number;
        uniqueItems?: boolean;
        additionalProperties?: boolean | JSONSchema;
        additionalItems?: boolean | JSONSchema;
        patternProperties?: Record<string, JSONSchema>;
        propertyNames?: JSONSchema;
        minProperties?: number;
        maxProperties?: number;
        title?: string;
        examples?: Array<unknown>;
    }, undefined, "status", unknown, false, undefined> & {
        inputSchema: {
            type: string;
            properties: {
                threadId: JSONSchema;
            };
            items?: JSONSchema | Array<JSONSchema>;
            required?: Array<string>;
            enum?: Array<unknown>;
            const?: unknown;
            description?: string;
            default?: unknown;
            $ref?: string;
            $defs?: Record<string, JSONSchema>;
            definitions?: Record<string, JSONSchema>;
            allOf?: Array<JSONSchema>;
            anyOf?: Array<JSONSchema>;
            oneOf?: Array<JSONSchema>;
            not?: JSONSchema;
            if?: JSONSchema;
            then?: JSONSchema;
            else?: JSONSchema;
            minimum?: number;
            maximum?: number;
            exclusiveMinimum?: number;
            exclusiveMaximum?: number;
            minLength?: number;
            maxLength?: number;
            pattern?: string;
            format?: string;
            minItems?: number;
            maxItems?: number;
            uniqueItems?: boolean;
            additionalProperties?: boolean | JSONSchema;
            additionalItems?: boolean | JSONSchema;
            patternProperties?: Record<string, JSONSchema>;
            propertyNames?: JSONSchema;
            minProperties?: number;
            maxProperties?: number;
            title?: string;
            examples?: Array<unknown>;
        };
        outputSchema: undefined;
        approvalSchema: undefined;
    }, ...(import('@tanstack/ai').ServerTool<{
        type: string;
        properties: {
            threadId: JSONSchema;
        };
        items?: JSONSchema | Array<JSONSchema>;
        required?: Array<string>;
        enum?: Array<unknown>;
        const?: unknown;
        description?: string;
        default?: unknown;
        $ref?: string;
        $defs?: Record<string, JSONSchema>;
        definitions?: Record<string, JSONSchema>;
        allOf?: Array<JSONSchema>;
        anyOf?: Array<JSONSchema>;
        oneOf?: Array<JSONSchema>;
        not?: JSONSchema;
        if?: JSONSchema;
        then?: JSONSchema;
        else?: JSONSchema;
        minimum?: number;
        maximum?: number;
        exclusiveMinimum?: number;
        exclusiveMaximum?: number;
        minLength?: number;
        maxLength?: number;
        pattern?: string;
        format?: string;
        minItems?: number;
        maxItems?: number;
        uniqueItems?: boolean;
        additionalProperties?: boolean | JSONSchema;
        additionalItems?: boolean | JSONSchema;
        patternProperties?: Record<string, JSONSchema>;
        propertyNames?: JSONSchema;
        minProperties?: number;
        maxProperties?: number;
        title?: string;
        examples?: Array<unknown>;
    }, undefined, string, MCPToolContext, false, undefined> & {
        inputSchema: {
            type: string;
            properties: {
                threadId: JSONSchema;
            };
            items?: JSONSchema | Array<JSONSchema>;
            required?: Array<string>;
            enum?: Array<unknown>;
            const?: unknown;
            description?: string;
            default?: unknown;
            $ref?: string;
            $defs?: Record<string, JSONSchema>;
            definitions?: Record<string, JSONSchema>;
            allOf?: Array<JSONSchema>;
            anyOf?: Array<JSONSchema>;
            oneOf?: Array<JSONSchema>;
            not?: JSONSchema;
            if?: JSONSchema;
            then?: JSONSchema;
            else?: JSONSchema;
            minimum?: number;
            maximum?: number;
            exclusiveMinimum?: number;
            exclusiveMaximum?: number;
            minLength?: number;
            maxLength?: number;
            pattern?: string;
            format?: string;
            minItems?: number;
            maxItems?: number;
            uniqueItems?: boolean;
            additionalProperties?: boolean | JSONSchema;
            additionalItems?: boolean | JSONSchema;
            patternProperties?: Record<string, JSONSchema>;
            propertyNames?: JSONSchema;
            minProperties?: number;
            maxProperties?: number;
            title?: string;
            examples?: Array<unknown>;
        };
        outputSchema: undefined;
        approvalSchema: undefined;
    })[]];
    resources: readonly [] | readonly [{
        readonly uriTemplate: "harness-media://{threadId}/{id}";
        readonly name: "media";
        readonly mimeType: "application/octet-stream";
        readonly argsSchema: {
            readonly parse: typeof mediaAddress;
        };
    } & {
        read: (uri: URL, variables: import('@modelcontextprotocol/server').Variables, ctx: import('./server/definitions.js').MCPResourceContext) => {
            blob: string;
            mimeType: string;
        } | Promise<{
            blob: string;
            mimeType: string;
        }>;
    }];
    prompts: [] | readonly [];
    fetch: (request: Request) => Promise<Response>;
    handle(request: Request, handleOptions?: import('./server/create-server.js').MCPHandleOptions): Promise<Response>;
}>;
/**
 * The thread and media id of a `harness-media://<threadId>/<id>` URI, from
 * the template variables. `mediaUri` encodes both, so they are decoded here.
 */
declare function mediaAddress(variables: unknown): {
    threadId: string;
    id: string;
};
