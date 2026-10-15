import { ModelMessage } from '@tanstack/ai';
/**
 * Convert an MCP GetPromptResult into an array of ModelMessages suitable for
 * passing to `chat()` or any TanStack AI adapter.
 *
 * @param prompt - An object with a `messages` array as returned by the MCP
 *   `prompts/get` endpoint.
 * @returns An array of {@link ModelMessage} values.
 */
export declare function mcpPromptToMessages(prompt: {
    messages: Array<{
        role: string;
        content?: {
            type: string;
            text?: string;
        } | null;
    }>;
}): Array<ModelMessage>;
