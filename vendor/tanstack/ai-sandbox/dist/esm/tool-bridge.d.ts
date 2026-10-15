import { AnyTool, EmitCustomEventOptions } from '@tanstack/ai';
/**
 * Name of the bridged MCP server. The agent sees tools as
 * `mcp__tanstack__<tool>`; each adapter's stream translator strips this prefix
 * so tool-call events match the names the application registered.
 */
export declare const BRIDGED_MCP_SERVER_NAME = "tanstack";
/** Hostname the sandbox uses to reach the bridge endpoint, per provider. */
export declare function hostForSandbox(provider: string): string;
/** Result of a permission decision returned to the harness's prompt tool. */
export interface PermissionToolResult {
    behavior: 'allow' | 'deny';
    message?: string;
    updatedInput?: unknown;
}
export interface BridgePermission {
    toolName: string;
    resolve: (input: {
        tool_name?: string;
        input?: unknown;
    }) => PermissionToolResult | Promise<PermissionToolResult>;
}
export interface ToolBridgeCoreOptions {
    /** Runtime context forwarded to each tool's `execute()`. */
    context?: unknown;
    /** Abort signal forwarded to each tool's `execute()`. */
    signal?: AbortSignal;
    /**
     * Forwarded to each tool's `execute()` so a bridged tool can stream progress /
     * custom events back to the client mid-execution (e.g. code mode's
     * `code_mode:console` logs). Without it those events are silently dropped — the
     * bridge runs out-of-band from the main tool executor, so the executor's own
     * `emitCustomEvent` never reaches a bridged tool. The harness adapter supplies
     * one that injects a CUSTOM chunk into its live output stream.
     */
    emitCustomEvent?: (eventName: string, value: Record<string, unknown>, options?: EmitCustomEventOptions) => void;
    /**
     * Optional permission-prompt tool (e.g. for Claude Code's
     * `--permission-prompt-tool`). When set, the bridge exposes an extra MCP tool
     * `<name>` whose handler returns the orchestrator's allow/deny decision.
     */
    permission?: BridgePermission;
}
/** An MCP tool descriptor as advertised to the in-sandbox agent. */
export interface ToolDescriptor {
    name: string;
    description?: string;
    inputSchema: {
        type: 'object';
        [key: string]: unknown;
    };
}
/** MCP `tools/call` result shape. */
export interface ToolCallResult {
    content: Array<{
        type: 'text';
        text: string;
    }>;
    isError?: boolean;
}
/**
 * Transport-agnostic bridge logic: list tools, and dispatch a tool/permission
 * call. No sockets, no auth — a transport ({@link startHostToolBridge} or a
 * `fetch` handler) wraps this and owns I/O + the bearer check.
 */
export interface ToolBridgeCore {
    listTools: () => Array<ToolDescriptor>;
    callTool: (name: string, args: unknown) => Promise<ToolCallResult>;
}
/** Build the transport-agnostic bridge core for the given tools. */
export declare function createToolBridgeCore(tools: Array<AnyTool>, options?: ToolBridgeCoreOptions): ToolBridgeCore;
/**
 * Minimal JSON-RPC dispatcher over a {@link ToolBridgeCore}, so a `fetch`-based
 * transport (Worker / Durable Object) can serve MCP `initialize` / `tools/list`
 * / `tools/call` without the node-specific HTTP transport. Returns the JSON-RPC
 * response object, or `null` for a notification (no `id`).
 */
export declare function handleBridgeJsonRpc(core: ToolBridgeCore, message: unknown): Promise<unknown>;
/**
 * Constant-time check of an `Authorization: Bearer <token>` header against the
 * expected token. Length mismatch returns false early (token length is not
 * secret); equal-length comparison is timing-safe.
 */
export declare function timingSafeBearerEqual(header: string | undefined, token: string): boolean;
export interface HostToolBridge {
    /** MCP server name; tools appear to the agent as `mcp__<name>__<tool>`. */
    name: string;
    /** URL the SANDBOX uses to reach this bridge. */
    url: string;
    /** Per-run bearer token gating the endpoint. */
    token: string;
    close: () => Promise<void>;
}
export interface StartBridgeOptions extends ToolBridgeCoreOptions {
    /** Hostname the sandbox uses to reach the host (e.g. `host.docker.internal`). */
    hostForSandbox: string;
    /**
     * Address to bind the listener to. Defaults to `127.0.0.1` (loopback) and is
     * widened to `0.0.0.0` only when the sandbox reaches the host via
     * `host.docker.internal` (a container can't reach the host's loopback).
     */
    bindAddress?: string;
}
/**
 * Start the `node:http` MCP tool-proxy bridge for the given tools. For a
 * long-running host (laptop / CI / Docker orchestrator). Serverless/edge
 * orchestrators serve {@link createToolBridgeCore} from their own `fetch`
 * handler instead.
 */
export declare function startHostToolBridge(tools: Array<AnyTool>, options: StartBridgeOptions): Promise<HostToolBridge>;
/** A provisioned, reachable bridge endpoint (same shape as {@link HostToolBridge}). */
export type ProvisionedBridge = HostToolBridge;
export interface ToolBridgeProvisionOptions extends ToolBridgeCoreOptions {
    /** Sandbox provider name, to derive how the sandbox reaches the bridge. */
    provider: string;
}
/**
 * Stands up the tool-bridge endpoint for a run. The seam that makes the bridge
 * portable across runtimes: a harness adapter asks its capability context for a
 * provisioner and uses {@link nodeHttpBridgeProvisioner} as the default (host /
 * Docker). A serverless/edge orchestrator PROVIDES its own — e.g. a Durable
 * Object that mounts {@link createToolBridgeCore} / {@link handleBridgeJsonRpc}
 * on its `fetch` handler and returns a sandbox-reachable URL — so no raw TCP
 * listener is needed.
 */
export interface ToolBridgeProvisioner {
    provision: (tools: Array<AnyTool>, options: ToolBridgeProvisionOptions) => Promise<ProvisionedBridge>;
}
/** Default provisioner: a `node:http` listener on the host. */
export declare const nodeHttpBridgeProvisioner: ToolBridgeProvisioner;
