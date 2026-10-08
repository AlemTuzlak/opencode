import { AnyTool } from '@tanstack/ai';
import { ToolDescriptor } from './tool-bridge.js';
/** Per-call options forwarded to a {@link RemoteToolExecutor}. */
export interface RemoteToolExecuteOptions {
    /** Cancels the in-flight remote call when the in-container run aborts. */
    signal?: AbortSignal;
}
/** Runs a named host tool with the given args, returning its raw result. */
export interface RemoteToolExecutor {
    execute: (name: string, args: unknown, options?: RemoteToolExecuteOptions) => Promise<unknown>;
}
/** Wire shape of a tool-exec request the container POSTs to the orchestrator. */
export interface ToolExecRequest {
    name: string;
    args: unknown;
}
/** Narrow an unknown body into a {@link ToolExecRequest} (project rule: no `as`). */
export declare function isToolExecRequest(value: unknown): value is ToolExecRequest;
/**
 * Rebuild `chat()` tool objects (container side) from serialized descriptors.
 * Each stub advertises the descriptor's JSON-schema and delegates `execute` to
 * the executor; the harness adapter bridges them like any other tool. The
 * harness's `abortSignal` is forwarded so a cancelled run cancels the in-flight
 * remote call too.
 */
export declare function remoteToolStubs(descriptors: Array<ToolDescriptor>, executor: RemoteToolExecutor): Array<AnyTool>;
/**
 * Serialize `chat()` tools to wire descriptors to send into the container.
 * `inputSchema` must already be a plain JSON-schema object (convert Standard
 * Schemas before calling, the same way harness adapters advertise tools).
 */
export declare function toolDescriptors(tools: Array<AnyTool>): Array<ToolDescriptor>;
/**
 * The default {@link RemoteToolExecutor}: POST `{ name, args }` (bearer-gated)
 * to the orchestrator's tool-exec endpoint and return its `result`. A non-2xx
 * or malformed response throws (surfaced to the agent as a failed tool call by
 * the bridge) — never silently swallowed.
 */
export declare function httpRemoteToolExecutor(url: string, token: string): RemoteToolExecutor;
/**
 * Run a host tool by name with the given args, returning its raw result
 * (orchestrator side of {@link httpRemoteToolExecutor}). Throws for an unknown
 * tool or one with no `execute` — the orchestrator surfaces that as a 4xx/5xx.
 */
export declare function executeHostTool(tools: Array<AnyTool>, name: string, args: unknown, options?: {
    context?: unknown;
    signal?: AbortSignal;
}): Promise<unknown>;
