import { OllamaChatRequest, OllamaChatRequestMessages, OllamaChatRequestTools, OllamaMessageTools } from './models-meta.js';
declare const COMMAND_R_7b_LATEST: {
    readonly name: "command-r7b:latest";
    readonly supports: {
        readonly input: ["text"];
        readonly output: ["text"];
        readonly capabilities: ["tools"];
    };
    readonly size: "5.1gb";
    readonly context: 8000;
};
declare const COMMAND_R_7b_7b: {
    readonly name: "command-r7b:7b";
    readonly supports: {
        readonly input: ["text"];
        readonly output: ["text"];
        readonly capabilities: ["tools"];
    };
    readonly size: "5.1gb";
    readonly context: 8000;
};
export declare const COMMAND_R_7b_MODELS: readonly ["command-r7b:latest", "command-r7b:7b"];
export type CommandR7bChatModelProviderOptionsByName = {
    [COMMAND_R_7b_LATEST.name]: OllamaChatRequest & OllamaChatRequestMessages<OllamaMessageTools> & OllamaChatRequestTools;
    [COMMAND_R_7b_7b.name]: OllamaChatRequest & OllamaChatRequestMessages<OllamaMessageTools> & OllamaChatRequestTools;
};
export type CommandR7bModelInputModalitiesByName = {
    [COMMAND_R_7b_LATEST.name]: typeof COMMAND_R_7b_LATEST.supports.input;
    [COMMAND_R_7b_7b.name]: typeof COMMAND_R_7b_7b.supports.input;
};
export {};
