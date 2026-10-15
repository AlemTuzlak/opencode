import { OllamaChatRequest, OllamaChatRequestMessages, OllamaChatRequestTools, OllamaMessageTools } from './models-meta.js';
declare const COMMAND_R_LATEST: {
    readonly name: "command-r:latest";
    readonly supports: {
        readonly input: ["text"];
        readonly output: ["text"];
        readonly capabilities: ["tools"];
    };
    readonly size: "19gb";
    readonly context: 128000;
};
declare const COMMAND_R_35b: {
    readonly name: "command-r:35b";
    readonly supports: {
        readonly input: ["text"];
        readonly output: ["text"];
        readonly capabilities: ["tools"];
    };
    readonly size: "19gb";
    readonly context: 128000;
};
export declare const COMMAND_R_MODELS: readonly ["command-r:latest", "command-r:35b"];
export type CommandRChatModelProviderOptionsByName = {
    [COMMAND_R_LATEST.name]: OllamaChatRequest & OllamaChatRequestMessages<OllamaMessageTools> & OllamaChatRequestTools;
    [COMMAND_R_35b.name]: OllamaChatRequest & OllamaChatRequestMessages<OllamaMessageTools> & OllamaChatRequestTools;
};
export type CommandRModelInputModalitiesByName = {
    [COMMAND_R_LATEST.name]: typeof COMMAND_R_LATEST.supports.input;
    [COMMAND_R_35b.name]: typeof COMMAND_R_35b.supports.input;
};
export {};
