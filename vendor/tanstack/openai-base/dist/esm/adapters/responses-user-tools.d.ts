import { ResponseInputItem } from 'openai/resources/responses/responses';
/**
 * OpenAI Responses tools the app must run.
 * A container `shell` runs on the provider. `apply_patch`, `local_shell`,
 * and `shell` with `environment.type: "local"` (or no environment) do not.
 */
export type OpenAIUserToolName = 'shell' | 'apply_patch' | 'local_shell';
export interface OpenAIUserExecutedCall {
    name: OpenAIUserToolName;
    callId: string;
    itemId?: string;
    input: Record<string, unknown>;
    maxOutputLength?: number | null;
}
interface ToolCallLike {
    id: string;
    function: {
        name: string;
        arguments: string;
    };
    metadata?: unknown;
}
/**
 * Hosted shell calls already include a `shell_call_output` in the same
 * response. Those call ids must not pause the app for another run.
 */
export declare function hostedShellCallIds(output: ReadonlyArray<unknown>): Set<string>;
export declare function readUserToolName(metadata: unknown): OpenAIUserToolName | null;
/**
 * Read a user-run Responses output item.
 * `bareShell` is true only once the full response is known. A shell call
 * with no environment waits for that pass, so a hosted call that later
 * carries `shell_call_output` is not asked of the app.
 */
export declare function readUserExecutedCall(item: unknown, options: {
    bareShell: boolean;
}): OpenAIUserExecutedCall | null;
/** Replay a user-run tool call as the Responses input item OpenAI expects. */
export declare function userToolRequestItem(toolCall: ToolCallLike): ResponseInputItem | null;
/** Replay the app's tool result as the matching Responses output item. */
export declare function userToolResultItem(toolCall: ToolCallLike, content: unknown): ResponseInputItem | null;
export {};
