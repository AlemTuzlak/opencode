import { Client, RequestOptions, Tool as McpToolDef } from '@modelcontextprotocol/client';
import { ContentPart, ToolInputResponse } from '@tanstack/ai';
import { MCPClientOptions, McpServerTool, McpToolMetadata } from './types.js';
interface ConvertOptions {
    prefix?: string;
    toolName?: (tool: McpToolDef) => string;
    lazy?: boolean;
    needsApproval?: (tool: McpToolDef) => boolean;
    requestOptions?: MCPClientOptions['requestOptions'];
}
/** Reads the MCP Apps `_meta.ui.resourceUri` link from a tool def, if present. */
export declare function extractUiResourceUri(def: McpToolDef): string | undefined;
/**
 * Build the `metadata.mcp` block stamped onto every discovered/bound tool.
 * Shared by auto-discovery (`toServerTools`) and the explicit `tools(defs)`
 * path in `client.ts` so the two cannot drift.
 *
 * `annotations` is a frozen copy of the server's object. A host cannot change
 * the server's data through it. Per the MCP spec, its fields (including
 * `title`) are hints. A host may use them for display or for an approval UI,
 * but never as a security boundary.
 *
 * Fields the server didn't declare are OMITTED rather than set to `undefined`:
 * the explicit path merges this over any `mcp` block the caller already put on
 * their tool definition, and an `undefined` value would blank out what they set.
 */
export declare function toolMcpMetadata(def: McpToolDef, serverId: string | undefined): McpToolMetadata;
export declare function mcpContentToTanstack(content: unknown): string | Array<ContentPart>;
/**
 * Calls one MCP tool and returns the tool result.
 *
 * A spec 2025 task waits on `tasks/get`, then reads `tasks/result`.
 * Spec 2026-07-28 has no tasks, so a 2026 call returns the tool result.
 * `chat()` receives the tool result after the task ends.
 *
 * `signal` stops the wait. This function then sends `tasks/cancel`.
 * It does not wait for that cancel request.
 *
 * If the tool result asks for input, this function throws
 * {@link MCPInputRequiredError}.
 * `kind` is `form` for user input, or `sampling` for a model request.
 * `request` is the input request body.
 * This function does not catch that error.
 *
 * On spec 2026, pass `inputResponse` to answer an input request.
 * The call gets the request again, then sends the answer at once
 * with `inputResponses` and the server's `requestState`.
 * If the server asks for input again after that answer, this throws an Error.
 *
 * @param client - Connected MCP client
 * @param mcpName - Server tool name
 * @param args - Tool arguments
 * @param taskRequired - True when the tool requires a spec 2025 task
 * @param signal - Stops the wait when the caller aborts
 * @param inputResponse - The user's answer from an `mcp_input` interrupt
 * @param requestOptions - The client `requestOptions`, sent with tools/call
 * @param askInput - Asks the user for each elicitation round on spec 2026.
 *   The harness sets it. Without it, a call answers one round.
 */
export declare function callMcpTool(client: Client, mcpName: string, args: Record<string, unknown>, taskRequired: boolean, signal?: AbortSignal, inputResponse?: ToolInputResponse, requestOptions?: MCPClientOptions['requestOptions'], askInput?: AskInput): Promise<{
    [x: string]: unknown;
    content: ({
        type: "text";
        text: string;
        annotations?: {
            audience?: ("user" | "assistant")[] | undefined;
            priority?: number | undefined;
            lastModified?: string | undefined;
        } | undefined;
        _meta?: {
            [x: string]: unknown;
        } | undefined;
    } | {
        type: "image";
        data: string;
        mimeType: string;
        annotations?: {
            audience?: ("user" | "assistant")[] | undefined;
            priority?: number | undefined;
            lastModified?: string | undefined;
        } | undefined;
        _meta?: {
            [x: string]: unknown;
        } | undefined;
    } | {
        type: "audio";
        data: string;
        mimeType: string;
        annotations?: {
            audience?: ("user" | "assistant")[] | undefined;
            priority?: number | undefined;
            lastModified?: string | undefined;
        } | undefined;
        _meta?: {
            [x: string]: unknown;
        } | undefined;
    } | {
        uri: string;
        name: string;
        type: "resource_link";
        description?: string | undefined;
        mimeType?: string | undefined;
        size?: number | undefined;
        annotations?: {
            audience?: ("user" | "assistant")[] | undefined;
            priority?: number | undefined;
            lastModified?: string | undefined;
        } | undefined;
        _meta?: {
            [x: string]: unknown;
        } | undefined;
        icons?: {
            src: string;
            mimeType?: string | undefined;
            sizes?: string[] | undefined;
            theme?: "light" | "dark" | undefined;
        }[] | undefined;
        title?: string | undefined;
    } | {
        type: "resource";
        resource: {
            uri: string;
            text: string;
            mimeType?: string | undefined;
            _meta?: {
                [x: string]: unknown;
            } | undefined;
        } | {
            uri: string;
            blob: string;
            mimeType?: string | undefined;
            _meta?: {
                [x: string]: unknown;
            } | undefined;
        };
        annotations?: {
            audience?: ("user" | "assistant")[] | undefined;
            priority?: number | undefined;
            lastModified?: string | undefined;
        } | undefined;
        _meta?: {
            [x: string]: unknown;
        } | undefined;
    })[];
    _meta?: {
        [x: string]: unknown;
        "io.modelcontextprotocol/serverInfo"?: {
            version: string;
            name: string;
            websiteUrl?: string | undefined;
            description?: string | undefined;
            icons?: {
                src: string;
                mimeType?: string | undefined;
                sizes?: string[] | undefined;
                theme?: "light" | "dark" | undefined;
            }[] | undefined;
            title?: string | undefined;
        } | undefined;
    } | undefined;
    structuredContent?: unknown;
    isError?: boolean | undefined;
}>;
/** Asks the user for one MCP elicitation request body. */
export type AskInput = (request: unknown) => Promise<ToolInputResponse>;
/**
 * The SDK options for one request: the client `requestOptions` plus the
 * caller's `signal`. `undefined` when both are unset, so the SDK defaults
 * apply.
 *
 * The SDK asks the server for progress only when `onprogress` is set. So a
 * no-op `onprogress` comes with `resetTimeoutOnProgress`, or that option
 * would never see a progress notification.
 */
export declare function sdkRequestOptions(requestOptions: MCPClientOptions['requestOptions'], signal?: AbortSignal): RequestOptions | undefined;
/**
 * Build the execute body that proxies a TanStack tool call to an MCP server.
 * Shared by auto-discovery and the definition path.
 *
 * @param preferStructured when true (i.e. the tool declares an outputSchema),
 *   return `result.structuredContent` if present so the existing output
 *   validation in `executeServerTool` validates MCP's typed payload rather than
 *   a JSON-in-text blob. Otherwise normalize `content[]` → string | ContentPart[].
 * @param requestOptions - The client `requestOptions`, sent with each call
 */
export declare function makeMcpExecute(client: Client, mcpName: string, preferStructured: boolean, taskRequired?: boolean, requestOptions?: MCPClientOptions['requestOptions']): (args: unknown, ctx?: {
    abortSignal?: AbortSignal;
    inputResponse?: ToolInputResponse;
    askInput?: AskInput;
}) => Promise<{} | null>;
/** A tool that must run as a task. */
export declare function requiresTaskExecution(def: McpToolDef): boolean;
/** The server declares task-based execution support for tools/call. */
export declare function serverSupportsTaskCalls(client: Client): boolean;
/**
 * Auto-discovery path: turn raw MCP tool defs into ServerTools. Task-required
 * tools are excluded when the server does not declare the tasks capability
 * for tools/call — every invocation would fail, so they must not be offered
 * to the model.
 */
export declare function toServerTools(client: Client, defs: Array<McpToolDef>, options: ConvertOptions): Array<McpServerTool>;
export {};
