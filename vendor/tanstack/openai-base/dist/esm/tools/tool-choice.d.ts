import { ToolChoice as CoreToolChoice } from '@tanstack/ai';
/**
 * Maps the `chat({ toolChoice })` value to the Chat Completions
 * `tool_choice` wire value.
 */
export declare function toChatCompletionsToolChoice(choice: CoreToolChoice): "required" | "auto" | "none" | {
    type: "function";
    function: {
        name: string;
    };
};
/**
 * Maps the `chat({ toolChoice })` value to the Responses `tool_choice` wire
 * value.
 */
export declare function toResponsesToolChoice(choice: CoreToolChoice): "required" | "auto" | "none" | {
    type: "function";
    name: string;
};
interface MCPToolChoice {
    type: 'mcp';
    server_label: string;
}
interface FunctionToolChoice {
    type: 'function';
    name: string;
}
interface CustomToolChoice {
    type: 'custom';
    name: string;
}
interface HostedToolChoice {
    type: 'file_search' | 'web_search_preview' | 'computer_use_preview' | 'code_interpreter' | 'image_generation' | 'shell' | 'apply_patch';
}
export type ToolChoice = MCPToolChoice | FunctionToolChoice | CustomToolChoice | HostedToolChoice;
export {};
